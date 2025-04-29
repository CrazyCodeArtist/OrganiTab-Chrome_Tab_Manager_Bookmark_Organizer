/**
 * settings.js - Settings Section Logic (Export/Import, Shortcuts, Clear Data)
 */

var app = app || {};
app.settings = {};

// --- Data Management ---

app.settings.exportData = function() {
    console.log("Exporting data...");
    chrome.storage.local.get(['tabGroups', 'folders', 'bookmarks', 'todos'], (data) => {
        if (chrome.runtime.lastError) {
            console.error("Error retrieving data for export:", chrome.runtime.lastError);
            app.utils.showCustomAlert("Error retrieving data for export.");
            return;
        }

        const hasData = Object.keys(data.tabGroups || {}).length > 0 ||
                        Object.keys(data.folders || {}).length > 0 ||
                        (data.bookmarks || []).length > 0 ||
                        (data.todos || []).length > 0;

        if (!hasData) {
            app.utils.showCustomAlert("No data found to export.");
            return;
        }

        try {
            const dataString = JSON.stringify(data, null, 2);
            const blob = new Blob([dataString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            const filename = `organitab-backup-${timestamp}.json`;

            chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: true
            }, (downloadId) => {
                // Clean up the object URL after a short delay
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                if (chrome.runtime.lastError) {
                    console.error("Download initiation failed:", chrome.runtime.lastError);
                    app.utils.showCustomAlert("Failed to initiate download. Check browser permissions.");
                } else {
                    console.log("Download started with ID:", downloadId);
                }
            });

        } catch (error) {
            console.error("Error creating export file:", error);
            app.utils.showCustomAlert("Error creating export file.");
        }
    });
};

app.settings.triggerImport = function() {
    app.elements.importFile.click();
};

app.settings.importData = function(event) {
    console.log("Import file selected...");
    const file = event.target.files[0];
    const fileInput = event.target; // Keep reference to reset later

    if (!file) {
        console.log("No file selected for import.");
        return;
    }
    if (file.type !== 'application/json') {
        app.utils.showCustomAlert("Import failed: Please select a valid JSON file (.json).");
        fileInput.value = null; // Reset input
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);

            // Basic Validation (can be more robust)
            if (typeof importedData !== 'object' || importedData === null) {
                 throw new Error("Invalid JSON structure: Not an object.");
            }
            // Check for presence of at least one known key
            const knownKeys = ['tabGroups', 'folders', 'bookmarks', 'todos'];
            const hasKnownKey = knownKeys.some(key => key in importedData);
            if (!hasKnownKey) {
                 throw new Error("JSON does not contain recognizable OrganiTab data (missing keys like 'tabGroups', 'bookmarks', etc.).");
            }

            console.log("Parsed imported data:", importedData);

            // --- Ask User: Merge or Overwrite? ---
            app.utils.showCustomChoiceDialog(
                "Choose how to import the data:",
                "Merge with Existing Data", // Choice 1 Text
                () => { // onChoice1 (Merge)
                    app.settings.mergeData(importedData, fileInput);
                },
                "Clear & load import", // Choice 2 Text
                () => { // onChoice2 (Overwrite)
                    app.settings.overwriteData(importedData, fileInput);
                },
                "Cancel", // Cancel Text
                () => { // onCancel
                    console.log("User cancelled import.");
                    fileInput.value = null; // Reset input on cancel
                }
            );

        } catch (error) {
            console.error("Error parsing or validating import file:", error);
            app.utils.showCustomAlert(`Import failed: ${error.message}.`);
            fileInput.value = null;
        }
    };

    reader.onerror = function(e) {
        console.error("Error reading import file:", e);
        app.utils.showCustomAlert("Import failed: Could not read the selected file.");
        fileInput.value = null;
    };

    reader.readAsText(file);
};

// Helper function for Overwrite logic
app.settings.overwriteData = function(importedData, fileInput) {
     // Prepare data for storage (ensure defaults if keys are missing in import)
    const dataToStore = {
        tabGroups: importedData.tabGroups || {},
        folders: importedData.folders || {},
        bookmarks: importedData.bookmarks || [],
        todos: importedData.todos || []
    };
    chrome.storage.local.set(dataToStore, () => {
        fileInput.value = null; // Reset input
        if (chrome.runtime.lastError) {
            console.error("Error overwriting data:", chrome.runtime.lastError);
            app.utils.showCustomAlert("Import (Overwrite) failed: Could not save the data.");
        } else {
            console.log("Data overwritten successfully.");
            app.utils.showCustomAlert("Data overwritten successfully! Reloading...");
            app.settings.refreshUI(); // Refresh counts and view
        }
    });
};

// Helper function for Merge logic
app.settings.mergeData = function(importedData, fileInput) {
    chrome.storage.local.get(['tabGroups', 'folders', 'bookmarks', 'todos'], (existingData) => {
         if (chrome.runtime.lastError) {
            console.error("Error retrieving existing data for merge:", chrome.runtime.lastError);
            app.utils.showCustomAlert("Merge failed: Could not retrieve existing data.");
            fileInput.value = null;
            return;
        }

        const mergedData = {
            tabGroups: existingData.tabGroups || {},
            folders: existingData.folders || {},
            bookmarks: existingData.bookmarks || [],
            todos: existingData.todos || []
        };

        // Merge Tab Groups (rename conflicts)
        if (importedData.tabGroups) {
            Object.entries(importedData.tabGroups).forEach(([name, group]) => {
                let newName = name;
                let counter = 1;
                while (mergedData.tabGroups[newName]) {
                    newName = `${name} (Imported ${counter++})`;
                }
                 if (newName !== name) console.log(`Merge conflict: Renaming imported group "${name}" to "${newName}"`);
                mergedData.tabGroups[newName] = group;
            });
        }

        // Merge Folders (rename conflicts)
         if (importedData.folders) {
            Object.entries(importedData.folders).forEach(([name, folder]) => {
                let newName = name;
                let counter = 1;
                while (mergedData.folders[newName]) {
                    newName = `${name} (Imported ${counter++})`;
                }
                 if (newName !== name) console.log(`Merge conflict: Renaming imported folder "${name}" to "${newName}"`);
                // Also need to check for group name conflicts *within* the merged folder
                const mergedFolderGroups = {};
                if (folder.groups) {
                     Object.entries(folder.groups).forEach(([groupName, groupData]) => {
                         let newGroupName = groupName;
                         let groupCounter = 1;
                         // Check against ALL existing groups (standalone and in other folders) for potential future conflicts if moved
                         while (mergedData.tabGroups[newGroupName] || Object.values(mergedData.folders).some(f => f.groups && f.groups[newGroupName])) {
                            newGroupName = `${groupName} (Imported ${groupCounter++})`;
                         }
                         if (newGroupName !== groupName) console.log(`Merge conflict: Renaming group "${groupName}" inside folder "${newName}" to "${newGroupName}"`);
                         mergedFolderGroups[newGroupName] = groupData;
                     });
                }
                mergedData.folders[newName] = { ...folder, groups: mergedFolderGroups };
            });
        }

        // Merge Bookmarks (add only if URL doesn't exist)
        if (importedData.bookmarks) {
            const existingUrls = new Set(mergedData.bookmarks.map(b => b.url));
            importedData.bookmarks.forEach(bookmark => {
                if (!existingUrls.has(bookmark.url)) {
                    mergedData.bookmarks.push(bookmark);
                } else {
                    console.log(`Merge skipped: Bookmark for "${bookmark.url}" already exists.`);
                }
            });
        }

        // Merge Todos (add only if text doesn't exist - simple check)
        if (importedData.todos) {
            const existingTexts = new Set(mergedData.todos.map(t => t.text));
            importedData.todos.forEach(todo => {
                if (!existingTexts.has(todo.text)) {
                    mergedData.todos.push(todo);
                } else {
                     console.log(`Merge skipped: Todo with text "${todo.text}" already exists.`);
                }
            });
        }

        // Save the merged data
        chrome.storage.local.set(mergedData, () => {
            fileInput.value = null; // Reset input
            if (chrome.runtime.lastError) {
                console.error("Error saving merged data:", chrome.runtime.lastError);
                app.utils.showCustomAlert("Import (Merge) failed: Could not save the merged data.");
            } else {
                console.log("Data merged successfully.");
                app.utils.showCustomAlert("Data merged successfully! Reloading...");
                app.settings.refreshUI(); // Refresh counts and view
            }
        });
    });
};

// --- Clear All Data ---
app.settings.clearAllData = function() {
    app.utils.showCustomConfirm(
        "⚠️ Danger Zone ⚠️\n\nAre you absolutely sure you want to clear ALL saved groups, folders, bookmarks, and todos?\n\nThis action cannot be undone!",
        () => { // onConfirm
            console.log("User confirmed clearing all data.");
            // Option 1: Clear specific keys (safer if other storage keys might exist)
            chrome.storage.local.remove(['tabGroups', 'folders', 'bookmarks', 'todos'], () => {
            // Option 2: Clear everything for this extension (simpler)
            // chrome.storage.local.clear(() => {
                if (chrome.runtime.lastError) {
                    console.error("Error clearing data:", chrome.runtime.lastError);
                    app.utils.showCustomAlert("Failed to clear data. Please try again.");
                } else {
                    console.log("All OrganiTab data cleared.");
                    app.utils.showCustomAlert("All data cleared successfully!");
                    app.settings.refreshUI(); // Refresh counts and view
                }
            });
        },
        () => { // onCancel
            console.log("User cancelled clearing data.");
        },
        "Yes, Clear Everything", // Confirm button text
        "Cancel" // Cancel button text
    );
};

// --- Shortcut Info ---
app.settings.displayShortcuts = function() {
    const container = app.elements.shortcutsList;
    if (!container) return;

    container.innerHTML = ''; // Clear previous content

    chrome.commands.getAll((commands) => {
        if (chrome.runtime.lastError) {
            console.error("Error getting commands:", chrome.runtime.lastError);
            container.innerHTML = '<p class="error-message">Could not load shortcut information.</p>';
            return;
        }

        if (!commands || commands.length === 0) {
             container.innerHTML = '<p>No commands defined for this extension.</p>';
             return;
        }

        const ul = document.createElement('ul');
        ul.className = 'shortcuts-list-items';

        commands.forEach(command => {
            if (command.name === "_execute_action") return; // Skip the default action command display if desired

            const li = document.createElement('li');
            li.className = 'shortcut-item';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'shortcut-name';
            nameSpan.textContent = command.description || command.name; // Use description if available

            const keySpan = document.createElement('span');
            keySpan.className = 'shortcut-key';
            
            keySpan.textContent = command.shortcut  || '  Not set'; // Display shortcut or "Not set"

            li.appendChild(nameSpan);
            li.appendChild(keySpan);
            ul.appendChild(li);
        });

        container.appendChild(ul);
    });
};


// --- UI Refresh Helper ---
app.settings.refreshUI = function() {
    // Refresh counts
    if (app.utils && app.utils.updateSavedItemsCount) {
        app.utils.updateSavedItemsCount();
    }
    // Reload content of the currently active section
    if (app.state && app.state.activeSection && typeof app.loadSectionContent === 'function') {
         // Check if the function for the active section exists before calling load
         let loadFunctionExists = false;
         switch (app.state.activeSection) {
             case 'groups': loadFunctionExists = !!(app.groups && app.groups.loadSavedGroups); break;
             case 'bookmarks': loadFunctionExists = !!(app.bookmarks && app.bookmarks.loadBookmarks); break;
             case 'todo': loadFunctionExists = !!(app.todo && app.todo.renderTodos); break;
             case 'settings': loadFunctionExists = true; break; // Settings might need refresh too (e.g., shortcuts)
         }
         if(loadFunctionExists) {
            app.loadSectionContent(app.state.activeSection);
         } else {
             console.warn(`Load function for active section "${app.state.activeSection}" not found during refresh.`);
             // Fallback: try reloading groups if possible
             if (app.groups && app.groups.loadSavedGroups) app.groups.loadSavedGroups();
         }

    } else {
        console.warn("Could not determine active section or load function during refresh.");
        // Fallback: try reloading groups if possible
        if (app.groups && app.groups.loadSavedGroups) app.groups.loadSavedGroups();
    }

     // Specifically refresh shortcut display if settings tab is active
     if (app.state.activeSection === 'settings') {
         app.settings.displayShortcuts();
     }
}


// --- Event Listener Setup ---
app.settings.setupEventListeners = function() {
    // Data Management
    if (app.elements.exportDataBtn) {
        app.elements.exportDataBtn.addEventListener('click', app.settings.exportData);
    }
    if (app.elements.importDataBtn) {
        app.elements.importDataBtn.addEventListener('click', app.settings.triggerImport);
    }
    if (app.elements.importFile) {
        app.elements.importFile.addEventListener('change', app.settings.importData);
    }
    // Clear Data
    if (app.elements.clearAllDataBtn) {
        app.elements.clearAllDataBtn.addEventListener('click', app.settings.clearAllData);
    }

    // Shortcuts
    if (app.elements.configureShortcutsBtn) {
        app.elements.configureShortcutsBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
        });
    }

    // Initial display of shortcuts when settings tab is loaded/activated
    // This might also need to be called from main.js when switching to the settings tab
    app.settings.displayShortcuts();
};

console.log("settings.js loaded");
