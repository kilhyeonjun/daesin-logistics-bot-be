#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/deploy-blue-green-test.XXXXXX")
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$TMP_DIR/repo/scripts" "$TMP_DIR/repo/traefik" "$TMP_DIR/bin"
cp "$REPO_ROOT/scripts/deploy.sh" "$TMP_DIR/repo/scripts/deploy.sh"
cp "$REPO_ROOT/switch-traffic.sh" "$TMP_DIR/repo/switch-traffic.sh"
cp "$REPO_ROOT/traefik/dynamic.yml" "$TMP_DIR/repo/traefik/dynamic.yml"
chmod +x "$TMP_DIR/repo/scripts/deploy.sh" "$TMP_DIR/repo/switch-traffic.sh"

# Both replicas are running, but Traefik's active target is green (the SSOT).
"$TMP_DIR/repo/switch-traffic.sh" green >/dev/null

cat > "$TMP_DIR/bin/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$DEPLOY_TEST_LOG"
if [ "${1:-}" = "compose" ] && [ "${2:-}" = "ps" ]; then
  printf '%s\n' \
    '{"Name":"traefik","State":"running"}' \
    '{"Name":"app-blue","State":"running"}' \
    '{"Name":"app-green","State":"running"}'
elif [ "${1:-}" = "inspect" ]; then
  printf 'healthy\n'
fi
EOF
chmod +x "$TMP_DIR/bin/docker"

cat > "$TMP_DIR/bin/curl" <<'EOF'
#!/usr/bin/env bash
printf 'curl\n' >> "$DEPLOY_TEST_LOG"
printf '200'
EOF
chmod +x "$TMP_DIR/bin/curl"

cat > "$TMP_DIR/bin/sleep" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$TMP_DIR/bin/sleep"

export DEPLOY_TEST_LOG="$TMP_DIR/docker.log"
PATH="$TMP_DIR/bin:$PATH" "$TMP_DIR/repo/scripts/deploy.sh" --no-pull >"$TMP_DIR/output.log"

grep -q '현재 활성: green → 전환 대상: blue' "$TMP_DIR/output.log"
grep -q '^compose up -d app-blue$' "$DEPLOY_TEST_LOG"
grep -q '^compose stop app-green$' "$DEPLOY_TEST_LOG"
grep -q 'url: "http://app-blue:3000"' "$TMP_DIR/repo/traefik/dynamic.yml"

curl_line=$(grep -n '^curl$' "$DEPLOY_TEST_LOG" | head -1 | cut -d: -f1)
scheduler_line=$(grep -n '^compose up -d scheduler$' "$DEPLOY_TEST_LOG" | head -1 | cut -d: -f1)
if [ -z "$curl_line" ] || [ -z "$scheduler_line" ] || [ "$scheduler_line" -le "$curl_line" ]; then
  echo 'scheduler was updated before routed health succeeded' >&2
  exit 1
fi

# A failed routed health probe must stop before old-slot cleanup. Traffic stays on the
# newly selected slot so rollback remains an explicit operator decision.
"$TMP_DIR/repo/switch-traffic.sh" green >/dev/null
: > "$DEPLOY_TEST_LOG"
cat > "$TMP_DIR/bin/curl" <<'EOF'
#!/usr/bin/env bash
printf '503'
EOF
chmod +x "$TMP_DIR/bin/curl"

if PATH="$TMP_DIR/bin:$PATH" "$TMP_DIR/repo/scripts/deploy.sh" --no-pull >"$TMP_DIR/failure-output.log" 2>&1; then
  echo 'expected routed health failure to abort deployment' >&2
  exit 1
fi
if grep -q '^compose stop app-green$' "$DEPLOY_TEST_LOG"; then
  echo 'old active slot was stopped before manual rollback' >&2
  exit 1
fi
grep -q 'url: "http://app-blue:3000"' "$TMP_DIR/repo/traefik/dynamic.yml"
grep -q '수동 롤백' "$TMP_DIR/failure-output.log"

echo 'deploy Blue/Green SSOT regression: PASS'
