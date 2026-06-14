import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperAdminApiService } from '../../core/services/super-admin-api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-sa-packages',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <h1>Subscription Packages</h1>
    <button class="btn" style="margin-bottom:14px;" (click)="openNew()">+ New Package</button>

    @if (showForm()) {
    <div class="form-panel">
        <h3>{{ editingId() ? 'Edit Package' : 'New Package' }}</h3>
        <label>Name <input type="text" [(ngModel)]="form.name" /></label>
        <label>Price (INR) <input type="number" [(ngModel)]="form.price_inr" /></label>
        <label>Billing Cycle
            <select [(ngModel)]="form.billing_cycle">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
                <option value="lifetime">Lifetime</option>
            </select>
        </label>
        <label>Max Users <input type="number" [(ngModel)]="form.max_users" /></label>
        <label>Max Leads <input type="number" [(ngModel)]="form.max_leads" /></label>
        <label>Max Quotations <input type="number" [(ngModel)]="form.max_quotations" /></label>
        <label>Max Bookings <input type="number" [(ngModel)]="form.max_bookings" /></label>
        <label>Storage (GB) <input type="number" [(ngModel)]="form.storage_gb" /></label>
        <label style="flex-direction:row;align-items:center;gap:6px;">
            <input type="checkbox" [(ngModel)]="form.supports_whatsapp" /> Supports WhatsApp
        </label>
        <label style="flex-direction:row;align-items:center;gap:6px;">
            <input type="checkbox" [(ngModel)]="form.supports_api" /> Supports API
        </label>
        <label style="flex-direction:row;align-items:center;gap:6px;">
            <input type="checkbox" [(ngModel)]="form.supports_portal" /> Supports Customer Portal
        </label>
        <label style="flex-direction:row;align-items:center;gap:6px;">
            <input type="checkbox" [(ngModel)]="form.is_public" /> Publicly available
        </label>
        <label>Description <textarea [(ngModel)]="form.description" rows="2"></textarea></label>
        <div class="form-actions">
            <button class="btn" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            <button class="btn ghost" (click)="showForm.set(false)">Cancel</button>
        </div>
    </div>
    }

    <div class="grid">
        @for (p of packages(); track p.id) {
            <div class="package-card">
                <div class="header">
                    <div class="name">{{ p.name }}</div>
                    <div class="price">₹{{ p.price_inr | number }} <span>/ {{ p.billing_cycle }}</span></div>
                </div>
                <div class="limits">
                    <div><b>{{ p.max_users }}</b> users</div>
                    <div><b>{{ p.max_leads | number }}</b> leads</div>
                    <div><b>{{ p.max_quotations | number }}</b> quotations</div>
                    <div><b>{{ p.max_bookings | number }}</b> bookings</div>
                    <div><b>{{ p.storage_gb }}</b> GB storage</div>
                </div>
                <div class="features">
                    @if (p.supports_whatsapp) { <span class="tag">WhatsApp</span> }
                    @if (p.supports_api) { <span class="tag">API</span> }
                    @if (p.supports_portal) { <span class="tag">Portal</span> }
                    @if (p.is_public) { <span class="tag">Public</span> }
                </div>
                <div class="actions">
                    <button class="btn small" (click)="edit(p)">Edit</button>
                </div>
            </div>
        } @empty {
            <div class="empty">No packages.</div>
        }
    </div>
    `,
    styles: [`
        h1 { margin:0 0 14px; font-size:1.3rem; }
        .btn { padding:8px 12px; border:none; border-radius:6px; background:#0f766e; color:#fff; cursor:pointer; font-size:13px; }
        .btn.ghost { background:#f3f4f6; color:#374151; }
        .btn.small { padding:4px 8px; font-size:12px; }
        .form-panel { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:14px; margin-bottom:14px; max-width:540px; }
        .form-panel label { display:flex; flex-direction:column; gap:4px; margin-bottom:10px; font-size:12px; color:#374151; }
        .form-panel input, .form-panel select, .form-panel textarea { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; }
        .form-actions { display:flex; gap:8px; }
        .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:14px; }
        .package-card { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:14px; }
        .header { border-bottom:1px solid #f3f4f6; padding-bottom:10px; margin-bottom:10px; }
        .name { font-weight:700; font-size:1rem; }
        .price { font-size:1.3rem; font-weight:700; color:#0f766e; margin-top:4px; }
        .price span { font-size:12px; color:#6b7280; font-weight:400; }
        .limits { display:grid; grid-template-columns: 1fr 1fr; gap:6px; font-size:12px; color:#374151; margin-bottom:10px; }
        .features { display:flex; gap:6px; margin-bottom:10px; }
        .tag { font-size:11px; padding:2px 8px; border-radius:999px; background:#e0f2fe; color:#0369a1; }
        .actions { border-top:1px solid #f3f4f6; padding-top:10px; }
        .empty { color:#9ca3af; }
    `]
})
export class SaPackagesComponent implements OnInit {
    private api = inject(SuperAdminApiService);
    private toast = inject(ToastService);

    packages = signal<any[]>([]);
    showForm = signal(false);
    saving = signal(false);
    editingId = signal<number | null>(null);

    form: any = { name: '', price_inr: 0, billing_cycle: 'monthly', max_users: 5, max_leads: 1000, max_quotations: 500, max_bookings: 100, storage_gb: 10, supports_whatsapp: false, supports_api: false, supports_portal: false, is_public: true, description: '' };

    ngOnInit() { this.load(); }

    load() {
        this.api.listPackages().subscribe(p => this.packages.set(p));
    }

    openNew() {
        this.editingId.set(null);
        this.form = { name: '', price_inr: 0, billing_cycle: 'monthly', max_users: 5, max_leads: 1000, max_quotations: 500, max_bookings: 100, storage_gb: 10, supports_whatsapp: false, supports_api: false, supports_portal: false, is_public: true, description: '' };
        this.showForm.set(true);
    }

    edit(p: any) {
        this.editingId.set(p.id);
        this.form = { ...p };
        this.showForm.set(true);
    }

    save() {
        this.saving.set(true);
        if (this.editingId()) {
            this.api.updatePackage(this.editingId()!, this.form).subscribe({
                next: () => { this.saving.set(false); this.showForm.set(false); this.load(); this.toast.success('Package updated'); },
                error: () => { this.saving.set(false); this.toast.error('Update failed'); }
            });
        } else {
            this.api.createPackage(this.form).subscribe({
                next: () => { this.saving.set(false); this.showForm.set(false); this.load(); this.toast.success('Package created'); },
                error: () => { this.saving.set(false); this.toast.error('Creation failed'); }
            });
        }
    }
}
