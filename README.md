# SVN Commit Tracker - Electron Desktop App

<img src="assets/svn.png" alt="SVN Commit Tracker" width="64" height="64" align="right"/>

A desktop application for tracking SVN commits and project tasks, built with Electron.

![image](https://github.com/user-attachments/assets/2617ff96-be3d-43e6-b7f6-e6bba3cdafb8)


## Features

- ✅ **Modal-based Interface**: Professional modals replace browser prompts
- ✅ **Auto-save**: Automatic saving to local file system
- ✅ **Desktop Integration**: Native menus, keyboard shortcuts, and file dialogs
- ✅ **Export/Import**: Easy backup and sharing of project data
- ✅ **Cross-platform**: Works on Windows, macOS, and Linux

## Installation

1. **Install Node.js** (version 16 or higher) from [nodejs.org](https://nodejs.org/)

2. **Install dependencies**:
   ```bash
   npm install
   ```

## Running the Application

### Development Mode

```bash
npm start
# or
npm run dev  # (opens with DevTools)
```

### Building for Distribution

Build for all platforms:

```bash
npm run dist
```

Or build for specific platforms:

```bash
npm run build-win    # Windows
npm run build-mac    # macOS
npm run build-linux  # Linux
```

> **Note:** Before building for Windows or macOS, you need to convert the SVN.png icon to the appropriate format:
>
> - For Windows: Run `create-ico.bat` to convert to .ico format
> - For macOS: Run `create-icns.sh` to convert to .icns format

## Project Structure

```
svn-commit-tracker/
├── main.js           # Main Electron process
├── preload.js        # Preload script for IPC
├── index.html        # App UI
├── script.js         # Renderer process logic
├── style.css         # Styling
├── tasks.json        # Data storage (auto-created)
├── package.json      # Dependencies and build config
└── assets/           # Icons and resources
```

## Usage

### Keyboard Shortcuts

- **Ctrl/Cmd + N**: New Project
- **Ctrl/Cmd + S**: Save
- **Ctrl/Cmd + Enter**: Confirm modal (when modal is open)
- **Escape**: Close modal

### Menu Options

- **File → New Project**: Add a new project
- **File → Save**: Manual save (auto-save is enabled by default)
- **File → Export JSON**: Export data to a custom location
- **File → Import JSON**: Import data from a file

### Data Storage

- Data is automatically saved to `tasks.json` in the user's application data folder
  - Windows: `%APPDATA%\Local\svn-commit-tracker\tasks.json`
  - macOS: `~/Library/Application Support/svn-commit-tracker/tasks.json`
  - Linux: `~/.config/svn-commit-tracker/tasks.json`
- The file is created automatically on first launch with a default project and task
- Changes are auto-saved after a 500ms delay to prevent excessive writes
- The save status is shown in the header (✓ Auto-saved / ✗ Save failed)

### Troubleshooting

- **Reset Data**: If you encounter issues with corrupted data
  ```bash
  npm run reset-data
  ```
  Or in the installed application:
  ```bash
  svn-commit-tracker.exe --reset-data
  ```
- **Check Installation**: Run `check-installation.bat` (Windows) to verify your installation
- **File Locations**:
  - In development: File is saved in the project root folder
  - In production: File is saved in the user's application data folder

## Development

### Debug Mode

```bash
npm run dev
```

This opens the app with DevTools enabled for debugging.

### Project Structure

- **Main Process** (`main.js`): Handles window creation, menus, and file operations
- **Renderer Process** (`script.js`): Handles UI logic and user interactions
- **Preload Script** (`preload.js`): Safely exposes IPC methods to renderer

## Building Executables

The build process creates installers/packages for distribution:

- **Windows**: `.exe` installer (NSIS)
- **macOS**: `.dmg` disk image
- **Linux**: `.AppImage` portable executable

Built files are saved in the `dist/` directory.

## Troubleshooting

### App won't start

- Ensure Node.js is installed (version 16+)
- Run `npm install` to install dependencies
- Check console for error messages

### Data not saving

- Check file permissions in the app directory
- Look for error notifications in the app
- Verify `tasks.json` is not locked by another process

### Build fails

- Ensure all dependencies are installed
- Check that you have the required build tools for your platform
- Clear `node_modules` and run `npm install` again

## License

MIT License - feel free to modify and distribute.
