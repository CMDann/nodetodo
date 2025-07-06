// Terminal Todo App JavaScript

// Global variables
let todos = [];
let projectInfo = { title: 'Todo Project', description: '' };
let currentEditor = null;
let currentEditingId = null;
let originalNotesContent = null;
let autoSaveTimeout = null;
let draggedElement = null;
let draggedId = null;

// Project functions
async function loadProject() {
    try {
        const response = await fetch('/api/project');
        if (response.ok) {
            projectInfo = await response.json();
        } else {
            // Use defaults if API fails
            projectInfo = { title: 'Todo Project', description: '' };
        }
        updateProjectDisplay();
    } catch (error) {
        console.error('Error loading project:', error);
        // Use defaults on error
        projectInfo = { title: 'Todo Project', description: '' };
        updateProjectDisplay();
    }
}

function updateProjectDisplay() {
    document.getElementById('projectTitle').textContent = projectInfo.title || 'Todo Project';
    document.getElementById('projectDescription').textContent = projectInfo.description || 'Click edit to add a project description';
}

function editProject() {
    document.getElementById('projectTitleInput').value = projectInfo.title || '';
    document.getElementById('projectDescriptionInput').value = projectInfo.description || '';
    document.getElementById('projectEditForm').style.display = 'block';
    document.querySelector('.project-edit-btn').style.display = 'none';
}

async function saveProject() {
    const title = document.getElementById('projectTitleInput').value.trim();
    const description = document.getElementById('projectDescriptionInput').value.trim();
    
    try {
        const response = await fetch('/api/project', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, description }),
        });

        if (response.ok) {
            projectInfo.title = title || 'Todo Project';
            projectInfo.description = description;
            updateProjectDisplay();
            cancelProjectEdit();
        }
    } catch (error) {
        console.error('Error saving project:', error);
    }
}

function cancelProjectEdit() {
    document.getElementById('projectEditForm').style.display = 'none';
    document.querySelector('.project-edit-btn').style.display = 'inline-block';
}

// Todo functions
async function loadTodos() {
    try {
        const response = await fetch('/api/todos');
        todos = await response.json();
        renderTodos();
    } catch (error) {
        console.error('Error loading todos:', error);
    }
}

async function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    
    if (!text) return;

    try {
        const response = await fetch('/api/todos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        if (response.ok) {
            input.value = '';
            loadTodos();
        }
    } catch (error) {
        console.error('Error adding todo:', error);
    }
}

async function toggleTodo(id, completed) {
    try {
        const response = await fetch(`/api/todos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ completed }),
        });

        if (response.ok) {
            loadTodos();
        }
    } catch (error) {
        console.error('Error updating todo:', error);
    }
}

async function editTodo(id, newText, newNotes) {
    try {
        const updateData = {};
        if (newText !== undefined) updateData.text = newText;
        if (newNotes !== undefined) updateData.notes = newNotes;
        
        console.log('Updating todo', id, 'with data:', updateData);
        
        const response = await fetch(`/api/todos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
        });

        if (response.ok) {
            console.log('Update successful');
            // Update local todos array immediately
            const todoIndex = todos.findIndex(t => t.id === id);
            if (todoIndex !== -1) {
                if (newText !== undefined) todos[todoIndex].text = newText;
                if (newNotes !== undefined) todos[todoIndex].notes = newNotes;
                todos[todoIndex].updated_at = new Date().toISOString();
            }
            renderTodos();
            // Also refresh from server to get accurate timestamp
            setTimeout(loadTodos, 100);
        } else {
            console.error('Update failed:', await response.text());
            loadTodos(); // Reload on error
        }
    } catch (error) {
        console.error('Error editing todo:', error);
        loadTodos(); // Reload on error
    }
}

async function deleteTodo(id) {
    try {
        const response = await fetch(`/api/todos/${id}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            loadTodos();
        }
    } catch (error) {
        console.error('Error deleting todo:', error);
    }
}

// Notes functions
function toggleNotes(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const todoElement = document.querySelector(`[data-todo-id="${id}"]`);
    const notesSection = todoElement.querySelector('.notes-section');
    
    if (notesSection.style.display === 'none' || !notesSection.style.display) {
        notesSection.style.display = 'block';
    } else {
        notesSection.style.display = 'none';
    }
}

function editNotes(id) {
    // If another editor is open, auto-save it first
    if (currentEditor && currentEditingId && currentEditingId !== id) {
        autoSaveCurrentEditor();
    }

    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const todoElement = document.querySelector(`[data-todo-id="${id}"]`);
    const notesText = todoElement.querySelector('.notes-text');
    const notesButtons = todoElement.querySelector('.notes-buttons');
    
    // Store original content for comparison
    originalNotesContent = todo.notes || '';
    
    // Create editor container
    const editorContainer = document.createElement('div');
    editorContainer.className = 'notes-editor-container';
    editorContainer.id = `editor-${id}`;
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'notes-btn';
    saveBtn.textContent = 'SAVE & CLOSE';
    saveBtn.onclick = () => saveNotesFromEditor(id);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'notes-btn';
    cancelBtn.textContent = 'DISCARD';
    cancelBtn.onclick = () => cancelNotesEdit(id);
    
    notesText.style.display = 'none';
    notesButtons.style.display = 'none';
    
    notesText.parentNode.insertBefore(editorContainer, notesText);
    notesText.parentNode.insertBefore(saveBtn, notesText);
    notesText.parentNode.insertBefore(cancelBtn, notesText);
    
    // Initialize Quill editor
    currentEditor = new Quill(`#editor-${id}`, {
        theme: 'snow',
        placeholder: 'Add notes with formatting...',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'header': [1, 2, 3, false] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['blockquote'],
                ['clean']
            ]
        }
    });
    
    // Set existing content
    if (todo.notes) {
        currentEditor.root.innerHTML = todo.notes;
    }
    
    currentEditingId = id;
    
    // Set up auto-save on content change
    currentEditor.on('text-change', function(delta, oldDelta, source) {
        if (source === 'user') {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                autoSaveCurrentEditor(false); // false = don't close editor
            }, 2000); // Auto-save after 2 seconds of inactivity
        }
    });
    
    currentEditor.focus();
}

function autoSaveCurrentEditor(closeEditor = true) {
    if (currentEditor && currentEditingId) {
        const htmlContent = currentEditor.root.innerHTML;
        const plainText = currentEditor.getText().trim();
        
        // Only save if content has changed and is not empty
        if (htmlContent !== originalNotesContent && plainText.length > 0) {
            console.log('Auto-saving notes for todo', currentEditingId);
            saveNotes(currentEditingId, htmlContent);
        }
        
        if (closeEditor) {
            currentEditor = null;
            currentEditingId = null;
            originalNotesContent = null;
            clearTimeout(autoSaveTimeout);
        }
    }
}

function saveNotesFromEditor(id) {
    if (currentEditor && currentEditingId === id) {
        clearTimeout(autoSaveTimeout);
        const htmlContent = currentEditor.root.innerHTML;
        const plainText = currentEditor.getText().trim();
        
        // Always save when explicitly requested, even if empty (to clear notes)
        console.log('Manually saving HTML notes for todo', id, ':', htmlContent);
        saveNotes(id, plainText.length > 0 ? htmlContent : '');
        
        currentEditor = null;
        currentEditingId = null;
        originalNotesContent = null;
    }
}

function saveNotes(id, notes) {
    console.log('Saving notes for todo', id, ':', notes);
    editTodo(id, undefined, notes);
}

function cancelNotesEdit(id) {
    if (currentEditor && currentEditingId === id) {
        clearTimeout(autoSaveTimeout);
        currentEditor = null;
        currentEditingId = null;
        originalNotesContent = null;
    }
    renderTodos();
}

// Edit functions
function startEdit(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const todoElement = document.querySelector(`[data-todo-id="${id}"]`);
    const textElement = todoElement.querySelector('.todo-text');
    const actionsElement = todoElement.querySelector('.todo-actions');

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'edit-input';
    input.value = todo.text;

    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-btn';
    saveBtn.textContent = 'SAVE';
    saveBtn.onclick = () => saveEdit(id, input.value);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cancel-btn';
    cancelBtn.textContent = 'CANCEL';
    cancelBtn.onclick = () => cancelEdit(id);

    textElement.style.display = 'none';
    textElement.parentNode.insertBefore(input, textElement);
    
    actionsElement.innerHTML = '';
    actionsElement.appendChild(saveBtn);
    actionsElement.appendChild(cancelBtn);

    input.focus();
    input.select();

    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            saveEdit(id, input.value);
        } else if (e.key === 'Escape') {
            cancelEdit(id);
        }
    });
}

function saveEdit(id, newText) {
    if (newText.trim()) {
        editTodo(id, newText.trim(), undefined);
    } else {
        cancelEdit(id);
    }
}

function cancelEdit(id) {
    renderTodos();
}

// Drag and drop functions
async function reorderTodos(todoIds) {
    try {
        console.log('Reordering todos:', todoIds);
        const response = await fetch('/api/todos/reorder', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ todoIds }),
        });

        if (!response.ok) {
            console.error('Error reordering todos - response not ok:', await response.text());
            loadTodos(); // Reload on error
        } else {
            console.log('Reorder successful');
        }
    } catch (error) {
        console.error('Error reordering todos:', error);
        loadTodos(); // Reload on error
    }
}

function handleDragStart(e) {
    draggedElement = e.target.closest('.todo-item');
    draggedId = parseInt(draggedElement.dataset.todoId);
    draggedElement.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', draggedElement.outerHTML);
}

function handleDragEnd(e) {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        draggedElement = null;
        draggedId = null;
    }
    
    // Remove drag-over class from all items
    document.querySelectorAll('.todo-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    const targetItem = e.target.closest('.todo-item');
    if (targetItem && targetItem !== draggedElement) {
        targetItem.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const targetItem = e.target.closest('.todo-item');
    if (targetItem) {
        targetItem.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    const targetItem = e.target.closest('.todo-item');
    
    if (targetItem && draggedId && targetItem !== draggedElement) {
        const targetId = parseInt(targetItem.dataset.todoId);
        const todoList = document.getElementById('todoList');
        const allItems = Array.from(todoList.querySelectorAll('.todo-item'));
        
        // Find positions
        const draggedIndex = allItems.findIndex(item => parseInt(item.dataset.todoId) === draggedId);
        const targetIndex = allItems.findIndex(item => parseInt(item.dataset.todoId) === targetId);
        
        if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
            // Reorder in DOM first
            const draggedItem = allItems[draggedIndex];
            if (draggedIndex < targetIndex) {
                targetItem.parentNode.insertBefore(draggedItem, targetItem.nextSibling);
            } else {
                targetItem.parentNode.insertBefore(draggedItem, targetItem);
            }
            
            // Get the new order after DOM manipulation
            const newOrderedItems = Array.from(todoList.querySelectorAll('.todo-item'));
            const newOrder = newOrderedItems.map(item => parseInt(item.dataset.todoId));
            
            // Update server with new order
            reorderTodos(newOrder);
            
            // Update local todos array to match new order
            const reorderedTodos = [];
            newOrder.forEach(id => {
                const todo = todos.find(t => t.id === id);
                if (todo) {
                    reorderedTodos.push(todo);
                }
            });
            todos = reorderedTodos;
        }
    }
    
    // Clean up
    if (targetItem) {
        targetItem.classList.remove('drag-over');
    }
}

// Utility functions
function sanitizeAndRenderHTML(htmlString) {
    if (!htmlString || htmlString.trim() === '') return 'No notes';
    // Basic HTML rendering - in production, you'd want to use a proper sanitizer
    return htmlString;
}

function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function exportToPDF() {
    window.open('/api/todos/export/pdf', '_blank');
}

function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour12: false });
    const dateString = now.toLocaleDateString('en-US');
    document.getElementById('timeDisplay').textContent = `${dateString} ${timeString}`;
}

// Render function
function renderTodos() {
    const todoList = document.getElementById('todoList');
    
    if (todos.length === 0) {
        todoList.innerHTML = '<div class="empty-state">No todos yet. Add one above!</div>';
        return;
    }

    // Create todos with proper HTML rendering
    todoList.innerHTML = '';
    todos.forEach(todo => {
        const todoDiv = document.createElement('div');
        todoDiv.className = 'todo-item';
        todoDiv.setAttribute('data-todo-id', todo.id);
        todoDiv.setAttribute('draggable', 'true');
        todoDiv.addEventListener('dragstart', handleDragStart);
        todoDiv.addEventListener('dragend', handleDragEnd);
        todoDiv.addEventListener('dragover', handleDragOver);
        todoDiv.addEventListener('dragenter', handleDragEnter);
        todoDiv.addEventListener('dragleave', handleDragLeave);
        todoDiv.addEventListener('drop', handleDrop);
        
        todoDiv.innerHTML = `
            <div class="drag-handle">⋮⋮</div>
            <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" 
                 onclick="toggleTodo(${todo.id}, ${!todo.completed})">
                ${todo.completed ? '✓' : ''}
            </div>
            <div class="todo-content">
                <div class="todo-text ${todo.completed ? 'completed' : ''}">${todo.text}</div>
                <div class="todo-timestamps">
                    Created: ${formatTimestamp(todo.created_at)}
                    ${todo.updated_at && todo.updated_at !== todo.created_at ? `| Updated: ${formatTimestamp(todo.updated_at)}` : ''}
                    ${todo.completed_at ? `| Completed: ${formatTimestamp(todo.completed_at)}` : ''}
                </div>
                <div class="notes-section" style="display: ${todo.notes && todo.notes.trim() ? 'block' : 'none'}">
                    <div class="notes-text"></div>
                    <div class="notes-buttons">
                        <button class="notes-btn" onclick="editNotes(${todo.id})">EDIT NOTES</button>
                    </div>
                </div>
            </div>
            <div class="todo-actions">
                <button class="edit-btn" onclick="startEdit(${todo.id})">EDIT</button>
                <button class="notes-btn" onclick="toggleNotes(${todo.id})">NOTES</button>
                <button class="delete-btn" onclick="deleteTodo(${todo.id})">DEL</button>
            </div>
        `;
        
        // Set notes HTML content separately to allow HTML rendering
        const notesTextDiv = todoDiv.querySelector('.notes-text');
        notesTextDiv.innerHTML = sanitizeAndRenderHTML(todo.notes);
        
        todoList.appendChild(todoDiv);
    });
}

// Event listeners and initialization
document.addEventListener('DOMContentLoaded', function() {
    // Todo input enter key listener
    document.getElementById('todoInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTodo();
        }
    });

    // Auto-save when user clicks elsewhere or switches todos
    document.addEventListener('click', function(e) {
        if (currentEditor && currentEditingId) {
            const isClickInsideEditor = e.target.closest(`#editor-${currentEditingId}`) || 
                                      e.target.closest('.ql-toolbar') ||
                                      e.target.closest('.notes-btn');
            
            // Only auto-save and close if clicking completely outside the editor area
            if (!isClickInsideEditor) {
                // Small delay to allow for button clicks
                setTimeout(() => {
                    if (currentEditor && currentEditingId) {
                        autoSaveCurrentEditor(true);
                        renderTodos();
                    }
                }, 100);
            }
        }
    });

    // Auto-save when user tries to leave the page
    window.addEventListener('beforeunload', function(e) {
        if (currentEditor && currentEditingId) {
            autoSaveCurrentEditor(false);
        }
    });

    // Initialize time display
    setInterval(updateTime, 1000);
    updateTime();
    
    // Load initial data
    loadProject();
    loadTodos();
    
    // Auto-refresh todos every 30 seconds
    setInterval(loadTodos, 30000);
});