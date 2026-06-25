// 🚀 링크 모음 웹앱 Core JavaScript 로직 (아이콘 피커, 배경 업로드, 링크 수정 기능 포함)

document.addEventListener('DOMContentLoaded', () => {
  // DOM 요소 선택 - 공통
  const themeToggle = document.getElementById('theme-toggle');
  const sunIcon = themeToggle.querySelector('.sun-icon');
  const moonIcon = themeToggle.querySelector('.moon-icon');
  
  const searchBar = document.getElementById('search-bar');
  const categoryContainer = document.getElementById('category-container');
  const linksGrid = document.getElementById('links-grid');
  const statusArea = document.getElementById('status-area');
  
  // DOM 요소 선택 - 앱 메인 헤더 & 푸터
  const appTitle = document.getElementById('app-title');
  const appCopyright = document.getElementById('app-copyright');
  const headerContactBtn = document.getElementById('header-contact-btn');
  
  // 모달 요소 선택 - 링크 설명
  const infoModal = document.getElementById('info-modal');
  const modalClose = document.getElementById('modal-close');
  const modalFavicon = document.getElementById('modal-favicon');
  const modalTitle = document.getElementById('modal-title');
  const modalCategory = document.getElementById('modal-category');
  const modalDescription = document.getElementById('modal-description');
  const modalLink = document.getElementById('modal-link');

  // 모달 요소 선택 - 관리자 모드
  const adminBtn = document.getElementById('admin-btn');
  const adminModal = document.getElementById('admin-modal');
  const adminModalClose = document.getElementById('admin-modal-close');
  const adminAuthSection = document.getElementById('admin-auth-section');
  const adminDashboardSection = document.getElementById('admin-dashboard-section');
  
  const adminPasswordInput = document.getElementById('admin-password-input');
  const adminLoginBtn = document.getElementById('admin-login-btn');
  const authErrorMsg = document.getElementById('auth-error-msg');
  
  const tabButtons = adminModal.querySelectorAll('.tab-btn');
  const tabContents = adminModal.querySelectorAll('.tab-content');
  const adminLinksListContainer = document.getElementById('admin-links-list-container');
  
  // 관리자 폼 요소
  const addLinkForm = document.getElementById('add-link-form');
  const addCategory = document.getElementById('add-category');
  const addTitle = document.getElementById('add-title');
  const addUrl = document.getElementById('add-url');
  const addDesc = document.getElementById('add-desc');
  const addIcon = document.getElementById('add-icon');
  const submitAddLinkBtn = document.getElementById('submit-add-link-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const editModeNotice = document.getElementById('edit-mode-notice');
  const emojiPickerContainer = document.getElementById('emoji-picker-container');
  
  const generalSettingsForm = document.getElementById('general-settings-form');
  const settingsAppName = document.getElementById('settings-app-name');
  const settingsBg = document.getElementById('settings-bg');
  const settingsCopyright = document.getElementById('settings-copyright');
  const settingsContact = document.getElementById('settings-contact');
  const settingsPassword = document.getElementById('settings-password');
  const submitSettingsBtn = document.getElementById('submit-settings-btn');
  const bgPresetChips = adminModal.querySelectorAll('.bg-preset-chip');
  
  // 이미지 업로드 관련 요소
  const bgFileUpload = document.getElementById('bg-file-upload');
  const uploadPreviewContainer = document.getElementById('upload-preview-container');
  const uploadPreview = document.getElementById('upload-preview');
  const removePreviewBtn = document.getElementById('remove-preview-btn');

  // 상태 관리 변수
  let allLinks = [];
  let settings = {};
  let currentCategory = 'all';
  let searchQuery = '';
  
  // 관리자 인증 상태
  let isAdminLoggedIn = false;
  let verifiedPassword = '';
  
  // 수정 모드 상태
  let isEditMode = false;
  let editingOldUrl = '';

  // 기본 프리셋 이모지 아이콘 리스트
  const presetEmojis = [
    '🎒', '🏫', '📅', '📝', '📢', '💡', '💻', '🎨', '🎵', '⚽',
    '🧪', '📚', '🏆', '📌', '⭐', '🔗', '🔔', '💬', '👩‍🏫', '👨‍🏫',
    '🚀', '🎯', '🌈', '🧩', '☘️', '🔥', '⚙️', '📂', '❤️', '👍'
  ];

  /* ==========================================================================
     1. 테마(다크/라이트 모드) 및 배경화면 설정
     ========================================================================== */
  function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    if (theme === 'dark') {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    } else {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    }
  }

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });

  initTheme();

  // 배경화면 덮어씌우기 함수
  function applyBackground(bgValue) {
    if (!bgValue || bgValue.trim() === '') {
      document.body.style.background = '';
      document.body.style.backgroundImage = '';
      return;
    }
    const cleanBg = bgValue.trim();
    
    // 이미지 URL 또는 Base64 Data URL 판단
    if (cleanBg.startsWith('http') || cleanBg.startsWith('data:image') || cleanBg.includes('.png') || cleanBg.includes('.jpg') || cleanBg.includes('.gif') || cleanBg.includes('.webp')) {
      document.body.style.background = '';
      document.body.style.backgroundImage = `url('${cleanBg}')`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      // 일반 CSS 그라데이션 또는 단색 코드
      document.body.style.backgroundImage = '';
      document.body.style.background = cleanBg;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundAttachment = 'fixed';
    }
  }

  /* ==========================================================================
     2. 데이터 로딩 및 화면 적용
     ========================================================================== */
  async function fetchLinksAndSettings() {
    const gasUrl = window.CONFIG && window.CONFIG.GAS_URL;
    
    if (!gasUrl || gasUrl.trim() === "" || gasUrl.includes("YOUR_GAS_URL_HERE")) {
      showStatus(`
        <p class="status-message error" style="font-weight: 700; font-size: 1.2rem;">
          ⚙️ GAS Web App URL이 설정되지 않았습니다.
        </p>
        <p class="status-message" style="margin-top: 0.5rem; max-width: 500px; line-height: 1.6;">
          <code>config.js</code> 파일에 Google Apps Script 웹앱 URL을 입력하거나,<br>
          터미널에서 <code>npm run deploy</code>를 실행하여 URL을 자동 배포 및 설정해 주세요.
        </p>
      `, false);
      return;
    }

    try {
      showStatus('데이터를 불러오고 있습니다...', true);
      
      const response = await fetch(gasUrl);
      if (!response.ok) {
        throw new Error(`HTTP 에러! 상태코드: ${response.status}`);
      }
      
      const json = await response.json();
      
      if (json.status === 'error') {
        throw new Error(json.message || '데이터 로딩 중 에러가 발생했습니다.');
      }
      
      allLinks = json.links || [];
      settings = json.settings || {};
      
      // 1. 환경 설정 적용
      applySettings();
      
      // 2. 링크 상태 렌더링
      if (allLinks.length === 0) {
        statusArea.style.display = 'flex';
        linksGrid.style.display = 'none';
        showStatus(`
          <p class="status-message">등록된 웹 링크가 없습니다.</p>
          <button class="modal-action-btn" id="empty-setup-btn" style="margin-top: 1rem; width: auto; padding: 0.6rem 1.5rem;">
            관리자 모드에서 링크 추가
          </button>
        `, false);
        
        document.getElementById('empty-setup-btn').addEventListener('click', () => {
          openAdminModal();
        });
        return;
      }
      
      statusArea.style.display = 'none';
      linksGrid.style.display = 'grid';
      
      buildCategories();
      renderLinks();
      
    } catch (error) {
      console.error('Fetch error:', error);
      showStatus(`
        <p class="status-message error" style="font-weight: 700;">
          ❌ 데이터를 불러오지 못했습니다.
        </p>
        <p class="status-message" style="margin-top: 0.5rem; max-width: 500px; line-height: 1.5;">
          ${error.message}<br>
          <span style="font-size: 0.85rem; color: var(--text-secondary);">
            - GAS 웹앱 배포 설정이 '모든 사용자(익명 포함)'로 되었는지 확인하세요.<br>
            - 구글 시트 구조에 에러가 없는지 확인해 주세요.
          </span>
        </p>
      `, false);
    }
  }

  function applySettings() {
    // 앱 타이틀
    if (settings.appName) {
      appTitle.textContent = settings.appName;
      document.title = `${settings.appName} - 링크 포털`;
    }
    
    // 푸터 저작권 문구
    if (settings.copyright) {
      appCopyright.textContent = settings.copyright;
    }
    
    // 배경 이미지/색상
    applyBackground(settings.backgroundImage);
    
    // CONTACT 링크 설정
    if (settings.contactLink && settings.contactLink.trim() !== '') {
      headerContactBtn.href = settings.contactLink.trim();
      headerContactBtn.style.display = 'inline-flex';
    } else {
      headerContactBtn.style.display = 'none';
    }
  }

  function showStatus(htmlContent, showSpinner = false) {
    statusArea.style.display = 'flex';
    linksGrid.style.display = 'none';
    
    statusArea.innerHTML = `
      ${showSpinner ? '<div class="spinner"></div>' : ''}
      <div class="status-message">${htmlContent}</div>
    `;
  }

  /* ==========================================================================
     3. 카테고리 필터 태그 생성
     ========================================================================== */
  function buildCategories() {
    const categories = ['all', ...new Set(allLinks.map(item => item.category))];
    const previousCategory = currentCategory;
    
    categoryContainer.innerHTML = '';
    
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'category-tag';
      if (cat === 'all') {
        btn.textContent = '전체';
      } else {
        btn.textContent = cat;
      }
      btn.dataset.category = cat;
      
      if (cat === previousCategory) {
        btn.classList.add('active');
      }
      
      categoryContainer.appendChild(btn);
    });

    const activeChip = categoryContainer.querySelector(`[data-category="${previousCategory}"]`);
    if (activeChip) {
      activeChip.classList.add('active');
    } else {
      const allChip = categoryContainer.querySelector('[data-category="all"]');
      if (allChip) allChip.classList.add('active');
      currentCategory = 'all';
    }
    
    categoryContainer.onclick = (e) => {
      const target = e.target.closest('.category-tag');
      if (!target) return;
      
      categoryContainer.querySelectorAll('.category-tag').forEach(btn => btn.classList.remove('active'));
      target.classList.add('active');
      
      currentCategory = target.dataset.category;
      renderLinks();
    };
  }

  /* ==========================================================================
     4. 파비콘 / 이모지 렌더링 도구
     ========================================================================== */
  function getFaviconUrl(linkUrl) {
    try {
      const urlObj = new URL(linkUrl);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
    } catch (e) {
      return '';
    }
  }

  function getFallbackLetter(title) {
    return title ? title.trim().charAt(0) : '?';
  }

  function renderIconHTML(iconStr, urlStr, titleStr) {
    if (iconStr && iconStr.trim() !== '') {
      const cleanIcon = iconStr.trim();
      
      if (cleanIcon.startsWith('http') || cleanIcon.startsWith('data:image')) {
        return `
          <div class="favicon-container">
            <img src="${cleanIcon}" alt="${titleStr}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="favicon-fallback" style="display: none;">${getFallbackLetter(titleStr)}</div>
          </div>
        `;
      } else {
        return `<div class="favicon-container emoji-icon">${cleanIcon}</div>`;
      }
    }
    
    const faviconUrl = getFaviconUrl(urlStr);
    if (faviconUrl) {
      return `
        <div class="favicon-container">
          <img src="${faviconUrl}" alt="${titleStr}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="favicon-fallback" style="display: none;">${getFallbackLetter(titleStr)}</div>
        </div>
      `;
    } else {
      return `
        <div class="favicon-container">
          <div class="favicon-fallback">${getFallbackLetter(titleStr)}</div>
        </div>
      `;
    }
  }

  /* ==========================================================================
     5. 메인 그리드 링크 카드 렌더링
     ========================================================================== */
  function renderLinks() {
    linksGrid.innerHTML = '';
    
    const filtered = allLinks.filter(item => {
      const matchesCategory = currentCategory === 'all' || item.category === currentCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        item.title.toLowerCase().includes(query) || 
        item.category.toLowerCase().includes(query) || 
        item.description.toLowerCase().includes(query) ||
        item.url.toLowerCase().includes(query);
        
      return matchesCategory && matchesSearch;
    });
    
    if (filtered.length === 0) {
      linksGrid.style.display = 'none';
      showStatus('검색 결과와 일치하는 링크가 없습니다.', false);
      return;
    }
    
    statusArea.style.display = 'none';
    linksGrid.style.display = 'grid';
    
    filtered.forEach(item => {
      const card = document.createElement('a');
      card.className = 'link-card';
      card.href = item.url;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      
      const iconHTML = renderIconHTML(item.icon, item.url, item.title);
      
      card.innerHTML = `
        <button class="info-btn" title="설명 보기">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </button>
        ${iconHTML}
        <div class="link-title" title="${item.title}">${item.title}</div>
        <span class="link-category-badge">${item.category}</span>
      `;
      
      const infoBtn = card.querySelector('.info-btn');
      infoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openInfoModal(item);
      });
      
      linksGrid.appendChild(card);
    });
  }

  /* ==========================================================================
     6. 링크 정보 상세 설명 모달 제어
     ========================================================================== */
  function openInfoModal(item) {
    modalTitle.textContent = item.title;
    modalCategory.textContent = item.category;
    modalDescription.textContent = item.description || '이 링크에 대한 추가 설명이 등록되어 있지 않습니다.';
    modalLink.href = item.url;
    
    const faviconContainer = infoModal.querySelector('.modal-favicon-wrapper');
    faviconContainer.innerHTML = '';
    
    if (item.icon && item.icon.trim() !== '') {
      const cleanIcon = item.icon.trim();
      if (cleanIcon.startsWith('http') || cleanIcon.startsWith('data:image')) {
        const img = document.createElement('img');
        img.src = cleanIcon;
        img.alt = item.title;
        img.onerror = function() {
          this.style.display = 'none';
          const fallback = document.createElement('div');
          fallback.className = 'favicon-fallback';
          fallback.textContent = getFallbackLetter(item.title);
          faviconContainer.appendChild(fallback);
        };
        faviconContainer.appendChild(img);
      } else {
        const emojiDiv = document.createElement('div');
        emojiDiv.className = 'emoji-icon';
        emojiDiv.style.fontSize = '2.5rem';
        emojiDiv.textContent = cleanIcon;
        faviconContainer.appendChild(emojiDiv);
      }
    } else {
      const faviconUrl = getFaviconUrl(item.url);
      if (faviconUrl) {
        const img = document.createElement('img');
        img.src = faviconUrl;
        img.alt = item.title;
        img.onerror = function() {
          this.style.display = 'none';
          const fallback = document.createElement('div');
          fallback.className = 'favicon-fallback';
          fallback.textContent = getFallbackLetter(item.title);
          faviconContainer.appendChild(fallback);
        };
        faviconContainer.appendChild(img);
      } else {
        const fallback = document.createElement('div');
        fallback.className = 'favicon-fallback';
        fallback.textContent = getFallbackLetter(item.title);
        faviconContainer.appendChild(fallback);
      }
    }
    
    infoModal.classList.add('active');
  }

  function closeInfoModal() {
    infoModal.classList.remove('active');
  }

  modalClose.addEventListener('click', closeInfoModal);
  infoModal.addEventListener('click', (e) => {
    if (e.target === infoModal) closeInfoModal();
  });

  /* ==========================================================================
     7. 관리자 모드 기능 로직
     ========================================================================== */
  function openAdminModal() {
    adminPasswordInput.value = '';
    authErrorMsg.style.display = 'none';
    
    if (isAdminLoggedIn) {
      showAdminDashboard();
    } else {
      adminAuthSection.classList.add('active');
      adminDashboardSection.classList.remove('active');
    }
    adminModal.classList.add('active');
  }

  function closeAdminModal() {
    adminModal.classList.remove('active');
    // 수정 모드 상태에서 닫힐 시 수정 모드 해제
    if (isEditMode) {
      cancelLinkEdit();
    }
  }

  adminBtn.addEventListener('click', openAdminModal);
  adminModalClose.addEventListener('click', closeAdminModal);
  adminModal.addEventListener('click', (e) => {
    if (e.target === adminModal) closeAdminModal();
  });

  adminPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAdminLogin();
  });
  adminLoginBtn.addEventListener('click', handleAdminLogin);

  function handleAdminLogin() {
    const entered = adminPasswordInput.value;
    const realPassword = settings.adminPassword || '1234';
    
    if (entered === realPassword) {
      isAdminLoggedIn = true;
      verifiedPassword = entered;
      showAdminDashboard();
    } else {
      authErrorMsg.textContent = '비밀번호가 올바르지 않습니다.';
      authErrorMsg.style.display = 'block';
      adminPasswordInput.focus();
    }
  }

  function showAdminDashboard() {
    adminAuthSection.classList.remove('active');
    adminDashboardSection.classList.add('active');
    
    // 환경 설정 폼 사전 입력 채우기
    settingsAppName.value = settings.appName || '📖 모두의 학교';
    settingsBg.value = settings.backgroundImage || '';
    settingsCopyright.value = settings.copyright || 'ⓒ 2026. 창순기획 Co. All rights reserved.';
    settingsContact.value = settings.contactLink || '';
    settingsPassword.value = '';
    
    // 업로드된 이미지 미리보기 동기화
    if (settings.backgroundImage && settings.backgroundImage.trim().startsWith('data:image')) {
      uploadPreview.src = settings.backgroundImage;
      uploadPreviewContainer.style.display = 'flex';
    } else {
      uploadPreview.src = '';
      uploadPreviewContainer.style.display = 'none';
    }
    
    // 배경 프리셋 칩 선택 효과 동기화
    bgPresetChips.forEach(chip => {
      if (chip.dataset.bg === settings.backgroundImage) {
        chip.classList.add('selected');
      } else {
        chip.classList.remove('selected');
      }
    });
    
    switchTab('tab-links-list');
    loadAdminLinksList();
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      switchTab(tabId);
    });
  });

  function switchTab(tabId) {
    // 수정 모드 상태에서 다른 탭으로 강제 이동 시 수정 모드 해제
    if (isEditMode && tabId !== 'tab-add-link') {
      cancelLinkEdit();
    }
    
    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    adminModal.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
    
    if (tabId === 'tab-links-list') {
      loadAdminLinksList();
    }
  }

  // 관리자 탭 1: 링크 목록 렌더링 (수정/삭제 버튼 포함)
  function loadAdminLinksList() {
    adminLinksListContainer.innerHTML = '';
    
    if (allLinks.length === 0) {
      adminLinksListContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem 0;">등록된 링크가 없습니다.</p>';
      return;
    }
    
    allLinks.forEach(link => {
      const item = document.createElement('div');
      item.className = 'admin-link-item';
      
      item.innerHTML = `
        <div class="admin-link-item-info">
          <div class="admin-link-item-title">${link.title} <span style="font-size: 0.75rem; color: var(--primary-color); font-weight: normal;">[${link.category}]</span></div>
          <div class="admin-link-item-url" title="${link.url}">${link.url}</div>
        </div>
        <div class="admin-link-actions">
          <button class="admin-link-edit-btn" title="수정">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="admin-link-delete-btn" title="삭제">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      `;
      
      // 수정 버튼 핸들러
      item.querySelector('.admin-link-edit-btn').onclick = () => {
        startLinkEdit(link);
      };
      
      // 삭제 버튼 핸들러
      item.querySelector('.admin-link-delete-btn').onclick = async () => {
        if (confirm(`"${link.title}" 링크를 정말 삭제하시겠습니까?`)) {
          await deleteLink(link.url);
        }
      };
      
      adminLinksListContainer.appendChild(item);
    });
  }

  /* ==========================================================================
     8. 링크 수정 기능 제어 흐름
     ========================================================================== */
  function startLinkEdit(link) {
    isEditMode = true;
    editingOldUrl = link.url;
    
    // 폼 값 입력
    addCategory.value = link.category;
    addTitle.value = link.title;
    addUrl.value = link.url;
    addDesc.value = link.description || '';
    addIcon.value = link.icon || '';
    
    // 이모지 피커 활성화 동기화
    highlightSelectedEmoji(link.icon);
    
    // UI 변경
    editModeNotice.style.display = 'block';
    submitAddLinkBtn.textContent = '수정 완료 및 저장';
    cancelEditBtn.style.display = 'block';
    
    // 탭 헤더 타이틀 이름 일시적 임시 수정
    document.getElementById('tab-add-link-btn').textContent = '링크 수정';
    
    // 추가/수정 탭으로 이동
    switchTab('tab-add-link');
  }

  function cancelLinkEdit() {
    isEditMode = false;
    editingOldUrl = '';
    
    // 폼 초기화
    addLinkForm.reset();
    highlightSelectedEmoji('');
    
    // UI 원복
    editModeNotice.style.display = 'none';
    submitAddLinkBtn.textContent = '추가하기';
    cancelEditBtn.style.display = 'none';
    document.getElementById('tab-add-link-btn').textContent = '링크 추가';
  }

  cancelEditBtn.addEventListener('click', () => {
    cancelLinkEdit();
    switchTab('tab-links-list');
  });

  /* ==========================================================================
     9. 이모지 아이콘 피커 구현
     ========================================================================== */
  function renderEmojiPicker() {
    emojiPickerContainer.innerHTML = '';
    presetEmojis.forEach(emoji => {
      const item = document.createElement('div');
      item.className = 'emoji-item';
      item.textContent = emoji;
      
      item.addEventListener('click', () => {
        // 기존 선택 칩 선택 해제
        emojiPickerContainer.querySelectorAll('.emoji-item').forEach(c => c.classList.remove('selected'));
        
        // 만약 기존에 똑같은 이모지가 눌린 상태에서 한 번 더 누르면 해제 기능
        if (addIcon.value === emoji) {
          addIcon.value = '';
        } else {
          addIcon.value = emoji;
          item.classList.add('selected');
        }
      });
      
      emojiPickerContainer.appendChild(item);
    });
  }

  function highlightSelectedEmoji(value) {
    emojiPickerContainer.querySelectorAll('.emoji-item').forEach(chip => {
      if (chip.textContent === value) {
        chip.classList.add('selected');
      } else {
        chip.classList.remove('selected');
      }
    });
  }

  // 아이콘 텍스트 수동 변경 감지 시 이모지 피커 하이라이트 동기화
  addIcon.addEventListener('input', (e) => {
    highlightSelectedEmoji(e.target.value.trim());
  });

  renderEmojiPicker();

  /* ==========================================================================
     10. 배경화면 이미지 로컬 업로드 & Canvas 압축 최적화
     ========================================================================== */
  bgFileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      bgFileUpload.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
      const img = new Image();
      img.onload = function() {
        // Canvas를 사용해 이미지 리사이징 및 압축
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1200; // 가로/세로 최대 길이를 1200px로 제한하여 구글 시트 셀 제한을 방지

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // JPEG 포맷, 0.5 퀄리티로 고강도 압축 (해상도는 높고 용량은 30KB 전후로 극소화)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);

        // 환경 설정 배경화면 주소창에 주입 및 미리보기 갱신
        settingsBg.value = compressedBase64;
        uploadPreview.src = compressedBase64;
        uploadPreviewContainer.style.display = 'flex';
        
        // 배경화면 실시간 반영
        applyBackground(compressedBase64);
        
        // 프리셋 칩 하이라이트 해제
        bgPresetChips.forEach(c => c.classList.remove('selected'));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  // 업로드된 배경 이미지 삭제
  removePreviewBtn.addEventListener('click', () => {
    bgFileUpload.value = '';
    settingsBg.value = '';
    uploadPreview.src = '';
    uploadPreviewContainer.style.display = 'none';
    
    // 배경 기본화면으로 적용 리셋
    applyBackground('');
  });

  /* ==========================================================================
     11. 백엔드 Google Apps Script CRUD API 통신
     ========================================================================== */
  
  // A. 링크 삭제 API
  async function deleteLink(linkUrl) {
    const gasUrl = window.CONFIG.GAS_URL;
    try {
      showStatus('링크를 삭제하고 있습니다...', true);
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'deleteLink',
          password: verifiedPassword,
          url: linkUrl
        })
      });
      
      const res = await response.json();
      if (res.status === 'success') {
        alert('링크가 성공적으로 삭제되었습니다.');
        await fetchLinksAndSettings();
        loadAdminLinksList();
      } else {
        alert(`삭제 실패: ${res.message}`);
        statusArea.style.display = 'none';
        linksGrid.style.display = 'grid';
      }
    } catch (e) {
      console.error(e);
      alert('통신 중 오류가 발생했습니다.');
      statusArea.style.display = 'none';
      linksGrid.style.display = 'grid';
    }
  }

  // B. 링크 추가 또는 수정 API (수정 모드에 따라 분기)
  addLinkForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const gasUrl = window.CONFIG.GAS_URL;
    
    const payload = {
      password: verifiedPassword,
      category: addCategory.value.trim(),
      title: addTitle.value.trim(),
      url: addUrl.value.trim(),
      description: addDesc.value.trim(),
      icon: addIcon.value.trim()
    };

    if (isEditMode) {
      payload.action = 'updateLink';
      payload.oldUrl = editingOldUrl;
    } else {
      payload.action = 'addLink';
    }

    try {
      submitAddLinkBtn.textContent = isEditMode ? '수정 중...' : '추가 중...';
      submitAddLinkBtn.disabled = true;
      cancelEditBtn.disabled = true;
      
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      
      const res = await response.json();
      if (res.status === 'success') {
        alert(isEditMode ? '링크가 성공적으로 수정되었습니다.' : '링크가 성공적으로 추가되었습니다.');
        
        // 모드 상태 해제
        cancelLinkEdit();
        
        await fetchLinksAndSettings();
        switchTab('tab-links-list');
      } else {
        alert(`작업 실패: ${res.message}`);
      }
    } catch (err) {
      console.error(err);
      alert('통신 중 오류가 발생했습니다.');
    } finally {
      submitAddLinkBtn.textContent = isEditMode ? '수정 완료 및 저장' : '추가하기';
      submitAddLinkBtn.disabled = false;
      cancelEditBtn.disabled = false;
    }
  });

  // C. 설정 변경 API
  generalSettingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const gasUrl = window.CONFIG.GAS_URL;
    
    const updated = {
      appName: settingsAppName.value.trim(),
      backgroundImage: settingsBg.value.trim(),
      copyright: settingsCopyright.value.trim(),
      contactLink: settingsContact.value.trim()
    };
    
    if (settingsPassword.value.trim() !== '') {
      updated.adminPassword = settingsPassword.value.trim();
    }
    
    try {
      submitSettingsBtn.textContent = '저장 중...';
      submitSettingsBtn.disabled = true;
      
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'updateSettings',
          password: verifiedPassword,
          settings: updated
        })
      });
      
      const res = await response.json();
      if (res.status === 'success') {
        alert('설정이 성공적으로 저장되었습니다.');
        
        if (updated.adminPassword) {
          verifiedPassword = updated.adminPassword;
        }
        
        await fetchLinksAndSettings();
        closeAdminModal();
      } else {
        alert(`설정 저장 실패: ${res.message}`);
      }
    } catch (err) {
      console.error(err);
      alert('통신 중 오류가 발생했습니다.');
    } finally {
      submitSettingsBtn.textContent = '설정 저장';
      submitSettingsBtn.disabled = false;
    }
  });

  // D. 배경화면 프리셋 선택 기능
  bgPresetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      bgPresetChips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      
      const bgVal = chip.dataset.bg;
      settingsBg.value = bgVal;
      
      // 파일 업로드 미리보기 초기화
      bgFileUpload.value = '';
      uploadPreview.src = '';
      uploadPreviewContainer.style.display = 'none';
      
      applyBackground(bgVal);
    });
  });

  // 배경화면 입력창 수동 작성 시 실시간 미리보기 연동
  settingsBg.addEventListener('input', (e) => {
    bgPresetChips.forEach(c => c.classList.remove('selected'));
    
    // 만약 Base64가 아닌 일반 URL/그라데이션을 적었을 경우 업로드 썸네일도 숨김
    if (!e.target.value.trim().startsWith('data:image')) {
      uploadPreview.src = '';
      uploadPreviewContainer.style.display = 'none';
    }
    
    applyBackground(e.target.value);
  });

  /* ==========================================================================
     12. 검색 바 및 공통 단축키 리스너
     ========================================================================== */
  let searchTimeout;
  searchBar.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = e.target.value;
      renderLinks();
    }, 150);
  });

  searchBar.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') e.preventDefault();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (infoModal.classList.contains('active')) closeInfoModal();
      if (adminModal.classList.contains('active')) closeAdminModal();
    }
  });

  /* ==========================================================================
     초기 실행
     ========================================================================== */
  fetchLinksAndSettings();
});
