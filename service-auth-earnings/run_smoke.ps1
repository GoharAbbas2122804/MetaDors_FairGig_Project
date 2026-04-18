Set-Location "D:\dgsusagduysad\service-auth-earnings"
$needInstall = -not (Test-Path ".\node_modules")
if ($needInstall) { npm install }
$stdoutLog = Join-Path $PWD "smoke_service_stdout.log"
$stderrLog = Join-Path $PWD "smoke_service_stderr.log"
if (Test-Path $stdoutLog) { Remove-Item $stdoutLog -Force }
if (Test-Path $stderrLog) { Remove-Item $stderrLog -Force }
$proc = $null
function Invoke-JsonPost {
  param([string]$Url,[hashtable]$Payload)
  $body = $Payload | ConvertTo-Json -Depth 10
  try {
    $resp = Invoke-WebRequest -Uri $Url -Method Post -ContentType "application/json" -Body $body -UseBasicParsing
    $content = $resp.Content
    $json = $null
    try { $json = $content | ConvertFrom-Json } catch {}
    [pscustomobject]@{ StatusCode = [int]$resp.StatusCode; Json = $json; Error = $null }
  } catch {
    $status = $null
    $content = $null
    $json = $null
    if ($_.Exception.Response) {
      try { $status = [int]$_.Exception.Response.StatusCode } catch {}
      try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $content = $reader.ReadToEnd()
        $reader.Close()
      } catch {}
      if ($content) { try { $json = $content | ConvertFrom-Json } catch {} }
    }
    [pscustomobject]@{ StatusCode = $status; Json = $json; Error = $_.Exception.Message }
  }
}
function Get-KeyFields {
  param($Result)
  $msg = $null; $success = $null; $tokenPresent = $false; $userId = $null; $email = $null; $role = $null
  if ($Result.Json) {
    if ($Result.Json.PSObject.Properties.Name -contains "message") { $msg = $Result.Json.message }
    if ($Result.Json.PSObject.Properties.Name -contains "success") { $success = $Result.Json.success }
    if ($Result.Json.PSObject.Properties.Name -contains "token") { $tokenPresent = [bool]$Result.Json.token }
    if ($Result.Json.PSObject.Properties.Name -contains "user") {
      $u = $Result.Json.user
      if ($u) {
        if ($u.PSObject.Properties.Name -contains "id") { $userId = $u.id }
        if (-not $userId -and ($u.PSObject.Properties.Name -contains "_id")) { $userId = $u._id }
        if ($u.PSObject.Properties.Name -contains "email") { $email = $u.email }
        if ($u.PSObject.Properties.Name -contains "role") { $role = $u.role }
      }
    }
  }
  [pscustomobject]@{ message = $msg; success = $success; tokenPresent = $tokenPresent; userId = $userId; email = $email; role = $role }
}
try {
  $proc = Start-Process -FilePath "node" -ArgumentList "index.js" -WorkingDirectory $PWD -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru
  $ready = $false
  for ($i = 0; $i -lt 80 -and -not $ready; $i++) {
    if ($proc.HasExited) { break }
    $ready = (Test-NetConnection -ComputerName "127.0.0.1" -Port 5001 -WarningAction SilentlyContinue).TcpTestSucceeded
  }
  $ts = Get-Date -Format "yyyyMMddHHmmssfff"
  $email = "smoke_fix_$ts@example.com"
  $password = "Passw0rd!23"
  $registerResult = Invoke-JsonPost -Url "http://127.0.0.1:5001/api/auth/register" -Payload @{ email = $email; password = $password; role = "worker" }
  $loginResult = Invoke-JsonPost -Url "http://127.0.0.1:5001/api/auth/login" -Payload @{ email = $email; password = $password; role = "worker" }
  $stdoutTail = ""
  $stderrTail = ""
  if (Test-Path $stdoutLog) { $stdoutTail = (Get-Content $stdoutLog | Select-Object -Last 40) -join "`n" }
  if (Test-Path $stderrLog) { $stderrTail = (Get-Content $stderrLog | Select-Object -Last 40) -join "`n" }
  [pscustomobject]@{
    InstalledDependencies = $needInstall
    ServiceProcessId = if ($proc) { $proc.Id } else { $null }
    ServiceExitedEarly = if ($proc) { $proc.HasExited } else { $true }
    ServiceReadyOnPort5001 = $ready
    SmokeEmail = $email
    RegisterStatusCode = $registerResult.StatusCode
    RegisterKeyFields = Get-KeyFields -Result $registerResult
    LoginStatusCode = $loginResult.StatusCode
    LoginKeyFields = Get-KeyFields -Result $loginResult
    StartupStdoutTail = $stdoutTail
    StartupStderrTail = $stderrTail
  } | ConvertTo-Json -Depth 8
} finally {
  if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
}
