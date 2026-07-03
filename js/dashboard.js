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

  // 현재 총 자산
  if (s.total_equity != null) {
    const elEquity = document.getElementById('val-equity');
    countUp(elEquity, s.total_equity, '$', '', 2);
    document.getElementById('sub-available').textContent =
      `가용 잔고: ${fmt$(s.available_balance ?? s.total_equity, 2)}`;
  }
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

// ══════════════════════════════════════════════════════════════════════
// 🧪 페이퍼 트레이딩 (Paper v2) — data/paper_stats.json
// 파일이 없으면(아직 미수집) 섹션 전체를 숨긴 채 조용히 넘어간다.
// ══════════════════════════════════════════════════════════════════════
const PAPER_DATA_URL = 'data/paper_stats.json';

function fmtSize(n) {
  return '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function renderPaperCards(portfolios) {
  const wrap = document.getElementById('paper-cards');
  wrap.innerHTML = portfolios.map(p => {
    const net = p.net_pnl ?? 0;
    const cls = net >= 0 ? 'positive' : 'negative';
    const aprTxt = p.apr_pct == null ? '측정 중' : fmtPct(p.apr_pct, 2) + ' 연환산';
    const fundNet = (p.funding_income ?? 0) - (p.funding_cost ?? 0);
    return `
    <div class="card ${net >= 0 ? 'card-green' : 'card-red'}">
      <div class="card-icon">🧪</div>
      <div class="card-body">
        <div class="card-label">가상 포트폴리오 ${fmtSize(p.size_usd)}</div>
        <div class="card-value ${cls}">${fmt$(net, 4)} <span style="font-size:0.7em">(${fmtPct(p.net_pnl_pct ?? 0, 3)})</span></div>
        <div class="card-sub">에쿼티 ${fmt$(p.equity, 2)} · 펀딩 ${fmt$(fundNet, 4)} · 수수료 ${fmt$(p.fees ?? 0, 4)}</div>
        <div class="card-sub">${aprTxt} · 오픈 ${p.open_count}개</div>
      </div>
    </div>`;
  }).join('');
}

function renderPaperEquityChart(portfolios) {
  const colors = [PALETTE.blue, PALETTE.purple, PALETTE.teal, PALETTE.orange];
  const datasets = portfolios.map((p, i) => ({
    label: `${fmtSize(p.size_usd)} 포트폴리오`,
    data: (p.equity_series || []).map(pt => ({
      x: pt.ts_ms,
      y: pt.net_pnl != null ? (pt.net_pnl / p.size_usd) * 100 : null,
    })),
    borderColor: colors[i % colors.length],
    backgroundColor: 'transparent',
    borderWidth: 2,
    pointRadius: 0,
    tension: 0.25,
  }));

  new Chart(document.getElementById('chart-paper-equity'), {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          type: 'linear',
          ticks: {
            maxTicksLimit: 8,
            callback: v => new Date(v).toLocaleDateString('ko-KR', {
              month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul',
            }),
          },
          grid: { color: 'hsl(220 15% 18%)' },
        },
        y: {
          ticks: { callback: v => v.toFixed(3) + '%' },
          grid: { color: 'hsl(220 15% 18%)' },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: items => new Date(items[0].parsed.x).toLocaleString('ko-KR', {
              timeZone: 'Asia/Seoul', hour12: false,
            }),
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(4)}%`,
          },
        },
      },
    },
  });
}

function renderPaperPositions(portfolios) {
  const rows = [];
  for (const p of portfolios) {
    for (const pos of p.open_positions || []) {
      rows.push(`
      <tr>
        <td class="mono">${fmtSize(p.size_usd)}</td>
        <td><strong style="color:var(--text-primary)">${pos.symbol}</strong>${pos.spot_venue ? ` <span style="color:var(--text-muted);font-size:0.75rem">(+${pos.spot_venue} 현물)</span>` : ''}</td>
        <td>${pos.leg_type}</td>
        <td class="mono">${pos.qty ?? '—'}</td>
        <td class="mono">${pos.entry_price ?? '—'}</td>
        <td class="mono">${fmt$(pos.required_cash, 2)}</td>
        <td style="color:var(--text-muted);font-size:0.78rem">${fmtDatetime(pos.ts_opened_ms)}</td>
      </tr>`);
    }
  }
  const tbody = document.getElementById('paper-positions-tbody');
  document.getElementById('paper-positions-count').textContent = `${rows.length} 개`;
  tbody.innerHTML = rows.length ? rows.join('')
    : '<tr><td colspan="7" class="empty-row">포지션 없음</td></tr>';
}

function renderPaperWatchlist(watchlist) {
  const tbody = document.getElementById('paper-watchlist-tbody');
  if (!watchlist || !watchlist.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">데이터 없음</td></tr>';
    return;
  }
  const mark = ok => ok === true
    ? '<span class="positive">✓</span>'
    : ok === false ? '<span class="negative">✗</span>' : '—';
  const badge = st => st === 'PASS'
    ? '<span class="badge badge-green">PASS</span>'
    : st === 'FAIL' ? '<span class="badge badge-sample">FAIL</span>'
    : '<span class="badge badge-blue">UNKNOWN</span>';
  tbody.innerHTML = watchlist.map(w => `
    <tr>
      <td><strong style="color:var(--text-primary)">${w.base}</strong></td>
      <td>${mark(w.gates?.identity)}</td>
      <td>${mark(w.gates?.transfer_ops)}</td>
      <td>${mark(w.gates?.funding_edge)}</td>
      <td>${mark(w.gates?.fillable)}</td>
      <td>${badge(w.gate_status)}</td>
    </tr>`).join('');
}

function renderPaperClosed(portfolios) {
  const rows = [];
  for (const p of portfolios) {
    for (const c of p.closed_recent || []) {
      const cls = (c.realized_pnl ?? 0) >= 0 ? 'positive' : 'negative';
      rows.push(`
      <tr>
        <td class="mono">${fmtSize(p.size_usd)}</td>
        <td><strong style="color:var(--text-primary)">${c.symbol}</strong></td>
        <td class="mono ${cls}">${fmt$(c.realized_pnl)}</td>
        <td style="color:var(--text-muted)">${c.exit_reason ?? '—'}</td>
        <td style="color:var(--text-muted);font-size:0.78rem">${fmtDatetime(c.exit_ts_ms)}</td>
      </tr>`);
    }
  }
  document.getElementById('paper-closed-tbody').innerHTML = rows.length
    ? rows.join('') : '<tr><td colspan="5" class="empty-row">청산 내역 없음</td></tr>';
}

async function initPaper() {
  try {
    const resp = await fetch(PAPER_DATA_URL + '?t=' + Date.now());
    if (!resp.ok) return; // 페이퍼 데이터 미수집: 섹션 숨김 유지
    const d = await resp.json();
    document.getElementById('paper-section').style.display = '';

    const regime = d.regime?.state || '—';
    const anchor = d.anchor?.net_apr_pct;
    document.getElementById('paper-regime').textContent =
      `레짐 ${regime}` + (anchor != null ? ` · 베이시스 ${fmtPct(anchor, 2)}` : '')
      + (d.earn_apr_pct != null ? ` · Earn ${fmtPct(d.earn_apr_pct, 2)}` : '');
    if (d.meta?.generated_at) {
      document.getElementById('paper-updated').textContent =
        '갱신 ' + fmtDatetime(d.meta.generated_at);
    }

    renderPaperCards(d.portfolios || []);
    renderPaperEquityChart(d.portfolios || []);
    renderPaperPositions(d.portfolios || []);
    renderPaperWatchlist(d.watchlist);
    renderPaperClosed(d.portfolios || []);
  } catch (err) {
    console.warn('페이퍼 데이터 로드 실패(미수집일 수 있음):', err);
  }
}

document.addEventListener('DOMContentLoaded', initPaper);
