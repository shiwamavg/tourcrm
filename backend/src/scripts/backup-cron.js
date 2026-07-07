// src/scripts/backup-cron.js
// Automated MySQL backup scheduler for SaaS platform

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const env = require('../config/env');

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
const LOG_DIR = path.resolve(process.cwd(), 'logs');

try { fs.mkdirSync(BACKUP_DIR, { recursive: true }); } catch (e) {}
try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch (e) {}

function appendLog(file, msg) {
    const time = new Date().toISOString();
    fs.appendFileSync(path.join(LOG_DIR, file), `[${time}] ${msg}\n`);
}

async function runBackup() {
    console.log(`[${new Date().toISOString()}] Starting automated database backup...`);
    appendLog('backup-cron.log', 'Backup started');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `db_backup_${timestamp}.sql.gz`;
    const filepath = path.join(BACKUP_DIR, filename);

    // Assuming mysql credentials in env
    const user = env.dbUser;
    const password = env.dbPassword;
    const host = env.dbHost;
    const database = env.dbName;

    // Use mysqldump and gzip to create a compressed backup
    const cmd = `mysqldump -u ${user} -p${password} -h ${host} ${database} | gzip > ${filepath}`;

    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error('Backup failed:', error);
                appendLog('backup-cron.log', `ERROR: ${error.message}`);
                reject(error);
            } else {
                console.log(`[Backup Success] File saved to ${filepath}`);
                appendLog('backup-cron.log', `Backup completed: ${filename}`);
                
                // Cleanup old backups (keep last 7 days)
                cleanupOldBackups(7);
                resolve(filepath);
            }
        });
    });
}

function cleanupOldBackups(daysToKeep) {
    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    let deletedCount = 0;

    files.forEach(file => {
        if (file.endsWith('.sql.gz')) {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            const ageInDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

            if (ageInDays > daysToKeep) {
                fs.unlinkSync(filePath);
                deletedCount++;
                appendLog('backup-cron.log', `Deleted old backup: ${file}`);
            }
        }
    });

    if (deletedCount > 0) {
        console.log(`[Backup Cleanup] Removed ${deletedCount} old backup files.`);
    }
}

if (require.main === module) {
    runBackup().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
} else {
    module.exports = { runBackup };
}
