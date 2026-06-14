import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SuperAdminAuthService } from '../../core/services/super-admin-auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-sa-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="login-page">
        <div class="login-card">
            <h1>Tour CRM</h1>
            <h2>Super Admin</h2>
            <form (ngSubmit)="submit()">
                <label>
                    <span>Email</span>
                    <input type="email" [(ngModel)]="email" name="email" required placeholder="superadmin@tourcrm.local">
                </label>
                <label>
                    <span>Password</span>
                    <input type="password" [(ngModel)]="password" name="password" required placeholder="Password">
                </label>
                <button type="submit" class="btn btn-primary" [disabled]="loading()">
                    {{ loading() ? 'Signing in…' : 'Sign In' }}
                </button>
                @if (error()) {
                    <div class="error">{{ error() }}</div>
                }
            </form>
        </div>
    </div>
    `,
    styles: [`
        .login-page { display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f3f4f6; }
        .login-card { background:#fff; padding:32px; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,.08); width:360px; }
        h1 { margin:0 0 4px; font-size:1.4rem; color:#111827; }
        h2 { margin:0 0 20px; font-size:.95rem; color:#6b7280; font-weight:400; }
        label { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; font-size:13px; color:#374151; }
        input { padding:10px 12px; border:1px solid #d1d5db; border-radius:6px; font:inherit; }
        input:focus { outline:none; border-color:#0f766e; box-shadow:0 0 0 3px rgba(15,118,110,.1); }
        .btn { width:100%; padding:10px; border:none; border-radius:6px; cursor:pointer; font:inherit; background:#0f766e; color:#fff; }
        .btn:disabled { opacity:.5; cursor:not-allowed; }
        .error { margin-top:10px; color:#dc2626; font-size:13px; }
    `]
})
export class SaLoginComponent {
    private auth = inject(SuperAdminAuthService);
    private toast = inject(ToastService);
    private router = inject(Router);

    email = 'superadmin@tourcrm.local';
    password = '';
    loading = signal(false);
    error = signal('');

    submit() {
        this.error.set('');
        this.loading.set(true);
        this.auth.login(this.email, this.password).subscribe({
            next: () => {
                this.loading.set(false);
                this.router.navigate(['/super-admin/dashboard']);
            },
            error: (e) => {
                this.loading.set(false);
                this.error.set(e.error?.error || 'Login failed');
            }
        });
    }
}
