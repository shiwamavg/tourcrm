Backup runner and scheduling

Files:
- `scripts/backup-runner.js` — Node script to run `mysqldump`, rotate old backups, supports `--dry-run`.

Environment variables:
- `DB_HOST` (default 127.0.0.1)
- `DB_USER` (default root)
- `DB_PASSWORD` (default empty)
- `DB_NAME` (default tour_crm)
- `BACKUP_DIR` (default ../backups)
- `BACKUP_RETENTION_DAYS` (default 7)

Dry-run quick test (no mysqldump needed):

```bash
cd backend
node scripts/backup-runner.js --dry-run
```

Cron example (daily at 02:00):

```cron
0 2 * * * cd /path/to/TourCRM/backend && /usr/bin/env node scripts/backup-runner.js >> /var/log/tourcrm/backup.log 2>&1
```

Systemd timer/service example:
- Create `/etc/systemd/system/tourcrm-backup.service` to run the node script
- Create `/etc/systemd/system/tourcrm-backup.timer` to schedule daily runs

Windows scheduled task (PowerShell):
- Use `Register-ScheduledTask` to run `powershell -File C:\path\to\backup-db.ps1` or run node script directly.

Retention and offsite:
- Backups are rotated locally by `BACKUP_RETENTION_DAYS`.
- For production, copy backups offsite (S3, remote server) and encrypt the stored files.
