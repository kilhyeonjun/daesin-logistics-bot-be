# Draft: Traefik Blue-Green Zero-Downtime Deployment

## Requirements (confirmed)
- Traefik v3.0 as reverse proxy (port 80)
- Blue-Green deployment strategy
- Environment variables for toggling active deployment (BLUE_ENABLED, GREEN_ENABLED)
- Health check based traffic routing
- Maintain existing SQLite volume mount (`./data:/app/data`)
- Maintain existing extra_hosts (`logistics.ds3211.co.kr:211.51.241.159`)
- Zero-downtime deployment script

## Current State Analysis
- Single `app` service with host port binding `3000:3000`
- Tailscale Funnel exposing localhost:3000
- Health check: `GET /health` (also in Dockerfile)
- SQLite database at `./data/logistics.db`
- Deploy script: git pull → build → force-recreate (has downtime)
- Non-root user `appuser` in container
- API_KEY environment variable from .env

## Technical Decisions
- Remove host port binding from app services
- Use Traefik Docker labels for routing
- Two app services: `app-blue` and `app-green`
- Environment variable toggles: `BLUE_ENABLED`, `GREEN_ENABLED`
- Traefik handles health check and load balancing
- Both services share same SQLite volume (only one active at a time)
- Traefik v3.6 image (latest stable)

## Research Findings (Complete)

### Traefik v3 Key Configuration
- `traefik.enable=${BLUE_ENABLED:-true}` for dynamic enable/disable
- Health check labels: `loadbalancer.healthcheck.path=/health`
- Priority-based routing: higher priority wins
- No TLS needed (Tailscale handles HTTPS)
- Docker provider: `providers.docker=true`, `exposedbydefault=false`

### Blue-Green Switching
```bash
# Enable green, disable blue
BLUE_ENABLED=false GREEN_ENABLED=true docker compose up -d
```

## Open Questions (Resolved)
1. SQLite concurrent access?
   → Only ONE service active at a time (Blue-Green, not A/B)
2. Traefik dashboard?
   → YES, enable on port 8080 for debugging (internal only)
3. TLS/HTTPS handling?
   → Tailscale Funnel handles HTTPS termination

## Scope Boundaries
- INCLUDE: docker-compose.yml, deploy script, README update
- INCLUDE: Tailscale Funnel change documentation
- INCLUDE: Testing/verification
- EXCLUDE: Application code changes
- EXCLUDE: Database schema changes
- EXCLUDE: CI/CD pipeline (manual deployment only)
- EXCLUDE: Dockerfile changes (not needed)
