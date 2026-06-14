import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-csv-upload',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="page-head">
        <div>
            <a routerLink="/leads" class="back-link">← All leads</a>
            <h1>Import Leads from CSV</h1>
            <p class="muted">Upload a CSV file, preview the data, and confirm before saving.</p>
        </div>
        <div class="actions">
            <a [href]="sampleUrl" download="leads-sample.csv" class="btn btn-outline">📥 Download sample</a>
        </div>
    </div>

    <!-- Step 1: Upload -->
    @if (step() === 'upload') {
        <div class="wizard-card">
            <div class="stepper">
                <div class="step active"><span>1</span> Upload</div>
                <div class="step"><span>2</span> Preview</div>
                <div class="step"><span>3</span> Confirm</div>
            </div>

            <div class="upload-area"
                 [class.dragover]="dragover()"
                 (dragover)="$event.preventDefault(); dragover.set(true)"
                 (dragleave)="dragover.set(false)"
                 (drop)="onDrop($event)">
                <div class="upload-icon">📁</div>
                <p><strong>Drag & drop</strong> your CSV file here<br>or <label class="file-link">browse<input type="file" accept=".csv" (change)="onFileSelected($event)" hidden></label></p>
                <p class="muted small">Maximum file size: 5 MB. Must include headers.</p>
            </div>

            <div class="help-box">
                <h4>Required columns</h4>
                <code>full_name</code>, <code>phone</code>
                <h4 style="margin-top:10px">Optional columns</h4>
                <code>email</code>, <code>destination_text</code>, <code>source</code>, <code>notes</code>, <code>follow_up_at</code>
                <p class="muted small" style="margin-top:8px">
                    <code>source</code> defaults to <strong>csv_upload</strong>. Valid sources: manual, phone, whatsapp, referral, walk_in, website_form, demo_request, google_sheet, meta_ads, other.
                </p>
            </div>
        </div>
    }

    <!-- Step 2: Preview -->
    @if (step() === 'preview') {
        <div class="wizard-card">
            <div class="stepper">
                <div class="step done"><span>✓</span> Upload</div>
                <div class="step active"><span>2</span> Preview</div>
                <div class="step"><span>3</span> Confirm</div>
            </div>

            <div class="preview-header">
                <div>
                    <h3>{{ filename() }}</h3>
                    <p class="muted">{{ preview().total }} rows found · <strong>{{ preview().valid }}</strong> valid · <strong style="color:#dc2626">{{ preview().invalid }}</strong> invalid</p>
                </div>
                <div class="actions">
                    <button class="btn btn-outline btn-sm" (click)="reset()">← Upload different file</button>
                    @if (preview().valid > 0) {
                        <button class="btn btn-primary btn-sm" (click)="goConfirm()">Continue →</button>
                    }
                </div>
            </div>

            @if (preview().invalid > 0) {
                <div class="alert alert-warning">
                    ⚠ {{ preview().invalid }} row(s) have errors and will be <strong>skipped</strong> on import. Fix them in your CSV and re-upload if needed.
                </div>
            }

            <div class="table-wrap">
                <table class="preview-table">
                    <thead>
                        <tr>
                            <th>Row</th>
                            <th>Status</th>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Destination</th>
                            <th>Source</th>
                            <th>Notes</th>
                            <th>Follow-up</th>
                            <th>Errors</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (item of preview().items; track item.row) {
                            <tr [class.invalid]="!item.valid">
                                <td>{{ item.row }}</td>
                                <td>
                                    @if (item.valid) {
                                        <span class="badge badge-valid">✓ Valid</span>
                                    } @else {
                                        <span class="badge badge-invalid">✕ Invalid</span>
                                    }
                                </td>
                                <td>{{ item.full_name || '—' }}</td>
                                <td>{{ item.phone || '—' }}</td>
                                <td>{{ item.email || '—' }}</td>
                                <td>{{ item.destination_text || '—' }}</td>
                                <td>{{ item.source }}</td>
                                <td class="cell-notes">{{ item.notes || '—' }}</td>
                                <td>{{ item.follow_up_at || '—' }}</td>
                                <td class="cell-errors">
                                    @if (item.errors.length) {
                                        <span class="error-text">{{ item.errors.join('; ') }}</span>
                                    } @else { — }
                                </td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
        </div>
    }

    <!-- Step 3: Confirm -->
    @if (step() === 'confirm') {
        <div class="wizard-card">
            <div class="stepper">
                <div class="step done"><span>✓</span> Upload</div>
                <div class="step done"><span>✓</span> Preview</div>
                <div class="step active"><span>3</span> Confirm</div>
            </div>

            <div class="confirm-box">
                <h3>Ready to import?</h3>
                <div class="confirm-stats">
                    <div class="cstat">
                        <div class="cstat-num">{{ preview().total }}</div>
                        <div class="cstat-label">Total rows</div>
                    </div>
                    <div class="cstat">
                        <div class="cstat-num" style="color:#16a34a">{{ preview().valid }}</div>
                        <div class="cstat-label">Will be imported</div>
                    </div>
                    <div class="cstat">
                        <div class="cstat-num" style="color:#dc2626">{{ preview().invalid }}</div>
                        <div class="cstat-label">Will be skipped</div>
                    </div>
                </div>

                @if (preview().invalid > 0) {
                    <div class="alert alert-warning">
                        ⚠ {{ preview().invalid }} invalid rows will be skipped. Only {{ preview().valid }} valid rows will be saved.
                    </div>
                }

                <div class="confirm-actions">
                    <button class="btn btn-outline" (click)="step.set('preview')">← Back to preview</button>
                    <button class="btn btn-primary" [disabled]="saving()" (click)="confirmImport()">
                        @if (saving()) {
                            <span class="spinner" style="width:14px;height:14px;border-width:2px;margin-right:6px"></span> Saving…
                        } @else {
                            ✅ Confirm & Import {{ preview().valid }} leads
                        }
                    </button>
                </div>
            </div>
        </div>
    }
    `,
    styles: [`
        .page-head { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:14px; }
        .page-head h1 { margin:6px 0 4px; }
        .back-link { color:#0f766e; text-decoration:none; font-size:13px; }
        .muted { color:#6b7280; margin:0; }
        .actions { display:flex; gap:8px; }
        .wizard-card {
            background:#fff; border-radius:10px;
            box-shadow:0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.06);
            padding:20px 24px;
        }
        .stepper {
            display:flex; gap:24px; margin-bottom:24px; padding-bottom:16px;
            border-bottom:1px solid #e5e7eb;
        }
        .step {
            display:flex; align-items:center; gap:8px;
            color:#9ca3af; font-size:13px; font-weight:500;
        }
        .step span {
            width:24px; height:24px; border-radius:50%;
            background:#e5e7eb; color:#6b7280;
            display:flex; align-items:center; justify-content:center;
            font-size:12px; font-weight:700;
        }
        .step.active { color:#0f766e; }
        .step.active span { background:#0f766e; color:#fff; }
        .step.done { color:#16a34a; }
        .step.done span { background:#16a34a; color:#fff; }

        .upload-area {
            border:2px dashed #d1d5db; border-radius:10px;
            padding:40px; text-align:center;
            transition: background .15s, border-color .15s;
            cursor: pointer;
        }
        .upload-area.dragover { background:#eff6ff; border-color:#2563eb; }
        .upload-icon { font-size:40px; margin-bottom:8px; }
        .file-link { color:#2563eb; font-weight:600; cursor:pointer; text-decoration:underline; }
        .help-box {
            margin-top:16px; background:#f9fafb; border-radius:8px;
            padding:14px 18px; font-size:13px;
        }
        .help-box h4 { margin:0 0 6px; font-size:13px; color:#374151; }
        code {
            background:#e5e7eb; padding:2px 6px; border-radius:4px;
            font-size:12px; color:#1f2937; font-family: monospace;
        }

        .preview-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
        .preview-header h3 { margin:0 0 2px; font-size:16px; }
        .alert {
            padding:10px 14px; border-radius:6px; font-size:13px; margin-bottom:14px;
        }
        .alert-warning { background:#fef3c7; color:#92400e; border:1px solid #fde68a; }
        .alert-success { background:#dcfce7; color:#166534; border:1px solid #86efac; }
        .table-wrap { overflow-x:auto; border-radius:8px; border:1px solid #e5e7eb; }
        .preview-table {
            width:100%; border-collapse:collapse; font-size:13px;
        }
        .preview-table th, .preview-table td {
            padding:8px 10px; text-align:left; border-bottom:1px solid #f3f4f6; white-space:nowrap;
        }
        .preview-table th {
            background:#f9fafb; color:#6b7280; font-size:11px; text-transform:uppercase;
            letter-spacing:.04em; font-weight:600;
        }
        .preview-table tbody tr:hover { background:#f9fafb; }
        .preview-table tbody tr.invalid { background:#fef2f2; }
        .preview-table tbody tr.invalid:hover { background:#fee2e2; }
        .cell-notes { max-width:160px; overflow:hidden; text-overflow:ellipsis; }
        .cell-errors { max-width:140px; }
        .error-text { color:#dc2626; font-size:11px; }

        .badge-valid { background:#dcfce7; color:#166534; }
        .badge-invalid { background:#fee2e2; color:#991b1b; }
        .badge {
            display:inline-block; padding:2px 8px; border-radius:10px;
            font-size:11px; font-weight:600;
        }

        .confirm-box { text-align:center; padding:24px; }
        .confirm-stats {
            display:flex; justify-content:center; gap:32px; margin:20px 0;
        }
        .cstat { text-align:center; }
        .cstat-num { font-size:2rem; font-weight:700; }
        .cstat-label { font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:.04em; }
        .confirm-actions { display:flex; justify-content:center; gap:10px; margin-top:20px; }

        .btn { padding:8px 14px; border:none; border-radius:6px; cursor:pointer; font:inherit; }
        .btn-primary { background:#0f766e; color:#fff; }
        .btn-primary:hover:not(:disabled) { background:#115e59; }
        .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
        .btn-outline { background:#fff; color:#374151; border:1px solid #d1d5db; }
        .btn-sm { padding:6px 12px; font-size:13px; }
        .small { font-size:12px; }
    `]
})
export class CsvUploadComponent {
    private api = inject(ApiService);
    private toast = inject(ToastService);
    private router = inject(Router);

    step = signal<'upload' | 'preview' | 'confirm'>('upload');
    dragover = signal(false);
    filename = signal('');
    preview = signal<{ total: number; valid: number; invalid: number; items: any[] }>({ total: 0, valid: 0, invalid: 0, items: [] });
    saving = signal(false);
    private currentFile: File | null = null;

    sampleUrl = this.api.downloadSampleCsv();

    onDrop(ev: DragEvent) {
        ev.preventDefault();
        this.dragover.set(false);
        const file = ev.dataTransfer?.files?.[0];
        if (file) this.processFile(file);
    }

    onFileSelected(ev: Event) {
        const file = (ev.target as HTMLInputElement).files?.[0];
        if (file) this.processFile(file);
    }

    private processFile(file: File) {
        if (!file.name.endsWith('.csv')) {
            this.toast.error('Please upload a .csv file.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            this.toast.error('File is too large. Max 5 MB.');
            return;
        }
        this.currentFile = file;
        this.filename.set(file.name);
        this.api.previewBulkImport(file).subscribe({
            next: r => {
                this.preview.set(r);
                this.step.set('preview');
                if (r.invalid > 0) {
                    this.toast.warning(`${r.invalid} rows have errors. Review before confirming.`);
                }
            },
            error: e => {
                this.toast.error(e.error?.error || 'Failed to parse CSV.');
            }
        });
    }

    goConfirm() {
        this.step.set('confirm');
    }

    reset() {
        this.step.set('upload');
        this.preview.set({ total: 0, valid: 0, invalid: 0, items: [] });
        this.currentFile = null;
        this.filename.set('');
    }

    confirmImport() {
        if (!this.currentFile) return;
        this.saving.set(true);
        this.api.bulkImportLeads(this.currentFile).subscribe({
            next: r => {
                this.saving.set(false);
                this.toast.success(`${r.inserted} leads imported successfully!`);
                if (r.skipped > 0) {
                    this.toast.warning(`${r.skipped} rows were skipped.`);
                }
                this.router.navigate(['/leads']);
            },
            error: e => {
                this.saving.set(false);
                this.toast.error(e.error?.error || 'Import failed.');
            }
        });
    }
}
