import { Injectable, signal } from '@angular/core';

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration: number;
    action?: { label: string; callback: () => void };
}

let toastId = 0;

@Injectable({ providedIn: 'root' })
export class ToastService {
    private _toasts = signal<Toast[]>([]);
    toasts = this._toasts.asReadonly();

    private add(message: string, type: Toast['type'], duration = 4000, action?: Toast['action']) {
        const id = ++toastId;
        const toast: Toast = { id, message, type, duration, action };
        this._toasts.update(t => [...t, toast]);
        if (duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
        }
        return id;
    }

    success(message: string, duration?: number) { return this.add(message, 'success', duration); }
    error(message: string, duration?: number) { return this.add(message, 'error', duration || 6000); }
    warning(message: string, duration?: number) { return this.add(message, 'warning', duration); }
    info(message: string, duration?: number) { return this.add(message, 'info', duration); }

    dismiss(id: number) {
        this._toasts.update(t => t.filter(x => x.id !== id));
    }

    dismissAll() {
        this._toasts.set([]);
    }
}
