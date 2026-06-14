import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="page-header">
        <div>
            <h1>Dashboard</h1>
            <p class="text-muted">Welcome back, {{ auth.currentUser()?.name }}</p>
        </div>
    </div>

    <!-- KPI Cards -->
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-label">Total Leads</div>
            <div class="stat-value">{{ stats().totalLeads }}</div>
            <div class="stat-change">Active pipeline</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Hot Leads</div>
            <div class="stat-value" style="color:var(--danger);">{{ stats().hotLeads }}</div>
            <div class="stat-change">Needs follow-up</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Quotations Sent</div>
            <div class="stat-value" style="color:var(--primary);">{{ stats().quotationsSent }}</div>
            <div class="stat-change">Awaiting response</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Bookings This Month</div>
            <div class="stat-value" style="color:var(--success);">{{ stats().bookingsThisMonth }}</div>
            <div class="stat-change">Confirmed trips</div>
        </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;">

        <!-- Today's Follow-up Reminders -->
        <div class="card">
            <div class="card-header">
                <h2>⏰ Today's Follow-ups</h2>
                <a routerLink="/leads" [queryParams]="{follow_up_due:true}" class="btn-ghost text-sm">View all</a>
            </div>
            <div class="card-body" style="padding:0;">
                @if (reminders().length === 0) {
                    <div class="empty-state" style="padding:32px;">
                        <div class="icon">✅</div>
                        <p>No follow-ups due today</p>
                    </div>
                }
                @for (r of reminders(); track r.id) {
                    <a routerLink="/leads/{{ r.id }}" class="reminder-row" style="display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:1px solid var(--border);text-decoration:none;color:inherit;">
                        <div>
                            <div style="font-weight:600;">{{ r.full_name }}</div>
                            <div class="text-muted text-sm">{{ r.phone }} · {{ r.destination_text || '—' }}</div>
                        </div>
                        <div style="text-align:right;">
                            <span class="badge badge-{{ r.status }}">{{ r.status }}</span>
                            <div class="text-muted text-sm" style="margin-top:3px;">{{ fmtDate(r.follow_up_at) }}</div>
                        </div>
                    </a>
                }
            </div>
        </div>

        <!-- Recent Bookings -->
        <div class="card">
            <div class="card-header">
                <h2>📅 Recent Bookings</h2>
                <a routerLink="/bookings" class="btn-ghost text-sm">View all</a>
            </div>
            <div class="card-body" style="padding:0;">
                @if (recentBookings().length === 0) {
                    <div class="empty-state" style="padding:32px;"><div class="icon">📋</div><p>No bookings yet</p></div>
                }
                @for (b of recentBookings(); track b.id) {
                    <a routerLink="/bookings/{{ b.id }}" style="display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:1px solid var(--border);text-decoration:none;color:inherit;">
                        <div>
                            <div style="font-weight:600;">{{ b.customer_name }}</div>
                            <div class="text-muted text-sm">{{ b.destination_text }} · {{ fmtDate(b.trip_start_date) }}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-weight:600;">₹{{ formatCurrency(b.total_amount) }}</div>
                            <span class="badge badge-{{ b.payment_status }}">{{ b.payment_status }}</span>
                        </div>
                    </a>
                }
            </div>
        </div>
    </div>
    `
})
export class DashboardComponent implements OnInit {
    api = inject(ApiService);
    auth = inject(AuthService);

    stats = signal({ totalLeads: 0, hotLeads: 0, quotationsSent: 0, bookingsThisMonth: 0 });
    reminders = signal<any[]>([]);
    recentBookings = signal<any[]>([]);

    ngOnInit() {
        // Load reminders
        this.api.getTodayReminders().subscribe(r => this.reminders.set(r.slice(0, 8)));

        // Load recent bookings
        this.api.getBookings({ limit: 6 }).subscribe((b: any[]) => this.recentBookings.set(b));

        // Load lead counts
        this.api.getLeads({ limit: 1 }).subscribe((res: any) => {
            this.stats.update(s => ({ ...s, totalLeads: res.total || 0 }));
        });
        this.api.getLeads({ status: 'hot', limit: 1 }).subscribe((res: any) => {
            this.stats.update(s => ({ ...s, hotLeads: res.total || 0 }));
        });
        this.api.getQuotations({ status: 'sent' }).subscribe((res: any[]) => {
            this.stats.update(s => ({ ...s, quotationsSent: res.length || 0 }));
        });

        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        this.api.getBookings({ from_date: from }).subscribe((res: any[]) => {
            this.stats.update(s => ({ ...s, bookingsThisMonth: res.length || 0 }));
        });
    }

    fmtDate(d: string) {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }

    formatCurrency(n: any) {
        return parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
    }
}
