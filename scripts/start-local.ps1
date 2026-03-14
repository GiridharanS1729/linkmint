#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

Write-Host 'Starting linkvio with Docker...'
docker compose up --build
