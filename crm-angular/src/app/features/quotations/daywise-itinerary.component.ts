import { Component, input, output, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

@Component({
    selector: 'app-daywise-itinerary',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="card" [style.box-shadow]="isBuilder() ? 'none' : ''" [style.padding]="isBuilder() ? '0' : ''">
        <div class="section-header">
            <h2 style="margin:0;border:none;padding:0">📅 Daywise Itinerary Plan</h2>
            <button class="btn btn-outline btn-sm" (click)="addRow()">+ Add Day</button>
        </div>

        @if (days().length === 0) {
            <div class="empty">No daywise entries yet. Click "+ Add Day" to start planning.</div>
        }

        <div class="day-list">
            @for (d of days(); track d._key; let i = $index) {
                <div class="day-card" [style.border]="isBuilder() ? '1px solid #e5e7eb' : ''">
                    <div class="day-card-header">
                        <strong>Day {{ d.day }}</strong>
                        <span class="day-name">{{ d.day_name }}</span>
                        <button class="btn-remove" (click)="removeRow(i)">✕</button>
                    </div>
                    <div class="day-grid">
                        <div class="field">
                            <label>Date</label>
                            <input type="date" [(ngModel)]="d.date" (change)="onDateChange(d)" />
                        </div>
                        <div class="field">
                            <label>Itinerary Name</label>
                            <select [(ngModel)]="d._itinerary_id" (change)="onItinerarySelect(d)">
                                <option value="">— Select itinerary —</option>
                                @for (it of itineraries(); track it.id) {
                                    <option [value]="it.id">{{ it.title }}</option>
                                }
                            </select>
                        </div>
                        <div class="field">
                            <label>Hotel Tonight</label>
                            <select [ngModel]="d.hotel_name" (ngModelChange)="onHotelSelect(d, $event)">
                                <option value="">— Select hotel —</option>
                                @for (h of quoteHotels(); track h.id) {
                                    <option [value]="h.hotel_name">{{ h.hotel_name }} ({{ h.room_type }})</option>
                                }
                            </select>
                        </div>
                        <div class="field">
                            <label>Vehicle Type</label>
                            <select [(ngModel)]="d.vehicle_type">
                                <option value="">— Select vehicle —</option>
                                @for (c of quoteCars(); track c.id) {
                                    <option [value]="c.car_type_name">{{ c.car_type_name }} ({{ c.car_class }})</option>
                                }
                                @if (quoteCars().length === 0) {
                                    @for (ct of carTypes(); track ct) {
                                        <option [value]="ct">{{ ct }}</option>
                                    }
                                }
                            </select>
                        </div>
                        <div class="field">
                            <label>Amount (₹)</label>
                            <input type="number" [(ngModel)]="d.amt" min="0" step="1" />
                        </div>
                    </div>
                    <div class="field" style="margin-top:8px">
                        <label>Details</label>
                        <textarea [(ngModel)]="d.details" rows="2" placeholder="Describe the day's plan…"></textarea>
                    </div>
                </div>
            }
        </div>

        @if (days().length > 0) {
            <div class="total-bar">
                <span>Total Days: {{ days().length }}</span>
                <span>Total Amount: ₹{{ totalAmt() | number:'1.0-0' }}</span>
                @if (!isBuilder()) {
                    <button class="btn" (click)="saveAll()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save All' }}</button>
                }
            </div>
        }
    </div>
    `,
    styles: [`
        .section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
        .btn { padding:8px 12px; border:none; border-radius:6px; background:#0f766e; color:#fff; cursor:pointer; font-size:13px; }
        .btn.btn-outline { background:transparent; border:1px solid #0f766e; color:#0f766e; }
        .btn-remove { background:none; border:none; color:#b91c1c; font-size:16px; cursor:pointer; padding:0 4px; }
        .day-list { display:flex; flex-direction:column; gap:10px; }
        .day-card { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:12px; }
        .day-card-header { display:flex; align-items:center; gap:10px; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #f3f4f6; }
        .day-name { font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; }
        .day-grid { display:grid; grid-template-columns:1fr 1.5fr 1.5fr 1.2fr 0.8fr; gap:8px; }
        .field { display:flex; flex-direction:column; gap:3px; }
        .field label { font-size:11px; color:#6b7280; text-transform:uppercase; }
        .field input, .field select, .field textarea { padding:6px 8px; border:1px solid #d1d5db; border-radius:4px; font-size:13px; }
        .total-bar { display:flex; align-items:center; gap:16px; margin-top:14px; padding:10px 0; border-top:1px solid #e5e7eb; font-size:14px; font-weight:600; }
        .empty { color:#9ca3af; text-align:center; padding:24px; }
    `]
})
export class DaywiseItineraryComponent implements OnInit {
    private api = inject(ApiService);
    private toast = inject(ToastService);

    quoteId = input.required<number>();
    startDate = input<string>();
    endDate = input<string>();
    leadId = input<number>(0);
    destinationId = input<number>(0);
    quoteHotels = input<any[]>([]);
    quoteCars = input<any[]>([]);
    isBuilder = input<boolean>(false);
    initialDays = input<any[]>([]);
    daysChange = output<any[]>();

    saving = signal(false);
    days = signal<any[]>([]);
    itineraries = signal<any[]>([]);
    carRates = signal<any[]>([]);
    carTypes = signal<string[]>([]);

    totalAmt = computed(() => this.days().reduce((s, d) => s + (Number(d.amt) || 0), 0));

    constructor() {
        effect(() => {
            this.daysChange.emit(this.days());
        });
    }

    ngOnInit() {
        const token = localStorage.getItem('crm_token') || '';
        const headers = { Authorization: 'Bearer ' + token };
        // Load car types, itineraries, car rates in parallel, then load daywise data
        Promise.all([
            fetch('http://localhost:3000/api/itineraries', { headers }).then(r => r.json()).catch(() => []),
            fetch('http://localhost:3000/api/quotations/master/car-rates?destination_id=' + this.destinationId(), { headers }).then(r => r.json()).catch(() => []),
            fetch('http://localhost:3000/api/admin/car-types', { headers }).then(r => r.json()).catch(() => ({}))
        ]).then(([its, rates, ctData]) => {
            if (Array.isArray(its)) this.itineraries.set(its);
            if (Array.isArray(rates)) this.carRates.set(rates);
            if (ctData?.value) this.carTypes.set(ctData.value.map((x: any) => x.name));
            this.load();
        });
    }

    private baseUrl = 'http://localhost:3000/api/daywise-itinerary';

    load() {
        const init = this.initialDays();
        if (init && init.length > 0) {
            const its = this.itineraries();
            const existing = init.map(d => {
                const match = its.find(i => i.title === d.itenary_name);
                return {
                    ...d,
                    date: d.date ? d.date.substring(0, 10) : '',
                    _itinerary_id: match ? String(match.id) : (d._itinerary_id || ''),
                };
            });
            this.days.set(existing);
            return;
        }

        const qid = this.quoteId();
        if (!qid) {
            this.days.set(this.fillMissingDays([]));
            return;
        }
        fetch(`${this.baseUrl}?quote_id=${qid}`, {
            headers: { Authorization: 'Bearer ' + (localStorage.getItem('crm_token') || '') }
        })
            .then(r => r.json())
            .then((data: any[]) => {
                const its = this.itineraries();
                const existing = Array.isArray(data) ? data.map(d => {
                    const match = its.find(i => i.title === d.itenary_name);
                    return {
                        ...d,
                        date: d.date ? d.date.substring(0, 10) : '',
                        _itinerary_id: match ? String(match.id) : '',
                    };
                }) : [];
                const merged = this.fillMissingDays(existing);
                this.days.set(merged);
            })
            .catch(() => this.days.set(this.fillMissingDays([])));
    }

    private fillMissingDays(existing: any[]): any[] {
        const sd = this.startDate();
        const ed = this.endDate();
        if (!sd || !ed) return existing;
        const start = new Date(sd);
        const end = new Date(ed);
        const diff = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
        if (diff < 1) return existing;
        const qid = this.quoteId();
        const lid = this.leadId();
        const result: any[] = [];
        for (let i = 0; i < diff; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const dayNum = i + 1;
            const found = existing.find(e => e.day === dayNum || e.date === dateStr);
            if (found) {
                result.push(found);
            } else {
                result.push({
                    _key: Date.now() + Math.random() + i,
                    quote_id: qid,
                    company_id: 0,
                    itenary_name: '',
                    hotel_name: '',
                    date: dateStr,
                    day: dayNum,
                    day_name: DAY_NAMES[d.getDay()],
                    vehicle_type: '',
                    lead_id: lid,
                    amt: 0,
                    details: '',
                    _itinerary_id: '',
                    _isNew: true
                });
            }
        }
        return result;
    }

    addRow() {
        const current = this.days();
        const dayNum = current.length + 1;
        const sd = this.startDate();
        let dateStr = '';
        let dayName = '';
        if (sd) {
            const d = new Date(sd);
            d.setDate(d.getDate() + dayNum - 1);
            dateStr = d.toISOString().split('T')[0];
            dayName = DAY_NAMES[d.getDay()];
        }
        this.days.update(list => [...list, {
            _key: Date.now() + Math.random(),
            quote_id: this.quoteId(),
            company_id: 0,
            itenary_name: '',
            hotel_name: '',
            date: dateStr,
            day: dayNum,
            day_name: dayName,
            vehicle_type: '',
            lead_id: this.leadId(),
            amt: 0,
            details: '',
            _itinerary_id: '',
            _isNew: true
        }]);
    }

    removeRow(i: number) {
        const item = this.days()[i];
        if (!item._isNew && item.id && !this.isBuilder()) {
            if (!confirm('Delete this day entry?')) return;
            fetch(`${this.baseUrl}/${item.id}`, {
                method: 'DELETE',
                headers: { Authorization: 'Bearer ' + (localStorage.getItem('crm_token') || '') }
            }).catch(() => {});
        }
        this.days.update(list => list.filter((_, idx) => idx !== i));
    }

    onItinerarySelect(d: any) {
        const it = this.itineraries().find(i => i.id === Number(d._itinerary_id));
        if (it) {
            d.itenary_name = it.title;
            d.details = it.notes || it.details || '';
        } else {
            d.itenary_name = '';
            d.details = '';
        }
    }

    onHotelSelect(d: any, hotelName: string) {
        d.hotel_name = hotelName;
        const h = this.quoteHotels().find(h => h.hotel_name === hotelName);
        if (h) {
            d.amt = Number(h.charge_per_night) || 0;
        }
    }

    onDateChange(d: any) {
        if (!d.date) return;
        const dt = new Date(d.date);
        d.day_name = DAY_NAMES[dt.getDay()];
        // Re-number days sequentially from start date
        const sd = this.startDate();
        if (sd) {
            const start = new Date(sd);
            const diff = Math.round((dt.getTime() - start.getTime()) / 86400000) + 1;
            if (diff > 0) d.day = diff;
        }
    }

    saveAll() {
        this.saving.set(true);
        const qid = this.quoteId();
        const token = localStorage.getItem('crm_token') || '';
        const headers = {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
        };
        const promises = this.days().map(d => {
            const body = {
                quote_id: qid,
                itenary_name: d.itenary_name || '',
                hotel_name: d.hotel_name || '',
                date: d.date || new Date().toISOString().split('T')[0],
                day: d.day || 1,
                day_name: d.day_name || '',
                vehicle_type: d.vehicle_type || '',
                lead_id: d.lead_id || 0,
                amt: Number(d.amt) || 0,
                details: d.details || ''
            };
            if (d._isNew) {
                return fetch(this.baseUrl, { method: 'POST', headers, body: JSON.stringify(body) }).then(r => r.json());
            } else {
                return fetch(`${this.baseUrl}/${d.id}`, { method: 'PUT', headers, body: JSON.stringify(body) }).then(r => r.json());
            }
        });

        Promise.all(promises)
            .then(() => {
                this.saving.set(false);
                this.toast.success('All saved');
                this.load();
            })
            .catch(() => {
                this.saving.set(false);
                this.toast.error('Failed to save');
            });
    }
}
