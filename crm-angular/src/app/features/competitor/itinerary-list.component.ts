import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ItineraryService } from '../../core/services/competitor-features.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-itinerary-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <h1>Itineraries</h1>
    <button class="btn" style="margin-bottom:14px;" (click)="showForm.set(!showForm())">{{ showForm() ? 'Cancel' : '+ New Itinerary' }}</button>
    @if (showForm()) {
    <div class="form-panel">
        <h3>{{ editingId() ? 'Edit Itinerary' : 'New Itinerary' }}</h3>
        <label>Title <input type="text" [(ngModel)]="form.title" /></label>
        <label>Destinations
            <div class="dest-selector">
                @for (d of dests(); track d.id) {
                    <label class="dest-chip" [class.selected]="selectedDestIds().has(d.id)">
                        <input type="checkbox" [checked]="selectedDestIds().has(d.id)" (change)="toggleDest(d.id)" />
                        {{ d.name }}
                    </label>
                } @empty {
                    <span class="text-muted">No destinations. Add them in Admin → Destinations.</span>
                }
            </div>
        </label>
        <label class="toggle-row">
            <span>Active</span>
            <input type="checkbox" [checked]="form.is_active !== false" (change)="form.is_active = !form.is_active" />
        </label>
        <label>Notes <textarea [(ngModel)]="form.notes" rows="2"></textarea></label>
        <div class="form-actions">
            <button class="btn" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : (editingId() ? 'Update' : 'Create') }}</button>
            <button class="btn ghost" (click)="showForm.set(false); editingId.set(null)">Cancel</button>
        </div>
    </div>
    }
    <table>
        <thead><tr><th>Title</th><th>Destinations</th><th>Active</th><th>Actions</th></tr></thead>
        <tbody>
            @for (i of items(); track i.id) {
                <tr>
                    <td><a [routerLink]="['/itineraries', i.id]">{{ i.title }}</a></td>
                    <td>{{ destNames(i.destination_ids) }}</td>
                    <td>
                        <span class="badge" [class]="i.is_active ? 'badge-active' : 'badge-inactive'">{{ i.is_active ? 'Active' : 'Inactive' }}</span>
                    </td>
                    <td>
                        <a class="btn small" [routerLink]="['/itineraries', i.id]">Open</a>
                        <button class="btn small" (click)="edit(i)">Edit</button>
                        <button class="btn small warn" (click)="remove(i.id)">Delete</button>
                    </td>
                </tr>
            } @empty { <tr><td colspan="4" class="empty">No itineraries.</td></tr> }
        </tbody>
    </table>
    `,
    styles: [`
        h1 { margin:0 0 14px; font-size:1.3rem; }
        .btn { padding:8px 12px; border:none; border-radius:6px; background:#0f766e; color:#fff; cursor:pointer; font-size:13px; text-decoration:none; display:inline-block; }
        .btn.ghost { background:#f3f4f6; color:#374151; }
        .btn.small { padding:4px 8px; font-size:12px; }
        .btn.warn { background:#b91c1c; }
        .form-panel { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:14px; margin-bottom:14px; max-width:540px; }
        .form-panel label { display:flex; flex-direction:column; gap:4px; margin-bottom:10px; font-size:12px; color:#374151; }
        .form-panel input, .form-panel select, .form-panel textarea { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; }
        .form-actions { display:flex; gap:8px; }
        .dest-selector { display:flex; flex-wrap:wrap; gap:6px; }
        .dest-chip { display:flex; align-items:center; gap:4px; padding:4px 10px; border:1px solid #d1d5db; border-radius:999px; font-size:12px; cursor:pointer; user-select:none; }
        .dest-chip input { display:none; }
        .dest-chip.selected { background:#0f766e; color:#fff; border-color:#0f766e; }
        table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; }
        th, td { padding:10px; text-align:left; border-bottom:1px solid #f3f4f6; font-size:13px; }
        th { background:#f9fafb; color:#6b7280; text-transform:uppercase; font-size:11px; }
        td a { color:#0f766e; text-decoration:none; font-weight:600; }
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; text-transform:capitalize; }
        .badge-active { background:#dcfce7; color:#166534; }
        .badge-inactive { background:#f3f4f6; color:#6b7280; }
        .toggle-row { display:flex; flex-direction:row !important; align-items:center; gap:8px; margin-bottom:12px; }
        .toggle-row input[type="checkbox"] { width:18px; height:18px; accent-color:#0f766e; }
        .text-muted { color:#9ca3af; font-size:12px; }
        .empty { color:#9ca3af; text-align:center; }
    `]
})
export class ItineraryListComponent implements OnInit {
    private itineraryApi = inject(ItineraryService);
    private api = inject(ApiService);
    private toast = inject(ToastService);

    items = signal<any[]>([]);
    showForm = signal(false);
    saving = signal(false);
    form: any = { title: '', is_active: true, notes: '' };
    editingId = signal<number | null>(null);
    dests = signal<any[]>([]);
    selectedDestIds = signal<Set<number>>(new Set());

    ngOnInit() {
        this.load();
        this.api.listDestinations().subscribe(r => this.dests.set(r.items));
    }

    load() { this.itineraryApi.list().subscribe(r => this.items.set(r)); }

    toggleDest(id: number) {
        this.selectedDestIds.update(s => {
            const next = new Set(s);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    destNames(ids: any): string {
        if (!ids) return '—';
        const arr = typeof ids === 'string' ? JSON.parse(ids) : ids;
        if (!Array.isArray(arr) || !arr.length) return '—';
        return arr.map((id: number) => {
            const d = this.dests().find(x => x.id === id);
            return d ? d.name : `#${id}`;
        }).join(', ');
    }

    edit(item: any) {
        this.form = { title: item.title, is_active: item.is_active !== 0, notes: item.notes || '' };
        const ids = item.destination_ids;
        const arr = typeof ids === 'string' ? JSON.parse(ids || '[]') : (ids || []);
        this.selectedDestIds.set(new Set(arr));
        this.editingId.set(item.id);
        this.showForm.set(true);
    }

    save() {
        this.saving.set(true);
        const payload = {
            ...this.form,
            destination_ids: [...this.selectedDestIds()]
        };
        const obs = this.editingId()
            ? this.itineraryApi.update(this.editingId()!, payload)
            : this.itineraryApi.create(payload);
        obs.subscribe({
            next: () => {
                this.saving.set(false);
                this.showForm.set(false);
                const wasEdit = !!this.editingId();
                this.editingId.set(null);
                this.form = { title: '', is_active: true, notes: '' };
                this.selectedDestIds.set(new Set());
                this.load();
                this.toast.success(wasEdit ? 'Updated' : 'Created');
            },
            error: () => { this.saving.set(false); this.toast.error('Failed'); }
        });
    }

    remove(id: number) {
        if (!confirm('Delete itinerary?')) return;
        this.itineraryApi.delete(id).subscribe(() => { this.load(); this.toast.success('Deleted'); });
    }
}
