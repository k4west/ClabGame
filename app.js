const INITIAL_SEED_MANWON = 10000; // 1억
const STORAGE_KEY = 'clabgame_state_v5';
const FINAL_RECORDS_KEY = 'clabgame_final_records_v1';
const EVENT_TYPES = [
  '제품 개발',
  '특허 출원',
  '법률 컨설팅',
  'TV 마케팅',
  'CES 전시',
  '인력 채용',
  '사피 채용',
  '특허 무상 양도',
  '회계 컨설팅',
  '외부 투자',
  '코로나',
  '회계 컨설팅',
  'SNS 마케팅',
  '미국 관세',
  '빅딜',
  '사내 단합 게임',
];

let teams = [];
let events = [];
let teamSeq = 1;
let eventSeq = 1;

const teamForm = document.getElementById('team-form');
const teamNameInput = document.getElementById('team-name');
const teamQuoteInput = document.getElementById('team-quote');
const resetAllBtn = document.getElementById('reset-all-btn');
const summaryEl = document.getElementById('summary');
const leaderboardListEl = document.getElementById('leaderboard-list');
const teamEventCardsEl = document.getElementById('team-event-cards');
const eventListEl = document.getElementById('event-list');
const chartCanvas = document.getElementById('fund-chart');

function formatNumber(value) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function formatManwon(value) {
  const abs = formatNumber(Math.abs(value));
  if (value > 0) return `+${abs}만원`;
  if (value < 0) return `-${abs}만원`;
  return '0만원';
}

function formatEok(manwon) {
  const eok = manwon / 10000;
  const text = Number.isInteger(eok) ? String(eok) : eok.toFixed(1).replace(/\.0$/, '');
  return `${text}억`;
}

function getTeamById(teamId) {
  return teams.find((team) => team.id === teamId);
}

function nextRoundForTeam(teamId) {
  const maxRound = events
    .filter((evt) => evt.teamId === teamId)
    .reduce((max, evt) => Math.max(max, evt.round), 0);
  return maxRound + 1;
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      teams,
      events,
      teamSeq,
      eventSeq,
    })
  );
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    teams = Array.isArray(parsed.teams) ? parsed.teams : [];
    events = Array.isArray(parsed.events) ? parsed.events : [];
    teamSeq = Number.isFinite(parsed.teamSeq) ? parsed.teamSeq : 1;
    eventSeq = Number.isFinite(parsed.eventSeq) ? parsed.eventSeq : 1;
  } catch {
    teams = [];
    events = [];
    teamSeq = 1;
    eventSeq = 1;
  }
}

function loadFinalRecordsState() {
  const raw = localStorage.getItem(FINAL_RECORDS_KEY);
  if (!raw) return { seq: 1, records: [] };

  try {
    const parsed = JSON.parse(raw);
    return {
      seq: Number.isFinite(parsed.seq) ? parsed.seq : 1,
      records: Array.isArray(parsed.records) ? parsed.records : [],
    };
  } catch {
    return { seq: 1, records: [] };
  }
}

function saveFinalRecordsState(state) {
  localStorage.setItem(FINAL_RECORDS_KEY, JSON.stringify(state));
}

function addFinalRecord(team, source) {
  const finalState = loadFinalRecordsState();
  finalState.records.push({
    id: finalState.seq,
    teamName: team.name,
    quote: team.quote || '',
    finalBalanceManwon: team.balance,
    source,
    savedAt: Date.now(),
  });
  finalState.seq += 1;
  saveFinalRecordsState(finalState);
}

function recalcBalances() {
  teams.forEach((team) => {
    team.seed = INITIAL_SEED_MANWON;
    team.balance = INITIAL_SEED_MANWON;
    team.roundBalances = [{ round: 0, balance: INITIAL_SEED_MANWON }];
  });

  const sorted = [...events].sort((a, b) => a.createdAt - b.createdAt || a.id - b.id);
  sorted.forEach((evt) => {
    const team = getTeamById(evt.teamId);
    if (!team) return;

    team.balance += evt.deltaManwon;
    team.roundBalances.push({ round: evt.round, balance: team.balance });
    evt.balanceAfterManwon = team.balance;
  });
}

function renderSummary() {
  if (!teams.length) {
    summaryEl.className = 'summary empty';
    summaryEl.textContent = '등록된 팀이 없습니다.';
    return;
  }

  summaryEl.className = 'summary';
  summaryEl.innerHTML = teams
    .map(
      (team) => `
      <article class="summary-card">
        <h3>${team.name}</h3>
        <div class="money">${formatEok(team.balance)}</div>
      </article>
      `
    )
    .join('');
}

function renderLeaderboard() {
  if (!teams.length) {
    leaderboardListEl.innerHTML = '<tr><td colspan="5" class="empty">등록된 팀이 없습니다.</td></tr>';
    return;
  }

  const sorted = [...teams].sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));

  leaderboardListEl.innerHTML = sorted
    .map(
      (team, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${team.name}</td>
        <td>${formatEok(team.balance)}</td>
        <td>${team.quote || '-'}</td>
        <td>
          <div class="action-stack">
            <button type="button" class="mini" data-action="edit-quote" data-team-id="${team.id}">한마디 수정</button>
            <button type="button" class="mini secondary" data-action="save-final" data-team-id="${team.id}">최종으로 기록</button>
          </div>
        </td>
      </tr>
      `
    )
    .join('');
}

function renderTeamEventCards() {
  if (!teams.length) {
    teamEventCardsEl.innerHTML = '<p class="empty">팀을 등록하면 팀별 이벤트 카드가 나타납니다.</p>';
    return;
  }

  const teamOptions = (excludeId) =>
    teams
      .filter((team) => team.id !== excludeId)
      .map((team) => `<option value="${team.id}">${team.name}</option>`)
      .join('');

  teamEventCardsEl.innerHTML = teams
    .map(
      (team) => `
      <form class="team-event-form" data-team-id="${team.id}">
        <h3>${team.name} <span class="round-badge">다음 회차 R${nextRoundForTeam(team.id)}</span></h3>
        <label>
          이벤트 유형
          <select name="type" required>
            ${EVENT_TYPES.map((type) => `<option value="${type}">${type}</option>`).join('')}
          </select>
        </label>

        <label class="amount-wrap">
          금액 (만원)
          <input type="number" name="amount" step="1" placeholder="예: 300, -120" required />
        </label>

        <div class="bigdeal-wrap hidden">
          <label>
            상대팀
            <select name="targetTeamId">
              ${teamOptions(team.id)}
            </select>
          </label>
          <label>
            결과
            <select name="bigDealResult">
              <option value="win">승리 (자금 교환)</option>
              <option value="lose">패배 (변화 없음)</option>
            </select>
          </label>
        </div>

        <label>
          메모
          <input type="text" name="note" maxlength="120" placeholder="메모를 입력하세요" />
        </label>

        <button type="submit">${team.name} 기록 추가</button>
      </form>
      `
    )
    .join('');
}

function renderEvents() {
  if (!events.length) {
    eventListEl.innerHTML = '<tr><td colspan="7" class="empty">기록이 없습니다.</td></tr>';
    return;
  }

  const sorted = [...events].sort((a, b) => a.createdAt - b.createdAt || a.id - b.id);
  eventListEl.innerHTML = sorted
    .map((evt) => {
      const team = getTeamById(evt.teamId);
      const cls = evt.deltaManwon > 0 ? 'plus' : evt.deltaManwon < 0 ? 'minus' : 'neutral';
      return `
      <tr>
        <td>${evt.round}</td>
        <td>${team ? team.name : '-'}</td>
        <td>${evt.type}</td>
        <td class="${cls}">${formatManwon(evt.deltaManwon)}</td>
        <td>${formatEok(evt.balanceAfterManwon || INITIAL_SEED_MANWON)}</td>
        <td>${evt.note || '-'}</td>
        <td>
          <button class="mini" type="button" data-action="edit-event" data-id="${evt.id}">수정</button>
          <button class="mini danger" type="button" data-action="delete-event" data-id="${evt.id}">삭제</button>
        </td>
      </tr>
      `;
    })
    .join('');
}

function uniqueRounds() {
  const rounds = new Set([0]);
  events.forEach((evt) => rounds.add(evt.round));
  return [...rounds].sort((a, b) => a - b);
}

function findBalanceAtRound(team, round) {
  let balance = team.seed;
  team.roundBalances.forEach((point) => {
    if (point.round <= round) balance = point.balance;
  });
  return balance;
}

function drawChart() {
  const ctx = chartCanvas.getContext('2d');
  const width = chartCanvas.width;
  const height = chartCanvas.height;
  const pad = { top: 26, right: 24, bottom: 36, left: 58 };

  ctx.clearRect(0, 0, width, height);

  if (!teams.length) {
    ctx.fillStyle = '#7c7f98';
    ctx.font = '15px sans-serif';
    ctx.fillText('팀을 등록하면 그래프가 표시됩니다.', 24, 42);
    return;
  }

  const rounds = uniqueRounds();
  const points = teams.map((team) => rounds.map((round) => findBalanceAtRound(team, round)));
  const values = points.flat();
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = Math.max(maxVal - minVal, 1);

  const toX = (idx) => pad.left + (idx * (width - pad.left - pad.right)) / Math.max(rounds.length - 1, 1);
  const toY = (val) => pad.top + ((maxVal - val) * (height - pad.top - pad.bottom)) / range;

  ctx.strokeStyle = '#d8d6ef';
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + ((height - pad.top - pad.bottom) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();

    const value = Math.round(maxVal - (range * i) / 4);
    ctx.fillStyle = '#666a86';
    ctx.font = '12px sans-serif';
    ctx.fillText(formatEok(value), 8, y + 4);
  }

  rounds.forEach((round, idx) => {
    const x = toX(idx);
    ctx.fillStyle = '#666a86';
    ctx.font = '12px sans-serif';
    ctx.fillText(`R${round}`, x - 10, height - 12);
  });

  const palette = ['#8f87f1', '#f294b6', '#66c9c1'];

  teams.forEach((team, index) => {
    const lineValues = points[index];
    const color = palette[index % palette.length];

    ctx.beginPath();
    lineValues.forEach((value, idx) => {
      const x = toX(idx);
      const y = toY(value);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    lineValues.forEach((value, idx) => {
      const x = toX(idx);
      const y = toY(value);
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });

    ctx.fillStyle = color;
    ctx.font = '12px sans-serif';
    ctx.fillText(team.name, width - pad.right - 130, pad.top + 16 * (index + 1));
  });
}

function renderAll() {
  recalcBalances();
  renderSummary();
  renderLeaderboard();
  renderTeamEventCards();
  renderEvents();
  drawChart();
  saveState();
}

function addNormalEvent(teamId, payload) {
  events.push({
    id: eventSeq,
    teamId,
    round: nextRoundForTeam(teamId),
    type: payload.type,
    deltaManwon: payload.deltaManwon,
    note: payload.note,
    createdAt: Date.now() + eventSeq / 1000,
  });
  eventSeq += 1;
}

function addBigDealEvent(teamId, targetTeamId, result, note) {
  recalcBalances();
  const team = getTeamById(teamId);
  const target = getTeamById(targetTeamId);
  if (!team || !target) return;

  const teamBalance = team.balance;
  const targetBalance = target.balance;

  if (result === 'win') {
    addNormalEvent(teamId, {
      type: '빅딜',
      deltaManwon: targetBalance - teamBalance,
      note: note || `${target.name}와 자금 교환 (승리)`,
    });
    addNormalEvent(targetTeamId, {
      type: '빅딜(상대 영향)',
      deltaManwon: teamBalance - targetBalance,
      note: note || `${team.name}의 빅딜 승리로 자금 교환`,
    });
    return;
  }

  addNormalEvent(teamId, {
    type: '빅딜',
    deltaManwon: 0,
    note: note || `${target.name} 상대 패배 (변화 없음)`,
  });
}

teamForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = teamNameInput.value.trim();
  const quote = teamQuoteInput.value.trim();

  if (!name) return;
  if (teams.length >= 3) {
    alert('팀은 최대 3개까지 등록할 수 있습니다.');
    return;
  }
  if (teams.some((team) => team.name === name)) {
    alert('이미 존재하는 팀 이름입니다.');
    return;
  }

  teams.push({
    id: teamSeq,
    name,
    quote,
    seed: INITIAL_SEED_MANWON,
    balance: INITIAL_SEED_MANWON,
    roundBalances: [{ round: 0, balance: INITIAL_SEED_MANWON }],
  });
  teamSeq += 1;

  teamForm.reset();
  renderAll();
});

teamEventCardsEl.addEventListener('change', (e) => {
  const target = e.target;
  if (!(target instanceof HTMLSelectElement) || target.name !== 'type') return;

  const form = target.closest('.team-event-form');
  if (!form) return;

  const amountWrap = form.querySelector('.amount-wrap');
  const amountInput = form.querySelector('input[name="amount"]');
  const bigDealWrap = form.querySelector('.bigdeal-wrap');

  const isBigDeal = target.value === '빅딜';
  amountWrap.classList.toggle('hidden', isBigDeal);
  bigDealWrap.classList.toggle('hidden', !isBigDeal);

  if (isBigDeal) {
    amountInput.required = false;
    amountInput.disabled = true;
    amountInput.value = '';
  } else {
    amountInput.required = true;
    amountInput.disabled = false;
  }
});

teamEventCardsEl.addEventListener('submit', (e) => {
  if (!(e.target instanceof HTMLFormElement)) return;
  e.preventDefault();

  const form = e.target;
  const teamId = Number(form.dataset.teamId);
  const type = form.elements.type.value;
  const note = form.elements.note.value.trim();

  if (type === '빅딜') {
    const targetTeamId = Number(form.elements.targetTeamId.value);
    const result = form.elements.bigDealResult.value;

    if (!targetTeamId || targetTeamId === teamId) {
      alert('빅딜 상대팀을 선택해주세요.');
      return;
    }

    addBigDealEvent(teamId, targetTeamId, result, note);
    form.reset();
    renderAll();
    return;
  }

  const deltaManwon = Number(form.elements.amount.value);
  if (!Number.isFinite(deltaManwon) || deltaManwon === 0) {
    alert('금액은 0이 아닌 숫자로 입력해주세요.');
    return;
  }

  addNormalEvent(teamId, {
    type,
    deltaManwon,
    note,
  });

  form.reset();
  renderAll();
});

leaderboardListEl.addEventListener('click', (e) => {
  const target = e.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const action = target.dataset.action;
  const teamId = Number(target.dataset.teamId);
  const team = getTeamById(teamId);
  if (!team) return;

  if (action === 'edit-quote') {
    const nextQuote = prompt('팀 한마디를 수정하세요.', team.quote || '');
    if (nextQuote === null) return;

    team.quote = nextQuote.trim();
    renderAll();
    return;
  }

  if (action === 'save-final') {
    recalcBalances();
    addFinalRecord(team, '현황판 버튼');
    alert(`${team.name}의 현재 금액을 최종 기록으로 저장했습니다.`);
  }
});

eventListEl.addEventListener('click', (e) => {
  const target = e.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const action = target.dataset.action;
  const id = Number(target.dataset.id);
  const evt = events.find((item) => item.id === id);
  if (!evt) return;

  if (action === 'delete-event') {
    events = events.filter((item) => item.id !== id);
    renderAll();
    return;
  }

  if (action === 'edit-event') {
    const nextType = prompt('이벤트 유형을 입력하세요.', evt.type);
    if (nextType === null) return;

    const nextAmountRaw = prompt('증감 금액(만원)을 입력하세요.', String(evt.deltaManwon));
    if (nextAmountRaw === null) return;
    const nextAmount = Number(nextAmountRaw);
    if (!Number.isFinite(nextAmount)) {
      alert('금액은 숫자여야 합니다.');
      return;
    }

    const nextNote = prompt('메모를 입력하세요.', evt.note || '');
    if (nextNote === null) return;

    evt.type = nextType.trim() || evt.type;
    evt.deltaManwon = nextAmount;
    evt.note = nextNote.trim();
    renderAll();
  }
});

resetAllBtn.addEventListener('click', () => {
  const ok = confirm('모든 팀/이벤트 데이터를 삭제할까요? (최종 기록은 삭제되지 않습니다)');
  if (!ok) return;

  teams = [];
  events = [];
  teamSeq = 1;
  eventSeq = 1;
  localStorage.removeItem(STORAGE_KEY);
  renderAll();
});

loadState();
renderAll();
