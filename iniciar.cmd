@echo off
rem Sobe banco (Docker), backend e frontend para desenvolvimento.
rem Uso: .\iniciar   (PowerShell)   ou   iniciar   (cmd)
rem O -ExecutionPolicy Bypass vale so para esta execucao; nao altera a configuracao do Windows.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\iniciar.ps1" %*
