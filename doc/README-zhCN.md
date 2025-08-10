# Zotero One

[![Zotero](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![GitHub release](https://img.shields.io/github/v/release/user/zotero-one?style=flat-square)](https://github.com/user/zotero-one/releases)
[![License](https://img.shields.io/github/license/user/zotero-one?style=flat-square)](../LICENSE)

**Zotero One** 是一款增强型 Zotero 生产力插件，集成了文献编号和快速预览功能，让您的学术研究工作流更加高效。该项目全程使用AI编程工具开发，Vibe Coding的产品。

[English](../README.md) | [简体中文](README-zhCN.md)

## ✨ 功能特色

### 📋 文献编号

- **序列编号**：为文献库中的每个条目显示序列号。
  ![alt text](../image/编号列.png)

### 👁️ 快速预览

- **文献信息预览**：选中文献后按下空格键快速预览文献摘要等信息，无需打开文件或扭头去看右边的信息栏。
  ![alt text](../image/模态窗口文献信息预览.png)

## 🚀 安装方法

### 方法 1：下载 XPI（推荐）

1. 从 [Releases](https://github.com/user/zotero-one/releases) 下载最新的 `zotero-one.xpi` 文件
2. 在 Zotero 中，转到 `工具` → `插件`
3. 点击齿轮图标，选择 `从文件安装插件...`
4. 选择下载的 XPI 文件
5. 重启 Zotero

## 🔧 使用方法

### 文献编号

1. 安装后，条目视图中将出现新的"编号"列
2. 在条目区域右键点击，选择"切换文献编号"来启用/禁用功能
3. 拖拽列到您喜欢的位置
4. 点击列标题按编号排序

### 快速预览

1. 选择任何想要预览的文献
2. 按下键盘上的空格键进行快速预览文献，如果想要关闭预览，再次按下键盘上空格键或者ESC键即可退出模态窗口。
3. 如果想要在Zotero的标签页进行深入阅读，可按模态窗口右上角的按钮，既可在Zotero的标签页打开文献的PDF，进行深入的阅读。

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

- 全程使用AI编程工具开发，Vibe Coding的产品。非常感谢AI技术的发展，能让我一个不懂编程技术的人员做出自己想要的软件产品。
- 基于 [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template) 构建
- 由 [Zotero Plugin Toolkit](https://github.com/windingwind/zotero-plugin-toolkit) 驱动
- TypeScript 定义来自 [Zotero Types](https://github.com/windingwind/zotero-types)

## 🎬 欢迎关注我的频道

B站: https://space.bilibili.com/52846118
小红书：https://www.xiaohongshu.com/user/profile/5c6115700000000018009a4f?xsec_token=YBpDdQp4eCnQ3Lbgl3zmttyrXctNCrsPQG_OykwICV4J8=&xsec_source=app_share&xhsshare=CopyLink&appuid=5c6115700000000018009a4f&apptime=1751780059&share_id=fd73f6b440b349df806f843825046a96
Youtube：https://youtube.com/channel/UCwcXTd0naGLe881Jn0-5m7w?si=MgxSQ9OB-shF7gC_

## 📞 支持

- **问题反馈**：[GitHub Issues](https://github.com/user/zotero-one/issues)
- **讨论区**：[GitHub Discussions](https://github.com/user/zotero-one/discussions)
- **文档**：[插件文档](https://github.com/user/zotero-one/wiki)

---

<p align="center">
  <b>使用 Zotero One 提升您的 Zotero 体验！</b><br>
  <sub>🔥 如果您觉得有用，请为此仓库点个星！</sub>
</p>
