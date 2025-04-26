/**
 * main.js - Main application entry point, initialization, and coordination.
 */

// Ensure the global app object exists
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

        // Bookmarks Section
        bookmarksList: document.getElementById('bookmarksList'),

        // Todo Section
        todoList: document.getElementById('todoList'),
        newTodoInput: document.getElementById('newTodoInput'),
        submitTodoBtn: document.getElementById('submitTodoBtn'),

        // Create Folder Dialog
        folderButton: document.getElementById('folderButton'), // Nav tab triggering dialog
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

        // Custom Alert/Confirm Dialogs
        customAlertOverlay: document.getElementById('customAlertOverlay'),
        customAlertDialog: document.getElementById('customAlertDialog'),
        customAlertMessage: document.getElementById('customAlertMessage'),
        customAlertOk: document.getElementById('customAlertOk'),
        customConfirmOverlay: document.getElementById('customConfirmOverlay'),
        customConfirmDialog: document.getElementById('customConfirmDialog'),
        customConfirmMessage: document.getElementById('customConfirmMessage'),
        customConfirmConfirm: document.getElementById('customConfirmConfirm'),
        customConfirmCancel: document.getElementById('customConfirmCancel')
    };
    console.log("Elements cached");

    // --- State (Centralized) ---
    app.state = {
        currentTabs: [],
        currentEditingFolderOriginalName: '',
        activeSection: 'groups', // Default section
        groupSortOrder: 'dateDesc' // <<< ADD THIS LINE (Default sort)

        // Dialog-specific state is now in app.utils.dialogState
    };
    console.log("State initialized");


    // --- Core Logic Functions (Main Application Flow) ---

    function switchSection(sectionName) {
        console.log("Switching section to:", sectionName);
        // Hide dialogs on tab switch (using utility)
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

        // Toggle search bar visibility (Groups only)
        app.elements.searchContainer.style.display = (sectionName === 'groups') ? 'block' : 'none';
        if (sectionName !== 'groups' && app.elements.searchInput.value) {
             // Use group function to clear search if available
             if (app.groups && app.groups.clearSearch) {
                app.groups.clearSearch();
            } else {
                 console.warn("app.groups.clearSearch not available to clear search input.");
                 app.elements.searchInput.value = ''; // Manual clear as fallback
                 app.elements.clearSearchBtn.classList.remove('visible');
            }
        }

        // Load content for the new section
        loadSectionContent(sectionName);
    }

    function loadSectionContent(section) {
        console.log("Loading content for section:", section);
        // Clear previous list content to prevent duplicates/stale data
        if (app.elements.groupsList) app.elements.groupsList.innerHTML = '';
        if (app.elements.bookmarksList) app.elements.bookmarksList.innerHTML = '';
        if (app.elements.todoList) app.elements.todoList.innerHTML = '';

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
        }
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        console.log("Setting up Event Listeners");

        // Navigation Tabs (excluding folderButton handled by groups.js)
        app.elements.navTabs.forEach(tab => {
             // Only add listener if it's NOT the folder button AND has a section dataset
            if (tab.id !== 'folderButton' && tab.dataset.section) {
                tab.addEventListener('click', () => {
                    if (app.state.activeSection !== tab.dataset.section) {
                        switchSection(tab.dataset.section);
                    }
                });
            }
        });

        // Call setup functions from other modules IF they exist
        if (app.groups && app.groups.setupEventListeners) {
            app.groups.setupEventListeners();
            console.log("Groups listeners setup called.");
        } else {
             console.error("app.groups.setupEventListeners not found!");
        }

        if (app.bookmarks && app.bookmarks.setupEventListeners) {
             app.bookmarks.setupEventListeners();
             console.log("Bookmarks listeners setup called.");
         } else {
             console.error("app.bookmarks.setupEventListeners not found!");
         }

         if (app.todo && app.todo.setupEventListeners) {
             app.todo.setupEventListeners();
             console.log("Todo listeners setup called.");
         } else {
             console.error("app.todo.setupEventListeners not found!");
         }

        console.log("Base Event Listeners setup complete.");
    }


    // --- Initialization ---
    function init() {
        console.log("Initializing...");
        // Ensure utilities are loaded before using them
        if (app.utils && app.utils.updateTabCount && app.utils.updateSavedItemsCount) {
           app.utils.updateTabCount();
           app.utils.updateSavedItemsCount(); // Initial counts
           console.log("Counts updated.");
        } else {
            console.error("Count update utilities not available!");
        }

        setupEventListeners();

        // Load initial section content based on the default active section
        // Ensure the default section's load function is available before calling switchSection
        const defaultSection = app.state.activeSection;
         let canLoadDefault = false;
         switch (defaultSection) {
             case 'groups': canLoadDefault = !!(app.groups && app.groups.loadSavedGroups); break;
             case 'bookmarks': canLoadDefault = !!(app.bookmarks && app.bookmarks.loadBookmarks); break;
             case 'todo': canLoadDefault = !!(app.todo && app.todo.renderTodos); break;
         }

         if (canLoadDefault) {
             switchSection(defaultSection); // Load default section
             console.log(`Initial section '${defaultSection}' loaded.`);
         } else {
             console.error(`Cannot load default section '${defaultSection}', required functions missing.`);
             // Optionally switch to a section that *can* be loaded, or show an error state.
         }

        console.log("Initialization Complete.");
    }

    // Start the application
    init();

}); // End DOMContentLoaded