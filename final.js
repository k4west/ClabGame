const FINAL_RECORDS_KEY = 'clabgame_final_records_v1';

const directFinalForm = document.getElementById('direct-final-form');
const directTeamNameInput = document.getElementById('direct-team-name');
const directTeamQuoteInput = document.getElementById('direct-team-quote');
const directTeamBalanceEokInput = document.getElementById('direct-team-balance-eok');
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

function formatDate(ts) {
  return new Date(ts).toLocaleString('ko-KR');
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

function getLatestRecordByTeam(records) {
  const latestMap = new Map();

  records.forEach((record) => {
    const prev = latestMap.get(record.teamName);
    if (!prev || record.savedAt > prev.savedAt) {
      latestMap.set(record.teamName, record);
    }
  });

  return [...latestMap.values()];
}

function renderFinalTable(records) {
  if (!records.length) {
    finalTeamListEl.innerHTML = '<tr><td colspan="5" class="empty">기록된 최종 데이터가 없습니다.</td></tr>';
    return;
  }

  const sorted = [...records].sort((a, b) => b.savedAt - a.savedAt || b.id - a.id);
  finalTeamListEl.innerHTML = sorted
    .map(
      (record) => `
      <tr>
        <td>${record.teamName}</td>
        <td>${record.quote || '-'}</td>
        <td>${formatEok(record.finalBalanceManwon)} <span class="sub-money">(${formatNumber(record.finalBalanceManwon)}만원)</span></td>
        <td>${record.source}</td>
        <td>${formatDate(record.savedAt)}</td>
      </tr>
      `
    )
    .join('');
}

function renderLeaderboard(latestRecords) {
  if (!latestRecords.length) {
    finalLeaderboardListEl.innerHTML = '<tr><td colspan="4" class="empty">기록된 최종 데이터가 없습니다.</td></tr>';
    return;
  }

  const sorted = [...latestRecords].sort(
    (a, b) => b.finalBalanceManwon - a.finalBalanceManwon || a.teamName.localeCompare(b.teamName)
  );

  finalLeaderboardListEl.innerHTML = sorted
    .map(
      (record, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${record.teamName}</td>
        <td>${formatEok(record.finalBalanceManwon)} <span class="sub-money">(${formatNumber(record.finalBalanceManwon)}만원)</span></td>
        <td>${record.quote || '-'}</td>
      </tr>
      `
    )
    .join('');
}

function drawBarChart(latestRecords) {
  const ctx = chartCanvas.getContext('2d');
  const width = chartCanvas.width;
  const height = chartCanvas.height;
  const pad = { top: 32, right: 24, bottom: 54, left: 70 };

  ctx.clearRect(0, 0, width, height);

  if (!latestRecords.length) {
    ctx.fillStyle = '#7c7f98';
    ctx.font = '15px sans-serif';
    ctx.fillText('기록된 최종 데이터가 없습니다.', 24, 44);
    return;
  }

  const balances = latestRecords.map((record) => record.finalBalanceManwon);
  const maxVal = Math.max(...balances, 0);
  const minVal = Math.min(...balances, 0);
  const range = Math.max(maxVal - minVal, 1);

  const chartHeight = height - pad.top - pad.bottom;
  const chartWidth = width - pad.left - pad.right;
  const zeroY = pad.top + ((maxVal - 0) * chartHeight) / range;
  const barGap = 24;
  const barWidth = Math.max((chartWidth - barGap * (latestRecords.length + 1)) / latestRecords.length, 30);

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

  latestRecords.forEach((record, idx) => {
    const x = pad.left + barGap + idx * (barWidth + barGap);
    const y = pad.top + ((maxVal - record.finalBalanceManwon) * chartHeight) / range;
    const barTop = Math.min(y, zeroY);
    const barHeight = Math.max(Math.abs(zeroY - y), 1);

    ctx.fillStyle = palette[idx % palette.length];
    ctx.fillRect(x, barTop, barWidth, barHeight);

    ctx.fillStyle = '#4b4f71';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(record.teamName, x + barWidth / 2, height - 24);
    ctx.fillText(formatEok(record.finalBalanceManwon), x + barWidth / 2, barTop - 8);
  });

  ctx.textAlign = 'left';
}

function renderAll() {
  const state = loadFinalRecordsState();
  const records = state.records;
  const latestRecords = getLatestRecordByTeam(records);

  renderFinalTable(records);
  renderLeaderboard(latestRecords);
  drawBarChart(latestRecords);
}

directFinalForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const teamName = directTeamNameInput.value.trim();
  const quote = directTeamQuoteInput.value.trim();
  const eokAmount = Number(directTeamBalanceEokInput.value);

  if (!teamName) {
    alert('팀 이름을 입력해주세요.');
    return;
  }
  if (!Number.isFinite(eokAmount)) {
    alert('최종 금액(억)을 숫자로 입력해주세요.');
    return;
  }

  const finalBalanceManwon = Math.round(eokAmount * 10000);
  const state = loadFinalRecordsState();

  state.records.push({
    id: state.seq,
    teamName,
    quote,
    finalBalanceManwon,
    source: '직접 기록',
    savedAt: Date.now(),
  });
  state.seq += 1;
  saveFinalRecordsState(state);

  directFinalForm.reset();
  renderAll();
});

renderAll();
