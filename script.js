const API_URL = window.API_URL || window.location.origin;

function getAccessToken() {
    return localStorage.getItem('authToken');
}

function trackEvent(event, description, relatedEntity, relatedEntityId) {
    const token = getAccessToken();
    if (!token) return;
    fetch(API_URL + '/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ event, description, relatedEntity, relatedEntityId }),
        keepalive: true
    }).catch(() => {});
}

// ============== LOGIN & REGISTRATION PAGE ============== 
const buttons = document.querySelectorAll('.toggle-btn');
const switchLinks = document.querySelectorAll('.switch-link');
const forms = document.querySelectorAll('.form-card');

function showForm(target) {
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === target);
    });

    forms.forEach(form => {
        form.classList.toggle('active-form', form.id === target);
    });
}

buttons.forEach(button => {
    button.addEventListener('click', function (e) {
        e.preventDefault();
        showForm(this.dataset.target);
    });
});

switchLinks.forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        showForm(this.dataset.target);
    });
});

// Handle Registration Form Submission
const registerForm = document.querySelector('#register form');
if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const firstName = this.querySelector('input[placeholder="First Name"]').value;
        const lastName = this.querySelector('input[placeholder="Last Name"]').value;
        const username = this.querySelector('input[placeholder="Username"]').value;
        const email = this.querySelector('input[placeholder="Email"]').value;
        const password = this.querySelector('input[placeholder="Password"]').value;
        const countryCode = this.querySelector('select').value;
        const phone = this.querySelector('input[placeholder="Phone Number"]').value;
        const experience = this.querySelector('#experience').value;
        const passwordError = validateClientPassword(password);
        if (passwordError) {
            alert(passwordError);
            return;
        }

        fetch(API_URL + '/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ first_name: firstName, last_name: lastName, email, username, password, country_code: countryCode, phone, trading_experience: experience })
        }).then(r => r.json()).then(data => {
            if (data.error) return alert(data.error);
            localStorage.setItem('authToken', data.accessToken || data.token);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('username', `${data.user.first_name} ${data.user.last_name}`);
            localStorage.setItem('email', data.user.email);
            window.location.href = 'dashboard.html';
        }).catch(err => {
            console.error(err);
            alert('Registration failed');
        });
    });
}

// Handle Login Form Submission
const loginForm = document.querySelector('#login form');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const identifier = this.querySelector('input[placeholder="Username or Email"]').value;
        const password = this.querySelector('input[placeholder="Password"]').value;

        fetch(API_URL + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password })
        }).then(r => r.json()).then(data => {
            if (data.error) return alert(data.error);
            localStorage.setItem('authToken', data.accessToken || data.token);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('username', data.user.username || (data.user.first_name + ' ' + data.user.last_name));
            localStorage.setItem('email', data.user.email || '');
            window.location.href = 'dashboard.html';
        }).catch(err => {
            console.error(err);
            alert('Login failed');
        });
    });
}

// ============== POST-LOGIN PAGE UTILITIES ============== 

// Check if user is logged in on protected pages
async function checkLoginStatus() {
    const token = getAccessToken();
    const currentPage = window.location.pathname;
    const protectedPages = ['dashboard.html', 'courses.html', 'lessons.html', 'profile.html', 'settings.html', 'admin.html'];
    const isProtectedPage = protectedPages.some(page => currentPage.includes(page));

    if (!token && isProtectedPage) {
        window.location.href = 'index.html';
        return;
    }

    // Optionally verify token by calling /me for sensitive pages
    if (token && isProtectedPage) {
        try {
            let res = await fetch(API_URL + '/api/auth/me', { headers: { 'Authorization': 'Bearer ' + token } });
            if (res.status === 401 && localStorage.getItem('refreshToken')) {
                const refresh = await fetch(API_URL + '/api/auth/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken: localStorage.getItem('refreshToken') })
                });
                if (refresh.ok) {
                    const refreshed = await refresh.json();
                    localStorage.setItem('authToken', refreshed.accessToken);
                    localStorage.setItem('refreshToken', refreshed.refreshToken);
                    res = await fetch(API_URL + '/api/auth/me', { headers: { Authorization: 'Bearer ' + refreshed.accessToken } });
                }
            }
            if (!res.ok) throw new Error('not authorized');
            const data = await res.json();
            trackEvent('page_view', currentPage);
            // If admin page, ensure user is admin
            const staffRoles = ['super_admin', 'admin', 'instructor', 'support'];
            if (currentPage.includes('admin.html') && !staffRoles.includes(data.user.role) && !data.user.is_admin) {
                alert('Admin access required');
                window.location.href = 'dashboard.html';
            }
        } catch (err) {
            const refreshToken = localStorage.getItem('refreshToken');
            const token = localStorage.getItem('authToken');
            if (token) fetch(API_URL + '/api/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                body: JSON.stringify({ refreshToken }),
                keepalive: true
            }).catch(() => {});
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('isLoggedIn');
            window.location.href = 'index.html';
        }
    }
}

// Initialize page (check login status)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkLoginStatus);
} else {
    checkLoginStatus();
}

// Logout functionality
document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        const token = getAccessToken();
        const refreshToken = localStorage.getItem('refreshToken');
        if (token) fetch(API_URL + '/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ refreshToken }),
            keepalive: true
        }).catch(() => {});
        // Clear localStorage
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
        localStorage.removeItem('email');
        localStorage.removeItem('userUsername');
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        // Redirect to home page
        window.location.href = 'index.html';
    });

    function validateClientPassword(password) {
        if (password.length < 12) return 'Password must be at least 12 characters';
        if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
            return 'Password must include uppercase, lowercase, number, and special character';
        }
        return null;
    }
});

// ============== SETTINGS PAGE FUNCTIONALITY ============== 

// Handle settings navigation
document.querySelectorAll('.settings-nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const sectionId = this.dataset.section;
        
        // Update active nav link
        document.querySelectorAll('.settings-nav-link').forEach(l => {
            l.classList.remove('active');
        });
        this.classList.add('active');
        
        // Update active section
        document.querySelectorAll('.settings-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId).classList.add('active');
    });
});

// ============== LESSONS PAGE FUNCTIONALITY ============== 

// Handle tab switching on lessons page
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        const tabId = this.dataset.tab;
        
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active');
        });
        this.classList.add('active');
        
        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabId).classList.add('active');
    });
});

// ============== GENERAL UTILITIES ============== 

// Load user data on profile page
window.addEventListener('load', function() {
    const token = getAccessToken();
    if (!token) return;
    fetch(API_URL + '/api/auth/me', { headers: { 'Authorization': 'Bearer ' + token } })
        .then(r => r.json()).then(data => {
            if (data && data.user) {
                const nameElements = document.querySelectorAll('#username, #profile-name');
                nameElements.forEach(el => { if (el) el.textContent = data.user.first_name + ' ' + data.user.last_name; });
                const emailElements = document.querySelectorAll('#profile-email');
                emailElements.forEach(el => { if (el) el.textContent = data.user.email; });
            }
            trackEvent('page_view', window.location.pathname);
        }).catch(() => {});
});
