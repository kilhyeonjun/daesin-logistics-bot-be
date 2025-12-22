const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

async function testCrawl() {
  const url = 'http://logistics.ds3211.co.kr/daesin/servlet/total.TotServlet';

  // 금요일 날짜 (12월 20일)
  const searchDate = '20251220';

  console.log('검색 날짜:', searchDate);

  const formData = new URLSearchParams({
    mode: '1',
    menuid: '27',
    level: '01',
    levelgrade: 'Y',
    centercode: '',
    agencyCode: '',
    cryptoKey: '',
    fdate: searchDate,
    searchDelayed: '',
    searchOpt: '2',
    line1: '100000',
    line2: '200000',
    lineName: '',
    terminalCode: '',
    arriveArea: ''
  });

  try {
    const response = await axios.post(url, formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      responseType: 'arraybuffer',
      timeout: 30000
    });

    const html = iconv.decode(Buffer.from(response.data), 'euc-kr');

    // HTML 파일로 저장해서 구조 확인
    require('fs').writeFileSync('result.html', html);
    console.log('HTML 저장 완료: result.html');

    const $ = cheerio.load(html);

    // 테이블 구조 분석
    console.log('\n=== 테이블 분석 ===');
    $('table').each((i, table) => {
      const rows = $(table).find('tr').length;
      const firstRowCols = $(table).find('tr').first().find('td, th').length;
      if (rows > 2 && firstRowCols > 3) {
        console.log(`테이블 ${i}: ${rows}행, 첫 행 ${firstRowCols}열`);

        // 헤더 출력
        const headers = [];
        $(table).find('tr').first().find('td, th').each((j, cell) => {
          headers.push($(cell).text().trim());
        });
        console.log('헤더:', headers.join(' | '));

        // 샘플 데이터 출력 (2-5번째 행)
        $(table).find('tr').slice(1, 5).each((j, row) => {
          const cols = [];
          $(row).find('td').each((k, cell) => {
            cols.push($(cell).text().trim().substring(0, 20));
          });
          if (cols.length > 0) {
            console.log(`  행${j+1}:`, cols.join(' | '));
          }
        });
      }
    });

  } catch (error) {
    console.error('에러:', error.message);
  }
}

testCrawl();
