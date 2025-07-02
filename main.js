const { app, BrowserWindow, ipcMain, dialog, Menu, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;
// In development mode, use a local file for easier debugging
const isDev = process.argv.includes('--dev');
const TASKS_FILE = isDev ? path.join(__dirname, 'tasks.json') : getUserDataPath();

// Get the appropriate path for storing user data
function getUserDataPath() {
    // In production, use the app's user data directory
    // This ensures the file is stored in the user's profile on Windows
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'tasks.json');
}

// Default tasks template - basic structure to use when creating a new tasks.json
const DEFAULT_TASKS = [
    {
        "id": Date.now(),
        "name": "My First Project",
        "isCollapsed": false,
        "tasks": [
            {
                "id": Date.now() + 1,
                "name": "Initial Task",
                "status": "To Do",
                "isCollapsed": false,
                "commits": []
            }
        ]
    }
];

// Check if tasks.json exists, if not create it with default content
async function initTasksFile() {
    try {
        // Check if the file exists
        await fs.access(TASKS_FILE);
        console.log('tasks.json exists, no initialization needed');
    } catch (error) {
        // File doesn't exist, create it with default content
        console.log('Creating default tasks.json file');
        try {
            await fs.writeFile(TASKS_FILE, JSON.stringify(DEFAULT_TASKS, null, 2), 'utf8');
            console.log('Default tasks.json created successfully');
        } catch (writeError) {
            console.error('Error creating default tasks.json:', writeError);
        }
    }
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
      icon: path.join(__dirname, 'assets', 'svn.png'), // Use SVN icon
    show: false // Don't show until ready
  });

  // Load the app
  mainWindow.loadFile('index.html');

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-project');
          }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu-save');
          }
        },
        { type: 'separator' },
        {
          label: 'Export JSON',
          click: async () => {
            const result = await dialog.showSaveDialog(mainWindow, {
              defaultPath: 'tasks.json',
              filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });
            
            if (!result.canceled) {
              mainWindow.webContents.send('menu-export', result.filePath);
            }
          }
        },
        {
          label: 'Import JSON',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });
            
            if (!result.canceled) {
              mainWindow.webContents.send('menu-import', result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Window menu
    template[4].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(async () => {
    // Initialize tasks file before creating the window to ensure it exists
    await initTasksFile();

  createWindow();
  createMenu();

    // Handle command line arguments
    handleCommandLineArgs();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for file operations
ipcMain.handle('load-tasks', async () => {
  try {
      // Try to read the existing file
    const data = await fs.readFile(TASKS_FILE, 'utf8');
      try {
        return JSON.parse(data);
    } catch (parseError) {
        console.error('Error parsing tasks.json, file may be corrupted:', parseError);
        // Create a backup of the corrupted file
        const backupFile = `${TASKS_FILE}.backup-${Date.now()}`;
        await fs.writeFile(backupFile, data, 'utf8');
        console.log(`Backed up corrupted tasks.json to ${backupFile}`);

        // Return default tasks for corrupted file
        return DEFAULT_TASKS;
    }
  } catch (error) {
    console.error('Error loading tasks:', error);
      // If file doesn't exist, create it with default content
      if (error.code === 'ENOENT') {
          try {
              await fs.writeFile(TASKS_FILE, JSON.stringify(DEFAULT_TASKS, null, 2), 'utf8');
              console.log('Created default tasks.json during load operation');
              return DEFAULT_TASKS;
          } catch (writeError) {
              console.error('Error creating default tasks.json during load:', writeError);
          }
      }
      // Return empty array if other errors occur
    return [];
  }
});

ipcMain.handle('save-tasks', async (event, data) => {
  try {
      // Ensure the directory exists
      const dirPath = path.dirname(TASKS_FILE);
      try {
          await fs.access(dirPath);
      } catch (dirError) {
          // Create directory if it doesn't exist
          if (dirError.code === 'ENOENT') {
              await fs.mkdir(dirPath, { recursive: true });
              console.log(`Created directory: ${dirPath}`);
          }
      }

      // Save the data
    await fs.writeFile(TASKS_FILE, JSON.stringify(data, null, 2), 'utf8');
      console.log('Tasks saved successfully');
    return { success: true };
  } catch (error) {
    console.error('Error saving tasks:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-tasks', async (event, filePath, data) => {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Error exporting tasks:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-tasks', async (event, filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return { success: true, data: JSON.parse(data) };
  } catch (error) {
    console.error('Error importing tasks:', error);
    return { success: false, error: error.message };
  }
});

// Handle system theme preference
ipcMain.handle('get-system-prefers-dark', () => {
    if (nativeTheme) {
        return nativeTheme.shouldUseDarkColors;
    }
    return false;
});

// Handle app certificate errors (for development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (process.argv.includes('--dev')) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

// Handle command line arguments
function handleCommandLineArgs() {
    // Check for --reset-data flag to reset the tasks.json file
    if (process.argv.includes('--reset-data')) {
        console.log('Reset data flag detected, creating new tasks.json file');
        try {
            fs.writeFileSync(TASKS_FILE, JSON.stringify(DEFAULT_TASKS, null, 2), 'utf8');
            console.log('Tasks data reset successfully');

            // Show confirmation dialog
            if (mainWindow) {
                dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'Data Reset',
                    message: 'The tasks data has been reset successfully.',
                    buttons: ['OK']
                });
            }
        } catch (error) {
            console.error('Error resetting tasks data:', error);

            // Show error dialog
            if (mainWindow) {
                dialog.showErrorBox(
                    'Data Reset Failed',
                    `Failed to reset tasks data: ${error.message}`
                );
            }
        }
    }
}

// Get the appropriate path for storing user data
