const API_ROOT = window.API_URL || window.location.origin;

async function fetchOverview() {
  const token = localStorage.getItem('authToken');
  const identity = await fetch(API_ROOT + '/api/auth/me', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (!identity.ok) throw new Error('Unable to verify administrator session');
  const identityData = await identity.json();
  document.getElementById('role-badge').textContent = (identityData.user && identityData.user.role) || 'administrator';
  const res = await fetch(API_ROOT + '/api/admin/overview', { headers: { 'Authorization': 'Bearer ' + token } });
  if (!res.ok) throw new Error('Unable to load dashboard metrics');
  const { metrics } = await res.json();
  document.getElementById('metric-users').textContent = metrics.users;
  document.getElementById('metric-active-users').textContent = metrics.activeUsers;
  document.getElementById('metric-published-courses').textContent = metrics.publishedCourses;
  document.getElementById('metric-enrollments').textContent = metrics.enrollments;
}

async function fetchUsers(search = '') {
  const token = localStorage.getItem('authToken');
  const statusEl = document.getElementById('status');
  if (!token) {
    statusEl.textContent = 'Not authenticated. Please login as an admin.';
    return;
  }

  try {
    const query = search ? '?search=' + encodeURIComponent(search) : '';
    const res = await fetch(API_ROOT + '/api/admin/users' + query, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('Failed to fetch users: ' + res.status);
    const data = await res.json();
    const currentUser = await fetch(API_ROOT + '/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(response => response.json());
    document.getElementById('role-badge').textContent = (currentUser.user && currentUser.user.role) || 'administrator';
    const tbody = document.querySelector('#users-table tbody');
    tbody.innerHTML = '';
    document.getElementById('user-count').textContent = `${data.users.length} record${data.users.length === 1 ? '' : 's'}`;
    data.users.forEach(u => {
      const tr = document.createElement('tr');
      [u.id + ' - ' + `${u.first_name} ${u.last_name}`, u.email, u.username, u.account_type || 'free', u.is_active ? 'Active' : 'Inactive'].forEach(value => {
        const td = document.createElement('td');
        td.textContent = value || '';
        tr.appendChild(td);
      });
      const roleCell = document.createElement('td');
      const roleSelect = document.createElement('select');
      ['user', 'admin', 'super_admin', 'instructor', 'support'].forEach(role => {
        const option = document.createElement('option');
        option.value = role;
        option.textContent = role.replace('_', ' ');
        option.selected = role === (u.role || 'user');
        roleSelect.appendChild(option);
      });
      roleSelect.addEventListener('change', () => updateRole(u.id, roleSelect.value));
      roleCell.appendChild(roleSelect);
      tr.appendChild(roleCell);
      const joinedCell = document.createElement('td');
      joinedCell.textContent = u.created_at ? new Date(u.created_at).toLocaleDateString() : '';
      tr.appendChild(joinedCell);
      tbody.appendChild(tr);
    });
    statusEl.textContent = '';
  } catch (err) {
    statusEl.textContent = err.message;
  }

  async function updateRole(id, role) {
    const res = await fetch(API_ROOT + '/api/admin/users/' + id + '/role', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('authToken') },
      body: JSON.stringify({ role })
    });
    if (!res.ok) document.getElementById('status').textContent = 'Role update was not permitted.';
  }
}

async function loadTab(tab) {
  if (tab === 'overview') await fetchOverview();
  if (tab === 'users') await fetchUsers(document.getElementById('user-search').value.trim());
  if (tab === 'analytics') await fetchAnalytics();
  if (tab === 'courses') await fetchCourses();
  if (tab === 'lessons') await fetchLessons();
}

async function fetchAnalytics() {
  const token = localStorage.getItem('authToken');
  const days = document.getElementById('analytics-days').value;
  const res = await fetch(API_ROOT + '/api/admin/analytics/activity?days=' + days, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) throw new Error('Unable to load activity analytics');
  const data = await res.json();
  const tbody = document.querySelector('#analytics-table tbody');
  tbody.replaceChildren();
  data.events.forEach(item => {
    const row = document.createElement('tr');
    const event = document.createElement('td');
    const total = document.createElement('td');
    event.textContent = item.event;
    total.textContent = item.total;
    row.append(event, total);
    tbody.appendChild(row);
  });
}

// Tab handling
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.admin-tab').forEach(s => s.classList.toggle('is-active', s.id === 'tab-' + tab));
    document.querySelectorAll('.tab-btn').forEach(item => item.classList.toggle('active', item === btn));
    loadTab(tab).catch(err => { document.getElementById('status').textContent = err.message; });
  });
});

document.getElementById('user-search-button').addEventListener('click', () => fetchUsers(document.getElementById('user-search').value.trim()));
document.getElementById('user-search').addEventListener('keydown', event => {
  if (event.key === 'Enter') fetchUsers(event.target.value.trim());
});
document.getElementById('analytics-days').addEventListener('change', () => fetchAnalytics().catch(err => {
  document.getElementById('status').textContent = err.message;
}));

// Courses
async function fetchCourses() {
  const token = localStorage.getItem('authToken');
  const res = await fetch(API_ROOT + '/api/admin/courses', { headers: { 'Authorization': 'Bearer ' + token } });
  const data = await res.json();
  const tbody = document.querySelector('#courses-table tbody');
  tbody.innerHTML = '';
  (data.courses || []).forEach(c => {
    const tr = document.createElement('tr');
    [c.id, c.title, c.slug, c.price, c.is_published ? 'Yes' : 'No'].forEach(value => {
      const td = document.createElement('td'); td.textContent = value == null ? '' : value; tr.appendChild(td);
    });
    const action = document.createElement('td');
    action.innerHTML = '<button class="admin-button danger del-course">Delete</button>';
    action.querySelector('button').dataset.id = c.id;
    tr.appendChild(action);
    tbody.appendChild(tr);
  });
  document.querySelectorAll('.del-course').forEach(b => b.addEventListener('click', async (e) => {
    const id = e.target.dataset.id;
    if (!confirm('Delete course ' + id + '?')) return;
    await fetch(API_ROOT + '/api/admin/courses/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') } });
    fetchCourses();
  }));
}

document.getElementById('course-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  data.is_published = form.querySelector('input[name="is_published"]').checked;
  const res = await fetch(API_ROOT + '/api/admin/courses', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }, body: JSON.stringify(data) });
  const json = await res.json();
  if (json.id) { form.reset(); fetchCourses(); }
});

// Lessons
async function fetchLessons() {
  const token = localStorage.getItem('authToken');
  const res = await fetch(API_ROOT + '/api/admin/lessons', { headers: { 'Authorization': 'Bearer ' + token } });
  const data = await res.json();
  const tbody = document.querySelector('#lessons-table tbody');
  tbody.innerHTML = '';
  (data.lessons || []).forEach(l => {
    const tr = document.createElement('tr');
    [l.id, l.course_id, l.title, l.lesson_order || ''].forEach(value => {
      const td = document.createElement('td'); td.textContent = value == null ? '' : value; tr.appendChild(td);
    });
    const action = document.createElement('td');
    action.innerHTML = '<button class="admin-button danger del-lesson">Delete</button>';
    action.querySelector('button').dataset.id = l.id;
    tr.appendChild(action);
    tbody.appendChild(tr);
  });
  document.querySelectorAll('.del-lesson').forEach(b => b.addEventListener('click', async (e) => {
    const id = e.target.dataset.id;
    if (!confirm('Delete lesson ' + id + '?')) return;
    await fetch(API_ROOT + '/api/admin/lessons/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') } });
    fetchLessons();
  }));
}

document.getElementById('lesson-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  const res = await fetch(API_ROOT + '/api/admin/lessons', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }, body: JSON.stringify(data) });
  const json = await res.json();
  if (json.id) { form.reset(); fetchLessons(); }
});

// Uploads
document.getElementById('upload-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const res = await fetch(API_ROOT + '/api/admin/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }, body: fd });
  const json = await res.json();
  const out = document.getElementById('upload-result');
  if (json.ok) {
    out.textContent = 'Uploaded: ';
    const link = document.createElement('a');
    link.href = json.url.startsWith('http') ? json.url : API_ROOT + json.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = json.originalname || json.filename;
    out.appendChild(link);
    if (/\.(mp4|webm|mov|m4v)$/i.test(json.filename || '')) {
      const videoUrl = document.querySelector('#lesson-form [name="video_url"]');
      if (videoUrl) videoUrl.value = link.href;
      const video = document.createElement('video');
      video.controls = true;
      video.preload = 'metadata';
      video.src = link.href;
      video.className = 'upload-preview';
      out.appendChild(video);
    }
    form.reset();
  } else {
    out.textContent = json.error || 'Upload failed';
  }
});

// Initialize overview
document.querySelector('[data-tab="overview"]').click();
