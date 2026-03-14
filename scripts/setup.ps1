#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

if (-not (Test-Path ../backend/.env)) {
  Copy-Item ../backend/.env.example ../backend/.env
}
if (-not (Test-Path ../frontend/.env)) {
  Copy-Item ../frontend/.env.example ../frontend/.env
}

Write-Host 'Installing workspace dependencies...'
npm install

Write-Host ''
Write-Host 'Run next:'
Write-Host '  docker compose up --build'
Write-Host 'or for local node dev:'
Write-Host '  npm run dev'
Write-Host ''
Write-Host 'Local URLs:'
Write-Host '  Frontend: http://localhost:5173'
Write-Host '  Backend:  http://localhost:3000'
