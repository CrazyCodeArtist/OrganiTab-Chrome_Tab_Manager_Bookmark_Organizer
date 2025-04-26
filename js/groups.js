/**
 * groups.js - Tab Group and Folder Management Logic
 */

var app = app || {};
app.groups = {};

// --- Group Saving Logic ---

app.groups.showSaveDropdown = function() {
    app.utils.hideAllModalDialogs(); // Use utility function
    app.groups.populateTabsChecklist();
    app.elements.saveDropdown.style.display = 'block';
    app.elements.groupNameInput.focus();
};

app.groups.populateTabsChecklist = function() {
    const fragment = document.createDocumentFragment();
    app.state.currentTabs.forEach((tab) => {
        const item = document.createElement('div');
        item.className = 'tab-item';
        item.innerHTML = `
            <input type="checkbox" class="tab-checkbox" checked data-tab-id="${tab.id}" id="tab-check-${tab.id}">
            <img class="tab-favicon" src="${tab.favIconUrl || 'icon.png'}" onerror="this.src='icon.png'" alt="">
            <label class="tab-title" for="tab-check-${tab.id}">${tab.title || tab.url}</label>
        `;
        fragment.appendChild(item);
    });
    app.elements.tabsChecklist.innerHTML = '';
    app.elements.tabsChecklist.appendChild(fragment);
    app.elements.selectAllBtn.textContent = 'Deselect All';
};

app.groups.saveSelectedTabs = function() {
    const groupName = app.elements.groupNameInput.value.trim();
    if (!groupName) {
        app.utils.showCustomAlert('Please enter a name for the tab group.');
        app.elements.groupNameInput.focus();
        return;
    }

    const selectedTabs = [];
    app.elements.tabsChecklist.querySelectorAll('.tab-checkbox:checked').forEach(checkbox => {
        const tabId = parseInt(checkbox.dataset.tabId);
        const tab = app.state.currentTabs.find(t => t.id === tabId);
        if (tab) {
            selectedTabs.push({ url: tab.url, title: tab.title, favIconUrl: tab.favIconUrl });
        }
    });

    if (selectedTabs.length === 0) {
        app.utils.showCustomAlert('Please select at least one tab to save.');
        return;
    }

    chrome.storage.local.get('tabGroups', ({ tabGroups = {} }) => {
        if (tabGroups[groupName]) {
             app.utils.showCustomAlert(`A tab group named "${groupName}" already exists. Please choose a different name.`);
            app.elements.groupNameInput.focus();
            return;
        }

        tabGroups[groupName] = { tabs: selectedTabs, dateAdded: Date.now() };

        chrome.storage.local.set({ tabGroups }, () => {
            app.elements.saveDropdown.style.display = 'none';
            app.elements.groupNameInput.value = '';
            if (app.state.activeSection === 'groups') {
                 app.groups.loadSavedGroups(); // Refresh
            }
            app.utils.updateSavedItemsCount(); // Use utility
        });
    });
};

// --- Group/Folder Rendering & Management ---

app.groups.createGroupListItem = function(name, group, folderName = null) {
    const li = document.createElement('li');
    li.dataset.group = name;
    if (folderName) {
        li.dataset.folder = folderName;
    }

    const iconClass = app.utils.getIconClass(name); // Use utility
    const date = new Date(group.dateAdded || Date.now());
    const formattedDate = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const tabCount = group.tabs ? group.tabs.length : 0;

    li.innerHTML = `
        <div class="group-item">
            <div class="group-icon"><i class="${iconClass}"></i></div>
            <div class="group-info">
                <div class="group-name">${name}</div>
                <div class="group-status">${tabCount} tab${tabCount !== 1 ? 's' : ''}</div>
                <div class="group-date">${formattedDate}</div>
            </div>
        </div>
        <div class="group-actions">
            <button class="action-button open-btn" title="Open Tabs"><i class="fas fa-external-link-alt"></i><span class="open-tab-text">Open</span></button>
            <button class="action-button delete-btn" title="Delete Group"><i class="fas fa-trash"></i></button>
        </div>
    `;
    return li;
};

// Inside groups.js
// REPLACE the existing loadSavedGroups function with this:
app.groups.loadSavedGroups = function() {
    chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
        // --- Sorting Logic ---
        const sortOrder = app.state.groupSortOrder || 'dateDesc'; // Get current sort order from global state

        // Comparator for Groups (can be standalone or inside folders)
        const groupComparator = (nameA, nameB, dataA, dataB) => {
            switch (sortOrder) {
                case 'nameAsc': return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
                case 'nameDesc': return nameB.localeCompare(nameA, undefined, { sensitivity: 'base' });
                case 'tabsAsc': return (dataA.tabs?.length || 0) - (dataB.tabs?.length || 0);
                case 'tabsDesc': return (dataB.tabs?.length || 0) - (dataA.tabs?.length || 0);
                case 'dateAsc': return (dataA.dateAdded || dataA.dateCreated || 0) - (dataB.dateAdded || dataB.dateCreated || 0); // Use dateAdded for groups, dateCreated for fallback
                case 'dateDesc': // Fallthrough (Default)
                default:        return (dataB.dateAdded || dataB.dateCreated || 0) - (dataA.dateAdded || dataA.dateCreated || 0);
            }
        };

        // Comparator for Folders
         const folderComparator = (nameA, nameB, dataA, dataB) => {
            // Simple folder sort - currently uses group logic but filters relevant keys
             switch (sortOrder) {
                 case 'nameAsc': return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
                 case 'nameDesc': return nameB.localeCompare(nameA, undefined, { sensitivity: 'base' });
                 case 'dateAsc': return (dataA.dateCreated || 0) - (dataB.dateCreated || 0);
                 case 'dateDesc': return (dataB.dateCreated || 0) - (dataA.dateCreated || 0);
                 // Add more folder-specific sorts if needed (e.g., total tabs inside)
                 case 'tabsAsc': // Example: Sort by number of groups inside
                 case 'tabsDesc':
                    const countA = dataA.groups ? Object.keys(dataA.groups).length : 0;
                    const countB = dataB.groups ? Object.keys(dataB.groups).length : 0;
                    return sortOrder === 'tabsAsc' ? countA - countB : countB - countA;
                 default:         return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' }); // Default folder sort: Name A-Z
             }
        };
        // --- End Sorting Logic ---


        requestAnimationFrame(() => {
            const fragment = document.createDocumentFragment();
            let groupsInFolders = new Set(); // Keep track of groups rendered inside folders

            // Sort and Render Folders
            const sortedFolderNames = Object.keys(folders).sort((a, b) =>
                folderComparator(a, b, folders[a], folders[b])
             );

            sortedFolderNames.forEach(folderName => {
                const folder = folders[folderName];
                const folderElement = document.createElement('div');
                folderElement.className = 'folder-item';
                folderElement.dataset.folder = folderName;
                const folderGroupCount = Object.keys(folder.groups || {}).length;

                // Determine initial expansion state maybe? For now, default closed.
                const isExpanded = false; // Or load from a saved state if you implement persistence
                const iconClass = isExpanded ? 'fa-chevron-up rotated' : 'fa-chevron-down';

                folderElement.innerHTML = `
                    <div class="folder-header">
                        <div class="folder-title">
                            <i class="fas fa-folder"></i>
                            <span><span class="math-inline">\{folderName\}</span\><span class="folder-count">({folderGroupCount})</span>
</div>
<div class="folder-header-actions">
<button class="action-button edit-folder-btn" title="Edit Folder"><i class="fas fa-edit"></i></button>
<button class="action-button toggle-folder-btn" title="Expand/Collapse"><i class="fas ${iconClass}"></i></button>
</div>
</div>
<div class="folder-content ${isExpanded ? 'expanded' : ''}">
<ul></ul>
<div class="folder-actions">
<button class="action-button delete-folder-btn" title="Delete Folder Only (Groups Remain)">
<i class="fas fa-trash"></i> Delete Folder
</button>
</div>
</div>`;const folderContentUl = folderElement.querySelector('.folder-content ul');
if (folder.groups && folderGroupCount > 0) {
     // Sort groups *within* the folder too
     const sortedGroupNames = Object.keys(folder.groups).sort((a, b) =>
         groupComparator(a, b, folder.groups[a], folder.groups[b])
     );
     sortedGroupNames.forEach(groupName => {
        groupsInFolders.add(groupName); // Mark as processed
        folderContentUl.appendChild(app.groups.createGroupListItem(groupName, folder.groups[groupName], folderName));
    });
} else {
     folderContentUl.innerHTML = '<li class="empty-folder">This folder is empty.</li>';
}
fragment.appendChild(folderElement);
}); // End folder loop

// Sort and Render Standalone Groups
const standaloneGroupList = document.createElement('ul');
standaloneGroupList.className = 'standalone-groups-list';
let standaloneGroupsExist = false;

const sortedStandaloneGroupNames = Object.keys(tabGroups)
.filter(name => !groupsInFolders.has(name)) // Only groups not already in a folder
.sort((a, b) => groupComparator(a, b, tabGroups[a], tabGroups[b])); // Apply sort

sortedStandaloneGroupNames.forEach(name => {
standaloneGroupsExist = true;
const group = tabGroups[name];
const groupLi = app.groups.createGroupListItem(name, group);
standaloneGroupList.appendChild(groupLi);
});

if (standaloneGroupsExist) {
fragment.appendChild(standaloneGroupList);
}

// Display or Show Empty Message
app.elements.groupsList.innerHTML = ''; // Clear previous content
if (fragment.hasChildNodes()) {
 app.elements.groupsList.appendChild(fragment);
} else {
 // Check if search is active to show appropriate message
 if (app.elements.searchInput.value.trim() !== '') {
      app.elements.groupsList.innerHTML = '<div class="no-results">No matching groups or folders found.</div>';
 } else {
      app.elements.groupsList.innerHTML = '<div class="empty-message">No tab groups saved yet. Click the "+" button to save your current tabs.</div>';
 }
}

// Update count (might be slightly redundant if called elsewhere, but safe)
if(app.utils && app.utils.updateSavedItemsCount) app.utils.updateSavedItemsCount();

}); // End requestAnimationFrame
}); // End chrome.storage.local.get
}; // End app.groups.loadSavedGroups
// Inside groups.js -> app.groups.setupEventListeners
// ADD THIS CODE AT THE END of the function:


// Inside groups.js

// --- Search Functionality ---
app.groups.handleSearchDebounced = app.utils.debounce((searchTerm) => { // Use utility debounce
    const lowerSearchTerm = searchTerm.trim().toLowerCase();

    if (lowerSearchTerm === '') {
        app.groups.clearSearch();
        return;
    }

    app.elements.clearSearchBtn.classList.add('visible');

    chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
        const filteredGroups = {};
        const filteredFolders = {};
        const groupsInFilteredFolders = new Set();

        // Search folders
        Object.entries(folders).forEach(([folderName, folder]) => {
            let folderNameMatches = folderName.toLowerCase().includes(lowerSearchTerm);
            let matchingGroupsInFolder = {};
            let groupMatchFound = false;
             if (folder.groups) {
                Object.entries(folder.groups).forEach(([groupName, group]) => {
                    if (groupName.toLowerCase().includes(lowerSearchTerm)) {
                        matchingGroupsInFolder[groupName] = group; groupMatchFound = true;
                    }
                });
            }
             if (folderNameMatches || groupMatchFound) {
                filteredFolders[folderName] = { ...folder, groups: folderNameMatches ? folder.groups : matchingGroupsInFolder };
                Object.keys(filteredFolders[folderName].groups || {}).forEach(gn => groupsInFilteredFolders.add(gn));
            }
        });

        // Search standalone groups
        Object.entries(tabGroups).forEach(([name, group]) => {
            if (!groupsInFilteredFolders.has(name) && name.toLowerCase().includes(lowerSearchTerm)) {
                filteredGroups[name] = group;
            }
        });

        // Render Filtered Results
        const fragment = document.createDocumentFragment();
        let resultsFound = false;

        // Render filtered folders
         const sortedFilteredFolderNames = Object.keys(filteredFolders).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
         sortedFilteredFolderNames.forEach(folderName => {
             resultsFound = true;
             const folder = filteredFolders[folderName];
             const folderElement = document.createElement('div');
             folderElement.className = 'folder-item'; folderElement.dataset.folder = folderName;
             const folderGroupCount = Object.keys(folder.groups || {}).length;
             folderElement.innerHTML = `
                 <div class="folder-header">
                     <div class="folder-title"><i class="fas fa-folder"></i> <span>${folderName}</span> <span class="folder-count">(${folderGroupCount})</span></div>
                     <div class="folder-header-actions">
                        <button class="action-button edit-folder-btn" title="Edit Folder"><i class="fas fa-edit"></i></button>
                        <button class="action-button toggle-folder-btn" title="Expand/Collapse"><i class="fas fa-chevron-up"></i></button> </div>
                 </div>
                 <div class="folder-content expanded"> <ul></ul> <div class="folder-actions"><button class="action-button delete-folder-btn"><i class="fas fa-trash"></i> Delete Folder</button></div> </div>`; // Expanded by default in search

             const folderContentUl = folderElement.querySelector('.folder-content ul');
            if (folder.groups && folderGroupCount > 0) {
                 const sortedGroupNames = Object.keys(folder.groups).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
                 sortedGroupNames.forEach(groupName => { folderContentUl.appendChild(app.groups.createGroupListItem(groupName, folder.groups[groupName], folderName)); });
            } else { folderContentUl.innerHTML = '<li class="empty-folder">No matching groups inside.</li>'; }
             fragment.appendChild(folderElement);
        });

        // Render filtered standalone groups
         const standaloneGroupList = document.createElement('ul'); standaloneGroupList.className = 'standalone-groups-list';
         const sortedFilteredGroupNames = Object.keys(filteredGroups).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
         sortedFilteredGroupNames.forEach(name => { resultsFound = true; standaloneGroupList.appendChild(app.groups.createGroupListItem(name, filteredGroups[name])); });
         if (standaloneGroupList.hasChildNodes()) { fragment.appendChild(standaloneGroupList); }

        // Display results
         app.elements.groupsList.innerHTML = '';
         if (resultsFound) { app.elements.groupsList.appendChild(fragment); }
         else { app.elements.groupsList.innerHTML = '<div class="no-results">No matching groups or folders found.</div>'; }
    });
}, 300); // 300ms debounce

app.groups.openTabGroup = function(group) {
    if (group && group.tabs && group.tabs.length > 0) {
        group.tabs.forEach(tab => chrome.tabs.create({ url: tab.url, active: false }));
    } else {
        console.warn("Attempted to open an invalid or empty group:", group);
        app.utils.showCustomAlert("Could not open tab group - it might be empty or corrupted.");
    }
};

app.groups.deleteTabGroup = function(name, folderName = null) {
    const message = folderName
        ? `Permanently delete group "${name}"? It will also be removed from folder "${folderName}". This cannot be undone.`
        : `Are you sure you want to permanently delete the "${name}" group? This cannot be undone.`;

    app.utils.showCustomConfirm(message, () => { // Use utility
        chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
            let changed = false;
            if (tabGroups[name]) {
                delete tabGroups[name];
                changed = true;
            }
            Object.values(folders).forEach(folder => {
                if (folder.groups && folder.groups[name]) {
                    delete folder.groups[name];
                    changed = true;
                }
            });

            if (changed) {
                chrome.storage.local.set({ tabGroups, folders }, () => {
                     app.groups.loadSavedGroups();
                    app.utils.updateSavedItemsCount(); // Use utility
                });
            } else {
                 console.warn(`Group "${name}" not found for deletion.`);
                 app.utils.showCustomAlert(`Group "${name}" was not found.`); // Use utility
            }
        });
    });
};

app.groups.deleteFolder = function(folderName) {
     chrome.storage.local.get('folders', ({ folders = {} }) => {
        const folder = folders[folderName];
        const groupCount = folder && folder.groups ? Object.keys(folder.groups).length : 0;
        const message = groupCount > 0
            ? `Delete folder "${folderName}"? The ${groupCount} group(s) inside will NOT be deleted and will appear outside the folder.`
            : `Delete empty folder "${folderName}"?`;

         app.utils.showCustomConfirm(message, () => { // Use utility
            delete folders[folderName];
            chrome.storage.local.set({ folders }, () => {
                app.groups.loadSavedGroups();
                app.utils.updateSavedItemsCount(); // Use utility
            });
        });
    });
};

// --- Folder Dialog Logic ---

app.groups.populateGroupSelection = function(containerElement, selectedGroups = []) {
    const selectedSet = new Set(selectedGroups);
    chrome.storage.local.get('tabGroups', ({ tabGroups = {} }) => {
         const fragment = document.createDocumentFragment();
        if (Object.keys(tabGroups).length === 0) {
            containerElement.innerHTML = '<div class="empty-selection">No tab groups available to organize.</div>';
            return;
        }

        Object.keys(tabGroups).sort().forEach((name, index) => {
            const item = document.createElement('div');
            item.className = 'group-check-item';
            const checkboxId = `group-check-${containerElement.id}-${index}`;
            item.innerHTML = `
                <input type="checkbox" class="group-checkbox" data-name="${name}" id="${checkboxId}" ${selectedSet.has(name) ? 'checked' : ''}>
                <label for="${checkboxId}" class="group-name">${name}</label>
            `;
            fragment.appendChild(item);
        });
         containerElement.innerHTML = '';
        containerElement.appendChild(fragment);
    });
};

app.groups.createNewFolder = function() {
    const folderName = app.elements.folderNameInput.value.trim();
    if (!folderName) {
         app.utils.showCustomAlert("Please enter a name for the folder.");
        app.elements.folderNameInput.focus();
        return;
    }

    const selectedGroups = Array.from(app.elements.groupSelection.querySelectorAll('.group-checkbox:checked'))
        .map(checkbox => checkbox.dataset.name);

    chrome.storage.local.get(['folders', 'tabGroups'], ({ folders = {}, tabGroups = {} }) => {
        if (folders[folderName]) {
            app.utils.showCustomAlert(`A folder named "${folderName}" already exists. Please choose a different name.`);
             app.elements.folderNameInput.focus();
            return;
        }

        const folderGroups = {};
        selectedGroups.forEach(groupName => {
            if (tabGroups[groupName]) { folderGroups[groupName] = tabGroups[groupName]; }
            else { console.warn(`Selected group "${groupName}" not found during folder creation.`); }
        });

        folders[folderName] = { groups: folderGroups, dateCreated: Date.now() };

        chrome.storage.local.set({ folders }, () => {
            app.utils.hideCreateFolderDialog(); // Use utility
            app.groups.loadSavedGroups();
            app.utils.updateSavedItemsCount(); // Use utility
        });
    });
};

app.groups.openEditFolderDialog = function(folderName) {
     app.utils.hideAllModalDialogs(); // Use utility
     chrome.storage.local.get(['folders'], ({ folders = {} }) => {
        const folder = folders[folderName];
        if (!folder) {
            console.error("Folder not found for editing:", folderName);
            app.utils.showCustomAlert("Could not find the folder to edit.");
            return;
        }

        app.state.currentEditingFolderOriginalName = folderName; // Store original name in global state
        app.elements.editFolderName.value = folderName;

        const currentGroupNames = folder.groups ? Object.keys(folder.groups) : [];
        app.groups.populateGroupSelection(app.elements.editGroupSelection, currentGroupNames);

        const allCheckboxes = app.elements.editGroupSelection.querySelectorAll('.group-checkbox');
        const checkedCheckboxes = app.elements.editGroupSelection.querySelectorAll('.group-checkbox:checked');
        app.elements.selectAllEditGroupsBtn.textContent = (allCheckboxes.length > 0 && checkedCheckboxes.length === allCheckboxes.length) ? 'Deselect All' : 'Select All';

        app.elements.editFolderDialog.style.display = 'block';
        app.elements.editFolderName.focus();
        app.elements.editFolderName.select();
    });
};

app.groups.saveEditedFolder = function() {
     const newFolderName = app.elements.editFolderName.value.trim();
     const originalFolderName = app.state.currentEditingFolderOriginalName;

     if (!newFolderName) { app.utils.showCustomAlert('Folder name cannot be empty.'); app.elements.editFolderName.focus(); return; }
     if (!originalFolderName) { console.error("Original folder name state missing."); app.utils.showCustomAlert("Error: Could not determine original folder name."); app.utils.hideEditFolderDialog(); return; }

    const selectedGroups = Array.from(app.elements.editGroupSelection.querySelectorAll('.group-checkbox:checked'))
        .map(checkbox => checkbox.dataset.name);

    chrome.storage.local.get(['folders', 'tabGroups'], ({ folders = {}, tabGroups = {} }) => {
         if (newFolderName !== originalFolderName && folders[newFolderName]) {
             app.utils.showCustomAlert(`A folder named "${newFolderName}" already exists.`); app.elements.editFolderName.focus(); return;
         }
         if (!folders[originalFolderName]) {
             console.error("Original folder not found during save:", originalFolderName); app.utils.showCustomAlert("Error: Original folder deleted."); app.utils.hideEditFolderDialog(); app.groups.loadSavedGroups(); return;
         }

         const updatedFolderGroups = {};
         selectedGroups.forEach(groupName => {
            if (tabGroups[groupName]) { updatedFolderGroups[groupName] = tabGroups[groupName]; }
            else { console.warn(`Selected group "${groupName}" not found during folder edit.`); }
        });

         const folderDataToSave = {
            groups: updatedFolderGroups,
            dateCreated: folders[originalFolderName].dateCreated,
            dateModified: Date.now()
         };

         let updatedFolders = { ...folders };
         if (newFolderName !== originalFolderName) { delete updatedFolders[originalFolderName]; }
         updatedFolders[newFolderName] = folderDataToSave;

         chrome.storage.local.set({ folders: updatedFolders }, () => {
            app.utils.hideEditFolderDialog(); // Use utility
            app.groups.loadSavedGroups();
            app.utils.updateSavedItemsCount(); // Use utility
        });
    });
};


app.groups.clearSearch = function() {
    app.elements.searchInput.value = '';
    app.elements.clearSearchBtn.classList.remove('visible');
    if (app.state.activeSection === 'groups') {
        app.groups.loadSavedGroups(); // Reload all groups
    }
};

// --- Event Handlers (Specific to Groups section, initialized in main.js) ---
app.groups.setupEventListeners = function() {
// Event Delegation for Dynamic Group/Folder List
app.elements.groupsList.addEventListener('click', (e) => {
    const target = e.target;
    // Find closest relevant elements
    const groupItem = target.closest('li[data-group]');
    const folderItem = target.closest('.folder-item[data-folder]');
    const folderHeader = target.closest('.folder-header');

    // Action Buttons inside list items or folder headers
    const openBtn = target.closest('.open-btn');
    const deleteGroupBtn = target.closest('.delete-btn'); // Group delete
    const editFolderBtn = target.closest('.edit-folder-btn');
    const toggleFolderBtn = target.closest('.toggle-folder-btn');
    const deleteFolderBtn = target.closest('.delete-folder-btn');

    // --- Logic for toggling folder expansion ---
    const handleToggle = (contentElement, iconElement) => {
         if (contentElement && iconElement) {
             const isExpanding = !contentElement.classList.contains('expanded');
             contentElement.classList.toggle('expanded', isExpanding);
             // Toggle rotation class on the icon itself
             iconElement.classList.toggle('rotated', isExpanding);
             // Optional: Update chevron direction class if needed for accessibility/fallback
             // (Keep these if you rely on them elsewhere, otherwise 'rotated' is sufficient)
             iconElement.classList.toggle('fa-chevron-down', !isExpanding);
             iconElement.classList.toggle('fa-chevron-up', isExpanding);
         }
    };

    // Toggle Folder Expansion via Button
    if (toggleFolderBtn && folderItem) {
        e.stopPropagation(); // Prevent header click toggle
        const folderContent = folderItem.querySelector('.folder-content');
        const icon = toggleFolderBtn.querySelector('i'); // Target the icon directly
        handleToggle(folderContent, icon);
        return; // Action handled
    }

    // Toggle Folder Expansion via Header Click (excluding buttons)
    if (folderHeader && folderItem && !target.closest('.folder-header-actions button')) {
         const folderContent = folderItem.querySelector('.folder-content');
         // Find the icon within the header's toggle button
         const icon = folderHeader.querySelector('.toggle-folder-btn i');
         handleToggle(folderContent, icon);
         return; // Action handled
    }
    // --- End of toggle logic ---


     // Edit Folder Button
    if (editFolderBtn && folderItem) {
        e.stopPropagation();
        const folderName = folderItem.dataset.folder;
        if (folderName) app.groups.openEditFolderDialog(folderName);
        return;
    }

     // Delete Folder Button
    if (deleteFolderBtn && folderItem) {
         e.stopPropagation();
        const folderName = folderItem.dataset.folder;
         if (folderName) app.groups.deleteFolder(folderName);
         return;
    }

     // Open Group Button
     if (openBtn && groupItem) {
         const groupName = groupItem.dataset.group;
         const folderName = groupItem.dataset.folder; // null for standalone
         if (groupName) {
             chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
                 const groupData = folderName ? folders[folderName]?.groups?.[groupName] : tabGroups[groupName];
                 if (groupData) app.groups.openTabGroup(groupData);
                 else {
                    console.error(`Group data not found for ${groupName} in ${folderName || 'standalone'}`);
                    app.utils.showCustomAlert("Error: Could not find data for this group.");
                 }
             });
         }
         return;
     }

     // Delete Group Button
     if (deleteGroupBtn && groupItem) {
         const groupName = groupItem.dataset.group;
         const folderName = groupItem.dataset.folder; // null if standalone
         if (groupName) app.groups.deleteTabGroup(groupName, folderName); // Pass folder context for msg
         return;
     }
     
}); // End of groupsList listener

    // Other specific listeners for group/folder UI elements if necessary
    // Add Group Dropdown listeners
    app.elements.addButton.addEventListener('click', app.groups.showSaveDropdown);
    app.elements.closeDropdownBtn.addEventListener('click', () => app.elements.saveDropdown.style.display = 'none');
    app.elements.saveTabsButton.addEventListener('click', app.groups.saveSelectedTabs);
    app.elements.selectAllBtn.addEventListener('click', () => app.utils.toggleSelectAll(app.elements.tabsChecklist, app.elements.selectAllBtn, '.tab-checkbox'));

    // Create Folder Dialog listeners
    app.elements.closeFolderBtn.addEventListener('click', app.utils.hideCreateFolderDialog);
    app.elements.selectAllGroupsBtn.addEventListener('click', () => app.utils.toggleSelectAll(app.elements.groupSelection, app.elements.selectAllGroupsBtn, '.group-checkbox'));
    app.elements.createFolderBtn.addEventListener('click', app.groups.createNewFolder);

    // Edit Folder Dialog listeners
    app.elements.closeEditFolderBtn.addEventListener('click', app.utils.hideEditFolderDialog);
    app.elements.selectAllEditGroupsBtn.addEventListener('click', () => app.utils.toggleSelectAll(app.elements.editGroupSelection, app.elements.selectAllEditGroupsBtn, '.group-checkbox'));
    app.elements.saveEditFolderBtn.addEventListener('click', app.groups.saveEditedFolder);

    // Search listeners
    app.elements.searchInput.addEventListener('input', (e) => app.groups.handleSearchDebounced(e.target.value));
    app.elements.clearSearchBtn.addEventListener('click', app.groups.clearSearch);

     // Folder Button (from nav) listener - opens Create Folder dialog
     app.elements.folderButton.addEventListener('click', () => {
         app.utils.hideAllModalDialogs(); // Close others
         app.groups.populateGroupSelection(app.elements.groupSelection); // Populate empty
         app.elements.selectAllGroupsBtn.textContent = 'Select All';
         app.elements.folderDialog.style.display = 'block';
         app.elements.folderNameInput.focus();
     });

     

     const sortSelect = document.getElementById('sortGroupsSelect');
     if (sortSelect) {
     const sortControls = document.querySelector('.group-sort-controls');
     // Ensure controls are visible (remove display:none if it was added in HTML)
     if(sortControls) sortControls.style.display = 'flex';
     
     // Set initial value from state
     sortSelect.value = app.state.groupSortOrder || 'dateDesc';
     
     sortSelect.addEventListener('change', (e) => {
     app.state.groupSortOrder = e.target.value; // Update global state
     console.log("Sort order changed to:", app.state.groupSortOrder);
     
     // Re-render based on search state or full list
     const searchTerm = app.elements.searchInput.value.trim();
     if (searchTerm) {
     // If search is active, re-trigger the debounced search handler
     // This assumes handleSearchDebounced also incorporates sorting
     console.log("Re-applying search with new sort");
     app.groups.handleSearchDebounced(searchTerm);
     } else {
     // Otherwise, just reload the full list
     console.log("Reloading group list with new sort");
     app.groups.loadSavedGroups();
     }
     });
     console.log("Sort controls listener added.");
     } else {
     console.warn("Sort select element (#sortGroupsSelect) not found in the DOM.");
     }
};

console.log("groups.js loaded"); // For debugging load order