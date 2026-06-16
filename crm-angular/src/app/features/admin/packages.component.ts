import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

interface ItineraryDay {
    day: number;
    title: string;
    description: string;
}

interface PackageHotel {
    hotel_name: string;
    room_type: string;
    meal_plan: string;
    num_nights: number;
}

interface PackageCar {
    car_type: string;
    num_days: number;
    notes: string;
}

@Component({
    selector: 'app-packages',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    template: `
    <div class="page-header">
        <div>
            <h1>Predefined Tour Packages</h1>
            <p>Configure packages available for public booking and fast quote generation</p>
        </div>
    </div>

    <!-- Add / Edit Card -->
    <div class="card">
        <h2>{{ editing() ? 'Edit Predefined Package' : 'Add Predefined Package' }}</h2>
        <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-grid-3">
                <div class="form-group col-span-2">
                    <label>Package Title <span class="req">*</span></label>
                    <input type="text" formControlName="title" placeholder="e.g. 6 Days Sikkim Honeymoon Special">
                </div>
                <div class="form-group">
                    <label>Tour Category <span class="req">*</span></label>
                    <select formControlName="category">
                        <option value="Individual / Family">Individual / Family</option>
                        <option value="Group Tour">Group Tour</option>
                        <option value="Corporate / MICE">Corporate / MICE</option>
                        <option value="Honeymoon Special">Honeymoon Special</option>
                        <option value="Adventure / Trekking">Adventure / Trekking</option>
                    </select>
                </div>
            </div>

            <div class="form-grid-3" style="margin-top: 1rem;">
                <div class="form-group">
                    <label>Starting Price (INR) <span class="req">*</span></label>
                    <input type="number" formControlName="price" placeholder="e.g. 24999">
                </div>
                <div class="form-group">
                    <label>Duration Days <span class="req">*</span></label>
                    <input type="number" formControlName="duration_days" placeholder="e.g. 6">
                </div>
                <div class="form-group">
                    <label>Duration Nights <span class="req">*</span></label>
                    <input type="number" formControlName="duration_nights" placeholder="e.g. 5">
                </div>
            </div>

            <div class="form-grid-3" style="margin-top: 1rem;">
                <div class="form-group col-span-2">
                    <label>Package Cover Image URL</label>
                    <div class="flex" style="gap:0.5rem">
                        <input type="text" formControlName="image_url" placeholder="https://images.unsplash.com/... (optional)" style="flex-grow:1">
                        <label class="btn btn-sm" style="margin:0; cursor:pointer; display:inline-flex; align-items:center; background:#e5e7eb; color:#374151; font-weight:600; border:1px solid #d1d5db; border-radius:6px; padding:6px 12px; font-size:12px;">
                            📁 Upload
                            <input type="file" accept="image/*" (change)="onImageUpload($event)" style="display:none">
                        </label>
                    </div>
                    @if (uploadingImage()) {
                        <div class="text-xs" style="color:#0d9488; margin-top:2px;">
                            Uploading image...
                        </div>
                    }
                </div>
            </div>

            <div class="form-group" style="margin-top: 1rem;">
                <label>Description</label>
                <textarea formControlName="description" rows="3" placeholder="Brief summary of the package highlights..."></textarea>
            </div>

            <div class="form-grid-2" style="margin-top: 1rem;">
                <div class="form-group">
                    <label>Inclusions (One per line)</label>
                    <textarea formControlName="inclusions" rows="5" placeholder="• Deluxe hotel rooms&#10;• Daily breakfast and dinner&#10;• Private taxi transfers..."></textarea>
                </div>
                <div class="form-group">
                    <label>Exclusions (One per line)</label>
                    <textarea formControlName="exclusions" rows="5" placeholder="• Airfare/Train ticket&#10;• Entrance ticket fees&#10;• Nathula Pass permit..."></textarea>
                </div>
            </div>

            <!-- Day-by-Day Itinerary Builder -->
            <div class="itinerary-section" style="margin-top: 1.5rem; border-top: 1px solid #f3f4f6; padding-top: 1.5rem;">
                <div class="section-title-bar">
                    <h3>Day-by-Day Itinerary ({{ itineraryDays().length }} Days)</h3>
                    <button type="button" class="btn btn-secondary btn-sm" (click)="addItineraryDay()">+ Add Day</button>
                </div>

                @if (itineraryDays().length === 0) {
                    <div class="empty-itinerary">No days added. Click "+ Add Day" to start building the itinerary.</div>
                } @else {
                    <div class="itinerary-list">
                        @for (day of itineraryDays(); track $index) {
                            <div class="itinerary-day-row">
                                <div class="day-number">Day {{ day.day }}</div>
                                <div class="day-fields">
                                    <input type="text" [(ngModel)]="day.title" [ngModelOptions]="{standalone: true}" placeholder="Day Theme/Title (e.g. Arrival & Gangtok Stay)">
                                    <textarea [(ngModel)]="day.description" [ngModelOptions]="{standalone: true}" rows="2" placeholder="Describe the activities, sightseeing, and overnight stay details..."></textarea>
                                </div>
                                <button type="button" class="remove-day-btn" (click)="removeItineraryDay($index)" title="Remove Day">×</button>
                            </div>
                        }
                    </div>
                }
            </div>

            <!-- Hotels Section -->
            <div class="hotels-section" style="margin-top: 1.5rem; border-top: 1px solid #f3f4f6; padding-top: 1.5rem;">
                <div class="section-title-bar">
                    <h3>🏨 Included Hotels ({{ packageHotels().length }})</h3>
                    <button type="button" class="btn btn-secondary btn-sm" (click)="addPackageHotel()">+ Add Hotel</button>
                </div>

                @if (packageHotels().length === 0) {
                    <div class="empty-itinerary">No hotels added. Click "+ Add Hotel" to define hotels for this package.</div>
                } @else {
                    <div class="itinerary-list">
                        @for (h of packageHotels(); track $index) {
                            <div class="itinerary-day-row">
                                <div class="day-fields" style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem;">
                                    <div class="form-group" style="gap:2px;">
                                        <label style="font-size:11px; font-weight:600;">Hotel Name</label>
                                        <input type="text" [(ngModel)]="h.hotel_name" [ngModelOptions]="{standalone: true}" placeholder="e.g. Mayfair Resort">
                                    </div>
                                    <div class="form-group" style="gap:2px;">
                                        <label style="font-size:11px; font-weight:600;">Room Type</label>
                                        <input type="text" [(ngModel)]="h.room_type" [ngModelOptions]="{standalone: true}" placeholder="e.g. Deluxe Room">
                                    </div>
                                    <div class="form-group" style="gap:2px;">
                                        <label style="font-size:11px; font-weight:600;">Meal Plan</label>
                                        <input type="text" [(ngModel)]="h.meal_plan" [ngModelOptions]="{standalone: true}" placeholder="e.g. MAP (Breakfast & Dinner)">
                                    </div>
                                    <div class="form-group" style="gap:2px;">
                                        <label style="font-size:11px; font-weight:600;">Nights</label>
                                        <input type="number" [(ngModel)]="h.num_nights" [ngModelOptions]="{standalone: true}" placeholder="e.g. 3" min="1">
                                    </div>
                                </div>
                                <button type="button" class="remove-day-btn" (click)="removePackageHotel($index)" title="Remove Hotel">×</button>
                            </div>
                        }
                    </div>
                }
            </div>

            <!-- Transport/Cabs Section -->
            <div class="cars-section" style="margin-top: 1.5rem; border-top: 1px solid #f3f4f6; padding-top: 1.5rem;">
                <div class="section-title-bar">
                    <h3>🚗 Included Transport / Cabs / Bus ({{ packageCars().length }})</h3>
                    <button type="button" class="btn btn-secondary btn-sm" (click)="addPackageCar()">+ Add Cab/Bus</button>
                </div>

                @if (packageCars().length === 0) {
                    <div class="empty-itinerary">No vehicles added. Click "+ Add Cab/Bus" to define transport for this package.</div>
                } @else {
                    <div class="itinerary-list">
                        @for (c of packageCars(); track $index) {
                            <div class="itinerary-day-row">
                                <div class="day-fields" style="display:grid; grid-template-columns: 1.5fr 0.5fr 2fr; gap: 0.5rem;">
                                    <div class="form-group" style="gap:2px;">
                                        <label style="font-size:11px; font-weight:600;">Vehicle Type</label>
                                        <input type="text" [(ngModel)]="c.car_type" [ngModelOptions]="{standalone: true}" placeholder="e.g. Toyota Innova / AC Bus">
                                    </div>
                                    <div class="form-group" style="gap:2px;">
                                        <label style="font-size:11px; font-weight:600;">Days</label>
                                        <input type="number" [(ngModel)]="c.num_days" [ngModelOptions]="{standalone: true}" placeholder="e.g. 5" min="1">
                                    </div>
                                    <div class="form-group" style="gap:2px;">
                                        <label style="font-size:11px; font-weight:600;">Notes/Sightseeing Inclusions</label>
                                        <input type="text" [(ngModel)]="c.notes" [ngModelOptions]="{standalone: true}" placeholder="e.g. Private transfers, Gangtok sightseeing">
                                    </div>
                                </div>
                                <button type="button" class="remove-day-btn" (click)="removePackageCar($index)" title="Remove Cab/Bus">×</button>
                            </div>
                        }
                    </div>
                }
            </div>

            <div class="flex" style="margin-top: 1.5rem; gap: 1rem; align-items: center;">
                <label class="checkbox-item">
                    <input type="checkbox" formControlName="is_active"> Active (Visibile on Website)
                </label>
                <button type="submit" class="btn btn-primary" [disabled]="saving() || form.invalid">
                    @if (saving()) { <span class="spinner"></span> Saving… }
                    @else { {{ editing() ? 'Update Package' : 'Save Package' }} }
                </button>
                @if (editing()) {
                    <button type="button" class="btn" (click)="cancelEdit()">Cancel</button>
                }
            </div>
        </form>
    </div>

    <!-- Listing Card -->
    <div class="card">
        <div class="section-header">
            <h2 style="margin:0;border:none;padding:0">All Predefined Packages ({{ total() }})</h2>
            <div class="flex" style="gap:0.5rem">
                <input type="text" [ngModel]="search()" (ngModelChange)="onSearchChange($event)" placeholder="Search packages…" style="min-width:200px">
                <select [ngModel]="limit()" (ngModelChange)="onLimitChange($event)">
                    <option [ngValue]="10">10 per page</option>
                    <option [ngValue]="20">20 per page</option>
                    <option [ngValue]="50">50 per page</option>
                </select>
                <div class="view-toggle">
                    <button class="view-btn" [class.active]="viewMode() === 'table'" (click)="viewMode.set('table')" title="Table view">☰</button>
                    <button class="view-btn" [class.active]="viewMode() === 'grid'" (click)="viewMode.set('grid')" title="Card grid view">⊞</button>
                </div>
            </div>
        </div>

        @if (viewMode() === 'table') {
            <div class="table-wrap" style="box-shadow:none">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Duration</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (p of items(); track p.id) {
                            <tr>
                                <td>
                                    <div class="flex" style="gap:8px; align-items:center">
                                        @if (p.image_url) {
                                            <img [src]="p.image_url" style="width:40px; height:32px; object-fit:cover; border-radius:4px; flex-shrink:0" alt="">
                                        }
                                        <div>
                                            <strong>{{ p.title }}</strong>
                                            @if (p.description) {
                                                <div class="text-xs text-muted max-w-sm truncate-2">{{ p.description }}</div>
                                            }
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:600; padding:2px 8px; border-radius:12px; font-size:11px;">
                                        {{ p.category || 'Individual / Family' }}
                                    </span>
                                </td>
                                <td>{{ p.duration_days }}D / {{ p.duration_nights }}N</td>
                                <td><strong>₹{{ p.price | number }}</strong></td>
                                <td>
                                    @if (p.is_active) { <span class="badge badge-accepted">Active</span> }
                                    @else { <span class="badge badge-draft">Inactive</span> }
                                </td>
                                <td>
                                    <div class="flex" style="gap:0.25rem">
                                        <button class="btn btn-sm" (click)="edit(p)">Edit</button>
                                        <button class="btn btn-sm btn-danger" (click)="deletePkg(p.id)" [disabled]="saving()">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        } @empty {
                            <tr><td colspan="6" class="empty-state">No packages created yet.</td></tr>
                        }
                    </tbody>
                </table>
            </div>
        } @else {
            <!-- Card Grid View -->
            @if (items().length === 0) {
                <div class="empty-state" style="padding: 40px 16px;">
                    <div style="font-size:2.5rem">🧳</div>
                    <p style="margin-top:8px">No packages yet. Add your first package above.</p>
                </div>
            } @else {
                <div class="pkg-grid">
                    @for (p of items(); track p.id) {
                        <div class="pkg-card" [class.pkg-inactive]="!p.is_active">
                            <div class="pkg-img">
                                @if (p.image_url) {
                                    <img [src]="p.image_url" [alt]="p.title">
                                } @else {
                                    <div class="pkg-img-placeholder">🏔️</div>
                                }
                                <span class="pkg-status-badge" [class.active]="p.is_active">{{ p.is_active ? 'Active' : 'Inactive' }}</span>
                                <span class="pkg-cat-badge">{{ p.category || 'Individual / Family' }}</span>
                            </div>
                            <div class="pkg-body">
                                <h3 class="pkg-title">{{ p.title }}</h3>
                                @if (p.description) {
                                    <p class="pkg-desc">{{ p.description }}</p>
                                }
                                <div class="pkg-meta">
                                    <span>📅 {{ p.duration_days }}D / {{ p.duration_nights }}N</span>
                                    @if (p.hotels) { <span>🏨 Hotels incl.</span> }
                                    @if (p.cars) { <span>🚗 Transport incl.</span> }
                                </div>
                            </div>
                            <div class="pkg-footer">
                                <div class="pkg-price">₹{{ p.price | number }}</div>
                                <div class="pkg-actions">
                                    <button class="btn btn-sm" (click)="edit(p)">Edit</button>
                                    <button class="btn btn-sm btn-danger" (click)="deletePkg(p.id)" [disabled]="saving()">✕</button>
                                </div>
                            </div>
                        </div>
                    }
                </div>
            }
        }

        <div class="pagination-bar">
            <button class="btn btn-sm" [disabled]="page() === 1 || loading()" (click)="prevPage()">Prev</button>
            <span>Page {{ page() }} of {{ totalPages() }}</span>
            <button class="btn btn-sm" [disabled]="page() >= totalPages() || loading()" (click)="nextPage()">Next</button>
        </div>
    </div>
    `,
    styles: [`
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .col-span-2 { grid-column: span 2; }
        .req { color: #ef4444; }
        .form-group { display: flex; flex-direction: column; gap: 0.25rem; }
        .form-group label { font-size: 12px; font-weight: 600; color: #4b5563; }
        .form-group input, .form-group textarea, select {
            padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;
            font-size: 13px; outline: none; background: #fff;
        }
        .form-group input:focus, .form-group textarea:focus { border-color: #0d9488; box-shadow: 0 0 0 2px rgba(13,148,136,0.1); }
        .checkbox-item { display: flex; align-items: center; gap: 0.5rem; font-size: 13px; font-weight: 500; cursor: pointer; }
        .flex { display: flex; align-items: center; }
        
        .section-title-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .section-title-bar h3 { font-size: 14px; margin: 0; color: #374151; }
        
        .empty-itinerary {
            padding: 24px; text-align: center; color: #6b7280; font-size: 12px;
            background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 6px;
        }
        .itinerary-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .itinerary-day-row {
            display: flex; align-items: flex-start; gap: 1rem; padding: 12px;
            background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;
            position: relative;
        }
        .day-number {
            font-weight: 700; color: #0d9488; font-size: 13px; padding-top: 8px;
            min-width: 60px;
        }
        .day-fields { flex-grow: 1; display: flex; flex-direction: column; gap: 0.5rem; }
        .day-fields input { padding: 6px 10px; font-size: 12px; font-weight: 600; }
        .day-fields textarea { padding: 6px 10px; font-size: 12px; }
        .remove-day-btn {
            background: none; border: none; font-size: 20px; color: #9ca3af;
            cursor: pointer; padding: 2px 8px; border-radius: 4px;
        }
        .remove-day-btn:hover { color: #ef4444; background: #fee2e2; }

        .max-w-sm { max-width: 320px; }
        .text-xs { font-size: 11px; }
        .text-muted { color: #6b7280; }
        .truncate-2 {
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
            overflow: hidden; text-overflow: ellipsis;
        }

        .btn-danger { background: #ef4444; border-color: #ef4444; color: #fff; }
        .btn-danger:hover { background: #dc2626; border-color: #dc2626; }

        /* View toggle */
        .view-toggle { display: flex; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
        .view-btn { padding: 4px 10px; border: none; background: #fff; font-size: 14px; cursor: pointer; color: #6b7280; }
        .view-btn.active { background: #4f46e5; color: #fff; }
        .view-btn:hover:not(.active) { background: #f3f4f6; }

        /* Package card grid */
        .pkg-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 16px; padding: 4px 0 8px;
        }
        .pkg-card {
            border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;
            display: flex; flex-direction: column;
            transition: box-shadow .15s, transform .15s;
        }
        .pkg-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); transform: translateY(-2px); }
        .pkg-inactive { opacity: 0.6; }
        .pkg-img { position: relative; height: 140px; background: #f1f5f9; overflow: hidden; }
        .pkg-img img { width: 100%; height: 100%; object-fit: cover; }
        .pkg-img-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 3rem; color: #cbd5e1; }
        .pkg-status-badge {
            position: absolute; top: 8px; right: 8px;
            font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px;
            background: #fee2e2; color: #991b1b;
        }
        .pkg-status-badge.active { background: #d1fae5; color: #065f46; }
        .pkg-cat-badge {
            position: absolute; top: 8px; left: 8px;
            font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px;
            background: rgba(0,0,0,.45); color: #fff; backdrop-filter: blur(4px);
        }
        .pkg-body { padding: 12px 14px; flex: 1; }
        .pkg-title { font-size: 14px; font-weight: 700; color: #111827; margin: 0 0 4px; line-height: 1.3; }
        .pkg-desc {
            font-size: 11px; color: #6b7280; margin: 0 0 8px;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .pkg-meta { display: flex; flex-wrap: wrap; gap: 6px; }
        .pkg-meta span { font-size: 11px; color: #374151; background: #f3f4f6; padding: 2px 7px; border-radius: 6px; }
        .pkg-footer {
            display: flex; align-items: center; justify-content: space-between;
            padding: 10px 14px; border-top: 1px solid #f1f5f9; background: #fafafa;
        }
        .pkg-price { font-size: 16px; font-weight: 800; color: #4f46e5; }
        .pkg-actions { display: flex; gap: 6px; }

        @media (max-width: 768px) {
            .form-grid-2, .form-grid-3 { grid-template-columns: 1fr; }
            .col-span-2 { grid-column: span 1; }
            .pkg-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 480px) {
            .pkg-grid { grid-template-columns: 1fr; }
        }
    `]
})
export class PackagesComponent implements OnInit {
    private api = inject(ApiService);
    private fb = inject(FormBuilder);
    private toast = inject(ToastService);

    items = signal<any[]>([]);
    total = signal(0);
    page = signal(1);
    limit = signal(10);
    search = signal('');
    loading = signal(false);
    saving = signal(false);
    editingId = signal<number | null>(null);
    editing = () => this.editingId() !== null;
    itineraryDays = signal<ItineraryDay[]>([]);
    uploadingImage = signal(false);
    packageHotels = signal<PackageHotel[]>([]);
    packageCars = signal<PackageCar[]>([]);
    viewMode = signal<'table' | 'grid'>('table');

    totalPages = () => Math.max(1, Math.ceil(this.total() / this.limit()));

    form: FormGroup = this.fb.group({
        title:           ['', Validators.required],
        category:        ['Individual / Family', Validators.required],
        price:           [0, [Validators.required, Validators.min(0)]],
        duration_days:   [1, [Validators.required, Validators.min(1)]],
        duration_nights: [0, [Validators.required, Validators.min(0)]],
        image_url:       [''],
        description:     [''],
        inclusions:      [''],
        exclusions:      [''],
        is_active:       [true]
    });

    ngOnInit() {
        this.fetch();
    }

    fetch() {
        this.loading.set(true);
        this.api.listPackages({
            q: this.search(),
            page: this.page(),
            limit: this.limit()
        }).subscribe({
            next: (res) => {
                this.items.set(res.items);
                this.total.set(res.total);
                this.loading.set(false);
            },
            error: (err) => {
                this.loading.set(false);
                this.toast.error('Failed to load packages: ' + (err.error?.error || err.message));
            }
        });
    }

    addItineraryDay() {
        const nextDay = this.itineraryDays().length + 1;
        this.itineraryDays.update(days => [
            ...days,
            { day: nextDay, title: '', description: '' }
        ]);
    }

    removeItineraryDay(index: number) {
        this.itineraryDays.update(days => {
            const copy = days.filter((_, i) => i !== index);
            // Re-index day numbers
            return copy.map((d, i) => ({ ...d, day: i + 1 }));
        });
    }

    addPackageHotel() {
        this.packageHotels.update(hotels => [
            ...hotels,
            { hotel_name: '', room_type: '', meal_plan: '', num_nights: 1 }
        ]);
    }

    removePackageHotel(index: number) {
        this.packageHotels.update(hotels => hotels.filter((_, i) => i !== index));
    }

    addPackageCar() {
        this.packageCars.update(cars => [
            ...cars,
            { car_type: '', num_days: 1, notes: '' }
        ]);
    }

    removePackageCar(index: number) {
        this.packageCars.update(cars => cars.filter((_, i) => i !== index));
    }

    onImageUpload(ev: Event) {
        const file = (ev.target as HTMLInputElement).files?.[0];
        if (!file) return;

        this.uploadingImage.set(true);
        this.api.uploadPackageImage(file).subscribe({
            next: (res) => {
                this.uploadingImage.set(false);
                this.form.patchValue({ image_url: res.url });
                this.toast.success('Image uploaded successfully.');
            },
            error: (err) => {
                this.uploadingImage.set(false);
                this.toast.error('Image upload failed: ' + (err.error?.error || err.message));
            }
        });
    }

    onSearchChange(val: string) {
        this.search.set(val);
        this.page.set(1);
        this.fetch();
    }

    onLimitChange(val: number) {
        this.limit.set(val);
        this.page.set(1);
        this.fetch();
    }

    prevPage() {
        if (this.page() > 1) {
            this.page.update(p => p - 1);
            this.fetch();
        }
    }

    nextPage() {
        if (this.page() < this.totalPages()) {
            this.page.update(p => p + 1);
            this.fetch();
        }
    }

    edit(p: any) {
        this.editingId.set(p.id);
        this.form.patchValue({
            title: p.title,
            category: p.category || 'Individual / Family',
            price: p.price,
            duration_days: p.duration_days,
            duration_nights: p.duration_nights,
            image_url: p.image_url || '',
            description: p.description || '',
            inclusions: p.inclusions || '',
            exclusions: p.exclusions || '',
            is_active: !!p.is_active
        });

        // Set itinerary days
        let rawItin = p.itinerary;
        if (typeof rawItin === 'string') {
            try { rawItin = JSON.parse(rawItin); } catch { rawItin = []; }
        }
        this.itineraryDays.set(rawItin || []);

        // Set hotels
        let rawHotels = p.hotels;
        if (typeof rawHotels === 'string') {
            try { rawHotels = JSON.parse(rawHotels); } catch { rawHotels = []; }
        }
        this.packageHotels.set(rawHotels || []);

        // Set cars
        let rawCars = p.cars;
        if (typeof rawCars === 'string') {
            try { rawCars = JSON.parse(rawCars); } catch { rawCars = []; }
        }
        this.packageCars.set(rawCars || []);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    cancelEdit() {
        this.editingId.set(null);
        this.form.reset({
            category: 'Individual / Family',
            price: 0,
            duration_days: 1,
            duration_nights: 0,
            is_active: true
        });
        this.itineraryDays.set([]);
        this.packageHotels.set([]);
        this.packageCars.set([]);
    }

    save() {
        if (this.form.invalid) return;
        this.saving.set(true);

        const payload = {
            ...this.form.value,
            itinerary: this.itineraryDays(),
            hotels: this.packageHotels(),
            cars: this.packageCars()
        };

        const obs = this.editingId()
            ? this.api.updatePackage(this.editingId()!, payload)
            : this.api.createPackage(payload);

        obs.subscribe({
            next: () => {
                this.saving.set(false);
                this.toast.success(this.editingId() ? 'Package updated.' : 'Package saved.');
                this.cancelEdit();
                this.fetch();
            },
            error: (err) => {
                this.saving.set(false);
                this.toast.error('Failed to save package: ' + (err.error?.error || err.message));
            }
        });
    }

    deletePkg(id: number) {
        if (!confirm('Are you sure you want to delete this package? Leads and bookings linked to it will retain their data but lose the connection.')) {
            return;
        }
        this.api.deletePackage(id).subscribe({
            next: () => {
                this.toast.success('Package deleted.');
                if (this.editingId() === id) {
                    this.cancelEdit();
                }
                this.fetch();
            },
            error: (err) => {
                this.toast.error('Failed to delete package: ' + (err.error?.error || err.message));
            }
        });
    }
}
