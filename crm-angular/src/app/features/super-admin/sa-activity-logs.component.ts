import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperAdminApiService } from '../../core/services/super-admin-api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-sa-activity-logs',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <h1>Company Activity Logs</h1>
    <div class="toolbar">
        <select [(ngModel)]="companyId" (change)="load()">
            <option value="">All companies</option>
            @for (c of companies(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
            }
        </select>
        <input type="text" [(ngModel)]="action" (keyup.enter)="load()" placeholder="Action (e.g. user_created)" />
        <input type="text" [(ngModel)]="entityType" (keyup.enter)="load()" placeholder="Entity type" />
        <button class="btn" (click)="load()">Search</button>
    </div>

    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Company</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
                <th>Time</th>
            </tr>
        </thead>
        <tbody>
            @for (l of activityLogs(); track l.id) {
                <tr>
                    <td>{{ l.id }}</td>
                    <td>{{ l.company_name || '#' + l.company_id }}</td>
                    <td>{{ l.user_name || 'User #' + l.user_id }}</td>
                    <td><span class="badge">{{ l.action }}</span></td>
                    <td>{{ l.entity_type || '-' }} {{ l.entity_id ? '#' + l.entity_id : '' }}</td>
                    <td>
                        @if (l.new_data || l.old_data) {
                            <button class="btn small ghost" (click)="toggle(l.id)">View JSON</button>
                        } @else { - }
                    </td>
                    <td>{{ l.created_at | date:'medium' }}</td>
                </tr>
                @if (expanded().has(l.id)) {
                    <tr class="detail-row">
                        <td colspan="7">
                            <div class="json-block">
                                @if (l.old_data) {
                                    <div><strong>Old data:</strong></div>
                                    <pre>{{ l.old_data | json }}</pre>
                                }
                                @if (l.new_data) {
                                    <div><strong>New data:</strong></div>
                                    <pre>{{ l.new_data | json }}</pre>
                                }
                            </div>
                        </td>
                    </tr>
                }
            } @empty {
                <tr><td colspan="7" class="empty">No activity logs found.</td></tr>
            }
        </tbody>
    </table>
    `,
    styles: [`
        h1 { margin:0 0 14px; font-size:1.3rem; }
        .toolbar { display:flex; gap:8px; align-items:center; margin-bottom:14px; flex-wrap:wrap; }
        select, input { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; min-width:160px; }
        .btn { padding:8px 12px; border:none; border-radius:6px; background:#0f766e; color:#fff; cursor:pointer; font-size:13px; }
        .btn.ghost { background:#f3f4f6; color:#374151; }
        .btn.small { padding:4px 8px; font-size:12px; }
        table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; }
        th, td { padding:10px; text-align:left; border-bottom:1px solid #f3f4f6; font-size:13px; }
        th { background:#f9fafb; color:#6b7280; text-transform:uppercase; font-size:11px; }
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; text-transform:capitalize; background:#e0e7ff; color:#3730a3; }
        .empty { color:#9ca3af; text-align:center; }
        .detail-row { background:#f9fafb; }
        .json-block { padding:10px; }
        .json-block pre { background:#1e293b; color:#e2e8f0; padding:12px; border-radius:6px; overflow-x:auto; font-size:12px; max-height:240px; }
    `]
})
export class SaActivityLogsComponent implements OnInit {
    private api = inject(SuperAdminApiService);
    private toast = inject(ToastService);

    activityLogs = signal<any[]>([]);
    companies = signal<any[]>([]);
    companyId = '';
    action = '';
    entityType = '';
    expanded = signal<Set<number>>(new Set());

    ngOnInit() {
        this.api.listCompanies({}).subscribe(r => this.companies.set(r.companies || []));
        this.load();
    }

    load() {
        const params: any = {};
        if (this.companyId) params.company_id = Number(this.companyId);
        if (this.action.trim()) params.action = this.action.trim();
        if (this.entityType.trim()) params.entity_type = this.entityType.trim();
        this.api.listActivityLogs(params).subscribe({
            next: r => this.activityLogs.set(r.activity_logs || r.items || []),
            error: () => this.toast.error('Failed to load activity logs')
        });
    }

    toggle(id: number) {
        const set = new Set(this.expanded());
        if (set.has(id)) set.delete(id);
        else set.add(id);
        this.expanded.set(set);
    }
}
