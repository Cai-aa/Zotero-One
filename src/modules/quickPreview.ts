import { getString } from "../utils/locale";

export class QuickPreview {
  private static instance: QuickPreview | null = null;
  private static isInitialized = false;
  private static previewOverlay: HTMLElement | null = null;
  private static currentItem: Zotero.Item | null = null;
  private static keyEventListener: ((event: Event) => void) | null = null;

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
          target.closest('[contenteditable="true"]'))
      ) {
        return; // 在输入框中不触发预览
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
      width: 80vw;
      height: 80vh;
      max-width: 800px;
      max-height: 600px;
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
    openTabButton.title = getString("open-in-tab") || "Open in Zotero Tab";

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
    closeButton.title = getString("close") || "Close";

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
      button.title = getString("copied") || "Copied!";
      button.style.backgroundColor = "#d4edda";
      button.style.borderColor = "#c3e6cb";
      button.style.color = "#155724";
    } else {
      button.innerHTML = "✗";
      button.title = getString("copy-failed") || "Copy failed";
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
      infoCard.appendChild(title);
      infoCard.appendChild(authorsDiv);
    } else {
      infoCard.appendChild(title);
    }

    // 其他字段信息（移除Date、Volume、Pages）
    const fieldsToShow = [
      { field: "publicationTitle", label: "Publication" },
      { field: "issue", label: "Issue" },
      { field: "DOI", label: "DOI" },
      { field: "url", label: "URL" },
    ];

    fieldsToShow.forEach(({ field, label }) => {
      const value = item.getField(field);
      if (value) {
        const fieldDiv = doc.createElement("div");
        fieldDiv.style.cssText = `
          margin-bottom: 12px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        `;

        const labelSpan = doc.createElement("span");
        labelSpan.style.cssText = `
          font-weight: 600;
          color: #555;
          min-width: 80px;
          flex-shrink: 0;
          font-size: 13px;
          user-select: text;
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          cursor: text;
        `;
        labelSpan.textContent = label + ":";

        const valueSpan = doc.createElement("span");
        valueSpan.style.cssText = `
          color: #333;
          flex: 1;
          line-height: 1.4;
          font-size: 13px;
          user-select: text;
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          cursor: text;
        `;

        if (field === "url" || field === "DOI") {
          // 创建链接和复制按钮的容器
          const linkContainer = doc.createElement("div");
          linkContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
          `;

          const link = doc.createElement("a");
          const linkURL = field === "DOI" ? `https://doi.org/${value}` : value;
          link.href = linkURL;
          link.style.cssText = `
            color: #007acc;
            text-decoration: none;
            cursor: pointer;
            flex: 1;
            user-select: text;
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
          `;
          link.textContent = value;

          // 添加鼠标悬停效果
          link.addEventListener("mouseenter", () => {
            link.style.textDecoration = "underline";
          });
          link.addEventListener("mouseleave", () => {
            link.style.textDecoration = "none";
          });

          // 添加点击事件，在默认浏览器中打开链接
          link.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.openURLInBrowser(linkURL);
          });

          // 创建复制按钮
          const copyButton = doc.createElement("button");
          copyButton.style.cssText = `
            background: #f0f0f0;
            border: 1px solid #ddd;
            border-radius: 3px;
            padding: 2px 6px;
            cursor: pointer;
            font-size: 11px;
            color: #666;
            transition: all 0.2s;
            min-width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
          `;
          copyButton.innerHTML = "📋";
          copyButton.title =
            getString("copy-to-clipboard") || "Copy to clipboard";

          // 复制按钮事件
          copyButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.copyToClipboard(linkURL, copyButton);
          });

          // 复制按钮悬停效果
          copyButton.addEventListener("mouseenter", () => {
            copyButton.style.backgroundColor = "#e0e0e0";
            copyButton.style.borderColor = "#bbb";
          });

          copyButton.addEventListener("mouseleave", () => {
            copyButton.style.backgroundColor = "#f0f0f0";
            copyButton.style.borderColor = "#ddd";
          });

          linkContainer.appendChild(link);
          linkContainer.appendChild(copyButton);
          valueSpan.appendChild(linkContainer);
        } else {
          valueSpan.textContent = value;
        }

        fieldDiv.appendChild(labelSpan);
        fieldDiv.appendChild(valueSpan);
        infoCard.appendChild(fieldDiv);
      }
    });

    // 摘要
    const abstractText = item.getField("abstractNote");
    if (abstractText) {
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

      const abstractDiv = doc.createElement("div");
      abstractDiv.style.cssText = `
        line-height: 1.5;
        color: #444;
        text-align: justify;
        font-size: 13px;
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

    return infoCard;
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
      padding: 20px;
      overflow-y: auto;
      background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      height: 100%;
      user-select: text;
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
    `;

    const infoContent = this.createItemInfoContent(doc, item);
    container.appendChild(infoContent);

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
