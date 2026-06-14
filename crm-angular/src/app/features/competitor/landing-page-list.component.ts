import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LandingPageService } from '../../core/services/competitor-features.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-landing-page-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <h1>Landing Pages</h1>
    <button class="btn" style="margin-bottom:14px;" (click)="showForm.set(!showForm())">{{ showForm() ? 'Cancel' : '+ New Landing Page' }}</button>
    @if (showForm()) {
    <div class="form-panel">
        <label>Title <input type="text" [(ngModel)]="form.title" /></label>
        <label>Slug <input type="text" [(ngModel)]="form.slug" placeholder="e.g. summer-tour-2026" /></label>
        <label>Meta Description <input type="text" [(ngModel)]="form.meta_description" /></label>
        <label>Hero Title <input type="text" [(ngModel)]="form.hero_title" /></label>
        <label>Hero Subtitle <textarea [(ngModel)]="form.hero_subtitle" rows="2"></textarea></label>
        <label>SEO Keywords <input type="text" [(ngModel)]="form.seo_keywords" placeholder="comma-separated" /></label>
        <label style="flex-direction:row;align-items:center;gap:8px;">
            <input type="checkbox" [(ngModel)]="form.is_published" /> Published
        </label>
        <div class="form-actions">
            <button class="btn" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : (editingId() ? 'Update' : 'Create') }}</button>
            <button class="btn ghost" (click)="showForm.set(false)">Cancel</button>
        </div>
    </div>
    }
    <table>
        <thead><tr><th>Title</th><th>Slug</th><th>Created</th><th>Published</th><th>Actions</th></tr></thead>
        <tbody>
            @for (p of pages(); track p.id) {
                <tr>
                    <td>{{ p.title }}</td>
                    <td>{{ p.slug }}</td>
                    <td>{{ p.created_at | date:'shortDate' }}</td>
                    <td>@if (p.is_published) { <span class="badge">Yes</span> } @else { <span class="badge no">No</span> }</td>
                    <td>
                        <button class="btn small" (click)="edit(p)">Edit</button>
                        <button class="btn small warn" (click)="remove(p.id)">Delete</button>
                    </td>
                </tr>
            } @empty { <tr><td colspan="5" class="empty">No landing pages.</td></tr> }
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
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; background:#dcfce7; color:#166534; font-size:11px; }
        .badge.no { background:#f3f4f6; color:#6b7280; }
        .empty { color:#9ca3af; text-align:center; }
    `]
})
export class LandingPageListComponent implements OnInit {
    private api = inject(LandingPageService);
    private toast = inject(ToastService);

    pages = signal<any[]>([]);
    showForm = signal(false);
    saving = signal(false);
    editingId = signal<number | null>(null);
    form: any = { title: '', slug: '', meta_description: '', hero_title: '', hero_subtitle: '', seo_keywords: '', is_published: false };

    ngOnInit() { this.load(); }
    load() { this.api.list().subscribe(r => this.pages.set(r)); }

    edit(p: any) {
        this.editingId.set(p.id);
        this.form = { ...p };
        this.showForm.set(true);
    }

    save() {
        this.saving.set(true);
        const op = this.editingId() ? this.api.update(this.editingId()!, this.form) : this.api.create(this.form);
        op.subscribe({
            next: () => { this.saving.set(false); this.showForm.set(false); this.editingId.set(null); this.form = { title: '', slug: '', meta_description: '', hero_title: '', hero_subtitle: '', seo_keywords: '', is_published: false }; this.load(); this.toast.success('Saved'); },
            error: () => { this.saving.set(false); this.toast.error('Failed'); }
        });
    }

    remove(id: number) {
        if (!confirm('Delete landing page?')) return;
        this.api.delete(id).subscribe(() => { this.load(); this.toast.success('Deleted'); });
    }
}
