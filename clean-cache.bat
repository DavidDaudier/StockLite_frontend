@echo off
echo ========================================
echo Nettoyage des caches Angular/Vite
echo ========================================
echo.

echo Etape 1: Arret de tous les processus Node.js...
taskkill /F /IM node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo   - Processus Node.js arretes avec succes
) else (
    echo   - Aucun processus Node.js en cours
)
echo.

echo Etape 2: Attente de 3 secondes pour liberer les fichiers...
timeout /t 3 /nobreak >nul
echo.

echo Etape 3: Suppression du cache Angular...
if exist ".angular" (
    rmdir /s /q ".angular" 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo   - Cache Angular supprime avec succes
    ) else (
        echo   - ERREUR: Impossible de supprimer le cache Angular
        echo   - Essayez de redemarrer votre ordinateur
    )
) else (
    echo   - Pas de cache Angular a supprimer
)
echo.

echo Etape 4: Suppression du cache Vite...
if exist ".vite-cache" (
    rmdir /s /q ".vite-cache" 2>nul
    echo   - Cache Vite supprime
) else (
    echo   - Pas de cache Vite a supprimer
)
echo.

echo Etape 5: Suppression du cache node_modules...
if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache" 2>nul
    echo   - Cache node_modules supprime
) else (
    echo   - Pas de cache node_modules a supprimer
)
echo.

echo ========================================
echo Nettoyage termine!
echo ========================================
echo.
echo Vous pouvez maintenant lancer: npm start
echo Ou utilisez: start-dev.bat
echo.
pause
