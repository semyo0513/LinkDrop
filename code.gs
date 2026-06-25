/**
 * Google Sheets 데이터를 웹앱으로 배포하고 관리(추가/삭제/설정 변경)하기 위한 Google Apps Script (GAS)
 *
 * [작동 방식]
 * 1. doGet(e): '링크' 시트와 '설정' 시트의 데이터를 읽어 JSON 객체로 반환합니다. 시트가 없으면 기본값으로 자동 생성합니다.
 * 2. doPost(e): 비밀번호를 검증하고, 액션(링크 추가, 링크 삭제, 설정 업데이트)에 맞춰 구글 시트를 수정합니다.
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. '링크' 시트 확인 및 초기화
    var linkSheet = ss.getSheetByName("링크");
    if (!linkSheet) {
      var sheets = ss.getSheets();
      if (sheets.length > 0) {
        linkSheet = sheets[0];
        linkSheet.setName("링크");
      } else {
        linkSheet = ss.insertSheet("링크");
      }
      
      if (linkSheet.getLastRow() === 0) {
        linkSheet.appendRow(["범주", "내용", "링크", "링크 설명", "아이콘"]);
      }
    }
    
    // 2. '설정' 시트 확인 및 초기화
    var configSheet = ss.getSheetByName("설정");
    if (!configSheet) {
      configSheet = ss.insertSheet("설정");
      configSheet.appendRow(["설정항목", "설정값", "설명"]);
      configSheet.appendRow(["appName", "📖 모두의 학교", "웹앱 타이틀"]);
      configSheet.appendRow(["copyright", "ⓒ 2026. 창순기획 Co. All rights reserved.", "푸터 저작권 문구"]);
      configSheet.appendRow(["backgroundImage", "", "배경 이미지 URL 또는 색상 코드"]);
      configSheet.appendRow(["contactLink", "", "연락처 이메일(mailto:) 또는 웹 링크"]);
      configSheet.appendRow(["adminPassword", "1234", "관리자 모드 접속 비밀번호"]);
    }
    
    // 3. 링크 데이터 추출
    var linkData = linkSheet.getDataRange().getValues();
    var links = [];
    if (linkData.length > 1) {
      var headers = linkData[0];
      var categoryIdx = headers.indexOf("범주");
      var titleIdx = headers.indexOf("내용");
      var linkIdx = headers.indexOf("링크");
      var descIdx = headers.indexOf("링크 설명");
      var iconIdx = headers.indexOf("아이콘");
      
      if (categoryIdx === -1) categoryIdx = 0;
      if (titleIdx === -1) titleIdx = 1;
      if (linkIdx === -1) linkIdx = 2;
      if (descIdx === -1) descIdx = 3;
      if (iconIdx === -1) iconIdx = 4;
      
      for (var i = 1; i < linkData.length; i++) {
        var row = linkData[i];
        if (!row[linkIdx]) continue;
        
        links.push({
          category: String(row[categoryIdx] || "기타").trim(),
          title: String(row[titleIdx] || "이름 없음").trim(),
          url: String(row[linkIdx]).trim(),
          description: String(row[descIdx] || "").trim(),
          icon: String(row[iconIdx] || "").trim()
        });
      }
    }
    
    // 4. 설정 데이터 추출
    var configData = configSheet.getDataRange().getValues();
    var settings = {};
    for (var j = 1; j < configData.length; j++) {
      var key = String(configData[j][0]).trim();
      var val = String(configData[j][1]).trim();
      if (key) {
        settings[key] = val;
      }
    }
    
    // 기본값 보장
    if (!settings.appName) settings.appName = "📖 모두의 학교";
    if (!settings.copyright) settings.copyright = "ⓒ 2026. 창순기획 Co. All rights reserved.";
    if (!settings.adminPassword) settings.adminPassword = "1234";
    
    var response = {
      status: "success",
      links: links,
      settings: settings
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var password = payload.password;
    
    // 1. 비밀번호 검증
    var configSheet = ss.getSheetByName("설정");
    var adminPassword = "1234"; // 기본값
    if (configSheet) {
      var configData = configSheet.getDataRange().getValues();
      for (var j = 1; j < configData.length; j++) {
        if (String(configData[j][0]).trim() === "adminPassword") {
          adminPassword = String(configData[j][1]).trim();
          break;
        }
      }
    }
    
    if (password !== adminPassword) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "관리자 비밀번호가 올바르지 않습니다."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. 액션 분기 처리
    if (action === "addLink") {
      var linkSheet = ss.getSheetByName("링크");
      if (!linkSheet) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "링크 시트를 찾을 수 없습니다." })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var headers = linkSheet.getDataRange().getValues()[0];
      var newRow = new Array(Math.max(5, headers.length));
      
      var categoryIdx = headers.indexOf("범주") === -1 ? 0 : headers.indexOf("범주");
      var titleIdx = headers.indexOf("내용") === -1 ? 1 : headers.indexOf("내용");
      var linkIdx = headers.indexOf("링크") === -1 ? 2 : headers.indexOf("링크");
      var descIdx = headers.indexOf("링크 설명") === -1 ? 3 : headers.indexOf("링크 설명");
      var iconIdx = headers.indexOf("아이콘") === -1 ? 4 : headers.indexOf("아이콘");
      
      newRow[categoryIdx] = payload.category;
      newRow[titleIdx] = payload.title;
      newRow[linkIdx] = payload.url;
      newRow[descIdx] = payload.description || "";
      newRow[iconIdx] = payload.icon || "";
      
      linkSheet.appendRow(newRow);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
        
    } else if (action === "deleteLink") {
      var linkSheet = ss.getSheetByName("링크");
      if (!linkSheet) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "링크 시트를 찾을 수 없습니다." })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var linkData = linkSheet.getDataRange().getValues();
      var headers = linkData[0];
      var linkIdx = headers.indexOf("링크") === -1 ? 2 : headers.indexOf("링크");
      var targetUrl = payload.url.trim();
      var deletedCount = 0;
      
      // 행 인덱스 유지를 위해 역순 탐색 삭제 (2행부터 시작)
      for (var i = linkData.length - 1; i >= 1; i--) {
        if (String(linkData[i][linkIdx]).trim() === targetUrl) {
          linkSheet.deleteRow(i + 1);
          deletedCount++;
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", deletedCount: deletedCount }))
        .setMimeType(ContentService.MimeType.JSON);
        
    } else if (action === "updateSettings") {
      if (!configSheet) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "설정 시트를 찾을 수 없습니다." })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var newSettings = payload.settings;
      var configData = configSheet.getDataRange().getValues();
      
      for (var key in newSettings) {
        var found = false;
        var val = newSettings[key];
        
        for (var j = 1; j < configData.length; j++) {
          if (String(configData[j][0]).trim() === key) {
            configSheet.getRange(j + 1, 2).setValue(val);
            found = true;
            break;
          }
        }
        
        if (!found) {
          configSheet.appendRow([key, val, "자동 추가된 설정"]);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "지원하지 않는 액션입니다." }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
