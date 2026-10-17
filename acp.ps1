param(
    [Parameter(Position=0)]
    [string]$Message = "Update"
)

Write-Host "[acp] Staging changes (git add .)..." -ForegroundColor Cyan
git add .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[acp] Committing with message: '$Message'..." -ForegroundColor Cyan
git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    Write-Host "[acp] No changes to commit or commit cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host "[acp] Pushing to remote (git push)..." -ForegroundColor Cyan
git push
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[acp] Successfully added, committed, and pushed!" -ForegroundColor Green
