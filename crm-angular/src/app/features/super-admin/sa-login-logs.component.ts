import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperAdminApiService } from '../../core/services/super-admin-api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-sa-login-logs',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <h1>Agency Login Logs</h1>
    <div class="toolbar">
        <select [(ngModel)]="companyId" (change)="load()">
            <option value="">All companies</option>
            @for (c of companies(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
            }
        </select>
        <select [(ngModel)]="status" (change)="load()">
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
        </select>
        <input type="text" [(ngModel)]="email" (keyup.enter)="load()" placeholder="Filter by email" />
        <button class="btn" (click)="load()">Search</button>
    </div>

    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Company</th>
                <th>User</th>
                <th>Email</th>
                <th>Status</th>
                <th>Reason</th>
                <th>IP Address</th>
                <th>Time</th>
            </tr>
        </thead>
        <tbody>
            @for (l of loginLogs(); track l.id) {
                <tr>
                    <td>{{ l.id }}</td>
                    <td>{{ l.company_name || '#' + l.company_id }}</td>
                    <td>{{ l.user_name || '-' }}</td>
                    <td>{{ l.email || '-' }}</td>
                    <td><span class="badge" [class]="l.status">{{ l.status }}</span></td>
                    <td>{{ l.reason || '-' }}</td>
                    <td>{{ l.ip_address || '-' }}</td>
                    <td>{{ l.created_at | date:'medium' }}</td>
                </tr>
            } @empty {
                <tr><td colspan="8" class="empty">No login logs found.</td></tr>
            }
        </tbody>
    </table>
    `,
    styles: [`
        h1 { margin:0 0 14px; font-size:1.3rem; }
        .toolbar { display:flex; gap:8px; align-items:center; margin-bottom:14px; flex-wrap:wrap; }
        select, input { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; min-width:140px; }
        .btn { padding:8px 12px; border:none; border-radius:6px; background:#0f766e; color:#fff; cursor:pointer; font-size:13px; }
        table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; }
        th, td { padding:10px; text-align:left; border-bottom:1px solid #f3f4f6; font-size:13px; }
        th { background:#f9fafb; color:#6b7280; text-transform:uppercase; font-size:11px; }
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; text-transform:capitalize; }
        .badge.success { background:#dcfce7; color:#166534; }
        .badge.failed { background:#fee2e2; color:#991b1b; }
        .empty { color:#9ca3af; text-align:center; }
    `]
})
export class SaLoginLogsComponent implements OnInit {
    private api = inject(SuperAdminApiService);
    private toast = inject(ToastService);

    loginLogs = signal<any[]>([]);
    companies = signal<any[]>([]);
    companyId = '';
    status = '';
    email = '';

    ngOnInit() {
        this.api.listCompanies({}).subscribe(r => this.companies.set(r.companies || []));
        this.load();
    }

    load() {
        const params: any = {};
        if (this.companyId) params.company_id = Number(this.companyId);
        if (this.status) params.status = this.status;
        if (this.email.trim()) params.email = this.email.trim();
        this.api.listLoginLogs(params).subscribe({
            next: r => this.loginLogs.set(r.login_logs || r.items || []),
            error: () => this.toast.error('Failed to load login logs')
        });
    }
}
