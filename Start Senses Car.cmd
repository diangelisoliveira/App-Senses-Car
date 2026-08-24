@echo off
setlocal
set "APP=%~dp0release\win-unpacked\Senses Car.exe"

if not exist "%APP%" (
  echo Build do Senses Car nao encontrado.
  echo Execute pnpm run dist na pasta do projeto e tente novamente.
  pause
  exit /b 1
)

start "Senses Car" "%APP%"
endlocal
