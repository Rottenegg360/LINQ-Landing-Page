// Function to format date
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Function to check if a date is today
function isToday(dateString) {
    const today = new Date();
    const date = new Date(dateString);
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
}

// Check if user is authenticated
function checkAuth() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/admin-login.html';
        return false;
    }
    return true;
}

// Function to load and display subscribers
async function loadSubscribers() {
    if (!checkAuth()) return;

    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const subscribersList = document.getElementById('subscribers-list');
    const totalSubscribersElement = document.getElementById('total-subscribers');
    const newTodayElement = document.getElementById('new-today');

    try {
        loadingElement.style.display = 'block';
        errorElement.style.display = 'none';
        subscribersList.innerHTML = '';

        const token = localStorage.getItem('adminToken');
        const response = await fetch('http://localhost:3000/api/subscribers', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('adminToken');
            window.location.href = '/admin-login.html';
            return;
        }

        const subscribers = await response.json();

        // Update stats
        totalSubscribersElement.textContent = subscribers.length;
        const newToday = subscribers.filter(sub => isToday(sub.createdAt)).length;
        newTodayElement.textContent = newToday;

        // Populate table
        subscribers.forEach(subscriber => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${subscriber.name}</td>
                <td>${subscriber.email}</td>
                <td>${formatDate(subscriber.createdAt)}</td>
            `;
            subscribersList.appendChild(row);
        });

    } catch (error) {
        console.error('Error:', error);
        errorElement.textContent = 'Failed to load subscribers. Please try again.';
        errorElement.style.display = 'block';
    } finally {
        loadingElement.style.display = 'none';
    }
}

// Add logout functionality
function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin-login.html';
}

// Load subscribers when the page loads
document.addEventListener('DOMContentLoaded', () => {
    if (checkAuth()) {
        loadSubscribers();
    }
}); 