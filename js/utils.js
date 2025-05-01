/**
 * utils.js - Utility Functions and Dialog Management
 */

var app = app || {};
app.utils = {};

// --- State ---
// Stores callbacks and listener references for dialogs to manage them properly
app.utils.dialogState = {
    // Confirm Dialog
    confirmCallback: null,
    confirmCancelCallback: null,
    confirmConfirmListener: null,
    confirmCancelListener: null,
    overlayClickListenerConfirm: null,
    // Alert Dialog
    alertOkListener: null,
    overlayClickListenerAlert: null,
    // Choice Dialog
    choiceDialogChoice1Callback: null,
    choiceDialogChoice2Callback: null,
    choiceDialogCancelCallback: null,
    choice1Listener: null,
    choice2Listener: null,
    choiceCancelListener: null,
    overlayClickListenerChoice: null
};

// --- Utility Functions ---

/**
 * Debounce function to limit the rate at which a function can fire.
 */
app.utils.debounce = function (func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

// --- Generic Modal Show/Hide ---

/**
 * Shows a modal overlay element by its ID.
 * Assumes the element uses 'display: flex' when visible.
 * @param {string} modalId - The ID of the modal overlay element.
 */
app.utils.showModal = function (modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        // Ensure necessary classes are present
        modalElement.classList.add('modal-overlay'); // Ensure overlay styling applies
        modalElement.classList.add('visible');      // For potential CSS transitions/visibility rules
        
      if (modalElement.id) {
        if (modalElement.id=='saveDropdown') {
            modalElement.style.display = 'block';        // Set display flex for centering

        }else{        modalElement.style.display = 'flex';        // Set display flex for centering
        }
        
      }else{
        modalElement.style.display = 'flex';        // Set display flex for centering
      }
      
        // Add overlay click listener to hide modal (optional, can be added per modal if needed)
        // Be cautious adding generic listeners here if some modals shouldn't close on overlay click.

    } else {
        console.error(`Modal element with ID "${modalId}" not found.`);
    }
};

/**
 * Hides a modal overlay element by its ID and performs cleanup.
 * @param {string} modalId - The ID of the modal overlay element.
 */
app.utils.hideModal = function (modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        modalElement.style.display = 'none';
        modalElement.classList.remove('visible');

        // Clean up specific listeners if they were added dynamically when shown
        const state = app.utils.dialogState;
        if (modalId === 'customConfirmOverlay') {
            if (state.confirmConfirmListener && app.elements.customConfirmConfirm) app.elements.customConfirmConfirm.removeEventListener('click', state.confirmConfirmListener);
            if (state.confirmCancelListener && app.elements.customConfirmCancel) app.elements.customConfirmCancel.removeEventListener('click', state.confirmCancelListener);
            if (state.overlayClickListenerConfirm) modalElement.removeEventListener('click', state.overlayClickListenerConfirm);
            state.confirmConfirmListener = state.confirmCancelListener = state.overlayClickListenerConfirm = state.confirmCallback = state.confirmCancelCallback = null;
        } else if (modalId === 'customAlertOverlay') {
            if (state.alertOkListener && app.elements.customAlertOk) app.elements.customAlertOk.removeEventListener('click', state.alertOkListener);
            if (state.overlayClickListenerAlert) modalElement.removeEventListener('click', state.overlayClickListenerAlert);
            state.alertOkListener = state.overlayClickListenerAlert = null;
        } else if (modalId === 'customChoiceOverlay') {
            if (state.choice1Listener && app.elements.customChoiceBtn1) app.elements.customChoiceBtn1.removeEventListener('click', state.choice1Listener);
            if (state.choice2Listener && app.elements.customChoiceBtn2) app.elements.customChoiceBtn2.removeEventListener('click', state.choice2Listener);
            if (state.choiceCancelListener && app.elements.customChoiceCancel) app.elements.customChoiceCancel.removeEventListener('click', state.choiceCancelListener);
            if (state.overlayClickListenerChoice) modalElement.removeEventListener('click', state.overlayClickListenerChoice);
            state.choice1Listener = state.choice2Listener = state.choiceCancelListener = state.overlayClickListenerChoice = state.choiceDialogChoice1Callback = state.choiceDialogChoice2Callback = state.choiceDialogCancelCallback = null;
        } else if (modalId === 'rename-group-dialog') {
            // Remove listeners added specifically in openRenameGroupDialog
            if (app.elements.renameGroupSaveBtn) app.elements.renameGroupSaveBtn.onclick = null;
            if (app.elements.renameGroupCancelBtn) app.elements.renameGroupCancelBtn.onclick = null;
            if (app.elements.renameGroupInput) app.elements.renameGroupInput.onkeydown = null;
        } else if (modalId === 'edit-tabs-dialog') {
            // Remove listeners added specifically in openEditTabsDialog
            if (app.elements.editTabsSaveBtn) app.elements.editTabsSaveBtn.onclick = null;
            if (app.elements.editTabsCancelBtn) app.elements.editTabsCancelBtn.onclick = null;
        }
        // Add cleanup for other modals (saveDropdown, folderDialog, editFolderDialog) if necessary

    } else {
        console.warn(`Modal element with ID "${modalId}" not found for hiding.`);
    }
};


/**
 * Hides all known modal dialog overlays.
 */
app.utils.hideAllModalDialogs = function () {
    if (!app.elements) return;

    // List all known modal overlay IDs from popup.html
    const modalIds = [
        'saveDropdown',
        'folderDialog',
        'editFolderDialog',
        'customConfirmOverlay',
        'customAlertOverlay',
        'customChoiceOverlay',
        'rename-group-dialog',
        'edit-tabs-dialog'
    ];

    modalIds.forEach(id => {
        const dialog = document.getElementById(id);
        // Check if the dialog exists and is currently visible
        if (dialog && (dialog.style.display !== 'none' || dialog.classList.contains('visible'))) {
            app.utils.hideModal(id); // Use the generic hide function which includes cleanup
        }
    });

    // Additional specific state cleanup if needed (e.g., for non-modal states)
    if (app.state) app.state.currentEditingFolderOriginalName = '';
    // Clear input fields that might retain values
    ['folderNameInput', 'groupNameInput', 'editFolderName', 'renameGroupInput'].forEach(inputId => {
        if (app.elements && app.elements[inputId]) {
            app.elements[inputId].value = '';
        }
    });
    // Clear dynamic list containers
    ['groupSelection', 'editGroupSelection', 'tabsChecklist', 'editTabsList'].forEach(listId => {
        if (app.elements && app.elements[listId]) {
            app.elements[listId].innerHTML = '';
        }
    });
};

// --- Custom Dialog Functions ---

/**
 * Shows a custom confirmation dialog (Yes/No).
 * @param {string} message - The message to display.
 * @param {function} onConfirm - Callback function if 'Yes' is clicked.
 * @param {function} [onCancel=null] - Callback function if 'No' or overlay is clicked.
 * @param {string} [confirmText='Yes'] - Text for the confirm button.
 * @param {string} [cancelText='Cancel'] - Text for the cancel button.
 */
app.utils.showCustomConfirm = function (message, onConfirm, onCancel = null, confirmText = 'Yes', cancelText = 'Cancel') {
    const modalId = 'customConfirmOverlay';
    if (!app.elements || !app.elements[modalId]) { console.error("Confirm dialog elements missing!"); return; }
    const state = app.utils.dialogState;
    const elements = app.elements;

    // Ensure any previous instance is hidden and listeners removed
    app.utils.hideModal(modalId);

    state.confirmCallback = onConfirm;
    state.confirmCancelCallback = onCancel;
    elements.customConfirmMessage.textContent = message;

    // Apply appropriate button classes from CSS for styling
    elements.customConfirmConfirm.textContent = confirmText;
    elements.customConfirmConfirm.className = 'custom-confirm-button confirm danger-btn'; // e.g., Danger style for confirm
    elements.customConfirmCancel.textContent = cancelText;
    elements.customConfirmCancel.className = 'custom-confirm-button cancel secondary-btn'; // e.g., Secondary style for cancel

    // Define listeners
    state.confirmConfirmListener = () => { if (state.confirmCallback) state.confirmCallback(); app.utils.hideModal(modalId); };
    state.confirmCancelListener = () => { if (state.confirmCancelCallback) state.confirmCancelCallback(); app.utils.hideModal(modalId); };
    state.overlayClickListenerConfirm = (event) => { if (event.target === elements[modalId]) { if (state.confirmCancelCallback) state.confirmCancelCallback(); app.utils.hideModal(modalId); } };

    // Add new listeners
    elements.customConfirmConfirm.addEventListener('click', state.confirmConfirmListener);
    elements.customConfirmCancel.addEventListener('click', state.confirmCancelListener);
    elements[modalId].addEventListener('click', state.overlayClickListenerConfirm); // Listener for overlay click

    app.utils.showModal(modalId);
};


/**
 * Shows a custom alert dialog (OK).
 * @param {string} message - The message to display.
 */
app.utils.showCustomAlert = function (message) {
    const modalId = 'customAlertOverlay';
    if (!app.elements || !app.elements[modalId]) { console.error("Alert dialog elements missing!"); alert(message); return; }
    const state = app.utils.dialogState;
    const elements = app.elements;

    // Ensure any previous instance is hidden and listeners removed
    app.utils.hideModal(modalId);

    elements.customAlertMessage.textContent = message;
    elements.customAlertOk.className = 'custom-alert-button ok primary-btn'; // Apply primary style

    // Define listener
    state.alertOkListener = () => app.utils.hideModal(modalId);
    state.overlayClickListenerAlert = (event) => { if (event.target === elements[modalId]) app.utils.hideModal(modalId); };

    // Add listeners
    elements.customAlertOk.addEventListener('click', state.alertOkListener);
    elements[modalId].addEventListener('click', state.overlayClickListenerAlert);

    app.utils.showModal(modalId);
};


/**
 * Shows a custom choice dialog (e.g., Merge/Overwrite/Cancel).
 * @param {string} message - The message to display.
 * @param {string} choice1Text - Text for the first choice button.
 * @param {function} onChoice1 - Callback for the first choice.
 * @param {string} choice2Text - Text for the second choice button.
 * @param {function} onChoice2 - Callback for the second choice.
 * @param {string} [cancelText='Cancel'] - Text for the cancel button.
 * @param {function} [onCancel=null] - Callback for cancel.
 */
app.utils.showCustomChoiceDialog = function (message, choice1Text, onChoice1, choice2Text, onChoice2, cancelText = 'Cancel', onCancel = null) {
    const modalId = 'customChoiceOverlay';
    if (!app.elements || !app.elements[modalId]) { console.error("Custom choice dialog elements not found!"); return; }
    const state = app.utils.dialogState;
    const elements = app.elements;

    // Ensure any previous instance is hidden and listeners removed
    app.utils.hideModal(modalId);

    state.choiceDialogChoice1Callback = onChoice1;
    state.choiceDialogChoice2Callback = onChoice2;
    state.choiceDialogCancelCallback = onCancel;

    elements.customChoiceMessage.textContent = message;
    // Apply appropriate button classes
    elements.customChoiceBtn1.textContent = choice1Text;
    elements.customChoiceBtn1.className = 'custom-choice-button choice1 primary-btn';
    elements.customChoiceBtn2.textContent = choice2Text;
    elements.customChoiceBtn2.className = 'custom-choice-button choice2 secondary-btn'; // Example: use secondary
    elements.customChoiceCancel.textContent = cancelText;
    elements.customChoiceCancel.className = 'custom-choice-button cancel secondary-btn'; // Example: use secondary

    // Define listeners
    state.choice1Listener = () => { if (state.choiceDialogChoice1Callback) state.choiceDialogChoice1Callback(); app.utils.hideModal(modalId); };
    state.choice2Listener = () => { if (state.choiceDialogChoice2Callback) state.choiceDialogChoice2Callback(); app.utils.hideModal(modalId); };
    state.choiceCancelListener = () => { if (state.choiceDialogCancelCallback) state.choiceDialogCancelCallback(); app.utils.hideModal(modalId); };
    state.overlayClickListenerChoice = (event) => { if (event.target === elements[modalId]) { if (state.choiceDialogCancelCallback) state.choiceDialogCancelCallback(); app.utils.hideModal(modalId); } };

    // Add listeners
    elements.customChoiceBtn1.addEventListener('click', state.choice1Listener);
    elements.customChoiceBtn2.addEventListener('click', state.choice2Listener);
    elements.customChoiceCancel.addEventListener('click', state.choiceCancelListener);
    elements[modalId].addEventListener('click', state.overlayClickListenerChoice);

    app.utils.showModal(modalId);
};


// --- Specific Dialog Hide Functions (Legacy/Wrappers - can be removed if direct hideModal is used everywhere) ---
// It's often cleaner to call app.utils.hideModal('folderDialog') directly where needed.
app.utils.hideCreateFolderDialog = function () {
    app.utils.hideModal('folderDialog'); // Use generic hide
    // Specific cleanup if needed
    if (app.elements.folderNameInput) app.elements.folderNameInput.value = '';
    if (app.elements.groupSelection) app.elements.groupSelection.innerHTML = '';
};

app.utils.hideEditFolderDialog = function () {
    app.utils.hideModal('editFolderDialog'); // Use generic hide
    // Specific cleanup if needed
    if (app.state) app.state.currentEditingFolderOriginalName = '';
    if (app.elements.editFolderName) app.elements.editFolderName.value = '';
    if (app.elements.editGroupSelection) app.elements.editGroupSelection.innerHTML = '';
};

// --- Other Utilities ---

// Function to get a relevant Font Awesome icon class based on name (example)
app.utils.getIconClass = function (name) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('work') || lowerName.includes('job')) return 'fas fa-briefcase';
    if (lowerName.includes('shop') || lowerName.includes('buy') || lowerName.includes('store')) return 'fas fa-shopping-cart';
    if (lowerName.includes('personal') || lowerName.includes('home')) return 'fas fa-home';
    if (lowerName.includes('research') || lowerName.includes('study')) return 'fas fa-book-open';
    if (lowerName.includes('social') || lowerName.includes('media')) return 'fas fa-users';
    if (lowerName.includes('news') || lowerName.includes('article')) return 'fas fa-newspaper';
    if (lowerName.includes('dev') || lowerName.includes('code') || lowerName.includes('git')) return 'fas fa-code';
    return 'fas fa-layer-group'; // Default icon
};


/**
 * Updates the count of currently open tabs displayed in the UI.
 */
app.utils.updateTabCount = function () {
    if (!app.elements || !app.state) return;
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) { console.error("Error querying tabs:", chrome.runtime.lastError); return; }
        // Filter out chrome:// and about: pages from count and state if needed
        const userTabs = tabs.filter(tab => tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:'));
        app.state.currentTabs = userTabs; // Store only user-accessible tabs in state for saving
        if (app.elements.tabCountLabel) {
            app.elements.tabCountLabel.textContent = userTabs.length;
        }
        // Refresh save dropdown checklist if open
        const saveDropdown = document.getElementById('saveDropdown'); // Re-select element safely
        if (saveDropdown && (saveDropdown.style.display === 'flex' || saveDropdown.style.display === 'block'  )&& app.groups && app.groups.populateTabsChecklist) {
            app.groups.populateTabsChecklist();
        }
    });
};

/**
 * Updates the total count of saved items (groups, folders, bookmarks, todos) displayed in the UI.
 */
app.utils.updateSavedItemsCount = function () {
    if (!app.elements) return;
    chrome.storage.local.get(['tabGroups', 'bookmarks', 'todos', 'folders'], ({ tabGroups = {}, bookmarks = [], todos = [], folders = {} }) => {
        if (chrome.runtime.lastError) { console.error("Error getting storage for count:", chrome.runtime.lastError); return; }
        let groupsInFolders = new Set();
        Object.values(folders).forEach(folder => { if (folder.groups) Object.keys(folder.groups).forEach(name => groupsInFolders.add(name)); });
        const standaloneGroupCount = Object.keys(tabGroups).filter(name => !groupsInFolders.has(name)).length;
        const folderCount = Object.keys(folders).length;
        const bookmarkCount = bookmarks.length;
        const todoCount = todos.length;
        // Count = Folders + Standalone Groups + Bookmarks + Todos
        const count = folderCount + standaloneGroupCount + bookmarkCount + todoCount;

        if (app.elements.savedItemsLabel) {
            app.elements.savedItemsLabel.textContent = count;
        }
    });
};


/**
 * Toggles the checked state of all checkboxes within a container and updates the button text.
 * @param {HTMLElement} container - The container element holding the checkboxes.
 * @param {HTMLButtonElement} buttonElement - The "Select All/Deselect All" button.
 * @param {string} checkboxSelector - The CSS selector for the checkboxes.
 */
app.utils.toggleSelectAll = function (container, buttonElement, checkboxSelector) {
    if (!container || !buttonElement) return;
    const checkboxes = container.querySelectorAll(checkboxSelector);
    if (checkboxes.length === 0) {
        buttonElement.textContent = 'Select All';
        // buttonElement.disabled = true;
        return;
    }
    buttonElement.disabled = false;

    // Check the *current* text to determine action
    const isSelectAllAction = buttonElement.textContent.includes('Select All');
    const newState = isSelectAllAction; // If it says "Select All", we check everything (true)

    checkboxes.forEach(checkbox => { checkbox.checked = newState; });

    // Update text based on the new state
    buttonElement.textContent = newState ? 'Deselect All' : 'Select All';
    // Optionally update a data attribute if needed
    // buttonElement.dataset.selected = newState.toString();
};


/**
 * Updates the text of a "Select All/Deselect All" button based on the current state of checkboxes.
 * @param {HTMLElement} container - The container element holding the checkboxes.
 * @param {HTMLButtonElement} buttonElement - The "Select All/Deselect All" button.
 * @param {string} checkboxSelector - The CSS selector for the checkboxes.
 */
app.utils.updateSelectAllButtonState = function (container, buttonElement, checkboxSelector) {
    if (!container || !buttonElement) return;
    const checkboxes = container.querySelectorAll(checkboxSelector);
    if (checkboxes.length === 0) {
        buttonElement.textContent = 'Select All';
        // buttonElement.disabled = true; // Disable if no items
        return;
    }
    buttonElement.disabled = false; // Enable if items exist

    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    // const noneChecked = Array.from(checkboxes).every(cb => !cb.checked); // Not needed for this logic

    buttonElement.textContent = allChecked ? 'Deselect All' : 'Select All';
};


console.log("utils.js finalized and loaded.");