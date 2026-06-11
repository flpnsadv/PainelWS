/* ══════════════════════════════════════════════════════════════════
   DISTRIBUIÇÃO DE HONORÁRIOS
══════════════════════════════════════════════════════════════════ */
(function() {

  // ── Parâmetros — lidos do CFG global ──
  function getDistParams() {
    const imp  = CFG.distImposto   / 100;
    const inv  = CFG.distInvest    / 100;
    const esc  = CFG.distEscritorio/ 100;
    const plFrac = CFG.distProlabore / 100;
    const rest = Math.max(0, 1 - imp - inv - esc);
    const pl   = rest * plFrac;
    const res  = rest - pl;
    return { imp, inv, esc, rest, pl, res };
  }

  // ── Formatação ──
  function fmtBRL(v) {
    return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL', minimumFractionDigits:2 });
  }

  function fmtPctDisplay(v) {
    return v.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:3 }) + '%';
  }

  // ── Formatar input enquanto digita ──
  const distInput = document.getElementById('dist-input');

  function formatInputValue(raw) {
    // Remove tudo que não for dígito
    let digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    // Converte centavos → reais
    let num = parseInt(digits, 10) / 100;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getInputValue() {
    let digits = distInput.value.replace(/\D/g, '');
    if (!digits) return 0;
    return parseInt(digits, 10) / 100;
  }

  distInput.addEventListener('input', function() {
    const formatted = formatInputValue(this.value);
    this.value = formatted;
    renderDist();
  });

  // ── Linhas da tabela — geradas dinamicamente a partir de CFG ──
  function getRows() {
    const p = getDistParams();
    return [
      { id:'imposto',   label:'Simples Nacional',      dotClass:'color-imposto',   pctVal: p.imp,  calcFn: v => v * p.imp,  sub:false, restante:false },
      { id:'invest',    label:'Investimento',           dotClass:'color-invest',    pctVal: p.inv,  calcFn: v => v * p.inv,  sub:false, restante:false },
      { id:'escritorio',label:'Escritório',             dotClass:'color-escritorio',pctVal: p.esc,  calcFn: v => v * p.esc,  sub:false, restante:false },
      { id:'restante',  label:'Restante',               dotClass:'color-restante',  pctVal: p.rest, calcFn: v => v * p.rest, sub:false, restante:true  },
      { id:'prolabore', label:'Pró-labore',             dotClass:'color-prolabore', pctVal: p.pl,   calcFn: v => v * p.pl,   sub:true,  restante:false },
      { id:'reserva',   label:'Reserva de emergência',  dotClass:'color-reserva',   pctVal: p.res,  calcFn: v => v * p.res,  sub:true,  restante:false },
    ];
  }

  // ── Cores do gráfico de pizza ──
  const PIE_COLORS = {
    imposto:    '#E87059',
    invest:     '#6B9E7F',
    escritorio: '#C9923F',
    prolabore:  '#5C3D2E',
    reserva:    '#D4A84B',
  };

  function polarToXY(cx, cy, r, deg) {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function makeDonutPath(cx, cy, r1, r2, startDeg, endDeg) {
    const gap = 2;
    const s = startDeg + gap / 2;
    const e = endDeg - gap / 2;
    if (e - s < 0.5) return '';
    const p1 = polarToXY(cx, cy, r1, s);
    const p2 = polarToXY(cx, cy, r1, e);
    const p3 = polarToXY(cx, cy, r2, e);
    const p4 = polarToXY(cx, cy, r2, s);
    const large = (e - s) > 180 ? 1 : 0;
    return `M ${p1.x.toFixed(3)} ${p1.y.toFixed(3)} A ${r1} ${r1} 0 ${large} 1 ${p2.x.toFixed(3)} ${p2.y.toFixed(3)} L ${p3.x.toFixed(3)} ${p3.y.toFixed(3)} A ${r2} ${r2} 0 ${large} 0 ${p4.x.toFixed(3)} ${p4.y.toFixed(3)} Z`;
  }

  function renderPieChart(V) {
    const p = getDistParams();
    const slices = [
      { id: 'imposto',    label: 'Simples Nacional', pct: p.imp, val: V * p.imp  },
      { id: 'invest',     label: 'Investimento',      pct: p.inv, val: V * p.inv  },
      { id: 'escritorio', label: 'Escritório',        pct: p.esc, val: V * p.esc  },
      { id: 'prolabore',  label: 'Pró-labore',        pct: p.pl,  val: V * p.pl   },
      { id: 'reserva',    label: 'Reserva',           pct: p.res, val: V * p.res  },
    ];

    const sectorsEl  = document.getElementById('dist-pie-sectors');
    const legendEl   = document.getElementById('dist-legend');
    const hoverLabel = document.getElementById('dist-hover-label');
    const centerVal  = document.getElementById('dist-center-value');
    if (!sectorsEl || !legendEl || !hoverLabel || !centerVal) return;

    centerVal.textContent  = fmtBRL(V);
    hoverLabel.textContent = 'Total';
    sectorsEl.innerHTML    = '';
    legendEl.innerHTML     = '';

    let startDeg = 0;
    slices.forEach(slice => {
      const deg    = slice.pct * 360;
      const endDeg = startDeg + deg;
      const color  = PIE_COLORS[slice.id] || 'var(--a1)';

      if (deg > 0.5) {
        const ns   = 'http://www.w3.org/2000/svg';
        const path = document.createElementNS(ns, 'path');
        const d    = makeDonutPath(100, 100, 88, 58, startDeg, endDeg);
        if (d) {
          path.setAttribute('d', d);
          path.setAttribute('fill', color);
          path.setAttribute('class', 'dist-pie-sector');

          path.addEventListener('mouseenter', () => {
            hoverLabel.textContent = slice.label;
            centerVal.textContent  = V > 0 ? fmtBRL(slice.val) : '—';
            document.querySelectorAll('.dist-pie-sector').forEach(el => el.classList.add('dimmed'));
            path.classList.remove('dimmed');
            path.classList.add('highlighted');
          });
          path.addEventListener('mouseleave', () => {
            hoverLabel.textContent = 'Total';
            centerVal.textContent  = fmtBRL(V);
            document.querySelectorAll('.dist-pie-sector').forEach(el => {
              el.classList.remove('dimmed', 'highlighted');
            });
          });

          sectorsEl.appendChild(path);
        }
      }

      // Legenda
      const row = document.createElement('div');
      row.className = 'dist-legend-row';
      row.innerHTML = `
        <span class="dist-legend-dot" style="background:${color}"></span>
        <span class="dist-legend-label">${slice.label}</span>
        <span class="dist-legend-pct">${(slice.pct * 100).toFixed(1)}%</span>
        <span class="dist-legend-val${V > 0 ? ' has-value' : ''}">${V > 0 ? fmtBRL(slice.val) : '—'}</span>
      `;
      legendEl.appendChild(row);

      startDeg = endDeg;
    });
  }

  // ── Renderiza tabela ──
  function renderDist() {
    const V = getInputValue();
    const ROWS = getRows();

    // Atualiza total
    document.getElementById('dist-total-val').textContent = fmtBRL(V);

    const tbody = document.getElementById('dist-tbody');

    // Calcula valores para escalar barras (máx = valor do bruto)
    const maxVal = V > 0 ? V : 1;

    tbody.innerHTML = ROWS.map(row => {
      const val = row.calcFn(V);
      const barPct = V > 0 ? Math.min((val / maxVal) * 100, 100) : 0;
      const trClass = row.restante ? 'row-restante' : row.sub ? 'row-sub' : '';
      const valClass = V === 0 ? 'col-val zero' : 'col-val';

      // Cor da barra
      const barColorMap = {
        imposto:    '#f06060',
        invest:     '#5b8ef5',
        escritorio: '#a78bfa',
        restante:   '#5b8ef5',
        prolabore:  '#34d399',
        reserva:    '#fbbf24',
      };
      const barColor = barColorMap[row.id] || 'var(--a1)';

      return `
        <tr class="${trClass}">
          <td>
            <div class="col-cat">
              <span class="cat-dot ${row.dotClass}"></span>
              ${row.label}
            </div>
            <div class="dist-bar-wrap">
              <div class="dist-bar-fill" style="width:${barPct.toFixed(1)}%;background:${barColor};opacity:${row.sub ? '0.7' : '1'}"></div>
            </div>
          </td>
          <td class="col-pct">${fmtPctDisplay(row.pctVal * 100)}</td>
          <td class="${valClass}">${fmtBRL(val)}</td>
        </tr>`;
    }).join('');

    // Atualiza valores nos cards de parâmetro (coluna direita)
    const p = getDistParams();
    const paramMap = {
      imposto:    v => v * p.imp,
      invest:     v => v * p.inv,
      escritorio: v => v * p.esc,
      prolabore:  v => v * p.pl,
      reserva:    v => v * p.res,
    };
    Object.entries(paramMap).forEach(([id, fn]) => {
      const el = document.getElementById('dpc-val-' + id);
      if (!el) return;
      if (V > 0) {
        el.textContent = fmtBRL(fn(V));
        el.classList.add('has-value');
      } else {
        el.textContent = '—';
        el.classList.remove('has-value');
      }
    });

    renderPieChart(V);
  }

  // Expõe renderDist globalmente para ser chamado ao salvar configurações
  window._renderDist = renderDist;

  // Render inicial (zerado)
  renderDist();

})();
