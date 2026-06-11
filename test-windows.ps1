$ErrorActionPreference = 'Stop'

Write-Host 'Running IT Portal tests...'
npm test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Building frontend...'
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'All checks passed.'
