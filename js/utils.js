/**
 * utils.js - Utility Functions and Dialog Management
 */

var app = app || {};
app.utils = {};

// --- State ---
app.utils.dialogState = {
    confirmCallback: null,
    confirmCancelCallback: null, // Added for flexibility
    alertOkListener: null,
    confirmConfirmListener: null,
    confirmCancelListener: null,
    overlayClickListenerAlert: null,
    overlayClickListenerConfirm: null,
    // State for Choice Dialog
    choiceDialogChoice1Callback: null,
    choiceDialogChoice2Callback: null,
    choiceDialogCancelCallback: null,
    choice1Listener: null,
    choice2Listener: null,
    choiceCancelListener: null,
    overlayClickListenerChoice: null
};

// --- Utility Functions ---
app.utils.debounce = function(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

// --- Dialog Functions ---

// Helper to hide potentially open modal dialogs
app.utils.hideAllModalDialogs = function() {
    if (!app.elements) return;

    const dialogs = [
        app.elements.folderDialog,
        app.elements.editFolderDialog,
        app.elements.saveDropdown,
        app.elements.customAlertOverlay,
        app.elements.customConfirmOverlay,
        app.elements.customChoiceOverlay // Add the new choice dialog
    ];

    dialogs.forEach(dialog => {
        if (dialog && dialog.style.display !== 'none') {
             if (dialog === app.elements.folderDialog) app.utils.hideCreateFolderDialog();
             else if (dialog === app.elements.editFolderDialog) app.utils.hideEditFolderDialog();
             else if (dialog === app.elements.saveDropdown) dialog.style.display = 'none';
             else if (dialog === app.elements.customAlertOverlay) app.utils.hideAlertDialog();
             else if (dialog === app.elements.customConfirmOverlay) app.utils.hideConfirmDialog();
             else if (dialog === app.elements.customChoiceOverlay) app.utils.hideChoiceDialog(); // Add hide logic
        }
    });
};


// --- Custom Confirm Dialog (Yes/No) ---
app.utils.showCustomConfirm = function(message, onConfirm, onCancel = null, confirmText = 'Yes', cancelText = 'Cancel') {
    if (!app.elements || !app.elements.customConfirmOverlay) {
         console.error("Custom confirm dialog elements not found!");
         // Fallback to browser confirm (not ideal, but better than nothing)
         if (confirm(message)) {
             if (onConfirm) onConfirm();
         } else {
             if (onCancel) onCancel();
         }
         return;
     }
    const state = app.utils.dialogState;
    const elements = app.elements;

    state.confirmCallback = onConfirm;
    state.confirmCancelCallback = onCancel; // Store cancel callback
    elements.customConfirmMessage.textContent = message;
    elements.customConfirmConfirm.textContent = confirmText; // Set button text
    elements.customConfirmCancel.textContent = cancelText;   // Set button text

    // --- Listener Management ---
    // Remove previous listeners to prevent duplicates
    if (state.confirmConfirmListener) elements.customConfirmConfirm.removeEventListener('click', state.confirmConfirmListener);
    if (state.confirmCancelListener) elements.customConfirmCancel.removeEventListener('click', state.confirmCancelListener);
    if (state.overlayClickListenerConfirm) elements.customConfirmOverlay.removeEventListener('click', state.overlayClickListenerConfirm);

    // Define new listeners
    state.confirmConfirmListener = () => {
        if (state.confirmCallback) state.confirmCallback();
        app.utils.hideConfirmDialog();
    };
    state.confirmCancelListener = () => {
        if (state.confirmCancelCallback) state.confirmCancelCallback(); // Execute cancel callback
        app.utils.hideConfirmDialog();
    };
    state.overlayClickListenerConfirm = (event) => {
        if (event.target === elements.customConfirmOverlay) {
             if (state.confirmCancelCallback) state.confirmCancelCallback(); // Also trigger cancel on overlay click
             app.utils.hideConfirmDialog();
        }
    };

    // Add new listeners
    elements.customConfirmConfirm.addEventListener('click', state.confirmConfirmListener);
    elements.customConfirmCancel.addEventListener('click', state.confirmCancelListener);
    elements.customConfirmOverlay.addEventListener('click', state.overlayClickListenerConfirm);

    elements.customConfirmOverlay.style.display = 'flex';
};

app.utils.hideConfirmDialog = function() {
    if (!app.elements || !app.elements.customConfirmOverlay) return;
    const state = app.utils.dialogState;
    const elements = app.elements;

    elements.customConfirmOverlay.style.display = 'none';
    // Clean up listeners
    if (state.confirmConfirmListener) elements.customConfirmConfirm.removeEventListener('click', state.confirmConfirmListener);
    if (state.confirmCancelListener) elements.customConfirmCancel.removeEventListener('click', state.confirmCancelListener);
    if (state.overlayClickListenerConfirm) elements.customConfirmOverlay.removeEventListener('click', state.overlayClickListenerConfirm);
    // Reset stored listeners and callbacks
    state.confirmConfirmListener = null;
    state.confirmCancelListener = null;
    state.overlayClickListenerConfirm = null;
    state.confirmCallback = null;
    state.confirmCancelCallback = null;
};

// --- Custom Alert Dialog (OK) ---
app.utils.showCustomAlert = function(message) {
    if (!app.elements || !app.elements.customAlertOverlay) {
        console.error("Custom alert dialog elements not found!");
        alert(message); // Fallback
        return;
    }
    const state = app.utils.dialogState;
    const elements = app.elements;

    elements.customAlertMessage.textContent = message;

    // Remove previous listeners
    if (state.alertOkListener) elements.customAlertOk.removeEventListener('click', state.alertOkListener);
    if (state.overlayClickListenerAlert) elements.customAlertOverlay.removeEventListener('click', state.overlayClickListenerAlert);

    // Define new listeners
    state.alertOkListener = () => app.utils.hideAlertDialog();
    state.overlayClickListenerAlert = (event) => {
        if (event.target === elements.customAlertOverlay) app.utils.hideAlertDialog();
    };

    // Add new listeners
    elements.customAlertOk.addEventListener('click', state.alertOkListener);
    elements.customAlertOverlay.addEventListener('click', state.overlayClickListenerAlert);

    elements.customAlertOverlay.style.display = 'flex';
};

app.utils.hideAlertDialog = function() {
    if (!app.elements || !app.elements.customAlertOverlay) return;
    const state = app.utils.dialogState;
    const elements = app.elements;

    elements.customAlertOverlay.style.display = 'none';
    // Clean up listeners
    if (state.alertOkListener) elements.customAlertOk.removeEventListener('click', state.alertOkListener);
    if (state.overlayClickListenerAlert) elements.customAlertOverlay.removeEventListener('click', state.overlayClickListenerAlert);
    state.alertOkListener = null;
    state.overlayClickListenerAlert = null;
};


// --- NEW: Custom Choice Dialog (e.g., Merge/Overwrite/Cancel) ---
app.utils.showCustomChoiceDialog = function(message, choice1Text, onChoice1, choice2Text, onChoice2, cancelText = 'Cancel', onCancel = null) {
     if (!app.elements || !app.elements.customChoiceOverlay) {
         console.error("Custom choice dialog elements not found!");
         // Basic fallback (less intuitive)
         if (confirm(`${message}\n\nOK for ${choice1Text}, Cancel for ${choice2Text}`)) {
             if (onChoice1) onChoice1();
         } else {
             if (onChoice2) onChoice2();
             // No easy way to handle explicit cancel here with confirm()
         }
         return;
     }
    const state = app.utils.dialogState;
    const elements = app.elements;

    // Store callbacks
    state.choiceDialogChoice1Callback = onChoice1;
    state.choiceDialogChoice2Callback = onChoice2;
    state.choiceDialogCancelCallback = onCancel;

    // Set text content
    elements.customChoiceMessage.textContent = message;
    elements.customChoiceBtn1.textContent = choice1Text;
    elements.customChoiceBtn2.textContent = choice2Text;
    elements.customChoiceCancel.textContent = cancelText;

    // --- Listener Management ---
    if (state.choice1Listener) elements.customChoiceBtn1.removeEventListener('click', state.choice1Listener);
    if (state.choice2Listener) elements.customChoiceBtn2.removeEventListener('click', state.choice2Listener);
    if (state.choiceCancelListener) elements.customChoiceCancel.removeEventListener('click', state.choiceCancelListener);
    if (state.overlayClickListenerChoice) elements.customChoiceOverlay.removeEventListener('click', state.overlayClickListenerChoice);

    // Define new listeners
    state.choice1Listener = () => {
        if (state.choiceDialogChoice1Callback) state.choiceDialogChoice1Callback();
        app.utils.hideChoiceDialog();
    };
    state.choice2Listener = () => {
        if (state.choiceDialogChoice2Callback) state.choiceDialogChoice2Callback();
        app.utils.hideChoiceDialog();
    };
    state.choiceCancelListener = () => {
        if (state.choiceDialogCancelCallback) state.choiceDialogCancelCallback();
        app.utils.hideChoiceDialog();
    };
    state.overlayClickListenerChoice = (event) => {
        if (event.target === elements.customChoiceOverlay) {
            if (state.choiceDialogCancelCallback) state.choiceDialogCancelCallback(); // Trigger cancel on overlay click
            app.utils.hideChoiceDialog();
        }
    };

    // Add new listeners
    elements.customChoiceBtn1.addEventListener('click', state.choice1Listener);
    elements.customChoiceBtn2.addEventListener('click', state.choice2Listener);
    elements.customChoiceCancel.addEventListener('click', state.choiceCancelListener);
    elements.customChoiceOverlay.addEventListener('click', state.overlayClickListenerChoice);

    // Show the dialog
    elements.customChoiceOverlay.style.display = 'flex';
};

app.utils.hideChoiceDialog = function() {
    if (!app.elements || !app.elements.customChoiceOverlay) return;
    const state = app.utils.dialogState;
    const elements = app.elements;

    elements.customChoiceOverlay.style.display = 'none';

    // Clean up listeners
    if (state.choice1Listener) elements.customChoiceBtn1.removeEventListener('click', state.choice1Listener);
    if (state.choice2Listener) elements.customChoiceBtn2.removeEventListener('click', state.choice2Listener);
    if (state.choiceCancelListener) elements.customChoiceCancel.removeEventListener('click', state.choiceCancelListener);
    if (state.overlayClickListenerChoice) elements.customChoiceOverlay.removeEventListener('click', state.overlayClickListenerChoice);

    // Reset state
    state.choice1Listener = null;
    state.choice2Listener = null;
    state.choiceCancelListener = null;
    state.overlayClickListenerChoice = null;
    state.choiceDialogChoice1Callback = null;
    state.choiceDialogChoice2Callback = null;
    state.choiceDialogCancelCallback = null;
};


// --- Specific Dialog Hide Functions ---
app.utils.hideCreateFolderDialog = function() {
    if (!app.elements || !app.elements.folderDialog) return;
    app.elements.folderDialog.style.display = 'none';
    if (app.elements.folderNameInput) app.elements.folderNameInput.value = '';
    if (app.elements.groupSelection) app.elements.groupSelection.innerHTML = '';
};

app.utils.hideEditFolderDialog = function() {
    if (!app.elements || !app.elements.editFolderDialog) return;
    app.elements.editFolderDialog.style.display = 'none';
    if (app.state) app.state.currentEditingFolderOriginalName = '';
    if (app.elements.editFolderName) app.elements.editFolderName.value = '';
    if (app.elements.editGroupSelection) app.elements.editGroupSelection.innerHTML = '';
};

// --- Other Utilities ---
app.utils.getIconClass = function(name) {
    // This function seems unused now, but keep it for potential future use or remove if confirmed obsolete.
    const lowerName = name.toLowerCase();
    if (lowerName.includes('work')) return 'fas fa-briefcase';
    if (lowerName.includes('shop')) return 'fas fa-shopping-cart';
    // ... other icons ...
    return 'fas fa-layer-group'; // Default icon
};

app.utils.updateTabCount = function() {
    if (!app.elements || !app.state) return;
    chrome.tabs.query({currentWindow: true}, (tabs) => { // Query only current window tabs
         if (chrome.runtime.lastError) {
             console.error("Error querying tabs:", chrome.runtime.lastError);
             return;
         }
        app.state.currentTabs = tabs; // Update state with current tabs
        if (app.elements.tabCountLabel) {
           app.elements.tabCountLabel.textContent = tabs.length;
        }
         // If the save dropdown is open, refresh its content
         if (app.elements.saveDropdown && app.elements.saveDropdown.style.display === 'block' && app.groups && app.groups.populateTabsChecklist) {
             console.log("Refreshing save dropdown checklist due to tab count update.");
             app.groups.populateTabsChecklist();
         }
    });
};

app.utils.updateSavedItemsCount = function() {
     if (!app.elements) return;
    chrome.storage.local.get(['tabGroups', 'bookmarks', 'todos', 'folders'], ({ tabGroups = {}, bookmarks = [], todos = [], folders = {} }) => {
         if (chrome.runtime.lastError) {
             console.error("Error getting storage for count:", chrome.runtime.lastError);
             return;
         }
        let groupsInFolders = new Set();
        Object.values(folders).forEach(folder => {
            if (folder.groups) {
                Object.keys(folder.groups).forEach(name => groupsInFolders.add(name));
            }
        });
        const standaloneGroupCount = Object.keys(tabGroups).filter(name => !groupsInFolders.has(name)).length;
        const folderCount = Object.keys(folders).length;
        const bookmarkCount = bookmarks.length;
        const todoCount = todos.length;
        const count = folderCount + standaloneGroupCount + bookmarkCount + todoCount;

        if(app.elements.savedItemsLabel) {
           app.elements.savedItemsLabel.textContent = count;
        }
    });
};

// Toggle Select All Helper
app.utils.toggleSelectAll = function(container, buttonElement, checkboxSelector) {
    if (!container || !buttonElement) return;
    const checkboxes = container.querySelectorAll(checkboxSelector);
    if (checkboxes.length === 0) return; // No items to toggle

    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    const newState = !allChecked; // The state we want to set all checkboxes to

    checkboxes.forEach(checkbox => {
        checkbox.checked = newState;
    });

    buttonElement.textContent = newState ? 'Deselect All' : 'Select All';
};


console.log("utils.js loaded");
