import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-usage-limits',
    standalone: true,
    imports: [CommonModule],
    template: `
    <h1>Usage & Limits</h1>
    @if (loading()) {
        <div>Loading...</div>
    } @else {
        <div class="section">
            <h3>Resource Usage</h3>
            @for (item of items(); track item.key) {
                <div class="resource">
                    <div class="resource-header">
                        <div class="resource-label">{{ item.label }}</div>
                        <div class="resource-count">
                            <span [class.warn]="item.percent >= 80" [class.critical]="item.percent >= 95">
                                {{ item.current }}
                            </span>
                            / {{ item.limit }}
                        </div>
                    </div>
                    <div class="resource-bar">
                        <div class="resource-fill" [style.width.%]="item.percent"
                             [class.warn]="item.percent >= 80"
                             [class.critical]="item.percent >= 95">
                        </div>
                    </div>
                </div>
            }
        </div>

        @if (limitMsg()) {
            <div class="alert">{{ limitMsg() }}</div>
        }

        @if (features()?.length) {
            <div class="section">
                <h3>Enabled Features</h3>
                <div class="features-grid">
                    @for (f of features(); track f) {
                        <span class="feature-tag">{{ f }}</span>
                    }
                </div>
            </div>
        }

        <div class="section note">
            Need more capacity? Ask your super admin to upgrade your subscription plan.
        </div>
    }
    `,
    styles: [`
        h1 { margin:0 0 14px; font-size:1.3rem; }
        .section { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:14px; margin-bottom:14px; }
        .section h3 { margin:0 0 12px; font-size:14px; }
        .resource { margin-bottom:14px; }
        .resource-header { display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px; }
        .resource-label { color:#374151; }
        .resource-count { color:#6b7280; }
        .resource-count .warn { color:#d97706; font-weight:700; }
        .resource-count .critical { color:#dc2626; font-weight:700; }
        .resource-bar { height:12px; background:#e5e7eb; border-radius:6px; overflow:hidden; }
        .resource-fill { height:100%; background:#0f766e; border-radius:6px; transition:width .3s; }
        .resource-fill.warn { background:#d97706; }
        .resource-fill.critical { background:#dc2626; }
        .alert { background:#fef3c7; color:#92400e; border:1px solid #fde68a; border-radius:8px; padding:10px 14px; margin-bottom:14px; font-size:13px; }
        .features-grid { display:flex; flex-wrap:wrap; gap:6px; }
        .feature-tag { font-size:12px; padding:4px 10px; border-radius:999px; background:#dbeafe; color:#1d4ed8; }
        .note { font-size:12px; color:#6b7280; }
    `]
})
export class UsageLimitsComponent implements OnInit {
    private http = inject(HttpClient);

    loading = signal(true);
    data = signal<any>(null);

    ngOnInit() {
        this.http.get<any>('http://localhost:3000/api/usage').subscribe({
            next: d => { this.data.set(d); this.loading.set(false); },
            error: () => this.loading.set(false)
        });
    }

    items = () => {
        const d = this.data();
        if (!d) return [];
        return [
            { key: 'users', label: 'Staff Users', current: d.usage.users, limit: d.limits.users },
            { key: 'leads', label: 'Leads', current: d.usage.leads, limit: d.limits.leads },
            { key: 'quotations', label: 'Quotations', current: d.usage.quotations, limit: d.limits.quotations },
            { key: 'bookings', label: 'Bookings', current: d.usage.bookings, limit: d.limits.bookings },
        ].map(i => ({
            ...i,
            percent: i.limit > 0 ? Math.min(100, (i.current / i.limit) * 100) : 0
        }));
    };

    limitMsg = () => {
        const near = this.items().filter(i => i.percent >= 80);
        if (near.length) {
            return `⚠️ You are close to the limit on: ${near.map(i => i.label).join(', ')}. Consider upgrading your plan.`;
        }
        return '';
    };

    features = () => {
        const d = this.data();
        return d?.features ? (Array.isArray(d.features) ? d.features : JSON.parse(d.features || '[]')) : [];
    };
}
