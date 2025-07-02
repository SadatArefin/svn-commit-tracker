// --- DATA STORAGE ---
let appData = [];
let saveTimeout = null;

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
            return "bg-green-100 text-green-800";
        case "In Progress":
            return "bg-yellow-100 text-yellow-800";
        case "To Do":
        default:
            return "bg-blue-100 text-blue-800";
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

const render = () => {
    const container = document.getElementById("projects-container");
    container.innerHTML = "";

    if (appData.length === 0) {
        container.innerHTML = `<div class="text-center p-8 bg-white rounded-lg shadow-md">
                <h2 class="text-2xl font-semibold text-gray-700">No Projects Found</h2>
                <p class="text-gray-500 mt-2">Click "Add New Project" below to get started or load data from a JSON file.</p>
            </div>`;
    }

    appData.forEach((project) => {
        const projectEl = document.createElement("div");
        projectEl.className = `bg-white rounded-lg shadow-md overflow-hidden ${project.isCollapsed ? "collapsed" : ""
            }`;
        projectEl.innerHTML = `
                <header class="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200 cursor-pointer" data-action="toggle-collapse" data-id="${project.id
            }">
                    <div class="flex items-center">
                        <svg class="w-6 h-6 text-gray-500 mr-3 icon-rotate" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        <h2 class="text-2xl font-bold text-gray-800">${project.name
            }</h2>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="text-sm bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600" data-action="add-task" data-project-id="${project.id
            }">+ Add Task</button>
                        <button class="text-sm bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600" data-action="delete-project" data-id="${project.id
            }">Delete</button>
                    </div>
                </header>
                <div class="collapsible-content">
                    <div class="p-4 space-y-4">
                        ${project.tasks
                .map(
                    (task) => `
                            <div class="bg-gray-50 rounded-lg border border-gray-200 ${task.isCollapsed ? "collapsed" : ""
                        }">
                                <header class="flex justify-between items-center p-3 bg-white border-b border-gray-200 cursor-pointer" data-action="toggle-collapse" data-id="${task.id
                        }">
                                    <div class="flex items-center">
                                        <svg class="w-5 h-5 text-gray-500 mr-2 icon-rotate" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                        <h3 class="text-lg font-semibold text-gray-700">${task.name
                        }</h3>
                                        <span class="text-xs font-medium ml-3 px-2 py-0.5 rounded-full ${getStatusClass(
                            task.status
                        )}">${task.status}</span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <button class="text-xs bg-gray-200 text-gray-700 py-1 px-2 rounded hover:bg-gray-300" data-action="edit-task" data-id="${task.id
                        }">Edit</button>
                                        <button class="text-xs bg-red-500 text-white py-1 px-2 rounded hover:bg-red-600" data-action="delete-task" data-id="${task.id
                        }">Delete</button>
                                    </div>
                                </header>
                                <div class="collapsible-content">
                                    <div class="p-4">
                                        <button class="w-full text-sm text-center border-2 border-dashed border-gray-300 text-gray-500 rounded-md py-2 hover:bg-gray-100 hover:border-gray-400 mb-3" data-action="add-commit" data-task-id="${task.id
                        }">+ Add Commit</button>
                                        <div class="space-y-3">
                                            ${task.commits
                            .map(
                                (commit) => `
                                                <div class="border border-gray-200 rounded-md p-3">
                                                    <div class="flex justify-between items-center mb-2">
                                                        <h4 class="font-semibold text-gray-600">${commit.name
                                    }</h4>
                                                        <div>
                                                           <button class="text-xs bg-gray-200 text-gray-700 py-1 px-2 rounded hover:bg-gray-300" data-action="edit-commit" data-id="${commit.id
                                    }">Edit</button>
                                                           <button class="text-xs bg-red-500 text-white py-1 px-2 rounded hover:bg-red-600" data-action="delete-commit" data-id="${commit.id
                                    }">Del</button>
                                                        </div>
                                                    </div>
                                                    <ul class="list-disc list-inside space-y-1 pl-2 text-gray-800">
                                                        ${commit.files
                                        .map(
                                            (file) => `
                                                            <li class="group">
                                                                <span class="font-mono text-sm bg-gray-100 px-1 rounded">${file.name
                                                }</span>
                                                                ${file.description
                                                    ? `<span class="text-sm text-gray-500 italic ml-2">- ${file.description}</span>`
                                                    : ""
                                                }
                                                                <button class="text-xs opacity-0 group-hover:opacity-100 text-blue-500 hover:underline ml-2" data-action="edit-file" data-id="${file.id
                                                }">edit</button>
                                                                <button class="text-xs opacity-0 group-hover:opacity-100 text-red-500 hover:underline ml-1" data-action="delete-file" data-id="${file.id
                                                }">del</button>
                                                            </li>
                                                        `
                                        )
                                        .join("")}
                                                    </ul>
                                                    <button class="text-xs w-full text-left mt-2 text-blue-600 hover:underline" data-action="add-file" data-commit-id="${commit.id
                                    }">+ Add file</button>
                                                </div>
                                            `
                            )
                            .join("")}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `
                )
                .join("")}
                    </div>
                </div>
            `;
        container.appendChild(projectEl);
    });
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

// --- ACTION HANDLER ---
const handleAction = (action, { target, id, project, task, commit, file }) => {
    switch (action) {
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
                        appData.push({
                            id: Date.now(),
                            name,
                            isCollapsed: false,
                            tasks: [],
                        });
                        render();
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
                        project.tasks.push({
                            id: Date.now(),
                            name,
                            status: "To Do",
                            isCollapsed: false,
                            commits: [],
                        });
                        render();
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
                        task.commits.push({ id: Date.now(), name, files: [] });
                        render();
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
        case "delete-project": {
            modal.show(
                "Delete Project",
                `<div class="text-center">
                    <p class="text-gray-700">Are you sure you want to delete the project "<strong>${project.name}</strong>"?</p>
                    <p class="text-sm text-red-600 mt-2">This action cannot be undone.</p>
                </div>`,
                () => {
                    appData = appData.filter((p) => p.id !== id);
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
        case "toggle-collapse": {
            const item = findItem(id).project || findItem(id).task;
            if (item) {
                item.isCollapsed = !item.isCollapsed;
                render();
                autoSave();
            }
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