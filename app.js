// 🚀 링크 모음 웹앱 Core JavaScript 로직

document.addEventListener('DOMContentLoaded', () => {
  // DOM 요소 선택
  const themeToggle = document.getElementById('theme-toggle');
  const sunIcon = themeToggle.querySelector('.sun-icon');
  const moonIcon = themeToggle.querySelector('.moon-icon');
  
  const searchBar = document.getElementById('search-bar');
  const categoryContainer = document.getElementById('category-container');
  const linksGrid = document.getElementById('links-grid');
  const statusArea = document.getElementById('status-area');
  
  // 모달 요소 선택
  const infoModal = document.getElementById('info-modal');
  const modalClose = document.getElementById('modal-close');
  const modalFavicon = document.getElementById('modal-favicon');
  const modalTitle = document.getElementById('modal-title');
  const modalCategory = document.getElementById('modal-category');
  const modalDescription = document.getElementById('modal-description');
  const modalLink = document.getElementById('modal-link');

  // 상태 관리 변수
  let allLinks = [];
  let currentCategory = 'all';
  let searchQuery = '';

  /* ==========================================================================
     1. 테마(다크/라이트 모드) 설정 및 관리
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

  /* ==========================================================================
     2. 데이터 로딩 및 화면 렌더링
     ========================================================================== */
  async function fetchLinks() {
    // 1. GAS URL 구성 상태 확인
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
      showStatus('구글 시트에서 데이터를 불러오고 있습니다...', true);
      
      const response = await fetch(gasUrl);
      if (!response.ok) {
        throw new Error(`HTTP 에러! 상태코드: ${response.status}`);
      }
      
      const json = await response.json();
      
      if (json.status === 'error') {
        throw new Error(json.message || '데이터를 읽어오는 도중 GAS 내부 에러가 발생했습니다.');
      }
      
      allLinks = json.data || [];
      
      if (allLinks.length === 0) {
        showStatus('등록된 웹 링크가 없습니다.<br>구글 시트에 데이터를 입력해 주세요.', false);
        return;
      }
      
      // 상태창 숨기기 및 데이터 렌더링
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
            - 스프레드시트 공유 권한 혹은 시트 구조를 확인해 주세요.
          </span>
        </p>
      `, false);
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
    // 중복 제거된 카테고리 추출
    const categories = ['all', ...new Set(allLinks.map(item => item.category))];
    
    // 기존 태그 초기화 (첫 번째 '전체' 버튼만 제외하고 삭제)
    categoryContainer.innerHTML = '<button class="category-tag active" data-category="all">전체</button>';
    
    categories.forEach(cat => {
      if (cat === 'all') return;
      
      const btn = document.createElement('button');
      btn.className = 'category-tag';
      btn.dataset.category = cat;
      btn.textContent = cat;
      
      categoryContainer.appendChild(btn);
    });

    // 카테고리 칩 클릭 이벤트 위임
    categoryContainer.addEventListener('click', (e) => {
      const target = e.target.closest('.category-tag');
      if (!target) return;
      
      // 활성화 클래스 교체
      categoryContainer.querySelectorAll('.category-tag').forEach(btn => {
        btn.classList.remove('active');
      });
      target.classList.add('active');
      
      currentCategory = target.dataset.category;
      renderLinks();
    });
  }

  /* ==========================================================================
     4. 파비콘 가져오기 및 에러 핸들링
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

  /* ==========================================================================
     5. 링크 카드 렌더링 및 모달 연결
     ========================================================================== */
  function renderLinks() {
    linksGrid.innerHTML = '';
    
    const filtered = allLinks.filter(item => {
      // 1. 카테고리 필터링
      const matchesCategory = currentCategory === 'all' || item.category === currentCategory;
      
      // 2. 검색어 필터링
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
      // 검색 결과 없을 때 표시
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
      
      // 파비콘 처리
      const faviconUrl = getFaviconUrl(item.url);
      let faviconHTML = '';
      
      if (faviconUrl) {
        faviconHTML = `
          <div class="favicon-container">
            <img src="${faviconUrl}" alt="${item.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="favicon-fallback" style="display: none;">${getFallbackLetter(item.title)}</div>
          </div>
        `;
      } else {
        faviconHTML = `
          <div class="favicon-container">
            <div class="favicon-fallback">${getFallbackLetter(item.title)}</div>
          </div>
        `;
      }
      
      card.innerHTML = `
        <button class="info-btn" title="설명 보기">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </button>
        ${faviconHTML}
        <div class="link-title" title="${item.title}">${item.title}</div>
        <span class="link-category-badge">${item.category}</span>
      `;
      
      // 모달(i) 버튼 클릭 시, 링크 이동 방지하고 설명 모달 열기
      const infoBtn = card.querySelector('.info-btn');
      infoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openModal(item);
      });
      
      linksGrid.appendChild(card);
    });
  }

  /* ==========================================================================
     6. 설명 모달 제어
     ========================================================================== */
  function openModal(item) {
    modalTitle.textContent = item.title;
    modalCategory.textContent = item.category;
    modalDescription.textContent = item.description || '이 링크에 대한 추가 설명이 등록되어 있지 않습니다.';
    modalLink.href = item.url;
    
    // 모달 파비콘 설정 및 에러 폴백
    const faviconUrl = getFaviconUrl(item.url);
    if (faviconUrl) {
      modalFavicon.style.display = 'block';
      modalFavicon.src = faviconUrl;
      // 이전의 폴백 폰트 컴포넌트가 있다면 제거
      const prevFallback = modalFavicon.parentNode.querySelector('.favicon-fallback');
      if (prevFallback) prevFallback.remove();
      
      modalFavicon.onerror = function() {
        this.style.display = 'none';
        let fallback = this.parentNode.querySelector('.favicon-fallback');
        if (!fallback) {
          fallback = document.createElement('div');
          fallback.className = 'favicon-fallback';
          fallback.textContent = getFallbackLetter(item.title);
          this.parentNode.appendChild(fallback);
        }
        fallback.style.display = 'flex';
      };
    } else {
      modalFavicon.style.display = 'none';
      let fallback = modalFavicon.parentNode.querySelector('.favicon-fallback');
      if (!fallback) {
        fallback = document.createElement('div');
        fallback.className = 'favicon-fallback';
        fallback.textContent = getFallbackLetter(item.title);
        modalFavicon.parentNode.appendChild(fallback);
      }
      fallback.style.display = 'flex';
    }
    
    infoModal.classList.add('active');
  }

  function closeModal() {
    infoModal.classList.remove('active');
  }

  modalClose.addEventListener('click', closeModal);
  infoModal.addEventListener('click', (e) => {
    if (e.target === infoModal) {
      closeModal();
    }
  });

  // ESC 키로 모달 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && infoModal.classList.contains('active')) {
      closeModal();
    }
  });

  /* ==========================================================================
     7. 검색 바 입력 핸들러 (디바운스 미세 적용)
     ========================================================================== */
  let searchTimeout;
  searchBar.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = e.target.value;
      renderLinks();
    }, 150);
  });

  // 검색창 엔터 방지 (폼이 제출되는 것을 예방)
  searchBar.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  });

  /* ==========================================================================
     초기 실행
     ========================================================================== */
  fetchLinks();
});
