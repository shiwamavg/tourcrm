import { Component, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { Destination } from '../../core/models';

@Component({
    selector: 'app-destination-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="modal-backdrop" (click)="close.emit()">
        <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
                <h2>🌍 Add New Destination</h2>
                <button class="close-btn" (click)="close.emit()">×</button>
            </div>
            <form [formGroup]="form" (ngSubmit)="save()">
                <div class="form-grid-2">
                    <div class="form-group">
                        <label>Name <span class="req">*</span></label>
                        <input type="text" formControlName="name" placeholder="e.g. Gangtok">
                    </div>
                    <div class="form-group">
                        <label>State</label>
                        <input type="text" formControlName="state" placeholder="e.g. Sikkim">
                    </div>
                    <div class="form-group">
                        <label>Country</label>
                        <input type="text" formControlName="country" placeholder="e.g. India">
                    </div>
                    <div class="form-group">
                        <label>Active</label>
                        <select formControlName="is_active">
                            <option [ngValue]="1">Yes</option>
                            <option [ngValue]="0">No</option>
                        </select>
                    </div>
                </div>
                @if (error()) {
                    <div class="error">{{ error() }}</div>
                }
                <div class="modal-actions">
                    <button type="button" class="btn btn-outline" (click)="close.emit()">Cancel</button>
                    <button type="submit" class="btn btn-primary" [disabled]="saving() || form.invalid">
                        {{ saving() ? 'Saving…' : 'Add Destination' }}
                    </button>
                </div>
            </form>
        </div>
    </div>
    `,
    styles: [`
        .modal-backdrop { position:fixed; inset:0; background:rgba(15,23,42,.45); display:flex; align-items:center; justify-content:center; z-index:1000; backdrop-filter:blur(2px); }
        .modal { background:#fff; border-radius:10px; padding:0; max-width:480px; width:calc(100% - 40px); box-shadow:0 20px 50px rgba(0,0,0,.25); animation:popIn .18s ease; overflow:hidden; }
        .modal-header { display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:1px solid #e5e7eb; }
        .modal-header h2 { margin:0; font-size:16px; }
        .close-btn { background:none; border:none; font-size:22px; color:#9ca3af; cursor:pointer; }
        form { padding:18px 22px; }
        .form-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px 16px; }
        .form-group { display:flex; flex-direction:column; gap:4px; }
        .form-group label { font-size:13px; color:#374151; }
        .req { color:#dc2626; }
        input, select { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; font:inherit; }
        input:focus, select:focus { outline:none; border-color:#0f766e; box-shadow:0 0 0 3px rgba(15,118,110,.1); }
        .error { background:#fee2e2; color:#991b1b; padding:10px 12px; border-radius:6px; margin-top:10px; font-size:13px; }
        .modal-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:16px; padding-top:14px; border-top:1px solid #e5e7eb; }
        .btn { padding:8px 14px; border:none; border-radius:6px; cursor:pointer; font:inherit; }
        .btn-primary { background:#0f766e; color:#fff; }
        .btn-primary:hover:not(:disabled) { background:#115e59; }
        .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
        .btn-outline { background:#fff; color:#374151; border:1px solid #d1d5db; }
        @keyframes popIn { from { transform:scale(.96); opacity:0 } to { transform:scale(1); opacity:1 } }
    `]
})
export class DestinationModalComponent {
    private api = inject(ApiService);
    private fb = inject(FormBuilder);
    private toast = inject(ToastService);

    close = output<void>();
    saved = output<Destination>();

    saving = signal(false);
    error = signal<string | null>(null);

    form: FormGroup = this.fb.group({
        name: ['', Validators.required],
        state: ['Sikkim'],
        country: ['India'],
        is_active: [1]
    });

    save() {
        this.error.set(null);
        if (this.form.invalid) { this.error.set('Please fill the destination name.'); return; }
        this.saving.set(true);
        this.api.createDestination(this.form.value).subscribe({
            next: (d: Destination) => {
                this.saving.set(false);
                this.toast.success(`Destination "${d.name}" added.`);
                this.saved.emit(d);
            },
            error: (e) => {
                this.saving.set(false);
                this.error.set(e.error?.error || 'Failed to save destination.');
            }
        });
    }
}
