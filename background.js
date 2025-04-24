// Set up context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "bookmarkPage",
    title: "Bookmark this page",
    contexts: ["page", "link"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "bookmarkPage") {
    // Get the URL either from the clicked link or current page
    const url = info.linkUrl || tab.url;
    const title = tab.title;
    const favIconUrl = tab.favIconUrl || '';
    
    // Save the bookmark
    chrome.storage.local.get(['bookmarks'], (result) => {
      const bookmarks = result.bookmarks || [];
      
      // Check if bookmark already exists
      if (!bookmarks.some(bookmark => bookmark.url === url)) {
        bookmarks.push({
          url,
          title,
          favIconUrl,
          dateAdded: Date.now()
        });
        
        chrome.storage.local.set({ bookmarks }, () => {
          console.log('Bookmark saved:', url);
          
          // Notification feedback
          chrome.action.setBadgeText({ text: "+" });
          chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
          
          // Clear badge after 2 seconds
          setTimeout(() => {
            chrome.action.setBadgeText({ text: "" });
          }, 2000);
        });
      } else {
        console.log('Bookmark already exists:', url);
      }
    });
  }
});