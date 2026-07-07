// js/agent.js
// B2B Agent Portal Auth & Utility Helper

const AgentAuth = {
    get token() { return localStorage.getItem('agent_token'); },
    get email() { return localStorage.getItem('agent_email'); },
    get agencyName() { return localStorage.getItem('agent_agency_name'); },
    get name() { return localStorage.getItem('agent_name'); },

    session(token, agent) {
        localStorage.setItem('agent_token', token);
        localStorage.setItem('agent_email', agent.email);
        localStorage.setItem('agent_agency_name', agent.agency_name);
        localStorage.setItem('agent_name', agent.agent_name);
    },

    logout() {
        localStorage.removeItem('agent_token');
        localStorage.removeItem('agent_email');
        localStorage.removeItem('agent_agency_name');
        localStorage.removeItem('agent_name');
        location.replace('agent-login.html');
    }
};

window.AgentAuth = AgentAuth;

function showAlert(type, msg) {
    const box = document.querySelector('[data-alert]');
    if (!box) return;
    box.className = `alert alert-${type === 'error' ? 'error' : 'success'}`;
    box.innerHTML = `<span class="title">${type === 'success' ? '✓ Success:' : '✕ Error:'}</span> ${msg}`;
    box.style.display = 'block';
}

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}
