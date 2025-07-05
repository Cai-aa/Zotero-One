import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";

export class ItemNumberingFactory {
  private static numberingEnabled = true;
  private static itemNumbers = new Map<number, number>();
  private static collectionItemNumbers = new Map<string, Map<number, number>>(); // 每个集合的编号映射
  private static currentCollectionKey: string | null = null;

  /**
   * 注册文献编号列
   */
  static async registerNumberingColumn() {
    try {
      ztoolkit.log("Registering item numbering column...");

      // 检查列是否已经注册（通过检查 DOM 元素）
      const columnExists = this.isColumnRegistered();

      if (columnExists) {
        ztoolkit.log(
          "Item numbering column already exists, skipping registration",
        );
      } else {
        await Zotero.ItemTreeManager.registerColumns([
          {
            dataKey: "itemNumber",
            label: getString("column-number-label"),
            pluginID: addon.data.config.addonID,
            dataProvider: (item: Zotero.Item, dataKey: string): string => {
              return ItemNumberingFactory.getItemNumber(item);
            },
            renderCell(
              index: number,
              data: string,
              column: any,
              isFirstColumn: boolean,
              doc: Document,
            ) {
              const span = doc.createElement("span");
              span.className = `cell ${column.className}`;
              span.textContent = data;
              span.style.textAlign = "left";
              return span;
            },
            width: "50",
          },
        ]);
        ztoolkit.log("Item numbering column registered successfully");
      }

      // 确保列在界面中可见
      await this.ensureColumnVisible();

      // 恢复列位置
      setTimeout(() => {
        this.restoreColumnPosition();
      }, 500);

      // 延时初始化编号，确保 Zotero 界面完全加载
      setTimeout(async () => {
        await this.recalculateNumbers();
      }, 1000);
    } catch (error) {
      ztoolkit.log("Error registering item numbering column:", error);
    }
  }

  /**
   * 检查编号列是否已注册
   */
  private static isColumnRegistered(): boolean {
    try {
      const pane = Zotero.getActiveZoteroPane();
      if (!pane || !pane.itemsView || !pane.itemsView.tree) {
        return false;
      }

      const tree = pane.itemsView.tree;
      if (!tree.columns) {
        return false;
      }

      // 检查 DOM 中是否存在我们的列
      for (let i = 0; i < tree.columns.length; i++) {
        const column = tree.columns.getColumnAt(i);
        if (
          column &&
          (column.id === "zotero-items-column-itemNumber" ||
            column.element?.getAttribute("data-key") === "itemNumber")
        ) {
          return true;
        }
      }

      return false;
    } catch (error) {
      ztoolkit.log("Error checking if column is registered:", error);
      return false;
    }
  }

  /**
   * 确保编号列在界面中可见
   */
  static async ensureColumnVisible() {
    try {
      const pane = Zotero.getActiveZoteroPane();
      if (!pane || !pane.itemsView) {
        ztoolkit.log("No active pane or items view found");
        return;
      }

      // 尝试获取当前的列配置
      const itemsView = pane.itemsView;

      // 检查列是否已经可见
      if (itemsView.tree && itemsView.tree.columns) {
        const columns = itemsView.tree.columns;
        let columnFound = false;

        for (let i = 0; i < columns.length; i++) {
          const column = columns.getColumnAt(i);
          if (column && column.id === "zotero-items-column-itemNumber") {
            columnFound = true;
            ztoolkit.log("Item numbering column found in tree");
            break;
          }
        }

        if (!columnFound) {
          ztoolkit.log(
            "Item numbering column not found in tree, will be auto-added",
          );
        }
      }

      // 尝试刷新列布局
      if (typeof itemsView.refreshColumns === "function") {
        itemsView.refreshColumns();
        ztoolkit.log("Refreshed columns layout");
      }
    } catch (error) {
      ztoolkit.log("Error ensuring column visibility:", error);
    }
  }

  /**
   * 获取文献的编号
   */
  static getItemNumber(item: Zotero.Item): string {
    if (
      !this.numberingEnabled ||
      !item ||
      item.isNote() ||
      item.isAttachment()
    ) {
      return "";
    }

    try {
      // 检查当前集合是否发生变化
      const pane = Zotero.getActiveZoteroPane();
      if (pane) {
        const currentCollectionKey = this.getCurrentCollectionKey(pane);

        // 如果集合发生变化，重新计算编号
        if (currentCollectionKey !== this.currentCollectionKey) {
          ztoolkit.log(
            `Collection changed from ${this.currentCollectionKey} to ${currentCollectionKey}, recalculating...`,
          );
          this.currentCollectionKey = currentCollectionKey;
          this.recalculateNumbers();
        }

        // 从当前集合的编号映射中获取编号
        const collectionNumbers =
          this.collectionItemNumbers.get(currentCollectionKey);
        if (collectionNumbers) {
          const number = collectionNumbers.get(item.id);
          return number ? String(number) : "";
        }
      }

      // 如果没有找到对应的集合编号，尝试从全局映射中获取
      const number = this.itemNumbers.get(item.id);
      return number ? String(number) : "";
    } catch (error) {
      ztoolkit.log("Error getting item number:", error);
      return "";
    }
  }

  /**
   * 重新计算所有文献的编号
   */
  static async recalculateNumbers() {
    const pane = Zotero.getActiveZoteroPane();
    if (!pane) {
      ztoolkit.log("No active Zotero pane found");
      return;
    }

    try {
      // 获取当前选中的位置信息
      const currentCollectionKey = this.getCurrentCollectionKey(pane);
      this.currentCollectionKey = currentCollectionKey;

      ztoolkit.log(`Current collection key: ${currentCollectionKey}`);

      // 获取当前视图中的所有条目
      const items = await this.getCurrentViewItems(pane);

      // 过滤出有效的文献条目
      const validItems = items.filter((item: Zotero.Item) =>
        item.isRegularItem(),
      );

      ztoolkit.log(
        `Found ${validItems.length} valid items for numbering in collection: ${currentCollectionKey}`,
      );

      // 为当前集合创建编号映射
      const numberMap = new Map<number, number>();
      validItems.forEach((item: Zotero.Item, index: number) => {
        numberMap.set(item.id, index + 1);
        ztoolkit.log(
          `Item ${item.id} assigned number ${index + 1} in collection ${currentCollectionKey}`,
        );
      });

      // 存储当前集合的编号映射
      this.collectionItemNumbers.set(currentCollectionKey, numberMap);

      // 更新全局编号映射为当前集合的映射
      this.itemNumbers = numberMap;

      this.refreshItemTree();
    } catch (error) {
      ztoolkit.log("Error recalculating item numbers:", error);
    }
  }

  /**
   * 刷新项目树
   */
  private static refreshItemTree() {
    try {
      const pane = Zotero.getActiveZoteroPane();
      if (pane) {
        if (pane.itemsView && typeof pane.itemsView.refresh === "function") {
          ztoolkit.log("Refreshing items view");
          pane.itemsView.refresh();
        } else if (
          pane.itemsView &&
          typeof pane.itemsView.tree?.invalidate === "function"
        ) {
          ztoolkit.log("Invalidating tree view");
          pane.itemsView.tree.invalidate();
        }

        // 强制重绘界面
        if (pane.document && pane.document.defaultView) {
          const event = new pane.document.defaultView.CustomEvent("resize");
          pane.document.defaultView.dispatchEvent(event);
        }
      }
    } catch (error) {
      ztoolkit.log("Error refreshing item tree:", error);
    }
  }

  /**
   * 获取当前的排序信息
   */
  private static getCurrentSortInfo(): { column: string; direction: string } {
    const win = Zotero.getMainWindow();
    if (!win || !win.ZoteroPane || !win.ZoteroPane.itemsView) {
      return { column: "dateAdded", direction: "asc" };
    }

    const itemsView = win.ZoteroPane.itemsView;

    // 尝试获取排序信息
    try {
      // 检查itemsView是否有getSortField和getSortDirection方法
      if (
        typeof itemsView.getSortField === "function" &&
        typeof itemsView.getSortDirection === "function"
      ) {
        const sortField = itemsView.getSortField();
        const sortDirection = itemsView.getSortDirection();
        return {
          column: sortField || "dateAdded",
          direction: sortDirection || "asc",
        };
      }

      // 尝试从tree对象获取排序信息
      if (itemsView.tree && typeof itemsView.tree !== "boolean") {
        const tree = itemsView.tree;
        if (tree.sortColumn && tree.sortDirection) {
          return {
            column: tree.sortColumn,
            direction: tree.sortDirection,
          };
        }
      }

      // 尝试从其他可能的属性获取
      if ((itemsView as any)._sortColumn && (itemsView as any)._sortDirection) {
        return {
          column: (itemsView as any)._sortColumn,
          direction: (itemsView as any)._sortDirection,
        };
      }
    } catch (error) {
      ztoolkit.log("Error getting sort info:", error);
    }

    // 默认排序
    return { column: "dateAdded", direction: "asc" };
  }

  /**
   * 根据指定的列和方向对条目进行排序
   * @param items - 要排序的 Zotero 条目数组
   * @param column - 排序依据的列（字段）
   * @param direction - 排序方向 ('asc' 或 'desc')
   */
  static sortItems(
    items: Zotero.Item[],
    column: string,
    direction: "asc" | "desc",
  ) {
    const isAscending = direction === "asc";

    items.sort((a, b) => {
      let valA: any, valB: any;

      // 特殊处理创建者字段
      if (column === "creator") {
        valA = a
          .getCreators()
          .map((c) => c.lastName || (c as any).name || "")
          .join(", ");
        valB = b
          .getCreators()
          .map((c) => c.lastName || (c as any).name || "")
          .join(", ");
      } else {
        valA = a.getField(column) || (a as any)[column];
        valB = b.getField(column) || (b as any)[column];
      }

      // 如果值为 null 或 undefined，则默认为空字符串
      valA = valA ?? "";
      valB = valB ?? "";

      let comparison = 0;
      if (typeof valA === "string" && typeof valB === "string") {
        comparison = valA.localeCompare(valB, undefined, { numeric: true });
      } else if (valA < valB) {
        comparison = -1;
      } else if (valA > valB) {
        comparison = 1;
      }

      return isAscending ? comparison : -comparison;
    });
  }

  /**
   * 注册右键菜单
   */
  static registerContextMenu() {
    // 添加右键菜单项
    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: "zotero-one-menuitem",
      label: getString("menuitem-toggle-numbering"),
      commandListener: () => {
        this.toggleNumbering();
      },
    });
  }

  /**
   * 注册工具栏按钮
   */
  static registerToolbarButton() {
    const doc = Zotero.getMainWindow().document;
    const toolbarbutton = ztoolkit.UI.createElement(doc, "toolbarbutton", {
      namespace: "xul",
    });
    toolbarbutton.id = "zotero-one-toolbarbutton";
    toolbarbutton.className = "zotero-tb-button";
    toolbarbutton.setAttribute(
      "tooltiptext",
      getString("toolbar-button-tooltip"),
    );
    toolbarbutton.setAttribute(
      "oncommand",
      "Zotero.ZoteroOne.toggleNumbering();",
    );

    doc.getElementById("zotero-toolbar-items")?.appendChild(toolbarbutton);
  }

  /**
   * 获取当前集合的唯一键
   */
  private static getCurrentCollectionKey(pane: any): string {
    try {
      const selectedCollection = pane.getSelectedCollection();
      if (selectedCollection) {
        return `collection-${selectedCollection.id}`;
      }

      // 检查是否在特殊视图中（如回收站、未分类等）
      const selectedGroup = pane.getSelectedGroup();
      if (selectedGroup) {
        return `group-${selectedGroup.id}`;
      }

      // 检查是否在搜索视图中
      if (pane.getCollectionTreeRow && pane.getCollectionTreeRow().isSearch()) {
        return `search-${pane.getCollectionTreeRow().ref.id}`;
      }

      // 默认为库视图
      const libraryID = pane.getSelectedLibraryID();
      return `library-${libraryID}`;
    } catch (error) {
      ztoolkit.log("Error getting collection key:", error);
      return "default";
    }
  }

  /**
   * 获取当前视图中的所有项目
   */
  private static async getCurrentViewItems(pane: any): Promise<Zotero.Item[]> {
    try {
      // 尝试从当前的 itemsView 获取项目
      if (
        pane.itemsView &&
        typeof pane.itemsView.getVisibleItems === "function"
      ) {
        const visibleItems = pane.itemsView.getVisibleItems();
        if (visibleItems && visibleItems.length > 0) {
          return visibleItems;
        }
      }

      // 如果无法从 itemsView 获取，则根据选择的位置获取
      const selectedCollection = pane.getSelectedCollection();
      if (selectedCollection) {
        return await selectedCollection.getChildItems();
      }

      // 如果在库视图中，获取所有项目
      const libraryID = pane.getSelectedLibraryID();
      return await Zotero.Items.getAll(libraryID);
    } catch (error) {
      ztoolkit.log("Error getting current view items:", error);
      return [];
    }
  }

  /**
   * 切换编号显示
   */
  static toggleNumbering() {
    this.numberingEnabled = !this.numberingEnabled;
    this.refreshItemTree();
  }

  /**
   * 保存编号列的位置
   */
  static saveColumnPosition() {
    try {
      const pane = Zotero.getActiveZoteroPane();
      if (!pane || !pane.itemsView || !pane.itemsView.tree) {
        return;
      }

      const tree = pane.itemsView.tree;
      if (!tree.columns) {
        return;
      }

      // 查找编号列的位置
      let itemNumberColumnIndex = -1;
      const columnOrder: string[] = [];

      for (let i = 0; i < tree.columns.length; i++) {
        const column = tree.columns.getColumnAt(i);
        if (column) {
          const dataKey =
            column.element?.getAttribute("data-key") ||
            column.id?.replace("zotero-items-column-", "");
          columnOrder.push(dataKey);

          if (dataKey === "itemNumber") {
            itemNumberColumnIndex = i;
          }
        }
      }

      if (itemNumberColumnIndex >= 0) {
        ztoolkit.log(
          `Saving item number column position: ${itemNumberColumnIndex}`,
        );
        setPref("columnPosition" as any, itemNumberColumnIndex);
        setPref("columnOrder" as any, JSON.stringify(columnOrder));
      }
    } catch (error) {
      ztoolkit.log("Error saving column position:", error);
    }
  }

  /**
   * 恢复编号列的位置
   */
  static restoreColumnPosition() {
    try {
      const savedPosition = getPref("columnPosition" as any);
      const savedOrder = getPref("columnOrder" as any);

      if (typeof savedPosition !== "number" || !savedOrder) {
        ztoolkit.log("No saved column position found");
        return;
      }

      const pane = Zotero.getActiveZoteroPane();
      if (!pane || !pane.itemsView || !pane.itemsView.tree) {
        ztoolkit.log("No active pane found for column restoration");
        return;
      }

      const tree = pane.itemsView.tree;
      if (!tree.columns) {
        return;
      }

      ztoolkit.log(
        `Attempting to restore column position to: ${savedPosition}`,
      );

      // 查找当前编号列的位置
      let currentItemNumberIndex = -1;
      for (let i = 0; i < tree.columns.length; i++) {
        const column = tree.columns.getColumnAt(i);
        if (column) {
          const dataKey =
            column.element?.getAttribute("data-key") ||
            column.id?.replace("zotero-items-column-", "");
          if (dataKey === "itemNumber") {
            currentItemNumberIndex = i;
            break;
          }
        }
      }

      if (
        currentItemNumberIndex >= 0 &&
        currentItemNumberIndex !== savedPosition
      ) {
        // 尝试移动列到保存的位置
        const itemNumberColumn = tree.columns.getColumnAt(
          currentItemNumberIndex,
        );
        if (itemNumberColumn && typeof tree.columns.moveColumn === "function") {
          // 如果目标位置有效，移动列
          if (savedPosition < tree.columns.length) {
            tree.columns.moveColumn(itemNumberColumn, savedPosition);
            ztoolkit.log(
              `Moved item number column from ${currentItemNumberIndex} to ${savedPosition}`,
            );
          }
        }
      }
    } catch (error) {
      ztoolkit.log("Error restoring column position:", error);
    }
  }

  /**
   * 比较两个条目用于排序
   */
  static compareItems(
    a: Zotero.Item,
    b: Zotero.Item,
    sortDirection: number,
  ): number {
    const numA = this.getItemNumberValue(a);
    const numB = this.getItemNumberValue(b);

    // 按编号排序
    const comparison = numA - numB;
    return sortDirection > 0 ? comparison : -comparison;
  }

  /**
   * 获取条目的编号数值（用于排序）
   */
  private static getItemNumberValue(item: Zotero.Item): number {
    if (
      !this.numberingEnabled ||
      !item ||
      item.isNote() ||
      item.isAttachment()
    ) {
      return 999999; // 将无效项目排到最后
    }

    const number = this.itemNumbers.get(item.id);
    return number || 999999; // 没有编号的项目排到最后
  }

  /**
   * 保存排序状态
   */
  static saveSortState(column: string, direction: string) {
    try {
      if (column === "itemNumber") {
        ztoolkit.log(`Saving sort state: ${column}, direction: ${direction}`);
        setPref("sortColumn" as any, column);
        setPref("sortDirection" as any, direction);
      }
    } catch (error) {
      ztoolkit.log("Error saving sort state:", error);
    }
  }

  /**
   * 恢复排序状态
   */
  static restoreSortState() {
    try {
      const savedColumn = getPref("sortColumn" as any);
      const savedDirection = getPref("sortDirection" as any);

      if (savedColumn === "itemNumber" && savedDirection) {
        ztoolkit.log(
          `Restoring sort state: ${savedColumn}, direction: ${savedDirection}`,
        );

        const pane = Zotero.getActiveZoteroPane();
        if (pane && pane.itemsView) {
          // 尝试恢复排序状态
          setTimeout(() => {
            this.applySortState(savedColumn, savedDirection);
          }, 1000);
        }
      }
    } catch (error) {
      ztoolkit.log("Error restoring sort state:", error);
    }
  }

  /**
   * 应用排序状态
   */
  private static applySortState(column: string, direction: string) {
    try {
      const pane = Zotero.getActiveZoteroPane();
      if (!pane || !pane.itemsView) {
        return;
      }

      const itemsView = pane.itemsView;

      // 尝试设置排序
      if (typeof itemsView.sort === "function") {
        itemsView.sort(column, direction === "asc" ? false : true);
        ztoolkit.log(`Applied sort: ${column}, ${direction}`);
      }
    } catch (error) {
      ztoolkit.log("Error applying sort state:", error);
    }
  }

  /**
   * 处理项目变化事件
   */
  static handleItemChange(event: string, type: string, ids: number[]) {
    if (
      event === "add" ||
      event === "modify" ||
      event === "delete" ||
      event === "select"
    ) {
      // 延时执行以确保界面更新完成
      setTimeout(() => {
        this.recalculateNumbers();
      }, 100);
    }
  }

  /**
   * 检查并恢复编号列（启动时调用）
   */
  static async checkAndRestoreColumn() {
    try {
      ztoolkit.log("Checking if item numbering column needs to be restored...");

      // 等待足够长的时间确保 Zotero 完全启动
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const pane = Zotero.getActiveZoteroPane();
      if (!pane || !pane.itemsView) {
        ztoolkit.log("No active pane found during column check");
        return;
      }

      // 检查列是否已经存在
      const columnExists = this.isColumnRegistered();

      if (!columnExists) {
        ztoolkit.log("Item numbering column not found, re-registering...");
        await this.registerNumberingColumn();
      } else {
        ztoolkit.log("Item numbering column exists, ensuring visibility...");
        await this.ensureColumnVisible();
        // 恢复列位置
        setTimeout(() => {
          this.restoreColumnPosition();
        }, 500);
        // 恢复排序状态
        setTimeout(() => {
          this.restoreSortState();
        }, 1500);
        await this.recalculateNumbers();
      }
    } catch (error) {
      ztoolkit.log("Error in checkAndRestoreColumn:", error);
    }
  }
}
