const SHEETDB_API = 'https://sheetdb.io/api/v1/YOUR_SHEETDB_API_ID';
let currentCustomerIndex = null;
let salesChart = null;
let autoRefreshInterval = null;

// Theme toggle
function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('themeToggle').checked = isDark;
}

// Notification toggle
function toggleNotifications() {
    const enabled = document.getElementById('notificationToggle').checked;
    localStorage.setItem('notifications', enabled);
    showToast(enabled ? 'Notifications enabled' : 'Notifications disabled');
}

// Auto-refresh toggle
function toggleAutoRefresh() {
    const enabled = document.getElementById('autoRefreshToggle').checked;
    localStorage.setItem('autoRefresh', enabled);
    if (enabled) {
        autoRefreshInterval = setInterval(async () => {
            await Promise.all([loadCustomers(), loadTasks(), loadMessages(), updateScoreCards()]);
        }, 300000); // 5 minutes
    } else {
        clearInterval(autoRefreshInterval);
    }
    showToast(enabled ? 'Auto-refresh enabled' : 'Auto-refresh disabled');
}

// Toast notification
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast' + (isError ? ' error-toast' : '');
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Modal handling
function openModal(index, customer) {
    currentCustomerIndex = index;
    document.getElementById('modalName').value = customer.name;
    document.getElementById('modalEmail').value = customer.email;
    document.getElementById('customerModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('customerModal').style.display = 'none';
    currentCustomerIndex = null;
    document.getElementById('modalNameError').style.display = 'none';
    document.getElementById('modalEmailError').style.display = 'none';
}

// Tab navigation
const tabs = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.section');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// Customer management
async function loadCustomers() {
    try {
        document.body.classList.add('loading');
        const response = await axios.get(`${SHEETDB_API}?sheet=Customers`);
        const customers = response.data || [];
        const itemsPerPage = parseInt(localStorage.getItem('itemsPerPage')) || 10;
        const list = document.getElementById('customerList');
        list.innerHTML = '';
        customers.slice(0, itemsPerPage).forEach((customer, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${customer.name}</span>
                <span>${customer.email}</span>
                <span>${new Date(customer.date).toLocaleDateString()}</span>
                <button class="delete-btn" onclick="deleteCustomer(${index})">✖</button>
            `;
            li.onclick = (e) => {
                if (!e.target.classList.contains('delete-btn')) openModal(index, customer);
            };
            list.appendChild(li);
        });
        updateScoreCards();
    } catch (error) {
        showToast('Failed to load customers', true);
        console.error('Load customers error:', error);
    } finally {
        document.body.classList.remove('loading');
    }
}

async function addCustomer() {
    const nameInput = document.getElementById('customerName');
    const emailInput = document.getElementById('customerEmail');
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name || !email || !emailRegex.test(email)) {
        showToast('Please enter a valid name and email', true);
        return;
    }

    try {
        document.body.classList.add('loading');
        await axios.post(`${SHEETDB_API}?sheet=Customers`, {
            data: [{
                name,
                email,
                date: new Date().toISOString()
            }]
        });
        nameInput.value = '';
        emailInput.value = '';
        await loadCustomers();
        showToast('Customer added successfully');
    } catch (error) {
        showToast('Failed to add customer', true);
        console.error('Add customer error:', error);
    } finally {
        document.body.classList.remove('loading');
    }
}

async function saveCustomer() {
    const name = document.getElementById('modalName').value.trim();
    const email = document.getElementById('modalEmail').value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    document.getElementById('modalNameError').style.display = name ? 'none' : 'block';
    document.getElementById('modalEmailError').style.display = email && emailRegex.test(email) ? 'none' : 'block';

    if (!name || !email || !emailRegex.test(email)) return;

    try {
        document.body.classList.add('loading');
        const customers = (await axios.get(`${SHEETDB_API}?sheet=Customers`)).data;
        const customer = customers[currentCustomerIndex];
        await axios.patch(`${SHEETDB_API}/email/${encodeURIComponent(customer.email)}?sheet=Customers`, {
            data: {
                name,
                email,
                date: new Date().toISOString()
            }
        });
        closeModal();
        await loadCustomers();
        showToast('Customer updated successfully');
    } catch (error) {
        showToast('Failed to update customer', true);
        console.error('Save customer error:', error);
    } finally {
        document.body.classList.remove('loading');
    }
}

async function deleteCustomer(index) {
    try {
        document.body.classList.add('loading');
        const customers = (await axios.get(`${SHEETDB_API}?sheet=Customers`)).data;
        const customer = customers[index];
        await axios.delete(`${SHEETDB_API}/email/${encodeURIComponent(customer.email)}?sheet=Customers`);
        await loadCustomers();
        showToast('Customer deleted');
    } catch (error) {
        showToast('Failed to delete customer', true);
        console.error('Delete customer error:', error);
    } finally {
        document.body.classList.remove('loading');
    }
}

async function searchCustomers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    try {
        document.body.classList.add('loading');
        const response = await axios.get(`${SHEETDB_API}?sheet=Customers`);
        const customers = response.data || [];
        const itemsPerPage = parseInt(localStorage.getItem('itemsPerPage')) || 10;
        const list = document.getElementById('customerList');
        list.innerHTML = '';

        customers
            .filter(customer => 
                customer.name.toLowerCase().includes(searchTerm) || 
                customer.email.toLowerCase().includes(searchTerm)
            )
            .slice(0, itemsPerPage)
            .forEach((customer, index) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${customer.name}</span>
                    <span>${customer.email}</span>
                    <span>${new Date(customer.date).toLocaleDateString()}</span>
                    <button class="delete-btn" onclick="deleteCustomer(${index})">✖</button>
                `;
                li.onclick = (e) => {
                    if (!e.target.classList.contains('delete-btn')) openModal(index, customer);
                };
                list.appendChild(li);
            });
    } catch (error) {
        showToast('Failed to search customers', true);
        console.error('Search customers error:', error);
    } finally {
        document.body.classList.remove('loading');
    }
}

async function exportCustomers() {
    try {
        document.body.classList.add('loading');
        const response = await axios.get(`${SHEETDB_API}?sheet=Customers`);
        const customers = response.data || [];
        const csv = [
            ['Name', 'Email', 'Date'].join(','),
            ...customers.map(c => [c.name, c.email, new Date(c.date).toLocaleDateString()].join(','))
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'customers.csv';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Customers exported as CSV');
    } catch (error) {
        showToast('Failed to export customers', true);
        console.error('Export customers error:', error);
    } finally {
        document.body.classList.remove('loading');
    }
}

// Task management
async function loadTasks() {
    try {
        document.body.classList.add('loading');
        const response = await axios.get(`${SHEETDB_API}?sheet=Tasks`);
        const tasks = response.data || [];
        const itemsPerPage = parseInt(localStorage.getItem('itemsPerPage')) || 10;
        const list = document.getElementById('taskList');
        list.innerHTML = '';
        tasks.slice(0, itemsPerPage).forEach((task, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div>
                    <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${index})">
                    <span style="${task.completed ? 'text-decoration: line-through' : ''}">${task.text}</span>
                </div>
                <button class="delete-btn" onclick="deleteTask(${index})">✖</button>
            `;
            list.appendChild(li);
        });
        updateScoreCards();
    } catch (error) {
        showToast('Failed to load tasks', true);
        console.error('Load tasks error:', error);
    } finally {
        document.body.classList.remove('loading');
    }
}

async function addTask() {
    const input = document.getElementById('taskInput');
    const text = input.value.trim();
    if (!text) {
        showToast('Please enter a task', true);
        return;
    }
    try {
        document.body.classList.add('loading');
        await axios.post(`${SHEETDB_API}?sheet=Tasks`, {
            data: [{
                text,
                completed: false,
                date: new Date().toISOString()
            }]
        });
        input.value = '';
        await loadTasks();
        showToast('Task added');
    } catch (error) {
        showToast('Failed to add task', true);
        console.error('Add task error:', error);
    } finally {
        document.body.classList.remove('loading');
    }
}

async function toggleTask(index) {
    try {
        document.body.classList.add('loading');
        const tasks = (await axios.get(`${SHEETDB_API}?sheet=Tasks`)).data;
        const task = tasks[index];
        await axios.patch(`${SHEETDB_API}/text/${encodeURIComponent(task.text)}?sheet=Tasks`, {
            data: {
                completed: !task.completed
            }
        });
        await loadTasks();
    } catch (error) {
        showToast('Failed to update task', true);
        console.error('Toggle task error:', error);
    } finally {
        document.body.classList.remove('loading');
    }
}

async function deleteTask(index) {
    try {
        document.body.classList.add('loading');
        const tasks = (await axios.get(`${SHEETDB_API}?sheet=Tasks`)).data;
        const task = tasks[index];
        await axios.delete(`${SHEETDB_API}/text/${encodeURIComponent(task.text)}?sheet=Tasks`);
        await loadTasks();
        showToast('Task deleted');
    } catch (error) {
        showToast('Failed to delete task', true);
        console.error('Delete task error:', error);
    } finally {
        document.body.classList.remove('loading');
    }
}

// Messages
async function loadMessages() {
    const category = document.getElementById('messageCategory').value;
    try {
        document.body.classList.add('loading');
        const response = await axios.get(`${SHEETDB_API}?sheet=Messages`);
        const messages = response.data || [];
        const itemsPerPage = parseInt(localStorage.getItem('itemsPerPage')) || 10;
        const filteredMessages = messages.filter(m => m.category === category).slice(0, itemsPerPage);
        const list = document.getElementById('messageList');
        list.innerHTML = '';
        filteredMessages.forEach((message, index) => {
            const div = document.createElement('div');
            div.className = 'message-item';
            div.innerHTML = `
                <strong>User:</strong> ${message.text}<br>
                <small>${new Date(message.date).toLocaleString()}</small>
                <div class="message-actions">
                    <div class="button secondary-button" onclick="replyMessage(${index})">Reply</div>
                    <button class="delete-btn" onclick="deleteMessage(${index})">✖</button>
                </div>
            `;
            list.appendChild(div);
        });
        updateScoreCards();
    } catch (error) {
        showToast('Failed to load messages', true);
        console.error('Load messages error:', error);
    } finally {
        document.body.classList.remove('loading');
    }
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) {
        showToast('Please enter a message', true);
        return;
    }
    try {
        document.body.classList.add('loading');
        await axios.post(`${SHEETDB_API}?sheet=Messages`, {
            data: [{
                text,
                category: 'sent',
                date: new Date().toISOString()
            }]
        });
        input.value = '';
        await loadMessages();
        showToast('Message sent');
    } catch (error) {
        showToast('Failed to send message', true);
        console.error('Send message error:', error);
    } finally {
        document.body.classList.remove('loading');
    }
}

async function replyMessage(index) {
    try {
        document.body.classList.add('loading');
        const messages = (await axios.get(`${SHEETDB_API}?sheet=Messages`)).data;
        const original = messages[index];
        const replyText = prompt('Enter your reply:', `Re: ${original.text}`);
        if (replyText) {
            await axios.post(`${SHEETDB_API}?sheet=Messages`, {
                data: [{
                    text: replyText,
                    category: 'sent',
                    date: newasciDate().toISOString()
                }]
            });
            await loadMessages();
            showToast('Reply sent');
        }
    } catch (error) {
        showToast('Failed to send reply', true);
        console.error('Reply message error:', error);
    } finally {
        document.body.classList.remove('loading');
    }
}

async function deleteMessage(index) {
    try {
        document.body.classList.add('loading');
        const messages = (await axios.get(`${SHEETDB_API}?sheet=Messages`)).data;
        const message = messages[index];
        await axios.delete(`${SHEETDB_API}/text/${encodeURIComponent(message.text)}?sheet=Messages`);
        await loadMessages();
        showToast('Message deleted');
    } catch (error) {
        showToast('Failed to delete message', true);
        console.error('Delete message error:', error);
    } finally {
        document.body.classList.remove('loading');
    }
}

// Profile settings
function saveProfile() {
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const password = document.getElementById('userPassword').value.trim();

    const nameError = document.getElementById('nameError');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');

    let isValid = true;

    nameError.style.display = 'none';
    emailError.style.display = 'none';
    passwordError.style.display = 'none';

    if (!name) {
        nameError.style.display = 'block';
        isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        emailError.style.display = 'block';
        isValid = false;
    }

    if (password && password.length < 6) {
        passwordError.style.display = 'block';
        isValid = false;
    }

    if (isValid) {
        const profile = {
            name,
            email,
            ...(password && { password })
        };
        localStorage.setItem('userProfile', JSON.stringify(profile));
        showToast('Profile updated successfully');
        document.getElementById('userPassword').value = '';
    }
}

// Settings management
function saveSettings() {
    const chartType = document.getElementById('defaultChartType').value;
    const timeRange = document.getElementById('defaultTimeRange').value;
    const itemsPerPage = parseInt(document.getElementById('itemsPerPage').value) || 10;

    const itemsPerPageError = document.getElementById('itemsPerPageError');
    itemsPerPageError.style.display = 'none';

    if (itemsPerPage < 5 || itemsPerPage > 50) {
        itemsPerPageError.style.display = 'block';
        return;
    }

    localStorage.setItem('defaultChartType', chartType);
    localStorage.setItem('defaultTimeRange', timeRange);
    localStorage.setItem('itemsPerPage', itemsPerPage);
    showToast('Settings saved');
    loadCustomers();
    loadTasks();
    loadMessages();
}

function loadSettings() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
        document.body.classList.add('dark');
        document.getElementById('themeToggle').checked = true;
    }

    const notifications = localStorage.getItem('notifications') === 'true';
    document.getElementById('notificationToggle').checked = notifications;

    const autoRefresh = localStorage.getItem('autoRefresh') === 'true';
    document.getElementById('autoRefreshToggle').checked = autoRefresh;
    if (autoRefresh) toggleAutoRefresh();

    const profile = JSON.parse(localStorage.getItem('userProfile')) || {};
    document.getElementById('userName').value = profile.name || '';
    document.getElementById('userEmail').value = profile.email || '';

    const chartType = localStorage.getItem('defaultChartType') || 'line';
    const timeRange = localStorage.getItem('defaultTimeRange') || '6';
    const itemsPerPage = localStorage.getItem('itemsPerPage') || '10';

    document.getElementById('defaultChartType').value = chartType;
    document.getElementById('defaultTimeRange').value = timeRange;
    document.getElementById('itemsPerPage').value = itemsPerPage;

    document.getElementById('chartType').value = chartType;
    document.getElementById('timeRange').value = timeRange;
}

// Score cards
async function updateScoreCards() {
    try {
        const [customers, tasks, messages] = await Promise.all([
            axios.get(`${SHEETDB_API}?sheet=Customers`).then(res => res.data),
            axios.get(`${SHEETDB_API}?sheet=Tasks`).then(res => res.data),
            axios.get(`${SHEETDB_API}?sheet=Messages`).then(res => res.data)
        ]);

        document.getElementById('totalCustomers').textContent = customers.length;
        document.getElementById('tasksCompleted').textContent = tasks.filter(t => t.completed).length;
        document.getElementById('messagesSent').textContent = messages.filter(m => m.category === 'sent').length;
    } catch (error) {
        showToast('Failed to update score cards', true);
        console.error('Update score cards error:', error);
    }
}

// Analytics chart
function updateChart() {
    const type = document.getElementById('chartType').value;
    const range = parseInt(document.getElementById('timeRange').value);
    const ctx = document.getElementById('salesChart').getContext('2d');

    if (salesChart) salesChart.destroy();

    let config = {};

    if (type === 'line') {
        const labels = range === 6 ? 
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] :
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const data = range === 6 ? 
            [12000, 19000, 15000, 22000, 18000, 25000] :
            [12000, 19000, 15000, 22000, 18000, 25000, 20000, 23000, 17000, 26000, 21000, 28000];

        config = {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Sales',
                    data,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.2)',
                    tension: 0.4,
                    fill: true
                }]
            }
        };
    } else if (type === 'bar') {
        const labels = ['Website', 'Referrals', 'Ads', 'Social Media'];
        const data = range === 6 ? [50, 30, 20, 10] : [100, 60, 40, 20];

        config = {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Lead Sources',
                    data,
                    backgroundColor: '#4f46e5',
                    borderColor: '#4f46e5',
                    borderWidth: 1
                }]
            }
        };
    } else if (type === 'pie') {
        const labels = ['Product A', 'Product B', 'Product C'];
        const data = range === 6 ? [30000, 20000, 10000] : [60000, 40000, 20000];

        config = {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    label: 'Sales by Category',
                    data,
                    backgroundColor: ['#4f46e5', '#10b981', '#f59e0b'],
                    borderColor: ['#ffffff'],
                    borderWidth: 1
                }]
            }
        };
    }

    salesChart = new Chart(ctx, {
        ...config,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: type !== 'pie' ? {
                y: {
                    beginAtZero: true
                }
            } : {},
            plugins: {
                legend: {
                    display: type === 'pie'
                }
            }
        }
    });
}

// Initialize
window.onload = async () => {
    document.body.classList.add('loading');
    try {
        await Promise.all([
            loadCustomers(),
            loadTasks(),
            loadMessages(),
            loadSettings(),
            updateChart(),
            updateScoreCards()
        ]);
    } catch (error) {
        showToast('Failed to initialize dashboard', true);
        console.error('Initialization error:', error);
    } finally {
        setTimeout(() => {
            document.body.classList.remove('loading');
        }, 500);
    }
};
