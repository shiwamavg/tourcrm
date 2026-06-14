import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ItineraryService } from '../../core/services/competitor-features.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-itinerary-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <div class="toolbar">
        <a class="btn ghost" routerLink="/itineraries">← Back</a>
        <h1 style="margin:0;">{{ itinerary()?.title }}</h1>
        <button class="btn small" style="margin-left:auto;" (click)="editToggle.set(!editToggle())">{{ editToggle() ? 'Cancel' : 'Edit' }}</button>
    </div>
    @if (itinerary()) {
        @if (editToggle()) {
        <div class="form-panel">
            <label>Title <input type="text" [(ngModel)]="editForm.title" /></label>
            <label class="toggle-row">
                <span>Active</span>
                <input type="checkbox" [checked]="editForm.is_active !== false" (change)="editForm.is_active = !editForm.is_active" />
            </label>
            <label>Notes <textarea [(ngModel)]="editForm.notes" rows="2"></textarea></label>
            <div class="form-actions">
                <button class="btn" (click)="saveEdit()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
                <button class="btn ghost" (click)="editToggle.set(false)">Cancel</button>
            </div>
        </div>
        }
        <div class="meta">
            <span class="badge" [class]="itinerary().is_active ? 'badge-active' : 'badge-inactive'">{{ itinerary().is_active ? 'Active' : 'Inactive' }}</span>
            <span>{{ days().length }} day(s)</span>
        </div>
        @if (itinerary().notes) { <div class="notes">{{ itinerary().notes }}</div> }
        <button class="btn" style="margin:14px 0;" (click)="showDayForm.set(!showDayForm())">{{ showDayForm() ? 'Cancel' : '+ Add Day' }}</button>
        @if (showDayForm()) {
        <div class="form-panel">
            <label>Day # <input type="number" [(ngModel)]="dayForm.day_number" /></label>
            <label>Date <input type="date" [(ngModel)]="dayForm.date" /></label>
            <label>Title <input type="text" [(ngModel)]="dayForm.title" /></label>
            <label>Description <textarea [(ngModel)]="dayForm.description" rows="2"></textarea></label>
            <label>Meal Plan <input type="text" [(ngModel)]="dayForm.meal_plan" placeholder="e.g. Breakfast + Dinner" /></label>
            <label>Transport <input type="text" [(ngModel)]="dayForm.transport_type" /></label>
            <div class="form-actions">
                <button class="btn" (click)="saveDay()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Add Day' }}</button>
                <button class="btn ghost" (click)="showDayForm.set(false)">Cancel</button>
            </div>
        </div>
        }
        <div class="days">
            @for (d of days(); track d.id) {
                @if (editingDayId() === d.id) {
                    <div class="day-card editing">
                        <label>Day # <input type="number" [(ngModel)]="editDayForm.day_number" /></label>
                        <label>Date <input type="date" [(ngModel)]="editDayForm.date" /></label>
                        <label>Title <input type="text" [(ngModel)]="editDayForm.title" /></label>
                        <label>Description <textarea [(ngModel)]="editDayForm.description" rows="2"></textarea></label>
                        <label>Meal Plan <input type="text" [(ngModel)]="editDayForm.meal_plan" /></label>
                        <label>Transport <input type="text" [(ngModel)]="editDayForm.transport_type" /></label>
                        <div class="form-actions">
                            <button class="btn" (click)="updateDay(d.id)" [disabled]="saving()">Save</button>
                            <button class="btn ghost" (click)="editingDayId.set(null)">Cancel</button>
                        </div>
                    </div>
                } @else {
                <div class="day-card">
                    <div class="day-header">Day {{ d.day_number }} — {{ d.date | date:'mediumDate' }}</div>
                    <div class="day-title">{{ d.title }}</div>
                    <div class="day-desc">{{ d.description }}</div>
                    <div class="day-meta">
                        @if (d.meal_plan) { <span>Meals: {{ d.meal_plan }}</span> }
                        @if (d.transport_type) { <span>Transport: {{ d.transport_type }}</span> }
                    </div>
                    <button class="btn small" (click)="startEditDay(d)">Edit</button>
                    <button class="btn small warn" (click)="removeDay(d.id)">Remove</button>
                </div>
                }
            } @empty { <div class="empty">No days added yet.</div> }
        </div>
    }
    `,
    styles: [`
        .toolbar { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
        .btn.ghost { background:#f3f4f6; color:#374151; padding:6px 10px; border-radius:6px; text-decoration:none; font-size:13px; }
        .btn { padding:8px 12px; border:none; border-radius:6px; background:#0f766e; color:#fff; cursor:pointer; font-size:13px; }
        .btn.small { padding:4px 8px; font-size:12px; }
        .btn.warn { background:#b91c1c; }
        .meta { display:flex; gap:12px; font-size:13px; color:#6b7280; margin-bottom:10px; }
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; text-transform:capitalize; }
        .badge-active { background:#dcfce7; color:#166534; }
        .badge-inactive { background:#f3f4f6; color:#6b7280; }
        .toggle-row { display:flex; flex-direction:row !important; align-items:center; gap:8px; margin-bottom:12px; }
        .toggle-row input[type="checkbox"] { width:18px; height:18px; accent-color:#0f766e; }
        .form-panel { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:14px; margin-bottom:14px; max-width:540px; }
        .form-panel label { display:flex; flex-direction:column; gap:4px; margin-bottom:10px; font-size:12px; color:#374151; }
        .form-panel input, .form-panel textarea { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; }
        .form-actions { display:flex; gap:8px; }
        .days { display:flex; flex-direction:column; gap:10px; }
        .day-card { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:12px; }
        .day-card.editing { background:#fffbeb; border-color:#f59e0b; }
        .day-card.editing label { display:flex; flex-direction:column; gap:4px; margin-bottom:8px; font-size:12px; color:#374151; }
        .day-card.editing input, .day-card.editing textarea { padding:6px 8px; border:1px solid #d1d5db; border-radius:4px; }
        .day-header { font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; }
        .day-title { font-weight:700; margin:4px 0; }
        .day-desc { font-size:13px; color:#374151; margin-bottom:8px; }
        .day-meta { font-size:12px; color:#6b7280; display:flex; gap:12px; margin-bottom:8px; }
        .empty { color:#9ca3af; }
        .notes { font-size:13px; color:#6b7280; background:#f9fafb; border-radius:6px; padding:10px; margin-top:8px; }
    `]
})
export class ItineraryDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private api = inject(ItineraryService);
    private toast = inject(ToastService);

    itinerary = signal<any>(null);
    days = signal<any[]>([]);
    showDayForm = signal(false);
    saving = signal(false);
    editToggle = signal(false);
    editForm: any = {};
    editingDayId = signal<number | null>(null);
    editDayForm: any = {};
    dayForm: any = { day_number: 1, date: '', title: '', description: '', meal_plan: '', transport_type: '' };

    ngOnInit() {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        this.load(id);
    }

    load(id: number) {
        this.api.get(id).subscribe({
            next: (r: any) => {
                this.itinerary.set(r);
                const daysArr = r.days || [];
                this.days.set(daysArr);
                this.editForm = { title: r.title, is_active: r.is_active !== 0, notes: r.notes || '' };
                this.dayForm.day_number = daysArr.length + 1;
            },
            error: () => this.toast.error('Failed to load itinerary')
        });
    }

    saveEdit() {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        this.saving.set(true);
        const body = { title: this.editForm.title, is_active: this.editForm.is_active, notes: this.editForm.notes };
        this.api.update(id, body).subscribe({
            next: () => {
                this.saving.set(false);
                this.editToggle.set(false);
                this.load(id);
                this.toast.success('Updated');
            },
            error: () => { this.saving.set(false); this.toast.error('Failed'); }
        });
    }

    saveDay() {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        this.saving.set(true);
        this.api.addDay(id, this.dayForm).subscribe({
            next: () => {
                this.saving.set(false); this.showDayForm.set(false);
                this.dayForm = { day_number: 1, date: '', title: '', description: '', meal_plan: '', transport_type: '' };
                this.load(id); this.toast.success('Day added');
            },
            error: () => { this.saving.set(false); this.toast.error('Failed'); }
        });
    }

    removeDay(dayId: number) {
        if (!confirm('Remove day?')) return;
        const id = Number(this.route.snapshot.paramMap.get('id'));
        this.api.deleteDay(id, dayId).subscribe(() => { this.load(id); this.toast.success('Removed'); });
    }

    startEditDay(d: any) {
        this.editDayForm = { ...d };
        if (this.editDayForm.date) this.editDayForm.date = this.editDayForm.date.substring(0, 10);
        this.editingDayId.set(d.id);
    }

    updateDay(dayId: number) {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        this.saving.set(true);
        this.api.updateDay(id, dayId, this.editDayForm).subscribe({
            next: () => {
                this.saving.set(false);
                this.editingDayId.set(null);
                this.load(id);
                this.toast.success('Day updated');
            },
            error: () => { this.saving.set(false); this.toast.error('Failed'); }
        });
    }
}
