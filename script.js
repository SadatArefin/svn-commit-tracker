// --- DATA STORAGE ---
let appData = [];
let saveTimeout = null;

// --- NAVIGATION STATE ---
let navigationState = {
    selectedProject: null,
    selectedTask: null,
    selectedCommit: null,
    selectedFile: null
};

// --- ELECTRON API CHECK ---
const isElectron = typeof window.electronAPI !== 'undefined';

// --- MODAL FUNCTIONALITY ---
const modal = {
    element: document.getElementById('modal'),
    title: document.getElementById('modal-title'),
    content: document.getElementById('modal-content'),
    confirmBtn: document.getElementById('modal-confirm'),
    cancelBtn: document.getElementById('modal-cancel'),
    closeBtn: document.getElementById('modal-close'),
    
    show(title, content, onConfirm) {
        this.title.textContent = title;
        this.content.innerHTML = content;
        this.element.classList.remove('hidden');
        
        // Focus first input if exists
        const firstInput = this.content.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        // Set up event listeners
        const confirmHandler = () => {
            const result = onConfirm();
            if (result !== false) {
                this.hide();
                autoSave();
            }
        };
        
        const cancelHandler = () => this.hide();
        
        this.confirmBtn.onclick = confirmHandler;
        this.cancelBtn.onclick = cancelHandler;
        this.closeBtn.onclick = cancelHandler;
        
        // Close on ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.hide();
                document.removeEventListener('keydown', escHandler);
            }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                confirmHandler();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        // Close on backdrop click
        this.element.onclick = (e) => {
            if (e.target === this.element) {
                this.hide();
            }
        };
    },
    
    hide() {
        this.element.classList.add('hidden');
        this.confirmBtn.onclick = null;
        this.cancelBtn.onclick = null;
        this.closeBtn.onclick = null;
        this.element.onclick = null;
    }
};

// --- AUTO SAVE FUNCTIONALITY ---
const autoSave = async () => {
    if (!isElectron) {
        console.warn('Not in Electron environment, skipping save');
        return;
    }

    // Debounce saves to avoid excessive file writes
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    
    saveTimeout = setTimeout(async () => {
        try {
            const result = await window.electronAPI.saveTasks(appData);
            if (result.success) {
                showSaveStatus(true);
            } else {
                showNotification('Failed to save: ' + result.error, 'error');
                showSaveStatus(false);
            }
        } catch (error) {
            console.error('Error saving:', error);
            showNotification('Error saving data: ' + error.message, 'error');
            showSaveStatus(false);
        }
    }, 500); // Wait 500ms before saving
};

// --- SAVE STATUS INDICATOR ---
const showSaveStatus = (success) => {
    const statusEl = document.getElementById('save-status');
    if (success) {
        statusEl.innerHTML = '<span>✓ Auto-saved</span>';
        statusEl.className = 'text-sm text-green-600';
    } else {
        statusEl.innerHTML = '<span>✗ Save failed</span>';
        statusEl.className = 'text-sm text-red-600';
    }
    statusEl.classList.remove('hidden');
    
    setTimeout(() => {
        statusEl.classList.add('hidden');
    }, 2000);
};

// --- NOTIFICATION SYSTEM ---
const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg text-white z-50 ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
};

// --- LOAD DATA FROM ELECTRON ---
const loadDataFromFile = async () => {
    if (!isElectron) {
        console.warn('Not in Electron environment, using empty data');
        appData = [];
        return;
    }

    try {
        const data = await window.electronAPI.loadTasks();
        if (Array.isArray(data)) {
            appData = data;
        } else {
            throw new Error('Invalid data format: expected an array');
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        showNotification('Error loading tasks: ' + error.message + '. Using empty project list.', 'error');
        appData = [];
    }
};

// --- MENU HANDLERS ---
const setupMenuHandlers = () => {
    if (!isElectron) return;

    window.electronAPI.onMenuNewProject(() => {
        // Trigger add project modal
        document.dispatchEvent(new CustomEvent('menu-add-project'));
    });

    window.electronAPI.onMenuSave(() => {
        autoSave();
    });

    window.electronAPI.onMenuExport((event, filePath) => {
        exportToFile(filePath);
    });

    window.electronAPI.onMenuImport((event, filePath) => {
        importFromFile(filePath);
    });
};

// --- EXPORT/IMPORT FUNCTIONS ---
const exportToFile = async (filePath) => {
    if (!isElectron) return;
    
    try {
        const result = await window.electronAPI.exportTasks(filePath, appData);
        if (result.success) {
            showNotification('Data exported successfully!', 'success');
        } else {
            showNotification('Export failed: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Export error: ' + error.message, 'error');
    }
};

const importFromFile = async (filePath) => {
    if (!isElectron) return;
    
    try {
        const result = await window.electronAPI.importTasks(filePath);
        if (result.success) {
            appData = result.data;
            render();
            autoSave(); // Save the imported data
            showNotification('Data imported successfully!', 'success');
        } else {
            showNotification('Import failed: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Import error:', error);
        showNotification('Import error: ' + error.message, 'error');
    }
};

// --- VERSION INFO ---
const showVersionInfo = () => {
    const versionEl = document.getElementById('version-info');
    if (isElectron && window.electronAPI.versions) {
        const { electron, chrome, node } = window.electronAPI.versions;
        versionEl.textContent = `Electron ${electron} • Chrome ${chrome} • Node ${node}`;
    } else {
        versionEl.textContent = 'Web Version';
    }
};

const getStatusClass = (status) => {
    switch (status) {
        case "Done":
            return "status-done";
        case "In Progress":
            return "status-progress";
        case "To Do":
        default:
            return "status-todo";
    }
};

const findItem = (id) => {
    for (const project of appData) {
        if (project.id === id) return { project };
        for (const task of project.tasks) {
            if (task.id === id) return { project, task };
            for (const commit of task.commits) {
                if (commit.id === id) return { project, task, commit };
                for (const file of commit.files) {
                    if (file.id === id) return { project, task, commit, file };
                }
            }
        }
    }
    return {};
};

// --- NAVIGATION FUNCTIONS ---
const selectProject = (projectId) => {
    navigationState.selectedProject = projectId;
    navigationState.selectedTask = null;
    navigationState.selectedCommit = null;
    navigationState.selectedFile = null;
    render();
};

const selectTask = (taskId) => {
    navigationState.selectedTask = taskId;
    navigationState.selectedCommit = null;
    navigationState.selectedFile = null;
    render();
};

const selectCommit = (commitId) => {
    navigationState.selectedCommit = commitId;
    navigationState.selectedFile = null;
    render();
};

const selectFile = (fileId) => {
    navigationState.selectedFile = fileId;
    render();
};

// --- SIDEBAR RENDERING ---
const renderSidebar = () => {
    const sidebarContent = document.getElementById('sidebar-content');

    if (appData.length === 0) {
        sidebarContent.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p class="text-sm">No projects yet</p>
                <p class="text-xs mt-1">Click "Add New Project" below</p>
            </div>`;
        return;
    }

    let html = '<div class="space-y-1">';

    // Render projects
    appData.forEach(project => {
        const isSelected = navigationState.selectedProject === project.id;
        const taskCount = project.tasks.length;

        html += `
            <div class="nav-item nav-level-0 ${isSelected ? 'active' : ''}" 
                 data-action="select-project" data-id="${project.id}">
                <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
                </svg>
                <span class="nav-text">${project.name}</span>
                <span class="nav-badge">${taskCount}</span>
            </div>`;

        // Render tasks if project is selected
        if (isSelected && project.tasks.length > 0) {
            project.tasks.forEach(task => {
                const isTaskSelected = navigationState.selectedTask === task.id;
                const commitCount = task.commits.length;

                html += `
                    <div class="nav-item nav-level-1 ${isTaskSelected ? 'active' : ''}" 
                         data-action="select-task" data-id="${task.id}">
                        <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                        </svg>
                        <span class="nav-text">${task.name}</span>
                        <span class="status-badge ${getStatusClass(task.status)}">${task.status}</span>
                        <span class="nav-badge">${commitCount}</span>
                    </div>`;

                // Render commits if task is selected
                if (isTaskSelected && task.commits.length > 0) {
                    task.commits.forEach(commit => {
                        const isCommitSelected = navigationState.selectedCommit === commit.id;
                        const fileCount = commit.files.length;

                        html += `
                            <div class="nav-item nav-level-2 ${isCommitSelected ? 'active' : ''}" 
                                 data-action="select-commit" data-id="${commit.id}">
                                <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                <span class="nav-text">${commit.name}</span>
                                <span class="nav-badge">${fileCount}</span>
                            </div>`;
                    });
                }
            });
        }
    });

    html += '</div>';
    sidebarContent.innerHTML = html;
};

// --- BREADCRUMB RENDERING ---
const renderBreadcrumb = () => {
    const breadcrumb = document.getElementById('breadcrumb');
    let html = '';

    if (!navigationState.selectedProject) {
        html = '<span class="breadcrumb-item">Select a project to get started</span>';
    } else {
        const { project, task, commit } = findItem(navigationState.selectedProject);

        html += `<span class="breadcrumb-item active">${project.name}</span>`;

        if (navigationState.selectedTask) {
            const selectedTask = findItem(navigationState.selectedTask).task;
            html += '<span class="breadcrumb-separator">›</span>';
            html += `<span class="breadcrumb-item active">${selectedTask.name}</span>`;

            if (navigationState.selectedCommit) {
                const selectedCommit = findItem(navigationState.selectedCommit).commit;
                html += '<span class="breadcrumb-separator">›</span>';
                html += `<span class="breadcrumb-item active">${selectedCommit.name}</span>`;
            }
        }
    }

    breadcrumb.innerHTML = html;
};

// --- MAIN CONTENT RENDERING ---
const renderMainContent = () => {
    const mainContent = document.getElementById('main-content');

    if (!navigationState.selectedProject) {
        mainContent.innerHTML = `
            <div class="text-center py-12">
                <div class="text-gray-400 mb-4">
                    <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                </div>
                <h2 class="text-xl font-semibold text-gray-700 mb-2">Welcome to SVN Commit Tracker</h2>
                <p class="text-gray-500">Select a project from the sidebar to view its tasks, commits, and files.</p>
            </div>`;
        return;
    }

    if (navigationState.selectedCommit) {
        renderCommitFiles();
    } else if (navigationState.selectedTask) {
        renderTaskCommits();
    } else {
        renderProjectTasks();
    }
};

const renderProjectTasks = () => {
    const mainContent = document.getElementById('main-content');
    const project = findItem(navigationState.selectedProject).project;

    if (!project) return;

    let html = `
        <div class="content-card">
            <div class="content-header">
                <div>
                    <h1 class="content-title">${project.name}</h1>
                    <p class="content-subtitle">${project.tasks.length} tasks</p>
                </div>
                <div class="content-actions">
                    <button class="btn btn-primary" data-action="add-task" data-project-id="${project.id}">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Add Task
                    </button>
                    <button class="btn btn-secondary" data-action="edit-project" data-id="${project.id}">Edit</button>
                    <button class="btn btn-danger" data-action="delete-project" data-id="${project.id}">Delete</button>
                </div>
            </div>
        </div>`;

    if (project.tasks.length === 0) {
        html += `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" 
                          d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                <h3 class="text-lg font-medium mb-2">No tasks yet</h3>
                <p class="mb-4">Add your first task to get started</p>
                <button class="btn btn-primary" data-action="add-task" data-project-id="${project.id}">Add Task</button>
            </div>`;
    } else {
        project.tasks.forEach(task => {
            const commitCount = task.commits.length;
            html += `
                <div class="content-card">
                    <div class="content-header">
                        <div>
                            <h2 class="content-title">${task.name}</h2>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="status-badge ${getStatusClass(task.status)}">${task.status}</span>
                                <span class="content-subtitle">${commitCount} commits</span>
                            </div>
                        </div>
                        <div class="content-actions">
                            <button class="btn btn-primary btn-sm" data-action="select-task" data-id="${task.id}">View Details</button>
                            <button class="btn btn-secondary btn-sm" data-action="edit-task" data-id="${task.id}">Edit</button>
                            <button class="btn btn-danger btn-sm" data-action="delete-task" data-id="${task.id}">Delete</button>
                        </div>
                    </div>
                </div>`;
        });
    }

    mainContent.innerHTML = html;
};

const renderTaskCommits = () => {
    const mainContent = document.getElementById('main-content');
    const { project, task } = findItem(navigationState.selectedTask);

    if (!task) return;

    let html = `
        <div class="content-card">
            <div class="content-header">
                <div>
                    <h1 class="content-title">${task.name}</h1>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="status-badge ${getStatusClass(task.status)}">${task.status}</span>
                        <span class="content-subtitle">${task.commits.length} commits</span>
                    </div>
                </div>
                <div class="content-actions">
                    <button class="btn btn-primary" data-action="add-commit" data-task-id="${task.id}">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Add Commit
                    </button>
                    <button class="btn btn-secondary" data-action="edit-task" data-id="${task.id}">Edit</button>
                    <button class="btn btn-danger" data-action="delete-task" data-id="${task.id}">Delete</button>
                </div>
            </div>
        </div>`;

    if (task.commits.length === 0) {
        html += `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" 
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <h3 class="text-lg font-medium mb-2">No commits yet</h3>
                <p class="mb-4">Add your first commit to track changes</p>
                <button class="btn btn-primary" data-action="add-commit" data-task-id="${task.id}">Add Commit</button>
            </div>`;
    } else {
        task.commits.forEach(commit => {
            const fileCount = commit.files.length;
            html += `
                <div class="content-card">
                    <div class="content-header">
                        <div>
                            <h2 class="content-title">${commit.name}</h2>
                            <p class="content-subtitle">${fileCount} files</p>
                        </div>
                        <div class="content-actions">
                            <button class="btn btn-primary btn-sm" data-action="select-commit" data-id="${commit.id}">View Files</button>
                            <button class="btn btn-secondary btn-sm" data-action="edit-commit" data-id="${commit.id}">Edit</button>
                            <button class="btn btn-danger btn-sm" data-action="delete-commit" data-id="${commit.id}">Delete</button>
                        </div>
                    </div>
                </div>`;
        });
    }

    mainContent.innerHTML = html;
};

const renderCommitFiles = () => {
    const mainContent = document.getElementById('main-content');
    const { project, task, commit } = findItem(navigationState.selectedCommit);

    if (!commit) return;

    let html = `
        <div class="content-card">
            <div class="content-header">
                <div>
                    <h1 class="content-title">${commit.name}</h1>
                    <p class="content-subtitle">${commit.files.length} files</p>
                </div>
                <div class="content-actions">
                    <button class="btn btn-primary" data-action="add-file" data-commit-id="${commit.id}">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Add File
                    </button>
                    <button class="btn btn-secondary" data-action="edit-commit" data-id="${commit.id}">Edit</button>
                    <button class="btn btn-danger" data-action="delete-commit" data-id="${commit.id}">Delete</button>
                </div>
            </div>
        </div>`;

    if (commit.files.length === 0) {
        html += `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" 
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <h3 class="text-lg font-medium mb-2">No files yet</h3>
                <p class="mb-4">Add files to track changes in this commit</p>
                <button class="btn btn-primary" data-action="add-file" data-commit-id="${commit.id}">Add File</button>
            </div>`;
    } else {
        html += '<ul class="file-list">';
        commit.files.forEach(file => {
            html += `
                <li class="file-item">
                    <span class="file-name">${file.name}</span>
                    <span class="file-description">${file.description || 'No description'}</span>
                    <div class="file-actions">
                        <button class="btn btn-secondary btn-sm" data-action="edit-file" data-id="${file.id}">Edit</button>
                        <button class="btn btn-danger btn-sm" data-action="delete-file" data-id="${file.id}">Delete</button>
                    </div>
                </li>`;
        });
        html += '</ul>';
    }

    mainContent.innerHTML = html;
};

// --- MAIN RENDER FUNCTION ---
const render = () => {
    renderSidebar();
    renderBreadcrumb();
    renderMainContent();
};

document.getElementById("app").addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const id = Number(target.dataset.id);
    const { project, task, commit, file } = findItem(id);

    handleAction(action, { target, id, project, task, commit, file });
});

// Handle menu-triggered add project
document.addEventListener('menu-add-project', () => {
    handleAction('add-project-btn', {});
});



document.getElementById("app").addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const id = Number(target.dataset.id);
    const { project, task, commit, file } = findItem(id);

    handleAction(action, { target, id, project, task, commit, file });
});

// Handle menu-triggered add project
document.addEventListener('menu-add-project', () => {
    handleAction('add-project-btn', {});
});

// --- ACTION HANDLER ---
const handleAction = (action, { target, id, project, task, commit, file }) => {
    switch (action) {
        case "select-project": {
            selectProject(id);
            break;
        }
        case "select-task": {
            selectTask(id);
            break;
        }
        case "select-commit": {
            selectCommit(id);
            break;
        }
        case "select-file": {
            selectFile(id);
            break;
        }
        case "add-project-btn": {
            modal.show(
                "Add New Project",
                `<div>
                    <label class="modal-label" for="project-name">Project Name</label>
                    <input type="text" id="project-name" class="modal-input" placeholder="Enter project name">
                </div>`,
                () => {
                    const name = document.getElementById('project-name').value.trim();
                    if (name) {
                        const newProject = {
                            id: Date.now(),
                            name,
                            tasks: [],
                        };
                        appData.push(newProject);
                        selectProject(newProject.id);
                        return true;
                    }
                    return false;
                }
            );
            break;
        }
        case "add-task": {
            const projectId = Number(target.dataset.projectId);
            modal.show(
                "Add New Task",
                `<div>
                    <label class="modal-label" for="task-name">Task Name</label>
                    <input type="text" id="task-name" class="modal-input" placeholder="Enter task name">
                </div>`,
                () => {
                    const name = document.getElementById('task-name').value.trim();
                    if (name) {
                        const { project } = findItem(projectId);
                        const newTask = {
                            id: Date.now(),
                            name,
                            status: "To Do",
                            commits: [],
                        };
                        project.tasks.push(newTask);
                        selectTask(newTask.id);
                        return true;
                    }
                    return false;
                }
            );
            break;
        }
        case "add-commit": {
            const taskId = Number(target.dataset.taskId);
            modal.show(
                "Add New Commit",
                `<div>
                    <label class="modal-label" for="commit-name">Commit Name/Description</label>
                    <input type="text" id="commit-name" class="modal-input" placeholder="Enter commit description" value="Commit">
                </div>`,
                () => {
                    const name = document.getElementById('commit-name').value.trim();
                    if (name) {
                        const { task } = findItem(taskId);
                        const newCommit = { id: Date.now(), name, files: [] };
                        task.commits.push(newCommit);
                        selectCommit(newCommit.id);
                        return true;
                    }
                    return false;
                }
            );
            break;
        }
        case "add-file": {
            const commitId = Number(target.dataset.commitId);
            modal.show(
                "Add New File",
                `<div>
                    <label class="modal-label" for="file-name">File Name</label>
                    <input type="text" id="file-name" class="modal-input" placeholder="Enter file name">
                </div>
                <div>
                    <label class="modal-label" for="file-description">Description (Optional)</label>
                    <textarea id="file-description" class="modal-input" rows="3" placeholder="Enter file description"></textarea>
                </div>`,
                () => {
                    const fileName = document.getElementById('file-name').value.trim();
                    if (fileName) {
                        const description = document.getElementById('file-description').value.trim();
                        const { commit } = findItem(commitId);
                        commit.files.push({
                            id: Date.now(),
                            name: fileName,
                            description,
                        });
                        render();
                        return true;
                    }
                    return false;
                }
            );
            break;
        }
        case "edit-project": {
            modal.show(
                "Edit Project",
                `<div>
                    <label class="modal-label" for="edit-project-name">Project Name</label>
                    <input type="text" id="edit-project-name" class="modal-input" value="${project.name}">
                </div>`,
                () => {
                    const newName = document.getElementById('edit-project-name').value.trim();
                    if (newName) {
                        project.name = newName;
                        render();
                        return true;
                    }
                    return false;
                }
            );
            break;
        }
        case "delete-project": {
            modal.show(
                "Delete Project",
                `<div class="text-center">
                    <p class="text-gray-700">Are you sure you want to delete the project "<strong>${project.name}</strong>"?</p>
                    <p class="text-sm text-red-600 mt-2">This action cannot be undone.</p>
                </div>`,
                () => {
                    appData = appData.filter((p) => p.id !== id);
                    navigationState.selectedProject = null;
                    navigationState.selectedTask = null;
                    navigationState.selectedCommit = null;
                    navigationState.selectedFile = null;
                    render();
                    return true;
                }
            );
            break;
        }
        case "delete-task": {
            modal.show(
                "Delete Task",
                `<div class="text-center">
                    <p class="text-gray-700">Are you sure you want to delete the task "<strong>${task.name}</strong>"?</p>
                    <p class="text-sm text-red-600 mt-2">This action cannot be undone.</p>
                </div>`,
                () => {
                    project.tasks = project.tasks.filter((t) => t.id !== id);
                    if (navigationState.selectedTask === id) {
                        navigationState.selectedTask = null;
                        navigationState.selectedCommit = null;
                        navigationState.selectedFile = null;
                    }
                    render();
                    return true;
                }
            );
            break;
        }
        case "delete-commit": {
            modal.show(
                "Delete Commit",
                `<div class="text-center">
                    <p class="text-gray-700">Are you sure you want to delete the commit "<strong>${commit.name}</strong>"?</p>
                    <p class="text-sm text-red-600 mt-2">This action cannot be undone.</p>
                </div>`,
                () => {
                    task.commits = task.commits.filter((c) => c.id !== id);
                    if (navigationState.selectedCommit === id) {
                        navigationState.selectedCommit = null;
                        navigationState.selectedFile = null;
                    }
                    render();
                    return true;
                }
            );
            break;
        }
        case "delete-file": {
            modal.show(
                "Delete File",
                `<div class="text-center">
                    <p class="text-gray-700">Are you sure you want to delete the file "<strong>${file.name}</strong>"?</p>
                    <p class="text-sm text-red-600 mt-2">This action cannot be undone.</p>
                </div>`,
                () => {
                    commit.files = commit.files.filter((f) => f.id !== id);
                    render();
                    return true;
                }
            );
            break;
        }
        case "edit-task": {
            modal.show(
                "Edit Task",
                `<div>
                    <label class="modal-label" for="edit-task-name">Task Name</label>
                    <input type="text" id="edit-task-name" class="modal-input" value="${task.name}">
                </div>
                <div>
                    <label class="modal-label" for="edit-task-status">Status</label>
                    <select id="edit-task-status" class="modal-select">
                        <option value="To Do" ${task.status === "To Do" ? "selected" : ""}>To Do</option>
                        <option value="In Progress" ${task.status === "In Progress" ? "selected" : ""}>In Progress</option>
                        <option value="Done" ${task.status === "Done" ? "selected" : ""}>Done</option>
                    </select>
                </div>`,
                () => {
                    const newName = document.getElementById('edit-task-name').value.trim();
                    const newStatus = document.getElementById('edit-task-status').value;
                    if (newName) {
                        task.name = newName;
                        task.status = newStatus;
                        render();
                        return true;
                    }
                    return false;
                }
            );
            break;
        }
        case "edit-commit": {
            modal.show(
                "Edit Commit",
                `<div>
                    <label class="modal-label" for="edit-commit-name">Commit Name/Description</label>
                    <input type="text" id="edit-commit-name" class="modal-input" value="${commit.name}">
                </div>`,
                () => {
                    const newName = document.getElementById('edit-commit-name').value.trim();
                    if (newName) {
                        commit.name = newName;
                        render();
                        return true;
                    }
                    return false;
                }
            );
            break;
        }
        case "edit-file": {
            modal.show(
                "Edit File",
                `<div>
                    <label class="modal-label" for="edit-file-name">File Name</label>
                    <input type="text" id="edit-file-name" class="modal-input" value="${file.name}">
                </div>
                <div>
                    <label class="modal-label" for="edit-file-description">Description</label>
                    <textarea id="edit-file-description" class="modal-input" rows="3">${file.description || ""}</textarea>
                </div>`,
                () => {
                    const newName = document.getElementById('edit-file-name').value.trim();
                    const newDesc = document.getElementById('edit-file-description').value.trim();
                    if (newName) {
                        file.name = newName;
                        file.description = newDesc;
                        render();
                        return true;
                    }
                    return false;
                }
            );
            break;
        }
    }
};

// Initial render on page load
document.addEventListener("DOMContentLoaded", async () => {
    showVersionInfo();
    setupMenuHandlers();
    await loadDataFromFile();
    render();
});