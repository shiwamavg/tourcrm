import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface QuickAction {
    id: string;
    label: string;
    shortcut?: string;
    icon: string;
    handler: () => void;
    category: 'navigation' | 'create' | 'action' | 'view';
}

@Injectable({ providedIn: 'root' })
export class QuickActionsService {
    private router = inject(Router);
    private _open = signal(false);
    open = this._open.asReadonly();

    private actions: QuickAction[] = [];

    register(actions: QuickAction[]) {
        this.actions.push(...actions);
    }

    toggle() { this._open.update(v => !v); }
    close() { this._open.set(false); }

    getAll(): QuickAction[] {
        return [...this.actions];
    }

    search(query: string): QuickAction[] {
        const q = query.toLowerCase();
        return this.actions.filter(a =>
            a.label.toLowerCase().includes(q) ||
            a.category.includes(q as any) ||
            (a.shortcut && a.shortcut.toLowerCase().includes(q))
        );
    }

    initGlobalShortcuts() {
        // Global keyboard shortcut listener
        document.addEventListener('keydown', (e) => {
            // Alt + K = open command palette
            if (e.altKey && e.key === 'k') {
                e.preventDefault();
                this.toggle();
                return;
            }
            // Escape = close
            if (e.key === 'Escape' && this._open()) {
                this.close();
                return;
            }
            // Shortcut matching for registered actions
            for (const action of this.actions) {
                if (!action.shortcut) continue;
                if (this.matchShortcut(e, action.shortcut)) {
                    e.preventDefault();
                    action.handler();
                    return;
                }
            }
        });
    }

    private matchShortcut(e: KeyboardEvent, shortcut: string): boolean {
        const parts = shortcut.toLowerCase().split('+').map(s => s.trim());
        const key = parts.pop()!;
        const needsCtrl = parts.includes('ctrl');
        const needsAlt = parts.includes('alt');
        const needsShift = parts.includes('shift');
        return (
            e.key.toLowerCase() === key &&
            e.ctrlKey === needsCtrl &&
            e.altKey === needsAlt &&
            e.shiftKey === needsShift &&
            !e.metaKey
        );
    }

    // Built-in global actions
    setupDefaults() {
        this.register([
            { id: 'nav-dashboard', label: 'Go to Dashboard', shortcut: 'alt+d', icon: '📊', category: 'navigation', handler: () => this.router.navigate(['/dashboard']) },
            { id: 'nav-leads', label: 'Go to Leads', shortcut: 'alt+l', icon: '🎯', category: 'navigation', handler: () => this.router.navigate(['/leads']) },
            { id: 'nav-quotations', label: 'Go to Quotations', shortcut: 'alt+q', icon: '📋', category: 'navigation', handler: () => this.router.navigate(['/quotations']) },
            { id: 'nav-bookings', label: 'Go to Bookings', shortcut: 'alt+b', icon: '📦', category: 'navigation', handler: () => this.router.navigate(['/bookings']) },
            { id: 'nav-payments', label: 'Go to Payments', shortcut: 'alt+p', icon: '💰', category: 'navigation', handler: () => this.router.navigate(['/payments']) },
            { id: 'nav-invoices', label: 'Go to Invoices', shortcut: 'alt+i', icon: '🧾', category: 'navigation', handler: () => this.router.navigate(['/invoices']) },
            { id: 'nav-reviews', label: 'Go to Reviews', shortcut: 'alt+r', icon: '⭐', category: 'navigation', handler: () => this.router.navigate(['/reviews']) },
            { id: 'create-quotation', label: 'New Quotation', shortcut: 'alt+shift+q', icon: '➕', category: 'create', handler: () => this.router.navigate(['/quotations/new']) },
            { id: 'create-lead', label: 'New Lead', shortcut: 'alt+shift+l', icon: '➕', category: 'create', handler: () => this.router.navigate(['/leads/new']) },
            { id: 'create-booking', label: 'New Booking', shortcut: 'alt+shift+b', icon: '➕', category: 'create', handler: () => { /* navigate to create booking when available */ } },
        ]);
        this.initGlobalShortcuts();
    }
}
