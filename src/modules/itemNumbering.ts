import { getString } from "../utils/locale";

export class ItemNumberingFactory {
  private static numberingEnabled = true;
  private static itemNumbers = new Map<number, number>();
  private static collectionNumbers = new Map<number, number>(); // 存储每个集合的编号计数器
  private static currentCollectionID: number | null = null;

  /**
   * 注册文献编号列
   */
  static async registerNumberingColumn() {
    try {
      ztoolkit.log("Registering item numbering column...");
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
            span.style.fontWeight = "normal";
            span.style.color = "#666";
            span.style.fontSize = "12px";
            span.style.display = "flex";
            span.style.alignItems = "center";
            span.style.justifyContent = "center";
            span.style.height = "100%";
            span.style.width = "100%";
            span.style.boxSizing = "border-box";
            return span;
          },
          width: "50",
        }
      ]);
      ztoolkit.log("Item numbering column registered successfully");
      
      // 注册集合选择变化监听器
      this.registerCollectionSelectionListener();
    } catch (error) {
      ztoolkit.log("Error registering item numbering column:", error);
    }
  }

  /**
   * 注册集合选择变化监听器
   */
  private static registerCollectionSelectionListener() {
    const win = Zotero.getMainWindow();
    if (!win || !win.ZoteroPane) return;
    
    const collectionsView = win.ZoteroPane.collectionsView;
    if (!collectionsView || typeof collectionsView === 'boolean') return;
    
    // 监听集合视图的选择变化
    const originalSelectCollection = (collectionsView as any).selectCollection;
    if (originalSelectCollection && typeof originalSelectCollection === 'function') {
      (collectionsView as any).selectCollection = function(...args: any[]) {
        const result = originalSelectCollection.apply(this, args);
        // 延迟执行以确保选择已经完成
        setTimeout(async () => {
          ItemNumberingFactory.currentCollectionID = null;
          await ItemNumberingFactory.recalculateNumbers();
        }, 100);
        return result;
      };
    }
  }

  /**
   * 获取文献的编号
   */
  private static getItemNumber(item: Zotero.Item): string {
    if (!this.numberingEnabled || !item || item.isNote() || item.isAttachment()) {
      return "";
    }

    const itemID = item.id;
    
    // 获取当前选中的集合
    const currentCollectionID = this.getCurrentCollectionID();
    
    // 如果集合发生变化，重新计算编号
    if (this.currentCollectionID !== currentCollectionID) {
      this.currentCollectionID = currentCollectionID;
      this.recalculateNumbersForCollection(currentCollectionID).catch(console.error);
    }
    
    // 检查该文献是否属于当前集合
    if (!this.isItemInCurrentCollection(item, currentCollectionID)) {
      return "";
    }

    return this.itemNumbers.get(itemID)?.toString() || "";
  }

  /**
   * 重新计算所有文献的编号
   */
  static async recalculateNumbers() {
    const currentCollectionID = this.getCurrentCollectionID();
    await this.recalculateNumbersForCollection(currentCollectionID);
    
    // 触发界面刷新
    this.refreshItemTree();
  }

  /**
   * 为特定集合重新计算编号
   */
  private static async recalculateNumbersForCollection(collectionID: number | null) {
    this.itemNumbers.clear();
    
    let items: Zotero.Item[] = [];
    
    if (collectionID === null) {
      // 我的文库根目录
      const libraryID = Zotero.Libraries.userLibraryID;
      const allItems = await Zotero.Items.getAll(libraryID);
      items = allItems.filter((item: Zotero.Item) => 
        !item.isNote() && !item.isAttachment() && !item.getCollections().length
      );
    } else if (collectionID === -1) {
      // 所有文献
      const libraryID = Zotero.Libraries.userLibraryID;
      const allItems = await Zotero.Items.getAll(libraryID);
      items = allItems.filter((item: Zotero.Item) => 
        !item.isNote() && !item.isAttachment()
      );
    } else {
      // 特定集合
      const collection = Zotero.Collections.get(collectionID);
      if (collection) {
        const childItems = collection.getChildItems();
        items = childItems.filter((item: Zotero.Item) => 
          !item.isNote() && !item.isAttachment()
        );
      }
    }
    
    // 按照添加时间排序
    items.sort((a: Zotero.Item, b: Zotero.Item) => {
      const dateA = a.dateAdded || "";
      const dateB = b.dateAdded || "";
      return dateA.localeCompare(dateB);
    });
    
    // 分配编号
    items.forEach((item: Zotero.Item, index: number) => {
      this.itemNumbers.set(item.id, index + 1);
    });
  }

  /**
   * 获取当前选中的集合ID
   */
  private static getCurrentCollectionID(): number | null {
    const win = Zotero.getMainWindow();
    if (!win || !win.ZoteroPane) return null;
    
    const zp = win.ZoteroPane;
    if (!zp.collectionsView || !zp.collectionsView.selection) return null;
    
    const selected = zp.collectionsView.getSelectedCollection();
    if (!selected) {
      // 检查是否选中了特殊视图
      const selectedLibraryID = zp.collectionsView.getSelectedLibraryID();
      if (selectedLibraryID !== null) {
        return -1; // 表示"我的文库"根目录
      }
      return null;
    }
    
    return selected.id;
  }

  /**
   * 检查文献是否属于当前集合
   */
  private static isItemInCurrentCollection(item: Zotero.Item, collectionID: number | null): boolean {
    if (collectionID === null) {
      return true; // 根目录显示所有文献
    }
    
    if (collectionID === -1) {
      // 我的文库根目录，显示不属于任何集合的文献
      return item.getCollections().length === 0;
    }
    
    // 检查文献是否属于指定集合
    return item.getCollections().includes(collectionID);
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
      this.recalculateNumbers().catch(console.error);
    }
    
    if (type === "collection" && (event === "select" || event === "add" || event === "delete")) {
      // 当集合选择发生变化时，重新计算编号
      this.currentCollectionID = null; // 强制重新获取集合ID
      this.recalculateNumbers().catch(console.error);
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