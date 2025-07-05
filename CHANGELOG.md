# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-04

### Added
- **Initial release of Zotero One**
- **Item Numbering Feature**
  - Sequential numbering for library items
  - Collection-specific numbering support
  - Auto-recalculation when items are added/removed/moved
  - Persistent column position and sort preferences
  - Toggle functionality via right-click menu and toolbar button
  - Customizable column positioning
  - Sort by item number support

- **Quick Preview Feature**
  - Fast PDF preview functionality
  - Performance-optimized rendering (first 10 pages)
  - Keyboard shortcuts (ESC to close)
  - Graceful fallback for unavailable PDFs

- **User Interface**
  - Integrated numbering column in items view
  - Modern blue-themed icon design
  - Multilingual support (English and Chinese)
  - Clean, professional appearance matching Zotero's interface

- **Technical Features**
  - TypeScript implementation
  - Hot reload development support
  - Comprehensive build system
  - Proper plugin packaging (XPI)
  - Auto-update configuration

### Technical Details
- Built with Zotero Plugin Template
- Uses Zotero Plugin Toolkit for enhanced functionality
- TypeScript definitions from Zotero Types
- Compatible with Zotero 6.999+ and 7.*
- AGPL-3.0 license

### Files Structure
```
zotero-one/
├── src/                    # TypeScript source code
├── addon/                  # Static plugin files
├── .scaffold/build/        # Build output
└── docs/                   # Documentation
```

---

**Full Changelog**: https://github.com/user/zotero-one/commits/v0.1.0