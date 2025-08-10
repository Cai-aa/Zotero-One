# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zotero One is a Zotero plugin that enhances productivity with item numbering and quick preview features. It's built using TypeScript and the Zotero Plugin Toolkit, designed for Zotero 7.

## Development Commands

### Essential Commands

- `npm start` - Start development server with hot reload
- `npm run build` - Build plugin for production (includes TypeScript compilation)
- `npm run lint:check` - Check code formatting and linting
- `npm run lint:fix` - Fix formatting and linting issues automatically
- `npm run release` - Create production release

### Testing and Quality

- `npm run lint:check` should be run before commits
- TypeScript compilation is included in the build process (`tsc --noEmit`)
- No test framework is currently configured

## Architecture Overview

### Core Plugin Structure

The plugin follows the standard Zotero plugin architecture with these key components:

1. **Main Entry Point** (`src/index.ts`): Initializes the addon instance and sets up global objects
2. **Addon Class** (`src/addon.ts`): Central plugin class that manages state and lifecycle
3. **Hooks System** (`src/hooks.ts`): Event-driven lifecycle management with startup, shutdown, and event handlers

### Key Features Implementation

#### Item Numbering (`src/modules/itemNumbering.ts`)

- Registers a custom column in Zotero's item tree view
- Maintains sequential numbering for items across collections
- Handles collection switching and item state changes
- Saves column position and sort state preferences
- Uses Zotero.ItemTreeManager.registerColumns() for column registration

#### Quick Preview (`src/modules/quickPreview.ts`)

- Implements space-bar triggered modal previews for literature information
- Uses keyboard event listeners across all Zotero windows
- Creates overlay UI elements for document previews
- Manages preview state and cleanup

### Key Technical Patterns

#### Plugin Toolkit Integration

- Uses `zotero-plugin-toolkit` for UI components and utilities
- Implements `ztoolkit` global for logging and development tools
- Follows the plugin template structure from windingwind/zotero-plugin-template

#### Event Handling

- Monitors Zotero notify events for item/collection changes
- Hooks into UI events (column moves, sorting, collection selection)
- Uses setTimeout delays to ensure Zotero UI state consistency

#### State Management

- Collection-specific item numbering maps
- Preference storage for column position and sort state
- Global addon data object for cross-component communication

### Build Configuration

#### TypeScript Setup

- Extends zotero-types sandbox configuration
- Target: Firefox 115 (Zotero's underlying browser engine)
- Source files in `src/`, output to `.scaffold/build/`

#### Plugin Scaffold (`zotero-plugin.config.ts`)

- esbuild-based build system targeting Firefox 115
- Static assets from `addon/` directory
- Internationalization support (en-US, zh-CN)

#### ESLint Configuration

- Custom rules for Zotero development (restricts global window/document access)
- Requires using Zotero.getMainWindow() instead of direct globals
- TypeScript-specific linting with typescript-eslint

### File Structure Significance

- `src/modules/` - Core feature implementations
- `src/utils/` - Shared utilities (locale, preferences, window management)
- `addon/` - Static resources (manifest, preferences UI, localization)
- `typings/` - TypeScript type definitions for plugin-specific types

### Development Notes

- Plugin uses delayed initialization (setTimeout) to ensure Zotero UI is fully loaded
- Event listeners are carefully managed to prevent memory leaks
- Column registration checks prevent duplicate registrations across window loads
- Chinese and English localization support built-in
