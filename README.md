# Zotero One

[![Zotero](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![GitHub release](https://img.shields.io/github/v/release/user/zotero-one?style=flat-square)](https://github.com/user/zotero-one/releases)
[![License](https://img.shields.io/github/license/user/zotero-one?style=flat-square)](LICENSE)

**Zotero One** is an enhanced productivity plugin for Zotero that combines item numbering and quick preview functionality to streamline your research workflow.

[English](README.md) | [简体中文](doc/README-zhCN.md)

## ✨ Features

### 📋 Item Numbering
- **Sequential numbering**: Display sequential numbers for each item in your library
- **Collection-specific numbering**: Independent numbering for different collections
- **Auto-recalculation**: Numbers automatically update when items are added, removed, or moved
- **Persistent positioning**: Column position and sort preferences are saved
- **Toggle functionality**: Easily enable/disable numbering with right-click menu or toolbar button

### 👁️ Quick Preview
- **PDF preview**: Fast preview of PDF attachments without opening them
- **Performance optimized**: Shows first 10 pages for quick loading
- **Keyboard shortcuts**: Press ESC to close preview
- **Fallback support**: Graceful handling when PDFs are unavailable

### 🌐 User Interface
- **Integrated column**: Seamlessly adds a numbering column to the items view
- **Multilingual support**: Available in English and Chinese
- **Modern design**: Clean, professional appearance that matches Zotero's interface
- **Customizable**: Adjustable column position and sorting options

## 🚀 Installation

### Method 1: Download XPI (Recommended)
1. Download the latest `zotero-one.xpi` from [Releases](https://github.com/user/zotero-one/releases)
2. In Zotero, go to `Tools` → `Add-ons`
3. Click the gear icon and select `Install Add-on From File...`
4. Select the downloaded XPI file
5. Restart Zotero

### Method 2: Auto-update (Coming Soon)
Auto-update functionality will be available in future releases.

## 🔧 Usage

### Item Numbering
1. After installation, a new "编号" (Number) column will appear in your items view
2. Right-click in the items area and select "Toggle Item Numbering" to enable/disable
3. Drag the column to your preferred position
4. Click the column header to sort by number

### Quick Preview
1. Select any item with a PDF attachment
2. The preview functionality will be automatically available
3. Use keyboard shortcuts for navigation

## 🛠️ Development

### Prerequisites
- Node.js (v16 or higher)
- npm or pnpm
- Zotero Beta (for testing)

### Setup
```bash
git clone https://github.com/user/zotero-one.git
cd zotero-one
npm install
```

### Development Commands
```bash
# Start development server with hot reload
npm start

# Build for production
npm run build

# Lint and format code
npm run lint:fix

# Release new version
npm run release
```

### Project Structure
```
zotero-one/
├── src/                    # TypeScript source code
│   ├── modules/            # Core functionality modules
│   │   ├── itemNumbering.ts    # Item numbering logic
│   │   └── quickPreview.ts     # Quick preview functionality
│   ├── utils/              # Utility functions
│   └── hooks.ts            # Lifecycle hooks
├── addon/                  # Static addon files
│   ├── content/            # UI and assets
│   ├── locale/             # Internationalization
│   └── manifest.json       # Plugin manifest
└── .scaffold/              # Build output
    └── build/
        └── zotero-one.xpi  # Built plugin file
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template)
- Powered by [Zotero Plugin Toolkit](https://github.com/windingwind/zotero-plugin-toolkit)
- TypeScript definitions from [Zotero Types](https://github.com/windingwind/zotero-types)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/user/zotero-one/issues)
- **Discussions**: [GitHub Discussions](https://github.com/user/zotero-one/discussions)
- **Documentation**: [Plugin Documentation](https://github.com/user/zotero-one/wiki)

---

<p align="center">
  <b>Enhance your Zotero experience with Zotero One!</b><br>
  <sub>🔥 Star this repository if you find it useful!</sub>
</p>