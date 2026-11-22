@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 合成動物園：正在啟動本機伺服器（http://localhost:3110）...
start "" http://localhost:3110
node scripts\serve.js
pause
