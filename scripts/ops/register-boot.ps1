# One-time server setup for self-hosting (ADR-0007). Run in an elevated PowerShell from the repo:
#   powershell -ExecutionPolicy Bypass -File scripts\ops\register-boot.ps1
# - PM2_HOME is machine-wide so the boot task (SYSTEM) and admins share one pm2 daemon.
# - Task "Flashd pm2" runs `pm2 resurrect` at startup (restores flashd-web, flashd-cleanup, nginx
#   as saved by `pm2 save`).
# - Firewall: only TCP 80 (nginx) is opened; the app listens on 127.0.0.1 only.
$ErrorActionPreference = "Stop"

$pm2Home = "C:\ProgramData\pm2"
$nodeDir = "C:\nvm4w\nodejs"
$node = Join-Path $nodeDir "node.exe"
$pm2 = Join-Path $nodeDir "node_modules\pm2\bin\pm2"

[Environment]::SetEnvironmentVariable("PM2_HOME", $pm2Home, "Machine")
New-Item -ItemType Directory -Force $pm2Home | Out-Null

$action = New-ScheduledTaskAction -Execute "cmd.exe" `
  -Argument "/c set PM2_HOME=$pm2Home&& `"$node`" `"$pm2`" resurrect"
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
Register-ScheduledTask -TaskName "Flashd pm2" -Action $action -Trigger $trigger -Principal $principal `
  -Settings $settings -Description "pm2 resurrect at boot (ADR-0007)" -Force | Out-Null

if (-not (Get-NetFirewallRule -DisplayName "Flashd HTTP (80)" -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName "Flashd HTTP (80)" -Direction Inbound -Protocol TCP -LocalPort 80 `
    -Action Allow | Out-Null
}

Get-ScheduledTask -TaskName "Flashd pm2" | Select-Object TaskName, State
Get-NetFirewallRule -DisplayName "Flashd HTTP (80)" | Select-Object DisplayName, Enabled, Action
