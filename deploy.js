/**
 * GitHub Pages 배포 및 GAS URL 설정 자동화 스크립트 (Node.js)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 질문 던지기 헬퍼 (Promise 반환)
function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// 깃 명령 실행 헬퍼
function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (error) {
    return null;
  }
}

// GitHub 저장소 URL 파싱하여 GitHub Pages URL 생성
function getGitHubPagesUrl(repoUrl) {
  try {
    let cleanUrl = repoUrl.trim();
    if (cleanUrl.endsWith('.git')) {
      cleanUrl = cleanUrl.slice(0, -4);
    }

    let username = '';
    let repoName = '';

    if (cleanUrl.startsWith('git@github.com:')) {
      // SSH 형태: git@github.com:username/repo.git
      const parts = cleanUrl.replace('git@github.com:', '').split('/');
      username = parts[0];
      repoName = parts[1];
    } else {
      // HTTPS 형태: https://github.com/username/repo
      const urlObj = new URL(cleanUrl);
      const paths = urlObj.pathname.split('/').filter(p => p);
      username = paths[0];
      repoName = paths[1];
    }

    if (username && repoName) {
      return `https://${username}.github.io/${repoName}/`;
    }
  } catch (e) {
    // 파싱 실패 시 null 반환
  }
  return null;
}

async function main() {
  console.log('\n==================================================');
  console.log('🚀 링크 모음 웹앱(Link Hub) GitHub 배포 설정 스크립트');
  console.log('==================================================\n');

  // 1. Google Apps Script Web App URL 입력 받기
  let currentGasUrl = '';
  if (fs.existsSync('config.js')) {
    const configContent = fs.readFileSync('config.js', 'utf8');
    const match = configContent.match(/GAS_URL:\s*["']([^"']*)["']/);
    if (match && match[1]) {
      currentGasUrl = match[1];
    }
  }

  let gasUrlPrompt = '🔗 Google Apps Script 웹앱 URL을 입력하세요';
  if (currentGasUrl) {
    gasUrlPrompt += `\n   (기존 값: ${currentGasUrl.substring(0, 50)}...)\n   [엔터 입력 시 기존 값 유지]: `;
  } else {
    gasUrlPrompt += ': ';
  }

  let gasUrl = await askQuestion(gasUrlPrompt);
  gasUrl = gasUrl.trim();

  if (!gasUrl && currentGasUrl) {
    gasUrl = currentGasUrl;
  }

  while (!gasUrl || !gasUrl.startsWith('https://script.google.com/')) {
    console.log('\n❌ 올바른 Google Apps Script 웹앱 URL이 아닙니다.');
    console.log('   형식 예: https://script.google.com/macros/s/.../exec');
    gasUrl = await askQuestion('🔗 다시 입력해 주세요: ');
    gasUrl = gasUrl.trim();
  }

  // 2. config.js 업데이트
  const configContent = `// Google Apps Script Web App URL 설정 파일
// 이 파일은 deploy.js 실행 시 자동으로 업데이트됩니다.
window.CONFIG = {
  GAS_URL: ${JSON.stringify(gasUrl)}
};
`;
  fs.writeFileSync('config.js', configContent, 'utf8');
  console.log('\n✅ config.js 파일이 업데이트되었습니다.');

  // 3. Git 초기화 상태 확인 및 설정
  let gitInitialized = fs.existsSync('.git');
  if (!gitInitialized) {
    console.log('\n📦 로컬 Git 저장소를 초기화합니다...');
    runCommand('git init');
    runCommand('git branch -M main');
    console.log('✅ Git 저장소가 초기화되었습니다.');
  }

  // 4. Git 원격 저장소(remote origin) 확인
  let originUrl = runCommand('git remote get-url origin');
  if (!originUrl) {
    console.log('\n📌 GitHub 원격 저장소가 설정되지 않았습니다.');
    let repoUrl = '';
    while (!repoUrl) {
      repoUrl = await askQuestion('📂 GitHub 레포지토리 URL을 입력하세요 (예: https://github.com/사용자/저장소명): ');
      repoUrl = repoUrl.trim();
    }
    
    const success = runCommand(`git remote add origin ${repoUrl}`);
    originUrl = repoUrl;
    console.log('✅ GitHub 원격 저장소가 등록되었습니다.');
  } else {
    console.log(`\n📌 설정된 GitHub 원격 저장소: ${originUrl}`);
    const changeOrigin = await askQuestion('   원격 저장소 URL을 변경하시겠습니까? (y/N): ');
    if (changeOrigin.trim().toLowerCase() === 'y') {
      let repoUrl = '';
      while (!repoUrl) {
        repoUrl = await askQuestion('📂 새로운 GitHub 레포지토리 URL을 입력하세요: ');
        repoUrl = repoUrl.trim();
      }
      runCommand('git remote remove origin');
      runCommand(`git remote add origin ${repoUrl}`);
      originUrl = repoUrl;
      console.log('✅ 원격 저장소 URL이 업데이트되었습니다.');
    }
  }

  // 5. GitHub Pages 브랜치 기본 설정 안내 및 배포 확인
  const deployConfirm = await askQuestion('\n🚀 지금 GitHub에 코드를 올려 배포하시겠습니까? (Y/n): ');
  if (deployConfirm.trim().toLowerCase() !== 'n') {
    console.log('\n📤 GitHub 전송을 준비하는 중...');
    
    // 스테이징 및 커밋
    runCommand('git add .');
    
    // 변경 사항이 있는지 확인
    const status = runCommand('git status --porcelain');
    if (!status) {
      console.log('ℹ️ 변경 사항이 없어 커밋을 생성하지 않고 푸시만 진행합니다.');
    } else {
      const commitMsg = 'deploy: 웹앱 설정 업데이트 및 배포';
      runCommand(`git commit -m "${commitMsg}"`);
      console.log('✅ 커밋이 생성되었습니다.');
    }

    console.log('📤 GitHub 서버로 푸시 중 (git push -u origin main)...');
    console.log('   (최초 푸시 시 로그인 창이 뜰 수 있습니다)');

    try {
      // 윈도우 환경에서 push 명령 출력 및 동기 처리
      execSync('git push -u origin main', { stdio: 'inherit' });
      console.log('\n🎉 성공적으로 GitHub에 푸시 완료!');
      
      const pagesUrl = getGitHubPagesUrl(originUrl);
      
      console.log('\n==================================================');
      console.log('✨ 웹앱 배포 완료 가이드 ✨');
      console.log('==================================================');
      if (pagesUrl) {
        console.log(`🔗 배포 예정 주소: ${pagesUrl}`);
      }
      console.log('\n👉 1분 후 웹사이트가 활성화되지 않는다면 아래 설정을 확인하세요:');
      console.log('1. 본인의 GitHub 레포지토리 페이지로 이동합니다.');
      console.log(`   (${originUrl})`);
      console.log('2. [Settings] 탭 -> 좌측 [Pages] 메뉴로 이동합니다.');
      console.log('3. "Build and deployment" 영역 아래:');
      console.log('   - Source: "Deploy from a branch" 선택');
      console.log('   - Branch: "main" 및 "/(root)" 선택 후 [Save] 버튼 클릭');
      console.log('4. 잠시 후 상단에 표시되는 Pages 주소로 접속하면 정상 동작합니다.');
      console.log('==================================================\n');

    } catch (pushError) {
      console.log('\n❌ 푸시 과정에서 오류가 발생했습니다.');
      console.log('   원격 레포지토리가 실제로 존재하는지, 쓰기 권한(로그인)이 올바른지 확인해 주세요.');
    }
  } else {
    console.log('\nℹ️ 배포가 취소되었습니다. 나중에 배포하려면 터미널에 `npm run deploy`를 입력해 주세요.');
  }

  rl.close();
}

main().catch(err => {
  console.error('\n❌ 스크립트 실행 도중 오류가 발생했습니다:', err);
  rl.close();
});
