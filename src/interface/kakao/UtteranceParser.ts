export type CommandType =
  | 'HELP'
  | 'SEARCH_BY_CODE'
  | 'SEARCH_BY_CAR'
  | 'SEARCH_BY_NAME'
  | 'TODAY_STATS'
  | 'YESTERDAY_STATS'
  | 'NUMERIC_CODE'
  | 'UNKNOWN';

export interface ParsedCommand {
  type: CommandType;
  value: string;
}

export class UtteranceParser {
  parse(utterance: string): ParsedCommand {
    const text = utterance.trim();

    if (this.isHelpCommand(text)) {
      return { type: 'HELP', value: '' };
    }

    if (this.isLineCodeCommand(text)) {
      return { type: 'SEARCH_BY_CODE', value: this.extractLineCode(text) };
    }

    if (this.isCarNumberCommand(text)) {
      return { type: 'SEARCH_BY_CAR', value: this.extractCarNumber(text) };
    }

    if (this.isLineNameCommand(text)) {
      return { type: 'SEARCH_BY_NAME', value: this.extractLineName(text) };
    }

    if (this.isTodayStatsCommand(text)) {
      return { type: 'TODAY_STATS', value: '' };
    }

    if (this.isYesterdayStatsCommand(text)) {
      return { type: 'YESTERDAY_STATS', value: '' };
    }

    if (this.isNumericCode(text)) {
      return { type: 'NUMERIC_CODE', value: text };
    }

    return { type: 'UNKNOWN', value: text };
  }

  private isHelpCommand(text: string): boolean {
    return text.includes('도움말') || text === '?' || text === '메뉴';
  }

  private isLineCodeCommand(text: string): boolean {
    return text.startsWith('노선 ') || text.startsWith('노선코드 ');
  }

  private isCarNumberCommand(text: string): boolean {
    return text.startsWith('차량 ') || text.startsWith('차량번호 ');
  }

  private isLineNameCommand(text: string): boolean {
    return text.startsWith('도착 ') || text.startsWith('노선명 ');
  }

  private isTodayStatsCommand(text: string): boolean {
    return text.includes('오늘') && text.includes('현황');
  }

  private isYesterdayStatsCommand(text: string): boolean {
    return text.includes('어제') && text.includes('현황');
  }

  private isNumericCode(text: string): boolean {
    return /^\d{4,6}$/.test(text);
  }

  private extractLineCode(text: string): string {
    return text.replace(/^노선(코드)?\s*/, '');
  }

  private extractCarNumber(text: string): string {
    return text.replace(/^차량(번호)?\s*/, '');
  }

  private extractLineName(text: string): string {
    return text.replace(/^(도착|노선명)\s*/, '');
  }
}
