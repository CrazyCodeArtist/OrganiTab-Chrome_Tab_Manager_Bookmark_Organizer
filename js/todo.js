/**
 * todo.js - To-Do List Management Logic
 */

var app = app || {};
app.todo = {};

app.todo.renderTodos = function() {
    chrome.storage.local.get(['todos'], ({ todos = [] }) => {
        if (!app.elements.todoList) return;

        const fragment = document.createDocumentFragment();
        if (!todos || todos.length === 0) {
             fragment.innerHTML = '<div class="empty-message">No todo items yet. Add one above!</div>';
        } else {
             todos.sort((a, b) => (a.completed - b.completed) || ((b.dateAdded || 0) - (a.dateAdded || 0)));
             todos.forEach(todo => {
                if (!todo || typeof todo.id === 'undefined') return;
                const item = document.createElement('div');
                item.className = `todo-item ${todo.completed ? 'completed' : ''}`;
                item.dataset.id = todo.id;
                const textContent = (todo.text || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                item.innerHTML = `
                  <div class="todo-content">
                    <div class="todo-checkbox">
                      <input type="checkbox" id="todo-check-${todo.id}" ${todo.completed ? 'checked' : ''}>
                      <label for="todo-check-${todo.id}" class="checkmark"></label>
                    </div>
                    <div class="todo-text">${textContent}</div>
                  </div>
                  <button class="action-button delete-todo" title="Delete Todo"><i class="fas fa-trash"></i></button>
                `;
                fragment.appendChild(item);
            });
        }
        app.elements.todoList.innerHTML = '';
        app.elements.todoList.appendChild(fragment);
    });
};

app.todo.addNewTodo = function() {
    const todoText = app.elements.newTodoInput.value.trim();
    if (todoText) {
        chrome.storage.local.get(['todos'], ({ todos = [] }) => {
            const newTodo = { id: Date.now() + Math.random(), text: todoText, completed: false, dateAdded: Date.now() };
            const updatedTodos = [newTodo, ...todos];
             chrome.storage.local.set({ todos: updatedTodos }, () => {
                app.todo.renderTodos(); // Refresh list
                app.elements.newTodoInput.value = '';
                app.elements.newTodoInput.focus();
                app.utils.updateSavedItemsCount(); // Use utility
            });
        });
    }
};

app.todo.toggleTodoComplete = function(todoId) {
    const todoItem = app.elements.todoList.querySelector(`.todo-item[data-id="${todoId}"]`);
    if (!todoItem) return;
    const checkbox = todoItem.querySelector('input[type="checkbox"]');
    if (!checkbox) return;
    const isCompleted = checkbox.checked;

    todoItem.classList.toggle('completed', isCompleted); // Immediate visual feedback

    requestAnimationFrame(() => { // Update storage async
        chrome.storage.local.get(['todos'], ({ todos = [] }) => {
            const idToFind = String(todoId);
            const todoIndex = todos.findIndex(todo => todo && String(todo.id) === idToFind);
            if (todoIndex !== -1) {
                todos[todoIndex].completed = isCompleted;
                chrome.storage.local.set({ todos: todos }, () => {
                    // Optional: Re-render if sorting changes order significantly
                    // app.todo.renderTodos();
                });
            } else { console.warn("Todo item not found in storage for toggling:", todoId); }
        });
    });
};

app.todo.deleteTodo = function(todoId) {
    chrome.storage.local.get(['todos'], ({ todos = [] }) => {
         const idToDelete = String(todoId);
        const updatedTodos = todos.filter(todo => todo && String(todo.id) !== idToDelete);
         if (updatedTodos.length !== todos.length) {
             chrome.storage.local.set({ todos: updatedTodos }, () => {
                const todoItem = app.elements.todoList.querySelector(`.todo-item[data-id="${todoId}"]`);
                if (todoItem) {
                    todoItem.remove(); // Remove from DOM
                    if (app.elements.todoList.children.length === 0) { app.todo.renderTodos(); } // Show empty message if needed
                } else { app.todo.renderTodos(); } // Fallback refresh
                app.utils.updateSavedItemsCount(); // Use utility
            });
         } else { console.warn("Todo item not found in storage for deletion:", todoId); }
    });
};


// --- Event Handlers (Specific to Todo section, initialized in main.js) ---
app.todo.setupEventListeners = function() {
    // Add Todo Form
    app.elements.submitTodoBtn.addEventListener('click', app.todo.addNewTodo);
    app.elements.newTodoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); app.todo.addNewTodo(); }
    });

    // Event Delegation for Todo List actions
    if (app.elements.todoList) {
        app.elements.todoList.addEventListener('click', (e) => {
             const target = e.target;
             const todoItem = target.closest('.todo-item');
             const todoId = todoItem?.dataset.id;

             if (!todoId) return;

             if (target.closest('.delete-todo')) { // Delete Button
                 app.todo.deleteTodo(todoId);
             } else if (target.closest('.todo-checkbox')) { // Checkbox click
                 setTimeout(() => app.todo.toggleTodoComplete(todoId), 0); // Use timeout
             }
         });
    }
};

console.log("todo.js loaded"); // For debugging load order