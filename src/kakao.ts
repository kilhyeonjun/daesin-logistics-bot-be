/**
 * 카카오 i 오픈빌더 스킬 응답 포맷 생성
 */
import type { Route, RouteStats } from './types/route.js';
import type {
  KakaoResponse,
  ListCardItem,
  ListCardButton,
  TextCardButton
} from './types/kakao.js';

// 심플 텍스트 응답
export function simpleText(text: string): KakaoResponse {
  return {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text } }]
    }
  };
}

// 리스트 카드 응답
export function listCard(
  title: string,
  items: ListCardItem[],
  buttons: ListCardButton[] = []
): KakaoResponse {
  return {
    version: '2.0',
    template: {
      outputs: [{
        listCard: {
          header: { title },
          items: items.slice(0, 5), // 최대 5개
          buttons: buttons.slice(0, 2) // 최대 2개
        }
      }]
    }
  };
}

// 텍스트 카드 응답
export function textCard(
  title: string,
  description: string,
  buttons: TextCardButton[] = []
): KakaoResponse {
  return {
    version: '2.0',
    template: {
      outputs: [{
        textCard: {
          title,
          description,
          buttons: buttons.slice(0, 3)
        }
      }]
    }
  };
}

// 노선 데이터를 카카오톡 메시지로 포맷
export function formatRouteMessage(routes: Route[]): KakaoResponse {
  if (!routes || routes.length === 0) {
    return simpleText('검색 결과가 없습니다.');
  }

  // 5개 이하면 상세 정보
  if (routes.length <= 5) {
    const items: ListCardItem[] = routes.map(r => ({
      title: `${r.line_name}`,
      description: `차량: ${r.car_number}\n건수: ${r.count} | 수량: ${r.quantity}\n운임: ${Number(r.total_fare).toLocaleString()}원`
    }));

    return listCard(`검색 결과 (${routes.length}건)`, items);
  }

  // 5개 초과면 요약
  let text = `총 ${routes.length}건 검색됨\n\n`;
  routes.slice(0, 10).forEach((r, i) => {
    text += `${i + 1}. ${r.line_code} ${r.line_name}\n`;
    text += `   차량: ${r.car_number} | 건수: ${r.count}\n`;
  });

  if (routes.length > 10) {
    text += `\n... 외 ${routes.length - 10}건`;
  }

  return simpleText(text);
}

// 통계 메시지 포맷
export function formatStatsMessage(stats: RouteStats, date: string): KakaoResponse {
  if (!stats || stats.total_routes === 0) {
    return simpleText(`${date} 데이터가 없습니다.`);
  }

  const formattedDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;

  return textCard(
    `${formattedDate} 배차 현황`,
    `총 노선: ${stats.total_routes}개\n` +
    `총 건수: ${stats.total_count || 0}건\n` +
    `총 수량: ${stats.total_quantity || 0}개\n` +
    `총 운임: ${Number(stats.total_fare || 0).toLocaleString()}원`
  );
}

// 도움말 메시지
export function helpMessage(): KakaoResponse {
  return simpleText(
`[물류 조회 도움말]

검색 명령어:
• 노선 101102 - 노선코드로 검색
• 차량 4536 - 차량번호로 검색
• 도착 연희동 - 노선명으로 검색
• 오늘 현황 - 오늘 전체 현황
• 어제 현황 - 어제 전체 현황

예시:
"노선 101102"
"차량 충북80아4536"
"도착 마포"`
  );
}
