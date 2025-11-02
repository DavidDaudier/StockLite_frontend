@echo off
echo ========================================
echo Demarrage du serveur de developpement
echo ========================================
echo.

echo Verification des processus Node.js existants...
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo.
    echo ATTENTION: Des processus Node.js sont deja en cours d'execution!
    echo Voulez-vous les arreter avant de continuer? (O/N)
    set /p choix=
    if /i "%choix%"=="O" (
        taskkill /F /IM node.exe
        echo Processus arretes. Attente de 3 secondes...
        timeout /t 3 /nobreak >nul
    )
)
echo.

echo Demarrage du serveur Angular avec SSR...
echo.
npm start

echo.
echo ========================================
echo Le serveur s'est arrete
echo ========================================
pause
