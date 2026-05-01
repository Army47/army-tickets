@echo off
cd /d C:\Users\johnn\Desktop\army tickets

echo =========================
echo Subiendo a GitHub...
echo =========================

git add .

git diff --cached --quiet
if %errorlevel%==0 (
    echo No hay cambios para subir ❌
) else (
    git commit -m "update %date% %time%"
    git push
    echo =========================
    echo SUBIDO CORRECTAMENTE ✅
)

pause