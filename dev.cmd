@echo off
rem Sobe banco (Docker), backend e frontend para desenvolvimento.
rem Uso: .\dev   (PowerShell)   ou   dev   (cmd)
rem O -ExecutionPolicy Bypass vale so para esta execucao; nao altera a configuracao do Windows.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\dev.ps1" %*
