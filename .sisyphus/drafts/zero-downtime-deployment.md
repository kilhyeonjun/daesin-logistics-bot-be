# Draft: Zero-Downtime Deployment with Docker Rollout

## Requirements (confirmed)
- Remove `container_name: daesin-logistics-bot` from docker-compose.yml (prevents replicas)
- Document Docker Rollout plugin installation for macOS
- Create executable deploy script at `scripts/deploy.sh`
- Update README.md with deployment section
- Test/verify the implementation

## Technical Decisions
- **Plugin**: Docker Rollout (wowu/docker-rollout) - CLI plugin for rolling updates
- **Installation path**: `~/.docker/cli-plugins` (macOS default for user plugins)
- **Deploy script location**: `scripts/deploy.sh` (consistent with existing scripts directory)
- **README section**: Add to existing "Docker 운영" section

## Research Findings
- Current docker-compose.yml has `container_name: daesin-logistics-bot` on line 4
- Dockerfile already has proper healthcheck configured
- Existing `scripts/` directory contains TypeScript files (seed-admin.ts, integration-test.ts)
- README has "Docker 운영" section at line 237-262 with commands

## Scope Boundaries
- INCLUDE:
  - docker-compose.yml modification (remove container_name)
  - scripts/deploy.sh creation
  - README.md update with deployment instructions
  - Plugin installation documentation
- EXCLUDE:
  - Nginx/reverse proxy configuration (not requested)
  - CI/CD pipeline integration (not requested)
  - Server-side installation (macOS only specified)

## Open Questions
- None - all requirements are clear from user context

## Test Strategy Decision
- **Infrastructure exists**: N/A (shell script, not code)
- **User wants tests**: Manual verification
- **QA approach**: Automated verification via bash commands
