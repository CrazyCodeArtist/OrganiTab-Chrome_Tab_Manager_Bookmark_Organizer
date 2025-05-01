// --- Utility Functions ---
let isSavingTabs = false;


// Helper to get current timestamp string for group names
function getTimestampGroupName() {
  const now = new Date();
  // Format: YYYY-MM-DD HH:MM:SS (adjust format as needed)
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  return `Saved Tabs ${dateStr} ${timeStr}`;
}

// Helper to show a temporary badge notification
function showBadgeNotification(text, color = "#4CAF50", duration = 2000) {
  chrome.action.setBadgeText({ text: text });
  chrome.action.setBadgeBackgroundColor({ color: color });
  setTimeout(() => {
      chrome.action.setBadgeText({ text: "" });
  }, duration);
}


// --- Context Menu Setup & Handler ---

chrome.runtime.onInstalled.addListener(() => {
  console.log("OrganiTab Installed/Updated.");
  // Context Menu for Bookmarking
  chrome.contextMenus.create({
      id: "bookmarkPage",
      title: "Bookmark this page (OrganiTab)", // Clarify origin
      contexts: ["page", "link"]
  });
  console.log("Context menu created.");
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "bookmarkPage") {
      handleBookmarkAction(info.linkUrl, tab); // Use shared handler
  }
});


// --- Command Handlers ---

chrome.commands.onCommand.addListener((command, tab) => {
  console.log(`Command received: ${command}`);

  switch (command) {
      case "save-all-tabs":
          handleSaveAllTabs();
          break;
      case "bookmark-current-page":
          // For bookmark command, we need the *active* tab, not necessarily the one passed if invoked differently
           chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
               if (tabs && tabs.length > 0) {
                   handleBookmarkAction(null, tabs[0]); // Pass null for linkUrl, use active tab info
               } else {
                   console.error("Could not get active tab for bookmark command.");
               }
           });
          break;
      // Note: _execute_action (opening the popup) is handled by Chrome directly based on manifest.
      default:
          console.log(`Command ${command} not explicitly handled.`);
  }
});


// --- Action Logic Implementation ---

function handleSaveAllTabs() {
    if (isSavingTabs) {
        showBadgeNotification("…", "#FFA500");  // “already in progress”
        return;
      }
      isSavingTabs = true;
    chrome.windows.getCurrent({ populate: true }, (currentWindow) => {
      if (chrome.runtime.lastError) {
          return;
      }
      if (!currentWindow || !currentWindow.tabs || currentWindow.tabs.length === 0) {
          showBadgeNotification("!", "#FFA500"); // Orange badge for warning
          return;
      }

      const tabsToSave = currentWindow.tabs.map(tab => ({
          url: tab.url,
          title: tab.title,
          favIconUrl: tab.favIconUrl || '' // Ensure favicon is included
      }));

      let groupName = getTimestampGroupName();

      chrome.storage.local.get(['tabGroups'], ({ tabGroups = {} }) => {
          if (tabGroups[groupName]) {
              console.warn(`Group name "${groupName}" already exists. Appending timestamp.`);
              // Append milliseconds or a counter if needed, though collision is rare.
               groupName += `-${Date.now()}`;
          }

          tabGroups[groupName] = { tabs: tabsToSave, dateAdded: Date.now() };

          chrome.storage.local.set({ tabGroups }, () => {
            isSavingTabs = false;  

              if (chrome.runtime.lastError) {
                  console.error("Error saving tab group:", chrome.runtime.lastError);
                  showBadgeNotification("Err", "#FF0000"); // Red badge for error
              } else {
                  console.log(`Saved ${tabsToSave.length} tabs to group "${groupName}".`);
                  showBadgeNotification("✓"); // Green check for success
                  // Optionally update count in popup if open (more complex event handling needed)
              }
          });
      });
  });
}

// Shared bookmark logic for context menu and command
function handleBookmarkAction(linkUrl, tab) {
  // Use linkUrl if provided (from context menu on a link), otherwise use the tab's URL
  const url = linkUrl || tab.url;
  // Use tab title only if we're bookmarking the tab itself, not a link
  const title = linkUrl ? (url) : (tab.title || url); // Use URL as fallback title if tab title is empty
  // Use tab favicon only if bookmarking the tab itself
  const favIconUrl = linkUrl ? '' : (tab.favIconUrl || '');

  if (!url || url.startsWith('chrome://') || url.startsWith('about:')) {
      console.warn("Cannot bookmark internal Chrome pages.");
      showBadgeNotification("!", "#FFA500");
      return;
  }

  chrome.storage.local.get(['bookmarks'], (result) => {
      const bookmarks = result.bookmarks || [];

      // Check if bookmark already exists (based on URL)
      if (!bookmarks.some(bookmark => bookmark.url === url)) {
          bookmarks.push({
              url,
              title,
              favIconUrl,
              dateAdded: Date.now()
          });

          chrome.storage.local.set({ bookmarks }, () => {
               if (chrome.runtime.lastError) {
                  console.error("Error saving bookmark:", chrome.runtime.lastError);
                  showBadgeNotification("Err", "#FF0000");
               } else {
                  console.log('Bookmark saved:', url);
                  showBadgeNotification("+"); // Simple plus for bookmark add
               }
          });
      } else {
          console.log('Bookmark already exists:', url);
          showBadgeNotification("=", "#FFFF00"); // Yellow equals for already exists
      }
  });
}

console.log("OrganiTab background script loaded.");
