import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TaskService } from '../../core/services/competitor-features.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-task-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <h1>Tasks</h1>
    <button class="btn" style="margin-bottom:14px;" (click)="showForm.set(!showForm())">{{ showForm() ? 'Cancel' : '+ New Task' }}</button>
    @if (showForm()) {
    <div class="form-panel">
        <label>Title <input type="text" [(ngModel)]="form.title" #titleInput required /></label>
        <label>Description <textarea [(ngModel)]="form.description" rows="2"></textarea></label>
        <label>Assign To
            <select [(ngModel)]="form.assigned_to">
                <option value="">Unassigned</option>
                @for (u of users(); track u.id) {
                    <option [value]="u.id">{{ u.full_name }} ({{ u.role }})</option>
                }
            </select>
        </label>
        <label>Due Date <input type="datetime-local" [(ngModel)]="form.due_date" /></label>
        <label>Priority
            <select [(ngModel)]="form.priority">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
            </select>
        </label>
        <div class="form-actions">
            <button class="btn" (click)="save()" [disabled]="saving()">Save</button>
            <button class="btn ghost" (click)="showForm.set(false)">Cancel</button>
        </div>
    </div>
    }
    <table>
        <thead><tr><th>Title</th><th>Assigned To</th><th>Priority</th><th>Status</th><th>Due</th><th>Actions</th></tr></thead>
        <tbody>
            @for (t of tasks(); track t.id) {
                <tr>
                    <td>{{ t.title }}</td>
                    <td>{{ t.assigned_name || '—' }}</td>
                    <td><span class="badge" [class]="t.priority">{{ t.priority }}</span></td>
                    <td><span class="badge" [class]="t.status">{{ t.status }}</span></td>
                    <td>{{ t.due_date | date:'short' }}</td>
                    <td>
                        @if (t.status !== 'completed') {
                            <button class="btn small" (click)="mark(t.id, 'completed')">Done</button>
                        }
                        <button class="btn small warn" (click)="remove(t.id)">Delete</button>
                    </td>
                </tr>
            } @empty { <tr><td colspan="6" class="empty">No tasks.</td></tr> }
        </tbody>
    </table>
    `,
    styles: [`
        h1 { margin:0 0 14px; font-size:1.3rem; }
        .btn { padding:8px 12px; border:none; border-radius:6px; background:#0f766e; color:#fff; cursor:pointer; font-size:13px; }
        .btn.ghost { background:#f3f4f6; color:#374151; }
        .btn.small { padding:4px 8px; font-size:12px; background:#0f766e; color:#fff; }
        .btn.warn { background:#b91c1c; }
        .form-panel { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:14px; margin-bottom:14px; max-width:540px; }
        .form-panel label { display:flex; flex-direction:column; gap:4px; margin-bottom:10px; font-size:12px; color:#374151; }
        .form-panel input, .form-panel select, .form-panel textarea { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; }
        .form-actions { display:flex; gap:8px; }
        table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; }
        th, td { padding:10px; text-align:left; border-bottom:1px solid #f3f4f6; font-size:13px; }
        th { background:#f9fafb; color:#6b7280; text-transform:uppercase; font-size:11px; }
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; text-transform:capitalize; }
        .badge.low { background:#dbeafe; color:#1d4ed8; }
        .badge.medium { background:#fef3c7; color:#92400e; }
        .badge.high { background:#fed7aa; color:#9a3412; }
        .badge.urgent { background:#fee2e2; color:#991b1b; }
        .badge.pending { background:#fef3c7; color:#92400e; }
        .badge.completed { background:#dcfce7; color:#166534; }
        .badge.in_progress { background:#dbeafe; color:#1d4ed8; }
        .empty { color:#9ca3af; text-align:center; }
    `]
})
export class TaskListComponent implements OnInit {
    private http = inject(HttpClient);
    private api = inject(TaskService);
    private toast = inject(ToastService);

    tasks = signal<any[]>([]);
    users = signal<any[]>([]);
    showForm = signal(false);
    saving = signal(false);
    form: any = { title: '', description: '', assigned_to: '', due_date: '', priority: 'medium' };

    ngOnInit() {
        this.http.get<any[]>('http://localhost:3000/api/users').subscribe(r => this.users.set(r));
        this.load();
    }
    load() {
        this.api.list().subscribe({
            next: r => this.tasks.set(r),
            error: () => this.toast.error('Failed to load tasks')
        });
    }

    save() {
        if (!this.form.title?.trim()) {
            this.toast.error('Title is required');
            return;
        }
        this.saving.set(true);
        this.api.create(this.form).subscribe({
            next: () => { this.saving.set(false); this.showForm.set(false); this.form = { title: '', description: '', due_date: '', priority: 'medium' }; this.load(); this.toast.success('Created'); },
            error: () => { this.saving.set(false); this.toast.error('Failed to create task'); }
        });
    }

    mark(id: number, status: string) {
        this.api.update(id, { status }).subscribe({
            next: () => { this.load(); this.toast.success('Updated'); },
            error: () => this.toast.error('Failed to update task')
        });
    }

    remove(id: number) {
        if (id == null) return;
        if (!confirm('Delete task?')) return;
        this.api.delete(id).subscribe({
            next: () => { this.load(); this.toast.success('Deleted'); },
            error: () => this.toast.error('Failed to delete task')
        });
    }
}
