import { Injectable, signal } from '@angular/core';

export interface SearchResult {
    id: number | string;
    type: 'lead' | 'quotation' | 'booking' | 'payment' | 'invoice' | 'review';
    title: string;
    subtitle: string;
    route: string[];
    icon: string;
    meta?: string;
}

@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
    private _open = signal(false);
    open = this._open.asReadonly();
    private _query = signal('');
    query = this._query.asReadonly();
    private _results = signal<SearchResult[]>([]);
    results = this._results.asReadonly();
    private _loading = signal(false);
    loading = this._loading.asReadonly();

    private debounceTimer: any;

    toggle() { this._open.update(v => !v); }
    close() { this._open.set(false); this._query.set(''); this._results.set([]); }

    setQuery(q: string) {
        this._query.set(q);
        clearTimeout(this.debounceTimer);
        if (q.length < 2) {
            this._results.set([]);
            return;
        }
        this.debounceTimer = setTimeout(() => this.search(q), 200);
    }

    private async search(q: string) {
        this._loading.set(true);
        // In a real app, this would call the backend search API
        // For now we simulate instant client-side search from cached data
        // or we could call list endpoints in parallel
        this._loading.set(false);
    }

    // Expose shortcut registration
    initShortcut() {
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.shiftKey && e.key === 'f') {
                e.preventDefault();
                this.toggle();
            }
            if (e.key === 'Escape' && this._open()) {
                this.close();
            }
        });
    }
}
