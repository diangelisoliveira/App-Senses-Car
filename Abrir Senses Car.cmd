@echo off
setlocal
set "APP=%~dp0release\win-unpacked\Senses Car.exe"
if not exist "%APP%" (
  set "FALLBACK="
  for /f "delims=" %%F in ('dir /b /a:-d /o:-d "%~dp0release\Senses-Car-Controle-*.exe" 2^>nul') do if not defined FALLBACK call :selectPortable "%%F"
)
if defined FALLBACK set "APP=%~dp0release\%FALLBACK%"
if not exist "%APP%" (
  echo Build do Senses Car nao encontrado.
  pause
  exit /b 1
)
start "Senses Car Controle" "%APP%"
endlocal
exit /b 0

:selectPortable
echo %~1 | findstr /i /c:"-Setup.exe" >nul
if errorlevel 1 set "FALLBACK=%~1"
exit /b 0
