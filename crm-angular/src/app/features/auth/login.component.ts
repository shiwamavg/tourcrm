import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    template: `
    <div class="login-wrap">
        <div class="login-card">
            <h1>Tour CRM</h1>
            <p class="subtitle">Sign in to continue</p>

            <form [formGroup]="form" (ngSubmit)="submit()">
                <div class="form-group">
                    <label>Email <span class="req">*</span></label>
                    <input type="email" formControlName="email" placeholder="you@agency.com" autocomplete="username">
                </div>
                <div class="form-group">
                    <label>Password <span class="req">*</span></label>
                    <input type="password" formControlName="password" placeholder="••••••••" autocomplete="current-password">
                </div>

                @if (error()) {
                    <div class="error-msg" style="margin-bottom:12px">{{ error() }}</div>
                }

                <button type="submit" class="btn btn-primary" [disabled]="loading() || form.invalid">
                    @if (loading()) { <span class="spinner"></span> Signing in… }
                    @else { Sign In }
                </button>
            </form>

            <div class="hint" style="margin-bottom:12px">
                New here? <a routerLink="/signup">Create an account</a>
            </div>
            <div class="hint">
                Default admin: <strong>admin&#64;tourcrm.local</strong> / <strong>Admin&#64;123</strong>
            </div>
        </div>
    </div>
    `
})
export class LoginComponent {
    private fb = inject(FormBuilder);
    private auth = inject(AuthService);
    private router = inject(Router);

    loading = signal(false);
    error = signal<string | null>(null);

    form: FormGroup = this.fb.group({
        email:    ['', [Validators.required, Validators.email]],
        password: ['', Validators.required]
    });

    submit() {
        if (this.form.invalid) return;
        this.error.set(null);
        this.loading.set(true);
        const { email, password } = this.form.value;
        this.auth.login(email, password).subscribe({
            next: () => this.router.navigate(['/dashboard']),
            error: (err) => {
                this.loading.set(false);
                this.error.set(err?.error?.error || 'Login failed');
            }
        });
    }
}
