# GitHub 上传指南 - Zotero One 项目

本指南将帮助您将 Zotero One 项目上传到 GitHub 并发布第一个版本。

## 📋 准备工作检查清单

### ✅ 已准备的文件

以下文件已经准备好并可以上传到 GitHub：

#### 核心项目文件
- `package.json` - 项目配置（已更新为 Zotero One）
- `tsconfig.json` - TypeScript 配置
- `eslint.config.mjs` - 代码规范配置
- `zotero-plugin.config.ts` - 插件构建配置

#### 源代码
- `src/` - TypeScript 源代码目录
  - `src/modules/itemNumbering.ts` - 文献编号核心功能
  - `src/modules/quickPreview.ts` - 快速预览功能
  - `src/hooks.ts` - 插件生命周期钩子
  - `src/addon.ts` - 插件主类
  - `src/index.ts` - 入口文件
  - `src/utils/` - 工具函数

#### 插件资源
- `addon/` - 静态插件文件
  - `addon/manifest.json` - 插件清单
  - `addon/content/icons/` - 图标文件（新设计的 Zotero One 图标）
  - `addon/locale/` - 国际化文件（中英文）
  - `addon/content/preferences.xhtml` - 偏好设置界面

#### 构建输出
- `.scaffold/build/zotero-one.xpi` - 已构建的插件文件（54KB）
- `.scaffold/build/update.json` - 更新清单

#### 文档
- `README.md` - 项目主文档（英文）
- `doc/README-zhCN.md` - 中文文档
- `CHANGELOG.md` - 版本变更记录
- `RELEASE_NOTES.md` - 发布说明
- `LICENSE` - 许可证文件

#### 配置文件
- `.gitignore` - Git 忽略规则（已完善）

### ❌ 需要忽略的文件

以下文件已在 `.gitignore` 中配置，不会上传：
- `node_modules/` - 依赖包
- `.scaffold/` - 构建临时文件
- `tsconfig.tsbuildinfo` - TypeScript 编译缓存
- `build.bat` - 临时构建脚本
- 各种临时和开发文件

## 🚀 上传步骤

### 1. 初始化 Git 仓库（如果还未初始化）

```bash
# 进入项目目录
cd /path/to/zotero-item-numbering

# 检查 git 状态
git status

# 如果不是 git 仓库，初始化
git init

# 添加远程仓库（替换为您的 GitHub 仓库地址）
git remote add origin https://github.com/YOUR_USERNAME/zotero-one.git
```

### 2. 提交所有文件

```bash
# 添加所有文件（.gitignore 会自动过滤不需要的文件）
git add .

# 查看要提交的文件
git status

# 提交初始版本
git commit -m "🎉 Initial release: Zotero One v0.1.0

✨ Features:
- Item numbering with collection-specific support
- Quick PDF preview functionality  
- Modern UI with custom icons
- Multilingual support (EN/CN)
- Persistent settings and column positioning

🔧 Technical:
- TypeScript implementation
- Hot reload development support
- Comprehensive build system
- XPI packaging ready for distribution"

# 推送到 GitHub
git push -u origin main
```

### 3. 在 GitHub 上创建仓库

1. 登录 GitHub
2. 点击右上角的 "+" 按钮
3. 选择 "New repository"
4. 填写仓库信息：
   - **Repository name**: `zotero-one`
   - **Description**: `Enhanced productivity plugin for Zotero with item numbering and quick preview`
   - **Visibility**: Public（推荐）或 Private
   - **不要勾选** "Initialize this repository with README"（因为我们已有文件）

### 4. 创建第一个 Release

1. 在 GitHub 仓库页面，点击 "Releases"
2. 点击 "Create a new release"
3. 填写 Release 信息：
   - **Tag version**: `v0.1.0`
   - **Release title**: `🎉 Zotero One v0.1.0 - Initial Release`
   - **Description**: 复制 `RELEASE_NOTES.md` 的内容
4. 上传构建文件：
   - 将 `.scaffold/build/zotero-one.xpi` 拖拽到 "Attach binaries" 区域
5. 勾选 "This is a pre-release"（可选，首次发布建议勾选）
6. 点击 "Publish release"

## 📦 发布后的文件结构

上传到 GitHub 后，您的仓库将包含：

```
zotero-one/
├── .gitignore
├── CHANGELOG.md
├── LICENSE
├── README.md
├── RELEASE_NOTES.md
├── eslint.config.mjs
├── package-lock.json
├── package.json
├── tsconfig.json
├── zotero-plugin.config.ts
├── addon/
│   ├── bootstrap.js
│   ├── manifest.json
│   ├── prefs.js
│   ├── content/
│   │   ├── icons/
│   │   │   ├── favicon.png
│   │   │   ├── favicon@0.5x.png
│   │   │   ├── favicon.svg
│   │   │   └── favicon@0.5x.svg
│   │   ├── preferences.xhtml
│   │   └── zoteroPane.css
│   └── locale/
│       ├── en-US/
│       │   ├── addon.ftl
│       │   ├── mainWindow.ftl
│       │   └── preferences.ftl
│       └── zh-CN/
│           ├── addon.ftl
│           ├── mainWindow.ftl
│           └── preferences.ftl
├── doc/
│   ├── README-frFR.md
│   └── README-zhCN.md
├── src/
│   ├── addon.ts
│   ├── hooks.ts
│   ├── index.ts
│   ├── modules/
│   │   ├── examples.ts
│   │   ├── itemNumbering.ts
│   │   ├── preferenceScript.ts
│   │   └── quickPreview.ts
│   └── utils/
│       ├── locale.ts
│       ├── prefs.ts
│       ├── window.ts
│       └── ztoolkit.ts
└── typings/
    ├── global.d.ts
    ├── i10n.d.ts
    └── prefs.d.ts
```

## 🔗 重要链接更新

上传完成后，您需要更新以下链接（在 README.md 和其他文档中）：

1. 将所有 `https://github.com/user/zotero-one` 替换为实际的 GitHub 仓库地址
2. 更新 `package.json` 中的 repository、bugs、homepage 字段
3. 确认 Release 页面链接正确

## 🎯 下一步

1. **完善文档**: 根据实际使用情况完善 README 和文档
2. **设置 GitHub Pages**: 可选择为项目创建文档网站
3. **配置 GitHub Actions**: 设置自动化构建和发布流程
4. **社区建设**: 鼓励用户提交 Issues 和 Pull Requests
5. **版本管理**: 制定版本发布计划和更新策略

## ✅ 完成确认

- [ ] 项目已成功上传到 GitHub
- [ ] 第一个 Release (v0.1.0) 已创建
- [ ] XPI 文件已附加到 Release
- [ ] README 文档完整且链接正确
- [ ] 所有临时文件已被 .gitignore 过滤
- [ ] 项目信息（名称、描述、链接）已正确更新

恭喜！您的 Zotero One 项目现在已经在 GitHub 上发布，用户可以下载和使用了！🎉