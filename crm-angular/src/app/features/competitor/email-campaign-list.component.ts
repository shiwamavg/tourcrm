import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmailCampaignService } from '../../core/services/competitor-features.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-email-campaign-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <h1>Email Campaigns</h1>
    <button class="btn" style="margin-bottom:14px;" (click)="showForm.set(!showForm())">{{ showForm() ? 'Cancel' : '+ New Campaign' }}</button>
    @if (showForm()) {
    <div class="form-panel">
        <label>Campaign Name <input type="text" [(ngModel)]="form.name" /></label>
        <label>Subject <input type="text" [(ngModel)]="form.subject" /></label>
        <label>Body (HTML) <textarea [(ngModel)]="form.body_html" rows="4"></textarea></label>
        <label>Body (Text) <textarea [(ngModel)]="form.body_text" rows="2"></textarea></label>
        <label>Scheduled At <input type="datetime-local" [(ngModel)]="form.scheduled_at" /></label>
        <div class="form-actions">
            <button class="btn" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Create' }}</button>
            <button class="btn ghost" (click)="showForm.set(false)">Cancel</button>
        </div>
    </div>
    }
    <table>
        <thead><tr><th>Name</th><th>Subject</th><th>Sent</th><th>Opens</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
        <tbody>
            @for (c of campaigns(); track c.id) {
                <tr>
                    <td>{{ c.name }}</td>
                    <td>{{ c.subject }}</td>
                    <td>{{ c.sent_count }}</td>
                    <td>{{ c.open_count }}</td>
                    <td><span class="badge" [class]="c.status">{{ c.status }}</span></td>
                    <td>{{ c.created_at | date:'short' }}</td>
                    <td>
                        <button class="btn small" (click)="edit(c)">Edit</button>
                        <button class="btn small warn" (click)="remove(c.id)">Delete</button>
                    </td>
                </tr>
            } @empty { <tr><td colspan="7" class="empty">No campaigns.</td></tr> }
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
        .badge.draft { background:#e5e7eb; color:#374151; }
        .badge.scheduled { background:#dbeafe; color:#1d4ed8; }
        .badge.sending { background:#fef3c7; color:#92400e; }
        .badge.sent { background:#dcfce7; color:#166534; }
        .empty { color:#9ca3af; text-align:center; }
    `]
})
export class EmailCampaignListComponent implements OnInit {
    private api = inject(EmailCampaignService);
    private toast = inject(ToastService);

    campaigns = signal<any[]>([]);
    showForm = signal(false);
    saving = signal(false);
    editingId = signal<number | null>(null);
    form: any = { name: '', subject: '', body_html: '', body_text: '', scheduled_at: '' };

    ngOnInit() { this.load(); }
    load() { this.api.list().subscribe(r => this.campaigns.set(r)); }

    edit(c: any) {
        this.editingId.set(c.id);
        this.form = { ...c };
        this.showForm.set(true);
    }

    save() {
        this.saving.set(true);
        const op = this.editingId() ? this.api.update(this.editingId()!, this.form) : this.api.create(this.form);
        op.subscribe({
            next: () => { this.saving.set(false); this.showForm.set(false); this.editingId.set(null); this.form = { name: '', subject: '', body_html: '', body_text: '', scheduled_at: '' }; this.load(); this.toast.success('Saved'); },
            error: () => { this.saving.set(false); this.toast.error('Failed'); }
        });
    }

    remove(id: number) {
        if (!confirm('Delete campaign?')) return;
        this.api.delete(id).subscribe(() => { this.load(); this.toast.success('Deleted'); });
    }
}
