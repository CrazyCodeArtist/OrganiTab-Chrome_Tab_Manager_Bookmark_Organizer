/**
 * main.js - Main application entry point, initialization, and coordination.
 */

var app = app || {};

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded - Initializing App");

    // --- Cache DOM Elements (Centralized) ---
    app.elements = {
        // Main layout & Nav
        navTabs: document.querySelectorAll('.nav-tab'),
        sections: document.querySelectorAll('.section-container'),
        searchContainer: document.querySelector('.search-container'),
        searchInput: document.getElementById('searchInput'),
        clearSearchBtn: document.getElementById('clearSearchBtn'),
        tabCountLabel: document.getElementById('tabCountLabel'),
        savedItemsLabel: document.getElementById('savedItemsLabel'),

        // Add Group Dropdown
        addButton: document.getElementById('addButton'),
        saveDropdown: document.getElementById('saveDropdown'),
        closeDropdownBtn: document.getElementById('closeDropdownBtn'),
        groupNameInput: document.getElementById('groupNameInput'),
        tabsChecklist: document.getElementById('tabsChecklist'),
        selectAllBtn: document.getElementById('selectAllBtn'),
        saveTabsButton: document.getElementById('saveTabsButton'),

        // Groups Section
        groupsList: document.getElementById('groupsList'),
        createFolderHeaderBtn: document.getElementById('createFolderHeaderBtn'),

        // Bookmarks Section
        bookmarksList: document.getElementById('bookmarksList'),

        // Todo Section
        todoList: document.getElementById('todoList'),
        newTodoInput: document.getElementById('newTodoInput'),
        submitTodoBtn: document.getElementById('submitTodoBtn'),

        // Create Folder Dialog
        folderDialog: document.getElementById('folderDialog'),
        closeFolderBtn: document.getElementById('closeFolderBtn'),
        folderNameInput: document.getElementById('folderNameInput'),
        groupSelection: document.getElementById('groupSelection'),
        selectAllGroupsBtn: document.getElementById('selectAllGroupsBtn'),
        createFolderBtn: document.getElementById('createFolderBtn'),

        // Edit Folder Dialog
        editFolderDialog: document.getElementById('editFolderDialog'),
        closeEditFolderBtn: document.getElementById('closeEditFolderBtn'),
        editFolderName: document.getElementById('editFolderName'),
        editGroupSelection: document.getElementById('editGroupSelection'),
        selectAllEditGroupsBtn: document.getElementById('selectAllEditGroupsBtn'),
        saveEditFolderBtn: document.getElementById('saveEditFolderBtn'),

        // Settings Section
        settingsSection: document.getElementById('settingsSection'),
        exportDataBtn: document.getElementById('exportDataBtn'),
        importDataBtn: document.getElementById('importDataBtn'),
        importFile: document.getElementById('importFile'),
        clearAllDataBtn: document.getElementById('clearAllDataBtn'), // New
        shortcutsList: document.getElementById('shortcutsList'),       // New
        configureShortcutsBtn: document.getElementById('configureShortcutsBtn'), // New

        // Custom Alert/Confirm Dialogs
        customAlertOverlay: document.getElementById('customAlertOverlay'),
        customAlertDialog: document.getElementById('customAlertDialog'),
        customAlertMessage: document.getElementById('customAlertMessage'),
        customAlertOk: document.getElementById('customAlertOk'),
        customConfirmOverlay: document.getElementById('customConfirmOverlay'),
        customConfirmDialog: document.getElementById('customConfirmDialog'),
        customConfirmMessage: document.getElementById('customConfirmMessage'),
        customConfirmConfirm: document.getElementById('customConfirmConfirm'),
        customConfirmCancel: document.getElementById('customConfirmCancel'),

        // Custom Choice Dialog (New)
        customChoiceOverlay: document.getElementById('customChoiceOverlay'),
        customChoiceDialog: document.getElementById('customChoiceDialog'),
        customChoiceMessage: document.getElementById('customChoiceMessage'),
        customChoiceBtn1: document.getElementById('customChoiceBtn1'),
        customChoiceBtn2: document.getElementById('customChoiceBtn2'),
        customChoiceCancel: document.getElementById('customChoiceCancel'),

        renameGroupDialog: document.getElementById('rename-group-dialog'),
        renameGroupInput: document.getElementById('rename-group-input'),
        renameGroupSaveBtn: document.getElementById('rename-group-save-btn'),
        renameGroupCancelBtn: document.getElementById('rename-group-cancel-btn'),
        renameGroupOriginalName: document.getElementById('rename-group-original-name'),
        editTabsDialog: document.getElementById('edit-tabs-dialog'),
        editTabsDialogTitle: document.getElementById('edit-tabs-dialog-title'),
        editTabsList: document.getElementById('edit-tabs-list'),
        editTabsSaveBtn: document.getElementById('edit-tabs-save-btn'),
        editTabsCancelBtn: document.getElementById('edit-tabs-cancel-btn'),

    };
    console.log("Elements cached");

    // --- State (Centralized) ---
    app.state = {
        currentTabs: [],
        currentEditingFolderOriginalName: '',
        activeSection: 'groups', // Default section
        groupSortOrder: 'dateDesc'
    };
    console.log("State initialized");


    // --- Core Logic Functions (Main Application Flow) ---




    function switchSection(sectionName) {
        console.log("Switching section to:", sectionName);
        if (app.utils && app.utils.hideAllModalDialogs) {
            app.utils.hideAllModalDialogs();
        } else {
            console.error("app.utils.hideAllModalDialogs not available!");
        }

        app.state.activeSection = sectionName;

        // Update active tab style
        app.elements.navTabs.forEach(t => {
            t.classList.toggle('active', t.dataset.section === sectionName);
        });

        // Update active section display
        app.elements.sections.forEach(section => {
            section.classList.toggle('active-section', section.id === sectionName + 'Section');
        });

        // Toggle UI elements based on section
        const isGroupsSection = sectionName === 'groups';
        const statusCard = document.querySelector('.status-card');
        if (statusCard) {
            statusCard.style.display = isGroupsSection ? 'flex' : 'none'; // Assuming status-card uses flex display
        }

        app.elements.searchContainer.style.display = isGroupsSection ? 'block' : 'none';
        // Ensure createFolderHeaderBtn exists before trying to style it
        if (app.elements.createFolderHeaderBtn) {
            app.elements.createFolderHeaderBtn.style.display = isGroupsSection ? 'inline-flex' : 'none';
        }


        if (!isGroupsSection && app.elements.searchInput.value) {
            if (app.groups && app.groups.clearSearch) {
                app.groups.clearSearch();
            } else {
                app.elements.searchInput.value = '';
                if (app.elements.clearSearchBtn) app.elements.clearSearchBtn.classList.remove('visible');
            }
        }

        // Load content for the new section
        app.loadSectionContent(sectionName);
    }




















    // Renamed from loadSectionContent to avoid conflict with global variable if any
    app.loadSectionContent = function (section) {
        console.log("Loading content for section:", section);

        switch (section) {
            case 'groups':
                if (app.groups && app.groups.loadSavedGroups) app.groups.loadSavedGroups();
                else console.error("app.groups.loadSavedGroups not available!");
                break;
            case 'bookmarks':
                if (app.bookmarks && app.bookmarks.loadBookmarks) app.bookmarks.loadBookmarks();
                else console.error("app.bookmarks.loadBookmarks not available!");
                break;
            case 'todo':
                if (app.todo && app.todo.renderTodos) app.todo.renderTodos();
                else console.error("app.todo.renderTodos not available!");
                break;
            case 'settings':
                console.log("Settings section activated.");
                // Refresh shortcut display when switching to settings
                if (app.settings && app.settings.displayShortcuts) {
                    app.settings.displayShortcuts();
                } else {
                    console.error("app.settings.displayShortcuts not available!");
                }
                break;
        }
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        console.log("Setting up Event Listeners");

        // Navigation Tabs
        app.elements.navTabs.forEach(tab => {
            if (tab.dataset.section) {
                tab.addEventListener('click', () => {
                    if (app.state.activeSection !== tab.dataset.section) {
                        switchSection(tab.dataset.section);
                    }
                });
            }
        });

        // Call setup functions from other modules
        if (app.groups && app.groups.setupEventListeners) app.groups.setupEventListeners();
        else console.error("app.groups.setupEventListeners not found!");

        if (app.bookmarks && app.bookmarks.setupEventListeners) app.bookmarks.setupEventListeners();
        else console.error("app.bookmarks.setupEventListeners not found!");

        if (app.todo && app.todo.setupEventListeners) app.todo.setupEventListeners();
        else console.error("app.todo.setupEventListeners not found!");

        if (app.settings && app.settings.setupEventListeners) app.settings.setupEventListeners();
        else console.error("app.settings.setupEventListeners not found!");


        console.log("Base Event Listeners setup complete.");
    }

    // --- Add button disabling for Save/Folder dialogs ---
    function updateSaveTabGroupButtonState() {
        const name = app.elements.groupNameInput.value.trim();
        const checked = app.elements.tabsChecklist.querySelectorAll('.tab-checkbox:checked').length;
        app.elements.saveTabsButton.disabled = !name || !checked;
    }
    function updateCreateFolderButtonState() {
        const name = app.elements.folderNameInput.value.trim();
        const checked = app.elements.groupSelection.querySelectorAll('.group-checkbox:checked').length;
        app.elements.createFolderBtn.disabled = !name || !checked;
    }
    function updateEditFolderButtonState() {
        const name = app.elements.editFolderName.value.trim();
        const checked = app.elements.editGroupSelection.querySelectorAll('.group-checkbox:checked').length;
        app.elements.saveEditFolderBtn.disabled = !name || !checked;
    }
    // Attach to relevant inputs
    if (app.elements.groupNameInput && app.elements.tabsChecklist && app.elements.saveTabsButton) {
        app.elements.groupNameInput.addEventListener('input', updateSaveTabGroupButtonState);
        app.elements.tabsChecklist.addEventListener('change', updateSaveTabGroupButtonState);
    }
    if (app.elements.folderNameInput && app.elements.groupSelection && app.elements.createFolderBtn) {
        app.elements.folderNameInput.addEventListener('input', updateCreateFolderButtonState);
        app.elements.groupSelection.addEventListener('change', updateCreateFolderButtonState);
    }
    if (app.elements.editFolderName && app.elements.editGroupSelection && app.elements.saveEditFolderBtn) {
        app.elements.editFolderName.addEventListener('input', updateEditFolderButtonState);
        app.elements.editGroupSelection.addEventListener('change', updateEditFolderButtonState);
    }

    // --- Initialization ---
    function init() {
        console.log("Initializing...");
        if (app.utils && app.utils.updateTabCount && app.utils.updateSavedItemsCount) {
            app.utils.updateTabCount();
            app.utils.updateSavedItemsCount();
            console.log("Counts updated.");
        } else {
            console.error("Count update utilities not available!");
        }

        setupEventListeners();

        // Load initial section
        const defaultSection = app.state.activeSection;
        // Check if the necessary load function exists before calling switchSection
        let canLoadDefault = false;
        switch (defaultSection) {
            case 'groups': canLoadDefault = !!(app.groups && app.groups.loadSavedGroups); break;
            case 'bookmarks': canLoadDefault = !!(app.bookmarks && app.bookmarks.loadBookmarks); break;
            case 'todo': canLoadDefault = !!(app.todo && app.todo.renderTodos); break;
            case 'settings': canLoadDefault = !!(app.settings && app.settings.displayShortcuts); break; // Settings needs its display func
        }

        if (canLoadDefault) {
            switchSection(defaultSection); // This will also call app.loadSectionContent
            console.log(`Initial section '${defaultSection}' set.`);
        } else {
            console.error(`Cannot load default section '${defaultSection}', required functions missing.`);
            // Fallback to groups if possible
            if (app.groups && app.groups.loadSavedGroups) {
                switchSection('groups');
                console.warn("Default section failed, switched to 'groups'.");
            } else {
                console.error("Fallback to 'groups' also failed. Check script loading and functions.");
                // Display an error message in the UI?
            }
        }

        console.log("Initialization Complete.");
    }

    // Start the application
    init();

}); // End DOMContentLoaded
