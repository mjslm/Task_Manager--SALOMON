// Holds all tasks in memory
let tasks = [];

// Get page elements so we can use them
const taskForm       = document.getElementById('task-form');
const taskInput      = document.getElementById('task-input');
const categorySelect = document.getElementById('category-select');
const prioritySelect = document.getElementById('priority-select');
const taskList       = document.getElementById('task-list');
const searchInput    = document.getElementById('search-input');
const filterCategory = document.getElementById('filter-category');
const taskCounter    = document.getElementById('task-counter');
const notification   = document.getElementById('notification');
const loading        = document.getElementById('loading');
const loadingText    = document.getElementById('loading-text');
const darkModeBtn    = document.getElementById('dark-mode-btn');
const exportBtn      = document.getElementById('export-btn');


// Runs when user submits the form
taskForm.addEventListener('submit', function(event) {
  event.preventDefault(); // Stop page from reloading

  const text = taskInput.value.trim();
  if (!text) return; // Do nothing if input is empty

  // Create a new task object
  const newTask = {
    id: Date.now(),       // Unique ID using current time
    text: text,
    completed: false,
    category: categorySelect.value || 'General',
    priority: prioritySelect.value,
    timer: 0,
    intervalId: null      // Will hold the timer interval later
  };

  tasks.push(newTask);   // Add task to the list
  taskInput.value = '';  // Clear the input box
  saveTasks();
  renderTasks();
  showNotification('Task added! ✅');
});


// Shows only tasks that match the search and filter
function renderTasks() {
  const searchText       = searchInput.value.toLowerCase();
  const selectedCategory = filterCategory.value;

  // Keep only tasks that match search and category
  const filtered = tasks.filter(task => {
    const matchesSearch   = task.text.toLowerCase().includes(searchText);
    const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  taskList.innerHTML = ''; // Clear current list
  filtered.forEach(task => {
    taskList.appendChild(createTaskElement(task)); // Add each task to the page
  });

  updateCounter(); // Update the task count display
}


// Builds the HTML for one task item
function createTaskElement(task) {
  const li = document.createElement('li');
  li.classList.add('task-item', `priority-${task.priority}`);
  if (task.completed) li.classList.add('completed'); // Gray out if done
  li.dataset.id = task.id;

  // Task HTML: checkbox, text, edit button, delete button, timer controls
  li.innerHTML = `
    <div class="task-top">
      <input type="checkbox" ${task.completed ? 'checked' : ''} title="Mark complete" />
      <span class="task-text">${task.text}</span>
      <button class="btn-edit" title="Edit task">✏️ Edit</button>
      <button class="btn-delete">🗑 Delete</button>
    </div>
    <div class="task-bottom">
      <span class="category-tag">${task.category}</span>
      <div class="timer-area">
        <input class="timer-input" type="number" min="1" placeholder="sec" title="Set seconds" />
        <button class="btn-timer btn-start">▶ Start</button>
        <button class="btn-timer btn-pause">⏸ Pause</button>
        <button class="btn-timer btn-reset">↺ Reset</button>
        <span class="timer-display">${formatTime(task.timer)}</span>
      </div>
    </div>
  `;

  // Attach events to checkbox, edit button, and delete button
  li.querySelector('input[type="checkbox"]').addEventListener('change', () => toggleComplete(task.id));
  li.querySelector('.btn-edit').addEventListener('click', () => startEditing(li, task)); // Click pen to edit
  li.querySelector('.btn-delete').addEventListener('click', () => deleteTask(task.id));

  const timerInput   = li.querySelector('.timer-input');
  const timerDisplay = li.querySelector('.timer-display');

  // Start button: counts down every second
  li.querySelector('.btn-start').addEventListener('click', function() {
    const seconds = parseInt(timerInput.value);
    if (!isNaN(seconds) && seconds > 0) task.timer = seconds; // Set timer if input given
    if (task.timer <= 0) return; // Don't start if no time set
    clearInterval(task.intervalId); // Clear any running timer first
    task.intervalId = setInterval(function() {
      task.timer--;
      timerDisplay.textContent = formatTime(task.timer);
      if (task.timer <= 10) timerDisplay.classList.add('urgent'); // Turn red near end
      if (task.timer <= 0) {
        clearInterval(task.intervalId);
        timerDisplay.textContent = '⏰ Done!';
        showNotification(`⏰ Timer done for: "${task.text}"`);
      }
    }, 1000); // Runs every 1 second
  });

  // Pause button: stops the countdown
  li.querySelector('.btn-pause').addEventListener('click', function() {
    clearInterval(task.intervalId);
    task.intervalId = null;
  });

  // Reset button: clears the timer back to zero
  li.querySelector('.btn-reset').addEventListener('click', function() {
    clearInterval(task.intervalId);
    task.intervalId = null;
    task.timer = 0;
    timerDisplay.textContent = formatTime(0);
    timerDisplay.classList.remove('urgent');
  });

  return li;
}


// Marks a task as done or not done
function toggleComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed; // Flip true/false
    saveTasks();
    renderTasks();
    showNotification(task.completed ? 'Task completed! 🎉' : 'Task reopened.');
  }
}

// Removes a task from the list
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id); // Keep all except the deleted one
  saveTasks();
  renderTasks();
  showNotification('Task deleted. 🗑');
}

// Turns the task text into an editable input when pen button is clicked
function startEditing(li, task) {
  const taskText  = li.querySelector('.task-text');
  const editBtn   = li.querySelector('.btn-edit');

  // Don't open a second input if already editing
  if (li.querySelector('.task-edit-input')) return;

  const editInput = document.createElement('input');
  editInput.type  = 'text';
  editInput.classList.add('task-edit-input');
  editInput.value = task.text;
  taskText.replaceWith(editInput); // Swap text with input box
  editBtn.textContent = '💾 Save';  // Change button label to Save
  editInput.focus();

  // Save when Enter is pressed
  editInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveEdit(editInput, task, editBtn);
  });

  // Save when clicking the Save button
  editBtn.addEventListener('click', () => saveEdit(editInput, task, editBtn), { once: true });
}

// Saves the edited task text and restores the pen button
function saveEdit(editInput, task, editBtn) {
  const newText = editInput.value.trim();
  if (newText) task.text = newText; // Only save if not empty
  saveTasks();
  renderTasks();
}

// Updates the total/done/pending count display
function updateCounter() {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending   = total - completed;
  taskCounter.textContent = `Total: ${total} | Done: ${completed} | Pending: ${pending}`;
}

// Shows a short pop-up message then hides it after 2 seconds
function showNotification(message) {
  notification.textContent = message;
  notification.classList.remove('hidden');
  setTimeout(() => notification.classList.add('hidden'), 2000);
}

// Wait 300ms after typing before searching (avoids too many calls)
let debounceTimer;
searchInput.addEventListener('input', function() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(renderTasks, 300);
});

// Re-render when category filter changes
filterCategory.addEventListener('change', renderTasks);


// Shows or hides the loading bar
function showLoading(state) {
  // state: 'loading' | 'error' | 'hidden'
  loading.classList.remove('hidden', 'error');
  if (state === 'hidden') {
    loading.classList.add('hidden');
  } else if (state === 'error') {
    loading.classList.add('error');
    loadingText.textContent = '⚠️ Could not load categories. Using defaults.';
    setTimeout(() => loading.classList.add('hidden'), 3000);
  } else {
    loadingText.textContent = 'Loading categories...';
  }
}


// Fetches categories from the internet, uses defaults if it fails
async function loadCategories() {
  showLoading('loading');
  categorySelect.disabled = true; // Disable while loading

  try {
    // Get data from a test API
    const response = await fetch('https://jsonplaceholder.typicode.com/users');
    const users    = await response.json();

    const schoolCategories = ['Assignment', 'Project', 'Exam', 'Laboratory', 'Research'];
    const categories = users.slice(0, 5).map((_, i) => schoolCategories[i]); // Take first 5

    // Fill the category dropdown
    categorySelect.innerHTML = '';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat; opt.textContent = cat;
      categorySelect.appendChild(opt);
    });

    // Fill the filter dropdown too
    filterCategory.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat; opt.textContent = cat;
      filterCategory.appendChild(opt);
    });

    showLoading('hidden');

  } catch (error) {
    // If fetch fails, use hardcoded defaults
    console.error('Failed to load categories:', error);
    showLoading('error');

    const defaults = ['Work', 'Personal', 'School', 'Health', 'Other'];
    categorySelect.innerHTML = '';
    defaults.forEach(cat => { categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`; });
    filterCategory.innerHTML = '<option value="all">All Categories</option>';
    defaults.forEach(cat => { filterCategory.innerHTML += `<option value="${cat}">${cat}</option>`; });
  }

  categorySelect.disabled = false; // Re-enable after loading
}


// Converts seconds into mm:ss format (e.g. 90 → 1:30)
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Toggles dark/light mode on button click
darkModeBtn.addEventListener('click', function() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  darkModeBtn.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
});

// Saves tasks to localStorage so they survive page refresh
function saveTasks() {
  return new Promise(resolve => {
    const saveable = tasks.map(t => ({ ...t, intervalId: null, timer: 0 })); // Don't save timer state
    localStorage.setItem('tasks', JSON.stringify(saveable));
    resolve();
  });
}

// Loads tasks from localStorage when the page opens
function loadTasks() {
  return new Promise(resolve => {
    const stored = localStorage.getItem('tasks');
    if (stored) tasks = JSON.parse(stored); // Restore saved tasks
    resolve();
  });
}

// Downloads all tasks as a JSON file
exportBtn.addEventListener('click', function() {
  if (tasks.length === 0) { showNotification('No tasks to export!'); return; }
  const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'tasks.json'; a.click(); // Trigger download
  URL.revokeObjectURL(url);
  showNotification('Tasks exported! 📁');
});

// Runs everything on page load in the correct order
(async function init() {
  await loadTasks();      // Load saved tasks first
  await loadCategories(); // Then load categories
  renderTasks();          // Then show tasks on screen
})();