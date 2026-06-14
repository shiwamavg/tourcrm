import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuickActionsService, QuickAction } from '../../core/services/quick-actions.service';

@Component({
    selector: 'app-quick-actions',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    @if (qa.open()) {
        <div class="qa-backdrop" (click)="qa.close()">
            <div class="qa-panel" (click)="$event.stopPropagation()">
                <div class="qa-header">
                    <input type="text"
                           placeholder="Type a command or shortcut…"
                           [(ngModel)]="query"
                           (ngModelChange)="onQueryChange($event)"
                           #inputRef
                           autofocus />
                    <span class="qa-hint">ESC to close</span>
                </div>
                <div class="qa-list">
                    @for (a of filtered(); track a.id) {
                        <button class="qa-item" (click)="run(a)">
                            <span class="qa-icon">{{ a.icon }}</span>
                            <span class="qa-label">{{ a.label }}</span>
                            <span class="qa-cat">{{ a.category }}</span>
                            @if (a.shortcut) {
                                <kbd class="qa-key">{{ a.shortcut }}</kbd>
                            }
                        </button>
                    }
                    @empty {
                        <div class="qa-empty">No commands found.</div>
                    }
                </div>
            </div>
        </div>
    }
    `,
    styles: [`
        .qa-backdrop {
            position: fixed; inset: 0; background: rgba(15,23,42,.45);
            display: flex; align-items: flex-start; justify-content: center;
            z-index: 10000; padding-top: 120px;
            animation: fadeIn .15s ease;
        }
        .qa-panel {
            background: #fff; border-radius: 12px; width: 560px; max-width: 90vw;
            box-shadow: 0 25px 60px rgba(0,0,0,.25);
            overflow: hidden; animation: popIn .18s ease;
        }
        .qa-header {
            display: flex; align-items: center; gap: 10px;
            padding: 14px 18px; border-bottom: 1px solid #e5e7eb;
        }
        .qa-header input {
            flex: 1; border: none; font-size: 15px; outline: none; background: transparent;
        }
        .qa-hint { font-size: 11px; color: #9ca3af; white-space: nowrap; }
        .qa-list { max-height: 360px; overflow-y: auto; padding: 6px; }
        .qa-item {
            display: flex; align-items: center; gap: 10px;
            width: 100%; padding: 10px 12px; border: none; border-radius: 6px;
            background: transparent; cursor: pointer; font: inherit; text-align: left;
            transition: background .12s;
        }
        .qa-item:hover { background: #f3f4f6; }
        .qa-icon { font-size: 16px; width: 24px; text-align: center; }
        .qa-label { flex: 1; font-size: 14px; color: #1f2937; }
        .qa-cat { font-size: 10px; text-transform: uppercase; letter-spacing: .04em;
                  color: #9ca3af; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
        .qa-key { font-size: 11px; color: #6b7280; background: #f3f4f6;
                   padding: 2px 6px; border-radius: 4px; border: 1px solid #e5e7eb; }
        .qa-empty { text-align: center; color: #9ca3af; padding: 24px; font-size: 14px; }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn  { from { transform: scale(.96); opacity: 0 } to { transform: scale(1); opacity: 1 } }
    `]
})
export class QuickActionsComponent {
    qa = inject(QuickActionsService);
    query = '';
    filtered = signal<QuickAction[]>([]);

    ngOnInit() {
        this.filtered.set(this.qa.getAll());
    }

    onQueryChange(q: string) {
        this.filtered.set(this.qa.search(q));
    }

    run(action: QuickAction) {
        this.qa.close();
        action.handler();
    }
}
