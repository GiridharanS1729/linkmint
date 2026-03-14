#!/usr/bin/env pwsh
param(
  [string]$BackendApp = 'linkvio-backend',
  [string]$FrontendApp = 'linkvio-frontend'
)

$ErrorActionPreference = 'Stop'

Write-Host "Deploying backend app: $BackendApp"
Push-Location ../backend
fly launch --name $BackendApp --no-deploy
fly deploy --config ../fly.backend.toml
Pop-Location

Write-Host "Deploying frontend app: $FrontendApp"
Push-Location ../frontend
fly launch --name $FrontendApp --no-deploy
fly deploy --config ../fly.frontend.toml
Pop-Location
