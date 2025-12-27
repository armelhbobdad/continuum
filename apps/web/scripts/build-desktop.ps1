# Build script for Tauri desktop - excludes server-only routes incompatible with static export
# Desktop mode bypasses auth, so auth-related routes are also excluded

$ErrorActionPreference = "Stop"

# Clean stale build artifacts that might reference excluded routes
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }

$BACKUP_DIR = ".desktop-build-backup"
New-Item -ItemType Directory -Force -Path $BACKUP_DIR | Out-Null

# Routes to exclude from static export (server-side auth, API routes)
$EXCLUDED_ROUTES = @(
    "src/app/api",
    "src/app/dashboard",
    "src/app/login"
)

# Auth components only used by excluded routes
$EXCLUDED_COMPONENTS = @(
    "src/components/sign-in-form.tsx",
    "src/components/sign-up-form.tsx"
)

# Move excluded routes out of the way
foreach ($route in $EXCLUDED_ROUTES) {
    if (Test-Path $route -PathType Container) {
        $backupPath = Join-Path $BACKUP_DIR (Split-Path $route -Leaf)
        Move-Item -Path $route -Destination $backupPath
        Write-Host "Excluded: $route"
    }
}

# Move excluded components out of the way
foreach ($component in $EXCLUDED_COMPONENTS) {
    if (Test-Path $component -PathType Leaf) {
        $backupPath = Join-Path $BACKUP_DIR (Split-Path $component -Leaf)
        Move-Item -Path $component -Destination $backupPath
        Write-Host "Excluded: $component"
    }
}

# Run the Next.js build
try {
    bun run build
    $BUILD_EXIT_CODE = $LASTEXITCODE
}
catch {
    $BUILD_EXIT_CODE = 1
}

# Restore excluded routes
foreach ($route in $EXCLUDED_ROUTES) {
    $backupPath = Join-Path $BACKUP_DIR (Split-Path $route -Leaf)
    if (Test-Path $backupPath -PathType Container) {
        Move-Item -Path $backupPath -Destination $route
    }
}

# Restore excluded components
foreach ($component in $EXCLUDED_COMPONENTS) {
    $backupPath = Join-Path $BACKUP_DIR (Split-Path $component -Leaf)
    if (Test-Path $backupPath -PathType Leaf) {
        Move-Item -Path $backupPath -Destination $component
    }
}

if (Test-Path $BACKUP_DIR) {
    Remove-Item -Path $BACKUP_DIR -Force -ErrorAction SilentlyContinue
}
Write-Host "Routes restored"

exit $BUILD_EXIT_CODE
