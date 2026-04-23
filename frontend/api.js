const API_URL = 'http://localhost:5000/api';

async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'API Error');
    }
    return data;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    alert(error.message);
    throw error;
  }
}

function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function logout() {
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

function requireAuth() {
  const user = getUser();
  if (!user) {
    window.location.href = 'login.html';
  }
  return user;
}

function renderNavbar() {
  const user = getUser();
  const navHTML = `
    <nav class="navbar">
      <a href="index.html" class="navbar-brand">SRM FindMyStuff</a>
      <div class="nav-links">
        <a href="index.html">Home</a>
        <a href="lost-items.html">Lost Items</a>
        <a href="found-items.html">Found Items</a>
        ${user ? `
          <a href="report-lost.html">Report Lost</a>
          <a href="report-found.html">Report Found</a>
          <a href="matches.html">Matches</a>
          ${user.role === 'admin' ? `<a href="admin.html">Admin</a>` : ''}
        ` : ''}
      </div>
      <div class="nav-user-info">
        ${user ? `
          <span style="font-weight: 500; font-size: 0.95rem;">Hi, ${user.name}</span>
          <button onclick="logout()" class="btn-logout">Logout</button>
        ` : `
          <a href="login.html" class="btn btn-outline" style="color:white; border-color:rgba(255,255,255,0.4); padding: 0.4rem 1rem;">Login</a>
          <a href="register.html" class="btn btn-primary" style="padding: 0.4rem 1rem;">Register</a>
        `}
      </div>
    </nav>
  `;
  document.body.insertAdjacentHTML('afterbegin', navHTML);
}
