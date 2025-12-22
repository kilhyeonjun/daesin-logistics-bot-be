// Kakao Skill Request Types
export interface KakaoSkillRequest {
  intent?: {
    id?: string;
    name?: string;
  };
  userRequest?: {
    timezone?: string;
    params?: Record<string, string>;
    block?: {
      id?: string;
      name?: string;
    };
    utterance?: string;
    lang?: string;
    user?: {
      id?: string;
      type?: string;
      properties?: Record<string, string>;
    };
  };
  bot?: {
    id?: string;
    name?: string;
  };
  action?: {
    name?: string;
    clientExtra?: Record<string, unknown>;
    params?: Record<string, string>;
    id?: string;
    detailParams?: Record<string, { origin?: string; value?: string }>;
  };
}

// Kakao Skill Response Types
export interface ListCardItem {
  title: string;
  description?: string;
  imageUrl?: string;
  link?: {
    web?: string;
  };
}

export interface ListCardButton {
  label: string;
  action: 'webLink' | 'message' | 'block' | 'phone';
  webLinkUrl?: string;
  messageText?: string;
  blockId?: string;
  phoneNumber?: string;
}

export interface TextCardButton {
  label: string;
  action: 'webLink' | 'message' | 'block' | 'phone';
  webLinkUrl?: string;
  messageText?: string;
  blockId?: string;
  phoneNumber?: string;
}

export interface KakaoResponse {
  version: '2.0';
  template: {
    outputs: Array<
      | { simpleText: { text: string } }
      | {
          listCard: {
            header: { title: string };
            items: ListCardItem[];
            buttons?: ListCardButton[];
          };
        }
      | {
          textCard: {
            title: string;
            description: string;
            buttons?: TextCardButton[];
          };
        }
    >;
    quickReplies?: Array<{
      messageText: string;
      action: 'message' | 'block';
      label: string;
    }>;
  };
}
