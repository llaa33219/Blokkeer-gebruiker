// popup.js

const urlInput = document.getElementById('urlInput');
const addBtn = document.getElementById('addBtn');
const listEl = document.getElementById('list');
const projectToggle = document.getElementById('projectToggle');
const qnaToggle = document.getElementById('qnaToggle');

// 초기 렌더링: 저장된 프로필 목록과 토글 상태 로드
init();

// 이벤트 리스너
addBtn.addEventListener('click', addProfile);
urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') addProfile(); });
projectToggle.addEventListener('change', () => {
  chrome.storage.local.set({ blockProject: projectToggle.checked });
});
qnaToggle.addEventListener('change', () => {
  chrome.storage.local.set({ blockQnA: qnaToggle.checked });
});

/** 초기 렌더링 함수 */
function init() {
  chrome.storage.local.get(
    { blockedIds: [], blockProject: false, blockQnA: false },
    ({ blockedIds, blockProject, blockQnA }) => {
      // 토글 상태 설정
      projectToggle.checked = blockProject;
      qnaToggle.checked = blockQnA;
      // 차단 ID 목록 표시
      blockedIds.forEach(addListItem);
    }
  );
}

/** 프로필 URL에서 ID 추출 후 리스트에 추가 */
function addProfile() {
  const url = urlInput.value.trim();
  const match = url.match(/\/profile\/([a-f0-9]{24})/i);
  if (!match) {
    alert('올바른 프로필 URL이 아닙니다.');
    return;
  }

  const id = match[1];
  chrome.storage.local.get({ blockedIds: [] }, ({ blockedIds }) => {
    if (blockedIds.includes(id)) {
      urlInput.value = '';
      return;
    }
    blockedIds.push(id);
    chrome.storage.local.set({ blockedIds }, () => {
      addListItem(id);
      urlInput.value = '';
    });
  });
}

/** 차단 목록 항목 생성 */
function addListItem(id) {
  const li = document.createElement('li');
  const span = document.createElement('span');
  span.textContent = id;
  span.style.cursor = 'pointer';
  span.title = '프로필 보기';
  span.addEventListener('click', () => {
    chrome.tabs.create({ url: `https://playentry.org/profile/${id}` });
  });

  const del = document.createElement('button');
  del.textContent = '해제';
  del.addEventListener('click', () => removeProfile(id, li));

  li.append(span, del);
  listEl.appendChild(li);
}

/** 차단 해제 및 리스트에서 제거 */
function removeProfile(id, li) {
  chrome.storage.local.get({ blockedIds: [] }, ({ blockedIds }) => {
    const next = blockedIds.filter(x => x !== id);
    chrome.storage.local.set({ blockedIds: next }, () => {
      li.remove();
    });
  });
}
