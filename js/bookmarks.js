/**
 * bookmarks.js - Bookmark Management Logic
 */

var app = app || {};
app.bookmarks = {};

app.bookmarks.loadBookmarks = function() {
    chrome.storage.local.get(['bookmarks'], ({ bookmarks = [] }) => {
        if (!app.elements.bookmarksList) return;

        const fragment = document.createDocumentFragment();
        if (!bookmarks || bookmarks.length === 0) {
            fragment.innerHTML = '<div class="empty-message">No bookmarks yet. Right-click page &rarr; "Bookmark this page".</div>';
        } else {
             bookmarks.sort((a, b) => (a.title || a.url).localeCompare(b.title || b.url, undefined, { sensitivity: 'base' }));
             bookmarks.forEach(bookmark => {
                if (!bookmark || !bookmark.url) return;
                const item = document.createElement('div');
                item.className = 'bookmark-item';
                item.dataset.url = bookmark.url;
                const title = bookmark.title || bookmark.url;
                const displayUrl = bookmark.url;
                item.innerHTML = `
                    <img class="bookmark-favicon" src="${bookmark.favIconUrl || 'icon.png'}" onerror="this.src='icon.png';" alt="">
                    <div class="bookmark-content">
                        <div class="bookmark-title" title="${title}">${title}</div>
                        <div class="bookmark-url" title="${displayUrl}">${displayUrl}</div>
                    </div>
                    <button class="action-button delete-bookmark-btn" title="Delete Bookmark"><i class="fas fa-trash"></i></button>
                `;
                fragment.appendChild(item);
            });
        }
        app.elements.bookmarksList.innerHTML = '';
        app.elements.bookmarksList.appendChild(fragment);
    });
};

app.bookmarks.deleteBookmark = function(url) {
     app.utils.showCustomConfirm(`Delete bookmark for "${url}"?`, () => { // Use utility
        chrome.storage.local.get(['bookmarks'], ({ bookmarks = [] }) => {
            const updatedBookmarks = bookmarks.filter(bookmark => bookmark && bookmark.url !== url);
            chrome.storage.local.set({ bookmarks: updatedBookmarks }, () => {
                app.bookmarks.loadBookmarks(); // Refresh list
                app.utils.updateSavedItemsCount(); // Use utility
            });
        });
    });
};

// --- Event Handlers (Specific to Bookmarks section, initialized in main.js) ---
app.bookmarks.setupEventListeners = function() {
    if (app.elements.bookmarksList) {
         app.elements.bookmarksList.addEventListener('click', (e) => {
             const target = e.target;
             const bookmarkItem = target.closest('.bookmark-item');
             const url = bookmarkItem?.dataset.url;

             if (!url) return;

             if (target.closest('.delete-bookmark-btn')) { // Delete Button
                 app.bookmarks.deleteBookmark(url);
             } else { // Click on item itself
                 chrome.tabs.create({ url: url, active: true });
             }
         });
     }
};

console.log("bookmarks.js loaded"); // For debugging load order

