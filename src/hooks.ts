import {
  BasicExampleFactory,
  HelperExampleFactory,
  KeyExampleFactory,
  PromptExampleFactory,
  UIExampleFactory,
} from "./modules/examples";
import { getString, initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import { createZToolkit } from "./utils/ztoolkit";
import { ItemNumberingFactory } from "./modules/itemNumbering";
import { QuickPreview } from "./modules/quickPreview";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  initLocale();

  BasicExampleFactory.registerPrefs();

  BasicExampleFactory.registerNotifier();

  KeyExampleFactory.registerShortcuts();

  // Initialize item numbering
  try {
    addon.data.itemNumbering = ItemNumberingFactory;
    // 延时注册以确保所有 Zotero 组件都已准备就绪
    setTimeout(async () => {
      await ItemNumberingFactory.registerNumberingColumn();
      ItemNumberingFactory.registerContextMenu();
      ItemNumberingFactory.registerToolbarButton();
      ztoolkit.log("Item numbering initialized successfully");
    }, 2000);

    // 启动后进行列状态检查和恢复
    ItemNumberingFactory.checkAndRestoreColumn();
  } catch (error) {
    ztoolkit.log("Error initializing item numbering:", error);
  }

  // Initialize Quick Preview functionality
  try {
    QuickPreview.initialize();
    QuickPreview.enableDebugMode(); // Enable debug methods
    ztoolkit.log("Quick Preview functionality initialized successfully");
  } catch (error) {
    ztoolkit.log("Error initializing Quick Preview:", error);
  }

  UIExampleFactory.registerItemPaneSection();

  UIExampleFactory.registerReaderItemPaneSection();

  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  // @ts-ignore This is a moz feature
  win.MozXULElement.insertFTLIfNeeded(
    `${addon.data.config.addonRef}-mainWindow.ftl`,
  );

  const popupWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
    closeOnClick: true,
    closeTime: -1,
  })
    .createLine({
      text: getString("startup-begin"),
      type: "default",
      progress: 0,
    })
    .show();

  await Zotero.Promise.delay(1000);
  popupWin.changeLine({
    progress: 30,
    text: `[30%] ${getString("startup-begin")}`,
  });

  UIExampleFactory.registerStyleSheet(win);

  UIExampleFactory.registerRightClickMenuItem();

  UIExampleFactory.registerRightClickMenuPopup(win);

  UIExampleFactory.registerWindowMenuWithSeparator();

  PromptExampleFactory.registerNormalCommandExample();

  PromptExampleFactory.registerAnonymousCommandExample(win);

  PromptExampleFactory.registerConditionalCommandExample();

  await Zotero.Promise.delay(1000);

  popupWin.changeLine({
    progress: 100,
    text: `[100%] ${getString("startup-finish")}`,
  });
  popupWin.startCloseTimer(5000);

  // 确保编号列在此窗口中注册
  if (addon.data.itemNumbering) {
    setTimeout(async () => {
      await ItemNumberingFactory.checkAndRestoreColumn();
      ztoolkit.log("Item numbering column restored for window");
    }, 1000);
  }

  // 注册集合切换监听器
  if (addon.data.itemNumbering && win.ZoteroPane) {
    const originalSelectCollection = win.ZoteroPane.selectCollection;
    win.ZoteroPane.selectCollection = function (...args: any[]) {
      const result = originalSelectCollection.apply(this, args);
      // 延时执行以确保选择完成
      setTimeout(() => {
        ItemNumberingFactory.handleItemChange("select", "collection", []);
      }, 50);
      return result;
    };

    ztoolkit.log("Collection change listener registered");
  }

  // 监听列位置变化并保存
  if (addon.data.itemNumbering && win.ZoteroPane && win.ZoteroPane.itemsView) {
    setTimeout(() => {
      const itemsView = win.ZoteroPane.itemsView;
      if (itemsView && itemsView.tree && itemsView.tree.columns) {
        // 监听列顺序变化事件
        const tree = itemsView.tree;

        // 重写列移动相关的方法来保存位置
        if (tree.columns && typeof tree.columns.moveColumn === "function") {
          const originalMoveColumn = tree.columns.moveColumn.bind(tree.columns);
          tree.columns.moveColumn = function (...args: any[]) {
            const result = originalMoveColumn.apply(this, args);
            // 延时保存列位置，确保移动完成
            setTimeout(() => {
              ItemNumberingFactory.saveColumnPosition();
            }, 100);
            return result;
          };
        }

        // 监听拖拽结束事件
        tree.addEventListener("dragend", () => {
          setTimeout(() => {
            ItemNumberingFactory.saveColumnPosition();
          }, 100);
        });

        ztoolkit.log("Column position save listeners registered");
      }
    }, 2000);
  }

  // 监听排序事件
  if (addon.data.itemNumbering && win.ZoteroPane && win.ZoteroPane.itemsView) {
    setTimeout(() => {
      const itemsView = win.ZoteroPane.itemsView;
      if (itemsView) {
        // 重写排序方法来捕获排序事件
        if (typeof itemsView.sort === "function") {
          const originalSort = itemsView.sort.bind(itemsView);
          itemsView.sort = function (...args: Parameters<typeof originalSort>) {
            const result = originalSort.apply(this, args);

            // 保存排序状态
            const [column, direction] = args;
            const sortDirection = direction ? "desc" : "asc";
            if (typeof column === "string") {
              ItemNumberingFactory.saveSortState(column, sortDirection);
            }

            return result;
          };
        }

        // 监听列头点击事件（用于排序）
        if (itemsView.tree) {
          itemsView.tree.addEventListener("click", (event: Event) => {
            const target = event.target as Element;
            if (
              target &&
              target.tagName === "treecol" &&
              target.getAttribute("data-key") === "itemNumber"
            ) {
              // 检测排序方向并保存
              setTimeout(() => {
                const sortField = itemsView.getSortField
                  ? itemsView.getSortField()
                  : null;
                const sortDirection = itemsView.getSortDirection
                  ? itemsView.getSortDirection()
                  : null;

                if (sortField === "itemNumber") {
                  ItemNumberingFactory.saveSortState(
                    sortField,
                    sortDirection || "asc",
                  );
                }
              }, 100);
            }
          });
        }

        ztoolkit.log("Sort state save listeners registered");
      }
    }, 2500);
  }
}

async function onMainWindowUnload(win: Window): Promise<void> {
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();

  // Cleanup Quick Preview
  try {
    QuickPreview.cleanup();
  } catch (error) {
    ztoolkit.log("Error during Quick Preview cleanup:", error);
  }

  // Remove addon object
  addon.data.alive = false;
  // @ts-ignore - Plugin instance is not typed
  delete Zotero[addon.data.config.addonInstance];
}

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this funcion clear.
 */
async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  // You can add your code to the corresponding notify type
  ztoolkit.log("notify", event, type, ids, extraData);
  if (
    event == "select" &&
    type == "tab" &&
    extraData[ids[0]].type == "reader"
  ) {
    BasicExampleFactory.exampleNotifierCallback();
  }

  // Handle item changes for numbering
  if (addon.data.itemNumbering) {
    if (type === "item" || type === "collection") {
      ItemNumberingFactory.handleItemChange(event, type, ids as number[]);
    }
    // 处理选择变化事件（包括集合切换）
    if (event === "select") {
      ItemNumberingFactory.handleItemChange(event, type, ids as number[]);
    }
  }
}

/**
 * This function is just an example of dispatcher for Preference UI events.
 * Any operations should be placed in a function to keep this funcion clear.
 * @param type event type
 * @param data event data
 */
async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  switch (type) {
    case "load":
      registerPrefsScripts(data.window);
      break;
    default:
      return;
  }
}

function onShortcuts(type: string) {
  switch (type) {
    case "larger":
      KeyExampleFactory.exampleShortcutLargerCallback();
      break;
    case "smaller":
      KeyExampleFactory.exampleShortcutSmallerCallback();
      break;
    default:
      break;
  }
}

function onDialogEvents(type: string) {
  switch (type) {
    case "clipboardExample":
      HelperExampleFactory.clipboardExample();
      break;
    case "filePickerExample":
      HelperExampleFactory.filePickerExample();
      break;
    case "progressWindowExample":
      HelperExampleFactory.progressWindowExample();
      break;
    case "vtableExample":
      HelperExampleFactory.vtableExample();
      break;
    default:
      break;
  }
}

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintain.

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onPrefsEvent,
  onShortcuts,
  onDialogEvents,
};
