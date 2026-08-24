@echo off
setlocal
set "APP=%~dp0release\win-unpacked\Senses Car.exe"
if not exist "%APP%" set "APP=%~dp0release\Senses-Car-Controle-1.0.1.exe"
if not exist "%APP%" (
  echo Build do Senses Car nao encontrado.
  pause
  exit /b 1
)
start "Senses Car Controle" "%APP%"
endlocal
