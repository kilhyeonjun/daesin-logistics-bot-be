import type { RouteDto, StatsDto } from '../../application/dto/RouteDto.js';
import type {
  KakaoResponse,
  ListCardItem,
  ListCardButton,
  TextCardButton,
} from '../../shared/types/kakao.js';

export class KakaoResponseFormatter {
  simpleText(text: string): KakaoResponse {
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text } }],
      },
    };
  }

  listCard(
    title: string,
    items: ListCardItem[],
    buttons: ListCardButton[] = []
  ): KakaoResponse {
    return {
      version: '2.0',
      template: {
        outputs: [
          {
            listCard: {
              header: { title },
              items: items.slice(0, 5),
              buttons: buttons.slice(0, 2),
            },
          },
        ],
      },
    };
  }

  textCard(
    title: string,
    description: string,
    buttons: TextCardButton[] = []
  ): KakaoResponse {
    return {
      version: '2.0',
      template: {
        outputs: [
          {
            textCard: {
              title,
              description,
              buttons: buttons.slice(0, 3),
            },
          },
        ],
      },
    };
  }

  formatRoutes(routes: RouteDto[]): KakaoResponse {
    if (!routes || routes.length === 0) {
      return this.simpleText('검색 결과가 없습니다.');
    }

    let text = `[검색 결과 ${routes.length}건]\n`;
    routes.slice(0, 10).forEach((r, i) => {
      text += `\n${i + 1}. ${r.lineName}\n`;
      text += `   차량: ${r.carNumber}\n`;
      text += `   건수: ${r.count} | 수량: ${r.quantity}\n`;
      text += `   운임: ${Number(r.totalFare).toLocaleString()}원\n`;
    });

    if (routes.length > 10) {
      text += `\n... 외 ${routes.length - 10}건`;
    }

    return this.simpleText(text);
  }

  formatStats(stats: StatsDto, date: string): KakaoResponse {
    if (!stats || stats.totalRoutes === 0) {
      return this.simpleText(`${date} 데이터가 없습니다.`);
    }

    const formattedDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;

    return this.textCard(
      `${formattedDate} 배차 현황`,
      `총 노선: ${stats.totalRoutes}개\n` +
        `총 건수: ${stats.totalCount || 0}건\n` +
        `총 수량: ${stats.totalQuantity || 0}개\n` +
        `총 운임: ${Number(stats.totalFare || 0).toLocaleString()}원`
    );
  }

  helpMessage(): KakaoResponse {
    return this.simpleText(
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

  errorMessage(utterance: string): KakaoResponse {
    return this.simpleText(
      `"${utterance}"를 이해하지 못했습니다.\n\n"도움말"을 입력하면 사용법을 볼 수 있습니다.`
    );
  }
}
