// content.js

const SCAN_INTERVAL = 200;
let blockedIds = new Set();
let blockProjectEnabled = false;
let blockQnAEnabled = false;

// 초기 로딩: 저장된 차단 ID와 토글 상태 로드
chrome.storage.local.get(
  { blockedIds: [], blockProject: false, blockQnA: false },
  ({ blockedIds: ids, blockProject, blockQnA }) => {
    blockedIds = new Set(ids);
    blockProjectEnabled = blockProject;
    blockQnAEnabled = blockQnA;
    injectBlockButtons();
    scanAndMask();
  }
);

// 저장소 변경 시 반영
chrome.storage.onChanged.addListener(changes => {
  if (changes.blockedIds) {
    blockedIds = new Set(changes.blockedIds.newValue || []);
  }
  if (changes.blockProject) {
    blockProjectEnabled = changes.blockProject.newValue;
  }
  if (changes.blockQnA) {
    blockQnAEnabled = changes.blockQnA.newValue;
  }
  scanAndMask();
});

// 주기적 검사 및 버튼 주입
setInterval(() => {
  injectBlockButtons();
  scanAndMask();
}, SCAN_INTERVAL);

// 프로필 URL 정규식
const PROFILE_RE = /\/profile\/([a-f0-9]{24})(?=[\/?]|$)/i;

/** '차단하기' 메뉴 버튼 주입 */
function injectBlockButtons() {
  document.querySelectorAll('div.css-1v3ka1a.e1wvddxk0').forEach(menu => {
    if (menu.dataset._blockInjected) return;
    const ul = menu.querySelector('ul');
    if (!ul) return;

    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = '차단하기';
    a.addEventListener('click', e => {
      e.preventDefault();
      // 메뉴 위치부터 프로필 컨테이너 탐색
      let container = menu;
      while (container && !container.querySelector('a[href*="/profile/"]')) {
        container = container.parentElement;
      }
      if (!container) return;
      const link = container.querySelector('a[href*="/profile/"]');
      if (!link) return;
      const match = link.href.match(PROFILE_RE);
      if (!match) return;
      const id = match[1];

      chrome.storage.local.get({ blockedIds: [] }, ({ blockedIds: arr }) => {
        if (!arr.includes(id)) {
          arr.push(id);
          chrome.storage.local.set({ blockedIds: arr }, () => {
            blockedIds.add(id);
            scanAndMask();
          });
        }
      });
    });

    li.appendChild(a);
    ul.appendChild(li);
    menu.dataset._blockInjected = '1';
  });
}

/** 요소 블러 처리 및 오버레이 삽입 */
function blockElement(el) {
  if (el.dataset._peub_masked) return;
  el.dataset._peub_masked = '1';
  el.style.position = 'relative';
  el.style.pointerEvents = 'none';
  Array.from(el.children).forEach(child => {
    child.style.filter = 'blur(4px)';
    child.style.userSelect = 'none';
  });
  const overlay = document.createElement('div');
  overlay.textContent = '차단된 유저입니다';
  overlay.style.cssText = `
    position:absolute; inset:0;
    display:flex; align-items:center; justify-content:center;
    color:#000; font-weight:bold; font-size:1rem;
    pointer-events:none; z-index:9999;
  `;
  el.appendChild(overlay);
}

/** 차단 로직: 모든 프로필 링크마다 개별 처리 */
function scanAndMask() {
  const processed = new Set();
  document.querySelectorAll('a[href*="/profile/"]').forEach(anchor => {
    const match = anchor.href.match(PROFILE_RE);
    if (!match) return;
    const id = match[1];
    if (!blockedIds.has(id)) return;

    // 컨테이너 탐색: 목록(li), 기사(article), Q&A 헤더, 일반 div
    let container = anchor.closest('li, article');
    if (!container) container = anchor.closest('div.css-erz86d.ejdryld6');
    if (!container) container = anchor.closest('div');
    if (!container || processed.has(container)) return;
    processed.add(container);

    // 프로젝트 및 기타 섹션 블러 처리
    const projectWrapper = anchor.closest('div[data-testid="wrapper"]')
      || anchor.closest('div.css-16ignzz.e1kv7pg34');
    if (projectWrapper) {
      if (blockProjectEnabled) {
        blockElement(projectWrapper);
      }
      return;
    }

    // Q&A 섹션 블러 처리
    if (container.matches('div.css-erz86d.ejdryld6')) {
      if (blockQnAEnabled) {
        blockElement(container);
        const content = container.nextElementSibling;
        if (content && content.querySelector('.se-viewer')) {
          blockElement(content);
        }
      }
      return;
    }

    // 기본 피드/댓글 등 블러 처리
    blockElement(container);
  });
}
