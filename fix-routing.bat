@echo off
echo Suppression du fichier conflictuel app/(main)/page.tsx...
del /f "src\app\(main)\page.tsx"
echo OK ! Le conflit de routing est resolu.
echo Vous pouvez maintenant lancer : npm run dev
pause
