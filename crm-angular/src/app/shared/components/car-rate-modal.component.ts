import { Component, inject, signal, input, output, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { CarRate, Destination } from '../../core/models';
import { DestinationModalComponent } from './destination-modal.component';

@Component({
    selector: 'app-car-rate-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DestinationModalComponent],
    template: `
    <div class="modal-backdrop" (click)="close.emit()">
        <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
                <h2>🚗 Add New Car Rate</h2>
                <button class="close-btn" (click)="close.emit()">×</button>
            </div>
            <form [formGroup]="form" (ngSubmit)="save()">
                <div class="form-grid-2">
                    <div class="form-group">
                        <label>Destination <span class="req">*</span></label>
                        <div class="flex gap-2">
                            <select formControlName="destination_id" style="flex:1">
                                <option [ngValue]="null">— select —</option>
                                @for (d of destinations(); track d.id) {
                                    <option [ngValue]="d.id">{{ d.name }}</option>
                                }
                            </select>
                            <button type="button" class="btn btn-outline" (click)="showDestinationModal.set(true)" title="Add new destination">+</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Car Type Name <span class="req">*</span></label>
                        <input type="text" formControlName="car_type_name" placeholder="e.g. Innova Crysta">
                    </div>
                    <div class="form-group">
                        <label>Car Class <span class="req">*</span></label>
                        <select formControlName="car_class">
                            <option value="economy">Economy</option>
                            <option value="standard">Standard</option>
                            <option value="premium">Premium</option>
                            <option value="luxury">Luxury</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Charge / Day (₹) <span class="req">*</span></label>
                        <input type="number" formControlName="charge_per_day" min="0" step="1">
                    </div>
                    <div class="form-group">
                        <label>KM Limit / Day</label>
                        <input type="number" formControlName="km_limit_per_day" min="0" step="1">
                    </div>
                    <div class="form-group">
                        <label>Extra Charge / KM (₹)</label>
                        <input type="number" formControlName="extra_charge_per_km" min="0" step="0.5">
                    </div>
                </div>
                @if (error()) {
                    <div class="error">{{ error() }}</div>
                }
                <div class="modal-actions">
                    <button type="button" class="btn btn-outline" (click)="close.emit()">Cancel</button>
                    <button type="submit" class="btn btn-primary" [disabled]="saving() || form.invalid">
                        {{ saving() ? 'Saving…' : 'Add Car' }}
                    </button>
                </div>
            </form>

            @if (showDestinationModal()) {
                <app-destination-modal
                    (close)="showDestinationModal.set(false)"
                    (saved)="onDestinationSaved($event)" />
            }
        </div>
    </div>
    `,
    styles: [`
        .modal-backdrop { position:fixed; inset:0; background:rgba(15,23,42,.45); display:flex; align-items:center; justify-content:center; z-index:1000; backdrop-filter:blur(2px); }
        .modal { background:#fff; border-radius:10px; padding:0; max-width:560px; width:calc(100% - 40px); box-shadow:0 20px 50px rgba(0,0,0,.25); animation:popIn .18s ease; overflow:hidden; }
        .modal-header { display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:1px solid #e5e7eb; }
        .modal-header h2 { margin:0; font-size:16px; }
        .close-btn { background:none; border:none; font-size:22px; color:#9ca3af; cursor:pointer; }
        form { padding:18px 22px; }
        .form-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px 16px; }
        @media (max-width: 600px) {
            .form-grid-2 { grid-template-columns: 1fr; }
        }
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
export class CarRateModalComponent {
    private api = inject(ApiService);
    private fb = inject(FormBuilder);
    private toast = inject(ToastService);

    destinationId = input<number | null>(null);
    destinations = model<Destination[]>([]);
    close = output<void>();
    saved = output<CarRate>();

    saving = signal(false);
    error = signal<string | null>(null);
    showDestinationModal = signal(false);

    form: FormGroup = this.fb.group({
        destination_id: [null, Validators.required],
        car_type_name: ['', Validators.required],
        car_class: ['standard', Validators.required],
        charge_per_day: [0, [Validators.required, Validators.min(0)]],
        km_limit_per_day: [250],
        extra_charge_per_km: [0]
    });

    ngOnInit() {
        const dest = this.destinationId();
        if (dest) this.form.patchValue({ destination_id: dest });
    }

    onDestinationSaved(dest: Destination) {
        this.showDestinationModal.set(false);
        this.destinations.set([...this.destinations(), dest]);
        this.form.patchValue({ destination_id: dest.id });
    }

    save() {
        this.error.set(null);
        if (this.form.invalid) { this.error.set('Please fill all required fields.'); return; }
        this.saving.set(true);
        this.api.createCarRate(this.form.value).subscribe({
            next: (r: CarRate) => {
                this.saving.set(false);
                this.toast.success(`Car "${r.car_type_name}" added.`);
                this.saved.emit(r);
            },
            error: (e) => {
                this.saving.set(false);
                this.error.set(e.error?.error || 'Failed to save car rate.');
            }
        });
    }
}
