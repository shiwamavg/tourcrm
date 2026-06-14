import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-toast-container',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="toast-stack" role="region" aria-label="Notifications">
        @for (t of toast.toasts(); track t.id) {
            <div class="toast toast-{{ t.type }}">
                <div class="toast-icon">{{ iconFor(t.type) }}</div>
                <div class="toast-body">
                    <div class="toast-msg">{{ t.message }}</div>
                    @if (t.action) {
                        <button class="toast-action" (click)="t.action.callback(); toast.dismiss(t.id)">
                            {{ t.action.label }}
                        </button>
                    }
                </div>
                <button class="toast-close" (click)="toast.dismiss(t.id)" aria-label="Dismiss">×</button>
            </div>
        }
    </div>
    `,
    styles: [`
        .toast-stack {
            position: fixed; top: 16px; right: 16px; z-index: 9999;
            display: flex; flex-direction: column; gap: 10px;
            max-width: 420px; width: calc(100% - 32px);
            pointer-events: none;
        }
        .toast {
            pointer-events: auto;
            display: flex; align-items: flex-start; gap: 10px;
            background: #ffffff !important; border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,.12), 0 4px 6px rgba(0,0,0,.06);
            padding: 12px 14px; border-left: 4px solid #2563eb;
            animation: slideIn .25s ease;
        }
        .toast-success { border-left-color: #16a34a; }
        .toast-error   { border-left-color: #dc2626; }
        .toast-warning { border-left-color: #d97706; }
        .toast-info    { border-left-color: #2563eb; }
        .toast-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
        .toast-body { flex: 1; min-width: 0; }
        .toast-msg { font-size: 13px; color: #1f2937 !important; line-height: 1.4; word-break: break-word; }
        .toast-action {
            background: none; border: none; color: #2563eb !important; font-size: 12px; font-weight: 600;
            cursor: pointer; padding: 0; margin-top: 4px; text-decoration: underline;
        }
        .toast-close {
            background: none; border: none; font-size: 18px; color: #9ca3af !important;
            cursor: pointer; padding: 0; line-height: 1; margin-left: 4px;
        }
        .toast-close:hover { color: #4b5563 !important; }
        @keyframes slideIn {
            from { transform: translateX(120%); opacity: 0; }
            to   { transform: translateX(0);   opacity: 1; }
        }
    `]
})
export class ToastContainerComponent {
    toast = inject(ToastService);

    iconFor(type: string): string {
        switch (type) {
            case 'success': return '✓';
            case 'error':   return '✕';
            case 'warning': return '!';
            default:        return 'ℹ';
        }
    }
}
