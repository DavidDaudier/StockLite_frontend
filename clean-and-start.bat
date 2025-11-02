@echo off
echo ========================================
echo Nettoyage et demarrage du serveur
echo ========================================
echo.

echo Etape 1: Arret des processus Node.js...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo.

echo Etape 2: Suppression des caches...
if exist ".angular" rmdir /s /q ".angular" 2>nul
if exist ".vite-cache" rmdir /s /q ".vite-cache" 2>nul
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache" 2>nul
echo   - Caches supprimes
echo.

echo Etape 3: Attente de 2 secondes...
timeout /t 2 /nobreak >nul
echo.

echo Etape 4: Demarrage du serveur...
echo ========================================
echo.
npm start
