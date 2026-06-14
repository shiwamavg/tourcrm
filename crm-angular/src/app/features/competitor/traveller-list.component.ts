import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TravellerService } from '../../core/services/competitor-features.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-traveller-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <h1>Traveller Profiles</h1>
    <button class="btn" style="margin-bottom:14px;" (click)="showForm.set(!showForm())">{{ showForm() ? 'Cancel' : '+ New Traveller' }}</button>
    @if (showForm()) {
    <div class="form-panel">
        <label>First Name <input type="text" [(ngModel)]="form.first_name" /></label>
        <label>Last Name <input type="text" [(ngModel)]="form.last_name" /></label>
        <label>Email <input type="email" [(ngModel)]="form.email" /></label>
        <label>Phone <input type="text" [(ngModel)]="form.phone" /></label>
        <label>Date of Birth <input type="date" [(ngModel)]="form.date_of_birth" /></label>
        <label>Gender
            <select [(ngModel)]="form.gender">
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
            </select>
        </label>
        <label>Passport <input type="text" [(ngModel)]="form.passport_number" /></label>
        <label>Passport Expiry <input type="date" [(ngModel)]="form.passport_expiry" /></label>
        <label>Nationality <input type="text" [(ngModel)]="form.nationality" /></label>
        <label>Emergency Contact <input type="text" [(ngModel)]="form.emergency_contact_name" placeholder="Name" /></label>
        <label>Emergency Phone <input type="text" [(ngModel)]="form.emergency_contact_phone" /></label>
        <label>Medical Notes <textarea [(ngModel)]="form.medical_notes" rows="2"></textarea></label>
        <div class="form-actions">
            <button class="btn" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : (editingId() ? 'Update' : 'Create') }}</button>
            <button class="btn ghost" (click)="showForm.set(false)">Cancel</button>
        </div>
    </div>
    }
    <table>
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Passport</th><th>Nationality</th><th>Actions</th></tr></thead>
        <tbody>
            @for (t of travellers(); track t.id) {
                <tr>
                    <td>{{ t.first_name }} {{ t.last_name }}</td>
                    <td>{{ t.email }}</td>
                    <td>{{ t.phone }}</td>
                    <td>{{ t.passport_number }}</td>
                    <td>{{ t.nationality }}</td>
                    <td>
                        <button class="btn small" (click)="edit(t)">Edit</button>
                        <button class="btn small warn" (click)="remove(t.id)">Delete</button>
                    </td>
                </tr>
            } @empty { <tr><td colspan="6" class="empty">No travellers.</td></tr> }
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
        .empty { color:#9ca3af; text-align:center; }
    `]
})
export class TravellerListComponent implements OnInit {
    private api = inject(TravellerService);
    private toast = inject(ToastService);

    travellers = signal<any[]>([]);
    showForm = signal(false);
    saving = signal(false);
    editingId = signal<number | null>(null);
    form: any = { first_name: '', last_name: '', email: '', phone: '', date_of_birth: '', gender: '', passport_number: '', passport_expiry: '', nationality: '', emergency_contact_name: '', emergency_contact_phone: '', medical_notes: '' };

    ngOnInit() { this.load(); }
    load() { this.api.list().subscribe(r => this.travellers.set(r)); }

    edit(t: any) {
        this.editingId.set(t.id);
        this.form = { ...t };
        this.showForm.set(true);
    }

    save() {
        this.saving.set(true);
        const op = this.editingId() ? this.api.update(this.editingId()!, this.form) : this.api.create(this.form);
        op.subscribe({
            next: () => { this.saving.set(false); this.showForm.set(false); this.editingId.set(null); this.form = { first_name: '', last_name: '', email: '', phone: '', date_of_birth: '', gender: '', passport_number: '', passport_expiry: '', nationality: '', emergency_contact_name: '', emergency_contact_phone: '', medical_notes: '' }; this.load(); this.toast.success('Saved'); },
            error: () => { this.saving.set(false); this.toast.error('Failed'); }
        });
    }

    remove(id: number) {
        if (!confirm('Delete traveller?')) return;
        this.api.delete(id).subscribe(() => { this.load(); this.toast.success('Deleted'); });
    }
}
