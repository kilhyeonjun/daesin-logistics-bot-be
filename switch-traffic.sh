#!/bin/bash
# Blue-Green Traffic Switching Script (File Provider based)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DYNAMIC_CONFIG="$SCRIPT_DIR/traefik/dynamic.yml"

usage() {
    echo "Usage: $0 [blue|green|status]"
    echo ""
    echo "Commands:"
    echo "  blue    - Route traffic to app-blue"
    echo "  green   - Route traffic to app-green"
    echo "  status  - Show current routing"
    exit 1
}

get_current_target() {
    local active_config
    active_config=$(sed -n '/^[[:space:]]*app-active:/,/^[[:space:]]*app-blue-direct:/p' "$DYNAMIC_CONFIG" 2>/dev/null)
    if grep -q 'url: "http://app-blue:3000"' <<< "$active_config"; then
        echo "blue"
    elif grep -q 'url: "http://app-green:3000"' <<< "$active_config"; then
        echo "green"
    else
        echo "unknown"
    fi
}

switch_to_blue() {
    cat > "$DYNAMIC_CONFIG" << 'EOF'
## Traefik Dynamic Configuration (File Provider)
## Blue-Green deployment routing

http:
  routers:
    app:
      rule: "PathPrefix(`/`)"
      entryPoints:
        - web
      service: app-active
      priority: 1

  services:
    app-active:
      loadBalancer:
        servers:
          - url: "http://app-blue:3000"
        healthCheck:
          path: /health
          interval: "10s"
          timeout: "5s"

    app-blue-direct:
      loadBalancer:
        servers:
          - url: "http://app-blue:3000"

    app-green-direct:
      loadBalancer:
        servers:
          - url: "http://app-green:3000"
EOF
    echo "✅ Traffic switched to BLUE"
}

switch_to_green() {
    cat > "$DYNAMIC_CONFIG" << 'EOF'
## Traefik Dynamic Configuration (File Provider)
## Blue-Green deployment routing

http:
  routers:
    app:
      rule: "PathPrefix(`/`)"
      entryPoints:
        - web
      service: app-active
      priority: 1

  services:
    app-active:
      loadBalancer:
        servers:
          - url: "http://app-green:3000"
        healthCheck:
          path: /health
          interval: "10s"
          timeout: "5s"

    app-blue-direct:
      loadBalancer:
        servers:
          - url: "http://app-blue:3000"

    app-green-direct:
      loadBalancer:
        servers:
          - url: "http://app-green:3000"
EOF
    echo "✅ Traffic switched to GREEN"
}

show_status() {
    local current=$(get_current_target)
    echo "📊 Current traffic target: $current"
    echo ""
    echo "Container status:"
    docker compose ps 2>/dev/null || docker-compose ps
}

case "${1:-}" in
    blue)
        switch_to_blue
        ;;
    green)
        switch_to_green
        ;;
    status)
        show_status
        ;;
    *)
        usage
        ;;
esac
