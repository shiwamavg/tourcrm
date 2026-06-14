import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReminderService } from '../../core/services/competitor-features.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-reminder-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <h1>Follow-ups & Reminders</h1>

    <div class="toolbar">
        <input type="text" placeholder="Search title\u2026" [(ngModel)]="search" (input)="load()" class="grow" />
        <select [(ngModel)]="filterStatus" (change)="load()">
            <option value="">All status</option>
            <option value="pending">Pending</option>
            <option value="pending_overdue">Overdue</option>
            <option value="dismissed">Dismissed</option>
            <option value="sent">Sent</option>
        </select>
        <select [(ngModel)]="filterPriority" (change)="load()">
            <option value="">All priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
        </select>
        <select [(ngModel)]="filterToday" (change)="load()">
            <option value="">All dates</option>
            <option value="1">Today only</option>
        </select>
        <button class="btn" (click)="showForm.set(!showForm())">{{ showForm() ? 'Cancel' : '+ New Follow-up' }}</button>
    </div>

    @if (showForm() || editingId()) {
    <div class="form-panel">
        <h3>{{ editingId() ? 'Edit Follow-up' : 'New Follow-up' }}</h3>
        <label>Title <input type="text" [(ngModel)]="form.title" /></label>
        <label>Description <textarea [(ngModel)]="form.description" rows="2"></textarea></label>
        <div class="form-grid-2">
            <label>Remind At <input type="datetime-local" [(ngModel)]="form.remind_at" /></label>
            <label>Priority
                <select [(ngModel)]="form.priority">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                </select>
            </label>
            <label>Type
                <select [(ngModel)]="form.followup_type">
                    <option value="call">Call</option>
                    <option value="meeting">Meeting</option>
                    <option value="email">Email</option>
                    <option value="site_visit">Site Visit</option>
                    <option value="document">Document Follow-up</option>
                    <option value="payment">Payment Follow-up</option>
                    <option value="general">General</option>
                </select>
            </label>
            <label>Channel
                <select [(ngModel)]="form.channel">
                    <option value="in_app">In App</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                </select>
            </label>
            <label>Assign To
                <select [(ngModel)]="form.assigned_to">
                    <option [ngValue]="null">Self (default)</option>
                    @for (u of users(); track u.id) {
                        <option [ngValue]="u.id">{{ u.full_name }}</option>
                    }
                </select>
            </label>
            <label>Linked Entity
                <select [(ngModel)]="form.entity_type">
                    <option value="general">General</option>
                    <option value="lead">Lead</option>
                    <option value="quotation">Quotation</option>
                    <option value="booking">Booking</option>
                    <option value="task">Task</option>
                </select>
            </label>
        </div>
        <div class="form-actions">
            <button class="btn" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving\u2026' : (editingId() ? 'Update' : 'Create') }}</button>
            <button class="btn ghost" (click)="cancelForm()">Cancel</button>
        </div>
    </div>
    }

    <table>
        <thead><tr><th>Title</th><th>Remind At</th><th>Priority</th><th>Type</th><th>Channel</th><th>Assigned</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
            @for (r of reminders(); track r.id) {
                <tr [class.overdue]="isOverdue(r)">
                    <td>
                        <strong>{{ r.title }}</strong>
                        @if (r.description) { <br><small class="text-muted">{{ r.description }}</small> }
                    </td>
                    <td>{{ r.remind_at | date:'medium' }}</td>
                    <td><span class="badge" [class]="'badge-prio-' + r.priority">{{ r.priority }}</span></td>
                    <td>{{ r.followup_type }}</td>
                    <td>{{ r.channel }}</td>
                    <td>{{ r.assigned_name || '\u2014' }}</td>
                    <td>
                        <span class="badge" [class]="'badge-' + r.status">{{ r.status }}</span>
                        @if (isOverdue(r)) { <br><small style="color:#b91c1c">OVERDUE</small> }
                    </td>
                    <td>
                        @if (r.status === 'pending') {
                            <button class="btn small" (click)="dismiss(r.id)">\u2713 Done</button>
                        }
                        <button class="btn small" (click)="edit(r)">Edit</button>
                        <button class="btn small warn" (click)="remove(r.id)">Delete</button>
                    </td>
                </tr>
            } @empty { <tr><td colspan="8" class="empty">No reminders.</td></tr> }
        </tbody>
    </table>
    `,
    styles: [`
        h1 { margin:0 0 14px; font-size:1.3rem; }
        .toolbar { display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap; align-items:center; }
        .toolbar input.grow { flex:1; min-width:160px; padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; }
        .toolbar select { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; background:#fff; }
        .btn { padding:8px 12px; border:none; border-radius:6px; background:#0f766e; color:#fff; cursor:pointer; font-size:13px; }
        .btn.ghost { background:#f3f4f6; color:#374151; }
        .btn.small { padding:4px 8px; font-size:12px; }
        .btn.warn { background:#b91c1c; }
        .form-panel { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:14px; margin-bottom:14px; max-width:600px; }
        .form-panel label { display:flex; flex-direction:column; gap:4px; margin-bottom:10px; font-size:12px; color:#374151; }
        .form-panel input, .form-panel select, .form-panel textarea { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; }
        .form-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .form-actions { display:flex; gap:8px; }
        table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; }
        th, td { padding:10px; text-align:left; border-bottom:1px solid #f3f4f6; font-size:13px; }
        th { background:#f9fafb; color:#6b7280; text-transform:uppercase; font-size:11px; }
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; text-transform:capitalize; }
        .badge.pending { background:#fef3c7; color:#92400e; }
        .badge.sent { background:#dcfce7; color:#166534; }
        .badge.failed { background:#fee2e2; color:#991b1b; }
        .badge.dismissed { background:#e5e7eb; color:#374151; }
        .text-muted { color:#9ca3af; font-size:12px; }
        .empty { color:#9ca3af; text-align:center; padding:20px; }
        tr.overdue td { background:#fef2f2; }
    `]
})
export class ReminderListComponent implements OnInit {
    private api = inject(ReminderService);
    private mainApi = inject(ApiService);
    private toast = inject(ToastService);

    reminders = signal<any[]>([]);
    users = signal<any[]>([]);
    showForm = signal(false);
    saving = signal(false);
    editingId = signal<number | null>(null);
    search = signal('');
    filterStatus = signal('');
    filterPriority = signal('');
    filterToday = signal('');

    form: any = { title: '', description: '', remind_at: '', priority: 'medium', followup_type: 'general', channel: 'in_app', assigned_to: null, entity_type: 'general' };

    ngOnInit() {
        this.load();
        this.mainApi.listUsers({ limit: 100 }).subscribe({
            next: r => this.users.set(r.items || []),
            error: () => {}
        });
    }

    isOverdue(r: any): boolean {
        return r.status === 'pending' && r.remind_at && new Date(r.remind_at) < new Date();
    }

    load() {
        const params = new URLSearchParams();
        if (this.filterStatus()) params.set('status', this.filterStatus());
        if (this.filterPriority()) params.set('priority', this.filterPriority());
        if (this.filterToday() === '1') params.set('today', '1');
        const url = `http://localhost:3000/api/reminders${params.toString() ? '?' + params.toString() : ''}`;
        fetch(url, { headers: { Authorization: 'Bearer ' + (localStorage.getItem('crm_token') || '') } })
            .then(r => r.json())
            .then(data => {
                const q = this.search()?.toLowerCase();
                if (q) data = data.filter((x: any) => (x.title || '').toLowerCase().includes(q));
                this.reminders.set(data);
            })
            .catch(() => {});
    }

    cancelForm() {
        this.showForm.set(false);
        this.editingId.set(null);
        this.form = { title: '', description: '', remind_at: '', priority: 'medium', followup_type: 'general', channel: 'in_app', assigned_to: null, entity_type: 'general' };
    }

    edit(item: any) {
        this.form = { ...item };
        if (this.form.remind_at) this.form.remind_at = this.form.remind_at.substring(0, 16);
        this.editingId.set(item.id);
        this.showForm.set(true);
    }

    save() {
        this.saving.set(true);
        const obs = this.editingId()
            ? this.api.update(this.editingId()!, this.form)
            : this.api.create(this.form);
        obs.subscribe({
            next: () => {
                this.saving.set(false);
                this.cancelForm();
                this.load();
                this.toast.success(this.editingId() ? 'Updated' : 'Created');
            },
            error: () => { this.saving.set(false); this.toast.error('Failed'); }
        });
    }

    dismiss(id: number) {
        this.api.dismiss(id).subscribe(() => { this.load(); this.toast.success('Done'); });
    }

    remove(id: number) {
        if (!confirm('Delete reminder?')) return;
        this.api.delete(id).subscribe(() => { this.load(); this.toast.success('Deleted'); });
    }
}
