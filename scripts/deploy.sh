#!/usr/bin/env bash
set -euo pipefail

# 배포 스크립트 - 최소 다운타임 배포
# 현재 호스트 포트 바인딩 사용으로 완전 무중단은 불가
# 리버스 프록시(Traefik 등) 도입 시 docker rollout 사용 가능
#
# Usage: ./scripts/deploy.sh

cd "$(dirname "$0")/.."

echo "🚀 Starting deployment..."

# Pull latest changes
echo "📥 Pulling latest code..."
git pull

# Build new image
echo "🔨 Building new image..."
docker compose build

# 최소 다운타임 재시작 (기존 컨테이너 중지 후 새 컨테이너 시작)
echo "🔄 Restarting container (minimal downtime)..."
docker compose up -d --force-recreate

# 헬스체크 대기
echo "⏳ Waiting for health check..."
sleep 5

# 상태 확인
if docker compose ps | grep -q "healthy"; then
    echo "✅ Deployment complete! Container is healthy."
else
    echo "⚠️  Container started but health check pending..."
    docker compose ps
fi
