// All tasks are stored here as an array of objects
let tasks = [];

// Grab all the HTML elements we need
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
const darkModeBtn    = document.getElementById('dark-mode-btn');
const exportBtn      = document.getElementById('export-btn');


// Runs when the user submits the form
taskForm.addEventListener('submit', function(event) {
  event.preventDefault(); // stops the page from reloading on submit

  const text = taskInput.value.trim();
  if (!text) return; // do nothing if the input is empty

  // Create a new task object
  const newTask = {
    id: Date.now(),                          // unique number based on time
    text: text,
    completed: false,
    category: categorySelect.value || 'General',
    priority: prioritySelect.value,
    timer: 0,                                // countdown seconds (0 = not set)
    intervalId: null                         // will hold the setInterval ID
  };

  tasks.push(newTask);   // add the new task to the array
  taskInput.value = '';  // clear the input field

  saveTasks();           // save to localStorage
  renderTasks();         // refresh the task list on screen
  showNotification('Task added! ✅');
});


// Clears the list and redraws it from the tasks array
function renderTasks() {
  const searchText       = searchInput.value.toLowerCase();
  const selectedCategory = filterCategory.value;

  // Keep only tasks that match the search text and selected category
  const filtered = tasks.filter(task => {
    const matchesSearch   = task.text.toLowerCase().includes(searchText);
    const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  taskList.innerHTML = ''; // clear the current list

  // Build and add each task element to the page
  filtered.forEach(task => {
    const li = createTaskElement(task);
    taskList.appendChild(li);
  });

  updateCounter(); // update the total/done/pending numbers
}


// Builds and returns one <li> element for a task
function createTaskElement(task) {
  const li = document.createElement('li');
  li.classList.add('task-item', `priority-${task.priority}`); // adds priority color
  if (task.completed) li.classList.add('completed');          // adds strikethrough style
  li.dataset.id = task.id;                                    // saves the id on the element

  // Set the inner HTML of the task item
  li.innerHTML = `
    <div class="task-top">
      <input type="checkbox" ${task.completed ? 'checked' : ''} title="Mark complete" />
      <span class="task-text" title="Double-click to edit">${task.text}</span>
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

  // Checkbox — marks the task as complete or not
  const checkbox = li.querySelector('input[type="checkbox"]');
  checkbox.addEventListener('change', function() {
    toggleComplete(task.id);
  });

  // Double-click on task text — switches to edit mode
  const taskText = li.querySelector('.task-text');
  taskText.addEventListener('dblclick', function() {
    startEditing(li, task);
  });

  // Delete button — removes the task
  const deleteBtn = li.querySelector('.btn-delete');
  deleteBtn.addEventListener('click', function() {
    deleteTask(task.id);
  });

  // Timer elements
  const timerInput   = li.querySelector('.timer-input');
  const startBtn     = li.querySelector('.btn-start');
  const pauseBtn     = li.querySelector('.btn-pause');
  const resetBtn     = li.querySelector('.btn-reset');
  const timerDisplay = li.querySelector('.timer-display');

  // Start — reads the input, then counts down every second using setInterval
  startBtn.addEventListener('click', function() {
    const seconds = parseInt(timerInput.value);
    if (!isNaN(seconds) && seconds > 0) {
      task.timer = seconds; // save the seconds to the task
    }
    if (task.timer <= 0) return; // nothing to count if no time is set

    clearInterval(task.intervalId); // stop any running timer first

    task.intervalId = setInterval(function() {
      task.timer--;                                           // subtract 1 second
      timerDisplay.textContent = formatTime(task.timer);     // update the display

      if (task.timer <= 10) timerDisplay.classList.add('urgent'); // turn red near zero

      if (task.timer <= 0) {
        clearInterval(task.intervalId);                      // stop the interval
        timerDisplay.textContent = '⏰ Done!';
        showNotification(`⏰ Timer done for: "${task.text}"`);
      }
    }, 1000); // 1000ms = 1 second
  });

  // Pause — stops the interval but keeps the remaining time
  pauseBtn.addEventListener('click', function() {
    clearInterval(task.intervalId);
    task.intervalId = null;
  });

  // Reset — stops the interval and sets time back to zero
  resetBtn.addEventListener('click', function() {
    clearInterval(task.intervalId);
    task.intervalId = null;
    task.timer = 0;
    timerDisplay.textContent = formatTime(0);
    timerDisplay.classList.remove('urgent');
  });

  return li;
}


// Flips the completed status of a task
function toggleComplete(id) {
  const task = tasks.find(t => t.id === id); // find the task by id
  if (task) {
    task.completed = !task.completed; // true becomes false, false becomes true
    saveTasks();
    renderTasks();
    showNotification(task.completed ? 'Task completed! 🎉' : 'Task reopened.');
  }
}


// Removes a task from the array by id
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id); // keep everything except the deleted one
  saveTasks();
  renderTasks();
  showNotification('Task deleted. 🗑');
}


// Replaces the task text with an input field so the user can edit it
function startEditing(li, task) {
  const taskText = li.querySelector('.task-text');

  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.classList.add('task-edit-input');
  editInput.value = task.text; // pre-fill with current text

  taskText.replaceWith(editInput); // swap the span with the input
  editInput.focus();               // auto-focus so user can type right away

  // Save when the user presses Enter
  editInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') saveEdit(editInput, task);
  });

  // Save when the user clicks somewhere else
  editInput.addEventListener('blur', function() {
    saveEdit(editInput, task);
  });
}

// Saves the edited text and redraws the task
function saveEdit(editInput, task) {
  const newText = editInput.value.trim();
  if (newText) task.text = newText; // only update if not empty
  saveTasks();
  renderTasks();
}


// Updates the task count display in the header
function updateCounter() {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending   = total - completed;
  taskCounter.textContent = `Total: ${total} | Done: ${completed} | Pending: ${pending}`;
}


// Shows a notification message that disappears after 2 seconds
function showNotification(message) {
  notification.textContent = message;
  notification.classList.remove('hidden'); // make it visible

  setTimeout(function() {
    notification.classList.add('hidden'); // hide it after 2 seconds
  }, 2000);
}


// Debounce: waits 300ms after the user stops typing before searching
let debounceTimer;

searchInput.addEventListener('input', function() {
  clearTimeout(debounceTimer);              // cancel the previous wait

  debounceTimer = setTimeout(function() {
    renderTasks();                          // search runs only after 300ms pause
  }, 300);
});


// Re-renders the list whenever the category filter changes
filterCategory.addEventListener('change', function() {
  renderTasks();
});


// Fetches category names from the API and fills the dropdowns
async function loadCategories() {
  showLoading(true);

  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/users'); // call the API
    const users    = await response.json();                                      // convert to JS object

    // Use school-related names instead of the API usernames
    const schoolCategories = ['Assignment', 'Project', 'Exam', 'Laboratory', 'Research'];
    const categories = users.slice(0, 5).map((_, i) => schoolCategories[i]);

    // Fill the "Add Task" category dropdown
    categorySelect.innerHTML = '';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });

    // Fill the filter dropdown
    filterCategory.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      filterCategory.appendChild(option);
    });

  } catch (error) {
    // If the fetch fails, use hardcoded fallback categories
    console.error('Failed to load categories:', error);
    showNotification('⚠️ Could not load categories. Using defaults.');

    const defaults = ['Work', 'Personal', 'School', 'Health', 'Other'];
    categorySelect.innerHTML = '';
    defaults.forEach(cat => {
      categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });

    filterCategory.innerHTML = '<option value="all">All Categories</option>';
    defaults.forEach(cat => {
      filterCategory.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
  }

  showLoading(false); // hide the loader when done
}


// Shows or hides the loading indicator
function showLoading(isLoading) {
  if (isLoading) {
    loading.classList.remove('hidden');
  } else {
    loading.classList.add('hidden');
  }
}


// Converts a number of seconds into "m:ss" format (e.g. 65 → "1:05")
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`; // padStart adds a leading zero if needed
}


// Dark mode — toggles the "dark" class on <body>
darkModeBtn.addEventListener('click', function() {
  document.body.classList.toggle('dark');

  const isDark = document.body.classList.contains('dark');
  darkModeBtn.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode'; // update button label
});


// Saves the tasks array to localStorage as a JSON string
function saveTasks() {
  return new Promise(function(resolve) {
    // We can't save intervalId (it's a live reference), so we set it to null before saving
    const saveable = tasks.map(function(t) {
      return { ...t, intervalId: null, timer: 0 };
    });
    localStorage.setItem('tasks', JSON.stringify(saveable)); // store as string
    resolve();
  });
}

// Loads saved tasks from localStorage back into the tasks array
function loadTasks() {
  return new Promise(function(resolve) {
    const stored = localStorage.getItem('tasks');
    if (stored) {
      tasks = JSON.parse(stored); // convert JSON string back to array
    }
    resolve();
  });
}


// Export button — downloads all tasks as a tasks.json file
exportBtn.addEventListener('click', function() {
  if (tasks.length === 0) {
    showNotification('No tasks to export!');
    return;
  }

  const jsonString = JSON.stringify(tasks, null, 2); // format the array as readable JSON

  // Create a temporary download link and click it to trigger the download
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'tasks.json';
  a.click();

  URL.revokeObjectURL(url); // clean up the temporary URL
  showNotification('Tasks exported! 📁');
});


// Runs on page load — loads saved tasks, fetches categories, then draws the list
(async function init() {
  await loadTasks();      // get tasks from localStorage
  await loadCategories(); // get categories from the API
  renderTasks();          // draw everything on screen
})();