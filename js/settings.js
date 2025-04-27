/**
 * settings.js - Settings Section Logic (Export/Import)
 */

var app = app || {};
app.settings = {};

// --- Export Functionality ---
app.settings.exportData = function() {
    console.log("Exporting data...");
    chrome.storage.local.get(['tabGroups', 'folders', 'bookmarks', 'todos'], (data) => {
        if (chrome.runtime.lastError) {
            console.error("Error retrieving data for export:", chrome.runtime.lastError);
            app.utils.showCustomAlert("Error retrieving data for export.");
            return;
        }

        // Basic check if there's anything to export
        const hasData = Object.keys(data.tabGroups || {}).length > 0 ||
                        Object.keys(data.folders || {}).length > 0 ||
                        (data.bookmarks || []).length > 0 ||
                        (data.todos || []).length > 0;

        if (!hasData) {
            app.utils.showCustomAlert("No data found to export.");
            return;
        }

        try {
            const dataString = JSON.stringify(data, null, 2); // Pretty print JSON
            const blob = new Blob([dataString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            const filename = `organitab-backup-${timestamp}.json`;

            // Use the chrome.downloads API for a better user experience
            chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: true // Prompt user for save location
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error("Download initiation failed:", chrome.runtime.lastError);
                    // Fallback or alternative method might be needed if downloads API fails
                    // For simplicity, we'll just alert the user here.
                    app.utils.showCustomAlert("Failed to initiate download. Please ensure the extension has download permissions.");
                } else {
                    console.log("Download started with ID:", downloadId);
                    // Clean up the object URL after a short delay to ensure download starts
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                }
            });

        } catch (error) {
            console.error("Error creating export file:", error);
            app.utils.showCustomAlert("Error creating export file.");
        }
    });
};


// --- Import Functionality ---
app.settings.triggerImport = function() {
    // Programmatically click the hidden file input
    app.elements.importFile.click();
};

app.settings.importData = function(event) {
    console.log("Import file selected...");
    const file = event.target.files[0];
    if (!file) {
        console.log("No file selected for import.");
        return;
    }

    if (file.type !== 'application/json') {
        app.utils.showCustomAlert("Import failed: Please select a valid JSON file (.json).");
        // Reset file input value to allow selecting the same file again if needed
        event.target.value = null;
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);

            // **VERY IMPORTANT: Add validation here!**
            // Check if the imported data has the expected structure.
            // e.g., check for keys like 'tabGroups', 'folders', 'bookmarks', 'todos'
            // and potentially the format of items within them.
            if (typeof importedData !== 'object' || importedData === null) {
                 throw new Error("Invalid JSON structure: Not an object.");
            }
            // Basic structure check (can be more thorough)
            const expectedKeys = ['tabGroups', 'folders', 'bookmarks', 'todos'];
            const actualKeys = Object.keys(importedData);
            // Allow for missing keys (e.g., if user only had groups) but not unexpected ones.
            // A more robust check might validate the *type* of each key's value (object, array).


            console.log("Parsed imported data:", importedData);

            // Ask user for confirmation before overwriting
            app.utils.showCustomConfirm(
                "Importing this file will OVERWRITE all your current saved groups, folders, bookmarks, and todos. Are you sure you want to proceed?",
                () => {
                    console.log("User confirmed import. Overwriting data...");
                    // Prepare data for storage (ensure defaults if keys are missing in import)
                    const dataToStore = {
                        tabGroups: importedData.tabGroups || {},
                        folders: importedData.folders || {},
                        bookmarks: importedData.bookmarks || [],
                        todos: importedData.todos || []
                    };

                    chrome.storage.local.set(dataToStore, () => {
                        if (chrome.runtime.lastError) {
                            console.error("Error saving imported data:", chrome.runtime.lastError);
                            app.utils.showCustomAlert("Import failed: Could not save the imported data.");
                        } else {
                            console.log("Data imported successfully.");
                            app.utils.showCustomAlert("Data imported successfully! Reloading extension data...");
                            // Refresh counts and current view
                            app.utils.updateSavedItemsCount();
                            // Reload content of the currently active section
                            if (app.state.activeSection && app.loadSectionContent) {
                                app.loadSectionContent(app.state.activeSection);
                            } else if (app.groups && app.groups.loadSavedGroups) {
                                // Fallback to reloading groups if current section logic fails
                                app.groups.loadSavedGroups();
                            }
                        }
                        // Reset file input value regardless of success/failure
                        event.target.value = null;
                    });
                },
                () => {
                     // User cancelled
                     console.log("User cancelled import.");
                     event.target.value = null; // Reset file input
                }
            );

        } catch (error) {
            console.error("Error parsing or validating import file:", error);
            app.utils.showCustomAlert(`Import failed: ${error.message}. Please ensure the file is valid JSON and has the correct format.`);
            event.target.value = null; // Reset file input
        }
    };

    reader.onerror = function(e) {
        console.error("Error reading import file:", e);
        app.utils.showCustomAlert("Import failed: Could not read the selected file.");
        event.target.value = null; // Reset file input
    };

    reader.readAsText(file); // Read the file content as text
};


// --- Event Listener Setup ---
app.settings.setupEventListeners = function() {
    if (app.elements.exportDataBtn) {
        app.elements.exportDataBtn.addEventListener('click', app.settings.exportData);
    } else {
        console.error("Export button not found for listener setup.");
    }

    if (app.elements.importDataBtn) {
        // This button triggers the hidden file input
        app.elements.importDataBtn.addEventListener('click', app.settings.triggerImport);
    } else {
        console.error("Import button not found for listener setup.");
    }

    if (app.elements.importFile) {
        // This hidden input handles the actual file selection change
        app.elements.importFile.addEventListener('change', app.settings.importData);
    } else {
        console.error("Import file input not found for listener setup.");
    }
};

console.log("settings.js loaded");
