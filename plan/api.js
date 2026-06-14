// ── api.js — fetch wrapper for customer portal ────────────────────
const API_BASE = 'http://localhost:3000/api';  // Update for production

function getToken() {
    const t = sessionStorage.getItem('portal_token');
    if (!t) { window.location.href = 'index.html'; return null; }
    return t;
}

async function apiGet(path) {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) { sessionStorage.clear(); window.location.href = 'index.html'; return; }
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

async function apiPost(path, body) {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (res.status === 401) { sessionStorage.clear(); window.location.href = 'index.html'; return; }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}
