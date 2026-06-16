import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ReminderService } from '../../core/services/competitor-features.service';

interface CalendarBooking {
    id: number;
    booking_number: string;
    customer_name: string;
    status: string;
    payment_status: string;
    trip_start_date: string;
    trip_end_date: string;
    total_amount: number;
    adults: number;
    destination_text: string;
    tour_title: string;
    category: string;
}

interface CalendarReminder {
    id: number;
    title: string;
    remind_at: string;
    priority: string;
    followup_type: string;
    channel: string;
    assigned_name?: string;
    entity_type?: string;
}

interface CalendarDay {
    date: Date;
    day: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    bookings: CalendarBooking[];
    reminders: CalendarReminder[];
}

@Component({
    selector: 'app-calendar',
    standalone: true,
    imports: [CommonModule, RouterLink, DatePipe],
    template: `
    <div class="page-header">
        <div>
            <h1>📅 Calendar</h1>
            <p>Departures &amp; follow-ups for the month</p>
        </div>
        <div class="flex" style="gap:0.75rem">
            <a routerLink="/bookings" class="btn btn-outline btn-sm">All Bookings</a>
            <a routerLink="/bookings" class="btn btn-primary btn-sm">+ New Booking</a>
        </div>
    </div>

    <!-- Month Navigation -->
    <div class="cal-nav card" style="padding: 14px 20px; margin-bottom: 18px;">
        <button class="btn btn-outline btn-sm" (click)="prevMonth()">← Prev</button>
        <div class="cal-month-title">
            <span class="cal-month-name">{{ monthName() }}</span>
            <span class="cal-year">{{ currentYear() }}</span>
        </div>
        <button class="btn btn-outline btn-sm" (click)="nextMonth()">Next →</button>
        <button class="btn btn-sm" (click)="goToday()" style="margin-left:8px">Today</button>
        <!-- Summary chips -->
        <div class="cal-summary">
            <span class="cal-chip chip-total">{{ calBookings().length }} Departures</span>
            <span class="cal-chip chip-confirmed">{{ confirmedCount() }} Confirmed</span>
            <span class="cal-chip chip-pending">{{ pendingCount() }} Pending</span>
            <span class="cal-chip chip-followup">{{ calReminders().length }} Follow-ups</span>
        </div>
    </div>

    @if (loading()) {
        <div class="card text-center"><span class="spinner"></span> Loading calendar…</div>
    } @else {
        <!-- Calendar Grid -->
        <div class="card cal-card">
            <!-- Day headers -->
            <div class="cal-grid cal-header-row">
                @for (d of dayNames; track d) {
                    <div class="cal-day-header">{{ d }}</div>
                }
            </div>
            <!-- Calendar days -->
            <div class="cal-grid cal-body">
                @for (day of calendarDays(); track day.date.toISOString()) {
                    <div class="cal-cell"
                         [class.other-month]="!day.isCurrentMonth"
                         [class.today]="day.isToday"
                         [class.has-bookings]="day.bookings.length > 0"
                         (click)="openDay(day)">
                        <div class="cal-cell-num">{{ day.day }}</div>
                        @for (bk of day.bookings.slice(0,3); track bk.id) {
                            <a [routerLink]="['/bookings', bk.id]" class="cal-event" [class]="'cat-' + catClass(bk.category)" [title]="bk.customer_name + ' — ' + bk.tour_title">
                                <span class="cal-event-dot"></span>
                                <span class="cal-event-name">{{ bk.customer_name }}</span>
                            </a>
                        }
                        @if (day.bookings.length > 3) {
                            <div class="cal-more">+{{ day.bookings.length - 3 }} more</div>
                        }
                        @for (rm of day.reminders.slice(0,2); track rm.id) {
                            <div class="cal-reminder" [class]="'prio-' + rm.priority" [title]="rm.title">
                                <span class="cal-reminder-icon">🔔</span>
                                <span class="cal-reminder-title">{{ rm.title }}</span>
                            </div>
                        }
                        @if (day.reminders.length > 2) {
                            <div class="cal-more">+{{ day.reminders.length - 2 }} more follow-ups</div>
                        }
                    </div>
                }
            </div>
        </div>

        <!-- Booking List for Month -->
        @if (calBookings().length > 0) {
            <div class="card" style="margin-top: 18px;">
                <h2 style="margin-bottom: 14px; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px;">
                    All Departures in {{ monthName() }} {{ currentYear() }}
                </h2>
                <div class="table-wrap" style="box-shadow:none">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Departure</th>
                                <th>Booking</th>
                                <th>Customer</th>
                                <th>Tour</th>
                                <th>Category</th>
                                <th>Pax</th>
                                <th>Status</th>
                                <th class="num">Amount</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (bk of calBookings(); track bk.id) {
                                <tr>
                                    <td>
                                        <strong>{{ bk.trip_start_date | date:'d MMM' }}</strong>
                                        @if (bk.trip_end_date) {
                                            <small class="text-muted"> → {{ bk.trip_end_date | date:'d MMM' }}</small>
                                        }
                                    </td>
                                    <td><a [routerLink]="['/bookings', bk.id]" style="font-family:monospace; font-size:12px">{{ bk.booking_number }}</a></td>
                                    <td><strong>{{ bk.customer_name }}</strong></td>
                                    <td class="text-muted" style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">{{ bk.tour_title }}</td>
                                    <td>
                                        <span class="cat-badge" [class]="'cat-' + catClass(bk.category)">{{ bk.category }}</span>
                                    </td>
                                    <td>{{ bk.adults || 1 }} Pax</td>
                                    <td>
                                        @if (bk.status === 'confirmed') { <span class="badge badge-accepted">Confirmed</span> }
                                        @else if (bk.status === 'completed') { <span class="badge badge-accepted" style="background:#dcfce7; color:#14532d">Completed</span> }
                                        @else { <span class="badge badge-draft">{{ bk.status }}</span> }
                                    </td>
                                    <td class="num" style="font-weight:600; color:#4f46e5">₹{{ bk.total_amount | number:'1.0-0' }}</td>
                                    <td>
                                        <a [routerLink]="['/bookings', bk.id]" class="btn btn-sm">View</a>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        } @else {
            <div class="card" style="margin-top: 18px;">
                <div class="empty-state" style="padding: 40px 16px;">
                    <div style="font-size: 3rem; margin-bottom: 12px;">✈️</div>
                    <h3 style="margin-bottom: 8px; color: #374151;">No departures in {{ monthName() }}</h3>
                    <p style="color: #6b7280; margin-bottom: 16px;">No confirmed bookings with departure dates in this month.</p>
                    <a routerLink="/bookings" class="btn btn-primary">View All Bookings</a>
                </div>
            </div>
        }
    }

    @if (selectedDay(); as day) {
        <div class="modal-overlay" (click)="closeDay()">
            <div class="day-modal" (click)="$event.stopPropagation()">
                <div class="day-modal-header">
                    <h2>{{ day.date | date:'fullDate' }}</h2>
                    <button class="modal-close" (click)="closeDay()">&times;</button>
                </div>

                @if (day.bookings.length === 0 && day.reminders.length === 0) {
                    <p class="text-muted" style="padding:20px 0;text-align:center">No items for this day.</p>
                }

                @if (day.bookings.length > 0) {
                    <h3 style="margin:0 0 8px;font-size:14px;color:#065f46">Departures ({{ day.bookings.length }})</h3>
                    <div class="day-section">
                        @for (bk of day.bookings; track bk.id) {
                            <div class="day-item">
                                <div class="day-item-row">
                                    <strong>{{ bk.customer_name }}</strong>
                                    <span class="cat-badge" [class]="'cat-' + catClass(bk.category)">{{ bk.category }}</span>
                                </div>
                                <div class="day-item-row text-muted">
                                    <span>{{ bk.tour_title }}</span>
                                    <span>{{ bk.adults || 1 }} Pax</span>
                                </div>
                                <div class="day-item-row">
                                    <span style="font-family:monospace;font-size:12px">{{ bk.booking_number }}</span>
                                    @if (bk.status === 'confirmed') { <span class="badge badge-accepted">Confirmed</span> }
                                    @else if (bk.status === 'completed') { <span class="badge badge-accepted" style="background:#dcfce7;color:#14532d">Completed</span> }
                                    @else { <span class="badge badge-draft">{{ bk.status }}</span> }
                                    <span style="margin-left:auto;font-weight:600;color:#4f46e5">₹{{ bk.total_amount | number:'1.0-0' }}</span>
                                </div>
                                <a [routerLink]="['/bookings', bk.id]" class="btn btn-sm" style="margin-top:6px">View Booking</a>
                            </div>
                        }
                    </div>
                }

                @if (day.reminders.length > 0) {
                    <h3 style="margin:12px 0 8px;font-size:14px;color:#9d174d">Follow-ups ({{ day.reminders.length }})</h3>
                    <div class="day-section">
                        @for (rm of day.reminders; track rm.id) {
                            <div class="day-item">
                                <div class="day-item-row">
                                    <span class="cal-reminder" [class]="'prio-' + rm.priority" style="display:inline-flex;font-size:11px;padding:2px 8px">🔔 {{ rm.title }}</span>
                                </div>
                                <div class="day-item-row text-muted" style="font-size:12px">
                                    <span>{{ rm.followup_type }} · {{ rm.channel }}</span>
                                    @if (rm.assigned_name) {
                                        <span>Assigned to: {{ rm.assigned_name }}</span>
                                    }
                                </div>
                                @if (rm.entity_type && rm.entity_type !== 'general') {
                                    <div class="day-item-row text-muted" style="font-size:11px">
                                        Linked: {{ rm.entity_type }}
                                    </div>
                                }
                            </div>
                        }
                    </div>
                }
            </div>
        </div>
    }
    `,
    styles: [`
        .cal-nav {
            display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
        }
        .cal-month-title {
            display: flex; flex-direction: column; align-items: center; flex: 1;
        }
        .cal-month-name { font-size: 1.3rem; font-weight: 700; color: #0f172a; line-height: 1; }
        .cal-year { font-size: 13px; color: #64748b; }
        .cal-summary { display: flex; gap: 8px; flex-wrap: wrap; }
        .cal-chip {
            font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 12px;
        }
        .chip-total { background: #e0e7ff; color: #3730a3; }
        .chip-confirmed { background: #d1fae5; color: #065f46; }
        .chip-pending { background: #fef3c7; color: #92400e; }
        .chip-followup { background: #fce7f3; color: #9d174d; }

        .cal-card { padding: 0; overflow: hidden; }
        .cal-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
        }
        .cal-header-row { border-bottom: 1px solid #f1f5f9; }
        .cal-day-header {
            padding: 10px 4px;
            text-align: center;
            font-size: 11px; font-weight: 700; text-transform: uppercase;
            letter-spacing: .06em; color: #94a3b8;
            background: #f8fafc;
        }
        .cal-body { min-height: 480px; }
        .cal-cell {
            border-right: 1px solid #f1f5f9;
            border-bottom: 1px solid #f1f5f9;
            padding: 6px;
            min-height: 100px;
            position: relative;
            vertical-align: top;
            transition: background .1s;
            cursor: pointer;
        }
        .cal-cell:hover { background: #f0f9ff; }
        .cal-cell:nth-child(7n) { border-right: none; }
        .cal-cell.other-month { background: #fafafa; }
        .cal-cell.other-month .cal-cell-num { color: #d1d5db; }
        .cal-cell.today { background: #eef2ff; }
        .cal-cell.today .cal-cell-num {
            background: #4f46e5; color: #fff; border-radius: 50%;
            width: 24px; height: 24px; display: flex; align-items: center;
            justify-content: center;
        }
        .cal-cell.has-bookings { background: #f0fdf4; }
        .cal-cell.has-bookings.today { background: #ecfdf5; }
        .cal-cell-num {
            font-size: 13px; font-weight: 600; color: #374151;
            margin-bottom: 4px;
            width: 24px; height: 24px;
            display: flex; align-items: center; justify-content: center;
        }
        .cal-event {
            display: flex; align-items: center; gap: 4px;
            padding: 2px 5px; border-radius: 4px;
            font-size: 10px; font-weight: 600;
            margin-bottom: 2px;
            text-decoration: none; cursor: pointer;
            overflow: hidden;
        }
        .cal-event-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .cal-event-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cal-more { font-size: 10px; color: #6b7280; padding: 1px 5px; font-weight: 500; }
        .cal-reminder {
            display: flex; align-items: center; gap: 3px;
            padding: 1px 4px; border-radius: 3px;
            font-size: 9px; font-weight: 600;
            margin-bottom: 1px;
            overflow: hidden; cursor: default;
        }
        .cal-reminder-icon { font-size: 9px; flex-shrink: 0; }
        .cal-reminder-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cal-reminder.prio-urgent { background: #fee2e2; color: #991b1b; }
        .cal-reminder.prio-high { background: #ffedd5; color: #c2410c; }
        .cal-reminder.prio-medium { background: #fef3c7; color: #92400e; }
        .cal-reminder.prio-low { background: #f3f4f6; color: #6b7280; }

        /* Category colors */
        .cat-individual .cal-event-dot, .cat-individual { background: #dbeafe; color: #1e40af; }
        .cat-group .cal-event-dot, .cat-group { background: #d1fae5; color: #065f46; }
        .cat-corporate .cal-event-dot, .cat-corporate { background: #ede9fe; color: #5b21b6; }
        .cat-honeymoon .cal-event-dot, .cat-honeymoon { background: #fce7f3; color: #9d174d; }
        .cat-adventure .cal-event-dot, .cat-adventure { background: #fef3c7; color: #92400e; }
        .cat-other .cal-event-dot, .cat-other { background: #f3f4f6; color: #374151; }

        .cat-badge {
            font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px;
            display: inline-block;
        }

        .modal-overlay {
            position: fixed; inset: 0; z-index: 1000;
            background: rgba(15,23,42,0.6);
            display: flex; align-items: flex-start; justify-content: center;
            padding: 40px 16px 16px;
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            animation: fadeIn 0.15s ease;
        }
        .day-modal {
            background: #fff; border-radius: 12px;
            padding: 20px 22px; max-width: 500px; width: 100%;
            max-height: 85vh; overflow-y: auto;
            box-shadow: 0 20px 40px -5px rgba(0,0,0,0.15);
            animation: slideUp 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .day-modal-header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 14px; padding-bottom: 10px;
            border-bottom: 1px solid #f1f5f9;
        }
        .day-modal-header h2 { margin: 0; font-size: 1.1rem; }
        .modal-close {
            background: none; border: none; font-size: 24px; cursor: pointer;
            color: #94a3b8; line-height: 1; padding: 0 4px;
        }
        .modal-close:hover { color: #1e293b; }
        .day-section { display: flex; flex-direction: column; gap: 8px; }
        .day-item {
            background: #f8fafc; border: 1px solid #e2e8f0;
            border-radius: 8px; padding: 10px 12px;
        }
        .day-item-row {
            display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
            margin-bottom: 4px;
        }
        .day-item-row:last-child { margin-bottom: 0; }
        .text-muted { color: #64748b; font-size: 13px; }

        @media (max-width: 700px) {
            .cal-cell { min-height: 60px; }
            .cal-event-name { display: none; }
        }
    `]
})
export class CalendarComponent implements OnInit {
    private api = inject(ApiService);
    private reminderApi = inject(ReminderService);

    dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    loading = signal(true);
    calBookings = signal<CalendarBooking[]>([]);
    calReminders = signal<CalendarReminder[]>([]);
    selectedDay = signal<CalendarDay | null>(null);
    currentYear = signal(new Date().getFullYear());
    currentMonth = signal(new Date().getMonth() + 1); // 1-12

    monthName = computed(() => {
        const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        return names[this.currentMonth() - 1];
    });

    confirmedCount = computed(() => this.calBookings().filter(b => b.status === 'confirmed').length);
    pendingCount = computed(() => this.calBookings().filter(b => b.status === 'pending').length);

    calendarDays = computed((): CalendarDay[] => {
        const y = this.currentYear();
        const m = this.currentMonth();
        const firstDay = new Date(y, m - 1, 1);
        const lastDay = new Date(y, m, 0);
        const today = new Date();
        const todayStr = today.toDateString();

        const days: CalendarDay[] = [];
        const startPad = firstDay.getDay(); // 0=Sun

        // Pad from prev month
        for (let i = startPad - 1; i >= 0; i--) {
            const d = new Date(y, m - 1, -i);
            days.push({ date: d, day: d.getDate(), isCurrentMonth: false, isToday: false, bookings: [], reminders: [] });
        }

        // Current month days
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const date = new Date(y, m - 1, d);
            const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const bookings = this.calBookings().filter(b => {
                const start = b.trip_start_date?.substring(0, 10);
                return start === dateStr;
            });
            const reminders = this.calReminders().filter(r => {
                const rd = r.remind_at?.substring(0, 10);
                return rd === dateStr;
            });
            days.push({ date, day: d, isCurrentMonth: true, isToday: date.toDateString() === todayStr, bookings, reminders });
        }

        // Pad to complete last row
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            const d = new Date(y, m, i);
            days.push({ date: d, day: d.getDate(), isCurrentMonth: false, isToday: false, bookings: [], reminders: [] });
        }
        return days;
    });

    catClass(category: string): string {
        const c = (category || '').toLowerCase();
        if (c.includes('group')) return 'group';
        if (c.includes('corporate') || c.includes('mice')) return 'corporate';
        if (c.includes('honeymoon')) return 'honeymoon';
        if (c.includes('adventure') || c.includes('trekk')) return 'adventure';
        if (c.includes('individual') || c.includes('family')) return 'individual';
        return 'other';
    }

    prevMonth() {
        if (this.currentMonth() === 1) {
            this.currentMonth.set(12);
            this.currentYear.update(y => y - 1);
        } else {
            this.currentMonth.update(m => m - 1);
        }
        this.load();
    }

    nextMonth() {
        if (this.currentMonth() === 12) {
            this.currentMonth.set(1);
            this.currentYear.update(y => y + 1);
        } else {
            this.currentMonth.update(m => m + 1);
        }
        this.load();
    }

    goToday() {
        const now = new Date();
        this.currentYear.set(now.getFullYear());
        this.currentMonth.set(now.getMonth() + 1);
        this.load();
    }

    openDay(day: CalendarDay) {
        this.selectedDay.set(day);
    }

    closeDay() {
        this.selectedDay.set(null);
    }

    load() {
        this.loading.set(true);
        this.api.getCalendarBookings(this.currentYear(), this.currentMonth()).subscribe({
            next: (res) => {
                this.calBookings.set(res.items || []);
                this.loading.set(false);
            },
            error: () => { this.loading.set(false); }
        });
        const y = this.currentYear();
        const m = String(this.currentMonth()).padStart(2, '0');
        const dateFrom = `${y}-${m}-01`;
        const lastDay = new Date(y, Number(this.currentMonth()), 0).getDate();
        const dateTo = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
        this.reminderApi.list({ date_from: dateFrom, date_to: dateTo }).subscribe({
            next: (res) => this.calReminders.set(res || []),
            error: () => {}
        });
    }

    ngOnInit() { this.load(); }
}
