#!/usr/bin/env bash
set -euo pipefail

# Blue-Green 무중단 배포 스크립트
# Traefik 리버스 프록시를 사용하여 Blue-Green 전환
#
# Usage: ./scripts/deploy.sh [--no-pull] [--no-cache]
#   --no-pull   : git pull 스킵
#   --no-cache  : Docker 빌드 캐시 사용 안 함

cd "$(dirname "$0")/.."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 옵션 파싱
NO_PULL=false
NO_CACHE=""
for arg in "$@"; do
    case $arg in
        --no-pull)
            NO_PULL=true
            shift
            ;;
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
    esac
done

echo -e "${BLUE}🚀 Blue-Green 무중단 배포 시작...${NC}"

# Traefik의 실제 라우팅 대상이 활성 서비스의 SSOT다.
detect_active_service() {
    local active_config
    active_config=$(sed -n '/^[[:space:]]*app-active:/,/^[[:space:]]*app-blue-direct:/p' traefik/dynamic.yml)
    if grep -q 'url: "http://app-blue:3000"' <<< "$active_config"; then
        echo "blue"
    elif grep -q 'url: "http://app-green:3000"' <<< "$active_config"; then
        echo "green"
    else
        echo "unknown"
    fi
}

CURRENT=$(detect_active_service)
case "$CURRENT" in
    blue) NEXT="green" ;;
    green) NEXT="blue" ;;
    *)
        echo -e "${RED}❌ Traefik 활성 대상을 확인할 수 없습니다. 배포를 중단합니다.${NC}" >&2
        exit 1
        ;;
esac

echo -e "${YELLOW}📍 현재 활성: ${CURRENT} → 전환 대상: ${NEXT}${NC}"

# 1. Git Pull (선택적)
if [ "$NO_PULL" = false ]; then
    echo -e "${BLUE}📥 최신 코드 가져오는 중...${NC}"
    git pull
fi

# 2. 새 이미지 빌드
echo -e "${BLUE}🔨 새 이미지 빌드 중...${NC}"
docker compose build $NO_CACHE

# 3. Traefik 실행 확인
if ! docker compose ps --format json 2>/dev/null | grep -q '"Name":"traefik".*"State":"running"'; then
    echo -e "${BLUE}🔧 Traefik 시작 중...${NC}"
    docker compose up -d traefik
    sleep 5
fi

# 4. 새 서비스 시작 (비활성 상태로)
echo -e "${BLUE}🚀 ${NEXT} 서비스 시작 중...${NC}"
if [ "$NEXT" = "green" ]; then
    BLUE_ENABLED=true GREEN_ENABLED=true docker compose up -d app-green
else
    BLUE_ENABLED=true GREEN_ENABLED=true docker compose up -d app-blue
fi

# 5. 헬스체크 대기
echo -e "${BLUE}⏳ ${NEXT} 헬스체크 대기 중...${NC}"
MAX_RETRIES=30
RETRY_INTERVAL=2

for i in $(seq 1 $MAX_RETRIES); do
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "app-${NEXT}" 2>/dev/null || echo "starting")
    
    if [ "$HEALTH" = "healthy" ]; then
        echo -e "${GREEN}✅ app-${NEXT} 헬스체크 통과!${NC}"
        break
    fi
    
    if [ $i -eq $MAX_RETRIES ]; then
        echo -e "${RED}❌ 헬스체크 실패! 비활성 후보를 중지합니다.${NC}"
        docker compose stop "app-${NEXT}"
        echo -e "${YELLOW}💡 트래픽은 ${CURRENT} 서비스에 유지됩니다.${NC}"
        exit 1
    fi
    
    echo -e "   대기 중... ($i/$MAX_RETRIES) - 상태: ${HEALTH}"
    sleep $RETRY_INTERVAL
done

# 6. 트래픽 전환
echo -e "${BLUE}🔄 트래픽을 ${NEXT}로 전환 중...${NC}"
./switch-traffic.sh "$NEXT"

# 7. 전환 확인
sleep 3
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/health 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ 트래픽 전환 성공! (HTTP ${RESPONSE})${NC}"
else
    echo -e "${RED}❌ 전환 후 헬스체크 실패: HTTP ${RESPONSE}${NC}" >&2
    echo -e "${YELLOW}💡 확인 후 수동 롤백: ./switch-traffic.sh ${CURRENT}${NC}" >&2
    exit 1
fi

# 8. 라우팅 검증 후 singleton scheduler를 새 이미지로 갱신
# scheduler 갱신 실패 시 이전 앱 슬롯을 유지해 수동 복구 경계를 보존한다.
echo -e "${BLUE}⏰ 단일 수집 스케줄러 갱신 중...${NC}"
docker compose up -d scheduler

# 9. 이전 서비스 정리
echo -e "${BLUE}🧹 이전 서비스 (${CURRENT}) 정리 중...${NC}"
sleep 5  # 진행 중인 요청 완료 대기
docker compose stop "app-${CURRENT}"

# 9. 완료 메시지
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Blue-Green 무중단 배포 완료!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "   활성 서비스: ${GREEN}${NEXT}${NC}"
echo -e "   접속 URL: http://localhost:80"
echo -e "   대시보드: http://localhost:8080/dashboard/"
echo ""
echo -e "${YELLOW}💡 롤백하려면:${NC}"
if [ "$NEXT" = "green" ]; then
    echo -e "   docker compose up -d app-blue && ./switch-traffic.sh blue"
else
    echo -e "   docker compose up -d app-green && ./switch-traffic.sh green"
fi
echo ""
