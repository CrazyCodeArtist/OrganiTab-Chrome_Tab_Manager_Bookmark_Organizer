/*Tab Group and Folder Management Logic*/

var app = app || {};
app.groups = {};
app.groups.currentlyEditingGroup = null; // Track inline editing state

// --- Group Saving Logic ---
// (showSaveDropdown, populateTabsChecklist, saveSelectedTabs - remain largely the same)
app.groups.showSaveDropdown = function () {
    app.utils.hideAllModalDialogs(); // Use utility function
    app.groups.populateTabsChecklist();
    // Instead of direct style, use utility to show the modal overlay
    app.utils.showModal('saveDropdown');
    app.elements.groupNameInput.focus();
};

app.groups.populateTabsChecklist = function () {
    const fragment = document.createDocumentFragment();
    app.state.currentTabs.forEach((tab) => {
        // Filter out internal chrome pages
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
            return;
        }
        const item = document.createElement('div');
        item.className = 'tab-item'; // Used by CSS
        item.style.display = 'flex';
        item.style.flexDirection = 'row';
        item.style.alignItems = 'center';
        item.style.gap = '10px';
        item.style.padding = '7px 16px';
        item.style.borderBottom = '1px solid #f2f2f2';
        item.innerHTML = `
            <input type="checkbox" class="tab-checkbox" checked data-tab-id="${tab.id}" id="tab-check-${tab.id}">
            <img class="favicon" src="${tab.favIconUrl || 'icon.png'}" onerror="this.src='icon.png'" alt="">
            <label class="tab-title" for="tab-check-${tab.id}">${tab.title || tab.url}</label>
        `;
        fragment.appendChild(item);
    });
    app.elements.tabsChecklist.innerHTML = ''; // Clear previous
    app.elements.tabsChecklist.appendChild(fragment);
    app.elements.selectAllBtn.textContent = 'Deselect All'; // Default state
    app.elements.selectAllBtn.dataset.selected = "true"; // Track state for toggling
};

app.groups.saveSelectedTabs = function () {
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
            // Ensure basic tab structure is saved
            selectedTabs.push({
                url: tab.url,
                title: tab.title || tab.url, // Fallback title
                favIconUrl: tab.favIconUrl || '' // Fallback favicon
            });
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
            app.utils.hideModal('saveDropdown'); // Hide modal using utility
            app.elements.groupNameInput.value = '';
            if (app.state.activeSection === 'groups') {
                app.groups.loadSavedGroups(); // Refresh
            }
            app.utils.updateSavedItemsCount(); // Use utility
        });
    });
};


// --- Group/Folder Rendering & Management ---

// *** NEW createGroupListItem function implementing the requested layout ***
app.groups.createGroupListItem = function (name, group, folderName = null) {
    const li = document.createElement('li');
    li.className = 'group-list-item'; // Main container class
    li.dataset.group = name;
    if (folderName) {
        li.dataset.folder = folderName;
    }

    const date = new Date(group.dateAdded || Date.now());
    const formattedDate = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const tabCount = group.tabs ? group.tabs.length : 0;

    // Main visible part (Flex container)
    const groupItemMain = document.createElement('div');
    groupItemMain.className = 'group-item-main';

    // Left side: Info (Name, Status, Open All Button)
    const groupInfoDiv = document.createElement('div');
    groupInfoDiv.className = 'group-info';
    groupInfoDiv.innerHTML = `
        <span class="group-name">${name}</span>
        <span class="group-status">${tabCount} tab${tabCount !== 1 ? 's' : ''} <span>|</span> ${formattedDate}</span>
        <button class="open-group-button subtle-button">
            <i class="fas fa-external-link-alt"></i> Open All (${tabCount})
        </button>
    `;

    // Right side: Actions (Edit Tabs, Rename, Delete, Expand)
    const groupActionsDiv = document.createElement('div');
    groupActionsDiv.className = 'group-actions';
    groupActionsDiv.innerHTML = `
        <button class="edit-group-button icon-button edit" title="Edit Tabs">
            <i class="fas fa-list-ul"></i>
        </button>
        <button class="rename-group-button icon-button rename" title="Rename Group">
            <i class="fas fa-pencil-alt"></i>
        </button>
        <button class="delete-group-button icon-button danger" title="Delete Group">
            <i class="fas fa-trash"></i>
        </button>
        <button class="expand-group-button icon-button" title="Show/Hide Tabs List">
            <i class="fas fa-chevron-down"></i>
        </button>
    `;

    // Assemble the main visible part
    groupItemMain.appendChild(groupInfoDiv);
    groupItemMain.appendChild(groupActionsDiv);

    // Hidden Tab List Section (populated on demand or initially)
    const tabListDiv = document.createElement('ul'); // Use UL for semantic list
    tabListDiv.className = 'tab-list'; // Initially hidden by CSS (max-height: 0)

    if (group.tabs && group.tabs.length > 0) {
        group.tabs.forEach(tab => {
            const tabLi = document.createElement('li');
            tabLi.className = 'tab-list-item';
            // Store URL directly on the element for easy access on click
            tabLi.dataset.url = tab.url;
            tabLi.innerHTML = `
                <img class="favicon" src="${tab.favIconUrl || 'icon.png'}" onerror="this.src='icon.png'" alt="">
                <div class="tab-details">
                     <span class="tab-title" title="${tab.title || tab.url}">${tab.title || 'No Title'}</span>
                     <span class="tab-url" title="${tab.url}">${tab.url}</span>
                </div>
            `;
            tabListDiv.appendChild(tabLi);
        });
    } else {
        tabListDiv.innerHTML = '<li class="empty-group-message">No tabs in this group.</li>';
    }

    // Add parts to the main list item (li)
    li.appendChild(groupItemMain); // Visible part
    li.appendChild(tabListDiv);    // Hidden details part

    return li;
};


app.groups.loadSavedGroups = function () {
    chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
        const sortOrder = app.state.groupSortOrder || 'dateDesc';

        const groupComparator = (nameA, nameB, dataA, dataB) => {
            // Add null/undefined checks for safety
            const tabsA = dataA?.tabs?.length || 0;
            const tabsB = dataB?.tabs?.length || 0;
            const dateA = dataA?.dateAdded || dataA?.dateCreated || 0;
            const dateB = dataB?.dateAdded || dataB?.dateCreated || 0;

            switch (sortOrder) {
                case 'nameAsc': return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
                case 'nameDesc': return nameB.localeCompare(nameA, undefined, { sensitivity: 'base' });
                case 'tabsAsc': return tabsA - tabsB;
                case 'tabsDesc': return tabsB - tabsA;
                case 'dateAsc': return dateA - dateB;
                case 'dateDesc': default: return dateB - dateA;
            }
        };

        const folderComparator = (nameA, nameB, dataA, dataB) => {
            const dateA = dataA?.dateCreated || 0;
            const dateB = dataB?.dateCreated || 0;
            const countA = dataA?.groups ? Object.keys(dataA.groups).length : 0;
            const countB = dataB?.groups ? Object.keys(dataB.groups).length : 0;

            switch (sortOrder) {
                case 'nameAsc': return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
                case 'nameDesc': return nameB.localeCompare(nameA, undefined, { sensitivity: 'base' });
                case 'dateAsc': return dateA - dateB;
                case 'dateDesc': return dateB - dateA;
                case 'tabsAsc': return countA - countB; // Sort folders by number of groups inside
                case 'tabsDesc': return countB - countA;
                default: return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' }); // Fallback to name sort
            }
        };

        requestAnimationFrame(() => {
            const fragment = document.createDocumentFragment();
            let groupsInFolders = new Set();

            const sortedFolderNames = Object.keys(folders).sort((a, b) =>
                folderComparator(a, b, folders[a], folders[b])
            );

            // Render Folders
            sortedFolderNames.forEach(folderName => {
                const folder = folders[folderName];
                const folderElement = document.createElement('div');
                folderElement.className = 'folder-item';
                folderElement.dataset.folder = folderName;
                const folderGroupCount = Object.keys(folder.groups || {}).length;
                const isExpanded = app.state.expandedFolders?.[folderName] || false; // Use state to remember expansion
                const iconClass = isExpanded ? 'fa-chevron-up rotated' : 'fa-chevron-down';

                folderElement.innerHTML = `
                <div class="folder-header">
                    <div class="folder-title">
                        <i class="fas fa-folder"></i>
                        <span>${folderName}<span class="folder-count">(${folderGroupCount})</span></span>
                    </div>
                    <div class="folder-header-actions">
                        <button class="action-button edit-folder-btn icon-button edit" title="Edit Folder"><i class="fas fa-edit"></i></button>
                        <button class="action-button toggle-folder-btn icon-button" title="Expand/Collapse"><i class="fas ${iconClass}"></i></button>
                    </div>
                </div>
                <div class="folder-content ${isExpanded ? 'expanded' : ''}">
                    <ul></ul>
                    <div class="folder-actions">
<button class="delete-folder-btn delete-button " title="Delete Folder Only (Groups Remain)" >
  <svg class="delete-svgIcon" viewBox="0 0 448 512"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"></path></svg>
</button></div>
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

            // Render Standalone Groups
            const standaloneGroupList = document.createElement('ul');
            standaloneGroupList.className = 'standalone-groups-list groups-list'; // Add groups-list for gap spacing
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

            // Update DOM
            app.elements.groupsList.innerHTML = '';
            if (fragment.hasChildNodes()) {
                app.elements.groupsList.appendChild(fragment);
            } else {
                const message = app.elements.searchInput.value.trim() !== ''
                    ? '<div class="no-results">No matching groups or folders found.</div>'
                    : '<div class="empty-message">No tab groups saved yet. Click "Save Open Tabs" or "Create Folder" to get started.</div>';
                app.elements.groupsList.innerHTML = message;
            }

            // Update counts after rendering
            if (app.utils && app.utils.updateSavedItemsCount) app.utils.updateSavedItemsCount();
        });
    });
};

// Debounced search handler - modified to use the new createGroupListItem
app.groups.handleSearchDebounced = app.utils.debounce((searchTerm) => {
    const lowerSearchTerm = searchTerm.trim().toLowerCase();

    if (lowerSearchTerm === '') {
        app.groups.clearSearch();
        return;
    }

    app.elements.clearSearchBtn.classList.add('visible');
    app.elements.searchContainer.style.display = 'block'; // Ensure search bar stays visible during search

    chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
        const filteredGroups = {};
        const filteredFolders = {};
        const groupsInFilteredFolders = new Set();
        const sortOrder = app.state.groupSortOrder || 'dateDesc'; // Use current sort order

        // Re-use comparators from loadSavedGroups
        const groupComparator = (nameA, nameB, dataA, dataB) => { /* ... copy from loadSavedGroups ... */
            const tabsA = dataA?.tabs?.length || 0; const tabsB = dataB?.tabs?.length || 0;
            const dateA = dataA?.dateAdded || dataA?.dateCreated || 0; const dateB = dataB?.dateAdded || dataB?.dateCreated || 0;
            switch (sortOrder) {
                case 'nameAsc': return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
                case 'nameDesc': return nameB.localeCompare(nameA, undefined, { sensitivity: 'base' });
                case 'tabsAsc': return tabsA - tabsB; case 'tabsDesc': return tabsB - tabsA;
                case 'dateAsc': return dateA - dateB; case 'dateDesc': default: return dateB - dateA;
            }
        };
        const folderComparator = (nameA, nameB, dataA, dataB) => { /* ... copy from loadSavedGroups ... */
            const dateA = dataA?.dateCreated || 0; const dateB = dataB?.dateCreated || 0;
            const countA = dataA?.groups ? Object.keys(dataA.groups).length : 0; const countB = dataB?.groups ? Object.keys(dataB.groups).length : 0;
            switch (sortOrder) {
                case 'nameAsc': return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
                case 'nameDesc': return nameB.localeCompare(nameA, undefined, { sensitivity: 'base' });
                case 'dateAsc': return dateA - dateB; case 'dateDesc': return dateB - dateA;
                case 'tabsAsc': return countA - countB; case 'tabsDesc': return countB - countA;
                default: return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
            }
        };

        // Filter folders and their groups (include folder if name matches OR any group/tab inside matches)
        Object.entries(folders).forEach(([folderName, folder]) => {
            let folderNameMatches = folderName.toLowerCase().includes(lowerSearchTerm);
            let matchingGroupsInFolder = {};
            let groupOrTabMatchFound = false;
            if (folder.groups) {
                Object.entries(folder.groups).forEach(([groupName, group]) => {
                    let groupNameMatches = groupName.toLowerCase().includes(lowerSearchTerm);
                    let tabMatch = group.tabs?.some(tab =>
                        (tab.title && tab.title.toLowerCase().includes(lowerSearchTerm)) ||
                        (tab.url && tab.url.toLowerCase().includes(lowerSearchTerm))
                    );
                    if (groupNameMatches || tabMatch) {
                        matchingGroupsInFolder[groupName] = group;
                        groupOrTabMatchFound = true;
                    }
                });
            }
            if (folderNameMatches || groupOrTabMatchFound) {
                // If folder name matches, keep all original groups; otherwise keep only matching ones
                const groupsToShow = folderNameMatches ? (folder.groups || {}) : matchingGroupsInFolder;
                if (Object.keys(groupsToShow).length > 0) { // Only add folder if it will contain groups
                    filteredFolders[folderName] = { ...folder, groups: groupsToShow };
                    Object.keys(groupsToShow).forEach(gn => groupsInFilteredFolders.add(gn));
                }
            }
        });

        // Filter standalone groups
        Object.entries(tabGroups).forEach(([name, group]) => {
            if (!groupsInFilteredFolders.has(name)) { // Avoid duplicates
                let groupNameMatches = name.toLowerCase().includes(lowerSearchTerm);
                let tabMatch = group.tabs?.some(tab =>
                    (tab.title && tab.title.toLowerCase().includes(lowerSearchTerm)) ||
                    (tab.url && tab.url.toLowerCase().includes(lowerSearchTerm))
                );
                if (groupNameMatches || tabMatch) {
                    filteredGroups[name] = group;
                }
            }
        });

        // Render Filtered Results
        requestAnimationFrame(() => {
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
                            <button class="action-button edit-folder-btn icon-button edit" title="Edit Folder"><i class="fas fa-edit"></i></button>
                            <button class="action-button toggle-folder-btn icon-button" title="Expand/Collapse"><i class="fas fa-chevron-up rotated"></i></button> </div>
                    </div>
                    <div class="folder-content expanded"> <ul></ul> <div class="folder-actions"><button class="action-button delete-folder-btn danger-btn"><i class="fas fa-trash"></i> Delete Folder</button></div> </div>`;

                const folderContentUl = folderElement.querySelector('.folder-content ul');
                // Sort groups within the filtered folder
                const sortedGroupNames = Object.keys(folder.groups).sort((a, b) =>
                    groupComparator(a, b, folder.groups[a], folder.groups[b])
                );
                sortedGroupNames.forEach(groupName => {
                    folderContentUl.appendChild(app.groups.createGroupListItem(groupName, folder.groups[groupName], folderName));
                });
                fragment.appendChild(folderElement);
            });

            // Sort and Render filtered standalone groups
            const standaloneGroupList = document.createElement('ul');
            standaloneGroupList.className = 'standalone-groups-list groups-list';
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
        }); // End requestAnimationFrame
    });
}, 300); // 300ms debounce

app.groups.openTabGroup = function (group) {
    if (group && group.tabs && group.tabs.length > 0) {
        // Filter out invalid URLs before creating window
        const validUrls = group.tabs.map(tab => tab.url).filter(url => url && !url.startsWith('chrome://') && !url.startsWith('about:'));
        if (validUrls.length > 0) {
            chrome.windows.create({ url: validUrls }, (newWindow) => {
                if (chrome.runtime.lastError) {
                    console.error("Error creating window:", chrome.runtime.lastError.message);
                    app.utils.showCustomAlert("Could not open group: " + chrome.runtime.lastError.message);
                } else {

                }
            });
        } else {
            console.warn("No valid, openable URLs found in the group:", group);
            app.utils.showCustomAlert("This group contains no valid URLs to open.");
        }
    } else {
        console.warn("Attempted to open an invalid or empty group:", group);
        app.utils.showCustomAlert("Could not open tab group - it might be empty or corrupted.");
    }
};

app.groups.deleteTabGroup = function (name, folderName = null) {
    const message = `Are you sure you want to permanently delete the group "${name}"? This cannot be undone.`;

    app.utils.showCustomConfirm(message, () => { // Use utility
        chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
            let changed = false;
            let updates = {};

            // Check if it's in a folder
            if (folderName && folders[folderName]?.groups?.[name]) {
                let updatedFolders = { ...folders };
                let updatedFolder = { ...updatedFolders[folderName] };
                updatedFolder.groups = { ...updatedFolder.groups };
                delete updatedFolder.groups[name];
                updatedFolder.dateModified = Date.now();
                updatedFolders[folderName] = updatedFolder;
                updates.folders = updatedFolders;
                changed = true;
            }
            // Check if it's a standalone group (it could be both if data inconsistent)
            if (tabGroups[name]) {
                let updatedTabGroups = { ...tabGroups };
                delete updatedTabGroups[name];
                updates.tabGroups = updatedTabGroups;
                changed = true; // Ensure change is registered even if only standalone
            }


            if (changed) {
                chrome.storage.local.set(updates, () => {
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

app.groups.deleteFolder = function (folderName) {
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
            // Get the groups from the folder before deleting it
            const groupsToMakeStandalone = folder.groups || {};

            // Delete the folder
            delete folders[folderName];

            // Get current standalone groups to merge
            chrome.storage.local.get('tabGroups', ({ tabGroups = {} }) => {
                let updatedTabGroups = { ...tabGroups };
                // Add groups from the deleted folder to standalone, avoiding overwrites
                Object.entries(groupsToMakeStandalone).forEach(([name, data]) => {
                    if (!updatedTabGroups[name]) { // Only add if no standalone group with same name exists
                        updatedTabGroups[name] = data;
                    } else {
                        console.warn(`Group "${name}" from deleted folder "${folderName}" conflicts with existing standalone group. Keeping standalone version.`);
                    }
                });

                // Save both updated folders and tabGroups
                chrome.storage.local.set({ folders, tabGroups: updatedTabGroups }, () => {
                    app.groups.loadSavedGroups(); // Refresh to show groups as standalone
                    app.utils.updateSavedItemsCount(); // Update count
                });
            });
        });
    });
};


// --- Folder Dialog Logic ---
// (populateGroupSelection, createNewFolder, openEditFolderDialog, saveEditedFolder - remain largely the same)
app.groups.populateGroupSelection = function (containerElement, selectedGroups = [], currentFolderName = null) {
    const selectedSet = new Set(selectedGroups);
    chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
        const fragment = document.createDocumentFragment();
        let availableGroups = {}; // Groups eligible to be added/included

        // Add standalone groups first
        Object.entries(tabGroups).forEach(([name, data]) => {
            availableGroups[name] = { ...data, origin: 'standalone' };
        });

        // Add groups from the *current* folder being edited (to allow deselection)
        if (currentFolderName && folders[currentFolderName]?.groups) {
            Object.entries(folders[currentFolderName].groups).forEach(([name, data]) => {
                // Add only if not already present (e.g., wasn't also standalone)
                if (!availableGroups[name]) {
                    availableGroups[name] = { ...data, origin: 'currentFolder' };
                }
            });
        }

        const sortedGroupNames = Object.keys(availableGroups).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

        if (sortedGroupNames.length === 0 && !currentFolderName) { // Show empty message only when creating new folder with no groups
            containerElement.innerHTML = '<div class="empty-selection">No tab groups available to add.</div>';
            return;
        } else if (sortedGroupNames.length === 0 && currentFolderName) {
            containerElement.innerHTML = '<div class="empty-selection">No other groups to add. Uncheck items to remove them.</div>';
        }


        sortedGroupNames.forEach((name, index) => {
            const item = document.createElement('div');
            item.className = 'group-check-item';
            const checkboxId = `group-check-${containerElement.id}-${index}`;
            item.innerHTML = `
                <input type="checkbox" class="group-checkbox" data-name="${name}" id="${checkboxId}" ${selectedSet.has(name) ? 'checked' : ''}>
                <label for="${checkboxId}" class="group-name">${name}</label>
                ${availableGroups[name].origin === 'currentFolder' && selectedSet.has(name) ? '<span class="origin-folder">(current)</span>' : ''}
            `;
            fragment.appendChild(item);
        });
        containerElement.innerHTML = ''; // Clear previous content
        containerElement.appendChild(fragment);
    });
};

app.groups.createNewFolder = function () {
    const folderName = app.elements.folderNameInput.value.trim();
    if (!folderName) { 
        app.utils.showCustomAlert("Please enter a name for the folder.");
        
        
        
        app.elements.folderNameInput.focus();
         return;
         }

    const selectedGroupNames = Array.from(app.elements.groupSelection.querySelectorAll('.group-checkbox:checked')).map(checkbox => checkbox.dataset.name);

    chrome.storage.local.get(['folders', 'tabGroups'], ({ folders = {}, tabGroups = {} }) => {
        if (folders[folderName]) { app.utils.showCustomAlert(`A folder named "${folderName}" already exists.`); app.elements.folderNameInput.focus(); return; }

        const newFolderGroups = {};
        let groupsToRemoveFromStandalone = [];

        selectedGroupNames.forEach(groupName => {
            // Primarily get data from standalone groups
            if (tabGroups[groupName]) {
                newFolderGroups[groupName] = tabGroups[groupName];
                groupsToRemoveFromStandalone.push(groupName); // Mark for removal from top level
            } else {
                console.warn(`Selected group "${groupName}" not found in standalone groups during folder creation.`);
            }
        });

        // Create the new folder entry
        folders[folderName] = { groups: newFolderGroups, dateCreated: Date.now() };

        // Remove the groups from the top-level 'tabGroups' if they were moved
        if (groupsToRemoveFromStandalone.length > 0) {
            let updatedTabGroups = { ...tabGroups };
            groupsToRemoveFromStandalone.forEach(groupName => { delete updatedTabGroups[groupName]; });
            // Save both potentially modified structures
            chrome.storage.local.set({ folders, tabGroups: updatedTabGroups }, () => {
                app.utils.hideModal('folderDialog'); // Use utility
                app.groups.loadSavedGroups(); // Refresh the view
                app.utils.updateSavedItemsCount(); // Update count
            });
        } else {
            // Only need to save the folders object
            chrome.storage.local.set({ folders }, () => {
                app.utils.hideModal('folderDialog'); // Use utility
                app.groups.loadSavedGroups(); // Refresh the view
                app.utils.updateSavedItemsCount(); // Update count
            });
        }
    });
};

app.groups.openEditFolderDialog = function (folderName) {
    app.utils.hideAllModalDialogs(); // Use utility
    chrome.storage.local.get(['folders'], ({ folders = {} }) => {
        const folder = folders[folderName];
        if (!folder) { console.error("Folder not found for editing:", folderName); app.utils.showCustomAlert("Could not find the folder to edit."); return; }

        app.state.currentEditingFolderOriginalName = folderName; // Store original name
        app.elements.editFolderName.value = folderName;

        const currentGroupNames = folder.groups ? Object.keys(folder.groups) : [];
        // Pass the current folder name to populate correctly
        app.groups.populateGroupSelection(app.elements.editGroupSelection, currentGroupNames, folderName);

        // Update select all button state
        app.utils.updateSelectAllButtonState(app.elements.editGroupSelection, app.elements.selectAllEditGroupsBtn, '.group-checkbox');

        app.utils.showModal('editFolderDialog'); // Use utility
        app.elements.editFolderName.focus();
        app.elements.editFolderName.select();
    });
};

app.groups.saveEditedFolder = function () {
    const newFolderName = app.elements.editFolderName.value.trim();
    const originalFolderName = app.state.currentEditingFolderOriginalName;

    if (!newFolderName) { app.utils.showCustomAlert('Folder name cannot be empty.'); app.elements.editFolderName.focus(); return; }
    if (!originalFolderName) { console.error("Original folder name state missing."); app.utils.showCustomAlert("Error: Could not determine original folder name."); app.utils.hideModal('editFolderDialog'); return; }

    const selectedGroupNames = Array.from(app.elements.editGroupSelection.querySelectorAll('.group-checkbox:checked')).map(checkbox => checkbox.dataset.name);

    chrome.storage.local.get(['folders', 'tabGroups'], ({ folders = {}, tabGroups = {} }) => {
        // Check for name conflict only if the name actually changed
        if (newFolderName !== originalFolderName && folders[newFolderName]) { app.utils.showCustomAlert(`A folder named "${newFolderName}" already exists.`); app.elements.editFolderName.focus(); return; }
        // Ensure the original folder still exists
        if (!folders[originalFolderName]) { console.error("Original folder not found during save:", originalFolderName); app.utils.showCustomAlert("Error: Original folder seems to have been deleted."); app.utils.hideModal('editFolderDialog'); app.groups.loadSavedGroups(); return; }

        const originalFolderGroups = folders[originalFolderName].groups || {};
        const updatedFolderGroups = {};
        let groupsToAddFromStandalone = []; // Names of groups newly added to folder from standalone
        let groupsToRemoveFromFolder = []; // Names of groups unchecked (will become standalone)

        const originalGroupNamesSet = new Set(Object.keys(originalFolderGroups));
        const selectedGroupNamesSet = new Set(selectedGroupNames);

        // Process selected groups
        selectedGroupNames.forEach(groupName => {
            if (originalGroupNamesSet.has(groupName)) {
                // Group was already in the folder, keep it
                updatedFolderGroups[groupName] = originalFolderGroups[groupName];
            } else {
                // Group is newly selected, must be from standalone
                if (tabGroups[groupName]) {
                    updatedFolderGroups[groupName] = tabGroups[groupName];
                    groupsToAddFromStandalone.push(groupName); // Mark for removal from standalone
                } else {
                    console.warn(`Newly selected group "${groupName}" not found in standalone groups during folder edit.`);
                }
            }
        });

        // Identify groups removed from the folder
        originalGroupNamesSet.forEach(groupName => {
            if (!selectedGroupNamesSet.has(groupName)) {
                groupsToRemoveFromFolder.push(groupName);
            }
        });

        // Prepare final folder data
        const folderDataToSave = { groups: updatedFolderGroups, dateCreated: folders[originalFolderName].dateCreated, dateModified: Date.now() };

        // --- Prepare Storage Updates ---
        let storageUpdates = {};

        // 1. Update Folders Object
        let updatedFolders = { ...folders };
        if (newFolderName !== originalFolderName) { delete updatedFolders[originalFolderName]; }
        updatedFolders[newFolderName] = folderDataToSave;
        storageUpdates.folders = updatedFolders;

        // 2. Update Standalone Groups Object (if changes occurred)
        if (groupsToAddFromStandalone.length > 0 || groupsToRemoveFromFolder.length > 0) {
            let updatedTabGroups = { ...tabGroups };
            groupsToAddFromStandalone.forEach(name => { delete updatedTabGroups[name]; });
            groupsToRemoveFromFolder.forEach(name => {
                if (originalFolderGroups[name] && !updatedTabGroups[name]) { // Ensure data exists and no conflict
                    updatedTabGroups[name] = originalFolderGroups[name];
                }
            });
            storageUpdates.tabGroups = updatedTabGroups;
        }

        // Save all changes
        chrome.storage.local.set(storageUpdates, () => {
            app.utils.hideModal('editFolderDialog'); // Use utility
            app.groups.loadSavedGroups(); // Refresh view
            app.utils.updateSavedItemsCount(); // Update count
        });
    });
};


// --- Rename/Edit Tabs Modals ---

// Rename function (remains mostly the same, ensure alerts are used)
app.groups.renameTabGroup = function (oldName, newName, folderName, callback) {
    newName = newName.trim();
    if (!newName || newName === oldName) { if (callback) callback(false, "Name unchanged or empty."); return; }

    chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
        let groupData;
        let storageUpdates = {};

        if (folderName) { // Renaming within folder
            if (!folders[folderName]?.groups) { if (callback) callback(false, "Parent folder not found."); return; }
            if (folders[folderName].groups[newName]) { app.utils.showCustomAlert(`A group named "${newName}" already exists in folder "${folderName}".`); if (callback) callback(false, "Name conflict in folder."); return; }
            if (!folders[folderName].groups[oldName]) { if (callback) callback(false, "Original group not found in folder."); return; }

            groupData = folders[folderName].groups[oldName];
            let updatedFolder = { ...folders[folderName], groups: { ...folders[folderName].groups }, dateModified: Date.now() };
            delete updatedFolder.groups[oldName];
            updatedFolder.groups[newName] = groupData;
            storageUpdates.folders = { ...folders, [folderName]: updatedFolder };

        } else { // Renaming standalone group
            if (tabGroups[newName]) { app.utils.showCustomAlert(`A standalone group named "${newName}" already exists.`); if (callback) callback(false, "Name conflict (standalone)."); return; }
            if (!tabGroups[oldName]) { if (callback) callback(false, "Original standalone group not found."); return; }

            groupData = tabGroups[oldName];
            let updatedTabGroups = { ...tabGroups };
            delete updatedTabGroups[oldName];
            updatedTabGroups[newName] = groupData;
            storageUpdates.tabGroups = updatedTabGroups;
        }

        chrome.storage.local.set(storageUpdates, () => {
            if (chrome.runtime.lastError) { console.error("Error saving renamed group:", chrome.runtime.lastError); app.utils.showCustomAlert("An error occurred saving the name."); if (callback) callback(false, "Storage error"); }
            else { if (callback) callback(true); }
        });
    });
};


// Open Rename Dialog (Make sure HTML IDs match popup.html)
app.groups.openRenameGroupDialog = function (originalName, folderName) {
    app.utils.hideAllModalDialogs();
    if (!app.elements.renameGroupDialog || !app.elements.renameGroupInput || !app.elements.renameGroupSaveBtn || !app.elements.renameGroupCancelBtn || !app.elements.renameGroupOriginalName) { console.error("Rename Dialog elements missing"); return; }

    app.elements.renameGroupOriginalName.value = originalName;
    app.elements.renameGroupDialog.dataset.folderName = folderName || '';
    app.elements.renameGroupInput.value = originalName;
    app.utils.showModal('rename-group-dialog'); // Use ID from HTML
    app.elements.renameGroupInput.focus();
    app.elements.renameGroupInput.select();

    // Define handlers INSIDE this function to capture correct context
    const saveHandler = () => {
        const newName = app.elements.renameGroupInput.value.trim();
        const storedOriginalName = app.elements.renameGroupOriginalName.value;
        const storedFolderName = app.elements.renameGroupDialog.dataset.folderName || null;
        if (newName && newName !== storedOriginalName) {
            app.groups.renameTabGroup(storedOriginalName, newName, storedFolderName, (success) => { if (success) { app.utils.hideModal('rename-group-dialog'); app.groups.loadSavedGroups(); } });
        } else if (!newName) { app.utils.showCustomAlert("Group name cannot be empty."); }
        else { app.utils.hideModal('rename-group-dialog'); } // Name unchanged, just close
    };
    const cancelHandler = () => app.utils.hideModal('rename-group-dialog');

    // Assign handlers (ensure previous are removed if necessary - simple assignment overwrites)
    app.elements.renameGroupSaveBtn.onclick = saveHandler;
    app.elements.renameGroupCancelBtn.onclick = cancelHandler;
    app.elements.renameGroupInput.onkeydown = (e) => { if (e.key === 'Enter') saveHandler(); else if (e.key === 'Escape') cancelHandler(); };
};


// Open Edit Tabs Dialog (Make sure HTML IDs match popup.html)
app.groups.openEditTabsDialog = function (groupName, folderName) {

    app.utils.hideAllModalDialogs();
    if (!app.elements.editTabsDialog || !app.elements.editTabsDialogTitle || !app.elements.editTabsList || !app.elements.editTabsSaveBtn || !app.elements.editTabsCancelBtn) { console.error("Edit Tabs Dialog elements missing"); return; }

    app.elements.editTabsDialog.dataset.groupName = groupName;
    app.elements.editTabsDialog.dataset.folderName = folderName || '';
    app.elements.editTabsDialogTitle.textContent = `Edit Tabs in Group: "${groupName}"`;
    app.groups.populateEditTabsSelection(groupName, folderName); // Populate the list
    app.utils.showModal('edit-tabs-dialog'); // Use ID from HTML

    // Assign handlers
    app.elements.editTabsSaveBtn.onclick = app.groups.saveEditedTabs;
    app.elements.editTabsCancelBtn.onclick = () => app.utils.hideModal('edit-tabs-dialog');
};

// Populate Edit Tabs Dialog List
app.groups.populateEditTabsSelection = function (groupName, folderName) {
    const listElement = app.elements.editTabsList;
    if (!listElement) return;
    listElement.innerHTML = '<li>Loading...</li>'; // Placeholder

    chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
        const groupData = folderName ? folders[folderName]?.groups?.[groupName] : tabGroups[groupName];
        listElement.innerHTML = ''; // Clear loading/previous

        if (!groupData || !groupData.tabs || groupData.tabs.length === 0) { listElement.innerHTML = '<li class="empty-list">This group has no tabs.</li>'; return; }

        const fragment = document.createDocumentFragment();
        groupData.tabs.forEach((tab, index) => {
            const item = document.createElement('li');
            item.className = 'edit-tab-item';
            // Store essential data on the element
            item.dataset.url = tab.url || '';
            item.dataset.title = tab.title || tab.url || ''; // Use URL as fallback title
            item.dataset.favIconUrl = tab.favIconUrl || '';

            item.innerHTML = `
                <img class="edit-tab-favicon" src="${tab.favIconUrl || 'icon.png'}" onerror="this.src='icon.png'" alt="">
                <span class="edit-tab-title" title="${item.dataset.title}">${item.dataset.title}</span>
                <button class="remove-tab-btn icon-button danger" data-index="${index}" title="Remove Tab"><i class="fas fa-times"></i></button>
            `;
            item.querySelector('.remove-tab-btn').addEventListener('click', (e) => { e.target.closest('li.edit-tab-item').remove(); });
            fragment.appendChild(item);
        });
        listElement.appendChild(fragment);
    });
};

// Save Edited Tabs
app.groups.saveEditedTabs = function () {
    const groupName = app.elements.editTabsDialog.dataset.groupName;
    const folderName = app.elements.editTabsDialog.dataset.folderName || null;
    const listElement = app.elements.editTabsList;
    if (!groupName || !listElement) { console.error("Cannot save tabs: context missing."); return; }

    const updatedTabs = [];
    listElement.querySelectorAll('li.edit-tab-item').forEach(item => {
        updatedTabs.push({ url: item.dataset.url, title: item.dataset.title, favIconUrl: item.dataset.favIconUrl });
    });


    chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
        let storageUpdates = {};
        let groupDataRef = null;

        if (folderName) {
            if (folders[folderName]?.groups?.[groupName]) {
                groupDataRef = folders[folderName].groups[groupName];
                let updatedFolder = { ...folders[folderName], groups: { ...folders[folderName].groups }, dateModified: Date.now() };
                updatedFolder.groups[groupName] = { ...updatedFolder.groups[groupName], tabs: updatedTabs };
                storageUpdates.folders = { ...folders, [folderName]: updatedFolder };
            }
        } else {
            if (tabGroups[groupName]) {
                groupDataRef = tabGroups[groupName];
                let updatedTabGroups = { ...tabGroups };
                updatedTabGroups[groupName] = { ...updatedTabGroups[groupName], tabs: updatedTabs };
                // Optionally add dateModified to standalone group
                // updatedTabGroups[groupName].dateModified = Date.now();
                storageUpdates.tabGroups = updatedTabGroups;
            }
        }

        if (!groupDataRef) { console.error("Original group data not found during save."); app.utils.showCustomAlert("Error saving: Original group data missing."); return; }

        chrome.storage.local.set(storageUpdates, () => {
            if (chrome.runtime.lastError) { console.error("Error saving edited tabs:", chrome.runtime.lastError); app.utils.showCustomAlert("Error saving tab changes."); }
            else { app.utils.hideModal('edit-tabs-dialog'); app.groups.loadSavedGroups(); }
        });
    });
};

// --- Clear Search ---
app.groups.clearSearch = function () {
    app.elements.searchInput.value = '';
    app.elements.clearSearchBtn.classList.remove('visible');
    app.elements.searchContainer.style.display = 'none'; // Hide search bar when cleared
    if (app.state.activeSection === 'groups') { app.groups.loadSavedGroups(); }
};

// --- Event Handlers (Specific to Groups section) ---
app.groups.setupEventListeners = function () {

    // Event Delegation for Dynamic Group/Folder List
    app.elements.groupsList.addEventListener('click', (e) => {
        const target = e.target;
        // Find closest relevant elements
        const groupLi = target.closest('li.group-list-item[data-group]');
        const folderItem = target.closest('.folder-item[data-folder]');
        const folderHeader = target.closest('.folder-header');
        const tabListItem = target.closest('.tab-list-item'); // For clicking tabs in expanded list

        // Folder Actions
        const toggleFolderBtn = target.closest('.toggle-folder-btn');
        const editFolderBtn = target.closest('.edit-folder-btn');
        const deleteFolderBtn = target.closest('.delete-folder-btn');

        // Group Actions (within groupLi or its children)
        const openGroupBtn = target.closest('.open-group-button');
        const editGroupTabsBtn = target.closest('.edit-group-button'); // Edit Tabs button
        const renameGroupBtn = target.closest('.rename-group-button'); // Rename button
        const deleteGroupBtn = target.closest('.delete-group-button'); // Delete button
        const expandGroupBtn = target.closest('.expand-group-button'); // Expand/collapse button

        // Handle clicking a tab in the expanded list
        if (tabListItem && tabListItem.dataset.url) {
            e.stopPropagation();
            const urlToOpen = tabListItem.dataset.url;

            chrome.tabs.create({ url: urlToOpen, active: true });
            return;
        }

        // Handle Folder Toggles/Actions
        if (folderItem) {
            const folderName = folderItem.dataset.folder;
            // Toggle Expand/Collapse (Click header or button)
            const handleToggleFolder = () => {
                const contentElement = folderItem.querySelector('.folder-content');
                const iconElement = folderItem.querySelector('.toggle-folder-btn i');
                if (contentElement && iconElement) {
                    const isExpanding = !contentElement.classList.contains('expanded');
                    contentElement.classList.toggle('expanded', isExpanding);
                    iconElement.classList.toggle('rotated', isExpanding);
                    iconElement.classList.toggle('fa-chevron-down', !isExpanding);
                    iconElement.classList.toggle('fa-chevron-up', isExpanding);
                    // Store expanded state
                    app.state.expandedFolders = app.state.expandedFolders || {};
                    app.state.expandedFolders[folderName] = isExpanding;
                }
            };
            if (toggleFolderBtn) { e.stopPropagation(); handleToggleFolder(); return; }
            if (folderHeader && !target.closest('.folder-header-actions button')) { handleToggleFolder(); return; } // Allow click on header itself

            // Edit Folder
            if (editFolderBtn) { e.stopPropagation(); app.groups.openEditFolderDialog(folderName); return; }
            // Delete Folder
            if (deleteFolderBtn) { e.stopPropagation(); app.groups.deleteFolder(folderName); return; }
        }

        // --- Handle Group-Specific Actions (Requires groupLi) ---
        if (groupLi) {
            const groupName = groupLi.dataset.group;
            const folderName = groupLi.dataset.folder; // null if standalone

            // Open All Tabs Button
            if (openGroupBtn) {
                e.stopPropagation();

                chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
                    const groupData = folderName ? folders[folderName]?.groups?.[groupName] : tabGroups[groupName];
                    if (groupData) app.groups.openTabGroup(groupData);
                    else console.error(`Data not found for group: ${groupName}`);
                });
                return;
            }

            // Edit Tabs Button
            if (editGroupTabsBtn) {
                e.stopPropagation(); app.groups.openEditTabsDialog(groupName, folderName); return;

            }
            // Rename Group Button
            if (renameGroupBtn) { e.stopPropagation(); app.groups.openRenameGroupDialog(groupName, folderName); return; }
            // Delete Group Button
            if (deleteGroupBtn) { e.stopPropagation(); app.groups.deleteTabGroup(groupName, folderName); return; }

            // Toggle Group Details (Expand/Collapse Tab List)
            if (expandGroupBtn) {
                e.stopPropagation();
                const tabListDiv = groupLi.querySelector('.tab-list');
                const icon = expandGroupBtn.querySelector('i');
                if (tabListDiv && icon) {
                    const isExpanding = !tabListDiv.classList.contains('expanded');
                    tabListDiv.classList.toggle('expanded', isExpanding);
                    icon.classList.toggle('rotated', isExpanding);
                    icon.classList.toggle('fa-chevron-down', !isExpanding);
                    icon.classList.toggle('fa-chevron-up', isExpanding);
                }
                return;
            }
        } // End if(groupLi)

    }); // End of groupsList listener


    // --- Listeners for static elements ---

    // Add Group Dropdown (using modal logic now)
    app.elements.addButton.addEventListener('click', app.groups.showSaveDropdown);
    // Assuming 'saveDropdown' is the modal overlay ID
    const saveDropdownModal = document.getElementById('saveDropdown');
    if (saveDropdownModal) {
        saveDropdownModal.querySelector('.close-btn')?.addEventListener('click', () => app.utils.hideModal('saveDropdown'));
        saveDropdownModal.querySelector('#saveTabsButton')?.addEventListener('click', app.groups.saveSelectedTabs);
        saveDropdownModal.querySelector('#selectAllBtn')?.addEventListener('click', () => app.utils.toggleSelectAll(app.elements.tabsChecklist, app.elements.selectAllBtn, '.tab-checkbox'));
        // Close on overlay click
        saveDropdownModal.addEventListener('click', (e) => { if (e.target === saveDropdownModal) app.utils.hideModal('saveDropdown'); });
    }


    // Create Folder Dialog (using modal logic now)
    const folderDialogModal = document.getElementById('folderDialog');
    if (folderDialogModal) {
        folderDialogModal.querySelector('.close-btn')?.addEventListener('click', () => app.utils.hideModal('folderDialog'));
        folderDialogModal.querySelector('#selectAllGroupsBtn')?.addEventListener('click', () => app.utils.toggleSelectAll(app.elements.groupSelection, app.elements.selectAllGroupsBtn, '.group-checkbox'));
        folderDialogModal.querySelector('#createFolderBtn')?.addEventListener('click', app.groups.createNewFolder);
        // Close on overlay click
        folderDialogModal.addEventListener('click', (e) => { if (e.target === folderDialogModal) app.utils.hideModal('folderDialog'); });
    }
    // Listener for the header "Create Folder" button
    app.elements.createFolderHeaderBtn?.addEventListener('click', () => {
        app.utils.hideAllModalDialogs();
        app.groups.populateGroupSelection(app.elements.groupSelection); // Populate with available standalone groups
        app.utils.updateSelectAllButtonState(app.elements.groupSelection, app.elements.selectAllGroupsBtn, '.group-checkbox');
        app.elements.folderNameInput.value = '';
        app.utils.showModal('folderDialog'); // Show the modal
        app.elements.folderNameInput.focus();
    });


    // Edit Folder Dialog (using modal logic now)
    const editFolderDialogModal = document.getElementById('editFolderDialog');
    if (editFolderDialogModal) {
        editFolderDialogModal.querySelector('.close-btn')?.addEventListener('click', () => app.utils.hideModal('editFolderDialog'));
        editFolderDialogModal.querySelector('#selectAllEditGroupsBtn')?.addEventListener('click', () => app.utils.toggleSelectAll(app.elements.editGroupSelection, app.elements.selectAllEditGroupsBtn, '.group-checkbox'));
        editFolderDialogModal.querySelector('#saveEditFolderBtn')?.addEventListener('click', app.groups.saveEditedFolder);
        // Close on overlay click
        editFolderDialogModal.addEventListener('click', (e) => { if (e.target === editFolderDialogModal) app.utils.hideModal('editFolderDialog'); });
    }

    // Rename Group Dialog (Event listeners assigned when dialog opens in openRenameGroupDialog)
    const renameDialogModal = document.getElementById('rename-group-dialog');
    if (renameDialogModal) {
        renameDialogModal.addEventListener('click', (e) => { if (e.target === renameDialogModal) app.utils.hideModal('rename-group-dialog'); });
    }

    // Edit Tabs Dialog (Event listeners assigned when dialog opens in openEditTabsDialog)
    const editTabsDialogModal = document.getElementById('edit-tabs-dialog');
    if (editTabsDialogModal) {
        editTabsDialogModal.addEventListener('click', (e) => { if (e.target === editTabsDialogModal) app.utils.hideModal('edit-tabs-dialog'); });
    }


    // Search listeners
    app.elements.searchInput.addEventListener('input', (e) => {
        const term = e.target.value;
        app.groups.handleSearchDebounced(term);
        // Show search container and clear button based on input
        if (term.trim()) {
            app.elements.searchContainer.style.display = 'block';
            app.elements.clearSearchBtn.classList.add('visible');
        } else {
            // Optionally hide search bar if input is cleared, or keep it visible
            // app.elements.searchContainer.style.display = 'none';
            app.elements.clearSearchBtn.classList.remove('visible');
        }
    });
    app.elements.clearSearchBtn.addEventListener('click', app.groups.clearSearch);
    // Initial state for search bar (show if search term exists, e.g., on popup reload)
    if (app.elements.searchInput.value.trim()) {
        app.elements.searchContainer.style.display = 'block';
        app.elements.clearSearchBtn.classList.add('visible');
    } else {
        app.elements.searchContainer.style.display = 'none'; // Hide initially if empty
    }


    // Sort Select Listener
    const sortSelect = document.getElementById('sortGroupsSelect');
    if (sortSelect) {
        const sortControls = document.querySelector('.group-sort-controls');
        if (sortControls) sortControls.style.display = 'flex'; // Make sure it's visible

        // Load saved sort order or default
        chrome.storage.local.get('groupSortOrder', ({ groupSortOrder }) => {
            app.state.groupSortOrder = groupSortOrder || 'dateDesc';
            sortSelect.value = app.state.groupSortOrder;

        });


        sortSelect.addEventListener('change', (e) => {
            const newSortOrder = e.target.value;
            app.state.groupSortOrder = newSortOrder; // Update global state


            // Save the selected sort order
            chrome.storage.local.set({ groupSortOrder: newSortOrder });

            const searchTerm = app.elements.searchInput.value.trim();
            if (searchTerm) {
                app.groups.handleSearchDebounced(searchTerm); // Re-run search with new sort
            } else {
                app.groups.loadSavedGroups(); // Reload the full list with new sort
            }
        });
    } else {
        console.warn("Sort select element (#sortGroupsSelect) not found.");
    }
};

console.log("groups.js updated and loaded");