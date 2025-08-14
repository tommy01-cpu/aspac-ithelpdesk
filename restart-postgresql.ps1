# Run this script as Administrator to restart PostgreSQL and clear hanging connections

Write-Host "Restarting PostgreSQL to clear hanging connections..." -ForegroundColor Yellow

try {
    # Stop PostgreSQL service
    Write-Host "Stopping PostgreSQL service..." -ForegroundColor Yellow
    Stop-Service -Name "postgresql-x64-17" -Force
    Write-Host "PostgreSQL service stopped." -ForegroundColor Green
    
    # Wait a moment
    Start-Sleep -Seconds 3
    
    # Start PostgreSQL service
    Write-Host "Starting PostgreSQL service..." -ForegroundColor Yellow
    Start-Service -Name "postgresql-x64-17"
    Write-Host "PostgreSQL service started." -ForegroundColor Green
    
    # Check service status
    $service = Get-Service -Name "postgresql-x64-17"
    Write-Host "PostgreSQL service status: $($service.Status)" -ForegroundColor Green
    
    Write-Host "PostgreSQL restart completed successfully!" -ForegroundColor Green
    Write-Host "You can now run 'npm run dev' to start your application." -ForegroundColor Cyan
    
} catch {
    Write-Host "Error restarting PostgreSQL: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please make sure you're running this script as Administrator." -ForegroundColor Yellow
}

Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
