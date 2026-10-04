<#
.SYNOPSIS
  Roda o backend na aba aberta pelo iniciar.ps1 (não é para ser chamado direto).

.DESCRIPTION
  Se o backend parar porque o iniciar.ps1 pediu (arquivo de sinal presente), a aba fecha sozinha.
  Se parar por erro, a aba fica aberta para dar tempo de ler os logs.
#>
param(
  [Parameter(Mandatory)] [string]$Sinal
)

$Host.UI.RawUI.WindowTitle = 'Family Ctrl - backend'
Remove-Item $Sinal -ErrorAction SilentlyContinue

Write-Host ''
Write-Host '  Family Ctrl' -ForegroundColor Cyan -NoNewline
Write-Host '  backend (Spring Boot, perfil local)' -ForegroundColor DarkGray
Write-Host ''

# -q: sem o ruído do Maven; os logs do Spring continuam aparecendo
& .\mvnw.cmd -q spring-boot:run

if (Test-Path $Sinal) { exit 0 }

Write-Host ''
Write-Host '  O backend parou inesperadamente (veja os logs acima).' -ForegroundColor Red
Read-Host '  Enter fecha esta aba'
