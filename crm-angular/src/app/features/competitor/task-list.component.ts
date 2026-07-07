import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TaskService } from '../../core/services/competitor-features.service';
import { ToastService } from '../../core/services/toast.service';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-task-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <div class="view-header">
        <h1>Tasks & Operations Board</h1>
        <div class="view-toggle">
            <button class="btn btn-sm" [class.outline]="viewMode() !== 'kanban'" (click)="viewMode.set('kanban')">📋 Kanban Board</button>
            <button class="btn btn-sm" [class.outline]="viewMode() !== 'list'" (click)="viewMode.set('list')">🗂 List View</button>
        </div>
    </div>

    <button class="btn" style="margin-bottom:14px;" (click)="showForm.set(!showForm())">{{ showForm() ? 'Cancel' : '+ New Task' }}</button>
    
    @if (showForm()) {
    <div class="form-panel">
        <label>Title <input type="text" [(ngModel)]="form.title" required /></label>
        <label>Description <textarea [(ngModel)]="form.description" rows="2"></textarea></label>
        <label>Linked Booking
            <select [(ngModel)]="form.booking_id">
                <option value="">None</option>
                @for (b of bookings(); track b.id) {
                    <option [value]="b.id">Booking #{{ b.booking_number }} ({{ b.customer_name }})</option>
                }
            </select>
        </label>
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

    @if (viewMode() === 'list') {
        <table>
            <thead><tr><th>Title</th><th>Assigned To</th><th>Priority</th><th>Status</th><th>Due</th><th>Actions</th></tr></thead>
            <tbody>
                @for (t of tasks(); track t.id) {
                    <tr>
                        <td>
                            <strong>{{ t.title }}</strong>
                            @if (t.booking_id) {
                                <br><small class="tag" style="display:inline-block;margin-top:4px">🔗 Booking #{{ t.booking_id }}</small>
                            }
                        </td>
                        <td>{{ t.assigned_name || '—' }}</td>
                        <td><span class="badge" [class]="t.priority">{{ t.priority }}</span></td>
                        <td><span class="badge" [class]="t.status || 'pending'">{{ t.status || 'pending' }}</span></td>
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
    } @else {
        <div class="kanban-board">
            <!-- Pending Column -->
            <div class="kanban-column">
                <div class="column-header" style="border-bottom-color: #ef4444">Pending ({{ pendingTasks().length }})</div>
                <div class="column-body">
                    @for (t of pendingTasks(); track t.id) {
                        <div class="task-card" [class]="'card-' + (t.priority || 'medium')">
                            <div class="card-title">{{ t.title }}</div>
                            @if (t.description) { <div class="card-desc">{{ t.description }}</div> }
                            <div class="card-meta">
                                @if (t.booking_id) {
                                    <span class="tag">🔗 Booking #{{ t.booking_id }}</span>
                                }
                                <span class="badge" [class]="t.priority || 'medium'">{{ t.priority || 'medium' }}</span>
                            </div>
                            <div class="card-foot">
                                <span>👤 {{ t.assigned_name || 'Unassigned' }}</span>
                                @if (t.due_date) { <span>📅 {{ t.due_date | date:'shortDate' }}</span> }
                            </div>
                            <div class="card-actions">
                                <button class="btn btn-xs" (click)="mark(t.id, 'in_progress')">Start →</button>
                                <button class="btn btn-xs btn-warn" (click)="remove(t.id)">Delete</button>
                            </div>
                        </div>
                    } @empty { <div class="empty">No pending tasks.</div> }
                </div>
            </div>

            <!-- In Progress Column -->
            <div class="kanban-column">
                <div class="column-header" style="border-bottom-color: #f59e0b">In Progress ({{ inProgressTasks().length }})</div>
                <div class="column-body">
                    @for (t of inProgressTasks(); track t.id) {
                        <div class="task-card" [class]="'card-' + (t.priority || 'medium')">
                            <div class="card-title">{{ t.title }}</div>
                            @if (t.description) { <div class="card-desc">{{ t.description }}</div> }
                            <div class="card-meta">
                                @if (t.booking_id) {
                                    <span class="tag">🔗 Booking #{{ t.booking_id }}</span>
                                }
                                <span class="badge" [class]="t.priority || 'medium'">{{ t.priority || 'medium' }}</span>
                            </div>
                            <div class="card-foot">
                                <span>👤 {{ t.assigned_name || 'Unassigned' }}</span>
                                @if (t.due_date) { <span>📅 {{ t.due_date | date:'shortDate' }}</span> }
                            </div>
                            <div class="card-actions">
                                <button class="btn btn-xs outline" (click)="mark(t.id, 'pending')">← Reset</button>
                                <button class="btn btn-xs btn-success" (click)="mark(t.id, 'completed')">Done ✓</button>
                            </div>
                        </div>
                    } @empty { <div class="empty">No tasks in progress.</div> }
                </div>
            </div>

            <!-- Completed Column -->
            <div class="kanban-column">
                <div class="column-header" style="border-bottom-color: #10b981">Completed ({{ completedTasks().length }})</div>
                <div class="column-body">
                    @for (t of completedTasks(); track t.id) {
                        <div class="task-card card-completed">
                            <div class="card-title" style="text-decoration:line-through">{{ t.title }}</div>
                            @if (t.description) { <div class="card-desc">{{ t.description }}</div> }
                            <div class="card-meta">
                                @if (t.booking_id) {
                                    <span class="tag">🔗 Booking #{{ t.booking_id }}</span>
                                }
                                <span class="badge completed">completed</span>
                            </div>
                            <div class="card-foot">
                                <span>👤 {{ t.assigned_name || 'Unassigned' }}</span>
                                @if (t.due_date) { <span>📅 {{ t.due_date | date:'shortDate' }}</span> }
                            </div>
                            <div class="card-actions">
                                <button class="btn btn-xs outline" (click)="mark(t.id, 'in_progress')">← Reopen</button>
                                <button class="btn btn-xs btn-warn" (click)="remove(t.id)">Delete</button>
                            </div>
                        </div>
                    } @empty { <div class="empty">No completed tasks.</div> }
                </div>
            </div>
        </div>
    }
    `,
    styles: [`
        .view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
        .view-toggle { display: flex; gap: 6px; }
        h1 { margin:0; font-size:1.3rem; }
        .btn { padding:8px 12px; border:none; border-radius:6px; background:#0f766e; color:#fff; cursor:pointer; font-size:13px; font-weight: 500; }
        .btn.outline { background: transparent; border: 1px solid #0f766e; color: #0f766e; }
        .btn.outline:hover { background: #0f766e; color: #fff; }
        .btn.ghost { background:#f3f4f6; color:#374151; }
        .btn.small { padding:4px 8px; font-size:12px; background:#0f766e; color:#fff; }
        .btn.warn { background:#b91c1c; }
        .form-panel { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:14px; margin-bottom:14px; max-width:540px; }
        .form-panel label { display:flex; flex-direction:column; gap:4px; margin-bottom:10px; font-size:12px; color:#374151; }
        .form-panel input, .form-panel select, .form-panel textarea { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; font-family: inherit; }
        .form-actions { display:flex; gap:8px; }
        table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; }
        th, td { padding:10px; text-align:left; border-bottom:1px solid #f3f4f6; font-size:13px; }
        th { background:#f9fafb; color:#6b7280; text-transform:uppercase; font-size:11px; }
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; text-transform:capitalize; font-weight: 600; }
        .badge.low { background:#dbeafe; color:#1d4ed8; }
        .badge.medium { background:#fef3c7; color:#92400e; }
        .badge.high { background:#fed7aa; color:#9a3412; }
        .badge.urgent { background:#fee2e2; color:#991b1b; }
        .badge.pending { background:#fef3c7; color:#92400e; }
        .badge.completed { background:#dcfce7; color:#166534; }
        .badge.in_progress { background:#dbeafe; color:#1d4ed8; }
        
        /* Kanban specific */
        .kanban-board { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-top: 14px; align-items: start; }
        .kanban-column { background: #f3f4f6; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; min-height: 450px; }
        .column-header { font-weight: 600; font-size: 13px; color: #374151; margin-bottom: 10px; text-transform: uppercase; border-bottom: 3px solid #e5e7eb; padding-bottom: 6px; }
        .column-body { display: flex; flex-direction: column; gap: 8px; flex: 1; }
        .task-card { background: #fff; border-radius: 6px; border: 1px solid #e5e7eb; padding: 10px; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .task-card.card-low { border-left: 4px solid #3b82f6; }
        .task-card.card-medium { border-left: 4px solid #f59e0b; }
        .task-card.card-high { border-left: 4px solid #f97316; }
        .task-card.card-urgent { border-left: 4px solid #ef4444; }
        .task-card.card-completed { border-left: 4px solid #10b981; opacity: 0.85; }
        .card-title { font-weight: 600; font-size: 13px; color: #111827; }
        .card-desc { font-size: 11px; color: #6b7280; white-space: pre-line; }
        .card-meta { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .tag { font-size: 10px; color: #4f46e5; background: #e0e7ff; padding: 2px 6px; border-radius: 4px; font-weight: 500; text-decoration: none; }
        .tag:hover { background: #c7d2fe; }
        .card-foot { display: flex; justify-content: space-between; font-size: 10px; color: #6b7280; margin-top: 4px; }
        .card-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 6px; border-top: 1px solid #f3f4f6; padding-top: 6px; }
        .btn.btn-xs { padding: 3px 6px; font-size: 10px; border-radius: 4px; }
        .btn.btn-xs.outline { background: transparent; border: 1px solid #9ca3af; color: #4b5563; }
        .btn.btn-xs.outline:hover { background: #f3f4f6; }
        .btn.btn-xs.btn-success { background: #10b981; color: #fff; border: none; }
        .btn.btn-xs.btn-warn { background: #ef4444; color: #fff; border: none; }

        .empty { color:#9ca3af; text-align:center; font-size: 12px; padding: 12px; }
    `]
})
export class TaskListComponent implements OnInit {
    private http = inject(HttpClient);
    private api = inject(TaskService);
    private toast = inject(ToastService);

    tasks = signal<any[]>([]);
    users = signal<any[]>([]);
    bookings = signal<any[]>([]);
    
    viewMode = signal<'list' | 'kanban'>('kanban');
    showForm = signal(false);
    saving = signal(false);
    
    form: any = { title: '', description: '', assigned_to: '', booking_id: '', due_date: '', priority: 'medium' };

    // Grouping computed signals
    pendingTasks = computed(() => this.tasks().filter(t => !t.status || t.status === 'pending'));
    inProgressTasks = computed(() => this.tasks().filter(t => t.status === 'in_progress'));
    completedTasks = computed(() => this.tasks().filter(t => t.status === 'completed'));

    ngOnInit() {
        this.http.get<any[]>('http://localhost:3000/api/users').subscribe(r => this.users.set(r));
        this.http.get<any>('http://localhost:3000/api/admin/bookings').subscribe(r => this.bookings.set(r.items || r));
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
        const payload = {
            ...this.form,
            booking_id: this.form.booking_id ? Number(this.form.booking_id) : null,
            assigned_to: this.form.assigned_to ? Number(this.form.assigned_to) : null,
            status: 'pending'
        };
        this.api.create(payload).subscribe({
            next: () => {
                this.saving.set(false);
                this.showForm.set(false);
                this.form = { title: '', description: '', assigned_to: '', booking_id: '', due_date: '', priority: 'medium' };
                this.load();
                this.toast.success('Created');
            },
            error: () => {
                this.saving.set(false);
                this.toast.error('Failed to create task');
            }
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
