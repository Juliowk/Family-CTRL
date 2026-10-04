<#
.SYNOPSIS
  Sobe o ambiente de desenvolvimento: PostgreSQL (Docker), backend (Spring Boot) e frontend (Vite).

.DESCRIPTION
  1. Confere ferramentas e portas.
  2. Sobe o PostgreSQL com docker compose e espera o healthcheck.
  3. Sobe o backend e espera /actuator/health responder UP.
     - No Windows Terminal: numa nova aba da mesma janela (os logs do Spring ficam lá).
     - Fora dele (ex.: terminal do VS Code): em segundo plano, com logs em target/backend.log.
  4. Só então sobe o frontend neste terminal, mostrando apenas avisos e erros do Vite.
  Ctrl+C encerra front e back. O banco continua rodando (para parar: docker compose stop).
#>

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

$URL_BACKEND = 'http://localhost:8080'
$URL_FRONTEND = 'http://localhost:5173'
$TITULO_ABA = 'Family Ctrl - backend'
$LOG_BACKEND = Join-Path $raiz 'target\backend.log'
# Sinal para o script da aba do backend saber que o encerramento foi pedido (e fechar a aba)
$SINAL_ENCERRAR = Join-Path $env:TEMP 'familyctrl-encerrar'
$TOTAL_PASSOS = 4

# ------------------------------------------------------------------ saída
function Passo([int]$numero, [string]$texto) {
  Write-Host ("  [{0}/{1}] {2,-34}" -f $numero, $TOTAL_PASSOS, $texto) -NoNewline
}
function Ok([string]$detalhe = '') {
  Write-Host 'ok' -ForegroundColor Green -NoNewline
  if ($detalhe) { Write-Host "  $detalhe" -ForegroundColor DarkGray } else { Write-Host '' }
}
function Falhar([string]$mensagem, [string]$detalhes = '') {
  Write-Host 'falhou' -ForegroundColor Red
  Write-Host ''
  Write-Host "  $mensagem" -ForegroundColor Red
  if ($detalhes) { Write-Host ($detalhes.Trim() -replace '(?m)^', '    ') -ForegroundColor DarkGray }
  Write-Host ''
  exit 1
}
function Aguardar([scriptblock]$pronto, [int]$segundos, [scriptblock]$desistir = { $false }) {
  $inicio = Get-Date
  while (((Get-Date) - $inicio).TotalSeconds -lt $segundos) {
    if (& $pronto) { return [int]((Get-Date) - $inicio).TotalSeconds }
    if (& $desistir) { return -1 }
    Start-Sleep -Milliseconds 1000
  }
  return -1
}
function PortaEmUso([int]$porta) {
  $null -ne (Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue)
}
# Encerra o processo e os filhos. Via cmd para o PowerShell 5.1 não exibir como erro a
# mensagem do taskkill quando o processo já terminou.
function Encerrar([int]$id) {
  cmd /c "taskkill /PID $id /T /F >nul 2>&1"
}
function EncerrarPorta([int]$porta) {
  Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Encerrar $_ }
}
function BackendNoAr {
  try {
    $resposta = Invoke-RestMethod "$URL_BACKEND/actuator/health" -TimeoutSec 2
    return $resposta.status -eq 'UP'
  } catch { return $false }
}
function FrontendNoAr {
  try {
    $null = Invoke-WebRequest $URL_FRONTEND -UseBasicParsing -TimeoutSec 2
    return $true
  } catch { return $false }
}

Write-Host ''
Write-Host '  Family Ctrl' -ForegroundColor Cyan -NoNewline
Write-Host '  ambiente de desenvolvimento' -ForegroundColor DarkGray
Write-Host ''

# ------------------------------------------------------------------ 1. pré-requisitos
Passo 1 'Ferramentas e portas'
foreach ($comando in 'docker', 'java', 'node') {
  if (-not (Get-Command $comando -ErrorAction SilentlyContinue)) {
    Falhar "'$comando' não foi encontrado no PATH."
  }
}
$null = cmd /c 'docker info 2>&1'
if ($LASTEXITCODE -ne 0) { Falhar 'O Docker não está rodando. Abra o Docker Desktop e tente de novo.' }
foreach ($porta in 8080, 5173) {
  if (PortaEmUso $porta) {
    Falhar "A porta $porta já está em uso. Feche o processo que a ocupa (outra execução deste script?)."
  }
}
if (-not (Test-Path 'frontend/node_modules')) {
  $saida = cmd /c 'cd frontend && npm install --no-fund --no-audit --loglevel=error 2>&1'
  if ($LASTEXITCODE -ne 0) { Falhar 'Falha ao instalar as dependências do frontend (npm install).' ($saida | Out-String) }
  Ok 'dependências do frontend instaladas'
} else {
  Ok
}

# ------------------------------------------------------------------ 2. banco
Passo 2 'PostgreSQL (Docker)'
$saida = cmd /c 'docker compose up -d --wait 2>&1'
if ($LASTEXITCODE -ne 0) { Falhar 'Falha ao subir o PostgreSQL.' ($saida | Out-String) }
Ok 'localhost:5432'

# ------------------------------------------------------------------ 3. backend
$noWindowsTerminal = [bool]$env:WT_SESSION -and [bool](Get-Command wt -ErrorAction SilentlyContinue)
Remove-Item $SINAL_ENCERRAR -ErrorAction SilentlyContinue
$processoBackend = $null
$frontend = $null

try {
  if ($noWindowsTerminal) {
    Passo 3 'Backend (nova aba)'
    $scriptAba = Join-Path $PSScriptRoot 'backend.ps1'
    Start-Process wt -ArgumentList @(
      '-w', '0', 'new-tab', '--title', "`"$TITULO_ABA`"", '--suppressApplicationTitle',
      '-d', "`"$raiz`"",
      'powershell', '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass',
      '-File', "`"$scriptAba`"", '-Sinal', "`"$SINAL_ENCERRAR`""
    )
    $desistir = { $false }
    $ondeEstaoOsLogs = "aba `"$TITULO_ABA`""
  } else {
    Passo 3 'Backend (segundo plano)'
    New-Item -ItemType Directory -Force (Split-Path $LOG_BACKEND) | Out-Null
    $processoBackend = Start-Process cmd -ArgumentList '/c', "$raiz\mvnw.cmd -q spring-boot:run" `
      -WorkingDirectory $raiz -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput $LOG_BACKEND -RedirectStandardError "$LOG_BACKEND.erro"
    $desistir = { $processoBackend.HasExited }
    $ondeEstaoOsLogs = 'target\backend.log'
  }

  # A primeira compilação pode baixar dependências do Maven: tempo generoso
  $segundos = Aguardar { BackendNoAr } 300 $desistir
  if ($segundos -lt 0) {
    $detalhes = ''
    foreach ($arquivo in $LOG_BACKEND, "$LOG_BACKEND.erro") {
      if (Test-Path $arquivo) { $detalhes += Get-Content $arquivo -Tail 15 | Out-String }
    }
    Falhar "O backend não respondeu em $URL_BACKEND/actuator/health. Veja os logs em: $ondeEstaoOsLogs." $detalhes
  }
  Ok "$URL_BACKEND  ($($segundos)s)"

  # ---------------------------------------------------------------- 4. frontend
  Passo 4 'Frontend (Vite)'
  # node direto (e não npm/vite.cmd): sem o cabeçalho do npm e sem o "Deseja finalizar o
  # arquivo em lotes?" do cmd ao apertar Ctrl+C. --logLevel warn: só avisos e erros.
  $frontend = Start-Process node -ArgumentList @(
    'node_modules/vite/bin/vite.js', '--logLevel', 'warn', '--clearScreen', 'false', '--strictPort'
  ) -WorkingDirectory (Join-Path $raiz 'frontend') -NoNewWindow -PassThru
  $segundos = Aguardar { FrontendNoAr } 60 { $frontend.HasExited }
  if ($segundos -lt 0) { Falhar 'O frontend não subiu. Veja a mensagem do Vite acima.' }
  Ok $URL_FRONTEND

  Write-Host ''
  Write-Host '  Tudo pronto. ' -ForegroundColor Green -NoNewline
  Write-Host "Frontend ativo em $URL_FRONTEND" -NoNewline
  Write-Host "  ·  logs do backend: $ondeEstaoOsLogs" -ForegroundColor DarkGray
  Write-Host '  Ctrl+C encerra front e back. O banco continua rodando (docker compose stop).' -ForegroundColor DarkGray
  Write-Host ''

  Wait-Process -Id $frontend.Id
}
finally {
  Write-Host ''
  Write-Host '  Encerrando...' -ForegroundColor DarkGray -NoNewline
  New-Item -ItemType File -Force $SINAL_ENCERRAR | Out-Null
  if ($frontend -and -not $frontend.HasExited) { Encerrar $frontend.Id }
  if ($processoBackend -and -not $processoBackend.HasExited) { Encerrar $processoBackend.Id }
  # No modo aba não temos o processo: encerra quem ouve na porta do backend
  EncerrarPorta 8080
  Write-Host ' front e back encerrados.' -ForegroundColor DarkGray
}
