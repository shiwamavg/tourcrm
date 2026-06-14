// ── Config ────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:3000/api';  // Update to production URL

// ── DOM helpers ───────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const show = (id) => $(id)?.classList.remove('hidden');
const hide = (id) => $(id)?.classList.add('hidden');
const setError = (id, msg) => { if ($(id)) $(id).textContent = msg; };

let currentEmail = '';

// ── Step 1: Send OTP ──────────────────────────────────────────────
$('btn-send-otp')?.addEventListener('click', sendOtp);
$('email')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendOtp(); });

async function sendOtp() {
    const email = $('email').value.trim();
    setError('email-error', '');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('email-error', 'Please enter a valid email address');
        return;
    }

    $('btn-send-otp').disabled = true;
    show('loading');

    try {
        const res = await fetch(`${API_BASE}/portal/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();

        hide('loading');
        if (res.ok) {
            currentEmail = email;
            $('email-display').textContent = email;
            hide('step-email');
            show('step-otp');
            focusFirstOtp();
        } else {
            setError('email-error', data.error || 'Failed to send OTP');
            $('btn-send-otp').disabled = false;
        }
    } catch {
        hide('loading');
        setError('email-error', 'Network error. Please try again.');
        $('btn-send-otp').disabled = false;
    }
}

// ── OTP input auto-advance ────────────────────────────────────────
document.querySelectorAll('.otp-box').forEach((box, i) => {
    box.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val;
        if (val && i < 5) document.querySelectorAll('.otp-box')[i + 1]?.focus();
    });
    box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && i > 0) {
            document.querySelectorAll('.otp-box')[i - 1]?.focus();
        }
        if (e.key === 'Enter') verifyOtp();
    });
    box.addEventListener('paste', (e) => {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        const boxes = document.querySelectorAll('.otp-box');
        [...paste].forEach((ch, j) => { if (boxes[j]) boxes[j].value = ch; });
        boxes[Math.min(paste.length, 5)]?.focus();
    });
});

function focusFirstOtp() {
    setTimeout(() => document.querySelectorAll('.otp-box')[0]?.focus(), 100);
}

// ── Step 2: Verify OTP ────────────────────────────────────────────
$('btn-verify-otp')?.addEventListener('click', verifyOtp);

async function verifyOtp() {
    const otp = [...document.querySelectorAll('.otp-box')].map(b => b.value).join('');
    setError('otp-error', '');

    if (otp.length !== 6) {
        setError('otp-error', 'Please enter the complete 6-digit OTP');
        return;
    }

    $('btn-verify-otp').disabled = true;
    show('loading');

    try {
        const res = await fetch(`${API_BASE}/portal/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentEmail, otp })
        });
        const data = await res.json();

        hide('loading');
        if (res.ok) {
            sessionStorage.setItem('portal_token', data.token);
            sessionStorage.setItem('portal_customer', JSON.stringify(data.customer));
            window.location.href = 'dashboard.html';
        } else {
            setError('otp-error', data.error || 'Invalid OTP');
            $('btn-verify-otp').disabled = false;
        }
    } catch {
        hide('loading');
        setError('otp-error', 'Network error. Please try again.');
        $('btn-verify-otp').disabled = false;
    }
}

// ── Resend OTP ────────────────────────────────────────────────────
$('btn-resend')?.addEventListener('click', () => {
    show('step-email');
    hide('step-otp');
    $('btn-send-otp').disabled = false;
    document.querySelectorAll('.otp-box').forEach(b => b.value = '');
    setError('otp-error', '');
});

// ── Redirect if already logged in ────────────────────────────────
if (sessionStorage.getItem('portal_token')) {
    window.location.href = 'dashboard.html';
}
