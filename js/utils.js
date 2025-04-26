/**
 * utils.js - Utility Functions and Dialog Management
 */

// Create a global container or namespace if needed
var app = app || {};
app.utils = {};

// --- State (Consider placing dialog-related state here or in main state) ---
app.utils.dialogState = {
    confirmCallback: null,
    alertOkListener: null,
    confirmConfirmListener: null,
    confirmCancelListener: null,
    overlayClickListenerAlert: null,
    overlayClickListenerConfirm: null
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

// Helper to hide potentially open modal dialogs (references app.elements)
app.utils.hideAllModalDialogs = function() {
    if (!app.elements) return; // Guard against elements not being ready

    const dialogs = [
        app.elements.folderDialog,
        app.elements.editFolderDialog,
        app.elements.saveDropdown,
        app.elements.customAlertOverlay,
        app.elements.customConfirmOverlay
    ];

    dialogs.forEach(dialog => {
        if (dialog && dialog.style.display !== 'none') {
            // More specific hiding logic might be needed if resetting fields is crucial here
            // For now, just hide. Specific hide functions handle resets.
             if (dialog === app.elements.folderDialog) app.utils.hideCreateFolderDialog();
             else if (dialog === app.elements.editFolderDialog) app.utils.hideEditFolderDialog();
             else if (dialog === app.elements.saveDropdown) dialog.style.display = 'none';
             else if (dialog === app.elements.customAlertOverlay) app.utils.hideAlertDialog();
             else if (dialog === app.elements.customConfirmOverlay) app.utils.hideConfirmDialog();
        }
    });
};


app.utils.showCustomConfirm = function(message, onConfirm) {
    if (!app.elements) return; // Guard
    const state = app.utils.dialogState;
    const elements = app.elements;

    state.confirmCallback = onConfirm;
    elements.customConfirmMessage.textContent = message;

    // Remove previous listeners
    if (state.confirmConfirmListener) elements.customConfirmConfirm.removeEventListener('click', state.confirmConfirmListener);
    if (state.confirmCancelListener) elements.customConfirmCancel.removeEventListener('click', state.confirmCancelListener);
    if (state.overlayClickListenerConfirm) elements.customConfirmOverlay.removeEventListener('click', state.overlayClickListenerConfirm);

    // Define new listeners
    state.confirmConfirmListener = () => {
        if (state.confirmCallback) state.confirmCallback();
        app.utils.hideConfirmDialog();
    };
    state.confirmCancelListener = () => app.utils.hideConfirmDialog();
    state.overlayClickListenerConfirm = (event) => {
        if (event.target === elements.customConfirmOverlay) app.utils.hideConfirmDialog();
    };

    // Add new listeners
    elements.customConfirmConfirm.addEventListener('click', state.confirmConfirmListener);
    elements.customConfirmCancel.addEventListener('click', state.confirmCancelListener);
    elements.customConfirmOverlay.addEventListener('click', state.overlayClickListenerConfirm);

    elements.customConfirmOverlay.style.display = 'flex';
};

app.utils.hideConfirmDialog = function() {
    if (!app.elements) return; // Guard
    const state = app.utils.dialogState;
    const elements = app.elements;

    elements.customConfirmOverlay.style.display = 'none';
    // Clean up listeners
    if (state.confirmConfirmListener) elements.customConfirmConfirm.removeEventListener('click', state.confirmConfirmListener);
    if (state.confirmCancelListener) elements.customConfirmCancel.removeEventListener('click', state.confirmCancelListener);
    if (state.overlayClickListenerConfirm) elements.customConfirmOverlay.removeEventListener('click', state.overlayClickListenerConfirm);
    // Reset stored listeners and callback
    state.confirmConfirmListener = null;
    state.confirmCancelListener = null;
    state.overlayClickListenerConfirm = null;
    state.confirmCallback = null;
};

app.utils.showCustomAlert = function(message) {
    if (!app.elements) return; // Guard
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
    if (!app.elements) return; // Guard
    const state = app.utils.dialogState;
    const elements = app.elements;

    elements.customAlertOverlay.style.display = 'none';
    // Clean up listeners
    if (state.alertOkListener) elements.customAlertOk.removeEventListener('click', state.alertOkListener);
    if (state.overlayClickListenerAlert) elements.customAlertOverlay.removeEventListener('click', state.overlayClickListenerAlert);
    state.alertOkListener = null;
    state.overlayClickListenerAlert = null;
};

// --- Specific Dialog Hide Functions (Depend on app.elements) ---
app.utils.hideCreateFolderDialog = function() {
    if (!app.elements || !app.elements.folderDialog) return;
    app.elements.folderDialog.style.display = 'none';
    // Reset fields
    if (app.elements.folderNameInput) app.elements.folderNameInput.value = '';
    if (app.elements.groupSelection) app.elements.groupSelection.innerHTML = '';
};

app.utils.hideEditFolderDialog = function() {
    if (!app.elements || !app.elements.editFolderDialog) return;
    app.elements.editFolderDialog.style.display = 'none';
    if (app.state) app.state.currentEditingFolderOriginalName = ''; // Clear editing state
    // Reset fields
    if (app.elements.editFolderName) app.elements.editFolderName.value = '';
    if (app.elements.editGroupSelection) app.elements.editGroupSelection.innerHTML = '';
};

// --- Other Utilities ---
app.utils.getIconClass = function(name) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('work')) return 'fas fa-briefcase';
    if (lowerName.includes('shop')) return 'fas fa-shopping-cart';
    if (lowerName.includes('research')) return 'fas fa-search';
    if (lowerName.includes('social')) return 'fas fa-users';
    if (lowerName.includes('dev') || lowerName.includes('code')) return 'fas fa-code';
    if (lowerName.includes('travel')) return 'fas fa-plane';
    if (lowerName.includes('finance')) return 'fas fa-dollar-sign';
    return 'fas fa-layer-group'; // Default icon
};

// Update counts (might need access to app.elements and app.state)
app.utils.updateTabCount = function() {
    if (!app.elements || !app.state) return;
    chrome.tabs.query({}, (tabs) => {
        app.state.currentTabs = tabs;
        if (app.elements.tabCountLabel) {
           app.elements.tabCountLabel.textContent = tabs.length;
        }
    });
};

app.utils.updateSavedItemsCount = function() {
     if (!app.elements) return;
    chrome.storage.local.get(['tabGroups', 'bookmarks', 'todos', 'folders'], ({ tabGroups = {}, bookmarks = [], todos = [], folders = {} }) => {
        let groupsInFolders = new Set();
        Object.values(folders).forEach(folder => {
            if (folder.groups) {
                Object.keys(folder.groups).forEach(name => groupsInFolders.add(name));
            }
        });
        const standaloneGroupCount = Object.keys(tabGroups).filter(name => !groupsInFolders.has(name)).length;
        const folderCount = Object.keys(folders).length;
        const count = folderCount + standaloneGroupCount + bookmarks.length + todos.length;

        if(app.elements.savedItemsLabel) {
           app.elements.savedItemsLabel.textContent = count;
        }
    });
};

// Toggle Select All Helper (Used by Groups/Folders)
app.utils.toggleSelectAll = function(container, buttonElement, checkboxSelector) {
    if (!container || !buttonElement) return;
    const checkboxes = container.querySelectorAll(checkboxSelector);
    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);

    checkboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
    });

    buttonElement.textContent = allChecked ? 'Select All' : 'Deselect All';
};


console.log("utils.js loaded"); // For debugging load order