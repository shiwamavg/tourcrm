import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrencyService } from '../../core/services/competitor-features.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-currency-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <h1>Currencies</h1>
    <button class="btn" style="margin-bottom:14px;" (click)="showForm.set(!showForm())">{{ showForm() ? 'Cancel' : '+ New Currency' }}</button>
    @if (showForm()) {
    <div class="form-panel">
        <label>Code <input type="text" [(ngModel)]="form.code" placeholder="e.g. USD, EUR, GBP" /></label>
        <label>Name <input type="text" [(ngModel)]="form.name" placeholder="e.g. US Dollar" /></label>
        <label>Symbol <input type="text" [(ngModel)]="form.symbol" placeholder="e.g. $" /></label>
        <label>Exchange Rate (to INR) <input type="number" step="0.000001" [(ngModel)]="form.exchange_rate" /></label>
        <label style="flex-direction:row;align-items:center;gap:8px;">
            <input type="checkbox" [(ngModel)]="form.is_default" /> Default Currency
        </label>
        <div class="form-actions">
            <button class="btn" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : (editingId() ? 'Update' : 'Create') }}</button>
            <button class="btn ghost" (click)="showForm.set(false)">Cancel</button>
        </div>
    </div>
    }
    <table>
        <thead><tr><th>Code</th><th>Name</th><th>Symbol</th><th>Exchange Rate</th><th>Default</th><th>Actions</th></tr></thead>
        <tbody>
            @for (c of currencies(); track c.id) {
                <tr>
                    <td><strong>{{ c.code }}</strong></td>
                    <td>{{ c.name }}</td>
                    <td>{{ c.symbol }}</td>
                    <td>{{ c.exchange_rate }}</td>
                    <td>@if (c.is_default) { <span class="badge">Default</span> }</td>
                    <td>
                        <button class="btn small" (click)="edit(c)">Edit</button>
                        <button class="btn small warn" (click)="remove(c.id)">Delete</button>
                    </td>
                </tr>
            } @empty { <tr><td colspan="6" class="empty">No currencies.</td></tr> }
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
        .form-panel input, .form-panel select { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; }
        .form-actions { display:flex; gap:8px; }
        table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; }
        th, td { padding:10px; text-align:left; border-bottom:1px solid #f3f4f6; font-size:13px; }
        th { background:#f9fafb; color:#6b7280; text-transform:uppercase; font-size:11px; }
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; background:#dbeafe; color:#1d4ed8; font-size:11px; }
        .empty { color:#9ca3af; text-align:center; }
    `]
})
export class CurrencyListComponent implements OnInit {
    private api = inject(CurrencyService);
    private toast = inject(ToastService);

    currencies = signal<any[]>([]);
    showForm = signal(false);
    saving = signal(false);
    editingId = signal<number | null>(null);
    form: any = { code: '', name: '', symbol: '', exchange_rate: 1, is_default: false };

    ngOnInit() { this.load(); }
    load() { this.api.list().subscribe(r => this.currencies.set(r)); }

    edit(c: any) {
        this.editingId.set(c.id);
        this.form = { ...c };
        this.showForm.set(true);
    }

    save() {
        this.saving.set(true);
        const op = this.editingId() ? this.api.update(this.editingId()!, this.form) : this.api.create(this.form);
        op.subscribe({
            next: () => { this.saving.set(false); this.showForm.set(false); this.editingId.set(null); this.form = { code: '', name: '', symbol: '', exchange_rate: 1, is_default: false }; this.load(); this.toast.success('Saved'); },
            error: () => { this.saving.set(false); this.toast.error('Failed'); }
        });
    }

    remove(id: number) {
        if (!confirm('Delete currency?')) return;
        this.api.delete(id).subscribe(() => { this.load(); this.toast.success('Deleted'); });
    }
}
