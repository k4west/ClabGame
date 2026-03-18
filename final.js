const STORAGE_KEY = 'clabgame_state_v5';
const INITIAL_SEED_MANWON = 10000;

const finalTeamListEl = document.getElementById('final-team-list');
const finalLeaderboardListEl = document.getElementById('final-leaderboard-list');
const chartCanvas = document.getElementById('final-bar-chart');

function formatNumber(value) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function formatEok(manwon) {
  const eok = manwon / 10000;
  const text = Number.isInteger(eok) ? String(eok) : eok.toFixed(1).replace(/\.0$/, '');
  return `${text}억`;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { teams: [], events: [] };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      teams: Array.isArray(parsed.teams) ? parsed.teams : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return { teams: [], events: [] };
  }
}

function recalcFinalBalances(teams, events) {
  const teamMap = new Map();
  teams.forEach((team) => {
    teamMap.set(team.id, {
      id: team.id,
      name: team.name,
      quote: team.quote || '',
      balance: INITIAL_SEED_MANWON,
    });
  });

  const sortedEvents = [...events].sort((a, b) => a.createdAt - b.createdAt || a.id - b.id);
  sortedEvents.forEach((evt) => {
    const team = teamMap.get(evt.teamId);
    if (!team) return;
    team.balance += Number(evt.deltaManwon) || 0;
  });

  return [...teamMap.values()];
}

function renderFinalTable(finalTeams) {
  if (!finalTeams.length) {
    finalTeamListEl.innerHTML = '<tr><td colspan="3" class="empty">기록된 팀 데이터가 없습니다.</td></tr>';
    return;
  }

  finalTeamListEl.innerHTML = finalTeams
    .map(
      (team) => `
      <tr>
        <td>${team.name}</td>
        <td>${team.quote || '-'}</td>
        <td>${formatEok(team.balance)} <span class="sub-money">(${formatNumber(team.balance)}만원)</span></td>
      </tr>
      `
    )
    .join('');
}

function renderLeaderboard(finalTeams) {
  if (!finalTeams.length) {
    finalLeaderboardListEl.innerHTML = '<tr><td colspan="4" class="empty">기록된 팀 데이터가 없습니다.</td></tr>';
    return;
  }

  const sorted = [...finalTeams].sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));
  finalLeaderboardListEl.innerHTML = sorted
    .map(
      (team, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${team.name}</td>
        <td>${formatEok(team.balance)} <span class="sub-money">(${formatNumber(team.balance)}만원)</span></td>
        <td>${team.quote || '-'}</td>
      </tr>
      `
    )
    .join('');
}

function drawBarChart(finalTeams) {
  const ctx = chartCanvas.getContext('2d');
  const width = chartCanvas.width;
  const height = chartCanvas.height;
  const pad = { top: 32, right: 24, bottom: 54, left: 70 };

  ctx.clearRect(0, 0, width, height);

  if (!finalTeams.length) {
    ctx.fillStyle = '#7c7f98';
    ctx.font = '15px sans-serif';
    ctx.fillText('기록된 팀 데이터가 없습니다.', 24, 44);
    return;
  }

  const balances = finalTeams.map((team) => team.balance);
  const maxVal = Math.max(...balances, INITIAL_SEED_MANWON);
  const minVal = Math.min(...balances, 0);
  const range = Math.max(maxVal - minVal, 1);

  const chartHeight = height - pad.top - pad.bottom;
  const chartWidth = width - pad.left - pad.right;
  const zeroY = pad.top + ((maxVal - 0) * chartHeight) / range;
  const barGap = 24;
  const barWidth = Math.max((chartWidth - barGap * (finalTeams.length + 1)) / finalTeams.length, 30);

  ctx.strokeStyle = '#d8d6ef';
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + (chartHeight * i) / 4;
    const value = Math.round(maxVal - ((maxVal - minVal) * i) / 4);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillStyle = '#666a86';
    ctx.font = '12px sans-serif';
    ctx.fillText(formatEok(value), 10, y + 4);
  }

  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(width - pad.right, zeroY);
  ctx.strokeStyle = '#a9a5ce';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  const palette = ['#8f87f1', '#f294b6', '#66c9c1', '#f7b267', '#8ec5ff'];

  finalTeams.forEach((team, idx) => {
    const x = pad.left + barGap + idx * (barWidth + barGap);
    const y = pad.top + ((maxVal - team.balance) * chartHeight) / range;
    const barTop = Math.min(y, zeroY);
    const barHeight = Math.max(Math.abs(zeroY - y), 1);

    ctx.fillStyle = palette[idx % palette.length];
    ctx.fillRect(x, barTop, barWidth, barHeight);

    ctx.fillStyle = '#4b4f71';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(team.name, x + barWidth / 2, height - 24);
    ctx.fillText(formatEok(team.balance), x + barWidth / 2, barTop - 8);
  });

  ctx.textAlign = 'left';
}

function init() {
  const { teams, events } = loadState();
  const finalTeams = recalcFinalBalances(teams, events);
  renderFinalTable(finalTeams);
  renderLeaderboard(finalTeams);
  drawBarChart(finalTeams);
}

init();
