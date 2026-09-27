@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  start "" http://127.0.0.1:8765/
  py -m http.server 8765
  goto :eof
)
where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://127.0.0.1:8765/
  python -m http.server 8765
  goto :eof
)
echo.
echo Δεν βρέθηκε Python.
echo Άνοιξε το index.html απευθείας ή εγκατέστησε Python από python.org
pause
