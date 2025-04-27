/**
 * groups.js - Tab Group and Folder Management Logic
 */

var app = app || {};
app.groups = {};

// --- Group Saving Logic ---
// (showSaveDropdown, populateTabsChecklist, saveSelectedTabs - remain the same)
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
    app.elements.selectAllBtn.textContent = 'Deselect All'; // Default state when populated
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
// (createGroupListItem, loadSavedGroups, handleSearchDebounced, openTabGroup, deleteTabGroup, deleteFolder - remain the same)
app.groups.createGroupListItem = function(name, group, folderName = null) {
    const li = document.createElement('li');
    li.dataset.group = name;
    if (folderName) {
        li.dataset.folder = folderName;
    }
    li.className = 'group-list-item'; // Add a class for easier styling/selection

    // Main visible part of the group item
    const groupItemDiv = document.createElement('div');
    groupItemDiv.className = 'group-item';

    // Group Info (Name is now editable)
    const groupInfoDiv = document.createElement('div');
    groupInfoDiv.className = 'group-info';

    // Container for the name and edit icon/input
    const groupNameContainer = document.createElement('div');
    groupNameContainer.className = 'group-name-container';
    groupNameContainer.innerHTML = `
        <span class="group-name" title="Click to edit name">${name}</span>
        <i class="fas fa-pencil-alt edit-group-icon" title="Edit name"></i>
    `;
    groupInfoDiv.appendChild(groupNameContainer);

    // Group Status (Tab count and Date)
    const date = new Date(group.dateAdded || Date.now());
    const formattedDate = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const tabCount = group.tabs ? group.tabs.length : 0;

    const groupStatusDiv = document.createElement('div');
    groupStatusDiv.className = 'group-status';
    groupStatusDiv.innerHTML = `${tabCount} tab${tabCount !== 1 ? 's' : ''} <span style="color: #bbb; margin: 0 5px;">|</span> ${formattedDate}`;
    groupInfoDiv.appendChild(groupStatusDiv);

    // Action Buttons
    const groupActionsDiv = document.createElement('div');
    groupActionsDiv.className = 'group-actions';
    groupActionsDiv.innerHTML = `
        <button class="action-button open-btn" title="Open Tabs in New Window">
            <i class="fas fa-external-link-alt"></i>
            <span class="open-tab-text">Open</span>
        </button>
        <button class="action-button delete-btn" title="Delete Group">
            <i class="fas fa-trash"></i>
        </button>
        <button class="action-button toggle-details-btn" title="Show/Hide Tabs List">
            <i class="fas fa-chevron-down"></i>
        </button>
    `;

    // Assemble the main visible part
    groupItemDiv.appendChild(groupInfoDiv);

    // Hidden Details Section (Tab List)
    const groupDetailsDiv = document.createElement('div');
    groupDetailsDiv.className = 'group-details'; // Initially hidden by CSS (max-height: 0)
    const tabListUl = document.createElement('ul');
    tabListUl.className = 'detailed-tab-list';

    if (group.tabs && group.tabs.length > 0) {
        group.tabs.forEach(tab => {
            const tabLi = document.createElement('li');
            tabLi.className = 'detailed-tab-item';
            // Store URL directly on the element for easy access on click
            tabLi.dataset.url = tab.url;
            tabLi.innerHTML = `
                <img class="detailed-tab-favicon" src="${tab.favIconUrl || 'icon.png'}" onerror="this.src='icon.png'" alt="">
                <span class="detailed-tab-title" title="${tab.title || tab.url}">${tab.title || 'No Title'}</span>
            `;
            tabListUl.appendChild(tabLi);
        });
    } else {
        tabListUl.innerHTML = '<li class="empty-group-message">No tabs in this group.</li>';
    }
    groupDetailsDiv.appendChild(tabListUl);

    // Add parts to the main list item (li)
    li.appendChild(groupItemDiv); // Visible part
    li.appendChild(groupActionsDiv); // Actions next to visible part
    li.appendChild(groupDetailsDiv); // Hidden details part

    return li;
};

app.groups.loadSavedGroups = function() {
    chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
        const sortOrder = app.state.groupSortOrder || 'dateDesc';

        const groupComparator = (nameA, nameB, dataA, dataB) => {
            switch (sortOrder) {
                case 'nameAsc': return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
                case 'nameDesc': return nameB.localeCompare(nameA, undefined, { sensitivity: 'base' });
                case 'tabsAsc': return (dataA.tabs?.length || 0) - (dataB.tabs?.length || 0);
                case 'tabsDesc': return (dataB.tabs?.length || 0) - (dataA.tabs?.length || 0);
                case 'dateAsc': return (dataA.dateAdded || dataA.dateCreated || 0) - (dataB.dateAdded || dataB.dateCreated || 0);
                case 'dateDesc': default: return (dataB.dateAdded || dataB.dateCreated || 0) - (dataA.dateAdded || dataA.dateCreated || 0);
            }
        };

        const folderComparator = (nameA, nameB, dataA, dataB) => {
             switch (sortOrder) {
                 case 'nameAsc': return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
                 case 'nameDesc': return nameB.localeCompare(nameA, undefined, { sensitivity: 'base' });
                 case 'dateAsc': return (dataA.dateCreated || 0) - (dataB.dateCreated || 0);
                 case 'dateDesc': return (dataB.dateCreated || 0) - (dataA.dateCreated || 0);
                 case 'tabsAsc': case 'tabsDesc':
                    const countA = dataA.groups ? Object.keys(dataA.groups).length : 0;
                    const countB = dataB.groups ? Object.keys(dataB.groups).length : 0;
                    return sortOrder === 'tabsAsc' ? countA - countB : countB - countA;
                 default: return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
             }
        };

        requestAnimationFrame(() => {
            const fragment = document.createDocumentFragment();
            let groupsInFolders = new Set();

            const sortedFolderNames = Object.keys(folders).sort((a, b) =>
                folderComparator(a, b, folders[a], folders[b])
             );

            sortedFolderNames.forEach(folderName => {
                const folder = folders[folderName];
                const folderElement = document.createElement('div');
                folderElement.className = 'folder-item';
                folderElement.dataset.folder = folderName;
                const folderGroupCount = Object.keys(folder.groups || {}).length;
                const isExpanded = false; // Default closed
                const iconClass = isExpanded ? 'fa-chevron-up rotated' : 'fa-chevron-down';

                folderElement.innerHTML = `
                <div class="folder-header">
                    <div class="folder-title">
                        <i class="fas fa-folder"></i>
                        <span>${folderName}<span class="folder-count">(${folderGroupCount})</span></span>
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
                </div>`;

                const folderContentUl = folderElement.querySelector('.folder-content ul');
                if (folder.groups && folderGroupCount > 0) {
                     const sortedGroupNames = Object.keys(folder.groups).sort((a, b) =>
                         groupComparator(a, b, folder.groups[a], folder.groups[b])
                     );
                     sortedGroupNames.forEach(groupName => {
                        groupsInFolders.add(groupName);
                        folderContentUl.appendChild(app.groups.createGroupListItem(groupName, folder.groups[groupName], folderName));
                    });
                } else {
                     folderContentUl.innerHTML = '<li class="empty-folder">This folder is empty.</li>';
                }
                fragment.appendChild(folderElement);
            });

            const standaloneGroupList = document.createElement('ul');
            standaloneGroupList.className = 'standalone-groups-list';
            let standaloneGroupsExist = false;

            const sortedStandaloneGroupNames = Object.keys(tabGroups)
                .filter(name => !groupsInFolders.has(name))
                .sort((a, b) => groupComparator(a, b, tabGroups[a], tabGroups[b]));

            sortedStandaloneGroupNames.forEach(name => {
                standaloneGroupsExist = true;
                const group = tabGroups[name];
                const groupLi = app.groups.createGroupListItem(name, group);
                standaloneGroupList.appendChild(groupLi);
            });

            if (standaloneGroupsExist) {
                fragment.appendChild(standaloneGroupList);
            }

            app.elements.groupsList.innerHTML = '';
            if (fragment.hasChildNodes()) {
                 app.elements.groupsList.appendChild(fragment);
            } else {
                 if (app.elements.searchInput.value.trim() !== '') {
                      app.elements.groupsList.innerHTML = '<div class="no-results">No matching groups or folders found.</div>';
                 } else {
                      app.elements.groupsList.innerHTML = '<div class="empty-message">No tab groups saved yet. Click the "+" button to save your current tabs, or the "Create Folder" button above to start organizing.</div>';
                 }
            }

            if(app.utils && app.utils.updateSavedItemsCount) app.utils.updateSavedItemsCount();
        });
    });
};

app.groups.handleSearchDebounced = app.utils.debounce((searchTerm) => {
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
        const sortOrder = app.state.groupSortOrder || 'dateDesc'; // Use current sort order

        // Comparators (same as in loadSavedGroups)
        const groupComparator = (nameA, nameB, dataA, dataB) => { /* ... copy from loadSavedGroups ... */
             switch (sortOrder) {
                case 'nameAsc': return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
                case 'nameDesc': return nameB.localeCompare(nameA, undefined, { sensitivity: 'base' });
                case 'tabsAsc': return (dataA.tabs?.length || 0) - (dataB.tabs?.length || 0);
                case 'tabsDesc': return (dataB.tabs?.length || 0) - (dataA.tabs?.length || 0);
                case 'dateAsc': return (dataA.dateAdded || dataA.dateCreated || 0) - (dataB.dateAdded || dataB.dateCreated || 0);
                case 'dateDesc': default: return (dataB.dateAdded || dataB.dateCreated || 0) - (dataA.dateAdded || dataA.dateCreated || 0);
            }
        };
        const folderComparator = (nameA, nameB, dataA, dataB) => { /* ... copy from loadSavedGroups ... */
             switch (sortOrder) {
                 case 'nameAsc': return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
                 case 'nameDesc': return nameB.localeCompare(nameA, undefined, { sensitivity: 'base' });
                 case 'dateAsc': return (dataA.dateCreated || 0) - (dataB.dateCreated || 0);
                 case 'dateDesc': return (dataB.dateCreated || 0) - (dataA.dateCreated || 0);
                 case 'tabsAsc': case 'tabsDesc':
                    const countA = dataA.groups ? Object.keys(dataA.groups).length : 0;
                    const countB = dataB.groups ? Object.keys(dataB.groups).length : 0;
                    return sortOrder === 'tabsAsc' ? countA - countB : countB - countA;
                 default: return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
             }
        };

        // Filter folders and their groups
        Object.entries(folders).forEach(([folderName, folder]) => {
            let folderNameMatches = folderName.toLowerCase().includes(lowerSearchTerm);
            let matchingGroupsInFolder = {};
            let groupMatchFound = false;
             if (folder.groups) {
                Object.entries(folder.groups).forEach(([groupName, group]) => {
                    // Check if group name OR any tab title/url within the group matches
                    let tabMatch = group.tabs?.some(tab =>
                        (tab.title && tab.title.toLowerCase().includes(lowerSearchTerm)) ||
                        (tab.url && tab.url.toLowerCase().includes(lowerSearchTerm))
                    );
                    if (groupName.toLowerCase().includes(lowerSearchTerm) || tabMatch) {
                        matchingGroupsInFolder[groupName] = group;
                        groupMatchFound = true;
                    }
                });
            }
             if (folderNameMatches || groupMatchFound) {
                // If folder name matches, include all its groups; otherwise, include only matching groups
                filteredFolders[folderName] = { ...folder, groups: folderNameMatches ? folder.groups : matchingGroupsInFolder };
                Object.keys(filteredFolders[folderName].groups || {}).forEach(gn => groupsInFilteredFolders.add(gn));
            }
        });

        // Filter standalone groups
        Object.entries(tabGroups).forEach(([name, group]) => {
            if (!groupsInFilteredFolders.has(name)) { // Avoid duplicates if group was already included via folder search
                 let tabMatch = group.tabs?.some(tab =>
                    (tab.title && tab.title.toLowerCase().includes(lowerSearchTerm)) ||
                    (tab.url && tab.url.toLowerCase().includes(lowerSearchTerm))
                 );
                 if (name.toLowerCase().includes(lowerSearchTerm) || tabMatch) {
                    filteredGroups[name] = group;
                }
            }
        });

        // Render Filtered Results
        const fragment = document.createDocumentFragment();
        let resultsFound = false;

        // Sort and Render filtered folders
         const sortedFilteredFolderNames = Object.keys(filteredFolders).sort((a, b) =>
             folderComparator(a, b, filteredFolders[a], filteredFolders[b])
         );
         sortedFilteredFolderNames.forEach(folderName => {
             resultsFound = true;
             const folder = filteredFolders[folderName];
             const folderElement = document.createElement('div');
             folderElement.className = 'folder-item'; folderElement.dataset.folder = folderName;
             const folderGroupCount = Object.keys(folder.groups || {}).length;
             // Expand folders automatically in search results
             folderElement.innerHTML = `
                 <div class="folder-header">
                     <div class="folder-title"><i class="fas fa-folder"></i> <span>${folderName}</span> <span class="folder-count">(${folderGroupCount})</span></div>
                     <div class="folder-header-actions">
                        <button class="action-button edit-folder-btn" title="Edit Folder"><i class="fas fa-edit"></i></button>
                        <button class="action-button toggle-folder-btn" title="Expand/Collapse"><i class="fas fa-chevron-up rotated"></i></button> </div>
                 </div>
                 <div class="folder-content expanded"> <ul></ul> <div class="folder-actions"><button class="action-button delete-folder-btn"><i class="fas fa-trash"></i> Delete Folder</button></div> </div>`;

             const folderContentUl = folderElement.querySelector('.folder-content ul');
            if (folder.groups && folderGroupCount > 0) {
                 // Sort groups within the filtered folder
                 const sortedGroupNames = Object.keys(folder.groups).sort((a, b) =>
                    groupComparator(a, b, folder.groups[a], folder.groups[b])
                 );
                 sortedGroupNames.forEach(groupName => {
                     folderContentUl.appendChild(app.groups.createGroupListItem(groupName, folder.groups[groupName], folderName));
                 });
            } else {
                // This case should ideally not happen if groupMatchFound was true,
                // but handle it just in case.
                folderContentUl.innerHTML = '<li class="empty-folder">No matching groups inside.</li>';
            }
             fragment.appendChild(folderElement);
        });

        // Sort and Render filtered standalone groups
         const standaloneGroupList = document.createElement('ul'); standaloneGroupList.className = 'standalone-groups-list';
         const sortedFilteredGroupNames = Object.keys(filteredGroups).sort((a, b) =>
            groupComparator(a, b, filteredGroups[a], filteredGroups[b])
         );
         sortedFilteredGroupNames.forEach(name => {
             resultsFound = true;
             standaloneGroupList.appendChild(app.groups.createGroupListItem(name, filteredGroups[name]));
         });
         if (standaloneGroupList.hasChildNodes()) { fragment.appendChild(standaloneGroupList); }

        // Display results
         app.elements.groupsList.innerHTML = '';
         if (resultsFound) { app.elements.groupsList.appendChild(fragment); }
         else { app.elements.groupsList.innerHTML = '<div class="no-results">No matching groups or folders found.</div>'; }
    });
}, 300); // 300ms debounce

app.groups.openTabGroup = function(group) {
    if (group && group.tabs && group.tabs.length > 0) {
        chrome.windows.create({ url: group.tabs.map(tab => tab.url) }, (newWindow) => {
            console.log(`Opened group in new window ${newWindow.id}`);
        });
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
            // Remove from standalone groups if it exists there
            if (tabGroups[name]) {
                delete tabGroups[name];
                changed = true;
            }
            // Remove from the specific folder if applicable
            if (folderName && folders[folderName] && folders[folderName].groups && folders[folderName].groups[name]) {
                delete folders[folderName].groups[name];
                changed = true;
            }
            // It's possible a group exists standalone AND in a folder if data is inconsistent.
            // The above logic handles removing it from both potential locations based on context.

            if (changed) {
                chrome.storage.local.set({ tabGroups, folders }, () => {
                     app.groups.loadSavedGroups(); // Refresh the list
                    app.utils.updateSavedItemsCount(); // Update overall count
                });
            } else {
                 console.warn(`Group "${name}" not found for deletion (folder context: ${folderName}).`);
                 app.utils.showCustomAlert(`Group "${name}" was not found.`); // Use utility
            }
        });
    });
};

app.groups.deleteFolder = function(folderName) {
     chrome.storage.local.get('folders', ({ folders = {} }) => {
        const folder = folders[folderName];
        if (!folder) {
            app.utils.showCustomAlert(`Folder "${folderName}" not found.`);
            return;
        }
        const groupCount = folder.groups ? Object.keys(folder.groups).length : 0;
        const message = groupCount > 0
            ? `Delete folder "${folderName}"? The ${groupCount} group(s) inside will NOT be deleted and will become standalone groups.`
            : `Delete empty folder "${folderName}"?`;

         app.utils.showCustomConfirm(message, () => { // Use utility
            delete folders[folderName];
            // Note: Groups previously inside the folder remain in the main 'tabGroups' storage.
            // They will now appear as standalone groups upon refresh.
            chrome.storage.local.set({ folders }, () => {
                app.groups.loadSavedGroups(); // Refresh to show groups as standalone
                app.utils.updateSavedItemsCount(); // Update count
            });
        });
    });
};


// --- Folder Dialog Logic ---
// (populateGroupSelection, createNewFolder, openEditFolderDialog, saveEditedFolder, renameTabGroup - mostly same, check folder logic)

app.groups.populateGroupSelection = function(containerElement, selectedGroups = [], currentFolderName = null) {
    const selectedSet = new Set(selectedGroups);
    chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
         const fragment = document.createDocumentFragment();
         let availableGroups = {}; // Combine standalone and groups from *other* folders

         // Add all standalone groups
         Object.assign(availableGroups, tabGroups);

         // Add groups from other folders (unless editing the current folder)
         Object.entries(folders).forEach(([fName, folderData]) => {
             if (fName !== currentFolderName && folderData.groups) {
                 Object.entries(folderData.groups).forEach(([gName, groupData]) => {
                     // Avoid adding if a standalone group with the same name exists (prefer standalone)
                     if (!availableGroups[gName]) {
                         // Add with an indicator of its origin folder? Optional.
                         // availableGroups[gName] = { ...groupData, originFolder: fName };
                         // For now, just add the group data. If names clash across folders, this might need refinement.
                         availableGroups[gName] = groupData;
                     }
                 });
             }
         });


        const sortedGroupNames = Object.keys(availableGroups).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

        if (sortedGroupNames.length === 0) {
            containerElement.innerHTML = '<div class="empty-selection">No other tab groups available to add.</div>';
            return;
        }

        sortedGroupNames.forEach((name, index) => {
            const item = document.createElement('div');
            item.className = 'group-check-item';
            const checkboxId = `group-check-${containerElement.id}-${index}`;
            item.innerHTML = `
                <input type="checkbox" class="group-checkbox" data-name="${name}" id="${checkboxId}" ${selectedSet.has(name) ? 'checked' : ''}>
                <label for="${checkboxId}" class="group-name">${name}</label>
                ${availableGroups[name].originFolder ? `<span class="origin-folder">(in ${availableGroups[name].originFolder})</span>` : ''}
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

    const selectedGroupNames = Array.from(app.elements.groupSelection.querySelectorAll('.group-checkbox:checked'))
        .map(checkbox => checkbox.dataset.name);

    chrome.storage.local.get(['folders', 'tabGroups'], ({ folders = {}, tabGroups = {} }) => {
        if (folders[folderName]) {
            app.utils.showCustomAlert(`A folder named "${folderName}" already exists. Please choose a different name.`);
             app.elements.folderNameInput.focus();
            return;
        }

        const newFolderGroups = {};
        let groupsToRemoveFromStandalone = [];

        selectedGroupNames.forEach(groupName => {
            // Find the group data (could be standalone or from another folder - though populate logic aims for standalone first)
            let groupData = tabGroups[groupName];
            // If not found standalone, check if it was listed from another folder (less common scenario now)
            if (!groupData) {
                 for (const f of Object.values(folders)) {
                     if (f.groups && f.groups[groupName]) {
                         groupData = f.groups[groupName];
                         // Decide if you want to *move* it from the other folder or *copy* it.
                         // Current logic implies moving from standalone if present. Let's stick to that.
                         console.warn(`Group "${groupName}" selected for new folder was found in another folder, but not standalone. Prioritizing standalone.`);
                         break;
                     }
                 }
            }


            if (groupData) {
                 newFolderGroups[groupName] = groupData;
                 // If the group existed as a standalone group, mark it for removal from the top level
                 if (tabGroups[groupName]) {
                     groupsToRemoveFromStandalone.push(groupName);
                 }
            } else {
                 console.warn(`Selected group "${groupName}" not found in available groups during folder creation.`);
            }
        });

        // Create the new folder entry
        folders[folderName] = { groups: newFolderGroups, dateCreated: Date.now() };

        // Remove the groups from the top-level 'tabGroups' if they were moved
        groupsToRemoveFromStandalone.forEach(groupName => {
            delete tabGroups[groupName];
        });

        // Save both potentially modified structures
        chrome.storage.local.set({ folders, tabGroups }, () => {
            app.utils.hideCreateFolderDialog(); // Use utility
            app.groups.loadSavedGroups(); // Refresh the view
            app.utils.updateSavedItemsCount(); // Update count
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
        // Pass the current folder name to exclude its own groups from the "available" list initially
        app.groups.populateGroupSelection(app.elements.editGroupSelection, currentGroupNames, folderName);

        // Update select all button state based on populated checkboxes
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

    const selectedGroupNames = Array.from(app.elements.editGroupSelection.querySelectorAll('.group-checkbox:checked'))
        .map(checkbox => checkbox.dataset.name);

    chrome.storage.local.get(['folders', 'tabGroups'], ({ folders = {}, tabGroups = {} }) => {
         // Check for name conflict only if the name actually changed
         if (newFolderName !== originalFolderName && folders[newFolderName]) {
             app.utils.showCustomAlert(`A folder named "${newFolderName}" already exists.`); app.elements.editFolderName.focus(); return;
         }
         // Ensure the original folder still exists (e.g., wasn't deleted in another tab)
         if (!folders[originalFolderName]) {
             console.error("Original folder not found during save:", originalFolderName); app.utils.showCustomAlert("Error: Original folder seems to have been deleted."); app.utils.hideEditFolderDialog(); app.groups.loadSavedGroups(); return;
         }

         const originalFolderGroups = folders[originalFolderName].groups || {};
         const updatedFolderGroups = {};
         let groupsToAddFromStandalone = [];
         let groupsToRemoveFromFolder = []; // Groups unchecked in the dialog

         // Identify groups that were originally in the folder
         const originalGroupNamesSet = new Set(Object.keys(originalFolderGroups));
         // Identify groups selected in the dialog
         const selectedGroupNamesSet = new Set(selectedGroupNames);

         // Process selected groups: keep existing, add new ones
         selectedGroupNames.forEach(groupName => {
             if (originalGroupNamesSet.has(groupName)) {
                 // Group was already in the folder, keep it
                 updatedFolderGroups[groupName] = originalFolderGroups[groupName];
             } else {
                 // Group is newly selected, find its data (should be standalone)
                 let groupData = tabGroups[groupName];
                 if (groupData) {
                     updatedFolderGroups[groupName] = groupData;
                     groupsToAddFromStandalone.push(groupName); // Mark for removal from standalone
                 } else {
                     console.warn(`Newly selected group "${groupName}" not found in standalone groups during folder edit.`);
                     // Optionally try finding it in other folders, but this complicates the move/copy logic.
                     // Best practice is likely that populateGroupSelection only shows available standalone groups.
                 }
             }
         });

         // Identify groups to remove (were in original, but not in selected)
         originalGroupNamesSet.forEach(groupName => {
             if (!selectedGroupNamesSet.has(groupName)) {
                 groupsToRemoveFromFolder.push(groupName);
             }
         });

         // Prepare the final folder data
         const folderDataToSave = {
            groups: updatedFolderGroups,
            dateCreated: folders[originalFolderName].dateCreated, // Preserve original creation date
            dateModified: Date.now() // Update modified date
         };

         // Update the folders object
         let updatedFolders = { ...folders };
         if (newFolderName !== originalFolderName) {
             delete updatedFolders[originalFolderName]; // Remove old entry if renamed
         }
         updatedFolders[newFolderName] = folderDataToSave; // Add/update the folder

         // Update the standalone tabGroups object
         let updatedTabGroups = { ...tabGroups };
         // Remove groups added to the folder from standalone
         groupsToAddFromStandalone.forEach(groupName => {
             delete updatedTabGroups[groupName];
         });
         // Add groups removed from the folder back to standalone
         groupsToRemoveFromFolder.forEach(groupName => {
             if (originalFolderGroups[groupName]) { // Ensure we have the data
                 updatedTabGroups[groupName] = originalFolderGroups[groupName];
             }
         });


         // Save all changes
         chrome.storage.local.set({ folders: updatedFolders, tabGroups: updatedTabGroups }, () => {
            app.utils.hideEditFolderDialog(); // Use utility
            app.groups.loadSavedGroups(); // Refresh view
            app.utils.updateSavedItemsCount(); // Update count
        });
    });
};

app.groups.renameTabGroup = function(oldName, newName, folderName, callback) {
    newName = newName.trim();
    if (!newName || newName === oldName) {
        console.log("Rename cancelled: Name unchanged or empty.");
        if (callback) callback(false, "Name unchanged or empty.");
        return;
    }

    chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
        let groupData;
        let storageUpdates = {}; // Object to hold changes for chrome.storage.local.set

        if (folderName) {
            // --- Renaming within a folder ---
            if (!folders[folderName] || !folders[folderName].groups) {
                 console.error(`Folder "${folderName}" not found for renaming group.`);
                 if (callback) callback(false, "Parent folder not found.");
                 return;
            }
            // Check for name conflict within the *same* folder
            if (folders[folderName].groups[newName]) {
                app.utils.showCustomAlert(`A group named "${newName}" already exists in the folder "${folderName}".`);
                if (callback) callback(false, "Name conflict in folder.");
                return;
            }
            if (!folders[folderName].groups[oldName]) {
                 console.error(`Group "${oldName}" not found in folder "${folderName}".`);
                 if (callback) callback(false, "Original group not found in folder.");
                 return;
            }

            groupData = folders[folderName].groups[oldName];
            // Prepare update for the 'folders' storage key
            let updatedFolder = { ...folders[folderName] }; // Clone folder data
            updatedFolder.groups = { ...updatedFolder.groups }; // Clone groups within folder
            delete updatedFolder.groups[oldName]; // Remove old name
            updatedFolder.groups[newName] = groupData; // Add new name
            updatedFolder.dateModified = Date.now(); // Update folder modified time

            storageUpdates.folders = { ...folders, [folderName]: updatedFolder }; // Update the specific folder in the main folders object

        } else {
            // --- Renaming a standalone group ---
            // Check for conflict with other *standalone* groups
            if (tabGroups[newName]) {
                app.utils.showCustomAlert(`A standalone group named "${newName}" already exists.`);
                if (callback) callback(false, "Name conflict (standalone).");
                return;
            }
             if (!tabGroups[oldName]) {
                 console.error(`Standalone group "${oldName}" not found.`);
                 if (callback) callback(false, "Original standalone group not found.");
                 return;
             }

            groupData = tabGroups[oldName];
            // Prepare update for the 'tabGroups' storage key
            let updatedTabGroups = { ...tabGroups }; // Clone standalone groups
            delete updatedTabGroups[oldName]; // Remove old name
            updatedTabGroups[newName] = groupData; // Add new name
            // Note: Standalone groups don't have a 'dateModified' field in this structure

            storageUpdates.tabGroups = updatedTabGroups; // Update the standalone groups object
        }

        // Save the changes
        chrome.storage.local.set(storageUpdates, () => {
            if (chrome.runtime.lastError) {
                console.error("Error saving renamed group:", chrome.runtime.lastError);
                 app.utils.showCustomAlert("An error occurred while saving the name change.");
                if (callback) callback(false, "Storage error");
            } else {
                console.log(`Group "${oldName}" successfully renamed to "${newName}" ${folderName ? 'in folder "' + folderName + '"' : '(standalone)'}.`);
                if (callback) callback(true); // Indicate success
            }
        });
    });
};


app.groups.clearSearch = function() {
    app.elements.searchInput.value = '';
    app.elements.clearSearchBtn.classList.remove('visible');
    // Only reload if the groups section is currently active
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
        const groupLi = target.closest('li.group-list-item[data-group]'); // More specific selector
        const folderItem = target.closest('.folder-item[data-folder]');
        const folderHeader = target.closest('.folder-header');
        const detailedTab = target.closest('.detailed-tab-item');
        const groupNameSpan = target.closest('.group-name');
        const editIcon = target.closest('.edit-group-icon');

        // Action Buttons
        const openBtn = target.closest('.open-btn');
        const deleteGroupBtn = target.closest('.delete-btn');
        const toggleDetailsBtn = target.closest('.toggle-details-btn');
        const editFolderBtn = target.closest('.edit-folder-btn');
        const toggleFolderBtn = target.closest('.toggle-folder-btn');
        const deleteFolderBtn = target.closest('.delete-folder-btn');

        // Inline Edit Buttons
        const saveEditBtn = target.closest('.save-edit-btn');
        const cancelEditBtn = target.closest('.cancel-edit-btn');

        // Prevent actions if editing (unless it's save/cancel)
        if (groupLi && groupLi.classList.contains('editing')) {
             if (!saveEditBtn && !cancelEditBtn && !target.closest('.group-name-input')) {
                 e.stopPropagation();
                 return;
             }
        }

        // Handle clicking a tab in the detailed list
        if (detailedTab && detailedTab.dataset.url) {
            e.stopPropagation();
            const urlToOpen = detailedTab.dataset.url;
            console.log('Opening individual tab:', urlToOpen);
            chrome.tabs.create({ url: urlToOpen, active: true });
            return;
        }

        // Handle Folder Toggles
         const handleToggleFolder = (contentElement, iconElement) => {
              if (contentElement && iconElement) {
                 const isExpanding = !contentElement.classList.contains('expanded');
                 contentElement.classList.toggle('expanded', isExpanding);
                 iconElement.classList.toggle('rotated', isExpanding);
                 iconElement.classList.toggle('fa-chevron-down', !isExpanding);
                 iconElement.classList.toggle('fa-chevron-up', isExpanding);
             }
         };
         if (toggleFolderBtn && folderItem) { e.stopPropagation(); const fc = folderItem.querySelector('.folder-content'); const i = toggleFolderBtn.querySelector('i'); handleToggleFolder(fc, i); return; }
         if (folderHeader && folderItem && !target.closest('.folder-header-actions button')) { const fc = folderItem.querySelector('.folder-content'); const i = folderHeader.querySelector('.toggle-folder-btn i'); handleToggleFolder(fc, i); return; }

         // Handle Folder Edit/Delete
         if (editFolderBtn && folderItem) { e.stopPropagation(); const fn=folderItem.dataset.folder; if(fn) app.groups.openEditFolderDialog(fn); return; }
         if (deleteFolderBtn && folderItem) { e.stopPropagation(); const fn=folderItem.dataset.folder; if(fn) app.groups.deleteFolder(fn); return; }


        // --- Handle Group-Specific Actions (Requires groupLi) ---
        if (!groupLi) return;

        const groupName = groupLi.dataset.group;
        const folderName = groupLi.dataset.folder; // null if standalone

        // Toggle Group Details List
        if (toggleDetailsBtn) {
            e.stopPropagation();
            const detailsDiv = groupLi.querySelector('.group-details');
            const icon = toggleDetailsBtn.querySelector('i');
            if (detailsDiv && icon) {
                const isExpanding = !detailsDiv.classList.contains('expanded');
                detailsDiv.classList.toggle('expanded', isExpanding);
                icon.classList.toggle('rotated', isExpanding);
                icon.classList.toggle('fa-chevron-down', !isExpanding);
                icon.classList.toggle('fa-chevron-up', isExpanding);
            }
            return;
        }

        // Initiate Inline Group Name Edit
        if (editIcon || groupNameSpan) {
            e.stopPropagation();
            const nameContainer = groupLi.querySelector('.group-name-container');
            const currentNameSpan = nameContainer.querySelector('.group-name');
            if (!currentNameSpan) return; // Already editing
            const currentName = currentNameSpan.textContent;

            if (groupLi.classList.contains('editing')) return;
            groupLi.classList.add('editing');

            nameContainer.innerHTML = `
                <div class="group-name-edit-container">
                    <input type="text" class="group-name-input" value="${currentName}" />
                    <div class="edit-actions">
                        <button class="save-edit-btn" title="Save Name"><i class="fas fa-check"></i></button>
                        <button class="cancel-edit-btn" title="Cancel Edit"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            `;
            const inputField = nameContainer.querySelector('.group-name-input');
            inputField.focus();
            inputField.select();

             const handleEditKeydown = (keyEvent) => {
                 if (keyEvent.key === 'Enter') {
                     keyEvent.preventDefault(); // Prevent form submission if applicable
                     nameContainer.querySelector('.save-edit-btn')?.click();
                 } else if (keyEvent.key === 'Escape') {
                     nameContainer.querySelector('.cancel-edit-btn')?.click();
                 }
             };
             inputField.addEventListener('keydown', handleEditKeydown);
             // Store handler reference for removal
             inputField.dataset.keydownHandlerAttached = 'true';
             inputField._handleEditKeydown = handleEditKeydown;


            return;
        }

        // Save Inline Group Name Edit
        if (saveEditBtn) {
            e.stopPropagation();
            const nameContainer = groupLi.querySelector('.group-name-container');
            const inputField = nameContainer.querySelector('.group-name-input');
            const newName = inputField.value.trim();
            const originalName = groupLi.dataset.group;

            if (newName && newName !== originalName) {
                 app.groups.renameTabGroup(originalName, newName, folderName, (success, errorMsg) => {
                     if (success) {
                         // Reloading is the safest way to ensure UI consistency after rename
                         app.groups.loadSavedGroups();
                         // If not reloading, manually update UI:
                         // nameContainer.innerHTML = `<span class="group-name" title="Click to edit name">${newName}</span><i class="fas fa-pencil-alt edit-group-icon" title="Edit name"></i>`;
                         // groupLi.dataset.group = newName;
                         // groupLi.classList.remove('editing');
                         // if(inputField && inputField.dataset.keydownHandlerAttached === 'true') {
                         //    inputField.removeEventListener('keydown', inputField._handleEditKeydown);
                         // }
                     } else {
                         console.error("Rename failed:", errorMsg);
                         // Error alert is shown by renameTabGroup, keep input focused
                         inputField.focus();
                     }
                 });

            } else if (newName === originalName) { // Name didn't change, just cancel
                 cancelEditBtn?.click(); // Simulate cancel click
                 // Or manually revert UI:
                 // nameContainer.innerHTML = `<span class="group-name" title="Click to edit name">${originalName}</span><i class="fas fa-pencil-alt edit-group-icon" title="Edit name"></i>`;
                 // groupLi.classList.remove('editing');
                 // if(inputField && inputField.dataset.keydownHandlerAttached === 'true') {
                 //    inputField.removeEventListener('keydown', inputField._handleEditKeydown);
                 // }
            } else {
                app.utils.showCustomAlert("Group name cannot be empty.");
                 inputField.focus();
            }
            return;
        }

        // Cancel Inline Group Name Edit
        if (cancelEditBtn) {
            e.stopPropagation();
            const nameContainer = groupLi.querySelector('.group-name-container');
            const originalName = groupLi.dataset.group;
            const inputField = nameContainer.querySelector('.group-name-input');

            nameContainer.innerHTML = `
                <span class="group-name" title="Click to edit name">${originalName}</span>
                <i class="fas fa-pencil-alt edit-group-icon" title="Edit name"></i>
            `;
            groupLi.classList.remove('editing');
            if(inputField && inputField.dataset.keydownHandlerAttached === 'true') {
               inputField.removeEventListener('keydown', inputField._handleEditKeydown);
            }
            return;
        }

        // Handle Standard Group Open/Delete
        if (openBtn) {
             console.log("Open button clicked for group:", groupName);
             chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
                 const groupData = folderName ? folders[folderName]?.groups?.[groupName] : tabGroups[groupName];
                 if (groupData) app.groups.openTabGroup(groupData);
                 else { console.error(`Data not found for group: ${groupName} in folder: ${folderName}`); app.utils.showCustomAlert("Error: Could not find data for this group."); }
             });
             return;
         }
         if (deleteGroupBtn) {
            console.log("Delete button clicked for group:", groupName);
             app.groups.deleteTabGroup(groupName, folderName);
             return;
         }

    }); // End of groupsList listener

    // --- Listeners for static elements ---

    // Add Group Dropdown listeners
    app.elements.addButton.addEventListener('click', app.groups.showSaveDropdown);
    app.elements.closeDropdownBtn.addEventListener('click', () => app.elements.saveDropdown.style.display = 'none');
    app.elements.saveTabsButton.addEventListener('click', app.groups.saveSelectedTabs);
    app.elements.selectAllBtn.addEventListener('click', () => app.utils.toggleSelectAll(app.elements.tabsChecklist, app.elements.selectAllBtn, '.tab-checkbox'));

    // Create Folder Dialog listeners (triggered by header button now)
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

     // NEW: Listener for the "Create Folder" button in the Groups section header
     app.elements.createFolderHeaderBtn.addEventListener('click', () => {
         app.utils.hideAllModalDialogs(); // Close others first
         app.groups.populateGroupSelection(app.elements.groupSelection); // Populate with available standalone groups
         app.elements.selectAllGroupsBtn.textContent = 'Select All'; // Reset button text
         app.elements.folderDialog.style.display = 'block';
         app.elements.folderNameInput.value = ''; // Clear previous input
         app.elements.folderNameInput.focus();
     });

     // Sort Select Listener
     const sortSelect = document.getElementById('sortGroupsSelect');
     if (sortSelect) {
         const sortControls = document.querySelector('.group-sort-controls');
         if(sortControls) sortControls.style.display = 'flex'; // Ensure visible

         sortSelect.value = app.state.groupSortOrder || 'dateDesc'; // Set initial value

         sortSelect.addEventListener('change', (e) => {
             app.state.groupSortOrder = e.target.value; // Update global state
             console.log("Sort order changed to:", app.state.groupSortOrder);

             const searchTerm = app.elements.searchInput.value.trim();
             if (searchTerm) {
                 // Re-run search which now uses the updated sort order
                 console.log("Re-applying search with new sort");
                 app.groups.handleSearchDebounced(searchTerm);
             } else {
                 // Reload the full list with the new sort order
                 console.log("Reloading group list with new sort");
                 app.groups.loadSavedGroups();
             }
         });
         console.log("Sort controls listener added.");
     } else {
         console.warn("Sort select element (#sortGroupsSelect) not found in the DOM.");
     }
};

console.log("groups.js loaded");
