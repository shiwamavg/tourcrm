// js/api.js
// Lightweight fetch wrapper that:
//   • prefixes the backend URL (window.API_BASE)
//   • attaches the portal JWT (if any) as Authorization: Bearer
//   • JSON-encodes the body, parses the response, throws on non-2xx
//   • supports both portal endpoints (/api/portal/*) and admin endpoints
//     (/api/.../download) by allowing a custom token

const API = {
    base: (window.API_BASE || 'http://localhost:3000') + '/api',

    async _fetch(path, { method = 'GET', body, token, raw = false, headers = {} } = {}) {
        const t = token || localStorage.getItem('portal_token');
        const opts = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(t ? { Authorization: `Bearer ${t}` } : {}),
                ...headers
            }
        };
        if (body !== undefined) opts.body = JSON.stringify(body);
        const resp = await fetch(this.base + path, opts);
        if (raw) return resp;
        const text = await resp.text();
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
        if (!resp.ok) {
            const err = new Error(json?.error || `HTTP ${resp.status}`);
            err.status = resp.status;
            err.payload = json;
            throw err;
        }
        return json;
    },

    // ── Auth ───────────────────────────────────────────────
    sendOtp(email)               { return this._fetch('/portal/auth/send-otp',  { method: 'POST', body: { email } }); },
    verifyOtp(email, code)       { return this._fetch('/portal/auth/verify-otp',{ method: 'POST', body: { email, code } }); },
    me(token)                    { return this._fetch('/portal/me', { token }); },

    // ── Bookings ───────────────────────────────────────────
    myBookings(token)            { return this._fetch('/portal/bookings',     { token }); },
    bookingDetail(id, token)     { return this._fetch(`/portal/bookings/${id}`, { token }); },

    // ── Payments ───────────────────────────────────────────
    payBooking(id, amount, token) {
        return this._fetch(`/portal/bookings/${id}/pay`,
            { method: 'POST', body: { amount }, token });
    },
    recordOfflinePayment(id, payload, token) {
        return this._fetch(`/portal/bookings/${id}/pay-offline`,
            { method: 'POST', body: payload, token });
    },

    // ── Reviews ────────────────────────────────────────────
    reviewBooking(id, payload, token) {
        return this._fetch(`/portal/bookings/${id}/review`,
            { method: 'POST', body: payload, token });
    },
    publicReviews()              { return this._fetch('/reviews'); },

    // ── Predefined Packages ────────────────────────────────
    publicPackages(companyId = 1) { return this._fetch(`/packages?company_id=${companyId}`); },
    publicPackageDetail(id)       { return this._fetch(`/packages/${id}`); },
    bookPackage(id, payload)      { return this._fetch(`/packages/${id}/book`, { method: 'POST', body: payload }); },

    // ── Invoice PDF (portal-authenticated) ────────────────
    // The customer-website uses the portal token, so it calls the
    // portal-scoped route at /api/portal/invoices/:id/download.
    invoicePdfUrl(id, token) {
        const t = token || localStorage.getItem('portal_token') || '';
        return `${this.base}/portal/invoices/${id}/download` + (t ? `?t=${encodeURIComponent(t)}` : '');
    },
    async downloadInvoicePdf(id, token) {
        const t = token || localStorage.getItem('portal_token');
        const resp = await fetch(`${this.base}/portal/invoices/${id}/download`, {
            headers: t ? { Authorization: `Bearer ${t}` } : {}
        });
        if (!resp.ok) throw new Error(`Failed to download invoice (HTTP ${resp.status})`);
        const blob = await resp.blob();
        return URL.createObjectURL(blob);
    }
};

window.API = API;
