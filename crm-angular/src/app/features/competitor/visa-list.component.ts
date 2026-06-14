import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VisaService } from '../../core/services/competitor-features.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-visa-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <h1>Visa Records</h1>
    <button class="btn" style="margin-bottom:14px;" (click)="showForm.set(!showForm())">{{ showForm() ? 'Cancel' : '+ New Visa Record' }}</button>
    @if (showForm()) {
    <div class="form-panel">
        <label>Visa Type <input type="text" [(ngModel)]="form.visa_type" placeholder="e.g. Tourist, Business" /></label>
        <label>Country <input type="text" [(ngModel)]="form.country" /></label>
        <label>Application Date <input type="date" [(ngModel)]="form.application_date" /></label>
        <label>Issue Date <input type="date" [(ngModel)]="form.issue_date" /></label>
        <label>Expiry Date <input type="date" [(ngModel)]="form.expiry_date" /></label>
        <label>Notes <textarea [(ngModel)]="form.notes" rows="2"></textarea></label>
        <div class="form-actions">
            <button class="btn" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : (editingId() ? 'Update' : 'Create') }}</button>
            <button class="btn ghost" (click)="showForm.set(false)">Cancel</button>
        </div>
    </div>
    }
    <table>
        <thead><tr><th>Traveller</th><th>Type</th><th>Country</th><th>Applied</th><th>Expiry</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
            @for (v of visas(); track v.id) {
                <tr>
                    <td>{{ v.first_name }} {{ v.last_name }}</td>
                    <td>{{ v.visa_type }}</td>
                    <td>{{ v.country }}</td>
                    <td>{{ v.application_date | date:'mediumDate' }}</td>
                    <td>{{ v.expiry_date | date:'mediumDate' }}</td>
                    <td><span class="badge" [class]="v.status">{{ v.status }}</span></td>
                    <td>
                        <button class="btn small" (click)="edit(v)">Edit</button>
                        <button class="btn small warn" (click)="remove(v.id)">Delete</button>
                    </td>
                </tr>
            } @empty { <tr><td colspan="7" class="empty">No visa records.</td></tr> }
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
        .form-panel input, .form-panel textarea { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; }
        .form-actions { display:flex; gap:8px; }
        table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; }
        th, td { padding:10px; text-align:left; border-bottom:1px solid #f3f4f6; font-size:13px; }
        th { background:#f9fafb; color:#6b7280; text-transform:uppercase; font-size:11px; }
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; text-transform:capitalize; }
        .badge.applied { background:#dbeafe; color:#1d4ed8; }
        .badge.approved { background:#dcfce7; color:#166534; }
        .badge.rejected { background:#fee2e2; color:#991b1b; }
        .badge.expired { background:#fef3c7; color:#92400e; }
        .empty { color:#9ca3af; text-align:center; }
    `]
})
export class VisaListComponent implements OnInit {
    private api = inject(VisaService);
    private toast = inject(ToastService);

    visas = signal<any[]>([]);
    showForm = signal(false);
    saving = signal(false);
    editingId = signal<number | null>(null);
    form: any = { visa_type: '', country: '', application_date: '', issue_date: '', expiry_date: '', notes: '' };

    ngOnInit() { this.load(); }
    load() { this.api.list().subscribe(r => this.visas.set(r)); }

    edit(v: any) {
        this.editingId.set(v.id);
        this.form = { ...v };
        this.showForm.set(true);
    }

    save() {
        this.saving.set(true);
        const op = this.editingId() ? this.api.update(this.editingId()!, this.form) : this.api.create(this.form);
        op.subscribe({
            next: () => { this.saving.set(false); this.showForm.set(false); this.editingId.set(null); this.form = { visa_type: '', country: '', application_date: '', issue_date: '', expiry_date: '', notes: '' }; this.load(); this.toast.success('Saved'); },
            error: () => { this.saving.set(false); this.toast.error('Failed'); }
        });
    }

    remove(id: number) {
        if (!confirm('Delete visa record?')) return;
        this.api.delete(id).subscribe(() => { this.load(); this.toast.success('Deleted'); });
    }
}
