import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PortalAuthService } from './portal-auth.service';

@Component({
    selector: 'app-portal-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="portal-page">
        <div class="portal-card">
            <h1>Tour CRM</h1>
            <h2>Customer Portal</h2>

            @if (!step()) {
                <p>Enter your email to receive a one-time code.</p>
                <form (ngSubmit)="sendOtp()">
                    <label>
                        <span>Email</span>
                        <input type="email" [(ngModel)]="email" name="email" required placeholder="your@email.com">
                    </label>
                    <button type="submit" class="btn" [disabled]="loading()">
                        {{ loading() ? 'Sending...' : 'Send OTP' }}
                    </button>
                </form>
            } @else {
                <p>We sent a code to <strong>{{ email }}</strong>. Enter it below.</p>
                <form (ngSubmit)="verifyOtp()">
                    <label>
                        <span>OTP Code</span>
                        <input type="text" [(ngModel)]="otp" name="otp" required placeholder="000000" maxlength="6">
                    </label>
                    <button type="submit" class="btn" [disabled]="loading()">
                        {{ loading() ? 'Verifying...' : 'Verify & Login' }}
                    </button>
                </form>
                <button class="btn ghost" (click)="step.set(0); otp=''" style="margin-top:8px;">Back</button>
            }

            @if (error()) {
                <div class="error">{{ error() }}</div>
            }
        </div>
    </div>
    `,
    styles: [`
        .portal-page { display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0fdfa; }
        .portal-card { background:#fff; border-radius:12px; padding:32px; box-shadow:0 4px 20px rgba(0,0,0,.06); width:380px; }
        h1 { margin:0 0 2px; font-size:1.3rem; color:#0f766e; }
        h2 { margin:0 0 16px; font-size:.9rem; color:#6b7280; font-weight:400; }
        p { font-size:13px; color:#374151; margin-bottom:16px; }
        label { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; font-size:13px; color:#374151; }
        input { padding:10px 12px; border:1px solid #d1d5db; border-radius:6px; font:inherit; }
        input:focus { outline:none; border-color:#0f766e; box-shadow:0 0 0 3px rgba(15,118,110,.1); }
        .btn { width:100%; padding:10px; border:none; border-radius:6px; cursor:pointer; font:inherit; background:#0f766e; color:#fff; }
        .btn:disabled { opacity:.5; cursor:not-allowed; }
        .btn.ghost { background:#f3f4f6; color:#374151; }
        .error { margin-top:10px; color:#dc2626; font-size:13px; }
    `]
})
export class PortalLoginComponent {
    private auth = inject(PortalAuthService);
    private router = inject(Router);

    step = signal(0);
    loading = signal(false);
    error = signal('');
    email = '';
    otp = '';

    sendOtp() {
        if (!this.email) return;
        this.loading.set(true);
        this.error.set('');
        this.auth.sendOtp(this.email).subscribe({
            next: () => { this.loading.set(false); this.step.set(1); },
            error: (e) => { this.loading.set(false); this.error.set(e.error?.error || 'Failed to send OTP'); }
        });
    }

    verifyOtp() {
        if (!this.otp) return;
        this.loading.set(true);
        this.error.set('');
        this.auth.verifyOtp(this.email, this.otp).subscribe({
            next: () => { this.loading.set(false); this.router.navigate(['/portal/bookings']); },
            error: (e) => { this.loading.set(false); this.error.set(e.error?.error || 'Invalid OTP'); }
        });
    }
}
