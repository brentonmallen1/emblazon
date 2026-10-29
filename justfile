# emblazon development commands

set dotenv-load

# Default port (can be overridden via env)
port := env_var_or_default("PORT", "4747")

# Default: show available commands
default:
    @just --list

# Nothing to install: no runtime or dev dependencies. Checks the Node version instead.
install:
    @node -e "const [maj, min] = process.versions.node.split('.').map(Number); if (maj < 23 || (maj === 23 && min < 6)) { console.error('emblazon needs Node 23.6+ (found ' + process.version + ')'); process.exit(1) } else console.log('Node ' + process.version + ': ready')"

# Run the preview server with reload: playground, picker, contact sheets, emblem API
dev:
    @echo "Starting emblazon on http://localhost:{{port}}"
    PORT={{port}} node --watch server.ts

# Run the preview server without reload
start:
    PORT={{port}} node server.ts

# Open the app in the default browser
open:
    open http://localhost:{{port}}

# Run tests
test:
    node --test "test/**/*.test.ts"

# Type-check the library as a strict browser app would (fetches TypeScript via npx)
typecheck:
    npx -y -p typescript tsc -p tsconfig.browser.json

# How often two inputs look alike, e.g. `just stats 10000 heraldry 2`
stats count="10000" theme="heraldry" version="":
    node scripts/stats.ts {{count}} {{theme}} {{version}}

# Write the heraldry contact sheet to out/
sheet:
    node scripts/sheet.ts

# Rebuild charges: geometric ones, game-icons imports, then validate and compile all
assets:
    node scripts/draw-geometric.ts
    node scripts/import-game-icons.ts
    node scripts/build-assets.ts

# Plain ES modules in dist/ for consumers that can't compile TypeScript
build:
    node scripts/build.ts

# Clean all generated files
clean:
    rm -rf dist out

# Build and run with Docker
docker-up:
    docker compose up --build

# Stop Docker containers
docker-down:
    docker compose down

# Registry URL for releases
registry_url := env_var_or_default("REGISTRY_URL", "")

# Build and push Docker image to registry (linux/amd64)
release tag="latest":
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -z "{{registry_url}}" ]; then
        echo "Error: REGISTRY_URL not set in .env"
        exit 1
    fi
    image="{{registry_url}}/emblazon:{{tag}}"
    echo "Building and pushing $image..."
    docker buildx build \
        --platform linux/amd64 \
        -t "$image" \
        --push \
        .
    echo "Released: $image"
