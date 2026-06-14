#!/usr/bin/env node
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'tour_crm';
const BACKUP_DIR = process.env.BACKUP_DIR || path.resolve(process.cwd(), '..', 'backups');
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10);

function mkdirp(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true}); }
function timestamp(){ const d=new Date(); return d.toISOString().replace(/[:]/g,'').replace(/T/,'_').replace(/\..+$/,''); }

function verifyBackupIntegrity(filepath) {
  try {
    if (!fs.existsSync(filepath)) {
      console.error(`Integrity check failed: File does not exist: ${filepath}`);
      return false;
    }
    const stats = fs.statSync(filepath);
    if (stats.size === 0) {
      console.error(`Integrity check failed: File is empty (0 bytes): ${filepath}`);
      return false;
    }
    
    if (filepath.endsWith('.dryrun')) {
      return true;
    }

    // Read the file to see if it contains valid SQL/mysqldump completion signature
    const content = fs.readFileSync(filepath, 'utf8');
    if (!content.includes('CREATE TABLE') && !content.includes('INSERT INTO') && !content.includes('Dump completed')) {
      console.error(`Integrity check failed: File does not contain typical database dump contents or completion signature: ${filepath}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Integrity check raised error: ${err.message}`);
    return false;
  }
}

function rotateBackups(){
  try{
    if (!fs.existsSync(BACKUP_DIR)) return;
    const files = fs.readdirSync(BACKUP_DIR).map(f=>({f, p:path.join(BACKUP_DIR,f), c:fs.statSync(path.join(BACKUP_DIR,f)).ctime}));
    const cutoff = Date.now() - RETENTION_DAYS*24*3600*1000;
    for(const file of files){ if(file.c.getTime() < cutoff){ fs.unlinkSync(file.p); console.log('Removed old backup', file.f); } }
  }catch(e){ console.error('rotate error', e.message); }
}

function run(){
  mkdirp(BACKUP_DIR);
  const fname = `backup_${DB_NAME}_${timestamp()}.sql`;
  const fpath = path.join(BACKUP_DIR, fname);

  if (DRY){
    const dryPath = fpath + '.dryrun';
    fs.writeFileSync(dryPath, `DRY RUN backup for ${DB_NAME} at ${new Date().toISOString()}`);
    console.log('Dry-run created', dryPath);
    if (verifyBackupIntegrity(dryPath)) {
      console.log('Dry-run integrity verification passed.');
      rotateBackups();
    } else {
      process.exit(4);
    }
    return;
  }

  const dump = spawn('mysqldump', ['-h', DB_HOST, '-u', DB_USER, `-p${DB_PASSWORD}`, DB_NAME], {stdio: ['ignore','pipe','inherit']});
  const out = fs.createWriteStream(fpath);
  dump.stdout.pipe(out);
  dump.on('close', (code) => {
    if (code === 0){
      if (verifyBackupIntegrity(fpath)) {
        console.log('Backup written successfully and integrity verified:', fpath);
        rotateBackups();
      } else {
        try { fs.unlinkSync(fpath); } catch (e) {}
        console.error('Backup integrity check failed for', fpath);
        process.exit(5);
      }
    } else {
      console.error('mysqldump exited with', code);
      try{ fs.unlinkSync(fpath); }catch(e){}
      process.exit(2);
    }
  });
  dump.on('error', (err)=>{ console.error('Failed to start mysqldump', err.message); process.exit(3); });
}

run();
