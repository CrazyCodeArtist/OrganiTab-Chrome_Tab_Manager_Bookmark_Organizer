function showCustomConfirm(message, onConfirm) {
    const overlay = document.getElementById('customConfirmOverlay');
    const dialog = document.getElementById('customConfirmDialog');
    const messageElement = document.getElementById('customConfirmMessage');
    const confirmButton = document.getElementById('customConfirmConfirm');
    const cancelButton = document.getElementById('customConfirmCancel');

    messageElement.textContent = message;

    const newConfirmButton = confirmButton.cloneNode(true);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

    const newCancelButton = cancelButton.cloneNode(true);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);

    const currentConfirmButton = document.getElementById('customConfirmConfirm');
    const currentCancelButton = document.getElementById('customConfirmCancel');


    currentConfirmButton.addEventListener('click', () => {
        onConfirm(); // Execute the provided callback function
        overlay.style.display = 'none'; // Hide the overlay
    });

    currentCancelButton.addEventListener('click', () => {
        overlay.style.display = 'none'; // Hide the overlay
    });

    // Add listener to hide dialog if overlay is clicked 
    // overlay.addEventListener('click', (event) => {
    //     if (event.target === overlay) { // Only hide if the overlay itself was clicked, not the dialog
    //          overlay.style.display = 'none';
    //     }
    // }, { once: true }); // Use { once: true } block  multiple overlay listeners

    overlay.style.display = 'flex'; // Use flex to enable centering
}
// Function to show the custom alert dialog
function showCustomAlert(message) {
    const overlay = document.getElementById('customAlertOverlay');
    const dialog = document.getElementById('customAlertDialog');
    const messageElement = document.getElementById('customAlertMessage');
    const okButton = document.getElementById('customAlertOk');

    messageElement.textContent = message;

    const newOkButton = okButton.cloneNode(true);
    okButton.parentNode.replaceChild(newOkButton, okButton);
    const currentOkButton = document.getElementById('customAlertOk');


    currentOkButton.addEventListener('click', () => {
        overlay.style.display = 'none'; // Hide the overlay
    });

     overlay.addEventListener('click', (event) => {
         if (event.target === overlay) { // Only hide if the overlay itself was clicked
             overlay.style.display = 'none';
         }
     }, { once: true }); // Use { once: true } for single execution


    // Display the dialog and overlay
    overlay.style.display = 'flex'; // Use flex to enable centering
}

function toggleSearchVisibility() {
    const searchContainer = document.querySelector('.search-container');
    
    // Check which tab is active
    const activeTab = document.querySelector('.nav-tab.active');
    
    if (activeTab && activeTab.getAttribute('data-section') === 'groups') {
      // Show search when on groups tab
      searchContainer.style.display = 'block';
    } else {
      // Hide search on other tabs
      searchContainer.style.display = 'none';
    }
  }

document.addEventListener('DOMContentLoaded', () => {
    
    // Add these new element references
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const folderButton = document.getElementById('folderButton');
    const folderDialog = document.getElementById('folderDialog');
    const closeFolderBtn = document.getElementById('closeFolderBtn');
    const folderNameInput = document.getElementById('folderNameInput');
    const groupSelection = document.getElementById('groupSelection');
    const selectAllGroupsBtn = document.getElementById('selectAllGroupsBtn');
    const createFolderBtn = document.getElementById('createFolderBtn');

    // search 
    
    // Todo specific elements
    const todoInput = document.getElementById('todoInput');
    const addTodoBtn = document.getElementById('addTodoBtn');
    const todoList = document.getElementById('todoList');
    
    // Edit folder dialog references
    const editFolderDialog = document.getElementById('editFolderDialog');
    const closeEditFolderBtn = document.getElementById('closeEditFolderBtn');
    const editFolderName = document.getElementById('editFolderName'); // This should be an input field
    const editGroupSelection = document.getElementById('editGroupSelection');
    const selectAllEditGroupsBtn = document.getElementById('selectAllEditGroupsBtn');
    const saveEditFolderBtn = document.getElementById('saveEditFolderBtn');
    
    // Include existing element references
    const addButton = document.getElementById('addButton');
    const saveDropdown = document.getElementById('saveDropdown');
    const closeDropdownBtn = document.getElementById('closeDropdownBtn');
    const groupNameInput = document.getElementById('groupNameInput');
    const tabsChecklist = document.getElementById('tabsChecklist');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const saveTabsButton = document.getElementById('saveTabsButton');
    const groupsList = document.getElementById('groupsList');
    const tabCountLabel = document.getElementById('tabCountLabel');
    const savedItemsLabel = document.getElementById('savedItemsLabel');
    const navTabs = document.querySelectorAll('.nav-tab');
    
    // Add these to state
    let folders = {};
    let isSearchActive = false;
    let currentTabs = [];
    let currentEditingFolder = '';
    
    // Initialize
    function init() {
        updateTabCount();
        updateSavedItemsCount();
        loadSavedGroups();
        loadBookmarks();
        setupNavTabs();
        setupEventListeners();
        renderTodos();

    }

    function updateTabCount() {
        chrome.tabs.query({}, (tabs) => {
            currentTabs = tabs;
            tabCountLabel.textContent = tabs.length;
        });
    }

    function updateSavedItemsCount() {
        chrome.storage.local.get(['tabGroups', 'bookmarks', 'todos'], ({ tabGroups = {}, bookmarks = [], todos = [] }) => {
            const count = Object.keys(tabGroups).length + bookmarks.length + todos.length;
            savedItemsLabel.textContent = count;
        });
    }
    
    function setupNavTabs() {
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Special handling for folder button
                if (tab.id === 'folderButton') {
                    populateGroupSelection();
                    folderDialog.style.display = 'block';
                    return;
                }
                
                // Remove active class from all tabs
                navTabs.forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Hide all sections
                document.querySelectorAll('.section-container').forEach(section => {
                    section.classList.remove('active-section');
                });
                
                // Show corresponding section
                const sectionId = tab.dataset.section + 'Section';
                document.getElementById(sectionId).classList.add('active-section');
                const searchContainer = document.querySelector('.search-container');
                if (tab.dataset.section === 'groups') {
                    // Show search when on groups tab
                    searchContainer.style.display = 'block';
                } else {
                    // Hide search on other tabs
                    searchContainer.style.display = 'none';
                }
                
            });
        });
    }
    
    function setupEventListeners() {
        // Add button click handler
        addButton.addEventListener('click', () => {
            showSaveDropdown();
        });
        
        // Close dropdown button click handler
        closeDropdownBtn.addEventListener('click', () => {
            saveDropdown.style.display = 'none';
        });
        
        // Save tabs button click handler
        saveTabsButton.addEventListener('click', () => {
            saveSelectedTabs();
        });
        
        // Select all button click handler
        selectAllBtn.addEventListener('click', () => {
            toggleSelectAll();
        });
        
        // Folder dialog
        closeFolderBtn.addEventListener('click', () => {
            folderDialog.style.display = 'none';
        });
        
        selectAllGroupsBtn.addEventListener('click', () => {
            toggleSelectAllGroups(groupSelection, selectAllGroupsBtn);
        });
        
        // Edit folder dialog
        closeEditFolderBtn.addEventListener('click', () => {
            editFolderDialog.style.display = 'none';
        });
        
        selectAllEditGroupsBtn.addEventListener('click', () => {
            toggleSelectAllGroups(editGroupSelection, selectAllEditGroupsBtn);
        });
        
        saveEditFolderBtn.addEventListener('click', () => {
            saveEditedFolder();
        });
        
        createFolderBtn.addEventListener('click', () => {
            createNewFolder();
        });
        
        // Add search event listeners
        searchInput.addEventListener('input', handleSearch);
        clearSearchBtn.addEventListener('click', clearSearch);
        
   
    }

    
    // Bookmark functionality
    function loadBookmarks() {
        const bookmarksList = document.getElementById('bookmarksList');
        if (!bookmarksList) return;
        
        chrome.storage.local.get(['bookmarks'], ({ bookmarks = [] }) => {
            bookmarksList.innerHTML = '';
            
            if (bookmarks.length === 0) {
                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'empty-message';
                emptyMessage.textContent = 'No bookmarks yet. Right-click on any page and select "Bookmark this page".';
                bookmarksList.appendChild(emptyMessage);
                return;
            }
            
            bookmarks.forEach(bookmark => {
                const bookmarkItem = document.createElement('div');
                bookmarkItem.className = 'bookmark-item';
                
                const favicon = document.createElement('img');
                favicon.className = 'bookmark-favicon';
                favicon.src = bookmark.favIconUrl || 'icon.png';
                favicon.onerror = () => favicon.src = 'icon.png';
                
                const bookmarkContent = document.createElement('div');
                bookmarkContent.className = 'bookmark-content';
                
                const bookmarkTitle = document.createElement('div');
                bookmarkTitle.className = 'bookmark-title';
                bookmarkTitle.textContent = bookmark.title;
                
                const bookmarkUrl = document.createElement('div');
                bookmarkUrl.className = 'bookmark-url';
                bookmarkUrl.textContent = bookmark.url;
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-bookmark-btn';
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                
                bookmarkContent.appendChild(bookmarkTitle);
                bookmarkContent.appendChild(bookmarkUrl);
                
                bookmarkItem.appendChild(favicon);
                bookmarkItem.appendChild(bookmarkContent);
                bookmarkItem.appendChild(deleteBtn);

                
                
                // Open bookmark when clicked
                bookmarkItem.addEventListener('click', (e) => {
                    if (e.target !== deleteBtn && !deleteBtn.contains(e.target)) {
                        chrome.tabs.create({ url: bookmark.url });
                    }
                });
                
                // Delete bookmark
                deleteBtn.addEventListener('click', () => {
                    deleteBookmark(bookmark.url);
                });
                
                bookmarksList.appendChild(bookmarkItem);
            });
        });
    }
    
    function deleteBookmark(url) {
        chrome.storage.local.get(['bookmarks'], ({ bookmarks = [] }) => {
            const updatedBookmarks = bookmarks.filter(bookmark => bookmark.url !== url);
            
            chrome.storage.local.set({ bookmarks: updatedBookmarks }, () => {
                loadBookmarks();
                updateSavedItemsCount();
            });
        });
    }
    
    function showSaveDropdown() {
        // Populate tabs checklist
        populateTabsChecklist();
        
        // Show dropdown
        saveDropdown.style.display = 'block';
    }
    
    function populateTabsChecklist() {
        tabsChecklist.innerHTML = '';
        
        currentTabs.forEach((tab, index) => {
            const tabItem = document.createElement('div');
            tabItem.className = 'tab-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'tab-checkbox';
            checkbox.checked = true;
            checkbox.dataset.tabId = tab.id;
            
            const favicon = document.createElement('img');
            favicon.className = 'tab-favicon';
            favicon.src = tab.favIconUrl || 'icon.png';
            
            const title = document.createElement('div');
            title.className = 'tab-title';
            title.textContent = tab.title;
            
            tabItem.appendChild(checkbox);
            tabItem.appendChild(favicon);
            tabItem.appendChild(title);
            
            tabsChecklist.appendChild(tabItem);
        });
    }
    
    function toggleSelectAll() {
        const checkboxes = tabsChecklist.querySelectorAll('.tab-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });
        
        selectAllBtn.textContent = allChecked ? 'Select All' : 'Deselect All';
    }
    
    function toggleSelectAllGroups(selectionContainer, buttonElement) {
        const checkboxes = selectionContainer.querySelectorAll('.group-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });
        
        buttonElement.textContent = allChecked ? 'Select All' : 'Deselect All';
    }
    
    function saveSelectedTabs() {
        const groupName = groupNameInput.value.trim();
        if (!groupName) {
            // Highlight input and return if no name is provided
            groupNameInput.focus();
            return;
        }
        
        // Get selected tabs
        const selectedTabs = [];
        tabsChecklist.querySelectorAll('.tab-checkbox:checked').forEach(checkbox => {
            const tabId = parseInt(checkbox.dataset.tabId);
            const tab = currentTabs.find(t => t.id === tabId);
            if (tab) {
                selectedTabs.push({
                    url: tab.url,
                    title: tab.title,
                    favIconUrl: tab.favIconUrl
                });
            }
        });
        

        if (selectedTabs.length === 0) {
            showCustomAlert('Please select at least one tab to save.');
            return; 
        }
        
        
        // Save group
        chrome.storage.local.get('tabGroups', ({ tabGroups = {} }) => {
            tabGroups[groupName] = {
                tabs: selectedTabs,
                dateAdded: Date.now()
            };
            
            chrome.storage.local.set({ tabGroups }, () => {
                saveDropdown.style.display = 'none';
                groupNameInput.value = '';
                loadSavedGroups();
                updateSavedItemsCount();
            });
        });
    }

    function getIconClass(name) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('work')) return 'fas fa-briefcase';
        if (lowerName.includes('shop')) return 'fas fa-shopping-cart';
        if (lowerName.includes('research')) return 'fas fa-search';
        if (lowerName.includes('social')) return 'fas fa-users';
        if (lowerName.includes('dev') || lowerName.includes('code')) return 'fas fa-code';
        if (lowerName.includes('travel')) return 'fas fa-plane';
        if (lowerName.includes('finance')) return 'fas fa-dollar-sign';
        return 'fas fa-layer-group';
    }
    
    function addGroupToList(name, group) {
        const li = document.createElement('li');
        const iconClass = getIconClass(name);
        
        // Format the date
        const date = new Date(group.dateAdded || Date.now());
        const formattedDate = `${date.toLocaleDateString()}`;
        
        li.innerHTML = `
            <div class="group-item">
                <div class="group-icon">
                    <i class="${iconClass}"></i>
                </div>
                <div class="group-info">
                    <div class="group-name">${name}</div>
                    <div class="group-status">${group.tabs.length} tabs</div>
                    <div class="group-date">${formattedDate}</div>
                </div>
            </div>
            <div class="group-actions">
                <button class="action-button open-btn">
                    <i class="fas fa-external-link-alt"></i>
                    <span class="open-tab-text">Open</span>
                </button>
                <button class="action-button delete-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Add event listeners
        const openBtn = li.querySelector('.open-btn');
        const deleteBtn = li.querySelector('.delete-btn');
        
        openBtn.addEventListener('click', () => {
            openTabGroup(group);
        });
        
        deleteBtn.addEventListener('click', () => {
            deleteTabGroup(name);
        });
        
        // Add the list item to the groups list
        groupsList.appendChild(li);
    }
    
    function openTabGroup(group) {
        group.tabs.forEach(tab => {
            chrome.tabs.create({ url: tab.url });
        });
    }
    
    function deleteTabGroup(name) {
        // Call the custom confirmation dialog
        showCustomConfirm(`Are you sure you want to delete the "${name}" group tabs?`, () => {
            // This block of code will only execute if the user clicks "Delete" in the custom dialog
            chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
                // Remove group from tab groups
                delete tabGroups[name];
    
                // Also remove from any folders
                Object.keys(folders).forEach(folderName => {
                    if (folders[folderName].groups && folders[folderName].groups[name]) {
                        delete folders[folderName].groups[name];
                    }
                });
    
                chrome.storage.local.set({ tabGroups, folders }, () => {
                    loadSavedGroups(); // Assuming these functions refresh your UI
                    updateSavedItemsCount();
                });
            });
        });
    }
    
    // Search functionality
    function handleSearch(e) {
        const searchTerm = e.target.value.trim().toLowerCase();
        
        if (searchTerm === '') {
            clearSearch();
            return;
        }
        
        clearSearchBtn.classList.add('visible');
        isSearchActive = true;
        
        // Search through groups and folders
        chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
            const filteredGroups = {};
            const filteredFolders = {};
            
            // Search in standalone groups
            Object.entries(tabGroups).forEach(([name, group]) => {
                if (name.toLowerCase().includes(searchTerm)) {
                    filteredGroups[name] = group;
                }
            });
            
            // Search in folders and their groups
            Object.entries(folders).forEach(([folderName, folder]) => {
                // Check if folder name matches
                if (folderName.toLowerCase().includes(searchTerm)) {
                    filteredFolders[folderName] = folder; // Add the entire folder
                } else {
                    // Check if any groups in the folder match
                    const matchingGroups = {};
                    let hasMatch = false;
                    
                    if (folder.groups) {
                        Object.entries(folder.groups).forEach(([groupName, group]) => {
                            if (groupName.toLowerCase().includes(searchTerm)) {
                                matchingGroups[groupName] = group;
                                hasMatch = true;
                            }
                        });
                    }
                    
                    if (hasMatch) {
                        // Create a new folder with only matching groups
                        filteredFolders[folderName] = {
                            ...folder,
                            groups: matchingGroups
                        };
                    }
                }
            });
            
            // Clear and render filtered results
            groupsList.innerHTML = '';
            
            // Display filtered folders first
            renderFolders(filteredFolders);
            
            // Then display filtered standalone groups
            Object.entries(filteredGroups).forEach(([name, group]) => {
                // Only show if not in any of the filtered folders
                let isInFilteredFolder = false;
                Object.values(filteredFolders).forEach(folder => {
                    if (folder.groups && folder.groups[name]) isInFilteredFolder = true;
                });
                
                if (!isInFilteredFolder) {
                    addGroupToList(name, group);
                }
            });
            
            // Show no results message if needed
            if (Object.keys(filteredGroups).length === 0 && Object.keys(filteredFolders).length === 0) {
                const noResults = document.createElement('div');
                noResults.className = 'no-results';
                noResults.textContent = 'No matching groups found';
                groupsList.appendChild(noResults);
            }
        });
    }
    
    function clearSearch() {
        searchInput.value = '';
        clearSearchBtn.classList.remove('visible');
        isSearchActive = false;
        loadSavedGroups(); // Reload all groups
    }
    
    function populateGroupSelection() {
        groupSelection.innerHTML = '';
        
        chrome.storage.local.get('tabGroups', ({ tabGroups = {} }) => {
            if (Object.keys(tabGroups).length === 0) {
                const emptyItem = document.createElement('div');
                emptyItem.className = 'empty-selection';
                emptyItem.textContent = 'No tab groups available to organize.';
                groupSelection.appendChild(emptyItem);
                return;
            }
            
            Object.keys(tabGroups).forEach((name, index) => {
                const groupElement = document.createElement('div');
                groupElement.className = 'group-check-item';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'group-checkbox';
                checkbox.dataset.name = name;
                checkbox.id = `group-${index}`;
                
                const label = document.createElement('label');
                label.className = 'group-name';
                label.htmlFor = `group-${index}`;
                label.textContent = name;
                
                groupElement.appendChild(checkbox);
                groupElement.appendChild(label);
                
                groupSelection.appendChild(groupElement);
            });
        });
    }
    
    function populateEditGroupSelection(folderName) {
        editGroupSelection.innerHTML = '';
        
        chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
            if (Object.keys(tabGroups).length === 0) {
                const emptyItem = document.createElement('div');
                emptyItem.className = 'empty-selection';
                emptyItem.textContent = 'No tab groups available to organize.';
                editGroupSelection.appendChild(emptyItem);
                return;
            }
            
            const folder = folders[folderName] || { groups: {} };
            
            Object.keys(tabGroups).forEach((name, index) => {
                const groupElement = document.createElement('div');
                groupElement.className = 'group-check-item';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'group-checkbox';
                checkbox.dataset.name = name;
                checkbox.id = `edit-group-${index}`;
                // Check if group is in the folder
                checkbox.checked = !!(folder.groups && folder.groups[name]);
                
                const label = document.createElement('label');
                label.className = 'group-name';
                label.htmlFor = `edit-group-${index}`;
                label.textContent = name;
                
                groupElement.appendChild(checkbox);
                groupElement.appendChild(label);
                
                editGroupSelection.appendChild(groupElement);
            });
        });
    }
    
    function createNewFolder() {
        const folderName = folderNameInput.value.trim();
        if (!folderName) return folderNameInput.focus();
        
        const selectedGroups = Array.from(document.querySelectorAll('#groupSelection .group-checkbox:checked'))
            .map(checkbox => checkbox.dataset.name);
        
        if (selectedGroups.length === 0) {
            
            showCustomAlert('Please select at least one group to add to the folder.');
            return;
        }
        
        chrome.storage.local.get(['folders', 'tabGroups'], ({ folders = {}, tabGroups = {} }) => {
            // Create folder object with selected groups
            const folderGroups = {};
            selectedGroups.forEach(groupName => {
                if (tabGroups[groupName]) {
                    folderGroups[groupName] = tabGroups[groupName];
                }
            });
            
            folders[folderName] = {
                groups: folderGroups,
                dateCreated: Date.now()
            };
            
            chrome.storage.local.set({ folders }, () => {
                folderNameInput.value = '';
                folderDialog.style.display = 'none';
                loadSavedGroups();
            });
        });
    }
    
    function openEditFolderDialog(folderName) {
        currentEditingFolder = folderName;
        editFolderName.textContent = folderName; // Changed from value to textContent
        
        populateEditGroupSelection(folderName);
        
        editFolderDialog.style.display = 'block';
    }
    
    function saveEditedFolder() {
        // Since editFolderName is a div, we get its text content
        const newFolderName = editFolderName.textContent.trim();
        if (!newFolderName) {
            showCustomAlert('Please enter a folder name');
            return;
        }
        
        const selectedGroups = Array.from(document.querySelectorAll('#editGroupSelection .group-checkbox:checked'))
            .map(checkbox => checkbox.dataset.name);
        
        chrome.storage.local.get(['folders', 'tabGroups'], ({ folders = {}, tabGroups = {} }) => {
            // Get the old folder to preserve dateCreated
            const oldFolder = folders[currentEditingFolder] || { dateCreated: Date.now() };
            
            // Create folder object with selected groups
            const folderGroups = {};
            selectedGroups.forEach(groupName => {
                if (tabGroups[groupName]) {
                    folderGroups[groupName] = tabGroups[groupName];
                }
            });
            
            // Remove old folder if name changed
            if (newFolderName !== currentEditingFolder) {
                delete folders[currentEditingFolder];
            }
            
            // Create/update folder with new values
            folders[newFolderName] = {
                groups: folderGroups,
                dateCreated: oldFolder.dateCreated
            };
            
            chrome.storage.local.set({ folders }, () => {
                editFolderDialog.style.display = 'none';
                currentEditingFolder = '';
                loadSavedGroups();
            });
        });
    }
    
    
    function loadSavedGroups() {
        chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
            groupsList.innerHTML = '';
            
            // First render folders
            renderFolders(folders);
            
            // Then render individual groups (not in folders)
            let groupsInFolders = new Set();
            Object.values(folders).forEach(folder => {
                if (folder.groups) {
                    Object.keys(folder.groups).forEach(name => {
                        groupsInFolders.add(name);
                    });
                }
            });
            
            Object.entries(tabGroups).forEach(([name, group]) => {
                if (!groupsInFolders.has(name)) {
                    addGroupToList(name, group);
                }
            });
            
            // Update saved items count
            updateSavedItemsCount();
        });
    }
    
    function renderFolders(folders) {
        Object.entries(folders).forEach(([folderName, folder]) => {
            const folderElement = document.createElement('div');
            folderElement.className = 'folder-item';
            
            // Folder header
            const folderHeader = document.createElement('div');
            folderHeader.className = 'folder-header';
            
            const folderTitle = document.createElement('div');
            folderTitle.className = 'folder-title';
            
            const folderIcon = document.createElement('i');
            folderIcon.className = 'fas fa-folder';
            
            const folderNameElement = document.createElement('span');
            folderNameElement.textContent = folderName;

            const folderCount = document.createElement('span');
            folderCount.className = 'folder-count';
            folderCount.textContent = `(${Object.keys(folder.groups || {}).length})`;
            
            const toggleIcon = document.createElement('i');
            toggleIcon.className = 'fas fa-chevron-down';
            
            // Add edit button to folder header
            const editButton = document.createElement('button');
            editButton.className = 'edit-folder-btn';
            editButton.innerHTML = '<i class="fas fa-edit"></i>';
            editButton.title = 'Edit folder';
            
            // Event listener for edit button
            editButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent folder toggle
                openEditFolderDialog(folderName);
            });
            
            folderTitle.appendChild(folderIcon);
            folderTitle.appendChild(folderNameElement);
            folderTitle.appendChild(folderCount);
            
            folderHeader.appendChild(folderTitle);
            folderHeader.appendChild(editButton);
            folderHeader.appendChild(toggleIcon);
            
            // Folder content
            const folderContent = document.createElement('div');
            folderContent.className = 'folder-content';
            
            // Add each group in the folder
            if (folder.groups) {
                Object.entries(folder.groups).forEach(([groupName, group]) => {
                    const li = document.createElement('li');
                    const iconClass = getIconClass(groupName);
                    
                    // Format the date
                    const date = new Date(group.dateAdded || Date.now());
                    const formattedDate = `${date.toLocaleDateString()}`;
                    
                    li.innerHTML = `
                        <div class="group-item">
                            <div class="group-icon">
                                <i class="${iconClass}"></i>
                            </div>
                            <div class="group-info">
                                <div class="group-name">${groupName}</div>
                                <div class="group-status">${group.tabs ? group.tabs.length : 0} tabs</div>
                                <div class="group-date">${formattedDate}</div>
                            </div>
                        </div>
                        <div class="group-actions">
                            <button class="action-button open-btn">
                                <i class="fas fa-external-link-alt"></i>
                                <span class="open-tab-text">Open</span>
                            </button>
                            <button class="action-button delete-btn">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                    
                    // Add event listeners for group in folder
                    const openBtn = li.querySelector('.open-btn');
                    const deleteBtn = li.querySelector('.delete-btn');
                    
                    openBtn.addEventListener('click', () => {
                        openTabGroup(group);
                    });
                    
                    deleteBtn.addEventListener('click', () => {
                        deleteGroupFromFolder(folderName, groupName);
                    });
                    
                    // Add it to folder content
                    folderContent.appendChild(li);
                });
            }
            
            // Add option to delete folder
            const folderActions = document.createElement('div');
            folderActions.className = 'folder-actions';
            folderActions.innerHTML = `
                <button class="action-button delete-folder-btn">
                    <i class="fas fa-trash"></i> Delete Folder
                </button>
            `;
            
            folderContent.appendChild(folderActions);
            
            // Event listener for delete folder button
            const deleteFolderBtn = folderActions.querySelector('.delete-folder-btn');
            deleteFolderBtn.addEventListener('click', () => {
                deleteFolder(folderName);
            });
            
            // Toggle folder expand/collapse
            folderHeader.addEventListener('click', () => {
                folderContent.classList.toggle('expanded');
                toggleIcon.classList.toggle('fa-chevron-down');
                toggleIcon.classList.toggle('fa-chevron-up');
            });
            
            folderElement.appendChild(folderHeader);
            folderElement.appendChild(folderContent);
            
            groupsList.appendChild(folderElement);
        });
    }
    function deleteGroupFromFolder(folderName, groupName) {
        // Use the custom confirmation dialog instead of native confirm
        showCustomConfirm(`Remove "${groupName}" from folder "${folderName}"?`, () => {
            // This code runs ONLY if the user confirms in the custom dialog
            chrome.storage.local.get('folders', ({ folders = {} }) => {
                if (folders[folderName] && folders[folderName].groups && folders[folderName].groups[groupName]) {
                    // Remove group from folder
                    delete folders[folderName].groups[groupName];
    
                    // Delete folder if it's empty after removing the group
                    if (Object.keys(folders[folderName].groups).length === 0) {
                        delete folders[folderName];
                    }
    
                    chrome.storage.local.set({ folders }, () => {
                        loadSavedGroups(); // Assuming this refreshes your UI
                        // updateSavedItemsCount(); // You might want to call this here if removing from a folder affects the total count display
                    });
                }
            });
        });
    }
    
    function deleteFolder(folderName) {
        // Use the custom confirmation dialog instead of native confirm
        showCustomConfirm(`Delete "${folderName}" folder? (Groups inside will NOT be deleted)`, () => {
            // This code runs ONLY if the user confirms in the custom dialog
            chrome.storage.local.get('folders', ({ folders = {} }) => {
                // Remove folder
                delete folders[folderName];
    
                chrome.storage.local.set({ folders }, () => {
                    loadSavedGroups(); // Assuming this refreshes your UI
                    updateSavedItemsCount(); // Update the count after deleting a folder
                });
            });
        });
    }
    document.getElementById('submitTodoBtn').addEventListener('click', function() {
        addNewTodo();
      });
      
      document.getElementById('newTodoInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          addNewTodo();
        }
      });
      function addNewTodo() {
        const todoText = document.getElementById('newTodoInput').value.trim();
        if (todoText) {
          chrome.storage.local.get(['todos'], function(result) {
            const todos = result.todos || [];
            const newTodo = {
              id: Date.now(),
              text: todoText,
              completed: false,
              dateAdded: Date.now()
            };
            todos.push(newTodo);
            chrome.storage.local.set({todos: todos}, function() {
              renderTodos();
              document.getElementById('newTodoInput').value = ''; // Just clear the input
              // Don't hide the form
              // Keep focus on the input field for convenience
              document.getElementById('newTodoInput').focus();
            });
          });
        }
      }
      
      // Check if you have a rendering function
      function renderTodos() {
        chrome.storage.local.get(['todos'], function(result) {
          const todos = result.todos || [];
          const todoList = document.getElementById('todoList');
          todoList.innerHTML = '';
          
          todos.forEach(todo => {
            const todoItem = document.createElement('div');
            todoItem.className = 'todo-item' + (todo.completed ? ' completed' : '');
            todoItem.dataset.id = todo.id;
            
            todoItem.innerHTML = `
              <div class="todo-checkbox">
                <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                <span class="checkmark"></span>
              </div>
              <div class="todo-text">${todo.text}</div>
              <button class="delete-todo"><i class="fas fa-trash"></i></button>
            `;
            
            todoList.appendChild(todoItem);
          });
        });
      }
      document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
          if (this.dataset.section) {
            document.querySelectorAll('.section-container').forEach(section => {
              section.classList.remove('active-section');
            });
            document.getElementById(this.dataset.section + 'Section').classList.add('active-section');
            
            document.querySelectorAll('.nav-tab').forEach(t => {
              t.classList.remove('active');
            });
            this.classList.add('active');
          }
        });
      });



      function renderTodos() {
        chrome.storage.local.get(['todos'], function(result) {
          const todos = result.todos || [];
          const todoList = document.getElementById('todoList');
          todoList.innerHTML = '';
          
          todos.forEach(todo => {
            const todoItem = document.createElement('div');
            todoItem.className = 'todo-item' + (todo.completed ? ' completed' : '');
            todoItem.dataset.id = todo.id;
            
            todoItem.innerHTML = `
              <div class="todo-content">
                <div class="todo-checkbox">
                  <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                  <span class="checkmark"></span>
                </div>
                <div class="todo-text">${todo.text}</div>
              </div>
              <button class="delete-todo"><i class="fas fa-trash"></i></button>
            `;
            
            todoList.appendChild(todoItem);
          });
          
          // Add event listeners for checkboxes and delete buttons
          addTodoEventListeners();
        });
      }
      
      function addTodoEventListeners() {
        // For checkboxes
        document.querySelectorAll('.todo-item input[type="checkbox"]').forEach(checkbox => {
          checkbox.addEventListener('change', function() {
            const todoId = this.closest('.todo-item').dataset.id;
            toggleTodoComplete(todoId, this.checked);
          });
        });
        
        // For delete buttons
        document.querySelectorAll('.delete-todo').forEach(button => {
          button.addEventListener('click', function() {
            const todoId = this.closest('.todo-item').dataset.id;
            deleteTodo(todoId);
          });
        });
      }
      
      function toggleTodoComplete(todoId, isCompleted) {
        chrome.storage.local.get(['todos'], function(result) {
          const todos = result.todos || [];
          const todoIndex = todos.findIndex(todo => todo.id == todoId);
          
          if (todoIndex !== -1) {
            todos[todoIndex].completed = isCompleted;
            chrome.storage.local.set({todos: todos}, function() {
              // Update the UI
              const todoItem = document.querySelector(`.todo-item[data-id="${todoId}"]`);
              if (isCompleted) {
                todoItem.classList.add('completed');
              } else {
                todoItem.classList.remove('completed');
              }
            });
          }
        });
      }
      
      function deleteTodo(todoId) {
        chrome.storage.local.get(['todos'], function(result) {
          const todos = result.todos || [];
          const updatedTodos = todos.filter(todo => todo.id != todoId);
          
          chrome.storage.local.set({todos: updatedTodos}, function() {
            // Remove the item from the DOM
            const todoItem = document.querySelector(`.todo-item[data-id="${todoId}"]`);
            if (todoItem) {
              todoItem.remove();
            }
          });
        });
      }

    // Initialize
    init();
    // end()
});