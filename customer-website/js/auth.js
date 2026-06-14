// js/auth.js
// Tiny portal-auth helper: stores the JWT + email in localStorage and
// redirects to the login page if no session is present.

const PORTAL_TOKEN_KEY = 'portal_token';
const PORTAL_EMAIL_KEY = 'portal_email';

const Auth = {
    get token()  { return localStorage.getItem(PORTAL_TOKEN_KEY); },
    get email()  { return localStorage.getItem(PORTAL_EMAIL_KEY); },
    set session(token, email) {
        localStorage.setItem(PORTAL_TOKEN_KEY, token);
        localStorage.setItem(PORTAL_EMAIL_KEY, email);
    },
    clear() {
        localStorage.removeItem(PORTAL_TOKEN_KEY);
        localStorage.removeItem(PORTAL_EMAIL_KEY);
    },

    /** Redirect to login if there's no portal session. */
    require() {
        if (!this.token) {
            const returnTo = encodeURIComponent(location.pathname + location.search);
            location.href = `portal.html?return=${returnTo}`;
            return false;
        }
        return true;
    },
    logout() {
        this.clear();
        location.href = 'portal.html';
    },

    /** Render the topbar user widget. */
    renderTopbar() {
        const el = document.querySelector('[data-topbar-user]');
        if (!el) return;
        if (this.email) {
            el.innerHTML = `
                <span class="email">${escapeHtml(this.email)}</span>
                <button onclick="Auth.logout()">Logout</button>
            `;
        }
    }
};
window.Auth = Auth;

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
window.escapeHtml = escapeHtml;

/** Show a transient alert at the top of <main>. */
function showAlert(kind, message, where = '[data-alert]') {
    const slot = document.querySelector(where);
    if (!slot) return;
    slot.innerHTML = `<div class="alert alert-${kind}">${escapeHtml(message)}</div>`;
    if (kind !== 'error') setTimeout(() => { if (slot) slot.innerHTML = ''; }, 5000);
}
window.showAlert = showAlert;

function formatINR(n) {
    return 'INR ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
function formatINRShort(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
window.formatINR = formatINR;
window.formatINRShort = formatINRShort;

function formatDate(s) {
    if (!s) return '—';
    return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
window.formatDate = formatDate;

function getQueryParam(name) {
    return new URLSearchParams(location.search).get(name);
}
window.getQueryParam = getQueryParam;
