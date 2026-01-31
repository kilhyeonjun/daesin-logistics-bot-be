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

# 현재 활성 서비스 감지
detect_active_service() {
    # BLUE_ENABLED 환경변수 또는 실행 중인 컨테이너로 판단
    if docker compose ps --format json 2>/dev/null | grep -q '"Name":"app-green".*"State":"running"'; then
        if docker compose ps --format json 2>/dev/null | grep -q '"Name":"app-blue".*"State":"running"'; then
            # 둘 다 실행 중이면 Blue가 기본
            echo "blue"
        else
            echo "green"
        fi
    else
        echo "blue"
    fi
}

CURRENT=$(detect_active_service)
if [ "$CURRENT" = "blue" ]; then
    NEXT="green"
    CURRENT_ENABLED_VAR="BLUE_ENABLED"
    NEXT_ENABLED_VAR="GREEN_ENABLED"
else
    NEXT="blue"
    CURRENT_ENABLED_VAR="GREEN_ENABLED"
    NEXT_ENABLED_VAR="BLUE_ENABLED"
fi

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
        echo -e "${RED}❌ 헬스체크 실패! 롤백합니다.${NC}"
        docker compose stop "app-${NEXT}"
        echo -e "${YELLOW}💡 롤백 완료. 현재 ${CURRENT} 서비스가 계속 운영됩니다.${NC}"
        exit 1
    fi
    
    echo -e "   대기 중... ($i/$MAX_RETRIES) - 상태: ${HEALTH}"
    sleep $RETRY_INTERVAL
done

# 6. 트래픽 전환
echo -e "${BLUE}🔄 트래픽을 ${NEXT}로 전환 중...${NC}"
if [ "$NEXT" = "green" ]; then
    export BLUE_ENABLED=false GREEN_ENABLED=true
else
    export BLUE_ENABLED=true GREEN_ENABLED=false
fi
docker compose up -d

# 7. 전환 확인
sleep 3
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/health 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ 트래픽 전환 성공! (HTTP ${RESPONSE})${NC}"
else
    echo -e "${YELLOW}⚠️ 헬스체크 응답: HTTP ${RESPONSE} (Traefik 라우팅 확인 필요)${NC}"
fi

# 8. 이전 서비스 정리
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
    echo -e "   BLUE_ENABLED=true GREEN_ENABLED=false docker compose up -d"
else
    echo -e "   BLUE_ENABLED=false GREEN_ENABLED=true docker compose up -d"
fi
echo ""
