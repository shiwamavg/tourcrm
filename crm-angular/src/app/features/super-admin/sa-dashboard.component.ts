import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuperAdminApiService } from '../../core/services/super-admin-api.service';

@Component({
    selector: 'app-sa-dashboard',
    standalone: true,
    imports: [CommonModule],
    template: `
    <h1>Dashboard</h1>
    @if (loading()) {
        <div>Loading stats…</div>
    } @else {
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Companies</div>
                <div class="stat-value">{{ stats()?.companies ?? 0 }}</div>
                <div class="stat-detail">{{ stats()?.active_companies ?? 0 }} active</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Trial Companies</div>
                <div class="stat-value">{{ stats()?.trial_companies ?? 0 }}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Expired</div>
                <div class="stat-value">{{ stats()?.expired_companies ?? 0 }}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Suspended</div>
                <div class="stat-value">{{ stats()?.suspended_companies ?? 0 }}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Revenue</div>
                <div class="stat-value">₹{{ (stats()?.total_revenue ?? 0) | number }}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">This Month</div>
                <div class="stat-value">₹{{ (stats()?.month_revenue ?? 0) | number }}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Users</div>
                <div class="stat-value">{{ stats()?.total_users ?? 0 }}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Leads</div>
                <div class="stat-value">{{ stats()?.total_leads ?? 0 }}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Quotations</div>
                <div class="stat-value">{{ stats()?.total_quotations ?? 0 }}</div>
            </div>
        </div>

        @if (revenue().length) {
            <div class="section">
                <h3>Revenue by Month ({{ currentYear }})</h3>
                <div class="revenue-grid">
                    @for (m of revenue(); track m.month) {
                        <div class="rev-item">
                            <div class="rev-month">{{ monthName(m.month) }}</div>
                            <div class="rev-bar-wrap">
                                <div class="rev-bar" [style.width.%]="barWidth(m.revenue)"></div>
                            </div>
                            <div class="rev-amount">₹{{ m.revenue | number }}</div>
                        </div>
                    }
                </div>
            </div>
        }
    }
    `,
    styles: [`
        h1 { margin:0 0 16px; font-size:1.3rem; }
        .stats-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:14px; margin-bottom:24px; }
        .stat-card { background:#fff; border-radius:8px; padding:16px; box-shadow:0 1px 2px rgba(0,0,0,.04); }
        .stat-label { font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; }
        .stat-value { font-size:1.6rem; font-weight:700; color:#111827; margin:6px 0; }
        .stat-detail { font-size:12px; color:#16a34a; }
        .section { background:#fff; border-radius:8px; padding:16px; }
        .section h3 { margin:0 0 12px; font-size:14px; }
        .revenue-grid { display:grid; gap:8px; }
        .rev-item { display:flex; align-items:center; gap:10px; }
        .rev-month { width:60px; font-size:12px; color:#6b7280; }
        .rev-bar-wrap { flex:1; height:12px; background:#e5e7eb; border-radius:6px; overflow:hidden; }
        .rev-bar { height:100%; background:#0f766e; border-radius:6px; }
        .rev-amount { width:80px; text-align:right; font-size:12px; font-weight:600; }
    `]
})
export class SaDashboardComponent implements OnInit {
    private api = inject(SuperAdminApiService);

    loading = signal(true);
    stats = signal<any>(null);
    revenue = signal<any[]>([]);
    currentYear = new Date().getFullYear();
    maxRevenue = 1;

    ngOnInit() {
        this.api.dashboardStats().subscribe({
            next: s => { this.stats.set(s); this.loading.set(false); },
            error: () => { this.loading.set(false); }
        });
        this.api.revenueReport(this.currentYear).subscribe({
            next: r => {
                this.revenue.set(r);
                this.maxRevenue = Math.max(...r.map((x: any) => x.revenue || 0), 1);
            }
        });
    }

    monthName(n: number): string {
        return new Date(2024, n - 1, 1).toLocaleString('en-US', { month: 'short' });
    }

    barWidth(revenue: number): number {
        return Math.min(100, (revenue / this.maxRevenue) * 100);
    }
}
