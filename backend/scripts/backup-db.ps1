param(
    [string]$BackupDir = $env:BACKUP_DIR,
    [string]$DbHost = $env:DB_HOST,
    [string]$DbUser = $env:DB_USER,
    [string]$DbPass = $env:DB_PASSWORD,
    [string]$DbName = $env:DB_NAME
)

$BackupDir = if ($BackupDir) { $BackupDir } else { 'backups' }
$DbHost = if ($DbHost) { $DbHost } else { 'localhost' }
$DbUser = if ($DbUser) { $DbUser } else { 'root' }
$DbPass = if ($DbPass) { $DbPass } else { '' }
$DbName = if ($DbName) { $DbName } else { 'tour_crm' }

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$backupFile = Join-Path $BackupDir "$($DbName)-$timestamp.sql"

Write-Host "Backing up database '$DbName' to $backupFile"
& mysqldump -h $DbHost -u $DbUser --password=$DbPass $DbName | Out-File -FilePath $backupFile -Encoding ascii

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup saved to $backupFile"
} else {
    Write-Error "Backup failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}
