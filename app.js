const INITIAL_SEED = 10000; // 만원 단위 (1억)
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
];

const teams = [];
let events = [];
let eventSeq = 1;

const teamForm = document.getElementById('team-form');
const eventForm = document.getElementById('event-form');
const teamNameInput = document.getElementById('team-name');
const typeInput = document.getElementById('event-type');
const noteInput = document.getElementById('event-note');
const teamAmountsEl = document.getElementById('team-amounts');
const summaryEl = document.getElementById('summary');
const eventListEl = document.getElementById('event-list');
const chartCanvas = document.getElementById('fund-chart');

function formatMoney(value) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function getTeam(name) {
  return teams.find((t) => t.name === name);
}

function nextRoundForTeam(teamName) {
  const maxRound = events
    .filter((evt) => evt.team === teamName)
    .reduce((max, evt) => Math.max(max, evt.round), 0);
  return maxRound + 1;
}

function recalcBalances() {
  teams.forEach((team) => {
    team.balance = team.seed;
    team.roundBalances = [{ round: 0, balance: team.seed }];
  });

  const sortedForCalc = [...events].sort(
    (a, b) => a.team.localeCompare(b.team) || a.round - b.round || a.createdAt - b.createdAt
  );

  sortedForCalc.forEach((evt) => {
    const team = getTeam(evt.team);
    if (!team) return;
    team.balance += evt.delta;
    team.roundBalances.push({ round: evt.round, balance: team.balance });
    evt.balanceAfter = team.balance;
  });
}

function renderTypeOptions() {
  typeInput.innerHTML = EVENT_TYPES.map((type) => `<option value="${type}">${type}</option>`).join('');
}

function renderTeamAmountInputs() {
  if (!teams.length) {
    teamAmountsEl.innerHTML = '<p class="empty">팀을 등록하면 팀별 금액 입력칸이 나타납니다. (만원 단위, 음수 입력 가능)</p>';
    return;
  }

  teamAmountsEl.innerHTML = teams
    .map(
      (team) => `
      <label>
        ${team.name} 금액 (만원)
        <input type="number" step="1" name="team-amount" data-team="${team.name}" value="0" />
      </label>`
    )
    .join('');
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
        <div>초기 Seed: ${formatMoney(team.seed)}만원</div>
        <div class="money">현재: ${formatMoney(team.balance)}만원</div>
      </article>`
    )
    .join('');
}

function renderEvents() {
  if (!events.length) {
    eventListEl.innerHTML = '<tr><td colspan="7" class="empty">기록이 없습니다.</td></tr>';
    return;
  }

  const displayEvents = [...events].sort((a, b) => a.createdAt - b.createdAt);

  eventListEl.innerHTML = displayEvents
    .map((evt) => {
      const cls = evt.delta >= 0 ? 'plus' : 'minus';
      const value = evt.delta >= 0 ? `+${formatMoney(evt.delta)}` : formatMoney(evt.delta);
      return `
      <tr>
        <td>${evt.round}</td>
        <td>${evt.team}</td>
        <td>${evt.type}</td>
        <td class="${cls}">${value}</td>
        <td>${formatMoney(evt.balanceAfter)}</td>
        <td>${evt.note || '-'}</td>
        <td>
          <button class="mini" type="button" data-action="edit" data-id="${evt.id}">수정</button>
          <button class="mini danger" type="button" data-action="delete" data-id="${evt.id}">삭제</button>
        </td>
      </tr>`;
    })
    .join('');
}

function uniqueRounds() {
  const rounds = new Set([0]);
  events.forEach((evt) => rounds.add(evt.round));
  return [...rounds].sort((a, b) => a - b);
}

function findBalanceAtRound(team, round) {
  let value = team.seed;
  team.roundBalances.forEach((item) => {
    if (item.round <= round) value = item.balance;
  });
  return value;
}

function drawChart() {
  const ctx = chartCanvas.getContext('2d');
  const width = chartCanvas.width;
  const height = chartCanvas.height;
  const pad = { top: 28, right: 24, bottom: 34, left: 56 };

  ctx.clearRect(0, 0, width, height);

  if (!teams.length) {
    ctx.fillStyle = '#64748b';
    ctx.font = '15px sans-serif';
    ctx.fillText('팀을 등록하면 그래프가 표시됩니다.', 24, 44);
    return;
  }

  const rounds = uniqueRounds();
  const points = teams.map((team) => rounds.map((r) => findBalanceAtRound(team, r)));
  const allValues = points.flat();
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = Math.max(maxVal - minVal, 1);

  const toX = (idx) => pad.left + (idx * (width - pad.left - pad.right)) / Math.max(rounds.length - 1, 1);
  const toY = (val) => pad.top + ((maxVal - val) * (height - pad.top - pad.bottom)) / range;

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + ((height - pad.top - pad.bottom) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();

    const value = Math.round(maxVal - (range * i) / 4);
    ctx.fillStyle = '#475569';
    ctx.font = '12px sans-serif';
    ctx.fillText(formatMoney(value), 8, y + 4);
  }

  rounds.forEach((round, idx) => {
    const x = toX(idx);
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, height - pad.bottom);
    ctx.strokeStyle = '#eef2ff';
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = '12px sans-serif';
    ctx.fillText(`R${round}`, x - 10, height - 12);
  });

  const palette = ['#2563eb', '#e11d48', '#16a34a'];

  teams.forEach((team, teamIdx) => {
    const values = points[teamIdx];
    const color = palette[teamIdx % palette.length];

    ctx.beginPath();
    values.forEach((val, idx) => {
      const x = toX(idx);
      const y = toY(val);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    values.forEach((val, idx) => {
      const x = toX(idx);
      const y = toY(val);
      ctx.beginPath();
      ctx.arc(x, y, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });

    ctx.fillStyle = color;
    ctx.font = '12px sans-serif';
    ctx.fillText(team.name, width - pad.right - 110, pad.top + 16 * (teamIdx + 1));
  });
}

function renderAll() {
  recalcBalances();
  renderTeamAmountInputs();
  renderSummary();
  renderEvents();
  drawChart();
}

teamForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = teamNameInput.value.trim();

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
    name,
    seed: INITIAL_SEED,
    balance: INITIAL_SEED,
    roundBalances: [{ round: 0, balance: INITIAL_SEED }],
  });

  teamForm.reset();
  renderAll();
});

eventForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!teams.length) {
    alert('먼저 팀을 등록해주세요.');
    return;
  }

  const type = typeInput.value;
  const note = noteInput.value.trim();
  const amountInputs = eventForm.querySelectorAll('input[name="team-amount"]');

  let addedCount = 0;
  amountInputs.forEach((input) => {
    const delta = Number(input.value);
    if (!delta) return;

    const team = input.dataset.team;
    events.push({
      id: eventSeq,
      team,
      round: nextRoundForTeam(team),
      type,
      delta,
      note,
      createdAt: Date.now() + eventSeq / 1000,
    });
    eventSeq += 1;
    addedCount += 1;
  });

  if (!addedCount) {
    alert('적어도 한 팀에는 0이 아닌 금액을 입력해주세요.');
    return;
  }

  eventForm.reset();
  renderTypeOptions();
  renderAll();
});

eventListEl.addEventListener('click', (e) => {
  const target = e.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const id = Number(target.dataset.id);
  const action = target.dataset.action;
  const evt = events.find((item) => item.id === id);
  if (!evt) return;

  if (action === 'delete') {
    events = events.filter((item) => item.id !== id);
    renderAll();
    return;
  }

  if (action === 'edit') {
    const nextType = prompt('이벤트 유형을 입력하세요.', evt.type);
    if (nextType === null) return;

    const nextAmountRaw = prompt('금액(만원, 음수 가능)을 입력하세요.', String(evt.delta));
    if (nextAmountRaw === null) return;
    const nextAmount = Number(nextAmountRaw);
    if (!Number.isFinite(nextAmount) || nextAmount === 0) {
      alert('금액은 0이 아닌 숫자여야 합니다.');
      return;
    }

    const nextNote = prompt('메모를 입력하세요.', evt.note || '');
    if (nextNote === null) return;

    evt.type = nextType.trim() || evt.type;
    evt.delta = nextAmount;
    evt.note = nextNote.trim();
    renderAll();
  }
});

renderTypeOptions();
renderAll();
