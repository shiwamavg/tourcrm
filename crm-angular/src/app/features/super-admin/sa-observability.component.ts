import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuperAdminApiService } from '../../core/services/super-admin-api.service';

@Component({
    selector: 'app-sa-observability',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="header-bar">
        <h1>SaaS Systems Health & Observability</h1>
        <button class="refresh-btn" (click)="loadMetrics()">
            <span class="refresh-icon">🔄</span> Refresh
        </button>
    </div>

    @if (loading()) {
        <div class="loader-container">
            <div class="spinner"></div>
            <p>Gathering system metrics and database status...</p>
        </div>
    } @else {
        <!-- Anomalies Section -->
        <div class="alerts-section">
            <div class="alert-card" [class.alert-warning]="metrics()?.anomalies?.highSignupRate">
                <div class="alert-header">
                    <span class="badge" [class.badge-danger]="metrics()?.anomalies?.highSignupRate" [class.badge-success]="!metrics()?.anomalies?.highSignupRate">
                        {{ metrics()?.anomalies?.highSignupRate ? 'Warning' : 'Normal' }}
                    </span>
                    <h3>24h Signup Activity</h3>
                </div>
                <div class="alert-value">{{ metrics()?.anomalies?.recentSignupCount }}</div>
                <p class="alert-desc">New signups registered in the last 24 hours.</p>
            </div>

            <div class="alert-card" [class.alert-danger]="metrics()?.anomalies?.highFailedPaymentsRate">
                <div class="alert-header">
                    <span class="badge" [class.badge-danger]="metrics()?.anomalies?.highFailedPaymentsRate" [class.badge-success]="!metrics()?.anomalies?.highFailedPaymentsRate">
                        {{ metrics()?.anomalies?.highFailedPaymentsRate ? 'Critical' : 'Normal' }}
                    </span>
                    <h3>24h Payment Failures</h3>
                </div>
                <div class="alert-value" [class.danger-text]="metrics()?.anomalies?.recentFailedPaymentCount > 0">
                    {{ metrics()?.anomalies?.recentFailedPaymentCount }}
                </div>
                <p class="alert-desc">Failed payment webhook transactions in the last 24 hours.</p>
            </div>
        </div>

        <div class="grid-2col">
            <!-- System Status -->
            <div class="card font-sans">
                <h2>System & Process Status</h2>
                
                <div class="stats-row">
                    <div class="stat-item">
                        <span class="stat-lbl">Memory Usage</span>
                        <div class="progress-container">
                            <div class="progress-bar" [style.width.%]="metrics()?.system?.memory?.percentageUsed"
                                 [class.bg-danger]="metrics()?.system?.memory?.percentageUsed > 85"
                                 [class.bg-warning]="metrics()?.system?.memory?.percentageUsed > 65">
                            </div>
                        </div>
                        <span class="stat-val-sm">
                            {{ metrics()?.system?.memory?.percentageUsed }}% ({{ formatBytes(metrics()?.system?.memory?.totalBytes - metrics()?.system?.memory?.freeBytes) }} / {{ formatBytes(metrics()?.system?.memory?.totalBytes) }})
                        </span>
                    </div>

                    <div class="stat-item">
                        <span class="stat-lbl">Node Process (RSS)</span>
                        <span class="stat-val">{{ metrics()?.system?.memory?.processRssMb }} MB</span>
                    </div>
                </div>

                <div class="divider"></div>

                <div class="stats-row">
                    <div class="stat-item">
                        <span class="stat-lbl">CPU Load Average (1m, 5m, 15m)</span>
                        <span class="stat-val">{{ metrics()?.system?.cpu?.loadAvg?.join(', ') }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-lbl">CPU Cores</span>
                        <span class="stat-val">{{ metrics()?.system?.cpu?.cores }} Cores</span>
                    </div>
                </div>

                <div class="divider"></div>

                <div class="stats-row">
                    <div class="stat-item">
                        <span class="stat-lbl">System Uptime</span>
                        <span class="stat-val">{{ formatUptime(metrics()?.system?.cpu?.uptimeSeconds) }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-lbl">Last Sampled</span>
                        <span class="stat-val-sm">{{ metrics()?.ts | date:'medium' }}</span>
                    </div>
                </div>
            </div>

            <!-- Counts overview -->
            <div class="card font-sans">
                <h2>Tenant Quotas & Counts Summary</h2>
                <div class="counts-grid">
                    <div class="count-box">
                        <span class="box-lbl">Active Subs</span>
                        <span class="box-val">{{ metrics()?.counts?.activeSubscriptions }}</span>
                    </div>
                    <div class="count-box">
                        <span class="box-lbl">Active Trials</span>
                        <span class="box-val">{{ metrics()?.counts?.activeTrials }}</span>
                    </div>
                    <div class="count-box">
                        <span class="box-lbl">Total Tenants</span>
                        <span class="box-val">{{ metrics()?.counts?.companies }}</span>
                    </div>
                    <div class="count-box">
                        <span class="box-lbl">Total Users</span>
                        <span class="box-val">{{ metrics()?.counts?.users }}</span>
                    </div>
                    <div class="count-box">
                        <span class="box-lbl">Leads</span>
                        <span class="box-val">{{ metrics()?.counts?.leads }}</span>
                    </div>
                    <div class="count-box">
                        <span class="box-lbl">Bookings</span>
                        <span class="box-val">{{ metrics()?.counts?.bookings }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Database status -->
        <div class="card table-card font-sans">
            <h2>Database Storage Observability</h2>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Table Name</th>
                            <th class="num-col">Estimated Rows</th>
                            <th class="num-col">Size on Disk</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (t of metrics()?.database?.tables; track t.table) {
                            <tr>
                                <td class="table-name">📁 {{ t.table }}</td>
                                <td class="num-col">{{ t.rows | number }}</td>
                                <td class="num-col bold-col">{{ t.size_mb }} MB</td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
        </div>
    }
    `,
    styles: [`
        .header-bar { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
        h1 { margin:0; font-size:1.4rem; font-weight:700; color:#111827; }
        h2 { margin:0 0 16px; font-size:1rem; font-weight:600; color:#374151; text-transform:uppercase; letter-spacing:.5px; }
        h3 { margin:0; font-size:0.9rem; font-weight:600; color:#1f2937; }
        
        .refresh-btn { display:flex; align-items:center; gap:6px; background:#fff; border:1px solid #d1d5db; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:500; cursor:pointer; transition:all .15s ease; }
        .refresh-btn:hover { background:#f9fafb; border-color:#9ca3af; }
        
        .loader-container { text-align:center; padding:60px 0; color:#6b7280; }
        .spinner { border:3px solid #f3f3f3; border-top:3px solid #0f766e; border-radius:50%; width:24px; height:24px; animation:spin 1s linear infinite; margin:0 auto 12px; }
        @keyframes spin { 0% { transform:rotate(0deg); } 100% { transform:rotate(360deg); } }

        .alerts-section { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }
        .alert-card { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:16px; transition:all .2s ease; }
        .alert-card.alert-warning { border-color:#fef08a; background:#fefcbf; }
        .alert-card.alert-danger { border-color:#fecaca; background:#fff5f5; }
        .alert-header { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
        .alert-value { font-size:2rem; font-weight:800; color:#111827; margin-bottom:4px; }
        .danger-text { color:#dc2626; }
        .alert-desc { margin:0; font-size:12px; color:#4b5563; }

        .badge { font-size:10px; font-weight:600; padding:2px 6px; border-radius:12px; text-transform:uppercase; }
        .badge-success { background:#d1fae5; color:#065f46; }
        .badge-danger { background:#fee2e2; color:#991b1b; }

        .grid-2col { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; }
        .card { background:#fff; border-radius:10px; padding:20px; box-shadow:0 1px 3px rgba(0,0,0,.05); border:1px solid #f3f4f6; }
        
        .stats-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .stat-item { display:flex; flex-direction:column; }
        .stat-lbl { font-size:11px; color:#6b7280; text-transform:uppercase; margin-bottom:4px; }
        .stat-val { font-size:1.1rem; font-weight:600; color:#111827; }
        .stat-val-sm { font-size:12px; font-weight:500; color:#374151; }

        .progress-container { width:100%; height:8px; background:#e5e7eb; border-radius:4px; overflow:hidden; margin:4px 0; }
        .progress-bar { height:100%; background:#0f766e; border-radius:4px; transition:width .3s ease; }
        .bg-warning { background:#eab308; }
        .bg-danger { background:#ef4444; }

        .divider { height:1px; background:#f3f4f6; margin:16px 0; }

        .counts-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; height:100%; }
        .count-box { background:#f9fafb; border:1px solid #f3f4f6; border-radius:8px; padding:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; }
        .box-lbl { font-size:11px; color:#6b7280; text-transform:uppercase; text-align:center; }
        .box-val { font-size:1.4rem; font-weight:700; color:#0f766e; margin-top:4px; }

        .table-card { margin-top:20px; }
        .table-responsive { overflow-x:auto; }
        table { width:100%; border-collapse:collapse; text-align:left; font-size:13px; }
        th { padding:10px 14px; border-bottom:2px solid #e5e7eb; color:#4b5563; font-weight:600; }
        td { padding:10px 14px; border-bottom:1px solid #f3f4f6; color:#374151; }
        tr:hover td { background:#f9fafb; }
        .num-col { text-align:right; }
        .table-name { font-weight:500; color:#0f766e; }
        .bold-col { font-weight:600; color:#111827; }
    `]
})
export class SaObservabilityComponent implements OnInit {
    private api = inject(SuperAdminApiService);

    loading = signal(true);
    metrics = signal<any>(null);

    ngOnInit() {
        this.loadMetrics();
    }

    loadMetrics() {
        this.loading.set(true);
        this.api.getMonitorMetrics().subscribe({
            next: m => {
                this.metrics.set(m);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            }
        });
    }

    formatBytes(bytes: number): string {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatUptime(sec: number): string {
        if (!sec) return '0s';
        const d = Math.floor(sec / (3600*24));
        const h = Math.floor((sec % (3600*24)) / 3600);
        const m = Math.floor((sec % 3600) / 60);
        if (d > 0) return `${d}d ${h}h ${m}m`;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }
}
