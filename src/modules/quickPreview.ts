import { getString } from "../utils/locale";

export class QuickPreview {
  private static instance: QuickPreview | null = null;
  private static isInitialized = false;
  private static previewOverlay: HTMLElement | null = null;
  private static currentItem: Zotero.Item | null = null;
  private static keyEventListener: ((event: Event) => void) | null = null;
  private static isEditMode = false;
  private static editedData: { [key: string]: any } = {};
  private static tagsExpanded = false;
  private static isPDFMode = false;

  /**
   * 初始化快速预览功能
   */
  static initialize() {
    if (this.isInitialized) {
      ztoolkit.log("Quick Preview already initialized");
      return;
    }

    try {
      ztoolkit.log("Initializing Quick Preview...");
      // 延迟初始化以确保Zotero完全加载
      setTimeout(() => {
        this.setupKeyboardListeners();
        this.isInitialized = true;
        ztoolkit.log("Quick Preview initialized successfully");
      }, 1000);
    } catch (error) {
      ztoolkit.log("Error initializing Quick Preview:", error);
    }
  }

  /**
   * 设置键盘事件监听器
   */
  private static setupKeyboardListeners() {
    // 移除已存在的监听器
    if (this.keyEventListener) {
      this.removeKeyboardListeners();
    }

    // 创建新的事件监听器
    this.keyEventListener = (event: Event) => {
      this.handleKeyboardEvent(event as KeyboardEvent);
    };

    ztoolkit.log("Setting up keyboard listeners...");

    // 在主窗口上添加键盘事件监听
    const mainWindow = Zotero.getMainWindow();
    ztoolkit.log("Main window for event listener:", mainWindow);
    if (mainWindow && mainWindow.document) {
      mainWindow.document.addEventListener(
        "keydown",
        this.keyEventListener,
        true,
      );
      ztoolkit.log("Keyboard event listeners added to main window");
    } else {
      ztoolkit.log(
        "Could not add keyboard listener - no main window or document",
      );
    }

    // 在所有Zotero窗口上添加监听器
    const windows = Zotero.getMainWindows();
    ztoolkit.log("All Zotero windows:", windows);
    windows.forEach((win, index) => {
      if (win && win.document) {
        win.document.addEventListener("keydown", this.keyEventListener!, true);
        ztoolkit.log(`Added keyboard listener to window ${index}`);
      }
    });
  }

  /**
   * 移除键盘事件监听器
   */
  private static removeKeyboardListeners() {
    if (!this.keyEventListener) {
      return;
    }

    const mainWindow = Zotero.getMainWindow();
    if (mainWindow && mainWindow.document) {
      mainWindow.document.removeEventListener(
        "keydown",
        this.keyEventListener,
        true,
      );
    }

    // 从所有窗口移除监听器
    const windows = Zotero.getMainWindows();
    windows.forEach((win) => {
      if (win && win.document) {
        win.document.removeEventListener(
          "keydown",
          this.keyEventListener!,
          true,
        );
      }
    });
  }

  /**
   * 处理键盘事件
   */
  private static handleKeyboardEvent(event: KeyboardEvent) {
    ztoolkit.log(`Key pressed: ${event.key}, code: ${event.code}`);

    // 空格键 (keyCode 32, key ' ')
    if (event.code === "Space" || event.key === " ") {
      ztoolkit.log("Space key detected");

      // 检查是否在输入框或文本区域中
      const target = event.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          (target as any).contentEditable === "true" ||
          target.closest("input") ||
          target.closest("textarea") ||
          target.closest('[contenteditable="true"]') ||
          // 添加对Zotero特定搜索框的检查
          target.id?.includes("search") ||
          target.className?.includes("search") ||
          target.closest('[id*="search"]') ||
          target.closest('[class*="search"]') ||
          target.closest('[role="searchbox"]') ||
          target.closest('[type="search"]') ||
          // 检查是否在Zotero的快速搜索框中
          target.closest("#zotero-tb-search") ||
          target.closest(".zotero-tb-search") ||
          target.closest('[placeholder*="search" i]') ||
          target.closest('[placeholder*="搜索" i]') ||
          // 检查焦点是否在可编辑元素中
          target.hasAttribute?.("contenteditable") ||
          // 检查是否在文本输入相关的元素中
          (target as HTMLInputElement).type === "text" ||
          (target as HTMLInputElement).type === "search" ||
          (target as HTMLInputElement).type === "email" ||
          (target as HTMLInputElement).type === "url" ||
          (target as HTMLInputElement).type === "password")
      ) {
        ztoolkit.log(
          "Event target is in input field, search box or editable area, ignoring space key",
        );
        return; // 在输入框、搜索框或可编辑区域中不触发预览
      }

      // 如果预览窗口已打开，关闭它
      if (this.previewOverlay) {
        ztoolkit.log("Preview is open, closing with spacebar");
        event.preventDefault();
        event.stopPropagation();
        this.closePreview();
        return;
      }

      // 如果预览窗口未打开，检查是否有选中的文献来打开预览
      const selectedItem = this.getSelectedItem();
      ztoolkit.log("Selected item:", selectedItem);
      if (selectedItem) {
        ztoolkit.log("Preventing default and showing preview");
        event.preventDefault();
        event.stopPropagation();
        this.showPreview(selectedItem);
      } else {
        ztoolkit.log("No item selected for preview");
      }
    }

    // ESC键关闭预览
    else if (event.code === "Escape" || event.key === "Escape") {
      ztoolkit.log("ESC key detected");
      if (this.previewOverlay) {
        ztoolkit.log("Closing preview with ESC");
        event.preventDefault();
        event.stopPropagation();
        this.closePreview();
      }
    }
  }

  /**
   * 获取当前选中的文献项目
   */
  private static getSelectedItem(): Zotero.Item | null {
    try {
      const pane = Zotero.getActiveZoteroPane();
      ztoolkit.log("Active Zotero pane:", pane);
      if (!pane) {
        ztoolkit.log("No active Zotero pane found");
        return null;
      }

      const selectedItems = pane.getSelectedItems();
      ztoolkit.log(
        "Selected items:",
        selectedItems,
        "Length:",
        selectedItems?.length,
      );
      if (selectedItems && selectedItems.length > 0) {
        const item = selectedItems[0];
        ztoolkit.log(
          "First selected item:",
          item,
          "Is regular item:",
          item.isRegularItem(),
        );
        // 只预览常规文献项目，不预览笔记和附件
        if (item.isRegularItem()) {
          return item;
        }
      }

      return null;
    } catch (error) {
      ztoolkit.log("Error getting selected item:", error);
      return null;
    }
  }

  /**
   * 显示预览窗口
   */
  static async showPreview(item: Zotero.Item) {
    try {
      ztoolkit.log("showPreview called with item:", item);
      // 如果已有预览窗口打开，先关闭
      if (this.previewOverlay) {
        ztoolkit.log("Closing existing preview overlay");
        this.closePreview();
      }

      this.currentItem = item;

      // 创建预览覆盖层
      ztoolkit.log("Creating preview overlay...");
      await this.createPreviewOverlay(item);
    } catch (error) {
      ztoolkit.log("Error showing preview:", error);
    }
  }

  /**
   * 创建预览覆盖层
   */
  private static async createPreviewOverlay(item: Zotero.Item) {
    // 多种方式获取主窗口
    let mainWindow = Zotero.getMainWindow();
    if (!mainWindow) {
      // 尝试其他方式获取窗口
      const windows = Zotero.getMainWindows();
      if (windows && windows.length > 0) {
        mainWindow = windows[0];
      }
    }

    ztoolkit.log("Main window:", mainWindow);
    if (!mainWindow || !mainWindow.document) {
      ztoolkit.log("No main window or document found");
      return;
    }

    const doc = mainWindow.document;
    ztoolkit.log("Document found:", doc, "Body:", doc.body);

    // 创建覆盖层
    this.previewOverlay = doc.createElement("div");
    this.previewOverlay.id = "zotero-quick-preview-overlay";
    this.previewOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(5px);
    `;

    // 创建预览容器
    const container = doc.createElement("div");
    container.style.cssText = `
      width: 85vw;
      height: 85vh;
      max-width: 1000px;
      max-height: 750px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      user-select: text;
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
    `;

    // 设置tabIndex以便可以接收键盘事件
    container.tabIndex = 0;

    // 创建标题栏
    const titleBar = this.createTitleBar(doc, item);
    container.appendChild(titleBar);

    // 创建内容区域 - 只显示文献信息
    const contentArea = doc.createElement("div");
    contentArea.className = "content-area";
    contentArea.style.cssText = `
      flex: 1;
      display: flex;
      overflow: hidden;
      background: white;
    `;

    // 只显示文献信息，移除PDF预览功能
    const itemInfo = this.createItemInfoPanel(doc, item);
    contentArea.appendChild(itemInfo);

    container.appendChild(contentArea);
    this.previewOverlay.appendChild(container);

    // 添加键盘事件处理
    container.addEventListener("keydown", (event: Event) => {
      const keyEvent = event as KeyboardEvent;
      if (keyEvent.key === "Escape") {
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        this.closePreview();
      }
      // 允许Ctrl+C进行复制操作
      if ((keyEvent.ctrlKey || keyEvent.metaKey) && keyEvent.key === "c") {
        // 不阻止默认行为，允许正常复制
        keyEvent.stopPropagation();
      }
    });

    // 添加点击覆盖层关闭功能
    this.previewOverlay.addEventListener("click", (event) => {
      if (event.target === this.previewOverlay) {
        this.closePreview();
      }
    });

    // 添加到文档
    if (doc.body) {
      ztoolkit.log("Adding overlay to document body");
      doc.body.appendChild(this.previewOverlay);
      ztoolkit.log(
        "Preview overlay added to DOM, overlay element:",
        this.previewOverlay,
      );

      // 聚焦到容器以便接收键盘事件
      setTimeout(() => {
        container.focus();
      }, 100);

      // 验证元素是否已添加到DOM
      const addedElement = doc.getElementById("zotero-quick-preview-overlay");
      ztoolkit.log("Element found in DOM after adding:", addedElement);
    } else {
      ztoolkit.log("Document body not found, trying documentElement");
      if (doc.documentElement) {
        doc.documentElement.appendChild(this.previewOverlay);
        ztoolkit.log("Preview overlay added to documentElement");
        // 聚焦到容器以便接收键盘事件
        setTimeout(() => {
          container.focus();
        }, 100);
      }
    }

    ztoolkit.log("Preview overlay created successfully");
  }

  /**
   * 创建标题栏
   */
  private static createTitleBar(doc: Document, item: Zotero.Item): HTMLElement {
    const titleBar = doc.createElement("div");
    titleBar.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: #fff;
      border-bottom: 1px solid #e0e0e0;
      min-height: 24px;
      border-radius: 12px 12px 0 0;
    `;

    // 空的标题区域（保持布局但不显示标题）
    const titleText = doc.createElement("div");
    titleText.style.cssText = `
      flex: 1;
    `;

    // 按钮容器
    const buttonContainer = doc.createElement("div");
    buttonContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    `;

    // PDF预览按钮 - 只有当PDF附件存在时才显示
    let pdfButton: HTMLElement | null = null;
    const hasPDFAttachment = this.checkForPDFAttachment(item);

    if (hasPDFAttachment) {
      pdfButton = doc.createElement("button");
      pdfButton.className = "pdf-button";
      pdfButton.style.cssText = `
        background: #ff9800;
        border: none;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        cursor: pointer;
        position: relative;
        transition: background-color 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 4px;
      `;
      pdfButton.title = this.isPDFMode ? "Show Info" : "Show PDF";

      // 添加PDF图标
      const pdfIcon = doc.createElement("span");
      pdfIcon.style.cssText = `
        font-size: 12px;
        color: white;
        font-weight: bold;
      `;
      pdfIcon.innerHTML = this.isPDFMode ? "📄" : "📕";
      pdfButton.appendChild(pdfIcon);

      pdfButton.addEventListener("click", (event) => {
        event.stopPropagation();
        this.togglePDFMode(item);
      });

      pdfButton.addEventListener("mouseenter", () => {
        pdfButton!.style.backgroundColor = "#f57c00";
      });

      pdfButton.addEventListener("mouseleave", () => {
        pdfButton!.style.backgroundColor = "#ff9800";
      });
    }

    // URL按钮 - 只有当URL存在时才显示
    const urlField = item.getField("url");
    let urlButton: HTMLElement | null = null;

    if (urlField) {
      urlButton = doc.createElement("button");
      urlButton.style.cssText = `
        background: #2196f3;
        border: none;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        cursor: pointer;
        position: relative;
        transition: background-color 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 4px;
      `;
      urlButton.title = "Open URL";

      // 添加URL图标
      const urlIcon = doc.createElement("span");
      urlIcon.style.cssText = `
        font-size: 12px;
        color: white;
        font-weight: bold;
      `;
      urlIcon.innerHTML = "🔗";
      urlButton.appendChild(urlIcon);

      urlButton.addEventListener("click", (event) => {
        event.stopPropagation();
        this.openURLInBrowser(urlField);
      });

      urlButton.addEventListener("mouseenter", () => {
        urlButton!.style.backgroundColor = "#1976d2";
      });

      urlButton.addEventListener("mouseleave", () => {
        urlButton!.style.backgroundColor = "#2196f3";
      });
    }

    // 编辑按钮
    const editButton = doc.createElement("button");
    editButton.className = "edit-button";
    editButton.style.cssText = `
      background: #4caf50;
      border: none;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      position: relative;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    editButton.title = "Edit Item";

    // 添加编辑图标
    const editIcon = doc.createElement("span");
    editIcon.style.cssText = `
      font-size: 12px;
      color: white;
      font-weight: bold;
    `;
    editIcon.innerHTML = "✎";
    editButton.appendChild(editIcon);

    editButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (this.isEditMode) {
        // 如果在编辑模式，保存内容
        await this.saveEditedContent(item);
      } else {
        // 如果不在编辑模式，进入编辑模式
        this.toggleEditMode(item);
      }
    });

    editButton.addEventListener("mouseenter", () => {
      editButton.style.backgroundColor = "#45a049";
    });

    editButton.addEventListener("mouseleave", () => {
      editButton.style.backgroundColor = "#4caf50";
    });

    // 在Zotero标签页打开按钮
    const openTabButton = doc.createElement("button");
    openTabButton.style.cssText = `
      background: #007acc;
      border: none;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      position: relative;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    openTabButton.title = "Open in Zotero Tab";

    // 添加标签页图标
    const tabIcon = doc.createElement("span");
    tabIcon.style.cssText = `
      font-size: 12px;
      color: white;
      font-weight: bold;
    `;
    tabIcon.innerHTML = "🗂";
    openTabButton.appendChild(tabIcon);

    openTabButton.addEventListener("click", (event) => {
      event.stopPropagation();
      this.openItemInTab(item);
    });

    openTabButton.addEventListener("mouseenter", () => {
      openTabButton.style.backgroundColor = "#005a9e";
    });

    openTabButton.addEventListener("mouseleave", () => {
      openTabButton.style.backgroundColor = "#007acc";
    });

    // 关闭按钮
    const closeButton = doc.createElement("button");
    closeButton.style.cssText = `
      background: #ff5f56;
      border: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      cursor: pointer;
      position: relative;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    `;
    closeButton.title = "Close";

    // 添加关闭图标
    const closeIcon = doc.createElement("span");
    closeIcon.style.cssText = `
      font-size: 12px;
      color: white;
      line-height: 1;
      font-weight: bold;
    `;
    closeIcon.innerHTML = "×";
    closeButton.appendChild(closeIcon);

    closeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      this.closePreview();
    });

    closeButton.addEventListener("mouseenter", () => {
      closeButton.style.backgroundColor = "#ff4136";
    });

    closeButton.addEventListener("mouseleave", () => {
      closeButton.style.backgroundColor = "#ff5f56";
    });

    // 添加PDF按钮（如果存在）
    if (pdfButton) {
      buttonContainer.appendChild(pdfButton);
    }
    // 添加URL按钮（如果存在）
    if (urlButton) {
      buttonContainer.appendChild(urlButton);
    }
    buttonContainer.appendChild(editButton);
    buttonContainer.appendChild(openTabButton);
    buttonContainer.appendChild(closeButton);

    titleBar.appendChild(titleText);
    titleBar.appendChild(buttonContainer);

    return titleBar;
  }

  /**
   * 在Zotero标签页中打开文献（优先打开PDF附件）
   */
  private static async openItemInTab(item: Zotero.Item) {
    try {
      ztoolkit.log("Opening item in Zotero tab:", item.getField("title"));

      // 首先尝试查找PDF附件
      const pdfAttachment = await this.findFirstPDFAttachment(item);

      if (pdfAttachment) {
        ztoolkit.log("Found PDF attachment, opening PDF in tab");
        await this.openPDFInTab(pdfAttachment);
      } else {
        ztoolkit.log("No PDF attachment found, opening item in tab");
        await this.openItemOnlyInTab(item);
      }

      // 关闭预览窗口
      this.closePreview();
    } catch (error) {
      ztoolkit.log("Error opening item in tab:", error);
    }
  }

  /**
   * 查找文献的第一个PDF附件
   */
  private static async findFirstPDFAttachment(
    item: Zotero.Item,
  ): Promise<Zotero.Item | null> {
    try {
      const attachmentIDs = item.getAttachments();
      ztoolkit.log(`Found ${attachmentIDs.length} total attachments`);

      for (const attachmentID of attachmentIDs) {
        const attachment = await Zotero.Items.getAsync(attachmentID);
        if (attachment && attachment.isPDFAttachment()) {
          ztoolkit.log("✓ Found PDF attachment:", attachment.getField("title"));
          return attachment;
        }
      }

      ztoolkit.log("No PDF attachments found");
      return null;
    } catch (error) {
      ztoolkit.log("Error finding PDF attachment:", error);
      return null;
    }
  }

  /**
   * 在标签页中打开PDF附件
   */
  private static async openPDFInTab(pdfAttachment: Zotero.Item) {
    try {
      // 尝试使用Zotero 7的标签页API打开PDF
      if (
        typeof (Zotero as any).Tabs !== "undefined" &&
        (Zotero as any).Tabs.open
      ) {
        (Zotero as any).Tabs.open({
          type: "reader",
          item: pdfAttachment,
        });
        ztoolkit.log("PDF opened in new tab using Zotero.Tabs.open");
      } else if (
        typeof (Zotero as any).Reader !== "undefined" &&
        (Zotero as any).Reader.open
      ) {
        // 尝试使用Reader API
        (Zotero as any).Reader.open(pdfAttachment.id);
        ztoolkit.log("PDF opened using Zotero.Reader.open");
      } else {
        // 回退方法：双击附件行为
        const pane = Zotero.getActiveZoteroPane();
        if (pane) {
          // 选中PDF附件
          pane.selectItem(pdfAttachment.id);
          // 尝试模拟双击打开
          if (typeof pane.viewAttachment === "function") {
            pane.viewAttachment([pdfAttachment.id]);
            ztoolkit.log("PDF opened using viewAttachment");
          } else {
            ztoolkit.log("Fallback: PDF attachment selected");
          }
        }
      }
    } catch (error) {
      ztoolkit.log("Error opening PDF in tab:", error);
      // 如果PDF打开失败，选中PDF附件
      const pane = Zotero.getActiveZoteroPane();
      if (pane && typeof pane.selectItem === "function") {
        pane.selectItem(pdfAttachment.id);
      }
    }
  }

  /**
   * 在标签页中打开文献本身（当没有PDF时）
   */
  private static async openItemOnlyInTab(item: Zotero.Item) {
    try {
      const pane = Zotero.getActiveZoteroPane();
      if (pane) {
        // 尝试使用Zotero 7的新API
        if (
          typeof (Zotero as any).Tabs !== "undefined" &&
          (Zotero as any).Tabs.open
        ) {
          (Zotero as any).Tabs.open({
            type: "item",
            id: item.id,
          });
          ztoolkit.log("Item opened in new tab using Zotero.Tabs.open");
        } else if (typeof pane.selectItem === "function") {
          // 回退到传统方法：选中该文献
          pane.selectItem(item.id);
          ztoolkit.log("Item selected using selectItem");
        }
      }
    } catch (error) {
      ztoolkit.log("Error opening item only in tab:", error);
    }
  }

  /**
   * 在默认浏览器中打开URL
   */
  private static openURLInBrowser(url: string) {
    try {
      ztoolkit.log("Opening URL in browser:", url);

      // 使用Zotero的内置方法打开URL
      if (typeof (Zotero as any).launchURL === "function") {
        (Zotero as any).launchURL(url);
        ztoolkit.log("URL opened using Zotero.launchURL");
      } else if (
        typeof Zotero.Utilities !== "undefined" &&
        Zotero.Utilities.Internal &&
        typeof (Zotero.Utilities.Internal as any).launchURL === "function"
      ) {
        (Zotero.Utilities.Internal as any).launchURL(url);
        ztoolkit.log("URL opened using Zotero.Utilities.Internal.launchURL");
      } else {
        // 尝试使用系统的打开命令
        const mainWindow = Zotero.getMainWindow();
        if (mainWindow && mainWindow.open) {
          mainWindow.open(url, "_blank");
          ztoolkit.log("URL opened using window.open");
        } else {
          ztoolkit.log("No method available to open URL");
        }
      }
    } catch (error) {
      ztoolkit.log("Error opening URL in browser:", error);
    }
  }

  /**
   * 复制文本到剪贴板
   */
  private static async copyToClipboard(text: string, button: HTMLElement) {
    try {
      ztoolkit.log("Copying to clipboard:", text);

      let success = false;

      // 方法1: 使用Zotero内置的剪贴板服务（最可靠）
      try {
        if (typeof Components !== "undefined" && (Components as any).classes) {
          const clipboardHelper = (Components as any).classes[
            "@mozilla.org/widget/clipboardhelper;1"
          ].getService((Components as any).interfaces.nsIClipboardHelper);
          clipboardHelper.copyString(text);
          success = true;
          ztoolkit.log("Text copied using nsIClipboardHelper");
        }
      } catch (error) {
        ztoolkit.log("nsIClipboardHelper failed:", error);
      }

      // 方法2: 使用传统execCommand方法
      if (!success) {
        try {
          const mainWindow = Zotero.getMainWindow();
          if (mainWindow && mainWindow.document && mainWindow.document.body) {
            const tempInput = mainWindow.document.createElement("input");
            tempInput.style.cssText = `
              position: fixed;
              left: -9999px;
              top: -9999px;
              opacity: 0;
              z-index: -1;
            `;
            tempInput.value = text;
            mainWindow.document.body.appendChild(tempInput);
            tempInput.focus();
            tempInput.select();
            tempInput.setSelectionRange(0, text.length);
            success = mainWindow.document.execCommand("copy");
            mainWindow.document.body.removeChild(tempInput);
            ztoolkit.log("Text copied using execCommand, success:", success);
          }
        } catch (error) {
          ztoolkit.log("execCommand failed:", error);
        }
      }

      // 方法3: 使用现代Clipboard API (作为backup)
      if (!success) {
        try {
          const mainWindow = Zotero.getMainWindow();
          if (
            mainWindow &&
            (mainWindow as any).navigator &&
            (mainWindow as any).navigator.clipboard
          ) {
            await (mainWindow as any).navigator.clipboard.writeText(text);
            success = true;
            ztoolkit.log("Text copied using navigator.clipboard");
          }
        } catch (error) {
          ztoolkit.log("navigator.clipboard failed:", error);
        }
      }

      // 提供用户反馈
      this.showCopyFeedback(button, success);
    } catch (error) {
      ztoolkit.log("Error copying to clipboard:", error);
      this.showCopyFeedback(button, false);
    }
  }

  /**
   * 显示复制操作的用户反馈
   */
  private static showCopyFeedback(button: HTMLElement, success: boolean) {
    const originalContent = button.innerHTML;
    const originalTitle = button.title;

    if (success) {
      button.innerHTML = "✓";
      button.title = "Copied!";
      button.style.backgroundColor = "#d4edda";
      button.style.borderColor = "#c3e6cb";
      button.style.color = "#155724";
    } else {
      button.innerHTML = "✗";
      button.title = "Copy failed";
      button.style.backgroundColor = "#f8d7da";
      button.style.borderColor = "#f5c6cb";
      button.style.color = "#721c24";
    }

    // 2秒后恢复原状
    setTimeout(() => {
      button.innerHTML = originalContent;
      button.title = originalTitle;
      button.style.backgroundColor = "#f0f0f0";
      button.style.borderColor = "#ddd";
      button.style.color = "#666";
    }, 2000);
  }

  /**
   * 创建文献信息内容
   */
  private static createItemInfoContent(
    doc: Document,
    item: Zotero.Item,
  ): HTMLElement {
    // 创建信息卡片
    const infoCard = doc.createElement("div");
    infoCard.style.cssText = `
      max-width: 100%;
    `;

    // 标题
    if (this.isEditMode) {
      const titleInput = doc.createElement("input");
      titleInput.type = "text";
      titleInput.value = this.editedData.title || "";
      titleInput.style.cssText = `
        margin: 0 0 16px 0;
        font-size: 20px;
        font-weight: 600;
        color: #333;
        line-height: 1.4;
        width: 100%;
        border: 2px solid #e0e0e0;
        border-radius: 4px;
        padding: 8px;
        background: #f9f9f9;
        transition: border-color 0.2s;
      `;
      titleInput.addEventListener("focus", () => {
        titleInput.style.borderColor = "#2196f3";
        titleInput.style.backgroundColor = "white";
      });
      titleInput.addEventListener("blur", () => {
        titleInput.style.borderColor = "#e0e0e0";
        titleInput.style.backgroundColor = "#f9f9f9";
      });
      titleInput.addEventListener("input", (e) => {
        this.editedData.title = (e.target as HTMLInputElement).value;
      });
      infoCard.appendChild(titleInput);
    } else {
      const title = doc.createElement("h1");
      title.style.cssText = `
        margin: 0 0 16px 0;
        font-size: 20px;
        font-weight: 600;
        color: #333;
        line-height: 1.4;
        user-select: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        cursor: text;
      `;
      title.textContent = item.getField("title") || "Untitled";
      infoCard.appendChild(title);
    }

    // 作者
    const creators = item.getCreators();
    if (creators.length > 0) {
      const authorsDiv = doc.createElement("div");
      authorsDiv.style.cssText = `
        margin-bottom: 16px;
        font-size: 14px;
        color: #666;
        font-weight: 500;
        user-select: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        cursor: text;
      `;
      const authorNames = creators
        .map((creator) =>
          creator.firstName
            ? `${creator.firstName} ${creator.lastName}`
            : creator.lastName,
        )
        .join(", ");
      authorsDiv.textContent = authorNames;
      infoCard.appendChild(authorsDiv);
    }

    // 摘要
    const abstractText = this.isEditMode
      ? this.editedData.abstractNote
      : item.getField("abstractNote");
    if (abstractText || this.isEditMode) {
      const abstractTitle = doc.createElement("h3");
      abstractTitle.style.cssText = `
        margin: 20px 0 12px 0;
        font-size: 16px;
        font-weight: 600;
        color: #333;
        user-select: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        cursor: text;
      `;
      abstractTitle.textContent = "Abstract";

      if (this.isEditMode) {
        // 编辑模式 - 文本区域
        const abstractTextarea = doc.createElement("textarea");
        abstractTextarea.value = abstractText || "";
        abstractTextarea.style.cssText = `
          width: 100%;
          min-height: 120px;
          line-height: 1.5;
          color: #444;
          font-size: 15px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          padding: 8px;
          background: #f9f9f9;
          resize: vertical;
          font-family: inherit;
          transition: border-color 0.2s;
        `;

        abstractTextarea.addEventListener("focus", () => {
          abstractTextarea.style.borderColor = "#2196f3";
          abstractTextarea.style.backgroundColor = "white";
        });

        abstractTextarea.addEventListener("blur", () => {
          abstractTextarea.style.borderColor = "#e0e0e0";
          abstractTextarea.style.backgroundColor = "#f9f9f9";
        });

        abstractTextarea.addEventListener("input", (e) => {
          this.editedData.abstractNote = (
            e.target as HTMLTextAreaElement
          ).value;
        });

        infoCard.appendChild(abstractTitle);
        infoCard.appendChild(abstractTextarea);
      } else {
        // 查看模式 - 显示文本
        const abstractDiv = doc.createElement("div");
        abstractDiv.style.cssText = `
          line-height: 1.5;
          color: #444;
          text-align: justify;
          font-size: 15px;
          user-select: text;
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          cursor: text;
        `;
        abstractDiv.textContent = abstractText;

        infoCard.appendChild(abstractTitle);
        infoCard.appendChild(abstractDiv);
      }
    }

    // 标签信息 - 放在摘要后面
    const tags = this.isEditMode
      ? this.editedData.tags
      : item.getTags().map((tagData) => tagData.tag || tagData);
    if ((tags && tags.length > 0) || this.isEditMode) {
      const tagsTitle = doc.createElement("h3");
      tagsTitle.style.cssText = `
        margin: 20px 0 12px 0;
        font-size: 16px;
        font-weight: 600;
        color: #333;
        user-select: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        cursor: text;
      `;
      tagsTitle.textContent = "Tags";

      if (this.isEditMode) {
        // 编辑模式 - 可编辑标签
        const tagsInputContainer = doc.createElement("div");
        tagsInputContainer.style.cssText = `
          margin-bottom: 16px;
        `;

        const tagsInput = doc.createElement("input");
        tagsInput.type = "text";
        tagsInput.placeholder = "Enter tags separated by commas";
        tagsInput.value = (tags || []).join(", ");
        tagsInput.style.cssText = `
          width: 100%;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          padding: 8px;
          font-size: 13px;
          background: #f9f9f9;
          transition: border-color 0.2s;
        `;

        tagsInput.addEventListener("focus", () => {
          tagsInput.style.borderColor = "#2196f3";
          tagsInput.style.backgroundColor = "white";
        });

        tagsInput.addEventListener("blur", () => {
          tagsInput.style.borderColor = "#e0e0e0";
          tagsInput.style.backgroundColor = "#f9f9f9";
        });

        // 显示当前标签预览
        const tagsPreview = doc.createElement("div");
        tagsPreview.style.cssText = `
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
          min-height: 24px;
        `;

        const updateTagsPreview = () => {
          tagsPreview.innerHTML = "";
          const currentTags = this.editedData.tags || [];
          currentTags.forEach((tag: string) => {
            if (tag.trim()) {
              const tagElement = doc.createElement("span");
              tagElement.style.cssText = `
                background: #e8f5e8;
                color: #2e7d2e;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 11px;
                font-weight: 500;
                border: 1px solid #c8e6c8;
              `;
              tagElement.textContent = tag.trim();
              tagsPreview.appendChild(tagElement);
            }
          });
        };

        tagsInput.addEventListener("input", (e) => {
          const inputValue = (e.target as HTMLInputElement).value;
          this.editedData.tags = inputValue
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);
          updateTagsPreview();
        });

        updateTagsPreview(); // 初始预览

        tagsInputContainer.appendChild(tagsInput);
        tagsInputContainer.appendChild(tagsPreview);

        infoCard.appendChild(tagsTitle);
        infoCard.appendChild(tagsInputContainer);
      } else {
        // 查看模式 - 显示标签（带展开/收起功能）
        const tagsContainer = this.createTagsContainer(doc, tags);
        infoCard.appendChild(tagsTitle);
        infoCard.appendChild(tagsContainer);
      }
    }

    return infoCard;
  }

  /**
   * 创建标签容器（带展开/收起功能）
   */
  private static createTagsContainer(
    doc: Document,
    tags: string[],
  ): HTMLElement {
    const tagsMainContainer = doc.createElement("div");
    tagsMainContainer.style.cssText = `
      margin-bottom: 32px;
    `;

    // 计算应该显示的标签数量（第一排）
    const maxTagsInFirstRow = 6; // 假设第一排最多显示6个标签
    const visibleTags = this.tagsExpanded
      ? tags
      : tags.slice(0, maxTagsInFirstRow);
    const hasMoreTags = tags.length > maxTagsInFirstRow;

    // 标签容器
    const tagsContainer = doc.createElement("div");
    tagsContainer.style.cssText = `
      display: flex;
      flex-wrap: ${this.tagsExpanded ? "wrap" : "nowrap"};
      gap: 8px;
      align-items: center;
      overflow: ${this.tagsExpanded ? "visible" : "hidden"};
      margin-bottom: 8px;
    `;

    // 添加标签
    visibleTags.forEach((tag: string) => {
      const tagElement = doc.createElement("span");
      tagElement.style.cssText = `
        background: #e3f2fd;
        color: #1976d2;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
        border: 1px solid #bbdefb;
        white-space: nowrap;
        flex-shrink: 0;
        user-select: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        cursor: text;
      `;
      tagElement.textContent = tag;
      tagsContainer.appendChild(tagElement);
    });

    // 添加显示更多/更少按钮
    if (hasMoreTags) {
      const toggleButton = doc.createElement("button");
      toggleButton.style.cssText = `
        background: #f5f5f5;
        color: #666;
        border: 1px solid #ddd;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
        transition: all 0.2s;
      `;

      const updateButtonText = () => {
        if (this.tagsExpanded) {
          toggleButton.textContent = "显示更少";
          toggleButton.title = "Show fewer tags";
          tagsContainer.style.flexWrap = "wrap";
          tagsContainer.style.overflow = "visible";
        } else {
          const hiddenCount = tags.length - maxTagsInFirstRow;
          toggleButton.textContent = `显示更多 (${hiddenCount})`;
          toggleButton.title = `Show ${hiddenCount} more tags`;
          tagsContainer.style.flexWrap = "nowrap";
          tagsContainer.style.overflow = "hidden";
        }
      };

      updateButtonText();

      toggleButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        this.tagsExpanded = !this.tagsExpanded;

        // 清除现有标签
        tagsContainer.innerHTML = "";

        // 重新渲染标签
        const newVisibleTags = this.tagsExpanded
          ? tags
          : tags.slice(0, maxTagsInFirstRow);
        newVisibleTags.forEach((tag: string) => {
          const tagElement = doc.createElement("span");
          tagElement.style.cssText = `
            background: #e3f2fd;
            color: #1976d2;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            border: 1px solid #bbdefb;
            white-space: nowrap;
            flex-shrink: 0;
            user-select: text;
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            cursor: text;
          `;
          tagElement.textContent = tag;
          tagsContainer.appendChild(tagElement);
        });

        // 更新按钮文本和容器样式
        updateButtonText();

        // 重新添加按钮
        tagsContainer.appendChild(toggleButton);
      });

      toggleButton.addEventListener("mouseenter", () => {
        toggleButton.style.backgroundColor = "#e8e8e8";
        toggleButton.style.borderColor = "#bbb";
      });

      toggleButton.addEventListener("mouseleave", () => {
        toggleButton.style.backgroundColor = "#f5f5f5";
        toggleButton.style.borderColor = "#ddd";
      });

      tagsContainer.appendChild(toggleButton);
    }

    tagsMainContainer.appendChild(tagsContainer);
    return tagsMainContainer;
  }

  /**
   * 创建文献信息面板
   */
  private static createItemInfoPanel(
    doc: Document,
    item: Zotero.Item,
  ): HTMLElement {
    const container = doc.createElement("div");
    container.style.cssText = `
      padding: 20px 20px 40px 20px;
      overflow-y: auto;
      background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      height: 100%;
      user-select: text;
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
    `;

    // 根据模式显示不同内容
    if (this.isPDFMode) {
      const pdfContent = this.createPDFContent(doc, item);
      container.appendChild(pdfContent);
    } else {
      const infoContent = this.createItemInfoContent(doc, item);
      container.appendChild(infoContent);
    }

    // 添加Ctrl+C复制功能
    container.addEventListener("keydown", (event: Event) => {
      const keyEvent = event as KeyboardEvent;
      if ((keyEvent.ctrlKey || keyEvent.metaKey) && keyEvent.key === "c") {
        // 允许默认的复制行为
        keyEvent.stopPropagation();
      }
    });

    return container;
  }

  /**
   * 创建PDF内容显示
   */
  private static createPDFContent(
    doc: Document,
    item: Zotero.Item,
  ): HTMLElement {
    const pdfContainer = doc.createElement("div");
    pdfContainer.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
    `;

    try {
      // 查找第一个PDF附件
      const pdfAttachment = this.getFirstPDFAttachment(item);

      if (pdfAttachment) {
        // 创建工具栏
        const toolbar = this.createPDFToolbar(doc, pdfAttachment);
        pdfContainer.appendChild(toolbar);

        // 创建PDF查看器容器
        const viewerContainer = doc.createElement("div");
        viewerContainer.style.cssText = `
          flex: 1;
          overflow: hidden;
          position: relative;
          background: #f5f5f5;
        `;

        // 尝试不同的PDF显示方法
        this.loadPDFContent(viewerContainer, pdfAttachment);
        pdfContainer.appendChild(viewerContainer);

        ztoolkit.log("PDF viewer container created");
      } else {
        // 没有找到PDF附件
        this.createErrorMessage(pdfContainer, "未找到PDF附件");
      }
    } catch (error) {
      ztoolkit.log("Error creating PDF content:", error);
      this.createErrorMessage(
        pdfContainer,
        "PDF加载错误: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }

    return pdfContainer;
  }

  /**
   * 创建PDF工具栏
   */
  private static createPDFToolbar(
    doc: Document,
    pdfAttachment: Zotero.Item,
  ): HTMLElement {
    const toolbar = doc.createElement("div");
    toolbar.style.cssText = `
      height: 40px;
      background: #2c3e50;
      color: white;
      display: flex;
      align-items: center;
      padding: 0 12px;
      gap: 8px;
      font-size: 13px;
      border-radius: 4px 4px 0 0;
    `;

    // PDF文件名
    const filename =
      pdfAttachment.attachmentFilename ||
      pdfAttachment.getField("title") ||
      "PDF Document";
    const nameSpan = doc.createElement("span");
    nameSpan.style.cssText = `
      flex: 1;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    nameSpan.textContent = filename;

    // 在Zotero中打开按钮
    const openInZoteroBtn = doc.createElement("button");
    openInZoteroBtn.style.cssText = `
      background: #3498db;
      border: none;
      color: white;
      padding: 4px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
      transition: background-color 0.2s;
    `;
    openInZoteroBtn.textContent = "在Zotero中打开";
    openInZoteroBtn.title = "Open PDF in Zotero";

    openInZoteroBtn.addEventListener("click", async () => {
      try {
        await this.openPDFInTab(pdfAttachment);
        this.closePreview();
      } catch (error) {
        ztoolkit.log("Error opening PDF in Zotero:", error);
      }
    });

    openInZoteroBtn.addEventListener("mouseenter", () => {
      openInZoteroBtn.style.backgroundColor = "#2980b9";
    });

    openInZoteroBtn.addEventListener("mouseleave", () => {
      openInZoteroBtn.style.backgroundColor = "#3498db";
    });

    toolbar.appendChild(nameSpan);
    toolbar.appendChild(openInZoteroBtn);

    return toolbar;
  }

  /**
   * 加载PDF内容
   */
  private static async loadPDFContent(
    container: HTMLElement,
    pdfAttachment: Zotero.Item,
  ): Promise<void> {
    try {
      // 方法1: 尝试直接使用iframe加载PDF (Zotero 7最兼容的方式)
      if (await this.loadWithSimpleIframe(container, pdfAttachment)) {
        return;
      }

      // 方法2: 尝试使用embed标签
      if (await this.loadWithEmbed(container, pdfAttachment)) {
        return;
      }

      // 方法3: 尝试使用object标签
      if (await this.loadWithObject(container, pdfAttachment)) {
        return;
      }

      // 方法4: 显示PDF信息和打开按钮
      this.showPDFInfo(container, pdfAttachment);
    } catch (error) {
      ztoolkit.log("Error loading PDF content:", error);
      this.createErrorMessage(
        container,
        "PDF加载失败: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  /**
   * 使用简单的iframe加载PDF
   */
  private static async loadWithSimpleIframe(
    container: HTMLElement,
    pdfAttachment: Zotero.Item,
  ): Promise<boolean> {
    try {
      const doc = container.ownerDocument || Zotero.getMainWindow()?.document;
      if (!doc) return false;

      // 获取PDF文件路径
      const pdfPath = this.getPDFPath(pdfAttachment);
      if (!pdfPath) return false;

      ztoolkit.log("Loading PDF with simple iframe:", pdfPath);

      // 创建iframe
      const iframe = doc.createElement("iframe");
      iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        background: white;
      `;

      // 直接设置src为PDF路径
      iframe.src = pdfPath;

      container.appendChild(iframe);

      // 简单的加载成功检查
      return new Promise((resolve) => {
        iframe.onload = () => {
          ztoolkit.log("PDF iframe loaded");
          resolve(true);
        };
        iframe.onerror = () => {
          ztoolkit.log("PDF iframe error");
          resolve(false);
        };
        // 设置一个超时，如果onload没触发但也可能显示了
        setTimeout(() => {
          resolve(true);
        }, 500);
      });
    } catch (error) {
      ztoolkit.log("Error with simple iframe method:", error);
      return false;
    }
  }

  /**
   * 使用embed标签加载PDF
   */
  private static async loadWithEmbed(
    container: HTMLElement,
    pdfAttachment: Zotero.Item,
  ): Promise<boolean> {
    try {
      const doc = container.ownerDocument || Zotero.getMainWindow()?.document;
      if (!doc) return false;

      const pdfPath = this.getPDFPath(pdfAttachment);
      if (!pdfPath) return false;

      const embed = doc.createElement("embed");
      embed.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
      `;
      embed.src = pdfPath;
      embed.type = "application/pdf";

      let loadSuccess = false;
      embed.onload = () => {
        loadSuccess = true;
        ztoolkit.log("PDF loaded with embed tag");
      };

      container.appendChild(embed);

      // 等待一段时间检查是否加载成功
      return new Promise((resolve) => {
        setTimeout(() => {
          if (loadSuccess || embed.clientHeight > 0) {
            resolve(true);
          } else {
            if (embed.parentNode) {
              embed.parentNode.removeChild(embed);
            }
            resolve(false);
          }
        }, 1500);
      });
    } catch (error) {
      ztoolkit.log("Error with embed method:", error);
      return false;
    }
  }

  /**
   * 使用object标签加载PDF
   */
  private static async loadWithObject(
    container: HTMLElement,
    pdfAttachment: Zotero.Item,
  ): Promise<boolean> {
    try {
      const doc = container.ownerDocument || Zotero.getMainWindow()?.document;
      if (!doc) return false;

      const pdfPath = this.getPDFPath(pdfAttachment);
      if (!pdfPath) return false;

      const object = doc.createElement("object");
      object.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
      `;
      object.data = pdfPath;
      object.type = "application/pdf";

      // 添加fallback内容
      const fallback = doc.createElement("p");
      fallback.style.cssText = `
        text-align: center;
        color: #666;
        padding: 20px;
      `;
      fallback.textContent = "PDF预览不可用";
      object.appendChild(fallback);

      container.appendChild(object);

      // 等待一段时间检查是否加载成功
      return new Promise((resolve) => {
        setTimeout(() => {
          // 检查object是否有内容
          if (object.clientHeight > fallback.clientHeight) {
            ztoolkit.log("PDF loaded with object tag");
            resolve(true);
          } else {
            if (object.parentNode) {
              object.parentNode.removeChild(object);
            }
            resolve(false);
          }
        }, 1500);
      });
    } catch (error) {
      ztoolkit.log("Error with object method:", error);
      return false;
    }
  }

  /**
   * 显示PDF信息（当无法直接预览时）
   */
  private static showPDFInfo(
    container: HTMLElement,
    pdfAttachment: Zotero.Item,
  ): void {
    const doc = container.ownerDocument || Zotero.getMainWindow()?.document;
    if (!doc) return;

    const infoDiv = doc.createElement("div");
    infoDiv.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 40px;
      text-align: center;
      background: white;
    `;

    // PDF图标
    const pdfIcon = doc.createElement("div");
    pdfIcon.style.cssText = `
      font-size: 64px;
      margin-bottom: 16px;
      color: #e74c3c;
    `;
    pdfIcon.innerHTML = "📄";

    // 文件信息
    const filename =
      pdfAttachment.attachmentFilename ||
      pdfAttachment.getField("title") ||
      "PDF Document";
    const nameDiv = doc.createElement("div");
    nameDiv.style.cssText = `
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #2c3e50;
    `;
    nameDiv.textContent = filename;

    // 提示信息
    const hintDiv = doc.createElement("div");
    hintDiv.style.cssText = `
      font-size: 14px;
      color: #7f8c8d;
      margin-bottom: 24px;
      line-height: 1.5;
    `;
    hintDiv.textContent = "PDF预览暂时不可用，您可以在Zotero中打开此PDF文件。";

    // 打开按钮
    const openButton = doc.createElement("button");
    openButton.style.cssText = `
      background: #3498db;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    `;
    openButton.textContent = "在Zotero中打开PDF";

    openButton.addEventListener("click", async () => {
      try {
        await this.openPDFInTab(pdfAttachment);
        this.closePreview();
      } catch (error) {
        ztoolkit.log("Error opening PDF:", error);
      }
    });

    openButton.addEventListener("mouseenter", () => {
      openButton.style.backgroundColor = "#2980b9";
    });

    openButton.addEventListener("mouseleave", () => {
      openButton.style.backgroundColor = "#3498db";
    });

    infoDiv.appendChild(pdfIcon);
    infoDiv.appendChild(nameDiv);
    infoDiv.appendChild(hintDiv);
    infoDiv.appendChild(openButton);

    container.appendChild(infoDiv);
    ztoolkit.log("PDF info displayed");
  }

  /**
   * 获取第一个PDF附件
   */
  private static getFirstPDFAttachment(item: Zotero.Item): Zotero.Item | null {
    try {
      const attachmentIDs = item.getAttachments();
      for (const attachmentID of attachmentIDs) {
        const attachment = Zotero.Items.get(attachmentID);
        if (attachment && attachment.isPDFAttachment()) {
          return attachment;
        }
      }
      return null;
    } catch (error) {
      ztoolkit.log("Error getting first PDF attachment:", error);
      return null;
    }
  }

  /**
   * 获取PDF文件路径
   */
  private static getPDFPath(pdfAttachment: Zotero.Item): string | null {
    try {
      // 尝试获取PDF文件路径
      if (pdfAttachment.isLinkedFileAttachment()) {
        // 链接文件附件，获取文件路径
        const filePath = pdfAttachment.getFilePath();
        if (filePath) {
          const fileURI = Zotero.File.pathToFileURI(filePath);
          ztoolkit.log("PDF file URI (linked):", fileURI);
          return fileURI;
        }
      } else if (pdfAttachment.isStoredFileAttachment()) {
        // 存储文件附件，使用文件名构建路径
        const filename = pdfAttachment.attachmentFilename;
        if (filename) {
          // 构建Zotero存储路径
          const storagePath =
            Zotero.Attachments.getStorageDirectory(pdfAttachment);
          if (storagePath) {
            const pathSep = Zotero.isWin ? "\\" : "/";
            const filePath = Zotero.File.pathToFileURI(
              storagePath.path + pathSep + filename,
            );
            ztoolkit.log("PDF file URI (stored):", filePath);
            return filePath;
          }
        }
      }
      return null;
    } catch (error) {
      ztoolkit.log("Error getting PDF path:", error);
      return null;
    }
  }

  /**
   * 创建错误信息显示
   */
  private static createErrorMessage(container: HTMLElement, message: string) {
    const doc = container.ownerDocument || Zotero.getMainWindow()?.document;
    if (!doc) {
      ztoolkit.log("Cannot create error message - no document available");
      return;
    }
    const errorDiv = doc.createElement("div");
    errorDiv.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
      font-size: 16px;
      text-align: center;
      padding: 20px;
    `;
    errorDiv.textContent = message;
    container.appendChild(errorDiv);
  }

  /**
   * 切换编辑模式
   */
  static toggleEditMode(item: Zotero.Item) {
    try {
      this.isEditMode = !this.isEditMode;
      ztoolkit.log("Toggle edit mode:", this.isEditMode);

      if (this.isEditMode) {
        // 进入编辑模式，初始化编辑数据
        this.editedData = {
          title: item.getField("title") || "",
          abstractNote: item.getField("abstractNote") || "",
          tags: item.getTags().map((tagData) => tagData.tag || tagData),
        };
      }

      // 重新创建预览内容
      this.refreshPreviewContent(item);
    } catch (error) {
      ztoolkit.log("Error toggling edit mode:", error);
    }
  }

  /**
   * 刷新预览内容
   */
  static refreshPreviewContent(item: Zotero.Item) {
    try {
      if (!this.previewOverlay) {
        return;
      }

      // 找到内容区域
      const contentArea = this.previewOverlay.querySelector(
        ".content-area",
      ) as HTMLElement;
      if (!contentArea) {
        return;
      }

      // 清除现有内容
      contentArea.innerHTML = "";

      // 创建新的信息面板
      const itemInfo = this.createItemInfoPanel(
        this.previewOverlay.ownerDocument!,
        item,
      );
      contentArea.appendChild(itemInfo);

      // 更新PDF按钮状态
      const pdfButton = this.previewOverlay.querySelector(
        ".pdf-button",
      ) as HTMLElement;
      if (pdfButton) {
        pdfButton.title = this.isPDFMode ? "Show Info" : "Show PDF";
        const pdfIcon = pdfButton.querySelector("span");
        if (pdfIcon) {
          pdfIcon.innerHTML = this.isPDFMode ? "📄" : "📕";
        }
      }

      // 更新编辑按钮状态
      const editButton = this.previewOverlay.querySelector(
        ".edit-button",
      ) as HTMLElement;
      if (editButton) {
        if (this.isEditMode) {
          editButton.style.backgroundColor = "#ff9800";
          editButton.title = "Save Changes";
          const editIcon = editButton.querySelector("span");
          if (editIcon) {
            editIcon.innerHTML = "💾";
          }
        } else {
          editButton.style.backgroundColor = "#4caf50";
          editButton.title = "Edit Item";
          const editIcon = editButton.querySelector("span");
          if (editIcon) {
            editIcon.innerHTML = "✎";
          }
        }
      }
    } catch (error) {
      ztoolkit.log("Error refreshing preview content:", error);
    }
  }

  /**
   * 保存编辑的内容
   */
  static async saveEditedContent(item: Zotero.Item) {
    try {
      ztoolkit.log("Saving edited content:", this.editedData);

      // 保存基本字段
      const fieldsToSave = ["title", "abstractNote"];

      for (const field of fieldsToSave) {
        if (this.editedData[field] !== undefined) {
          const currentValue = item.getField(field) || "";
          if (this.editedData[field] !== currentValue) {
            item.setField(field, this.editedData[field]);
            ztoolkit.log(`Updated ${field}: ${this.editedData[field]}`);
          }
        }
      }

      // 保存标签
      if (this.editedData.tags && Array.isArray(this.editedData.tags)) {
        const currentTags = item
          .getTags()
          .map((tagData) => tagData.tag || tagData);
        const newTags = this.editedData.tags.filter((tag) => tag.trim());

        // 检查标签是否有变化
        const tagsChanged =
          JSON.stringify(currentTags.sort()) !== JSON.stringify(newTags.sort());

        if (tagsChanged) {
          // 删除所有现有标签
          item.setTags([]);

          // 添加新标签
          for (const tag of newTags) {
            if (tag.trim()) {
              item.addTag(tag.trim());
            }
          }
          ztoolkit.log(`Updated tags: ${newTags.join(", ")}`);
        }
      }

      // 保存到数据库
      await item.save();
      ztoolkit.log("Item saved successfully");

      // 退出编辑模式
      this.isEditMode = false;
      this.editedData = {};
      this.refreshPreviewContent(item);

      // 显示保存成功提示
      this.showSaveNotification(true);
    } catch (error) {
      ztoolkit.log("Error saving edited content:", error);
      this.showSaveNotification(false);
    }
  }

  /**
   * 显示保存通知
   */
  static showSaveNotification(success: boolean) {
    try {
      const editButton = this.previewOverlay?.querySelector(
        ".edit-button",
      ) as HTMLElement;
      if (editButton) {
        const originalBg = editButton.style.backgroundColor;
        const originalTitle = editButton.title;

        if (success) {
          editButton.style.backgroundColor = "#4caf50";
          editButton.title = "Saved!";
          const icon = editButton.querySelector("span");
          if (icon) {
            const originalIcon = icon.innerHTML;
            icon.innerHTML = "✓";
            setTimeout(() => {
              icon.innerHTML = originalIcon;
            }, 2000);
          }
        } else {
          editButton.style.backgroundColor = "#f44336";
          editButton.title = "Save failed!";
        }

        setTimeout(() => {
          editButton.style.backgroundColor = originalBg;
          editButton.title = originalTitle;
        }, 2000);
      }
    } catch (error) {
      ztoolkit.log("Error showing save notification:", error);
    }
  }

  /**
   * 检查文献是否有PDF附件
   */
  static checkForPDFAttachment(item: Zotero.Item): boolean {
    try {
      const attachmentIDs = item.getAttachments();
      for (const attachmentID of attachmentIDs) {
        const attachment = Zotero.Items.get(attachmentID);
        if (attachment && attachment.isPDFAttachment()) {
          return true;
        }
      }
      return false;
    } catch (error) {
      ztoolkit.log("Error checking PDF attachment:", error);
      return false;
    }
  }

  /**
   * 切换PDF模式
   */
  static togglePDFMode(item: Zotero.Item) {
    try {
      this.isPDFMode = !this.isPDFMode;
      ztoolkit.log("Toggle PDF mode:", this.isPDFMode);

      // 刷新预览内容
      this.refreshPreviewContent(item);
    } catch (error) {
      ztoolkit.log("Error toggling PDF mode:", error);
    }
  }

  /**
   * 关闭预览窗口
   */
  static closePreview() {
    try {
      if (this.previewOverlay && this.previewOverlay.parentNode) {
        this.previewOverlay.parentNode.removeChild(this.previewOverlay);
        ztoolkit.log("Preview overlay removed successfully");
      }
      this.previewOverlay = null;
      this.currentItem = null;
      // 重置编辑状态
      this.isEditMode = false;
      this.editedData = {};
      this.tagsExpanded = false;
      this.isPDFMode = false;
    } catch (error) {
      ztoolkit.log("Error closing preview:", error);
    }
  }

  /**
   * 清理资源
   */
  static cleanup() {
    try {
      this.closePreview();
      this.removeKeyboardListeners();
      this.keyEventListener = null;
      this.isInitialized = false;
      ztoolkit.log("Quick Preview cleaned up");
    } catch (error) {
      ztoolkit.log("Error during Quick Preview cleanup:", error);
    }
  }

  /**
   * 检查预览窗口是否打开
   */
  static isPreviewOpen(): boolean {
    return this.previewOverlay !== null;
  }

  /**
   * 获取当前预览的文献
   */
  static getCurrentItem(): Zotero.Item | null {
    return this.currentItem;
  }

  /**
   * 测试功能 - 直接调用预览
   */
  static async testPreview() {
    ztoolkit.log("Testing Quick Preview functionality...");
    const selectedItem = this.getSelectedItem();
    if (selectedItem) {
      ztoolkit.log("Test: Found selected item, showing preview");
      await this.showPreview(selectedItem);
    } else {
      ztoolkit.log("Test: No item selected");
      // 创建一个测试弹窗
      this.showTestOverlay();
    }
  }

  /**
   * 显示测试覆盖层
   */
  private static showTestOverlay() {
    const mainWindow = Zotero.getMainWindow();
    if (!mainWindow || !mainWindow.document) {
      ztoolkit.log("Cannot create test overlay - no window");
      return;
    }

    const doc = mainWindow.document;
    const overlay = doc.createElement("div");
    overlay.id = "zotero-test-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      color: white;
      font-size: 24px;
      cursor: pointer;
    `;
    overlay.textContent = "Quick Preview Test - Click to close";

    overlay.addEventListener("click", () => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });

    if (doc.body) {
      doc.body.appendChild(overlay);
      ztoolkit.log("Test overlay created and added to DOM");
    }
  }

  /**
   * 初始化助手 - 重新设置监听器
   */
  static reinitialize() {
    ztoolkit.log("Reinitializing Quick Preview...");
    this.cleanup();
    this.isInitialized = false;
    setTimeout(() => {
      this.initialize();
    }, 500);
  }

  /**
   * 添加到全局对象以便调试
   */
  static enableDebugMode() {
    // 添加到全局Zotero对象以便在控制台中调试
    if (typeof Zotero !== "undefined") {
      (Zotero as any).QuickPreview = {
        test: () => this.testPreview(),
        show: (item: Zotero.Item) => this.showPreview(item),
        close: () => this.closePreview(),
        isOpen: () => this.isPreviewOpen(),
        reinit: () => this.reinitialize(),
      };
      ztoolkit.log("QuickPreview debug methods added to Zotero.QuickPreview");
    }
  }
}
