@echo off
cd /d C:\Users\johnn\Desktop\army tickets

echo =========================
echo Subiendo a GitHub...
echo =========================

git add .
git commit -m "auto update"
git push

echo =========================
echo SUBIDO ✅
pause