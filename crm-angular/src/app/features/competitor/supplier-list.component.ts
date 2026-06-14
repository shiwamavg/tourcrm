import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupplierService } from '../../core/services/competitor-features.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-supplier-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <h1>Suppliers</h1>
    <button class="btn" style="margin-bottom:14px;" (click)="showForm.set(!showForm())">{{ showForm() ? 'Cancel' : '+ New Supplier' }}</button>
    @if (showForm()) {
    <div class="form-panel">
        <label>Name <input type="text" [(ngModel)]="form.name" /></label>
        <label>Type
            <select [(ngModel)]="form.type">
                <option value="hotel">Hotel</option>
                <option value="transport">Transport</option>
                <option value="restaurant">Restaurant</option>
                <option value="activity">Activity</option>
                <option value="guide">Guide</option>
                <option value="other">Other</option>
            </select>
        </label>
        <label>Contact Name <input type="text" [(ngModel)]="form.contact_name" /></label>
        <label>Email <input type="email" [(ngModel)]="form.contact_email" /></label>
        <label>Phone <input type="text" [(ngModel)]="form.contact_phone" /></label>
        <label>City <input type="text" [(ngModel)]="form.city" /></label>
        <label>Country <input type="text" [(ngModel)]="form.country" /></label>
        <label>Commission % <input type="number" [(ngModel)]="form.commission_percent" /></label>
        <label>Notes <textarea [(ngModel)]="form.notes" rows="2"></textarea></label>
        <div class="form-actions">
            <button class="btn" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : (editingId() ? 'Update' : 'Create') }}</button>
            <button class="btn ghost" (click)="showForm.set(false)">Cancel</button>
        </div>
    </div>
    }
    <table>
        <thead><tr><th>Name</th><th>Type</th><th>Contact</th><th>City</th><th>Commission</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
            @for (s of suppliers(); track s.id) {
                <tr>
                    <td>{{ s.name }}</td>
                    <td>{{ s.type }}</td>
                    <td>{{ s.contact_email }}<br>{{ s.contact_phone }}</td>
                    <td>{{ s.city }}, {{ s.country }}</td>
                    <td>{{ s.commission_percent }}%</td>
                    <td><span class="badge" [class]="s.status">{{ s.status }}</span></td>
                    <td>
                        <button class="btn small" (click)="edit(s)">Edit</button>
                        <button class="btn small warn" (click)="remove(s.id)">Delete</button>
                    </td>
                </tr>
            } @empty { <tr><td colspan="7" class="empty">No suppliers.</td></tr> }
        </tbody>
    </table>
    `,
    styles: [`
        h1 { margin:0 0 14px; font-size:1.3rem; }
        .btn { padding:8px 12px; border:none; border-radius:6px; background:#0f766e; color:#fff; cursor:pointer; font-size:13px; }
        .btn.ghost { background:#f3f4f6; color:#374151; }
        .btn.small { padding:4px 8px; font-size:12px; }
        .btn.warn { background:#b91c1c; }
        .form-panel { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:14px; margin-bottom:14px; max-width:540px; }
        .form-panel label { display:flex; flex-direction:column; gap:4px; margin-bottom:10px; font-size:12px; color:#374151; }
        .form-panel input, .form-panel select, .form-panel textarea { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; }
        .form-actions { display:flex; gap:8px; }
        table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; }
        th, td { padding:10px; text-align:left; border-bottom:1px solid #f3f4f6; font-size:13px; }
        th { background:#f9fafb; color:#6b7280; text-transform:uppercase; font-size:11px; }
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; text-transform:capitalize; }
        .badge.active { background:#dcfce7; color:#166534; }
        .badge.inactive { background:#f3f4f6; color:#6b7280; }
        .empty { color:#9ca3af; text-align:center; }
    `]
})
export class SupplierListComponent implements OnInit {
    private api = inject(SupplierService);
    private toast = inject(ToastService);

    suppliers = signal<any[]>([]);
    showForm = signal(false);
    saving = signal(false);
    editingId = signal<number | null>(null);
    form: any = { name: '', type: 'hotel', contact_name: '', contact_email: '', contact_phone: '', city: '', country: '', commission_percent: 0, notes: '' };

    ngOnInit() { this.load(); }
    load() { this.api.list().subscribe(r => this.suppliers.set(r)); }

    edit(s: any) {
        this.editingId.set(s.id);
        this.form = { ...s };
        this.showForm.set(true);
    }

    save() {
        this.saving.set(true);
        const op = this.editingId() ? this.api.update(this.editingId()!, this.form) : this.api.create(this.form);
        op.subscribe({
            next: () => { this.saving.set(false); this.showForm.set(false); this.editingId.set(null); this.form = { name: '', type: 'hotel', contact_name: '', contact_email: '', contact_phone: '', city: '', country: '', commission_percent: 0, notes: '' }; this.load(); this.toast.success('Saved'); },
            error: () => { this.saving.set(false); this.toast.error('Failed'); }
        });
    }

    remove(id: number) {
        if (!confirm('Delete supplier?')) return;
        this.api.delete(id).subscribe(() => { this.load(); this.toast.success('Deleted'); });
    }
}
