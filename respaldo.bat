@echo off
REM =========================================================
REM  Respaldo con un clic - copia esta carpeta hacia Downloads
REM  Coloca este .bat DENTRO de la carpeta que quieres respaldar
REM  y haz doble clic para ejecutarlo.
REM =========================================================

setlocal

REM Carpeta origen = donde esta este .bat (no depende de donde
REM estes parado al hacer doble clic)
set "ORIGEN=%~dp0"

REM Carpeta destino base
set "DESTINO_BASE=C:\Users\giann\Downloads\Proyecto Biblia Glosa"

REM Sello de fecha/hora para no pisar respaldos anteriores
REM Formato: AAAA-MM-DD_HHMM
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set "FECHA=%%c-%%a-%%b"
set "HORA=%time:~0,2%%time:~3,2%"
set "HORA=%HORA: =0%"
set "DESTINO=%DESTINO_BASE%\Respaldo_%FECHA%_%HORA%"

echo.
echo Origen : %ORIGEN%
echo Destino: %DESTINO%
echo.
echo Copiando, por favor espera...
echo.

robocopy "%ORIGEN%." "%DESTINO%" /E /Z /R:3 /W:5 /NFL /NDL /XD "$RECYCLE.BIN" /XF "%~nx0"

if %ERRORLEVEL% LEQ 7 (
    echo.
    echo Respaldo completado con exito.
) else (
    echo.
    echo Hubo un problema durante la copia. Codigo de error robocopy: %ERRORLEVEL%
)

echo.
pause
endlocal
