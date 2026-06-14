import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);">
        <div style="width:100%;max-width:400px;padding:24px;">
            <div style="text-align:center;margin-bottom:32px;">
                <div style="font-size:48px;margin-bottom:8px;">✈</div>
                <h1 style="font-size:24px;font-weight:700;">TravelCRM</h1>
                <p style="color:var(--text-muted);margin-top:4px;">Sign in to your account</p>
            </div>

            <div class="card">
                <div class="card-body">
                    <form [formGroup]="form" (ngSubmit)="submit()">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" formControlName="email" placeholder="staff@agency.com" autocomplete="email">
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" formControlName="password" placeholder="••••••••" autocomplete="current-password">
                        </div>
                        @if (error()) {
                            <p style="color:var(--danger);font-size:13px;margin-bottom:12px;">{{ error() }}</p>
                        }
                        <button class="btn-primary" type="submit" style="width:100%;justify-content:center;" [disabled]="loading()">
                            {{ loading() ? 'Signing in…' : 'Sign In' }}
                        </button>
                    </form>
                </div>
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
    error = signal('');

    form = this.fb.group({
        email:    ['', [Validators.required, Validators.email]],
        password: ['', Validators.required]
    });

    submit() {
        if (this.form.invalid) return;
        this.loading.set(true);
        this.error.set('');
        const { email, password } = this.form.value;
        this.auth.login(email!, password!).subscribe({
            next: () => this.router.navigate(['/dashboard']),
            error: (err) => {
                this.loading.set(false);
                this.error.set(err?.error?.error || 'Invalid email or password');
            }
        });
    }
}
