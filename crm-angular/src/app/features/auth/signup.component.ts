import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-signup',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    template: `
    <div class="login-wrap">
        <div class="login-card">
            <h1>Start your agency</h1>
            <p class="subtitle">Create a new SaaS account and begin your free trial</p>

            <form [formGroup]="form" (ngSubmit)="submit()" *ngIf="!signedUp()">
                <div class="form-group">
                    <label>Agency name <span class="req">*</span></label>
                    <input type="text" formControlName="company_name" placeholder="Your agency name">
                </div>
                <div class="form-group">
                    <label>Admin name <span class="req">*</span></label>
                    <input type="text" formControlName="contact_name" placeholder="Your full name">
                </div>
                <div class="form-group">
                    <label>Admin email <span class="req">*</span></label>
                    <input type="email" formControlName="contact_email" placeholder="you@agency.com">
                </div>
                <div class="form-group">
                    <label>Contact phone</label>
                    <input type="tel" formControlName="contact_phone" placeholder="+91 98765 43210">
                </div>
                <div class="form-group">
                    <label>Website</label>
                    <input type="url" formControlName="website" placeholder="https://example.com">
                </div>
                <div class="form-group">
                    <label>Password <span class="req">*</span></label>
                    <input type="password" formControlName="password" placeholder="Strong password">
                </div>
                <div class="form-group" *ngIf="packages().length > 0">
                    <label>Choose a package</label>
                    <select formControlName="package_id" (change)="onPackageChange($any($event.target).value)">
                        <option *ngFor="let pkg of packages()" [value]="pkg.id">
                            {{ pkg.name }} — {{ pkg.price_monthly | currency:'INR':'symbol':'1.0-0' }} / month
                        </option>
                    </select>
                    <div class="package-help" *ngIf="selectedPackage()">
                        <strong>{{ selectedPackage()?.name }}</strong>
                        <p>{{ selectedPackage()?.description || selectedPackage()?.name }}.</p>
                        <p>
                            Users: {{ selectedPackage()?.max_users || '—' }},
                            Leads: {{ selectedPackage()?.max_leads || '—' }},
                            Quotations: {{ selectedPackage()?.max_quotations || '—' }},
                            Bookings: {{ selectedPackage()?.max_bookings || '—' }}
                        </p>
                    </div>
                </div>

                @if (error()) {
                    <div class="error-msg">{{ error() }}</div>
                }

                <button type="submit" class="btn btn-primary" [disabled]="loading() || form.invalid">
                    @if (loading()) { <span class="spinner"></span> Signing up… }
                    @else { Start free trial }
                </button>
            </form>

            <div *ngIf="signedUp()">
                <div class="success-msg">
                    Signup complete. We sent a verification code to <strong>{{ email() }}</strong>.
                    Please enter the code to verify your email.
                </div>

                <form [formGroup]="verifyForm" (ngSubmit)="verifyCode()">
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

                @if (devOtp()) {
                    <div class="hint">Dev OTP: <strong>{{ devOtp() }}</strong></div>
                }
            </div>

            <div class="hint" style="margin-top:16px">
                Already have an account? <a routerLink="/login">Sign in</a>
            </div>
        </div>
    </div>
    `
})
export class SignupComponent {
    private fb = inject(FormBuilder);
    private auth = inject(AuthService);
    private router = inject(Router);

    loading = signal(false);
    error = signal<string | null>(null);
    verifyLoading = signal(false);
    verifyError = signal<string | null>(null);
    signedUp = signal(false);
    email = signal('');
    devOtp = signal('');
    packages = signal<any[]>([]);
    selectedPackage = signal<any | null>(null);

    form: FormGroup = this.fb.group({
        company_name: ['', Validators.required],
        contact_name: ['', Validators.required],
        contact_email: ['', [Validators.required, Validators.email]],
        contact_phone: [''],
        website: [''],
        password: ['', [Validators.required, Validators.minLength(8)]],
        package_id: ['']
    });

    verifyForm: FormGroup = this.fb.group({
        code: ['', [Validators.required, Validators.minLength(4)]]
    });

    constructor() {
        this.loadPackages();
    }

    loadPackages() {
        this.auth.listPublicPackages().subscribe({
            next: pkgs => {
                this.packages.set(pkgs || []);
                const first = pkgs?.[0] || null;
                this.selectedPackage.set(first);
                if (first) {
                    this.form.patchValue({ package_id: first.id });
                }
            },
            error: () => {
                this.packages.set([]);
                this.selectedPackage.set(null);
            }
        });
    }

    submit() {
        if (this.form.invalid) return;
        this.loading.set(true);
        this.error.set(null);
        const body = this.form.value;
        this.auth.signup(body).subscribe({
            next: resp => {
                this.loading.set(false);
                this.signedUp.set(true);
                this.email.set(body.contact_email);
                this.devOtp.set(resp?.dev_otp || '');
                this.router.navigate(['/signup/verify'], {
                    queryParams: { email: body.contact_email },
                    state: { devOtp: resp?.dev_otp }
                });
            },
            error: err => {
                this.loading.set(false);
                this.error.set(err?.error?.error || 'Signup failed');
            }
        });
    }

    verifyCode() {
        if (this.verifyForm.invalid) return;
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

    onPackageChange(packageId: string) {
        const pkg = this.packages().find(p => String(p.id) === String(packageId)) || null;
        this.selectedPackage.set(pkg);
    }
}
