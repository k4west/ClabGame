const teams = [];
let events = [];

const teamForm = document.getElementById('team-form');
const eventForm = document.getElementById('event-form');
const teamNameInput = document.getElementById('team-name');
const seedInput = document.getElementById('seed-money');
const eventTeamSelect = document.getElementById('event-team');
const roundInput = document.getElementById('event-round');
const typeInput = document.getElementById('event-type');
const amountInput = document.getElementById('event-amount');
const noteInput = document.getElementById('event-note');
const summaryEl = document.getElementById('summary');
const eventListEl = document.getElementById('event-list');
const chartCanvas = document.getElementById('fund-chart');

const typeMap = {
  investment: { label: '투자금', sign: 1 },
  revenue: { label: '수익', sign: 1 },
  expense: { label: '비용', sign: -1 },
};

function formatMoney(value) {
  return `${new Intl.NumberFormat('ko-KR').format(value)}만원`;
}

function getTeam(name) {
  return teams.find((t) => t.name === name);
}

function recalcBalances() {
  teams.forEach((team) => {
    team.balance = team.seed;
    team.roundBalances = [{ round: 0, balance: team.seed }];
  });

  const sortedEvents = [...events].sort((a, b) => a.round - b.round || a.createdAt - b.createdAt);
  sortedEvents.forEach((evt) => {
    const team = getTeam(evt.team);
    if (!team) return;
    team.balance += evt.delta;
    team.roundBalances.push({ round: evt.round, balance: team.balance });
    evt.balanceAfter = team.balance;
  });

  events = sortedEvents;
}

function refreshTeamOptions() {
  eventTeamSelect.innerHTML = teams.length
    ? teams.map((team) => `<option value="${team.name}">${team.name}</option>`).join('')
    : '<option value="">팀을 먼저 등록하세요</option>';
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
        <div>초기 Seed: ${formatMoney(team.seed)}</div>
        <div class="money">현재: ${formatMoney(team.balance)}</div>
      </article>`
    )
    .join('');
}

function renderEvents() {
  if (!events.length) {
    eventListEl.innerHTML = '<tr><td colspan="6" class="empty">기록이 없습니다.</td></tr>';
    return;
  }

  eventListEl.innerHTML = events
    .map((evt) => {
      const cls = evt.delta >= 0 ? 'plus' : 'minus';
      const sign = evt.delta >= 0 ? '+' : '-';
      return `
      <tr>
        <td>${evt.round}</td>
        <td>${evt.team}</td>
        <td>${typeMap[evt.type].label}</td>
        <td class="${cls}">${sign}${formatMoney(Math.abs(evt.delta))}</td>
        <td>${formatMoney(evt.balanceAfter)}</td>
        <td>${evt.note || '-'}</td>
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
  const toY = (val) => pad.top + (maxVal - val) * (height - pad.top - pad.bottom) / range;

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
    ctx.fillText(new Intl.NumberFormat('ko-KR').format(value), 8, y + 4);
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

  const palette = ['#2563eb', '#e11d48', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];

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
  refreshTeamOptions();
  renderSummary();
  renderEvents();
  drawChart();
}

teamForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = teamNameInput.value.trim();
  const seed = Number(seedInput.value);

  if (!name) return;
  if (teams.some((team) => team.name === name)) {
    alert('이미 존재하는 팀 이름입니다.');
    return;
  }

  teams.push({
    name,
    seed,
    balance: seed,
    roundBalances: [{ round: 0, balance: seed }],
  });

  teamForm.reset();
  seedInput.value = '1000';
  renderAll();
});

eventForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!teams.length) {
    alert('먼저 팀을 등록해주세요.');
    return;
  }

  const team = eventTeamSelect.value;
  const round = Number(roundInput.value);
  const type = typeInput.value;
  const amount = Number(amountInput.value);
  const note = noteInput.value.trim();

  if (!team || !round || !amount) return;

  const delta = amount * typeMap[type].sign;
  events.push({
    team,
    round,
    type,
    delta,
    note,
    createdAt: Date.now() + Math.random(),
  });

  eventForm.reset();
  roundInput.value = String(Math.max(1, round));
  amountInput.value = '100';
  renderAll();
});

renderAll();
