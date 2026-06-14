// src/app/features/admin/billing/billing.component.ts
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-billing',
    standalone: true,
    imports: [CommonModule, FormsModule, DatePipe, CurrencyPipe],
    template: `
    <div class="page-header">
        <div>
            <h1>💳 Billing & Subscription</h1>
            <p>Manage your SaaS subscription plan, usage quotas, and download invoices.</p>
        </div>
    </div>

    @if (loading()) {
        <div class="card text-center" style="padding: 48px;"><span class="spinner"></span> Loading Billing Details…</div>
    } @else {
        <div class="billing-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            
            <!-- Left Side: Subscription Overview & Upgrades -->
            <div class="billing-left" style="display: flex; flex-direction: column; gap: 24px;">
                
                <!-- Current Subscription Status -->
                <div class="card current-plan-card" style="position: relative; overflow: hidden; background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); color: #fff;">
                    <div style="position: absolute; right: -20px; top: -20px; font-size: 120px; opacity: 0.1; font-weight: 800; user-select: none;">★</div>
                    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.8; margin-bottom: 6px;">Your Subscription Plan</div>
                    <h2 style="margin: 0 0 12px; border: none; padding: 0; color: #fff; font-size: 2rem;">
                        {{ planData()?.company?.package_name || 'Free Trial' }}
                    </h2>
                    
                    <div class="plan-meta" style="margin-bottom: 20px;">
                        <span class="badge" [class]="'badge-' + planData()?.company?.subscription_status" style="font-weight: 700; padding: 4px 10px; border-radius: 12px; font-size: 12px; background: rgba(255,255,255,0.2); color: #fff;">
                            {{ planData()?.company?.subscription_status | uppercase }}
                        </span>
                        @if (planData()?.company?.subscription_status === 'trial') {
                            <span style="margin-left: 12px; font-size: 14px;">
                                Trial ends in <strong>{{ trialDaysRemaining() }} days</strong> ({{ planData()?.company?.trial_ends_at | date:'mediumDate' }})
                            </span>
                        } @else {
                            <span style="margin-left: 12px; font-size: 14px;">
                                Renews on <strong>{{ planData()?.company?.subscription_end_date | date:'mediumDate' }}</strong>
                            </span>
                        }
                    </div>

                    <div class="features-summary" style="border-top: 1px solid rgba(255,255,255,0.15); padding-top: 16px;">
                        <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">Included Features:</div>
                        <div class="feature-tags-container" style="display: flex; flex-wrap: wrap; gap: 6px;">
                            @for (f of planData()?.company?.features; track f) {
                                <span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: rgba(255,255,255,0.15);">
                                    ✓ {{ f }}
                                </span>
                            }
                        </div>
                    </div>
                </div>

                <!-- Self-Serve Plan Upgrade/Downgrade -->
                <div class="card">
                    <h2 style="margin-top: 0;">Change Subscription Plan</h2>
                    <p class="text-muted" style="margin-bottom: 20px; font-size: 14px;">Select from our standard plans below to change or renew your subscription.</p>
                    
                    <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                        <button class="btn" [class.btn-primary]="billingCycle() === 'monthly'" (click)="billingCycle.set('monthly')">Monthly Billing</button>
                        <button class="btn" [class.btn-primary]="billingCycle() === 'yearly'" (click)="billingCycle.set('yearly')">Annual Billing (Save 20%)</button>
                    </div>

                    <div class="packages-list" style="display: flex; flex-direction: column; gap: 12px;">
                        @for (pkg of availablePackages(); track pkg.id) {
                            <div class="package-option-row" [class.selected]="selectedPackageId() === pkg.id" (click)="selectedPackageId.set(pkg.id)" style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center;" [style.border-color]="selectedPackageId() === pkg.id ? '#0f766e' : '#e5e7eb'" [style.background]="selectedPackageId() === pkg.id ? '#f0fdfa' : '#fff'">
                                <div>
                                    <strong style="font-size: 15px; color: #111827;">{{ pkg.name }}</strong>
                                    <p class="text-muted" style="margin: 4px 0 0; font-size: 12px;">{{ pkg.description }}</p>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 16px; font-weight: 700; color: #111827;">
                                        {{ (billingCycle() === 'monthly' ? pkg.price_monthly : pkg.price_yearly) | currency:'INR':'symbol':'1.0-0' }}
                                    </div>
                                    <div class="text-muted" style="font-size: 11px;">
                                        / {{ billingCycle() === 'monthly' ? 'month' : 'year' }}
                                    </div>
                                </div>
                            </div>
                        }
                    </div>

                    <div style="margin-top: 24px; display: flex; justify-content: flex-end;">
                        <button class="btn btn-success" (click)="confirmUpgrade()" [disabled]="upgrading() || !selectedPackageId()">
                            @if (upgrading()) { <span class="spinner"></span> Processing Upgrade... }
                            @else { Confirm Plan Selection }
                        </button>
                    </div>
                </div>

            </div>

            <!-- Right Side: Usage Quota & Billing History -->
            <div class="billing-right" style="display: flex; flex-direction: column; gap: 24px;">
                
                <!-- Usage Meter / Resource Quotas -->
                <div class="card">
                    <h2 style="margin-top: 0;">Resource Utilization</h2>
                    <p class="text-muted" style="margin-bottom: 20px; font-size: 14px;">Current usage relative to your subscription tier maximums.</p>

                    <div class="quota-meters" style="display: flex; flex-direction: column; gap: 16px;">
                        <!-- Users Quota -->
                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
                                <span><strong>Staff Users</strong></span>
                                <span class="text-muted">{{ planData()?.usage?.users }} / {{ planData()?.company?.max_users }} active</span>
                            </div>
                            <div class="progress-bar-bg" style="height: 8px; border-radius: 4px; background: #e5e7eb; overflow: hidden;">
                                <div class="progress-bar-fill" [style.width.%]="getPercent(planData()?.usage?.users, planData()?.company?.max_users)" [style.background]="getPercent(planData()?.usage?.users, planData()?.company?.max_users) > 90 ? '#ef4444' : '#0f766e'" style="height: 100%; transition: width 0.3s;"></div>
                            </div>
                        </div>

                        <!-- Leads Quota -->
                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
                                <span><strong>Sales Leads</strong></span>
                                <span class="text-muted">{{ planData()?.usage?.leads }} / {{ planData()?.company?.max_leads }} logged</span>
                            </div>
                            <div class="progress-bar-bg" style="height: 8px; border-radius: 4px; background: #e5e7eb; overflow: hidden;">
                                <div class="progress-bar-fill" [style.width.%]="getPercent(planData()?.usage?.leads, planData()?.company?.max_leads)" [style.background]="getPercent(planData()?.usage?.leads, planData()?.company?.max_leads) > 90 ? '#ef4444' : '#0f766e'" style="height: 100%; transition: width 0.3s;"></div>
                            </div>
                        </div>

                        <!-- Quotations Quota -->
                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
                                <span><strong>Quotations Generated</strong></span>
                                <span class="text-muted">{{ planData()?.usage?.quotations }} / {{ planData()?.company?.max_quotations }} limit</span>
                            </div>
                            <div class="progress-bar-bg" style="height: 8px; border-radius: 4px; background: #e5e7eb; overflow: hidden;">
                                <div class="progress-bar-fill" [style.width.%]="getPercent(planData()?.usage?.quotations, planData()?.company?.max_quotations)" [style.background]="getPercent(planData()?.usage?.quotations, planData()?.company?.max_quotations) > 90 ? '#ef4444' : '#0f766e'" style="height: 100%; transition: width 0.3s;"></div>
                            </div>
                        </div>

                        <!-- Bookings Quota -->
                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
                                <span><strong>Trip Bookings</strong></span>
                                <span class="text-muted">{{ planData()?.usage?.bookings }} / {{ planData()?.company?.max_bookings }} bookings</span>
                            </div>
                            <div class="progress-bar-bg" style="height: 8px; border-radius: 4px; background: #e5e7eb; overflow: hidden;">
                                <div class="progress-bar-fill" [style.width.%]="getPercent(planData()?.usage?.bookings, planData()?.company?.max_bookings)" [style.background]="getPercent(planData()?.usage?.bookings, planData()?.company?.max_bookings) > 90 ? '#ef4444' : '#0f766e'" style="height: 100%; transition: width 0.3s;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Billing Invoice History -->
                <div class="card">
                    <h2 style="margin-top: 0;">Billing & Invoices</h2>
                    <p class="text-muted" style="margin-bottom: 20px; font-size: 14px;">History of invoices billed by the platform to your agency.</p>

                    @if (invoices().length === 0) {
                        <p class="text-muted" style="font-size: 13px;">No platform invoices generated yet.</p>
                    } @else {
                        <div class="table-wrap" style="box-shadow: none; border: 1px solid #e5e7eb;">
                            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                <thead>
                                    <tr style="border-bottom: 1px solid #e5e7eb;">
                                        <th style="padding: 10px; text-align: left;">Invoice #</th>
                                        <th style="padding: 10px; text-align: left;">Billed Date</th>
                                        <th style="padding: 10px; text-align: right;">Total Amount</th>
                                        <th style="padding: 10px; text-align: left;">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @for (inv of invoices(); track inv.id) {
                                        <tr style="border-bottom: 1px solid #e5e7eb;">
                                            <td style="padding: 10px; font-weight: 600;">{{ inv.invoice_number }}</td>
                                            <td style="padding: 10px;">{{ inv.created_at | date:'mediumDate' }}</td>
                                            <td style="padding: 10px; text-align: right; font-weight: 600;">{{ inv.total_amount | currency:'INR':'symbol':'1.0-0' }}</td>
                                            <td style="padding: 10px;">
                                                <span class="badge" [class]="'badge-' + (inv.status === 'paid' ? 'accepted' : 'draft')" style="font-size: 11px;">
                                                    {{ inv.status | uppercase }}
                                                </span>
                                            </td>
                                        </tr>
                                    }
                                </tbody>
                            </table>
                        </div>
                    }
                </div>

            </div>

        </div>
    }
    `
})
export class BillingComponent implements OnInit {
    private api = inject(ApiService);
    private auth = inject(AuthService);
    private toast = inject(ToastService);

    loading = signal(true);
    upgrading = signal(false);
    planData = signal<any | null>(null);
    invoices = signal<any[]>([]);
    availablePackages = signal<any[]>([]);
    
    billingCycle = signal<'monthly' | 'yearly'>('monthly');
    selectedPackageId = signal<number | null>(null);

    trialDaysRemaining = computed(() => {
        const dateStr = this.planData()?.company?.trial_ends_at;
        if (!dateStr) return 0;
        const diff = new Date(dateStr).getTime() - Date.now();
        return Math.max(0, Math.ceil(diff / (86400000)));
    });

    ngOnInit() {
        this.reload();
    }

    reload() {
        this.loading.set(true);
        let done = 0;
        const total = 3;
        const check = () => { if (++done >= total) this.loading.set(false); };

        this.api.getBillingPlan().subscribe({
            next: p => {
                this.planData.set(p);
                this.selectedPackageId.set(p?.company?.subscription_package_id || null);
                check();
            },
            error: () => check()
        });

        this.api.getBillingInvoices().subscribe({
            next: invs => { this.invoices.set(invs || []); check(); },
            error: () => check()
        });

        this.auth.listPublicPackages().subscribe({
            next: pkgs => { this.availablePackages.set(pkgs || []); check(); },
            error: () => check()
        });
    }

    getPercent(curr: number | undefined, max: number | undefined): number {
        if (!curr || !max) return 0;
        return Math.min(100, Math.round((curr / max) * 100));
    }

    confirmUpgrade() {
        const pkgId = this.selectedPackageId();
        if (!pkgId) return;
        this.upgrading.set(true);
        this.api.upgradeBillingPlan(pkgId, this.billingCycle()).subscribe({
            next: () => {
                this.upgrading.set(false);
                this.toast.success('Subscription plan successfully changed!');
                this.reload();
            },
            error: err => {
                this.upgrading.set(false);
                this.toast.error(err?.error?.error || 'Plan upgrade failed');
            }
        });
    }
}
