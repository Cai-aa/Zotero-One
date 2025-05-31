import { getString } from "../utils/locale";

export class ItemNumberingFactory {
  private static numberingEnabled = true;
  private static itemNumbers = new Map<number, number>();
  private static currentNumber = 1;

  /**
   * 注册文献编号列
   */
  static async registerNumberingColumn() {
    await Zotero.ItemTreeManager.registerColumns([
      {
        dataKey: "itemNumber",
        label: getString("column-number-label"),
        pluginID: addon.data.config.addonID,
        dataProvider: (item: Zotero.Item, dataKey: string): string => {
          return this.getItemNumber(item);
        },
        renderCell(index: number, data: string, column: any, isFirstColumn: boolean, doc: Document) {
          const span = doc.createElement("span");
          span.textContent = data;
          span.style.textAlign = "center";
          span.style.fontWeight = "bold";
          span.style.color = "#666";
          return span;
        },
        width: "50",
      }
    ]);
  }

  /**
   * 获取文献的编号
   */
  private static getItemNumber(item: Zotero.Item): string {
    if (!this.numberingEnabled || !item || item.isNote() || item.isAttachment()) {
      return "";
    }

    const itemID = item.id;
    if (!this.itemNumbers.has(itemID)) {
      this.itemNumbers.set(itemID, this.currentNumber++);
    }

    return this.itemNumbers.get(itemID)?.toString() || "";
  }

  /**
   * 重新计算所有文献的编号
   */
  static recalculateNumbers() {
    this.itemNumbers.clear();
    this.currentNumber = 1;
    
    // 触发界面刷新
    this.refreshItemTree();
  }

  /**
   * 刷新项目树
   */
  static refreshItemTree() {
    const win = Zotero.getMainWindow();
    if (win && win.ZoteroPane && win.ZoteroPane.itemsView) {
      const itemsView = win.ZoteroPane.itemsView;
      if (itemsView && typeof itemsView.tree !== 'boolean' && itemsView.tree) {
        itemsView.tree.invalidate();
      }
    }
  }

  /**
   * 切换编号显示状态
   */
  static toggleNumbering() {
    this.numberingEnabled = !this.numberingEnabled;
    this.recalculateNumbers();
    
    new ztoolkit.ProgressWindow(addon.data.config.addonName)
      .createLine({
        text: this.numberingEnabled 
          ? getString("numbering-enabled")
          : getString("numbering-disabled"),
        type: "success",
        progress: 100,
      })
      .show();
  }

  /**
   * 监听文献变化事件
   */
  static handleItemChange(event: string, type: string, ids: number[] | string[]) {
    if (type === "item" && (event === "add" || event === "delete" || event === "modify")) {
      // 当有文献添加、删除或修改时，重新计算编号
      this.recalculateNumbers();
    }
  }

  /**
   * 注册右键菜单项
   */
  static registerContextMenu() {
    const menuIcon = `chrome://${addon.data.config.addonRef}/content/icons/favicon@0.5x.png`;
    
    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: "zotero-itemmenu-toggle-numbering",
      label: getString("menuitem-toggle-numbering"),
      commandListener: () => this.toggleNumbering(),
      icon: menuIcon,
    });
  }

  /**
   * 注册工具栏按钮
   */
  static registerToolbarButton() {
    const doc = Zotero.getMainWindow()?.document;
    if (!doc) return;

    const toolbar = doc.getElementById("zotero-toolbar");
    if (!toolbar) return;

    const button = ztoolkit.UI.createElement(doc, "toolbarbutton", {
      id: "zotero-tb-toggle-numbering",
      properties: {
        label: getString("toolbar-toggle-numbering"),
        tooltiptext: getString("toolbar-toggle-numbering-tooltip"),
        class: "zotero-tb-button",
      },
      listeners: [
        {
          type: "command",
          listener: () => this.toggleNumbering(),
        },
      ],
    });

    toolbar.appendChild(button);
  }
}