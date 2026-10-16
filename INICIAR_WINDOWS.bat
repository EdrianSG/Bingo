@echo off
setlocal
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" goto check
where py >nul 2>nul
if errorlevel 1 goto use_python
py -3 -m venv .venv
if errorlevel 1 goto error
goto check
:use_python
where python >nul 2>nul
if errorlevel 1 goto no_python
python -m venv .venv
if errorlevel 1 goto error
:check
".venv\Scripts\python.exe" -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)"
if errorlevel 1 goto old_python
".venv\Scripts\python.exe" -c "import importlib.metadata as m; import flet, flet_desktop; assert m.version('flet') == '1.0.3' and m.version('flet-desktop') == '1.0.3'" >nul 2>nul
if not errorlevel 1 goto launch
echo Instalando dependencias. La primera vez necesitas Internet...
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto error
:launch
".venv\Scripts\python.exe" main.py
if errorlevel 1 goto error
exit /b 0
:no_python
echo Instala Python 3.10 o superior y marca Add Python to PATH.
echo Despues vuelve a abrir este archivo.
pause
exit /b 1
:old_python
echo Necesitas Python 3.10 o superior.
echo Actualiza Python, elimina SOLO la carpeta .venv y vuelve a iniciar.
pause
exit /b 1
:error
echo No se pudo iniciar Bingo. Revisa el mensaje anterior.
echo Puedes consultar LEEME.md para la instalacion manual.
pause
exit /b 1
