#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

Write-Host 'Starting linkmint with Docker...'
docker compose up --build
