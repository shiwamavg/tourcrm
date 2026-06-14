import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
    selector: 'app-quotation-detail',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <a routerLink="/quotations" class="btn-ghost" style="margin-bottom:16px;display:inline-flex;align-items:center;gap:6px;">← Quotations</a>

    @if (q()) {
    <div class="page-header">
        <div>
            <h1>{{ q().quotation_number }}</h1>
            <p class="text-muted">{{ q().destination_text }} · {{ fmtDate(q().trip_start_date) }} → {{ fmtDate(q().trip_end_date) }}</p>
        </div>
        <div class="flex gap-2">
            <span class="badge badge-{{ q().status }}" style="padding:6px 14px;font-size:13px;">{{ q().status }}</span>
            @if (q().status === 'draft' || q().status === 'sent') {
                <button class="btn-outline" (click)="setStatus('accepted')">✓ Accept</button>
                <button class="btn-outline" (click)="setStatus('rejected')">✗ Reject</button>
            }
            @if (q().status === 'accepted') {
                <button class="btn-primary" (click)="createBooking()">📅 Create Booking</button>
            }
        </div>
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;align-items:start;">
        <div>
            <!-- Hotels -->
            @if (q().hotels?.length) {
            <div class="card mb-4">
                <div class="card-header"><h2>🏨 Hotels</h2></div>
                <div class="card-body" style="padding:0;">
                    @for (h of q().hotels; track h.id) {
                        <div style="padding:14px 20px;border-bottom:1px solid var(--border);">
                            <div class="flex-between">
                                <div>
                                    <div style="font-weight:600;">{{ h.hotel_name }}</div>
                                    <div class="text-muted text-sm">{{ h.room_type }} · {{ h.meal_plan.replace('_','+') }} · {{ h.num_nights }} nights × {{ h.num_rooms }} room(s)</div>
                                </div>
                                <div style="font-weight:600;">₹{{ fmt(h.line_total) }}</div>
                            </div>
                        </div>
                    }
                </div>
            </div>
            }

            <!-- Cars -->
            @if (q().cars?.length) {
            <div class="card mb-4">
                <div class="card-header"><h2>🚗 Transport</h2></div>
                <div class="card-body" style="padding:0;">
                    @for (c of q().cars; track c.id) {
                        <div style="padding:14px 20px;border-bottom:1px solid var(--border);">
                            <div class="flex-between">
                                <div>
                                    <div style="font-weight:600;">{{ c.car_type_name }} ({{ c.car_class }})</div>
                                    <div class="text-muted text-sm">{{ c.num_days }} days · {{ c.km_limit_per_day }} km/day</div>
                                </div>
                                <div style="font-weight:600;">₹{{ fmt(c.line_total) }}</div>
                            </div>
                        </div>
                    }
                </div>
            </div>
            }

            <!-- Misc -->
            @if (q().misc?.length) {
            <div class="card mb-4">
                <div class="card-header"><h2>📋 Other Charges</h2></div>
                <div class="card-body" style="padding:0;">
                    @for (m of q().misc; track m.id) {
                        <div style="padding:10px 20px;border-bottom:1px solid var(--border);">
                            <div class="flex-between">
                                <span>{{ m.label }}</span>
                                <span style="font-weight:600;">₹{{ fmt(m.amount) }}</span>
                            </div>
                        </div>
                    }
                </div>
            </div>
            }
        </div>

        <!-- Right: totals + meta -->
        <div>
            <div class="card mb-4">
                <div class="card-header"><h2>💰 Price Breakdown</h2></div>
                <div class="card-body" style="padding:0;">
                    <div class="summary-table" style="background:transparent;">
                        <div class="summary-row"><span>Hotels</span><span>₹{{ fmt(q().hotel_total) }}</span></div>
                        <div class="summary-row"><span>Transport</span><span>₹{{ fmt(q().car_total) }}</span></div>
                        <div class="summary-row"><span>Flights</span><span>₹{{ fmt(q().flight_total) }}</span></div>
                        <div class="summary-row"><span>Other</span><span>₹{{ fmt(q().misc_total) }}</span></div>
                        <div class="summary-row subtotal"><span>Subtotal</span><span>₹{{ fmt(q().subtotal) }}</span></div>
                        <div class="summary-row"><span>Markup ({{ q().markup_pct }}%)</span><span>₹{{ fmt(q().markup_amount) }}</span></div>
                        <div class="summary-row"><span>GST ({{ q().gst_pct }}%)</span><span>₹{{ fmt(q().gst_amount) }}</span></div>
                        <div class="summary-row grand-total"><span>Grand Total</span><span>₹{{ fmt(q().grand_total) }}</span></div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h2>Trip Info</h2></div>
                <div class="card-body">
                    <div class="form-group"><label class="text-muted text-sm">Lead</label><p>{{ q().lead_name }} · {{ q().lead_phone }}</p></div>
                    <div class="form-group"><label class="text-muted text-sm">Adults</label><p>{{ q().adults }}</p></div>
                    <div class="form-group"><label class="text-muted text-sm">Nights</label><p>{{ q().nights }}</p></div>
                    <div class="form-group"><label class="text-muted text-sm">Valid Till</label><p>{{ fmtDate(q().valid_till) }}</p></div>
                    @if (q().terms_notes) {
                        <div class="form-group"><label class="text-muted text-sm">Terms</label><p style="white-space:pre-wrap;font-size:13px;">{{ q().terms_notes }}</p></div>
                    }
                </div>
            </div>
        </div>
    </div>
    }
    `
})
export class QuotationDetailComponent implements OnInit {
    private api = inject(ApiService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    q = signal<any>(null);

    ngOnInit() {
        this.api.getQuotation(this.route.snapshot.paramMap.get('id')!).subscribe(q => this.q.set(q));
    }

    setStatus(status: string) {
        this.api.updateQuotationStatus(this.q().id, status).subscribe(() => {
            this.q.update(q => ({ ...q, status }));
        });
    }

    createBooking() {
        if (confirm('Create booking from this quotation?')) {
            this.api.createBooking({ quotation_id: this.q().id }).subscribe(b => {
                this.router.navigate(['/bookings', b.id]);
            });
        }
    }

    fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'; }
    fmt(n: any) { return parseFloat(n||0).toLocaleString('en-IN', { minimumFractionDigits: 0 }); }
}
