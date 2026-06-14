import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { PdfService } from '../../core/services/pdf.service';
import { Quotation, QuotationStatus, AgencySettings } from '../../core/models';
import { DaywiseItineraryComponent } from './daywise-itinerary.component';
import { FollowupTimelineComponent } from '../../shared/components/followup-timeline.component';

@Component({
    selector: 'app-quotation-detail',
    standalone: true,
    imports: [CommonModule, RouterLink, DatePipe, DecimalPipe, DaywiseItineraryComponent, FollowupTimelineComponent],
    template: `
    @if (loading()) {
        <div class="card text-center"><span class="spinner"></span> Loading…</div>
    } @else if (!quotation()) {
        <div class="card">
            <h2>Quotation not found</h2>
            <a routerLink="/quotations" class="btn">← Back to list</a>
        </div>
    } @else {
        <div class="page-header">
            <div>
                <h1>
                    {{ quotation()!.quotation_number }}
                    <span class="badge" [class]="'badge-' + quotation()!.status">{{ quotation()!.status }}</span>
                </h1>
                <p>
                    Created {{ quotation()!.created_at | date:'medium' }} by {{ quotation()!.created_by_name }}
                </p>
            </div>
            <div class="flex">
                <a routerLink="/quotations" class="btn">← Back</a>
                <a [routerLink]="['/quotations', quotation()!.id, 'edit']" class="btn">✏️ Edit</a>
                <button class="btn btn-primary" (click)="downloadPdf()" [disabled]="generating()">
                    @if (generating()) { <span class="spinner"></span> Generating… }
                    @else { 📄 Download PDF }
                </button>
                @if (quotation()!.status === 'draft') {
                    <button class="btn btn-success" (click)="setStatus('sent')">📧 Mark as Sent</button>
                }
                @if (quotation()!.status === 'sent') {
                    <button class="btn btn-success" (click)="setStatus('accepted')">✓ Mark Accepted</button>
                    <button class="btn btn-danger"  (click)="setStatus('rejected')">✕ Mark Rejected</button>
                }
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="label">Customer</div>
                <div class="value" style="font-size:1.1rem">{{ quotation()!.customer_name }}</div>
                <div class="text-muted">{{ quotation()!.customer_phone }} • {{ quotation()!.customer_email || '—' }}</div>
            </div>
            <div class="stat-card">
                <div class="label">Destination & Dates</div>
                <div class="value" style="font-size:1.1rem">{{ quotation()!.destination_name || quotation()!.destination_text || '—' }}</div>
                <div class="text-muted">
                    {{ quotation()!.trip_start_date | date:'mediumDate' }} →
                    {{ quotation()!.trip_end_date | date:'mediumDate' }}
                    ({{ quotation()!.nights }} nights)
                </div>
            </div>
            <div class="stat-card">
                <div class="label">Pax</div>
                <div class="value" style="font-size:1.1rem">{{ quotation()!.adults }} adults</div>
                <div class="text-muted">
                    @if (quotation()!.children_below_5) { {{ quotation()!.children_below_5 }} child(ren) <5y }
                    @if (quotation()!.children_above_5) { {{ quotation()!.children_above_5 }} child(ren) >5y }
                    • {{ quotation()!.num_rooms }} room(s)
                </div>
            </div>
            <div class="stat-card success">
                <div class="label">Grand Total</div>
                <div class="value">₹{{ quotation()!.grand_total | number:'1.0-0' }}</div>
            </div>
        </div>

        <!-- ── Tabs ─────────────────────────────────────── -->
        <div class="tab-bar">
            <button class="tab-btn" [class.active]="activeTab() === 'details'" (click)="activeTab.set('details')">Details</button>
            <button class="tab-btn" [class.active]="activeTab() === 'daywise'" (click)="activeTab.set('daywise')">📅 Daywise Plan</button>
            <button class="tab-btn" [class.active]="activeTab() === 'journey'" (click)="activeTab.set('journey')">👤 Customer Journey</button>
        </div>

        @if (activeTab() === 'daywise') {
            <app-daywise-itinerary
                [quoteId]="quotation()!.id"
                [startDate]="quotation()!.trip_start_date"
                [endDate]="quotation()!.trip_end_date"
                [leadId]="quotation()!.lead_id || 0"
                [destinationId]="quotation()!.destination_id || 0"
                [quoteHotels]="quotation()!.hotels"
                [quoteCars]="quotation()!.cars" />
        }

        @if (activeTab() === 'journey') {
            <div class="card">
                <app-followup-timeline [quotationId]="quotation()!.id" />
            </div>
        }

        @if (activeTab() === 'details') {
        @if (quotation()!.hotels.length) {
            <div class="card">
                <h2>🏨 Hotels</h2>
                <div class="table-wrap" style="box-shadow:none">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Hotel</th><th>Room</th><th>Meal</th>
                                <th class="num">Nights</th><th class="num">Rooms</th>
                                <th class="num">Rate/night</th><th class="num">Special</th>
                                <th class="num">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (h of quotation()!.hotels; track h.id) {
                                <tr>
                                    <td>
                                        <strong>{{ h.hotel_name }}</strong>
                                        @if (h.star_rating) { <small> {{ h.star_rating }}★</small> }
                                    </td>
                                    <td>{{ h.room_type }}</td>
                                    <td>{{ formatMeal(h.meal_plan) }}</td>
                                    <td class="num">{{ h.num_nights }}</td>
                                    <td class="num">{{ h.num_rooms }}</td>
                                    <td class="num">₹{{ h.charge_per_night | number:'1.0-0' }}</td>
                                    <td class="num">
                                        @if (h.special_charges) {
                                            ₹{{ h.special_charges | number:'1.0-0' }}
                                            @if (h.special_charges_note) { <br><small class="text-muted">{{ h.special_charges_note }}</small> }
                                        }
                                    </td>
                                    <td class="num"><strong>₹{{ h.line_total | number:'1.0-0' }}</strong></td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        }

        @if (quotation()!.cars.length) {
            <div class="card">
                <h2>🚗 Transport</h2>
                <div class="table-wrap" style="box-shadow:none">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Car</th><th>Class</th>
                                <th class="num">Days</th><th class="num">Rate/day</th>
                                <th class="num">KM limit</th>
                                <th class="num">Extra KM</th>
                                <th class="num">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (c of quotation()!.cars; track c.id) {
                                <tr>
                                    <td><strong>{{ c.car_type_name }}</strong></td>
                                    <td>{{ c.car_class }}</td>
                                    <td class="num">{{ c.num_days }}</td>
                                    <td class="num">₹{{ c.charge_per_day | number:'1.0-0' }}</td>
                                    <td class="num">{{ c.km_limit_per_day }} km</td>
                                    <td class="num">
                                        {{ c.estimated_extra_km }} km × ₹{{ c.extra_charge_per_km | number:'1.0-2' }}
                                        <br><small class="text-muted">= ₹{{ c.extra_km_charges | number:'1.0-0' }}</small>
                                    </td>
                                    <td class="num"><strong>₹{{ c.line_total | number:'1.0-0' }}</strong></td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        }

        @if (quotation()!.flights.length) {
            <div class="card">
                <h2>✈ Flights</h2>
                <div class="table-wrap" style="box-shadow:none">
                    <table class="data-table">
                        <thead>
                            <tr><th>Airline</th><th>Route</th><th>Date</th>
                                <th class="num">Adult fare</th><th class="num">Child fare</th>
                                <th class="num">Total</th></tr>
                        </thead>
                        <tbody>
                            @for (f of quotation()!.flights; track f.id) {
                                <tr>
                                    <td>{{ f.airline }}</td>
                                    <td>{{ f.route }}</td>
                                    <td>{{ f.flight_date | date:'mediumDate' }}</td>
                                    <td class="num">₹{{ f.fare_per_adult | number:'1.0-0' }}</td>
                                    <td class="num">₹{{ f.fare_per_child | number:'1.0-0' }}</td>
                                    <td class="num"><strong>₹{{ f.line_total | number:'1.0-0' }}</strong></td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        }

        @if (quotation()!.misc.length) {
            <div class="card">
                <h2>📋 Other Charges</h2>
                <div class="table-wrap" style="box-shadow:none">
                    <table class="data-table">
                        <thead><tr><th>Label</th><th class="num">Amount</th></tr></thead>
                        <tbody>
                            @for (m of quotation()!.misc; track m.id) {
                                <tr><td>{{ m.label }}</td><td class="num">₹{{ m.amount | number:'1.0-0' }}</td></tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        }

        <div class="card">
            <h2>💰 Grand Total Breakdown</h2>
            <div class="summary-table">
                @if (quotation()!.hotel_total > 0) {
                    <div class="summary-row"><span>Hotels</span><span>₹{{ quotation()!.hotel_total | number:'1.0-0' }}</span></div>
                }
                @if (quotation()!.car_total > 0) {
                    <div class="summary-row"><span>Transport</span><span>₹{{ quotation()!.car_total | number:'1.0-0' }}</span></div>
                }
                @if (quotation()!.flight_total > 0) {
                    <div class="summary-row"><span>Flights</span><span>₹{{ quotation()!.flight_total | number:'1.0-0' }}</span></div>
                }
                @if (quotation()!.misc_total > 0) {
                    <div class="summary-row"><span>Miscellaneous</span><span>₹{{ quotation()!.misc_total | number:'1.0-0' }}</span></div>
                }
                <div class="summary-row subtotal"><span>Subtotal</span><span>₹{{ quotation()!.subtotal | number:'1.0-0' }}</span></div>
                <div class="summary-row"><span>Markup ({{ quotation()!.markup_pct }}%)</span><span>₹{{ quotation()!.markup_amount | number:'1.0-0' }}</span></div>
                <div class="summary-row"><span>GST ({{ quotation()!.gst_pct }}%)</span><span>₹{{ quotation()!.gst_amount | number:'1.0-0' }}</span></div>
                <div class="summary-row grand-total"><span>Grand Total</span><span>₹{{ quotation()!.grand_total | number:'1.0-0' }}</span></div>
            </div>
        </div>

        @if (quotation()!.terms_notes) {
            <div class="card">
                <h2>Terms & Notes</h2>
                <pre style="white-space:pre-wrap; font-family:inherit; background:var(--gray-50); padding:12px; border-radius:6px">{{ quotation()!.terms_notes }}</pre>
            </div>
        }
        }


    }
    `
})
export class QuotationDetailComponent implements OnInit {
    private api = inject(ApiService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private pdf = inject(PdfService);

    loading = signal(true);
    quotation = signal<Quotation | null>(null);
    error = signal<string | null>(null);

    /** Agency settings needed for the PDF header/footer (bank, GST, contact, etc.) */
    settings = signal<AgencySettings | null>(null);
    /** Disable the PDF button while a file is being generated. */
    generating = signal(false);
    generatingItinerary = signal(false);
    activeTab = signal<'details' | 'daywise' | 'journey'>('details');



    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) { this.loading.set(false); return; }
        // Load quotation + daywise itinerary + settings in parallel
        this.api.getQuotation(id).subscribe({
            next: q => {
                this.quotation.set(q);
                this.api.getDaywiseItinerary(q.id).subscribe({
                    next: items => this.quotation.update(v => v ? { ...v, daywise_itinerary: items } : v),
                    error: () => {}
                });
                this.loading.set(false);
            },
            error: (err) => { this.error.set(err?.error?.error || 'Failed to load'); this.loading.set(false); }
        });
        this.api.getSettings().subscribe({
            next: s => this.settings.set(s),
            error: ()  => this.settings.set(null)
        });
    }

    /** Generate and download a PDF for the current quotation. */
    downloadPdf() {
        const q = this.quotation();
        if (!q) return;
        this.generating.set(true);
        setTimeout(() => {
            try {
                const s = this.settings() ?? {} as any;
                this.pdf.generateQuotationPdf(q, s);
            } catch (e) {
                this.error.set('PDF generation failed: ' + (e as Error).message);
            } finally {
                this.generating.set(false);
            }
        }, 50);
    }

    setStatus(status: QuotationStatus) {
        const q = this.quotation();
        if (!q) return;
        this.api.updateQuotationStatus(q.id, status).subscribe({
            next: updated => this.quotation.set(updated),
            error: (err) => this.error.set(err?.error?.error || 'Failed to update status')
        });
    }

    formatMeal(m: string): string {
        return ({ none: 'No meals', breakfast: 'Breakfast', breakfast_dinner: 'Breakfast + Dinner', all_inclusive: 'All Inclusive' } as any)[m] || m;
    }

}
