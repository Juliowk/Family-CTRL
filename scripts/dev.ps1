<#
.SYNOPSIS
  Sobe o ambiente de desenvolvimento: PostgreSQL (Docker), backend (Spring Boot) e frontend (Vite).

.DESCRIPTION
  - Banco: docker compose, aguardando o healthcheck.
  - Backend: abre numa janela separada do PowerShell (logs do Spring ficam lá).
  - Frontend: roda neste terminal e abre o navegador em http://localhost:5173.
  Ao apertar Ctrl+C aqui, o frontend e a janela do backend são encerrados.
  O banco continua rodando (para parar: docker compose stop).

.PARAMETER SemNavegador
  Não abre o navegador automaticamente.
#>
param(
  [switch]$SemNavegador
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

function Passo($mensagem) { Write-Host "`n==> $mensagem" -ForegroundColor Magenta }

function PortaEmUso($porta) {
  $null -ne (Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue)
}

# ------------------------------------------------------------------ pré-requisitos
foreach ($comando in 'docker', 'java', 'npm') {
  if (-not (Get-Command $comando -ErrorAction SilentlyContinue)) {
    throw "'$comando' não encontrado no PATH."
  }
}
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw 'O Docker não está rodando. Abra o Docker Desktop e tente de novo.'
}
foreach ($porta in 8080, 5173) {
  if (PortaEmUso $porta) {
    throw "A porta $porta já está em uso. Feche o processo que a ocupa (outra execução deste script?)."
  }
}

# ------------------------------------------------------------------ banco
Passo 'Subindo o PostgreSQL (docker compose)...'
docker compose up -d --wait
if ($LASTEXITCODE -ne 0) { throw 'Falha ao subir o PostgreSQL.' }

# ------------------------------------------------------------------ dependências do front
if (-not (Test-Path 'frontend/node_modules')) {
  Passo 'Instalando dependências do frontend (npm install)...'
  Push-Location frontend
  npm install
  $codigo = $LASTEXITCODE
  Pop-Location
  if ($codigo -ne 0) { throw 'Falha no npm install.' }
}

# ------------------------------------------------------------------ backend
Passo 'Subindo o backend numa nova janela (http://localhost:8080)...'
$comandoBackend = "`$Host.UI.RawUI.WindowTitle = 'Family Ctrl - backend'; Set-Location '$raiz'; .\mvnw.cmd spring-boot:run"
$backend = Start-Process powershell -ArgumentList '-NoExit', '-Command', $comandoBackend -PassThru

# ------------------------------------------------------------------ frontend
Passo 'Subindo o frontend (http://localhost:5173). Ctrl+C encerra front e backend.'
Write-Host '    O backend leva ~30s para ficar pronto; até lá o front mostra "Conectando ao servidor...".' -ForegroundColor DarkGray
try {
  Push-Location frontend
  if ($SemNavegador) { npm run dev } else { npm run dev -- --open }
}
finally {
  Pop-Location
  Passo 'Encerrando o backend...'
  # /T encerra a árvore inteira (powershell -> mvnw -> java)
  taskkill /PID $backend.Id /T /F *> $null
  Write-Host '    Pronto. O PostgreSQL continua rodando (para parar: docker compose stop).' -ForegroundColor DarkGray
}
