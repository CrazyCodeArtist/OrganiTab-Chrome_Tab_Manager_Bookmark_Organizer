// /**
//  * popup.js - Optimized version with Folder Name Editing & Dialog Closing
//  *
//  * Optimizations applied:
//  * - Caching frequently accessed DOM elements.
//  * - Using event delegation for dynamic elements (groups, todos, bookmarks).
//  * - Using proper event listener removal in dialogs.
//  * - Using DocumentFragment for efficient batch DOM updates.
//  * - Consolidating DOM manipulations and reducing redundant queries.
//  * - Removing duplicate function definitions and commented-out code.
//  * - Simplifying tab switching logic.
//  *
//  * New Features (v2):
//  * - Folder name is editable in the "Edit Folder" dialog.
//  * - "Create Folder" and "Edit Folder" dialogs close automatically on main tab switch.
//  */

// document.addEventListener('DOMContentLoaded', () => {
//     // --- Cache DOM Elements ---
//     const elements = {
//         // Main layout & Nav
//         navTabs: document.querySelectorAll('.nav-tab'),
//         sections: document.querySelectorAll('.section-container'),
//         searchContainer: document.querySelector('.search-container'),
//         searchInput: document.getElementById('searchInput'),
//         clearSearchBtn: document.getElementById('clearSearchBtn'),
//         tabCountLabel: document.getElementById('tabCountLabel'),
//         savedItemsLabel: document.getElementById('savedItemsLabel'),

//         // Add Group Dropdown
//         addButton: document.getElementById('addButton'),
//         saveDropdown: document.getElementById('saveDropdown'),
//         closeDropdownBtn: document.getElementById('closeDropdownBtn'),
//         groupNameInput: document.getElementById('groupNameInput'),
//         tabsChecklist: document.getElementById('tabsChecklist'),
//         selectAllBtn: document.getElementById('selectAllBtn'),
//         saveTabsButton: document.getElementById('saveTabsButton'),

//         // Groups Section
//         groupsList: document.getElementById('groupsList'),

//         // Bookmarks Section
//         bookmarksList: document.getElementById('bookmarksList'),

//         // Todo Section
//         todoList: document.getElementById('todoList'),
//         newTodoInput: document.getElementById('newTodoInput'),
//         submitTodoBtn: document.getElementById('submitTodoBtn'),


//         // Create Folder Dialog
//         folderButton: document.getElementById('folderButton'), // Technically a nav tab, but triggers dialog
//         folderDialog: document.getElementById('folderDialog'),
//         closeFolderBtn: document.getElementById('closeFolderBtn'),
//         folderNameInput: document.getElementById('folderNameInput'),
//         groupSelection: document.getElementById('groupSelection'),
//         selectAllGroupsBtn: document.getElementById('selectAllGroupsBtn'),
//         createFolderBtn: document.getElementById('createFolderBtn'),

//         // Edit Folder Dialog
//         editFolderDialog: document.getElementById('editFolderDialog'),
//         closeEditFolderBtn: document.getElementById('closeEditFolderBtn'),
//         // IMPORTANT: Assumes editFolderName is now an <input type="text"> in HTML
//         editFolderName: document.getElementById('editFolderName'),
//         editGroupSelection: document.getElementById('editGroupSelection'),
//         selectAllEditGroupsBtn: document.getElementById('selectAllEditGroupsBtn'),
//         saveEditFolderBtn: document.getElementById('saveEditFolderBtn'),

//         // Custom Alert Dialog
//         customAlertOverlay: document.getElementById('customAlertOverlay'),
//         customAlertDialog: document.getElementById('customAlertDialog'),
//         customAlertMessage: document.getElementById('customAlertMessage'),
//         customAlertOk: document.getElementById('customAlertOk'),

//         // Custom Confirm Dialog
//         customConfirmOverlay: document.getElementById('customConfirmOverlay'),
//         customConfirmDialog: document.getElementById('customConfirmDialog'),
//         customConfirmMessage: document.getElementById('customConfirmMessage'),
//         customConfirmConfirm: document.getElementById('customConfirmConfirm'),
//         customConfirmCancel: document.getElementById('customConfirmCancel')
//     };

//     // --- State ---
//     let state = {
//         currentTabs: [],
//         currentEditingFolderOriginalName: '', // Store original name for comparison
//         activeSection: 'groups', // Default section
//         confirmCallback: null, // Store callback for confirm dialog
//         alertOkListener: null, // Store listeners for dialogs to remove them later
//         confirmConfirmListener: null,
//         confirmCancelListener: null,
//         overlayClickListenerAlert: null, // Specific listener for alert overlay
//         overlayClickListenerConfirm: null // Specific listener for confirm overlay
//     };

//     // --- Utility Functions ---
//     function debounce(func, wait) {
//         let timeout;
//         return function(...args) {
//             clearTimeout(timeout);
//             timeout = setTimeout(() => func.apply(this, args), wait);
//         };
//     }

//     // --- Dialog Functions ---

//     // Helper to hide any potentially open modal dialogs
//     function hideAllModalDialogs() {
//         if (elements.folderDialog.style.display !== 'none') {
//             hideCreateFolderDialog();
//         }
//         if (elements.editFolderDialog.style.display !== 'none') {
//             hideEditFolderDialog();
//         }
//         if (elements.saveDropdown.style.display !== 'none') {
//             elements.saveDropdown.style.display = 'none';
//         }
//         // Add custom alert/confirm if needed, though they usually close themselves
//         // if (elements.customAlertOverlay.style.display !== 'none') hideAlertDialog();
//         // if (elements.customConfirmOverlay.style.display !== 'none') hideConfirmDialog();
//     }

//     function showCustomConfirm(message, onConfirm) {
//         state.confirmCallback = onConfirm;
//         elements.customConfirmMessage.textContent = message;

//         // --- Listener Management ---
//         // Remove previous listeners to prevent duplicates
//         if (state.confirmConfirmListener) elements.customConfirmConfirm.removeEventListener('click', state.confirmConfirmListener);
//         if (state.confirmCancelListener) elements.customConfirmCancel.removeEventListener('click', state.confirmCancelListener);
//         if (state.overlayClickListenerConfirm) elements.customConfirmOverlay.removeEventListener('click', state.overlayClickListenerConfirm);

//         // Define new listeners
//         state.confirmConfirmListener = () => {
//             if (state.confirmCallback) state.confirmCallback();
//             hideConfirmDialog();
//         };
//         state.confirmCancelListener = () => hideConfirmDialog();
//         state.overlayClickListenerConfirm = (event) => {
//             if (event.target === elements.customConfirmOverlay) hideConfirmDialog();
//         };

//         // Add new listeners
//         elements.customConfirmConfirm.addEventListener('click', state.confirmConfirmListener);
//         elements.customConfirmCancel.addEventListener('click', state.confirmCancelListener);
//         elements.customConfirmOverlay.addEventListener('click', state.overlayClickListenerConfirm);
//         // --- End Listener Management ---

//         elements.customConfirmOverlay.style.display = 'flex';
//     }

//      function hideConfirmDialog() {
//         elements.customConfirmOverlay.style.display = 'none';
//         // Clean up listeners immediately after hiding
//         if (state.confirmConfirmListener) elements.customConfirmConfirm.removeEventListener('click', state.confirmConfirmListener);
//         if (state.confirmCancelListener) elements.customConfirmCancel.removeEventListener('click', state.confirmCancelListener);
//         if (state.overlayClickListenerConfirm) elements.customConfirmOverlay.removeEventListener('click', state.overlayClickListenerConfirm);
//         // Reset stored listeners and callback
//         state.confirmConfirmListener = null;
//         state.confirmCancelListener = null;
//         state.overlayClickListenerConfirm = null;
//         state.confirmCallback = null;
//     }

//     function showCustomAlert(message) {
//         elements.customAlertMessage.textContent = message;

//         // --- Listener Management ---
//         if (state.alertOkListener) elements.customAlertOk.removeEventListener('click', state.alertOkListener);
//         if (state.overlayClickListenerAlert) elements.customAlertOverlay.removeEventListener('click', state.overlayClickListenerAlert);

//         state.alertOkListener = () => hideAlertDialog();
//         state.overlayClickListenerAlert = (event) => {
//             if (event.target === elements.customAlertOverlay) hideAlertDialog();
//         };

//         elements.customAlertOk.addEventListener('click', state.alertOkListener);
//         elements.customAlertOverlay.addEventListener('click', state.overlayClickListenerAlert);
//         // --- End Listener Management ---

//         elements.customAlertOverlay.style.display = 'flex';
//     }

//     function hideAlertDialog() {
//         elements.customAlertOverlay.style.display = 'none';
//         // Clean up listeners
//         if (state.alertOkListener) elements.customAlertOk.removeEventListener('click', state.alertOkListener);
//         if (state.overlayClickListenerAlert) elements.customAlertOverlay.removeEventListener('click', state.overlayClickListenerAlert);
//         state.alertOkListener = null;
//         state.overlayClickListenerAlert = null;
//     }

//     // --- Specific Dialog Hide Functions ---
//     function hideCreateFolderDialog() {
//         elements.folderDialog.style.display = 'none';
//         // Reset fields if needed
//         elements.folderNameInput.value = '';
//         elements.groupSelection.innerHTML = ''; // Clear selection
//     }

//     function hideEditFolderDialog() {
//         elements.editFolderDialog.style.display = 'none';
//         state.currentEditingFolderOriginalName = ''; // Clear editing state
//          // Reset fields if needed
//         elements.editFolderName.value = '';
//         elements.editGroupSelection.innerHTML = ''; // Clear selection
//     }


//     // --- Core Logic Functions ---

//     function updateTabCount() {
//         chrome.tabs.query({}, (tabs) => {
//             state.currentTabs = tabs;
//             elements.tabCountLabel.textContent = tabs.length;
//         });
//     }

//     function updateSavedItemsCount() {
//         chrome.storage.local.get(['tabGroups', 'bookmarks', 'todos', 'folders'], ({ tabGroups = {}, bookmarks = [], todos = [], folders = {} }) => {
//             // More accurate count: Sum of standalone groups + folders + bookmarks + todos
//             let groupsInFolders = new Set();
//             Object.values(folders).forEach(folder => {
//                 if (folder.groups) {
//                     Object.keys(folder.groups).forEach(name => groupsInFolders.add(name));
//                 }
//             });
//             const standaloneGroupCount = Object.keys(tabGroups).filter(name => !groupsInFolders.has(name)).length;
//             const folderCount = Object.keys(folders).length;

//             // Count unique items: folders + standalone groups + bookmarks + todos
//             const count = folderCount + standaloneGroupCount + bookmarks.length + todos.length;
//             elements.savedItemsLabel.textContent = count;
//         });
//     }

//     function switchSection(sectionName) {
//         // --- NEW: Hide dialogs on tab switch ---
//         hideAllModalDialogs();
//         // ---------------------------------------

//         state.activeSection = sectionName;

//         // Update active tab style
//         elements.navTabs.forEach(t => {
//             t.classList.toggle('active', t.dataset.section === sectionName);
//         });

//         // Update active section display
//         elements.sections.forEach(section => {
//             section.classList.toggle('active-section', section.id === sectionName + 'Section');
//         });

//         // Toggle search bar visibility
//         elements.searchContainer.style.display = (sectionName === 'groups') ? 'block' : 'none';
//         if (sectionName !== 'groups' && elements.searchInput.value) {
//             clearSearch(); // Clear search if leaving groups tab
//         }


//         // Load content for the new section
//         loadSectionContent(sectionName);
//     }


//     function loadSectionContent(section) {
//          // Clear previous content for lists to prevent duplicates if loading fails
//         if (elements.groupsList) elements.groupsList.innerHTML = '';
//         if (elements.bookmarksList) elements.bookmarksList.innerHTML = '';
//         if (elements.todoList) elements.todoList.innerHTML = '';

//         switch (section) {
//             case 'groups':
//                 loadSavedGroups();
//                 break;
//             case 'bookmarks':
//                 loadBookmarks();
//                 break;
//             case 'todo':
//                 renderTodos();
//                 break;
//         }
//     }

//     // --- Group Saving Logic ---

//     function showSaveDropdown() {
//         hideAllModalDialogs(); // Close other dialogs first
//         populateTabsChecklist();
//         elements.saveDropdown.style.display = 'block';
//         elements.groupNameInput.focus(); // Focus on input
//     }

//     function populateTabsChecklist() {
//         const fragment = document.createDocumentFragment();
//         state.currentTabs.forEach((tab) => {
//             const item = document.createElement('div');
//             item.className = 'tab-item';
//             // Use template literals for cleaner HTML creation
//             item.innerHTML = `
//                 <input type="checkbox" class="tab-checkbox" checked data-tab-id="${tab.id}" id="tab-check-${tab.id}">
//                 <img class="tab-favicon" src="${tab.favIconUrl || 'icon.png'}" onerror="this.src='icon.png'" alt="">
//                 <label class="tab-title" for="tab-check-${tab.id}">${tab.title || tab.url}</label>
//             `;
//             fragment.appendChild(item);
//         });
//         elements.tabsChecklist.innerHTML = ''; // Clear previous
//         elements.tabsChecklist.appendChild(fragment);
//         // Reset select all button text
//         elements.selectAllBtn.textContent = 'Deselect All';
//     }

//     function toggleSelectAll(container, buttonElement, checkboxSelector) {
//         const checkboxes = container.querySelectorAll(checkboxSelector);
//         // Check if ALL are currently checked
//         const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);

//         checkboxes.forEach(checkbox => {
//             checkbox.checked = !allChecked;
//         });

//         buttonElement.textContent = allChecked ? 'Select All' : 'Deselect All';
//     }


//     function saveSelectedTabs() {
//         const groupName = elements.groupNameInput.value.trim();
//         if (!groupName) {
//             showCustomAlert('Please enter a name for the tab group.');
//             elements.groupNameInput.focus();
//             return;
//         }

//         const selectedTabs = [];
//         elements.tabsChecklist.querySelectorAll('.tab-checkbox:checked').forEach(checkbox => {
//             const tabId = parseInt(checkbox.dataset.tabId);
//             // Find tab efficiently (consider a map if many tabs)
//             const tab = state.currentTabs.find(t => t.id === tabId);
//             if (tab) {
//                 selectedTabs.push({
//                     url: tab.url,
//                     title: tab.title,
//                     favIconUrl: tab.favIconUrl
//                 });
//             }
//         });

//         if (selectedTabs.length === 0) {
//             showCustomAlert('Please select at least one tab to save.');
//             return;
//         }

//         chrome.storage.local.get('tabGroups', ({ tabGroups = {} }) => {
//             if (tabGroups[groupName]) {
//                  showCustomAlert(`A tab group named "${groupName}" already exists. Please choose a different name.`);
//                 elements.groupNameInput.focus();
//                 return;
//             }

//             tabGroups[groupName] = {
//                 tabs: selectedTabs,
//                 dateAdded: Date.now()
//             };

//             chrome.storage.local.set({ tabGroups }, () => {
//                 elements.saveDropdown.style.display = 'none';
//                 elements.groupNameInput.value = '';
//                 if (state.activeSection === 'groups') {
//                      loadSavedGroups(); // Refresh if on groups tab
//                 }
//                 updateSavedItemsCount();
//             });
//         });
//     }


//     // --- Group/Folder Rendering & Management ---

//     function getIconClass(name) {
//         const lowerName = name.toLowerCase();
//         if (lowerName.includes('work')) return 'fas fa-briefcase';
//         if (lowerName.includes('shop')) return 'fas fa-shopping-cart';
//         if (lowerName.includes('research')) return 'fas fa-search';
//         if (lowerName.includes('social')) return 'fas fa-users';
//         if (lowerName.includes('dev') || lowerName.includes('code')) return 'fas fa-code';
//         if (lowerName.includes('travel')) return 'fas fa-plane';
//         if (lowerName.includes('finance')) return 'fas fa-dollar-sign';
//         return 'fas fa-layer-group'; // Default icon
//     }

//      function createGroupListItem(name, group, folderName = null) {
//         const li = document.createElement('li');
//         li.dataset.group = name;
//         if (folderName) {
//             li.dataset.folder = folderName;
//         }

//         const iconClass = getIconClass(name);
//         const date = new Date(group.dateAdded || Date.now());
//         // Consistent date formatting
//         const formattedDate = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
//         const tabCount = group.tabs ? group.tabs.length : 0;

//         li.innerHTML = `
//             <div class="group-item">
//                 <div class="group-icon">
//                     <i class="${iconClass}"></i>
//                 </div>
//                 <div class="group-info">
//                     <div class="group-name">${name}</div>
//                     <div class="group-status">${tabCount} tab${tabCount !== 1 ? 's' : ''}</div>
//                     <div class="group-date">${formattedDate}</div>
//                 </div>
//             </div>
//             <div class="group-actions">
//                 <button class="action-button open-btn" title="Open Tabs">
//                     <i class="fas fa-external-link-alt"></i>
//                     <span class="open-tab-text">Open</span>
//                 </button>
//                 <button class="action-button delete-btn" title="Delete Group">
//                     <i class="fas fa-trash"></i>
//                 </button>
//             </div>
//         `;
//         return li;
//     }


//     function loadSavedGroups() {
//         chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
//             // Use requestAnimationFrame for smoother rendering
//              requestAnimationFrame(() => {
//                 const fragment = document.createDocumentFragment();
//                 let groupsInFolders = new Set();

//                 // --- Render Folders ---
//                 // Sort folders alphabetically
//                 const sortedFolderNames = Object.keys(folders).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

//                 sortedFolderNames.forEach(folderName => {
//                     const folder = folders[folderName];
//                     const folderElement = document.createElement('div');
//                     folderElement.className = 'folder-item';
//                     folderElement.dataset.folder = folderName; // Add dataset for easier targeting

//                     const folderGroupCount = Object.keys(folder.groups || {}).length;
//                     folderElement.innerHTML = `
//                         <div class="folder-header">
//                             <div class="folder-title">
//                                 <i class="fas fa-folder"></i>
//                                 <span>${folderName}</span>
//                                 <span class="folder-count">(${folderGroupCount})</span>
//                             </div>
//                             <div class="folder-header-actions">
//                                 <button class="action-button edit-folder-btn" title="Edit Folder">
//                                     <i class="fas fa-edit"></i>
//                                 </button>
//                                 <button class="action-button toggle-folder-btn" title="Expand/Collapse">
//                                      <i class="fas fa-chevron-down"></i> </button>
//                            </div>
//                         </div>
//                         <div class="folder-content"> <ul></ul>
//                              <div class="folder-actions">
//                                  <button class="action-button delete-folder-btn">
//                                      <i class="fas fa-trash"></i> Delete Folder
//                                  </button>
//                             </div>
//                         </div>`;

//                     const folderContentUl = folderElement.querySelector('.folder-content ul');
//                     if (folder.groups && folderGroupCount > 0) {
//                          // Sort groups within folder
//                          const sortedGroupNames = Object.keys(folder.groups).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
//                          sortedGroupNames.forEach(groupName => {
//                             groupsInFolders.add(groupName); // Mark as processed
//                             const group = folder.groups[groupName];
//                             const groupLi = createGroupListItem(groupName, group, folderName);
//                             folderContentUl.appendChild(groupLi);
//                         });
//                     } else {
//                          folderContentUl.innerHTML = '<li class="empty-folder">This folder is empty.</li>';
//                     }

//                     fragment.appendChild(folderElement);
//                 });

//                 // --- Render Standalone Groups ---
//                  const standaloneGroupList = document.createElement('ul');
//                  standaloneGroupList.className = 'standalone-groups-list'; // Optional class for styling
//                  let standaloneGroupsExist = false;

//                  // Sort standalone groups alphabetically
//                  const sortedStandaloneGroupNames = Object.keys(tabGroups)
//                     .filter(name => !groupsInFolders.has(name))
//                     .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

//                  sortedStandaloneGroupNames.forEach(name => {
//                     standaloneGroupsExist = true;
//                     const group = tabGroups[name];
//                     const groupLi = createGroupListItem(name, group);
//                     standaloneGroupList.appendChild(groupLi);
//                 });

//                 if (standaloneGroupsExist) {
//                     // Optional: Add a separator or header
//                     // const separator = document.createElement('hr');
//                     // fragment.appendChild(separator);
//                     fragment.appendChild(standaloneGroupList);
//                 }

//                  // --- Display or Show Empty Message ---
//                  elements.groupsList.innerHTML = ''; // Clear previous content
//                  if (fragment.hasChildNodes()) {
//                      elements.groupsList.appendChild(fragment);
//                  } else {
//                      elements.groupsList.innerHTML = '<div class="empty-message">No tab groups saved yet. Click the "+" button to save your current tabs.</div>';
//                  }

//                  // Update count after rendering
//                 updateSavedItemsCount();
//              });
//         });
//     }

//      function openTabGroup(group) {
//         if (group && group.tabs && group.tabs.length > 0) {
//             group.tabs.forEach(tab => {
//                 chrome.tabs.create({ url: tab.url, active: false }); // Open in background
//             });
//         } else {
//             console.warn("Attempted to open an invalid or empty group:", group);
//             showCustomAlert("Could not open tab group - it might be empty or corrupted.");
//         }
//     }

//     function deleteTabGroup(name, folderName = null) {
//         // If deleting from within a folder, just remove from folder, don't delete group entirely?
//         // Let's clarify the behavior: This function DELETES the group permanently.
//         // To just remove from folder, we'd need a different function or logic branch.

//         const message = folderName
//             ? `Permanently delete group "${name}"? It will also be removed from folder "${folderName}". This cannot be undone.`
//             : `Are you sure you want to permanently delete the "${name}" group? This cannot be undone.`;

//         showCustomConfirm(message, () => {
//             chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
//                 let changed = false;

//                 // Remove from the main groups list
//                 if (tabGroups[name]) {
//                     delete tabGroups[name];
//                     changed = true;
//                 }

//                 // Also remove from ANY folders it might be in
//                 Object.values(folders).forEach(folder => {
//                     if (folder.groups && folder.groups[name]) {
//                         delete folder.groups[name];
//                         changed = true;
//                         // Optional: Check if folder became empty? Decide if empty folders should persist.
//                     }
//                 });


//                 if (changed) {
//                     chrome.storage.local.set({ tabGroups, folders }, () => {
//                          loadSavedGroups(); // Refresh UI
//                         updateSavedItemsCount();
//                     });
//                 } else {
//                      console.warn(`Group "${name}" not found for deletion.`);
//                      showCustomAlert(`Group "${name}" was not found.`); // User feedback
//                 }
//             });
//         });
//     }


//     function deleteFolder(folderName) {
//          // Check if folder has groups
//          chrome.storage.local.get('folders', ({ folders = {} }) => {
//             const folder = folders[folderName];
//             const groupCount = folder && folder.groups ? Object.keys(folder.groups).length : 0;
//             const message = groupCount > 0
//                 ? `Delete folder "${folderName}"? The ${groupCount} group(s) inside will NOT be deleted and will appear outside the folder.`
//                 : `Delete empty folder "${folderName}"?`;

//              showCustomConfirm(message, () => {
//                 // Keep the groups, just remove the folder structure
//                 delete folders[folderName];
//                 chrome.storage.local.set({ folders }, () => {
//                     loadSavedGroups();
//                     updateSavedItemsCount();
//                 });
//             });
//         });
//     }

//     // --- Folder Dialog Logic ---

//     function populateGroupSelection(containerElement, selectedGroups = []) {
//          // Accepts an array of group names that should be pre-checked
//         const selectedSet = new Set(selectedGroups);

//         chrome.storage.local.get('tabGroups', ({ tabGroups = {} }) => {
//              const fragment = document.createDocumentFragment();
//             if (Object.keys(tabGroups).length === 0) {
//                 containerElement.innerHTML = '<div class="empty-selection">No tab groups available to organize.</div>';
//                 return;
//             }

//             Object.keys(tabGroups).sort().forEach((name, index) => { // Sort alphabetically
//                 const item = document.createElement('div');
//                 item.className = 'group-check-item';
//                 const checkboxId = `group-check-${containerElement.id}-${index}`; // Unique ID
//                 item.innerHTML = `
//                     <input type="checkbox" class="group-checkbox" data-name="${name}" id="${checkboxId}" ${selectedSet.has(name) ? 'checked' : ''}>
//                     <label for="${checkboxId}" class="group-name">${name}</label>
//                 `;
//                 fragment.appendChild(item);
//             });

//              containerElement.innerHTML = ''; // Clear previous
//             containerElement.appendChild(fragment);
//         });
//     }

//     function createNewFolder() {
//         const folderName = elements.folderNameInput.value.trim();
//         if (!folderName) {
//              showCustomAlert("Please enter a name for the folder.");
//             elements.folderNameInput.focus();
//             return;
//         }

//         const selectedGroups = Array.from(elements.groupSelection.querySelectorAll('.group-checkbox:checked'))
//             .map(checkbox => checkbox.dataset.name);

//         // Allow creating empty folders
//         // if (selectedGroups.length === 0) {
//         //     showCustomAlert('Please select at least one group to add to the folder.');
//         //     return;
//         // }

//         chrome.storage.local.get(['folders', 'tabGroups'], ({ folders = {}, tabGroups = {} }) => {
//             if (folders[folderName]) {
//                 showCustomAlert(`A folder named "${folderName}" already exists. Please choose a different name.`);
//                  elements.folderNameInput.focus();
//                 return;
//             }

//             const folderGroups = {};
//             selectedGroups.forEach(groupName => {
//                 if (tabGroups[groupName]) { // Ensure group exists
//                     folderGroups[groupName] = tabGroups[groupName];
//                 } else {
//                     console.warn(`Selected group "${groupName}" not found in tabGroups during folder creation.`);
//                 }
//             });

//             folders[folderName] = {
//                 groups: folderGroups,
//                 dateCreated: Date.now()
//             };

//             chrome.storage.local.set({ folders }, () => {
//                 hideCreateFolderDialog(); // Use helper to hide and reset
//                 loadSavedGroups(); // Refresh the groups list
//                 updateSavedItemsCount();
//             });
//         });
//     }

//      function openEditFolderDialog(folderName) {
//          hideAllModalDialogs(); // Close other dialogs first
//          chrome.storage.local.get(['folders'], ({ folders = {} }) => {
//             const folder = folders[folderName];
//             if (!folder) {
//                 console.error("Folder not found for editing:", folderName);
//                 showCustomAlert("Could not find the folder to edit.");
//                 return;
//             }

//             state.currentEditingFolderOriginalName = folderName; // Store original name
//             // --- NEW: Set input value ---
//             elements.editFolderName.value = folderName;
//             // --------------------------

//              const currentGroupNames = folder.groups ? Object.keys(folder.groups) : [];
//             populateGroupSelection(elements.editGroupSelection, currentGroupNames);

//             // Reset select all button text
//             const allCheckboxes = elements.editGroupSelection.querySelectorAll('.group-checkbox');
//             const checkedCheckboxes = elements.editGroupSelection.querySelectorAll('.group-checkbox:checked');
//             elements.selectAllEditGroupsBtn.textContent = (allCheckboxes.length > 0 && checkedCheckboxes.length === allCheckboxes.length) ? 'Deselect All' : 'Select All';


//             elements.editFolderDialog.style.display = 'block';
//             elements.editFolderName.focus(); // Focus on the name input
//             elements.editFolderName.select(); // Select the text for easy replacement
//         });
//     }

//      function saveEditedFolder() {
//          // --- NEW: Read from input value ---
//          const newFolderName = elements.editFolderName.value.trim();
//          const originalFolderName = state.currentEditingFolderOriginalName;
//          // --------------------------------

//          if (!newFolderName) {
//              showCustomAlert('Folder name cannot be empty.');
//              elements.editFolderName.focus();
//              return;
//          }

//          if (!originalFolderName) {
//              console.error("Original folder name state is missing.");
//              showCustomAlert("An error occurred. Could not determine the original folder name.");
//              hideEditFolderDialog();
//              return;
//          }

//         const selectedGroups = Array.from(elements.editGroupSelection.querySelectorAll('.group-checkbox:checked'))
//             .map(checkbox => checkbox.dataset.name);

//         chrome.storage.local.get(['folders', 'tabGroups'], ({ folders = {}, tabGroups = {} }) => {
//              // --- NEW: Check for name conflicts ---
//              if (newFolderName !== originalFolderName && folders[newFolderName]) {
//                  showCustomAlert(`A folder named "${newFolderName}" already exists. Please choose a different name.`);
//                  elements.editFolderName.focus();
//                  return;
//              }
//              // -----------------------------------

//              if (!folders[originalFolderName]) {
//                  console.error("Original folder not found during save:", originalFolderName);
//                  showCustomAlert("Error saving folder: Original folder seems to have been deleted.");
//                  hideEditFolderDialog();
//                  loadSavedGroups(); // Refresh list to reflect deletion
//                  return;
//              }

//              // Prepare the updated/new folder data
//              const updatedFolderGroups = {};
//              selectedGroups.forEach(groupName => {
//                 if (tabGroups[groupName]) {
//                     updatedFolderGroups[groupName] = tabGroups[groupName];
//                 } else {
//                      console.warn(`Selected group "${groupName}" not found in tabGroups during folder edit.`);
//                 }
//             });

//              const folderDataToSave = {
//                 groups: updatedFolderGroups,
//                 dateCreated: folders[originalFolderName].dateCreated, // Preserve original creation date
//                 dateModified: Date.now() // Add/update modified date
//              };

//              // --- NEW: Handle rename ---
//              let updatedFolders = { ...folders }; // Copy existing folders
//              if (newFolderName !== originalFolderName) {
//                  // Delete the old entry
//                  delete updatedFolders[originalFolderName];
//              }
//              // Add/update the entry with the new name
//              updatedFolders[newFolderName] = folderDataToSave;
//              // --------------------------


//              chrome.storage.local.set({ folders: updatedFolders }, () => {
//                 hideEditFolderDialog(); // Use helper to hide and clear state
//                 loadSavedGroups(); // Refresh list
//                  // Count might change if groups were added/removed, but rename itself doesn't change count
//                  updateSavedItemsCount(); // Recalculate count just in case
//             });
//         });
//     }


//     // --- Search Functionality ---
//     const handleSearchDebounced = debounce((searchTerm) => {
//         const lowerSearchTerm = searchTerm.trim().toLowerCase();

//          if (lowerSearchTerm === '') {
//             clearSearch(); // clearSearch calls loadSavedGroups
//             return;
//         }

//         elements.clearSearchBtn.classList.add('visible');

//         chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
//              const filteredGroups = {}; // Standalone groups matching
//              const filteredFolders = {}; // Folders matching name OR containing matching groups
//              const groupsInFilteredFolders = new Set(); // Track groups already shown in folders

//              // Search folders first: Check name and contained groups
//             Object.entries(folders).forEach(([folderName, folder]) => {
//                 let folderNameMatches = folderName.toLowerCase().includes(lowerSearchTerm);
//                 let matchingGroupsInFolder = {};
//                 let groupMatchFound = false;

//                  if (folder.groups) {
//                     Object.entries(folder.groups).forEach(([groupName, group]) => {
//                         if (groupName.toLowerCase().includes(lowerSearchTerm)) {
//                             matchingGroupsInFolder[groupName] = group;
//                             groupMatchFound = true;
//                         }
//                     });
//                 }

//                  if (folderNameMatches || groupMatchFound) {
//                     // Always include the folder if its name or any group matches
//                      filteredFolders[folderName] = {
//                         ...folder,
//                         // If only groups matched, show only those groups within the folder result
//                         groups: folderNameMatches ? folder.groups : matchingGroupsInFolder
//                     };
//                      // Add all groups within this matching folder to the set
//                      Object.keys(filteredFolders[folderName].groups || {}).forEach(gn => groupsInFilteredFolders.add(gn));
//                 }
//             });

//              // Search standalone groups (only those NOT already included in a filtered folder)
//             Object.entries(tabGroups).forEach(([name, group]) => {
//                 if (!groupsInFilteredFolders.has(name) && name.toLowerCase().includes(lowerSearchTerm)) {
//                     filteredGroups[name] = group;
//                 }
//             });


//              // --- Render Filtered Results ---
//             const fragment = document.createDocumentFragment();
//             let resultsFound = false;

//              // Render filtered folders (sorted)
//              const sortedFilteredFolderNames = Object.keys(filteredFolders).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
//              sortedFilteredFolderNames.forEach(folderName => {
//                  resultsFound = true;
//                  const folder = filteredFolders[folderName];
//                  const folderElement = document.createElement('div');
//                  folderElement.className = 'folder-item';
//                  folderElement.dataset.folder = folderName;
//                  const folderGroupCount = Object.keys(folder.groups || {}).length;
//                  // Keep expanded in search results for visibility
//                  folderElement.innerHTML = `
//                     <div class="folder-header">
//                          <div class="folder-title">
//                              <i class="fas fa-folder"></i>
//                              <span>${folderName}</span>
//                              <span class="folder-count">(${folderGroupCount})</span>
//                          </div>
//                           <div class="folder-header-actions">
//                             <button class="action-button edit-folder-btn" title="Edit Folder"><i class="fas fa-edit"></i></button>
//                             <button class="action-button toggle-folder-btn" title="Expand/Collapse"><i class="fas fa-chevron-up"></i></button> </div>
//                     </div>
//                     <div class="folder-content expanded"> <ul></ul>
//                         <div class="folder-actions">
//                             <button class="action-button delete-folder-btn"><i class="fas fa-trash"></i> Delete Folder</button>
//                        </div>
//                     </div>`;

//                  const folderContentUl = folderElement.querySelector('.folder-content ul');
//                 if (folder.groups && folderGroupCount > 0) {
//                      const sortedGroupNames = Object.keys(folder.groups).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
//                      sortedGroupNames.forEach(groupName => {
//                         folderContentUl.appendChild(createGroupListItem(groupName, folder.groups[groupName], folderName));
//                     });
//                 } else {
//                     // This case might occur if folder name matched but contained groups didn't
//                     folderContentUl.innerHTML = '<li class="empty-folder">No matching groups inside this folder.</li>';
//                 }
//                  fragment.appendChild(folderElement);
//             });

//              // Render filtered standalone groups (sorted)
//              const standaloneGroupList = document.createElement('ul');
//              standaloneGroupList.className = 'standalone-groups-list';
//              const sortedFilteredGroupNames = Object.keys(filteredGroups).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
//              sortedFilteredGroupNames.forEach(name => {
//                  resultsFound = true;
//                  standaloneGroupList.appendChild(createGroupListItem(name, filteredGroups[name]));
//              });

//              if (standaloneGroupList.hasChildNodes()) {
//                  // Optional separator if both folders and groups are found
//                  if (Object.keys(filteredFolders).length > 0) {
//                      // const separator = document.createElement('hr'); fragment.appendChild(separator);
//                  }
//                  fragment.appendChild(standaloneGroupList);
//              }


//              // Display results or 'no results' message
//              elements.groupsList.innerHTML = '';
//              if (resultsFound) {
//                  elements.groupsList.appendChild(fragment);
//              } else {
//                  elements.groupsList.innerHTML = '<div class="no-results">No matching groups or folders found.</div>';
//              }
//         });
//     }, 300); // 300ms debounce


//     function clearSearch() {
//         elements.searchInput.value = '';
//         elements.clearSearchBtn.classList.remove('visible');
//         // Only reload if we are currently on the groups tab
//         if (state.activeSection === 'groups') {
//             loadSavedGroups(); // Reload all groups
//         }
//     }

//     // --- Bookmark Logic ---
//      function loadBookmarks() {
//         chrome.storage.local.get(['bookmarks'], ({ bookmarks = [] }) => {
//             if (!elements.bookmarksList) return; // Ensure element exists

//              const fragment = document.createDocumentFragment();
//              if (!bookmarks || bookmarks.length === 0) {
//                  const emptyMessage = document.createElement('div');
//                  emptyMessage.className = 'empty-message';
//                  emptyMessage.textContent = 'No bookmarks yet. Right-click on any page and select "Bookmark this page".';
//                  fragment.appendChild(emptyMessage);
//             } else {
//                  // Sort bookmarks alphabetically by title
//                  bookmarks.sort((a, b) => (a.title || a.url).localeCompare(b.title || b.url, undefined, { sensitivity: 'base' }));

//                  bookmarks.forEach(bookmark => {
//                     if (!bookmark || !bookmark.url) return; // Skip invalid bookmarks

//                      const item = document.createElement('div');
//                     item.className = 'bookmark-item';
//                     item.dataset.url = bookmark.url; // Add URL for easier deletion targeting

//                      // Sanitize title and URL display if necessary
//                     const title = bookmark.title || bookmark.url; // Fallback to URL if no title
//                     const displayUrl = bookmark.url;

//                      item.innerHTML = `
//                         <img class="bookmark-favicon" src="${bookmark.favIconUrl || 'icon.png'}" onerror="this.src='icon.png';" alt="">
//                         <div class="bookmark-content">
//                             <div class="bookmark-title" title="${title}">${title}</div>
//                             <div class="bookmark-url" title="${displayUrl}">${displayUrl}</div>
//                         </div>
//                         <button class="action-button delete-bookmark-btn" title="Delete Bookmark">
//                             <i class="fas fa-trash"></i>
//                         </button>
//                     `;
//                     fragment.appendChild(item);
//                 });
//             }

//              elements.bookmarksList.innerHTML = ''; // Clear previous
//              elements.bookmarksList.appendChild(fragment);
//         });
//     }

//      function deleteBookmark(url) {
//          // Simple confirmation for bookmarks
//          showCustomConfirm(`Delete bookmark for "${url}"?`, () => {
//             chrome.storage.local.get(['bookmarks'], ({ bookmarks = [] }) => {
//                 const updatedBookmarks = bookmarks.filter(bookmark => bookmark && bookmark.url !== url);
//                 chrome.storage.local.set({ bookmarks: updatedBookmarks }, () => {
//                     loadBookmarks(); // Refresh the list
//                     updateSavedItemsCount();
//                 });
//             });
//         });
//     }

//     // --- Todo Logic ---
//     function renderTodos() {
//          chrome.storage.local.get(['todos'], ({ todos = [] }) => {
//             if (!elements.todoList) return;

//              const fragment = document.createDocumentFragment();
//             if (!todos || todos.length === 0) {
//                  const emptyMessage = document.createElement('div');
//                  emptyMessage.className = 'empty-message';
//                  emptyMessage.textContent = 'No todo items yet. Add one above!';
//                  fragment.appendChild(emptyMessage);
//             } else {
//                  // Sort todos: incomplete first, then by date added (newest first)
//                  todos.sort((a, b) => (a.completed - b.completed) || ((b.dateAdded || 0) - (a.dateAdded || 0)));

//                  todos.forEach(todo => {
//                     if (!todo || typeof todo.id === 'undefined') return; // Skip invalid todos

//                      const item = document.createElement('div');
//                     item.className = `todo-item ${todo.completed ? 'completed' : ''}`;
//                     item.dataset.id = todo.id;
//                     // Sanitize text - basic example, consider a library for robustness
//                     const textContent = (todo.text || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");


//                      item.innerHTML = `
//                       <div class="todo-content">
//                         <div class="todo-checkbox">
//                           <input type="checkbox" id="todo-check-${todo.id}" ${todo.completed ? 'checked' : ''}>
//                           <label for="todo-check-${todo.id}" class="checkmark"></label>
//                         </div>
//                         <div class="todo-text">${textContent}</div>
//                       </div>
//                       <button class="action-button delete-todo" title="Delete Todo">
//                           <i class="fas fa-trash"></i>
//                       </button>
//                     `;
//                     fragment.appendChild(item);
//                 });
//             }
//              elements.todoList.innerHTML = ''; // Clear previous
//             elements.todoList.appendChild(fragment);
//         });
//     }

//      function addNewTodo() {
//         const todoText = elements.newTodoInput.value.trim();
//         if (todoText) {
//             chrome.storage.local.get(['todos'], ({ todos = [] }) => {
//                 const newTodo = {
//                     id: Date.now() + Math.random(), // Add random component for higher uniqueness chance
//                     text: todoText,
//                     completed: false,
//                     dateAdded: Date.now()
//                 };
//                 // Add to the beginning of the list for immediate visibility
//                 const updatedTodos = [newTodo, ...todos];

//                  chrome.storage.local.set({ todos: updatedTodos }, () => {
//                     renderTodos(); // Refresh list
//                     elements.newTodoInput.value = ''; // Clear input
//                     elements.newTodoInput.focus(); // Keep focus
//                     updateSavedItemsCount();
//                 });
//             });
//         }
//     }

//     function toggleTodoComplete(todoId) {
//         // Find the item in the DOM first for immediate visual feedback
//         const todoItem = elements.todoList.querySelector(`.todo-item[data-id="${todoId}"]`);
//         if (!todoItem) return;

//          const checkbox = todoItem.querySelector('input[type="checkbox"]');
//          // Ensure checkbox exists before reading property
//          if (!checkbox) return;
//          const isCompleted = checkbox.checked; // State *after* the click

//          // Toggle class immediately
//         todoItem.classList.toggle('completed', isCompleted);

//          // Update storage asynchronously
//         requestAnimationFrame(() => {
//             chrome.storage.local.get(['todos'], ({ todos = [] }) => {
//                 // Ensure todoId is treated consistently (string vs number)
//                 const idToFind = String(todoId);
//                 const todoIndex = todos.findIndex(todo => todo && String(todo.id) === idToFind);

//                 if (todoIndex !== -1) {
//                     todos[todoIndex].completed = isCompleted;
//                     // Optional: Re-render if sorting changes order significantly
//                     chrome.storage.local.set({ todos: todos }, () => {
//                          // Re-render only if sorting is important after completion change
//                          // renderTodos();
//                     });
//                 } else {
//                     console.warn("Todo item not found in storage for toggling:", todoId);
//                 }
//             });
//         });
//     }

//     function deleteTodo(todoId) {
//          // Add confirmation? For now, direct delete.
//          // showCustomConfirm("Delete this todo item?", () => { ... });

//          chrome.storage.local.get(['todos'], ({ todos = [] }) => {
//              const idToDelete = String(todoId); // Ensure consistent type
//             const updatedTodos = todos.filter(todo => todo && String(todo.id) !== idToDelete);

//              // Check if anything actually changed
//              if (updatedTodos.length !== todos.length) {
//                  chrome.storage.local.set({ todos: updatedTodos }, () => {
//                      // Remove directly from DOM for instant feedback
//                     const todoItem = elements.todoList.querySelector(`.todo-item[data-id="${todoId}"]`);
//                     if (todoItem) {
//                         todoItem.remove();
//                          // Check if list is now empty and show message
//                         if (elements.todoList.children.length === 0) {
//                              renderTodos(); // Will show the empty message
//                         }
//                     } else {
//                          renderTodos(); // Fallback refresh if DOM element wasn't found
//                     }
//                     updateSavedItemsCount();
//                 });
//              } else {
//                  console.warn("Todo item not found in storage for deletion:", todoId);
//              }
//         });
//     }

//     // --- Event Listeners Setup ---
//     function setupEventListeners() {
//         // Navigation Tabs
//         elements.navTabs.forEach(tab => {
//              // Special handling for folder button click
//             if (tab.id === 'folderButton') {
//                 tab.addEventListener('click', () => {
//                      hideAllModalDialogs(); // Close other dialogs first
//                      populateGroupSelection(elements.groupSelection); // Populate with no groups selected
//                      elements.selectAllGroupsBtn.textContent = 'Select All'; // Reset button
//                     elements.folderDialog.style.display = 'block';
//                     elements.folderNameInput.focus();
//                 });
//             } else {
//                  // Standard tabs
//                 tab.addEventListener('click', () => {
//                     // Only switch if it's a different section and has a dataset
//                     if (tab.dataset.section && state.activeSection !== tab.dataset.section) {
//                         switchSection(tab.dataset.section);
//                     }
//                 });
//             }
//         });

//         // Add Group Dropdown
//         elements.addButton.addEventListener('click', showSaveDropdown);
//         elements.closeDropdownBtn.addEventListener('click', () => elements.saveDropdown.style.display = 'none');
//         elements.saveTabsButton.addEventListener('click', saveSelectedTabs);
//         elements.selectAllBtn.addEventListener('click', () => toggleSelectAll(elements.tabsChecklist, elements.selectAllBtn, '.tab-checkbox'));


//          // Create Folder Dialog
//          elements.closeFolderBtn.addEventListener('click', hideCreateFolderDialog);
//          elements.selectAllGroupsBtn.addEventListener('click', () => toggleSelectAll(elements.groupSelection, elements.selectAllGroupsBtn, '.group-checkbox'));
//          elements.createFolderBtn.addEventListener('click', createNewFolder);


//          // Edit Folder Dialog
//          elements.closeEditFolderBtn.addEventListener('click', hideEditFolderDialog);
//          elements.selectAllEditGroupsBtn.addEventListener('click', () => toggleSelectAll(elements.editGroupSelection, elements.selectAllEditGroupsBtn, '.group-checkbox'));
//          elements.saveEditFolderBtn.addEventListener('click', saveEditedFolder);


//          // Search
//         elements.searchInput.addEventListener('input', (e) => handleSearchDebounced(e.target.value));
//         elements.clearSearchBtn.addEventListener('click', clearSearch);


//         // --- Event Delegation for Dynamic Lists ---

//         // Groups List (Handles Folders and Groups)
//         elements.groupsList.addEventListener('click', (e) => {
//             const target = e.target;
//             // Find closest relevant elements
//             const groupItem = target.closest('li[data-group]');
//             const folderItem = target.closest('.folder-item[data-folder]');
//             const folderHeader = target.closest('.folder-header');

//             // Action Buttons inside list items or folder headers
//             const openBtn = target.closest('.open-btn');
//             const deleteGroupBtn = target.closest('.delete-btn'); // Group delete
//             const editFolderBtn = target.closest('.edit-folder-btn');
//             const toggleFolderBtn = target.closest('.toggle-folder-btn');
//             const deleteFolderBtn = target.closest('.delete-folder-btn');


//              // Toggle Folder Expansion
//              if (toggleFolderBtn && folderItem) {
//                 e.stopPropagation();
//                  const folderContent = folderItem.querySelector('.folder-content');
//                  const icon = toggleFolderBtn.querySelector('i');
//                  if (folderContent) {
//                      const isExpanding = !folderContent.classList.contains('expanded');
//                      folderContent.classList.toggle('expanded', isExpanding);
//                      icon?.classList.toggle('fa-chevron-down', !isExpanding);
//                      icon?.classList.toggle('fa-chevron-up', isExpanding);
//                  }
//                  return;
//              }

//              // Edit Folder Button
//             if (editFolderBtn && folderItem) {
//                 e.stopPropagation();
//                 const folderName = folderItem.dataset.folder;
//                 if (folderName) openEditFolderDialog(folderName);
//                 return;
//             }

//              // Delete Folder Button
//             if (deleteFolderBtn && folderItem) {
//                  e.stopPropagation();
//                 const folderName = folderItem.dataset.folder;
//                  if (folderName) deleteFolder(folderName);
//                  return;
//             }

//              // Open Group Button
//              if (openBtn && groupItem) {
//                  const groupName = groupItem.dataset.group;
//                  const folderName = groupItem.dataset.folder; // null for standalone
//                  if (groupName) {
//                      chrome.storage.local.get(['tabGroups', 'folders'], ({ tabGroups = {}, folders = {} }) => {
//                          const groupData = folderName ? folders[folderName]?.groups?.[groupName] : tabGroups[groupName];
//                          if (groupData) openTabGroup(groupData);
//                          else {
//                             console.error(`Group data not found for ${groupName} in ${folderName || 'standalone'}`);
//                             showCustomAlert("Error: Could not find data for this group.");
//                          }
//                      });
//                  }
//                  return;
//              }

//              // Delete Group Button
//              if (deleteGroupBtn && groupItem) {
//                  const groupName = groupItem.dataset.group;
//                  const folderName = groupItem.dataset.folder; // null if standalone
//                  if (groupName) deleteTabGroup(groupName, folderName); // Pass folder context for msg
//                  return;
//              }

//              // Click on folder header (but not buttons inside header actions) to toggle
//              if (folderHeader && folderItem && !target.closest('.folder-header-actions button')) {
//                  const folderContent = folderItem.querySelector('.folder-content');
//                  const icon = folderHeader.querySelector('.toggle-folder-btn i');
//                  if (folderContent) {
//                     const isExpanding = !folderContent.classList.contains('expanded');
//                     folderContent.classList.toggle('expanded', isExpanding);
//                     icon?.classList.toggle('fa-chevron-down', !isExpanding);
//                     icon?.classList.toggle('fa-chevron-up', isExpanding);
//                 }
//                  return;
//              }

//         });

//          // Bookmarks List
//          if (elements.bookmarksList) {
//              elements.bookmarksList.addEventListener('click', (e) => {
//                  const target = e.target;
//                  const bookmarkItem = target.closest('.bookmark-item');
//                  const url = bookmarkItem?.dataset.url;

//                  if (!url) return; // Clicked outside an item

//                  // Delete Button
//                  if (target.closest('.delete-bookmark-btn')) {
//                      deleteBookmark(url);
//                  }
//                  // Click on item itself (but not delete button)
//                  else {
//                      chrome.tabs.create({ url: url, active: true }); // Open in foreground
//                  }
//              });
//          }


//          // Todo List
//         if (elements.todoList) {
//             elements.todoList.addEventListener('click', (e) => {
//                  const target = e.target;
//                  const todoItem = target.closest('.todo-item');
//                  const todoId = todoItem?.dataset.id;

//                  if (!todoId) return; // Clicked outside an item

//                  // Delete Button
//                  if (target.closest('.delete-todo')) {
//                      deleteTodo(todoId);
//                  }
//                  // Checkbox click (handle click on input or the custom checkmark label)
//                  else if (target.closest('.todo-checkbox')) {
//                      // Use timeout to ensure the 'checked' property is updated in the DOM before reading
//                      setTimeout(() => toggleTodoComplete(todoId), 0);
//                  }
//              });
//         }

//         // Todo Input Form
//          elements.submitTodoBtn.addEventListener('click', addNewTodo);
//          elements.newTodoInput.addEventListener('keypress', (e) => {
//             if (e.key === 'Enter') {
//                 e.preventDefault(); // Prevent potential form submission
//                 addNewTodo();
//             }
//         });

//     }


//     // --- Initialization ---
//     function init() {
//         updateTabCount();
//         updateSavedItemsCount(); // Initial count
//         setupEventListeners();
//         // Load initial section content based on the default active section
//         switchSection(state.activeSection);
//     }

//     // Start the application
//     init();

// }); // End DOMContentLoaded
