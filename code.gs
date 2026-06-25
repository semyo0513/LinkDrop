/**
 * Google Sheets 데이터를 웹앱으로 배포하기 위한 Google Apps Script (GAS)
 *
 * [작동 방식]
 * 1. 스프레드시트의 첫 번째 시트에서 데이터를 가져옵니다.
 * 2. 헤더 행(1행)에서 '범주', '내용', '링크', '링크 설명' 열의 위치를 자동으로 찾습니다.
 * 3. 데이터를 JSON 객체 배열로 변환합니다.
 * 4. CORS 문제를 방지하기 위해 JSON 형식으로 반환합니다.
 */

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    
    // 데이터가 없는 경우 빈 데이터 반환 (헤더 제외 최소 2행 필요)
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        data: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var headers = data[0];
    var jsonData = [];
    
    // 컬럼명으로 인덱스 찾기 (한글 지원)
    var categoryIdx = headers.indexOf("범주");
    var titleIdx = headers.indexOf("내용");
    var linkIdx = headers.indexOf("링크");
    var descIdx = headers.indexOf("링크 설명");
    
    // 만약 헤더를 정확히 찾지 못했을 경우 기본 인덱스로 매핑
    if (categoryIdx === -1) categoryIdx = 0; // A열
    if (titleIdx === -1) titleIdx = 1;       // B열
    if (linkIdx === -1) linkIdx = 2;         // C열
    if (descIdx === -1) descIdx = 3;         // D열
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      
      // 링크 주소가 빈 행은 건너뜁니다.
      if (!row[linkIdx]) continue;
      
      jsonData.push({
        category: String(row[categoryIdx] || "기타").trim(),
        title: String(row[titleIdx] || "이름 없음").trim(),
        url: String(row[linkIdx]).trim(),
        description: String(row[descIdx] || "").trim()
      });
    }
    
    var response = {
      status: "success",
      count: jsonData.length,
      data: jsonData
    };
    
    // JSON 응답 반환 및 MIME 타입 설정
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    var errResponse = {
      status: "error",
      message: error.toString()
    };
    return ContentService.createTextOutput(JSON.stringify(errResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
