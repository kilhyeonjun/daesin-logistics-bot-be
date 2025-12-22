/**
 * 카카오 i 오픈빌더 스킬 응답 타입 정의
 */

// 심플 텍스트 출력
export interface SimpleTextOutput {
  simpleText: {
    text: string;
  };
}

// 리스트 카드 아이템
export interface ListCardItem {
  title: string;
  description: string;
  imageUrl?: string;
  link?: {
    web?: string;
  };
}

// 리스트 카드 버튼
export interface ListCardButton {
  label: string;
  action: 'webLink' | 'message' | 'block' | 'share';
  webLinkUrl?: string;
  messageText?: string;
  blockId?: string;
}

// 리스트 카드 출력
export interface ListCardOutput {
  listCard: {
    header: {
      title: string;
      imageUrl?: string;
    };
    items: ListCardItem[];
    buttons?: ListCardButton[];
  };
}

// 텍스트 카드 버튼
export interface TextCardButton {
  label: string;
  action: 'webLink' | 'message' | 'block' | 'share';
  webLinkUrl?: string;
  messageText?: string;
  blockId?: string;
}

// 텍스트 카드 출력
export interface TextCardOutput {
  textCard: {
    title: string;
    description: string;
    buttons?: TextCardButton[];
  };
}

// 출력 타입 통합
export type KakaoOutput = SimpleTextOutput | ListCardOutput | TextCardOutput;

// 카카오 스킬 응답
export interface KakaoResponse {
  version: '2.0';
  template: {
    outputs: KakaoOutput[];
    quickReplies?: Array<{
      label: string;
      action: 'message' | 'block';
      messageText?: string;
      blockId?: string;
    }>;
  };
}

// 카카오 스킬 요청
export interface KakaoSkillRequest {
  intent?: {
    id: string;
    name: string;
  };
  userRequest: {
    timezone: string;
    params: Record<string, string>;
    block?: {
      id: string;
      name: string;
    };
    utterance: string;
    lang?: string;
    user: {
      id: string;
      type: string;
      properties: Record<string, string>;
    };
  };
  bot?: {
    id: string;
    name: string;
  };
  action?: {
    name: string;
    clientExtra: Record<string, unknown>;
    params: Record<string, string>;
    id: string;
    detailParams: Record<string, { origin: string; value: string }>;
  };
}
