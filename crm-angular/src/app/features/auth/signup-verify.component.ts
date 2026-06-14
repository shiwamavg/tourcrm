import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-signup-verify',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    template: `
    <div class="login-wrap">
        <div class="login-card">
            <h1>Verify your email</h1>
            <p class="subtitle">Enter the code sent to <strong>{{ email() || 'your email' }}</strong>.</p>

            <div *ngIf="!email()" class="error-msg">
                Please start signup again if your email is missing.
            </div>

            <form [formGroup]="verifyForm" (ngSubmit)="verifyCode()" *ngIf="email()">
                <div class="form-group">
                    <label>Verification code <span class="req">*</span></label>
                    <input type="text" formControlName="code" placeholder="123456">
                </div>

                @if (verifyError()) {
                    <div class="error-msg">{{ verifyError() }}</div>
                }

                <button type="submit" class="btn btn-primary" [disabled]="verifyLoading() || verifyForm.invalid">
                    @if (verifyLoading()) { <span class="spinner"></span> Verifying… }
                    @else { Verify email }
                </button>
            </form>

            <div class="hint" style="margin-top:16px">
                <button type="button" class="btn btn-secondary" [disabled]="resendLoading()" (click)="resendCode()">
                    @if (resendLoading()) { <span class="spinner"></span> Resending… }
                    @else { Resend code }
                </button>
            </div>

            @if (resendMessage()) {
                <div class="hint" style="margin-top:12px">{{ resendMessage() }}</div>
            }

            @if (devOtp()) {
                <div class="hint">Dev OTP: <strong>{{ devOtp() }}</strong></div>
            }

            <div class="hint" style="margin-top:16px">
                Already verified? <a routerLink="/login">Sign in</a>
            </div>
        </div>
    </div>
    `
})
export class SignupVerifyComponent {
    private fb = inject(FormBuilder);
    private route = inject(ActivatedRoute);
    private auth = inject(AuthService);
    private router = inject(Router);

    verifyLoading = signal(false);
    resendLoading = signal(false);
    resendMessage = signal<string | null>(null);
    verifyError = signal<string | null>(null);
    email = signal(this.route.snapshot.queryParamMap.get('email') ?? '');
    devOtp = signal<string | null>(window.history.state?.devOtp ?? null);

    verifyForm: FormGroup = this.fb.group({
        code: ['', [Validators.required, Validators.minLength(4)]]
    });

    verifyCode() {
        if (this.verifyForm.invalid || !this.email()) return;
        this.verifyLoading.set(true);
        this.verifyError.set(null);
        const code = this.verifyForm.value.code;

        this.auth.verifySignupOtp(this.email(), code).subscribe({
            next: () => {
                this.verifyLoading.set(false);
                this.router.navigate(['/login']);
            },
            error: err => {
                this.verifyLoading.set(false);
                this.verifyError.set(err?.error?.error || 'Verification failed');
            }
        });
    }

    resendCode() {
        if (!this.email()) return;
        this.resendLoading.set(true);
        this.resendMessage.set(null);
        this.auth.resendSignupOtp(this.email()).subscribe({
            next: (resp) => {
                this.resendLoading.set(false);
                this.resendMessage.set(resp.message || 'A new code has been sent.');
                if (resp.dev_otp) {
                    this.devOtp.set(resp.dev_otp);
                }
            },
            error: (err) => {
                this.resendLoading.set(false);
                this.resendMessage.set(err?.error?.error || 'Resend failed');
            }
        });
    }
}
