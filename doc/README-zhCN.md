# Zotero One

[![Zotero](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![GitHub release](https://img.shields.io/github/v/release/user/zotero-one?style=flat-square)](https://github.com/user/zotero-one/releases)
[![License](https://img.shields.io/github/license/user/zotero-one?style=flat-square)](../LICENSE)

**Zotero One** 是一款增强型 Zotero 生产力插件，集成了文献编号和快速预览功能，让您的学术研究工作流更加高效。

[English](../README.md) | [简体中文](README-zhCN.md)

## ✨ 功能特色

### 📋 文献编号
- **序列编号**：为文献库中的每个条目显示序列号
- **集合独立编号**：不同集合使用独立的编号系统
- **自动重新计算**：添加、删除或移动条目时自动更新编号
- **持久化位置**：保存列位置和排序偏好设置
- **开关功能**：通过右键菜单或工具栏按钮轻松启用/禁用编号

### 👁️ 快速预览
- **PDF 预览**：快速预览 PDF 附件，无需打开文件
- **性能优化**：仅显示前 10 页，加载速度快
- **键盘快捷键**：按 ESC 键关闭预览
- **降级支持**：优雅处理 PDF 不可用的情况

### 🌐 用户界面
- **集成列**：无缝添加编号列到条目视图中
- **多语言支持**：支持中文和英文界面
- **现代设计**：简洁专业的外观，与 Zotero 界面完美融合
- **可自定义**：可调整列位置和排序选项

## 🚀 安装方法

### 方法 1：下载 XPI（推荐）
1. 从 [Releases](https://github.com/user/zotero-one/releases) 下载最新的 `zotero-one.xpi` 文件
2. 在 Zotero 中，转到 `工具` → `插件`
3. 点击齿轮图标，选择 `从文件安装插件...`
4. 选择下载的 XPI 文件
5. 重启 Zotero

### 方法 2：自动更新（即将推出）
自动更新功能将在未来版本中提供。

## 🔧 使用方法

### 文献编号
1. 安装后，条目视图中将出现新的"编号"列
2. 在条目区域右键点击，选择"切换文献编号"来启用/禁用功能
3. 拖拽列到您喜欢的位置
4. 点击列标题按编号排序

### 快速预览
1. 选择任何带有 PDF 附件的条目
2. 预览功能将自动可用
3. 使用键盘快捷键进行导航

## 🛠️ 开发

### 前置要求
- Node.js（v16 或更高版本）
- npm 或 pnpm
- Zotero Beta（用于测试）

### 安装配置
```bash
git clone https://github.com/user/zotero-one.git
cd zotero-one
npm install
```

### 开发命令
```bash
# 启动开发服务器（带热重载）
npm start

# 生产环境构建
npm run build

# 代码检查和格式化
npm run lint:fix

# 发布新版本
npm run release
```

### 项目结构
```
zotero-one/
├── src/                    # TypeScript 源代码
│   ├── modules/            # 核心功能模块
│   │   ├── itemNumbering.ts    # 文献编号逻辑
│   │   └── quickPreview.ts     # 快速预览功能
│   ├── utils/              # 工具函数
│   └── hooks.ts            # 生命周期钩子
├── addon/                  # 静态插件文件
│   ├── content/            # UI 和资源
│   ├── locale/             # 国际化
│   └── manifest.json       # 插件清单
└── .scaffold/              # 构建输出
    └── build/
        └── zotero-one.xpi  # 构建的插件文件
```

## 🤝 贡献

欢迎贡献代码！请随时提交问题和拉取请求。

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

## 📝 许可证

本项目采用 AGPL-3.0 许可证 - 详见 [LICENSE](../LICENSE) 文件。

## 🙏 致谢

- 基于 [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template) 构建
- 由 [Zotero Plugin Toolkit](https://github.com/windingwind/zotero-plugin-toolkit) 驱动
- TypeScript 定义来自 [Zotero Types](https://github.com/windingwind/zotero-types)

## 📞 支持

- **问题反馈**：[GitHub Issues](https://github.com/user/zotero-one/issues)
- **讨论区**：[GitHub Discussions](https://github.com/user/zotero-one/discussions)
- **文档**：[插件文档](https://github.com/user/zotero-one/wiki)

---

<p align="center">
  <b>使用 Zotero One 提升您的 Zotero 体验！</b><br>
  <sub>🔥 如果您觉得有用，请为此仓库点个星！</sub>
</p>