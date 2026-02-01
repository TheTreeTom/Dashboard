// ============================================
// Data Storage
// ============================================
const STORAGE_KEYS = {
    treetom: 'dashboard_treetom_jobs',
    aditech: 'dashboard_aditech_jobs',
    appointments: 'dashboard_appointments',
    tasks: 'dashboard_tasks'
};

// Service types for each business
const SERVICES = {
    treetom: [
        'Tree Health Assessment',
        'Native Plant Install',
        'Tree Trimming',
        'Tree Removal',
        'Consultation',
        'Maintenance',
        'Other'
    ],
    aditech: [
        'Computer Networking',
        'Camera Systems',
        'Security Systems',
        'Lighting Systems',
        'Home Automation',
        'Support Consulting',
        'Other'
    ]
};

// ============================================
// Initialize App
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initDate();
    initTabs();
    loadAllData();
    initModalListeners();
});

function initDate() {
    const dateEl = document.getElementById('currentDate');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString('en-US', options);
}

function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
}

function switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // Update sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.toggle('active', section.id === tabId);
    });
}

// ============================================
// Data Management
// ============================================
function getData(key) {
    const data = localStorage.getItem(STORAGE_KEYS[key]);
    return data ? JSON.parse(data) : [];
}

function saveData(key, data) {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function loadAllData() {
    renderToday();
    renderJobs('treetom');
    renderJobs('aditech');
    renderAppointments();
    renderTasks();
}

// ============================================
// Today View
// ============================================
function renderToday() {
    const tasks = getData('tasks');
    const emptyState = document.getElementById('today-empty');

    // Group tasks by priority
    const highTasks = tasks.filter(t => t.priority === 'high' && !t.completed);
    const mediumTasks = tasks.filter(t => t.priority === 'medium' && !t.completed);
    const lowTasks = tasks.filter(t => t.priority === 'low' && !t.completed);

    // Sort each group by due date
    const sortByDue = (a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
    };

    highTasks.sort(sortByDue);
    mediumTasks.sort(sortByDue);
    lowTasks.sort(sortByDue);

    // Render each priority section
    renderPrioritySection('high', highTasks);
    renderPrioritySection('medium', mediumTasks);
    renderPrioritySection('low', lowTasks);

    // Show/hide empty state
    const hasTasks = highTasks.length > 0 || mediumTasks.length > 0 || lowTasks.length > 0;
    if (emptyState) {
        emptyState.classList.toggle('visible', !hasTasks);
    }
}

function renderPrioritySection(priority, tasks) {
    const section = document.getElementById(`today-${priority}`);
    const container = document.getElementById(`today-${priority}-tasks`);

    if (!section || !container) return;

    container.innerHTML = '';

    if (tasks.length === 0) {
        section.classList.remove('has-tasks');
        return;
    }

    section.classList.add('has-tasks');

    tasks.forEach(task => {
        const item = document.createElement('div');
        item.className = `today-task-item ${task.completed ? 'completed' : ''}`;
        item.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskFromToday('${task.id}')">
            <div class="today-task-info">
                <div class="today-task-name">${escapeHtml(task.name)}</div>
                ${task.dueDate ? `<div class="today-task-due">📅 Due: ${formatDate(task.dueDate)}</div>` : ''}
            </div>
            <div class="today-task-actions">
                <button class="card-btn" onclick="editTask('${task.id}')" title="Edit">✏️</button>
                <button class="card-btn delete" onclick="confirmDelete('task', '${task.id}')" title="Delete">🗑️</button>
            </div>
        `;
        container.appendChild(item);
    });
}

function toggleTaskFromToday(id) {
    toggleTask(id);
    renderToday();
}

// ============================================
// Jobs (Tree Tom & Adi Tech)
// ============================================
function renderJobs(type) {
    const jobs = getData(type);
    const cardsContainer = document.getElementById(`${type}-cards`);
    const emptyState = document.getElementById(`${type}-empty`);

    cardsContainer.innerHTML = '';

    if (jobs.length === 0) {
        emptyState.classList.add('visible');
        return;
    }

    emptyState.classList.remove('visible');

    // Sort by date (newest first)
    jobs.sort((a, b) => new Date(b.date) - new Date(a.date));

    jobs.forEach(job => {
        const card = createJobCard(job, type);
        cardsContainer.appendChild(card);
    });
}

function createJobCard(job, type) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <div class="card-header">
            <div>
                <div class="card-title">${escapeHtml(job.client)}</div>
                <div class="card-service">${escapeHtml(job.service)}</div>
            </div>
            <div class="card-actions">
                <button class="card-btn" onclick="editJob('${type}', '${job.id}')" title="Edit">✏️</button>
                <button class="card-btn delete" onclick="confirmDelete('${type}', '${job.id}')" title="Delete">🗑️</button>
            </div>
        </div>
        <div class="card-body">
            <div class="card-date">
                📅 ${formatDate(job.date)}
            </div>
            ${job.notes ? `<div class="card-notes">${escapeHtml(job.notes)}</div>` : ''}
        </div>
        <div class="card-footer">
            <span class="status-badge ${job.status.toLowerCase().replace(' ', '-')}">
                <span class="status-dot"></span>
                ${job.status}
            </span>
            <button class="card-btn" onclick="cycleStatus('${type}', '${job.id}')" title="Change Status">🔄</button>
        </div>
    `;
    return card;
}

function cycleStatus(type, id) {
    const jobs = getData(type);
    const job = jobs.find(j => j.id === id);
    if (!job) return;

    const statuses = ['New', 'In Progress', 'Completed'];
    const currentIndex = statuses.indexOf(job.status);
    job.status = statuses[(currentIndex + 1) % statuses.length];

    saveData(type, jobs);
    renderJobs(type);
}

function editJob(type, id) {
    const jobs = getData(type);
    const job = jobs.find(j => j.id === id);
    if (!job) return;

    openModal(type, job);
}

function deleteJob(type, id) {
    let jobs = getData(type);
    jobs = jobs.filter(j => j.id !== id);
    saveData(type, jobs);
    renderJobs(type);
}

// ============================================
// Appointments
// ============================================
function renderAppointments() {
    const appointments = getData('appointments');
    const listContainer = document.getElementById('appointments-list');
    const emptyState = document.getElementById('appointments-empty');

    listContainer.innerHTML = '';

    if (appointments.length === 0) {
        emptyState.classList.add('visible');
        return;
    }

    emptyState.classList.remove('visible');

    // Sort by date (soonest first)
    appointments.sort((a, b) => new Date(a.date) - new Date(b.date));

    appointments.forEach(apt => {
        const item = createAppointmentItem(apt);
        listContainer.appendChild(item);
    });
}

function createAppointmentItem(apt) {
    const date = new Date(apt.date);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();

    const item = document.createElement('div');
    item.className = 'appointment-item';
    item.innerHTML = `
        <div class="appointment-date">
            <span class="appointment-month">${month}</span>
            <span class="appointment-day">${day}</span>
        </div>
        <div class="appointment-info">
            <div class="appointment-doctor">${escapeHtml(apt.doctor)}</div>
            <div class="appointment-location">📍 ${escapeHtml(apt.location)}</div>
            ${apt.purpose ? `<div class="appointment-purpose">${escapeHtml(apt.purpose)}</div>` : ''}
        </div>
        <div class="appointment-actions">
            <button class="card-btn" onclick="editAppointment('${apt.id}')" title="Edit">✏️</button>
            <button class="card-btn delete" onclick="confirmDelete('appointment', '${apt.id}')" title="Delete">🗑️</button>
        </div>
    `;
    return item;
}

function editAppointment(id) {
    const appointments = getData('appointments');
    const apt = appointments.find(a => a.id === id);
    if (!apt) return;

    openModal('appointment', apt);
}

function deleteAppointment(id) {
    let appointments = getData('appointments');
    appointments = appointments.filter(a => a.id !== id);
    saveData('appointments', appointments);
    renderAppointments();
}

// ============================================
// Tasks
// ============================================
function renderTasks() {
    const tasks = getData('tasks');
    const listContainer = document.getElementById('tasks-list');
    const emptyState = document.getElementById('tasks-empty');

    listContainer.innerHTML = '';

    if (tasks.length === 0) {
        emptyState.classList.add('visible');
        return;
    }

    emptyState.classList.remove('visible');

    // Sort: incomplete first, then by priority, then by due date
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    tasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(a.dueDate) - new Date(b.dueDate);
    });

    tasks.forEach(task => {
        const item = createTaskItem(task);
        listContainer.appendChild(item);
    });
}

function createTaskItem(task) {
    const item = document.createElement('div');
    item.className = `task-item ${task.completed ? 'completed' : ''}`;
    item.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}')">
        <div class="task-info">
            <div class="task-name">${escapeHtml(task.name)}</div>
            ${task.dueDate ? `<div class="task-due">Due: ${formatDate(task.dueDate)}</div>` : ''}
        </div>
        <span class="task-priority ${task.priority}">${task.priority}</span>
        <div class="task-actions">
            <button class="card-btn" onclick="editTask('${task.id}')" title="Edit">✏️</button>
            <button class="card-btn delete" onclick="confirmDelete('task', '${task.id}')" title="Delete">🗑️</button>
        </div>
    `;
    return item;
}

function toggleTask(id) {
    const tasks = getData('tasks');
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    saveData('tasks', tasks);
    renderTasks();
    renderToday();
}

function editTask(id) {
    const tasks = getData('tasks');
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    openModal('task', task);
}

function deleteTask(id) {
    let tasks = getData('tasks');
    tasks = tasks.filter(t => t.id !== id);
    saveData('tasks', tasks);
    renderTasks();
    renderToday();
}

// ============================================
// Modal System
// ============================================
let currentModalType = null;
let currentEditId = null;

function openModal(type, editData = null) {
    currentModalType = type;
    currentEditId = editData?.id || null;

    const modal = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    // Set title
    const titles = {
        treetom: editData ? 'Edit Tree Tom Job' : 'Add Tree Tom Job',
        aditech: editData ? 'Edit Adi Tech Job' : 'Add Adi Tech Job',
        appointment: editData ? 'Edit Appointment' : 'Add Appointment',
        task: editData ? 'Edit Task' : 'Add Task'
    };
    title.textContent = titles[type];

    // Generate form fields
    body.innerHTML = getFormFields(type, editData);

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    currentModalType = null;
    currentEditId = null;
}

function getFormFields(type, data = {}) {
    // Ensure data is never null
    data = data || {};

    if (type === 'treetom' || type === 'aditech') {
        const services = SERVICES[type];
        return `
            <div class="form-group">
                <label for="client">Client Name *</label>
                <input type="text" id="client" value="${escapeHtml(data.client || '')}" required>
            </div>
            <div class="form-group">
                <label for="service">Service Type *</label>
                <select id="service" required>
                    ${services.map(s => `<option value="${s}" ${data.service === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="date">Date *</label>
                <input type="date" id="date" value="${data.date || new Date().toISOString().split('T')[0]}" required>
            </div>
            <div class="form-group">
                <label for="status">Status</label>
                <select id="status">
                    <option value="New" ${data.status === 'New' ? 'selected' : ''}>New</option>
                    <option value="In Progress" ${data.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option value="Completed" ${data.status === 'Completed' ? 'selected' : ''}>Completed</option>
                </select>
            </div>
            <div class="form-group">
                <label for="notes">Notes</label>
                <textarea id="notes" placeholder="Additional details...">${escapeHtml(data.notes || '')}</textarea>
            </div>
        `;
    }

    if (type === 'appointment') {
        return `
            <div class="form-group">
                <label for="doctor">Doctor / Provider *</label>
                <input type="text" id="doctor" value="${escapeHtml(data.doctor || '')}" required>
            </div>
            <div class="form-group">
                <label for="location">Location *</label>
                <input type="text" id="location" value="${escapeHtml(data.location || '')}" required>
            </div>
            <div class="form-group">
                <label for="date">Date *</label>
                <input type="date" id="date" value="${data.date || ''}" required>
            </div>
            <div class="form-group">
                <label for="purpose">Purpose</label>
                <input type="text" id="purpose" value="${escapeHtml(data.purpose || '')}" placeholder="Annual checkup, follow-up, etc.">
            </div>
            <div class="form-group">
                <label for="notes">Notes</label>
                <textarea id="notes" placeholder="Additional notes...">${escapeHtml(data.notes || '')}</textarea>
            </div>
        `;
    }

    if (type === 'task') {
        return `
            <div class="form-group">
                <label for="name">Task Name *</label>
                <input type="text" id="name" value="${escapeHtml(data.name || '')}" required>
            </div>
            <div class="form-group">
                <label for="priority">Priority</label>
                <select id="priority">
                    <option value="low" ${data.priority === 'low' ? 'selected' : ''}>Low</option>
                    <option value="medium" ${data.priority === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="high" ${data.priority === 'high' ? 'selected' : ''}>High</option>
                </select>
            </div>
            <div class="form-group">
                <label for="dueDate">Due Date</label>
                <input type="date" id="dueDate" value="${data.dueDate || ''}">
            </div>
        `;
    }

    return '';
}

function handleSubmit(event) {
    event.preventDefault();

    if (currentModalType === 'treetom' || currentModalType === 'aditech') {
        saveJob();
    } else if (currentModalType === 'appointment') {
        saveAppointment();
    } else if (currentModalType === 'task') {
        saveTask();
    }

    closeModal();
}

function saveJob() {
    const job = {
        id: currentEditId || generateId(),
        client: document.getElementById('client').value.trim(),
        service: document.getElementById('service').value,
        date: document.getElementById('date').value,
        status: document.getElementById('status').value,
        notes: document.getElementById('notes').value.trim()
    };

    const jobs = getData(currentModalType);

    if (currentEditId) {
        const index = jobs.findIndex(j => j.id === currentEditId);
        if (index !== -1) jobs[index] = job;
    } else {
        jobs.push(job);
    }

    saveData(currentModalType, jobs);
    renderJobs(currentModalType);
}

function saveAppointment() {
    const apt = {
        id: currentEditId || generateId(),
        doctor: document.getElementById('doctor').value.trim(),
        location: document.getElementById('location').value.trim(),
        date: document.getElementById('date').value,
        purpose: document.getElementById('purpose').value.trim(),
        notes: document.getElementById('notes').value.trim()
    };

    const appointments = getData('appointments');

    if (currentEditId) {
        const index = appointments.findIndex(a => a.id === currentEditId);
        if (index !== -1) appointments[index] = apt;
    } else {
        appointments.push(apt);
    }

    saveData('appointments', appointments);
    renderAppointments();
}

function saveTask() {
    const task = {
        id: currentEditId || generateId(),
        name: document.getElementById('name').value.trim(),
        priority: document.getElementById('priority').value,
        dueDate: document.getElementById('dueDate').value,
        completed: currentEditId ? getData('tasks').find(t => t.id === currentEditId)?.completed || false : false
    };

    const tasks = getData('tasks');

    if (currentEditId) {
        const index = tasks.findIndex(t => t.id === currentEditId);
        if (index !== -1) tasks[index] = task;
    } else {
        tasks.push(task);
    }

    saveData('tasks', tasks);
    renderTasks();
    renderToday();
}

// ============================================
// Delete Confirmation
// ============================================
let deleteCallback = null;

function confirmDelete(type, id) {
    const modal = document.getElementById('delete-modal-overlay');
    modal.classList.add('active');

    const confirmBtn = document.getElementById('confirm-delete-btn');
    confirmBtn.onclick = () => {
        if (type === 'treetom' || type === 'aditech') {
            deleteJob(type, id);
        } else if (type === 'appointment') {
            deleteAppointment(id);
        } else if (type === 'task') {
            deleteTask(id);
        }
        closeDeleteModal();
    };
}

function closeDeleteModal() {
    document.getElementById('delete-modal-overlay').classList.remove('active');
}

// ============================================
// Utilities
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// Initialize modal event listeners
function initModalListeners() {
    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeDeleteModal();
        }
    });

    // Close modals on overlay click
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') closeModal();
        });
    }

    const deleteModalOverlay = document.getElementById('delete-modal-overlay');
    if (deleteModalOverlay) {
        deleteModalOverlay.addEventListener('click', (e) => {
            if (e.target.id === 'delete-modal-overlay') closeDeleteModal();
        });
    }
}
