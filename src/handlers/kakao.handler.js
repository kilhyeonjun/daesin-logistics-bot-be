const db = require('../database');
const { getDefaultSearchDate } = require('../crawler');
const kakao = require('../kakao');

/**
 * 발화 텍스트를 파싱하여 적절한 응답 생성
 * @param {string} utterance - 사용자 발화
 * @returns {object} 카카오톡 스킬 응답
 */
function handleUtterance(utterance) {
  // 도움말
  if (isHelpCommand(utterance)) {
    return kakao.helpMessage();
  }

  // 노선코드 검색
  if (isLineCodeCommand(utterance)) {
    const code = extractLineCode(utterance);
    const routes = db.searchByLineCode(code);
    return kakao.formatRouteMessage(routes);
  }

  // 차량번호 검색
  if (isCarNumberCommand(utterance)) {
    const number = extractCarNumber(utterance);
    const routes = db.searchByCarNumber(number);
    return kakao.formatRouteMessage(routes);
  }

  // 노선명/도착지 검색
  if (isLineNameCommand(utterance)) {
    const name = extractLineName(utterance);
    const routes = db.searchByLineName(name);
    return kakao.formatRouteMessage(routes);
  }

  // 오늘 현황
  if (isTodayStatsCommand(utterance)) {
    const today = getDefaultSearchDate();
    const stats = db.getStatsByDate(today);
    return kakao.formatStatsMessage(stats, today);
  }

  // 어제 현황
  if (isYesterdayStatsCommand(utterance)) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = yesterday.toISOString().slice(0, 10).replace(/-/g, '');
    const stats = db.getStatsByDate(date);
    return kakao.formatStatsMessage(stats, date);
  }

  // 숫자만 입력 (노선코드로 추정)
  if (isNumericCode(utterance)) {
    const routes = db.searchByLineCode(utterance);
    return kakao.formatRouteMessage(routes);
  }

  // 기본 응답
  return kakao.simpleText(
    `"${utterance}"를 이해하지 못했습니다.\n\n"도움말"을 입력하면 사용법을 볼 수 있습니다.`
  );
}

// 명령어 판별 함수들
function isHelpCommand(text) {
  return text.includes('도움말') || text === '?' || text === '메뉴';
}

function isLineCodeCommand(text) {
  return text.startsWith('노선 ') || text.startsWith('노선코드 ');
}

function isCarNumberCommand(text) {
  return text.startsWith('차량 ') || text.startsWith('차량번호 ');
}

function isLineNameCommand(text) {
  return text.startsWith('도착 ') || text.startsWith('노선명 ');
}

function isTodayStatsCommand(text) {
  return text.includes('오늘') && text.includes('현황');
}

function isYesterdayStatsCommand(text) {
  return text.includes('어제') && text.includes('현황');
}

function isNumericCode(text) {
  return /^\d{4,6}$/.test(text);
}

// 값 추출 함수들
function extractLineCode(text) {
  return text.replace(/^노선(코드)?\s*/, '');
}

function extractCarNumber(text) {
  return text.replace(/^차량(번호)?\s*/, '');
}

function extractLineName(text) {
  return text.replace(/^(도착|노선명)\s*/, '');
}

module.exports = {
  handleUtterance,
  // 테스트를 위해 내부 함수도 export
  isHelpCommand,
  isLineCodeCommand,
  isCarNumberCommand,
  isLineNameCommand,
  isTodayStatsCommand,
  isYesterdayStatsCommand,
  isNumericCode
};
