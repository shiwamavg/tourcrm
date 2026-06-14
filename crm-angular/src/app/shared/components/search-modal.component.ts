import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GlobalSearchService } from '../../core/services/global-search.service';

@Component({
    selector: 'app-search-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    @if (search.open()) {
        <div class="sm-backdrop" (click)="search.close()">
            <div class="sm-panel" (click)="$event.stopPropagation()">
                <div class="sm-header">
                    <input type="text" [(ngModel)]="query"
                           (ngModelChange)="onQueryChange($event)"
                           placeholder="Search leads, quotations, bookings, invoices…"
                           autofocus />
                    <span class="sm-hint">ESC to close</span>
                </div>
                <div class="sm-body">
                    @if (search.loading()) {
                        <div class="sm-loading"><span class="spinner"></span> Searching…</div>
                    } @else if (results().length) {
                        @for (r of results(); track r.id) {
                            <button class="sm-result" (click)="go(r)">
                                <span class="sm-icon">{{ r.icon }}</span>
                                <div class="sm-info">
                                    <div class="sm-title">{{ r.title }}</div>
                                    <div class="sm-sub">{{ r.subtitle }}</div>
                                </div>
                                <span class="sm-type">{{ r.type }}</span>
                            </button>
                        }
                    } @else if (query().length >= 2) {
                        <div class="sm-empty">No results found.</div>
                    } @else {
                        <div class="sm-empty">Type at least 2 characters to search.</div>
                    }
                </div>
            </div>
        </div>
    }
    `,
    styles: [`
        .sm-backdrop {
            position: fixed; inset: 0; background: rgba(15,23,42,.45);
            display: flex; align-items: flex-start; justify-content: center;
            z-index: 10000; padding-top: 100px; animation: fadeIn .15s ease;
        }
        .sm-panel {
            background: #fff; border-radius: 12px; width: 640px; max-width: 92vw;
            box-shadow: 0 25px 60px rgba(0,0,0,.25); overflow: hidden;
            animation: popIn .18s ease;
        }
        .sm-header {
            display: flex; align-items: center; gap: 10px;
            padding: 14px 18px; border-bottom: 1px solid #e5e7eb;
        }
        .sm-header input {
            flex: 1; border: none; font-size: 15px; outline: none; background: transparent;
        }
        .sm-hint { font-size: 11px; color: #9ca3af; white-space: nowrap; }
        .sm-body { max-height: 400px; overflow-y: auto; padding: 6px; }
        .sm-result {
            display: flex; align-items: center; gap: 12px;
            width: 100%; padding: 10px 12px; border: none; border-radius: 6px;
            background: transparent; cursor: pointer; font: inherit; text-align: left;
            transition: background .12s;
        }
        .sm-result:hover { background: #f3f4f6; }
        .sm-icon { font-size: 18px; width: 28px; text-align: center; }
        .sm-info { flex: 1; min-width: 0; }
        .sm-title { font-size: 14px; font-weight: 600; color: #1f2937; }
        .sm-sub  { font-size: 12px; color: #6b7280; }
        .sm-type { font-size: 10px; text-transform: uppercase; letter-spacing: .04em;
                    color: #9ca3af; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; }
        .sm-empty, .sm-loading { text-align: center; color: #9ca3af; padding: 32px; font-size: 14px; }
        .sm-loading .spinner { margin-right: 8px; }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn  { from { transform: scale(.96); opacity: 0 } to { transform: scale(1); opacity: 1 } }
    `]
})
export class SearchModalComponent {
    search = inject(GlobalSearchService);
    router = inject(Router);
    query = signal('');
    results = signal<any[]>([]);

    onQueryChange(q: string) {
        this.search.setQuery(q);
        this.query.set(q);
    }

    go(r: any) {
        this.search.close();
        this.router.navigate(r.route);
    }
}
