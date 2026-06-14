// src/app/features/admin/settings.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AgencySettings } from '../../core/models';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="page-header">
        <div>
            <h1>⚙️ Agency Settings</h1>
            <p>Used for quotation defaults, invoice PDFs, and the customer portal header.</p>
        </div>
    </div>

    @if (loading()) {
        <div class="card text-center"><span class="spinner"></span> Loading…</div>
    } @else if (s) {
        <form (ngSubmit)="save()" class="card">
            <h2>Agency Info</h2>
            <div class="form-grid-2">
                <div class="form-group">
                    <label>Agency name <span class="req">*</span></label>
                    <input type="text" [(ngModel)]="s.agency_name" name="agency_name" required>
                </div>
                <div class="form-group">
                    <label>GSTIN</label>
                    <input type="text" [(ngModel)]="s.gstin" name="gstin">
                </div>
                <div class="form-group" style="grid-column: 1 / -1">
                    <label>Address</label>
                    <textarea rows="2" [(ngModel)]="s.address" name="address"></textarea>
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="text" [(ngModel)]="s.phone" name="phone">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" [(ngModel)]="s.email" name="email">
                </div>
                <div class="form-group">
                    <label>Website</label>
                    <input type="text" [(ngModel)]="s.website" name="website">
                </div>
            </div>

            <h2 style="margin-top:24px">Bank Details (printed on invoices)</h2>
            <div class="form-grid-2">
                <div class="form-group">
                    <label>Bank name</label>
                    <input type="text" [(ngModel)]="s.bank_name" name="bank_name">
                </div>
                <div class="form-group">
                    <label>Account no.</label>
                    <input type="text" [(ngModel)]="s.bank_account_no" name="bank_account_no">
                </div>
                <div class="form-group">
                    <label>IFSC</label>
                    <input type="text" [(ngModel)]="s.bank_ifsc" name="bank_ifsc">
                </div>
                <div class="form-group">
                    <label>Branch</label>
                    <input type="text" [(ngModel)]="s.bank_branch" name="bank_branch">
                </div>
            </div>

            <h2 style="margin-top:24px">Quotation Defaults</h2>
            <div class="form-grid-3">
                <div class="form-group">
                    <label>Default markup %</label>
                    <input type="number" [(ngModel)]="s.default_markup_pct" name="default_markup_pct" min="0" max="100" step="0.5">
                </div>
                <div class="form-group">
                    <label>Default GST %</label>
                    <input type="number" [(ngModel)]="s.default_gst_pct" name="default_gst_pct" min="0" max="100" step="0.5">
                </div>
                <div class="form-group">
                    <label>Default booking fee %</label>
                    <input type="number" [(ngModel)]="s.default_booking_fee_pct" name="default_booking_fee_pct" min="0" max="100" step="0.5">
                </div>
                <div class="form-group">
                    <label>Quotation valid for (days)</label>
                    <input type="number" [(ngModel)]="s.default_quotation_valid_days" name="default_quotation_valid_days" min="1" max="365">
                </div>
                <div class="form-group">
                    <label>Invoice prefix</label>
                    <input type="text" [(ngModel)]="s.invoice_prefix" name="invoice_prefix" maxlength="6">
                </div>
            </div>

            <h2 style="margin-top:24px">Cashfree Payment Gateway</h2>
            <div class="form-grid-2">
                <div class="form-group">
                    <label>Cashfree App ID (TEST)</label>
                    <input type="text" [(ngModel)]="s.cashfree_app_id" name="cashfree_app_id" placeholder="TEST...">
                </div>
                <div class="form-group">
                    <label>Cashfree Secret (TEST)</label>
                    <input type="password" [(ngModel)]="s.cashfree_secret_key" name="cashfree_secret_key">
                </div>
                <div class="form-group">
                    <label>Webhook secret</label>
                    <input type="password" [(ngModel)]="s.cashfree_webhook_secret" name="cashfree_webhook_secret">
                </div>
                <div class="form-group">
                    <label>Environment</label>
                    <select [(ngModel)]="s.cashfree_env" name="cashfree_env">
                        <option value="TEST">TEST (sandbox)</option>
                        <option value="PROD">PROD (live)</option>
                    </select>
                </div>
            </div>
            <small class="text-muted">
                Sandbox credentials are in <code>backend/.env</code>. Update there and restart the backend to take effect for the gateway itself;
                the fields above are saved in <code>agency_settings</code> for display.
            </small>

            @if (message()) {
                <div class="info-badge" [style.background]="messageOk() ? '#dcfce7' : '#fee2e2'"
                     [style.color]="messageOk() ? '#166534' : '#991b1b'"
                     style="display:block;margin-top:14px">
                    {{ message() }}
                </div>
            }

            <div class="flex" style="justify-content:flex-end;margin-top:18px">
                <button type="submit" class="btn btn-primary" [disabled]="saving()">
                    @if (saving()) { <span class="spinner"></span> Saving… }
                    @else { 💾 Save Settings }
                </button>
            </div>
        </form>
    }
    `
})
export class SettingsComponent implements OnInit {
    private api = inject(ApiService);
    loading = signal(true);
    saving  = signal(false);
    message = signal<string | null>(null);
    messageOk = signal(true);
    s: AgencySettings | null = null;

    ngOnInit() {
        this.api.getSettings().subscribe({
            next: (s) => { this.s = s; this.loading.set(false); },
            error: () => this.loading.set(false)
        });
    }
    save() {
        if (!this.s) return;
        this.saving.set(true);
        this.message.set(null);
        this.api.updateSettings(this.s).subscribe({
            next: () => {
                this.saving.set(false);
                this.message.set('Settings saved ✓');
                this.messageOk.set(true);
            },
            error: (err) => {
                this.saving.set(false);
                this.message.set(err?.error?.error || 'Failed to save');
                this.messageOk.set(false);
            }
        });
    }
}
