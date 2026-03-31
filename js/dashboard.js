/**
 * Crypto Minion Dashboard — dashboard.js
 * stats.json을 fetch하여 Chart.js로 렌더링합니다.
 */

const DATA_URL = 'data/stats.json';

// ── 차트 공통 설정 ────────────────────────────────────────────────────
Chart.defaults.color = 'hsl(220 15% 60%)';
Chart.defaults.font.family = "'Inter', system-ui, sans-serif";

const PALETTE = {
  green:  'hsl(155, 75%, 48%)',
  greenA: 'hsl(155, 75%, 48%, 0.15)',
  red:    'hsl(350, 80%, 60%)',
  redA:   'hsl(350, 80%, 60%, 0.15)',
  blue:   'hsl(210, 90%, 60%)',
  blueA:  'hsl(210, 90%, 60%, 0.15)',
  purple: 'hsl(265, 85%, 68%)',
  purpleA:'hsl(265, 85%, 68%, 0.15)',
  yellow: 'hsl(42, 95%, 58%)',
  teal:   'hsl(175, 70%, 50%)',
  orange: 'hsl(25, 90%, 62%)',
};

const DONUT_COLORS = [
  PALETTE.green, PALETTE.blue, PALETTE.purple,
  PALETTE.yellow, PALETTE.teal, PALETTE.orange, PALETTE.red,
];

// ── 유틸 ──────────────────────────────────────────────────────────────
function fmt$(n, decimals = 4) {
  if (n == null || isNaN(n)) return '—';
  return '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtPct(n, decimals = 2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toFixed(decimals) + '%';
}

function fmtDatetime(str) {
  if (!str) return '—';
  try {
    const d = new Date(str);
    return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
  } catch { return str; }
}

function fmtDate(str) {
  if (!str) return '—';
  return str.slice(5); // MM-DD
}

/** 숫자를 카운트업 애니메이션으로 표시 */
function countUp(el, target, prefix = '', suffix = '', decimals = 4, duration = 1200) {
  const start = performance.now();
  const startVal = 0;
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const val = startVal + (target - startVal) * ease;
    el.textContent = prefix + val.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── 요약 카드 렌더 ────────────────────────────────────────────────────
function renderSummary(s) {
  // 총 펀딩비 수익
  const elFunding = document.getElementById('val-total-funding');
  countUp(elFunding, s.total_funding_income, '$', '', 4);

  document.getElementById('sub-funding-7d').textContent =
    `최근 7일: ${fmt$(s.funding_7d, 4)}`;

  // 총 수수료
  const totalCost = (s.total_fees_paid || 0) + (s.estimated_slippage || 0);
  const elFees = document.getElementById('val-fees');
  countUp(elFees, totalCost, '$', '', 4);
  document.getElementById('sub-fees-rate').textContent =
    `왕복 수수료율: ${fmtPct(s.round_trip_fee_pct, 3)}`;

  // 순수익
  const elNet = document.getElementById('val-net-profit');
  const net = s.net_profit || 0;
  countUp(elNet, net, '$', '', 4);
  elNet.classList.add(net >= 0 ? 'positive' : 'negative');
  document.getElementById('sub-operating').textContent =
    `운영 기간: ${s.operating_days || 0}일`;

  // 예상 APR
  const elApr = document.getElementById('val-apr');
  countUp(elApr, s.projected_apr_pct || 0, '', '%', 2);
  elApr.classList.add((s.projected_apr_pct || 0) >= 0 ? 'positive' : 'negative');
  document.getElementById('sub-positions').textContent =
    `오픈 포지션: ${s.open_trade_count || 0}개`;
}

// ── 일별 바 차트 ──────────────────────────────────────────────────────
function renderDailyChart(series) {
  const labels  = series.map(d => fmtDate(d.date));
  const funding  = series.map(d => d.funding_income);
  const fees     = series.map(d => -Math.abs(d.fees_paid));
  const net      = series.map(d => d.net);

  const ctx = document.getElementById('chart-daily').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '펀딩비 수익',
          data: funding,
          backgroundColor: PALETTE.greenA,
          borderColor: PALETTE.green,
          borderWidth: 1.5,
          borderRadius: 4,
          order: 2,
        },
        {
          label: '수수료',
          data: fees,
          backgroundColor: PALETTE.redA,
          borderColor: PALETTE.red,
          borderWidth: 1.5,
          borderRadius: 4,
          order: 2,
        },
        {
          label: '순수익',
          data: net,
          type: 'line',
          borderColor: PALETTE.blue,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: PALETTE.blue,
          tension: 0.35,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'hsl(222 28% 11% / 0.95)',
          borderColor: 'hsl(220 20% 22%)',
          borderWidth: 1,
          callbacks: {
            label: ctx => `  ${ctx.dataset.label}: ${fmt$(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 12, font: { size: 11 } },
          grid: { color: 'hsl(220 20% 15%)' },
        },
        y: {
          grid: { color: 'hsl(220 20% 15%)' },
          ticks: { callback: v => fmt$(v, 2) },
        },
      },
    },
  });
}

// ── 누적 수익 라인 차트 ───────────────────────────────────────────────
function renderCumulativeChart(series) {
  const labels = series.map(d => fmtDate(d.date));
  const cumData = series.map(d => d.cumulative_net);

  const ctx = document.getElementById('chart-cumulative').getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0,   'hsl(210 90% 60% / 0.25)');
  gradient.addColorStop(1,   'hsl(210 90% 60% / 0.02)');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '누적 순수익',
        data: cumData,
        borderColor: PALETTE.blue,
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: PALETTE.blue,
        tension: 0.4,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'hsl(222 28% 11% / 0.95)',
          borderColor: 'hsl(220 20% 22%)',
          borderWidth: 1,
          callbacks: { label: ctx => `  누적 순수익: ${fmt$(ctx.parsed.y)}` },
        },
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 12, font: { size: 11 } },
          grid: { color: 'hsl(220 20% 15%)' },
        },
        y: {
          grid: { color: 'hsl(220 20% 15%)' },
          ticks: { callback: v => fmt$(v, 2) },
        },
      },
    },
  });
}

// ── 심볼별 도넛 차트 ──────────────────────────────────────────────────
function renderSymbolChart(breakdown) {
  if (!breakdown || !breakdown.length) return;
  const labels = breakdown.map(b => b.symbol.split('/')[0]);
  const data   = breakdown.map(b => b.total_income);
  const ctx = document.getElementById('chart-symbol').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: DONUT_COLORS,
        borderColor: 'hsl(222 28% 11%)',
        borderWidth: 3,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { position: 'bottom', labels: { padding: 14, font: { size: 11 } } },
        tooltip: {
          callbacks: { label: ctx => `  ${ctx.label}: ${fmt$(ctx.parsed)}` },
        },
      },
    },
  });
}

// ── 수익 구성 도넛 차트 ───────────────────────────────────────────────
function renderFeesChart(summary) {
  const funding = summary.total_funding_income || 0;
  const fees    = (summary.total_fees_paid || 0) + (summary.estimated_slippage || 0);
  const net     = summary.net_profit || 0;

  const ctx = document.getElementById('chart-fees-breakdown').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['순수익', '수수료·슬리피지'],
      datasets: [{
        data: [Math.max(net, 0), fees],
        backgroundColor: [PALETTE.green, PALETTE.red],
        borderColor: 'hsl(222 28% 11%)',
        borderWidth: 3,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { position: 'bottom', labels: { padding: 14, font: { size: 11 } } },
        tooltip: {
          callbacks: { label: ctx => `  ${ctx.label}: ${fmt$(ctx.parsed)}` },
        },
      },
    },
  });
}

// ── 오픈 포지션 테이블 ────────────────────────────────────────────────
function renderPositions(positions) {
  const count = positions?.length || 0;
  document.getElementById('positions-count').textContent = `${count} 개`;

  const tbody = document.getElementById('positions-tbody');
  if (!count) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">현재 오픈 포지션 없음</td></tr>';
    return;
  }

  tbody.innerHTML = positions.map(p => `
    <tr>
      <td><strong style="color:var(--text-primary)">${p.symbol}</strong></td>
      <td class="mono">${p.quantity}</td>
      <td class="mono">${fmt$(p.position_value_usdt, 2)}</td>
      <td class="mono positive">${fmtPct(p.funding_rate_at_entry_pct, 4)}</td>
      <td>${p.hold_hours}h</td>
      <td class="mono positive">${fmt$(p.estimated_funding_earned)}</td>
      <td style="color:var(--text-muted);font-size:0.78rem">${fmtDatetime(p.entered_at)}</td>
    </tr>
  `).join('');
}

// ── 최근 펀딩비 내역 테이블 ───────────────────────────────────────────
function renderFundingHistory(recent) {
  const tbody = document.getElementById('funding-tbody');
  if (!recent || !recent.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">펀딩비 수령 내역 없음</td></tr>';
    return;
  }

  tbody.innerHTML = recent.map(f => {
    const cls = f.income >= 0 ? 'positive' : 'negative';
    return `
    <tr>
      <td style="color:var(--text-muted);font-size:0.78rem">${fmtDatetime(f.recorded_at)}</td>
      <td><strong style="color:var(--text-primary)">${f.symbol}</strong></td>
      <td class="mono ${f.funding_rate_pct >= 0 ? 'positive' : 'negative'}">${fmtPct(f.funding_rate_pct, 4)}</td>
      <td class="mono ${cls}">${fmt$(f.income)}</td>
      <td class="mono" style="color:var(--text-muted)">${f.position_size}</td>
    </tr>
    `;
  }).join('');
}

// ── 수수료 구성 세부 ──────────────────────────────────────────────────
function renderFeeDetails(fb) {
  if (!fb) return;
  document.getElementById('fee-spot').textContent         = fmt$(fb.spot_fees);
  document.getElementById('fee-futures').textContent      = fmt$(fb.futures_fees);
  document.getElementById('fee-spot-rate').textContent    = fmtPct(fb.spot_fee_rate_pct, 3);
  document.getElementById('fee-fut-rate').textContent     = fmtPct(fb.futures_fee_rate_pct, 3);
  document.getElementById('fee-slip-rate').textContent    = fmtPct(fb.slippage_rate_pct, 3);
  document.getElementById('fee-roundtrip').textContent    = fmtPct(fb.round_trip_fee_pct, 3);
}

// ── 메인 ─────────────────────────────────────────────────────────────
async function init() {
  try {
    const resp = await fetch(DATA_URL + '?t=' + Date.now());
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    // 샘플 데이터 표시
    if (data.is_sample_data) {
      document.getElementById('sample-badge').style.display = 'inline-flex';
    }

    // 마지막 업데이트
    if (data.meta?.generated_at) {
      document.getElementById('last-updated').textContent =
        fmtDatetime(data.meta.generated_at);
    }

    // 각 섹션 렌더
    if (data.summary)           renderSummary(data.summary);
    if (data.daily_series?.length) {
      renderDailyChart(data.daily_series);
      renderCumulativeChart(data.daily_series);
    }
    if (data.symbol_breakdown)  renderSymbolChart(data.symbol_breakdown);
    if (data.summary)           renderFeesChart(data.summary);
    if (data.open_positions)    renderPositions(data.open_positions);
    if (data.recent_funding)    renderFundingHistory(data.recent_funding);
    if (data.fee_breakdown)     renderFeeDetails(data.fee_breakdown);

  } catch (err) {
    console.error('데이터 로드 실패:', err);
    document.getElementById('sample-badge').style.display = 'inline-flex';
    document.getElementById('sample-badge').textContent = '⚠️ 데이터 로드 실패';
  }
}

document.addEventListener('DOMContentLoaded', init);
