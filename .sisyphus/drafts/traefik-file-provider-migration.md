# Draft: Traefik Docker Provider to File Provider Migration

## Requirements (confirmed)

- **Problem**: Docker socket access failing with gvproxy issue on macOS Docker Desktop
- **Solution**: Migrate from Docker Provider to File Provider
- **Keep intact**: Blue-Green deployment workflow
- **Keep intact**: Healthcheck behavior
- **Keep intact**: Tailscale Funnel compatibility (port 80)

## Current Architecture Analysis

### docker-compose.yml Structure
- **traefik service**:
  - Image: `traefik:v3.0`
  - Uses Docker socket: `/Users/penguin/.docker/run/docker.sock:/var/run/docker.sock:ro`
  - Ports: 80 (web), 8080 (dashboard)
  - Healthcheck: API overview endpoint
  
- **app-blue service**:
  - YAML anchor `&app-base` for reuse
  - Port 3000 internal
  - Traefik labels for routing (PathPrefix `/`, priority 1)
  - Healthcheck via `/health` endpoint
  - `BLUE_ENABLED` env var controls activation
  
- **app-green service**:
  - Extends app-blue via `<<: *app-base`
  - Priority 2 (lower than blue)
  - `GREEN_ENABLED` env var controls activation

### scripts/deploy.sh Analysis
- Auto-detects current active service (blue/green)
- Builds new image
- Starts new service
- Waits for healthcheck
- Switches traffic via env vars: `BLUE_ENABLED=false GREEN_ENABLED=true`
- Stops old service

### Current Traffic Switching Mechanism
Uses Traefik labels with environment variables:
- `traefik.enable=${BLUE_ENABLED:-true}` / `${GREEN_ENABLED:-false}`
- This relies on Docker Provider to read labels

## Technical Decisions

- **Provider change**: Docker Provider -> File Provider
- **Config location**: `./traefik/dynamic/app.yml`
- **Traffic switching**: Atomic file rewrite (write temp, rename)
- **Single router**: One router pointing to active service (better semantics)

## Research Findings

*(Pending from librarian agent)*

## Open Questions

1. Should we track active color state in a file (e.g., `.active-color`) for persistence across restarts?
2. What network mode to use for container DNS resolution?

## Scope Boundaries

### INCLUDE
- Modify docker-compose.yml (remove docker socket, add file provider)
- Create traefik/dynamic/app.yml (router + services config)
- Create scripts/switch-traffic.sh (atomic file switching)
- Update scripts/deploy.sh (use switch-traffic.sh)
- Verification steps

### EXCLUDE
- Changing the app services themselves (only removing labels)
- Modifying Dockerfile
- Changing Tailscale configuration
- Database or app configuration changes
