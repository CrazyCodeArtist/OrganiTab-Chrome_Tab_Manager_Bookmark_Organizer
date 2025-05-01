/**
 * settings.js - Settings Section Logic (Export/Import, Shortcuts, Clear Data)
 */

var app = app || {};
app.settings = {};

// --- Export Data ---
app.settings.exportData = function () {
  chrome.storage.local.get(
    ["tabGroups", "folders", "bookmarks", "todos"],
    (data) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error retrieving data for export:",
          chrome.runtime.lastError
        );
        app.utils.showCustomAlert("Error retrieving data for export.");
        return;
      }

      // Check if there's any actual data to export
      const hasData =
        Object.keys(data.tabGroups || {}).length > 0 ||
        Object.keys(data.folders || {}).length > 0 ||
        (data.bookmarks || []).length > 0 ||
        (data.todos || []).length > 0;

      if (!hasData) {
        app.utils.showCustomAlert("No data found to export.");
        return;
      }

      try {
        // Stringify the data with pretty printing
        const dataString = JSON.stringify(data, null, 2);
        // Create a Blob object
        const blob = new Blob([dataString], { type: "application/json" });
        // Create an object URL for the Blob
        const url = URL.createObjectURL(blob);
        // Generate a timestamp for the filename
        const timestamp = new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/[:T]/g, "-");
        // Create the filename
        const filename = `organitab-backup-${timestamp}.json`;

        // Create a temporary link element to trigger the download
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = filename; // Set the download filename

        // Append to body, click, and remove
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // Revoke the object URL after a short delay to ensure download starts
        setTimeout(() => {
          URL.revokeObjectURL(url);
          console.log("Object URL revoked for:", filename);
        }, 500);

      } catch (error) {
        console.error("Error creating export file:", error);
        app.utils.showCustomAlert("Error creating export file.");
        // Clean up URL if it was created before the error
        if (url) {
           URL.revokeObjectURL(url);
        }
      }
    }
  );
};

// --- Import Data ---

// Function to trigger the hidden file input click
app.settings.triggerImport = function () {
  // Reset the file input value before clicking to allow re-importing the same file
  if (app.elements.importFile) {
      app.elements.importFile.value = null;
  }
  app.elements.importFile.click();
};

// Function to handle the file selection and initiate import process
app.settings.importData = function (event) {
  const file = event.target.files[0];
  const fileInput = event.target; // Keep reference to the input element

  if (!file) {
    // No file selected
    return;
  }
  if (file.type !== "application/json") {
    app.utils.showCustomAlert(
      "Import failed: Please select a valid JSON file (.json)."
    );
    fileInput.value = null; // Reset input
    return;
  }

  const reader = new FileReader();

  // Handle successful file read
  reader.onload = function (e) {
    try {
      const importedData = JSON.parse(e.target.result);

      // Basic Validation
      if (typeof importedData !== "object" || importedData === null) {
        throw new Error("Invalid JSON structure: Not an object.");
      }
      // Check for presence of at least one known key
      const knownKeys = ["tabGroups", "folders", "bookmarks", "todos"];
      const hasKnownKey = knownKeys.some((key) => key in importedData);
      if (!hasKnownKey) {
        throw new Error(
          "JSON does not contain recognizable OrganiTab data (missing keys like 'tabGroups', 'bookmarks', etc.)."
        );
      }

      // Ask User: Merge or Overwrite?
      app.utils.showCustomChoiceDialog(
        "Choose how to import the data:",
        "Merge with Existing Data", // Choice 1 Text
        () => {
          // onChoice1 (Merge)
          app.settings.mergeData(importedData, fileInput);
        },
        "Clear & load import", // Choice 2 Text (Overwrite)
        () => {
          // onChoice2 (Overwrite)
          app.settings.overwriteData(importedData, fileInput);
        },
        "Cancel", // Cancel Text
        () => {
          // onCancel
          fileInput.value = null; // Reset input on cancel
        }
      );
    } catch (error) {
      console.error("Error parsing or validating import file:", error);
      app.utils.showCustomAlert(`Import failed: ${error.message}.`);
      fileInput.value = null; // Reset input on error
    }
  };

  // Handle file read error
  reader.onerror = function (e) {
    console.error("Error reading import file:", e);
    app.utils.showCustomAlert(
      "Import failed: Could not read the selected file."
    );
    fileInput.value = null; // Reset input on error
  };

  // Read the file as text
  reader.readAsText(file);
};

// Helper function for Overwrite logic
app.settings.overwriteData = function (importedData, fileInput) {
  // Prepare data for storage, ensuring defaults if keys are missing in import
  const dataToStore = {
    tabGroups: importedData.tabGroups || {},
    folders: importedData.folders || {},
    bookmarks: importedData.bookmarks || [],
    todos: importedData.todos || [],
    // Add any other top-level keys you manage here
  };
  chrome.storage.local.set(dataToStore, () => {
    fileInput.value = null; // Reset input after processing
    if (chrome.runtime.lastError) {
      console.error("Error overwriting data:", chrome.runtime.lastError);
      app.utils.showCustomAlert(
        "Import (Overwrite) failed: Could not save the data."
      );
    } else {
      app.utils.showCustomAlert("Data overwritten successfully! Reloading...");
      app.settings.refreshUI(); // Refresh counts and view
    }
  });
};

// *** UPDATED Helper function for Merge logic ***
app.settings.mergeData = function (importedData, fileInput) {
  chrome.storage.local.get(
    ["tabGroups", "folders", "bookmarks", "todos"], // Load all relevant existing data
    (existingData) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error retrieving existing data for merge:",
          chrome.runtime.lastError
        );
        app.utils.showCustomAlert(
          "Merge failed: Could not retrieve existing data."
        );
        fileInput.value = null; // Reset input
        return;
      }

      // Initialize mergedData with existing data or empty defaults
      const mergedData = {
        tabGroups: existingData.tabGroups || {},
        folders: existingData.folders || {},
        bookmarks: existingData.bookmarks || [],
        todos: existingData.todos || [],
      };

      // --- Merge Tab Groups (Standalone) ---
      if (importedData.tabGroups) {
        Object.entries(importedData.tabGroups).forEach(([name, group]) => {
          let newName = name;
          let counter = 1;
          // Check for name conflicts with existing standalone groups
          while (mergedData.tabGroups[newName]) {
            newName = `${name} (Imported ${counter++})`;
          }
          if (newName !== name) {
             console.log(`Merge conflict: Renaming imported standalone group "${name}" to "${newName}"`);
          }
          // *** FIX: Always add the group, renamed or not ***
          mergedData.tabGroups[newName] = group;
        });
      }

      // --- Merge Folders ---
      if (importedData.folders) {
        Object.entries(importedData.folders).forEach(([name, folder]) => {
          let newFolderName = name;
          let folderCounter = 1;
          // Check for name conflicts with existing folders
          while (mergedData.folders[newFolderName]) {
            newFolderName = `${name} (Imported ${folderCounter++})`;
          }
          if (newFolderName !== name) {
            console.log(`Merge conflict: Renaming imported folder "${name}" to "${newFolderName}"`);
          }

          // --- Merge Groups *within* the current folder ---
          const mergedFolderGroups = {}; // Groups for this specific folder being merged
          if (folder.groups) {
            Object.entries(folder.groups).forEach(([groupName, groupData]) => {
              let newGroupName = groupName;
              let groupCounter = 1;
              // Robust conflict check for group names within folders:
              // Check against:
              // 1. Existing standalone groups (mergedData.tabGroups)
              // 2. Groups in *other* existing/merged folders (mergedData.folders)
              // 3. Groups already added to *this* folder during *this* merge loop (mergedFolderGroups)
              while (
                mergedData.tabGroups[newGroupName] || // Check standalone
                Object.values(mergedData.folders).some( // Check other folders
                  (existingFolder) => existingFolder.groups && existingFolder.groups[newGroupName]
                ) ||
                mergedFolderGroups[newGroupName] // Check groups already added to this folder in this loop
              ) {
                newGroupName = `${groupName} (Imported ${groupCounter++})`;
              }

              if (newGroupName !== groupName) {
                 console.log(`Merge conflict: Renaming group "${groupName}" inside folder "${newFolderName}" to "${newGroupName}"`);
              }
              // Add the group (renamed or original) to this folder's group list
              mergedFolderGroups[newGroupName] = groupData;
            });
          }

          // *** FIX: Always add the folder, renamed or not ***
          // Ensure essential folder properties exist
          mergedData.folders[newFolderName] = {
            ...folder, // Keep original imported folder properties (like potentially custom ones)
            dateCreated: folder.dateCreated || Date.now(), // Ensure dateCreated exists
            groups: mergedFolderGroups, // Use the processed groups with resolved name conflicts
          };
        });
      }

      // --- Merge Bookmarks (Add only if URL doesn't exist) ---
      if (importedData.bookmarks) {
        // Create a Set of existing URLs for efficient lookup
        const existingUrls = new Set(mergedData.bookmarks.map((b) => b.url));
        importedData.bookmarks.forEach((bookmark) => {
          // Add only if the URL is not already present
          if (bookmark && bookmark.url && !existingUrls.has(bookmark.url)) {
            mergedData.bookmarks.push(bookmark);
            existingUrls.add(bookmark.url); // Add to set to prevent duplicates from import file itself
          }
        });
      }

      // --- Merge Todos (Add only if text doesn't exist - simple check) ---
      if (importedData.todos) {
        // Create a Set of existing todo texts for efficient lookup
        const existingTexts = new Set(mergedData.todos.map((t) => t.text));
        importedData.todos.forEach((todo) => {
          // Add only if the text is not already present
          if (todo && todo.text && !existingTexts.has(todo.text)) {
            mergedData.todos.push(todo);
            existingTexts.add(todo.text); // Add to set
          }
        });
      }

      // --- Save the final merged data ---
      chrome.storage.local.set(mergedData, () => {
        fileInput.value = null; // Reset input after processing
        if (chrome.runtime.lastError) {
          console.error("Error saving merged data:", chrome.runtime.lastError);
          app.utils.showCustomAlert(
            "Import (Merge) failed: Could not save the merged data."
          );
        } else {
          app.utils.showCustomAlert("Data merged successfully! Reloading...");
          app.settings.refreshUI(); // Refresh counts and view
        }
      });
    }
  );
};

// --- Clear All Data ---
app.settings.clearAllData = function () {
  app.utils.showCustomConfirm(
    "Are you absolutely sure you want to clear ALL saved groups, folders, bookmarks, and todos?\n\nThis action cannot be undone!",
    () => {
      // onConfirm: Clear the specific keys managed by the extension
      chrome.storage.local.remove(
        ["tabGroups", "folders", "bookmarks", "todos", "groupSortOrder", /* add other keys if needed */],
        () => {
          if (chrome.runtime.lastError) {
            console.error("Error clearing data:", chrome.runtime.lastError);
            app.utils.showCustomAlert(
              "Failed to clear data. Please try again."
            );
          } else {
            app.utils.showCustomAlert("All data cleared successfully!");
            // Reset any in-memory state as well
            app.state = { // Reset state to defaults
                currentTabs: [],
                activeSection: 'groups', // Or your default section
                groupSortOrder: 'dateDesc', // Default sort
                expandedFolders: {},
                // Add other state properties and their defaults
            };
            app.settings.refreshUI(); // Refresh counts and view (will show empty state)
          }
        }
      );
    },
    () => {
      // onCancel
      console.log("User cancelled clearing data.");
    },
    "Yes, Clear Everything", // Confirm button text
    "Cancel" // Cancel button text
  );
};

// --- Shortcut Info ---
app.settings.displayShortcuts = function () {
  const container = app.elements.shortcutsList;
  if (!container) return;

  container.innerHTML = ""; // Clear previous content

  chrome.commands.getAll((commands) => {
    if (chrome.runtime.lastError) {
      console.error("Error getting commands:", chrome.runtime.lastError);
      container.innerHTML =
        '<p class="error-message">Could not load shortcut information.</p>';
      return;
    }

    if (!commands || commands.length === 0) {
      container.innerHTML = "<p>No commands defined for this extension.</p>";
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "shortcuts-list-items";

    commands.forEach((command) => {
      // Optionally skip the default browser action command
      if (command.name === "_execute_action") return;

      const li = document.createElement("li");
      li.className = "shortcut-item";

      const nameSpan = document.createElement("span");
      nameSpan.className = "shortcut-name";
      // Use description for a user-friendly name, fallback to command name
      nameSpan.textContent = command.description || command.name;

      const keySpan = document.createElement("span");
      keySpan.className = "shortcut-key";
      // Display the assigned shortcut or indicate if it's not set
      keySpan.textContent = command.shortcut || "Not set";

      li.appendChild(nameSpan);
      li.appendChild(keySpan);
      ul.appendChild(li);
    });

    container.appendChild(ul);

    // Add info text about where to configure shortcuts
     const infoText = document.createElement('p');
     infoText.className = 'shortcut-info-text';
     infoText.innerHTML = 'Configure shortcuts in <a href="chrome://extensions/shortcuts" target="_blank">chrome://extensions/shortcuts</a>.';
     container.appendChild(infoText);

     // Make the link open in a new tab when clicked within the extension popup
     infoText.querySelector('a').addEventListener('click', (e) => {
         e.preventDefault();
         chrome.tabs.create({ url: e.target.href, active: true });
     });
  });
};

// --- UI Refresh Helper ---
// Refreshes counts and reloads the content of the currently active section
app.settings.refreshUI = function () {
  console.log("Refreshing UI, active section:", app.state?.activeSection);
  // Refresh counts displayed somewhere (e.g., in the header or sidebar)
  if (app.utils && app.utils.updateSavedItemsCount) {
    app.utils.updateSavedItemsCount();
  }

  // Reload content of the currently active section
  if (app.state && app.state.activeSection && typeof app.loadSectionContent === 'function') {
    // Check if the specific load function for the active section exists
    let loadFunction;
    switch (app.state.activeSection) {
      case 'groups':    loadFunction = app.groups?.loadSavedGroups; break;
      case 'bookmarks': loadFunction = app.bookmarks?.loadBookmarks; break;
      case 'todo':      loadFunction = app.todo?.renderTodos; break;
      case 'settings':  loadFunction = app.settings?.displayShortcuts; break; // Settings needs refresh too
      // Add cases for other sections if they exist
    }

    if (typeof loadFunction === 'function') {
      console.log(`Calling load function for section: ${app.state.activeSection}`);
      loadFunction(); // Call the specific load function
    } else {
       console.warn(`Load function for active section "${app.state.activeSection}" not found during refresh.`);
       // Optional Fallback: Maybe try reloading a default section like groups
       if (app.groups?.loadSavedGroups) {
           console.log("Fallback: Reloading groups section.");
           app.groups.loadSavedGroups();
       }
    }
  } else {
    console.warn("Could not determine active section or main load function during refresh.");
     // Optional Fallback: Maybe try reloading a default section like groups
     if (app.groups?.loadSavedGroups) {
         console.log("Fallback: Reloading groups section.");
         app.groups.loadSavedGroups();
     }
  }
};


// --- Event Listener Setup ---
app.settings.setupEventListeners = function () {
  // Data Management Buttons
  if (app.elements.exportDataBtn) {
    app.elements.exportDataBtn.addEventListener(
      "click",
      app.settings.exportData
    );
  }
  if (app.elements.importDataBtn) {
    app.elements.importDataBtn.addEventListener(
      "click",
      app.settings.triggerImport // Use trigger function
    );
  }
  // Hidden File Input
  if (app.elements.importFile) {
    // Listen for file selection
    app.elements.importFile.addEventListener("change", app.settings.importData);
  }
  // Clear Data Button
  if (app.elements.clearAllDataBtn) {
    app.elements.clearAllDataBtn.addEventListener(
      "click",
      app.settings.clearAllData
    );
  }

  // Shortcuts Button (Opens the Chrome extensions shortcuts page)
  if (app.elements.configureShortcutsBtn) {
    app.elements.configureShortcutsBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    });
  }

  // Initial display of shortcuts when the settings section is loaded
  app.settings.displayShortcuts();
};

