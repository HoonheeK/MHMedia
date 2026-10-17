@echo off
setlocal
if "%~1"=="" (
    set "COMMIT_MSG=Update"
) else (
    set "COMMIT_MSG=%~1"
)

echo [acp] Staging changes (git add .)...
git add .
if errorlevel 1 goto error

echo [acp] Committing with message: "%COMMIT_MSG%"...
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
    echo [acp] No changes to commit or commit failed.
    goto end
)

echo [acp] Pushing to remote (git push)...
git push
if errorlevel 1 goto error

echo [acp] Successfully added, committed, and pushed!
goto end

:error
echo [acp] An error occurred during git acp.
exit /b 1

:end
endlocal
