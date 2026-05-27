/* ══════════════════════════════════════════════════════════════════
   NAVEGAÇÃO DO PAINEL
══════════════════════════════════════════════════════════════════ */
const PAGE_META = {
  calcHonorarios: 'Calculadora de Honorários',
  distribuicao:   'Distribuição de Honorários',
  bacen:          'Análise Revisional - BACEN',
  historico:      'Histórico de Propostas',
};

let currentPage = 'calcHonorarios';

function navigate(pageId) {
  if (!PAGE_META[pageId] || pageId === currentPage) return;

  const outgoing = document.querySelector('.page-section.active');
  const incoming = document.getElementById('page-' + pageId);

  // Atualiza menu e título imediatamente
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });
  // Sincroniza bottom nav mobile
  document.querySelectorAll('#bottom-nav .bnav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });
  const label = PAGE_META[pageId];
  document.title = 'W&S — ' + label;
  document.getElementById('topbar-title').textContent = label;
  currentPage = pageId;
  if (window.innerWidth < 768) closeMobileSidebar();
  if (pageId === 'historico') carregarHistorico();

  if (!outgoing || outgoing === incoming) {
    incoming.classList.add('active');
    return;
  }

  // Fade-out da página atual com slide leve
  outgoing.style.transition = 'opacity .18s ease, transform .18s ease';
  outgoing.style.opacity    = '0';
  outgoing.style.transform  = 'translateX(-12px)';

  setTimeout(() => {
    outgoing.classList.remove('active');
    outgoing.style.cssText = '';

    // Prepara página entrante vindo da direita
    incoming.style.opacity   = '0';
    incoming.style.transform = 'translateX(16px)';
    incoming.classList.add('active');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        incoming.style.transition = 'opacity .24s ease, transform .24s ease';
        incoming.style.opacity    = '1';
        incoming.style.transform  = 'translateX(0)';
      });
    });

    setTimeout(() => { incoming.style.cssText = ''; }, 280);
  }, 190);
}

// Cliques nos itens do menu
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.page));
});

// Cliques no bottom nav mobile
document.querySelectorAll('#bottom-nav .bnav-item').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.page));
});

/* ── Colapso Desktop ── */
const collapseBtn = document.getElementById('collapse-btn');
collapseBtn.addEventListener('click', () => {
  document.body.classList.toggle('sidebar-collapsed');
});

/* ── Mobile Sidebar ── */
const hamburgerBtn  = document.getElementById('hamburger-btn');
const sidebarEl     = document.getElementById('sidebar');
const overlayEl     = document.getElementById('sidebar-overlay');

function openMobileSidebar() {
  sidebarEl.classList.add('mobile-open');
  overlayEl.classList.add('open');
}
function closeMobileSidebar() {
  sidebarEl.classList.remove('mobile-open');
  overlayEl.classList.remove('open');
}

hamburgerBtn.addEventListener('click', openMobileSidebar);
overlayEl.addEventListener('click', closeMobileSidebar);


/* ══════════════════════════════════════════════════════════════════
   CALCULADORA DE HONORÁRIOS
══════════════════════════════════════════════════════════════════ */
const SERVICOS = [
  { icon:'⚖️', title:'Consultoria Jurídica',    desc:'Orientação e Aconselhamento' },
  { icon:'📋', title:'Assessoria Jurídica',     desc:'Acompanhamento Contínuo' },
  { icon:'🤝', title:'Ação Extrajudicial',      desc:'Negociação e Acordos' },
  { icon:'🏛️', title:'Contencioso Judicial',    desc:'Processos Judiciais' },
  { icon:'📄', title:'Parecer Técnico',         desc:'Análise Técnica Especializada' },
  { icon:'🔍', title:'Due Diligence',           desc:'Auditoria e Análise de Riscos' },
  { icon:'✅', title:'Compliance',              desc:'Conformidade Regulatória' },
];

const PCT_URGENCIA     = [0, 0,  5, 10, 15, 20];
const PCT_ESPECIFIC    = [0, 0,  7.5, 15, 22.5, 30];
const PCT_COMPLEXIDADE = [0, 0, 10, 20, 30, 40];
const LEVEL_LABELS     = ['', 'Mínimo', 'Baixo', 'Médio', 'Alto', 'Máximo'];
const LEVEL_SHORT      = ['', 'Mín', 'Baixo', 'Médio', 'Alto', 'Máx'];
const CC_PLANS         = [2,3,4,5,6,7,8,9,10,11,12];

const state = {
  nomeCliente: '', tipoServico: [], valorBase: 0, horasAnalise: 0,
  tutelaLiminar: false, urgencia: 1, especificidade: 1, complexidade: 1,
  honorariosExito: false, percentualExito: 20, valorCausa: 0,
  modalidadeCausa: 'fixo_exito', observacoes: '',
  currentStep: 1, calc: {},
};

const fmt = {
  brl: v => v.toLocaleString('pt-BR', { style:'currency', currency:'BRL', minimumFractionDigits:2 }),
  pct: v => v.toLocaleString('pt-BR', { minimumFractionDigits:1, maximumFractionDigits:1 }) + '%',
};

function calculate() {
  const s = state; const c = {};
  c.pctUrgencia     = PCT_URGENCIA[s.urgencia];
  c.pctEspecific    = PCT_ESPECIFIC[s.especificidade];
  c.pctComplexidade = PCT_COMPLEXIDADE[s.complexidade];
  c.pctTutela       = s.tutelaLiminar ? 25 : 0;
  c.pctTotal        = c.pctUrgencia + c.pctEspecific + c.pctComplexidade + c.pctTutela;

  c.valorAjustado  = s.valorBase * (1 + c.pctTotal / 100);
  c.taxaHoraria    = c.valorAjustado / 160;
  c.adicionalHoras = c.taxaHoraria * (s.horasAnalise || 0);
  c.subtotal       = c.valorAjustado + c.adicionalHoras;
  c.iss            = c.subtotal * 0.045;
  c.totalFixo      = c.subtotal + c.iss;

  c.valorExito = (s.honorariosExito && s.valorCausa > 0)
    ? s.valorCausa * (s.percentualExito / 100) : 0;
  c.totalFinal = s.modalidadeCausa === 'apenas_exito' ? c.valorExito
               : s.modalidadeCausa === 'maior'        ? Math.max(c.totalFixo, c.valorExito)
               : c.totalFixo + c.valorExito;

  const V = c.totalFixo;
  c.avista = V * 0.92; c.avistaEconomia = V * 0.08;
  c.entrada = V * 0.30; c.saldo = V * 0.70;
  let np = Math.max(1, Math.ceil(c.saldo / 790)), pv = c.saldo / np;
  while (pv > 880 && np < 36) { np++; pv = c.saldo / np; }
  while (pv < 700 && np > 1)  { np--; pv = c.saldo / np; }
  c.nParcelas = np; c.valorParcela = pv;

  c.ccOptions = CC_PLANS.map(n => {
    const total = V * Math.pow(1.025, n);
    return { n, parcel: total / n, total, juros: total - V };
  });
  state.calc = c; return c;
}

function levelRow(label, key, pctMap) {
  const cur = state[key];
  const pct = pctMap[cur];
  const btns = [1,2,3,4,5].map(lv => `
    <div class="level-btn ${cur === lv ? 'sel' : ''}"
         data-action="set-${key}" data-lv="${lv}">
      <span class="ln">${lv}</span>
      <span class="ll">${LEVEL_SHORT[lv]}</span>
    </div>`).join('');
  return `
    <div class="level-field">
      <div class="level-header">
        <span class="level-title">${label}</span>
        <span class="level-badge${pct === 0 ? ' zero' : ''}">${pct === 0 ? 'sem acréscimo' : '+' + fmt.pct(pct)}</span>
      </div>
      <div class="level-row">${btns}</div>
    </div>`;
}

function buildStep1() {
  const s = state;
  const cards = SERVICOS.map((sv, i) => `
    <div class="card-option ${s.tipoServico.includes(i) ? 'sel' : ''}"
         data-action="toggle-servico" data-idx="${i}">
      <div class="card-check">✓</div>
      <span class="card-icon">${sv.icon}</span>
      <div class="card-title">${sv.title}</div>
      <div class="card-desc">${sv.desc}</div>
    </div>`).join('');

  const exitoCond = s.honorariosExito ? `
    <div class="field">
      <label class="field-label">Percentual de Êxito</label>
      <div class="pct-group">
        ${[10,20,30].map(p => `<div class="pct-btn ${s.percentualExito===p?'sel':''}" data-action="set-pct-exito" data-pct="${p}">${p}%</div>`).join('')}
      </div>
    </div>
    <div class="field">
      <label class="field-label">Valor Estimado da Causa</label>
      <input type="number" min="0" step="100" data-bind="valorCausa"
             value="${s.valorCausa||''}" placeholder="R$ 0,00">
      <div class="field-hint">Base de cálculo dos honorários de êxito</div>
    </div>
    <div class="field">
      <label class="field-label">Modalidade da Causa</label>
      <div class="mod-grid">
        <div class="mod-card ${s.modalidadeCausa==='apenas_exito'?'sel':''}" data-action="set-modalidade" data-mod="apenas_exito">
          <div class="mod-icon">🏆</div><div class="mod-title">Apenas Êxito</div><div class="mod-desc">Sem honorários fixos</div>
        </div>
        <div class="mod-card ${s.modalidadeCausa==='fixo_exito'?'sel':''}" data-action="set-modalidade" data-mod="fixo_exito">
          <div class="mod-icon">⚖️</div><div class="mod-title">Fixos + Êxito</div><div class="mod-desc">Honorários fixos e de êxito</div>
        </div>
        <div class="mod-card ${s.modalidadeCausa==='maior'?'sel':''}" data-action="set-modalidade" data-mod="maior">
          <div class="mod-icon">📊</div><div class="mod-title">Fixos OU Êxito</div><div class="mod-desc">O que for maior prevalece</div>
        </div>
      </div>
    </div>` : '';

  return `
    <div class="step-eyebrow">Etapa 01</div>
    <div class="step-title">Dados do Caso</div>
    <div class="step-sub">Preencha as informações para calcular os honorários</div>

    <div class="field" data-field="nomeCliente">
      <label class="field-label">Nome do Cliente</label>
      <input type="text" data-bind="nomeCliente" value="${escHtml(s.nomeCliente)}" placeholder="Nome completo do cliente">
      <div class="field-error-msg">Informe o nome do cliente</div>
    </div>

    <div class="field" data-field="tipoServico">
      <label class="field-label">Tipo de Serviço <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:10px">(múltipla escolha)</span></label>
      <div class="card-grid">${cards}</div>
      <div class="field-error-msg">Selecione ao menos um tipo de serviço</div>
    </div>

    <div class="input-row">
      <div class="field" data-field="valorBase">
        <label class="field-label">Valor Base (R$)</label>
        <input type="number" min="0" step="50" data-bind="valorBase" value="${s.valorBase||''}" placeholder="0,00">
        <div class="field-hint">Mínimo indicado pela tabela OAB/SC</div>
        <div class="field-error-msg">Informe o valor base</div>
      </div>
      <div class="field">
        <label class="field-label">Horas de Análise</label>
        <input type="number" min="0" step="0.5" data-bind="horasAnalise" value="${s.horasAnalise||''}" placeholder="0">
        <div class="field-hint">Horas dedicadas à análise inicial</div>
      </div>
    </div>

    <div class="field">
      <label class="field-label">Tutela / Liminar</label>
      <div class="toggle-group">
        <div class="toggle-btn ${!s.tutelaLiminar?'sel-ok':''}" data-action="set-tutela" data-val="false">Não</div>
        <div class="toggle-btn ${s.tutelaLiminar?'sel':''}" data-action="set-tutela" data-val="true">Sim — tutela/liminar (+25%)</div>
      </div>
    </div>

    <hr class="section-sep">

    ${levelRow('Grau de Urgência', 'urgencia', PCT_URGENCIA)}
    ${levelRow('Grau de Especificidade', 'especificidade', PCT_ESPECIFIC)}
    ${levelRow('Grau de Complexidade', 'complexidade', PCT_COMPLEXIDADE)}

    <hr class="section-sep">

    <div class="field">
      <label class="field-label">Honorários de Êxito</label>
      <div class="toggle-group">
        <div class="toggle-btn ${!s.honorariosExito?'sel-ok':''}" data-action="set-exito" data-val="false">Não</div>
        <div class="toggle-btn ${s.honorariosExito?'sel':''}" data-action="set-exito" data-val="true">Sim — cobrar êxito</div>
      </div>
    </div>
    ${exitoCond}

    <div class="field" style="margin-top:8px">
      <label class="field-label">Observações Adicionais</label>
      <textarea data-bind="observacoes" placeholder="Descreva particularidades do caso, acordos especiais ou outras observações relevantes...">${escHtml(s.observacoes)}</textarea>
    </div>`;
}

function buildStep2() {
  const s = state; const c = state.calc;
  const svNames = s.tipoServico.length ? s.tipoServico.map(i => SERVICOS[i].icon + ' ' + SERVICOS[i].title).join(', ') : '—';
  const modLabel = { apenas_exito:'Apenas Êxito (sem honorários fixos)', fixo_exito:'Honorários Fixos + Êxito', maior:'Fixos OU Êxito (o que for maior)' }[s.modalidadeCausa];

  const badge = (v, suffix='') => v > 0
    ? `<span class="badge">+${fmt.pct(v)}${suffix}</span>`
    : `<span class="badge badge-neutral">sem acréscimo</span>`;

  return `
    <div class="step-eyebrow">Etapa 02</div>
    <div class="step-title">Cálculo dos Honorários</div>
    <div class="step-sub">Resumo completo dos valores calculados</div>

    ${s.tutelaLiminar ? `<div class="info-banner">⚡ <span><strong>Tutela/Liminar ativa</strong> — acréscimo de 25% incluído nos ajustes.</span></div>` : ''}

    <div class="calc-block">
      <div class="calc-block-title">Dados Gerais</div>
      <div class="calc-row"><span class="lbl">Cliente</span><span class="val">${escHtml(s.nomeCliente)}</span></div>
      <div class="calc-row"><span class="lbl">Serviço</span><span class="val" style="text-align:right;max-width:58%">${svNames}</span></div>
      <div class="calc-row"><span class="lbl">Valor Base OAB/SC</span><span class="val">${fmt.brl(s.valorBase)}</span></div>
      <div class="calc-row"><span class="lbl">Horas de Análise</span><span class="val">${s.horasAnalise}h</span></div>
    </div>

    <div class="calc-block">
      <div class="calc-block-title">Ajustes Aplicados</div>
      <div class="calc-row"><span class="lbl">Urgência — Nível ${s.urgencia} (${LEVEL_LABELS[s.urgencia]})</span>${badge(c.pctUrgencia)}</div>
      <div class="calc-row"><span class="lbl">Especificidade — Nível ${s.especificidade} (${LEVEL_LABELS[s.especificidade]})</span>${badge(c.pctEspecific)}</div>
      <div class="calc-row"><span class="lbl">Complexidade — Nível ${s.complexidade} (${LEVEL_LABELS[s.complexidade]})</span>${badge(c.pctComplexidade)}</div>
      ${s.tutelaLiminar ? `<div class="calc-row"><span class="lbl">Tutela / Liminar</span><span class="badge">+25,0%</span></div>` : ''}
      <hr class="calc-divider">
      <div class="calc-row">
        <span class="lbl" style="font-weight:700;color:var(--t1)">Total de Ajustes</span>
        ${c.pctTotal > 0 ? `<span class="badge" style="font-size:12px;padding:3px 12px">+${fmt.pct(c.pctTotal)}</span>` : `<span class="badge badge-neutral" style="font-size:12px;padding:3px 12px">0%</span>`}
      </div>
    </div>

    <div class="calc-block">
      <div class="calc-block-title">Composição dos Honorários Fixos</div>
      <div class="calc-row"><span class="lbl">Valor Ajustado (base × ${(1 + c.pctTotal/100).toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3})})</span><span class="val">${fmt.brl(c.valorAjustado)}</span></div>
      <div class="calc-row"><span class="lbl">Taxa Horária (÷ 160h mensais)</span><span class="val">${fmt.brl(c.taxaHoraria)}/h</span></div>
      <div class="calc-row"><span class="lbl">Adicional de Análise (${s.horasAnalise}h)</span><span class="val">${fmt.brl(c.adicionalHoras)}</span></div>
      <hr class="calc-divider">
      <div class="calc-row"><span class="lbl">Subtotal</span><span class="val">${fmt.brl(c.subtotal)}</span></div>
      <div class="calc-row"><span class="lbl">Imposto 4,5%</span><span class="val">${fmt.brl(c.iss)}</span></div>
    </div>

    <div class="calc-total-box">
      <div class="lbl">TOTAL DOS HONORÁRIOS FIXOS</div>
      <div class="val">${fmt.brl(c.totalFixo)}</div>
    </div>

    ${s.honorariosExito ? `
    <div class="calc-block">
      <div class="calc-block-title">Honorários de Êxito</div>
      <div class="calc-row"><span class="lbl">Percentual</span><span class="val">${s.percentualExito}%</span></div>
      <div class="calc-row"><span class="lbl">Valor Estimado da Causa</span><span class="val">${fmt.brl(s.valorCausa)}</span></div>
      <hr class="calc-divider">
      <div class="calc-row"><span class="lbl">Honorários de Êxito</span><span class="val accent">${fmt.brl(c.valorExito)}</span></div>
      <div class="calc-row"><span class="lbl">Modalidade</span><span class="val" style="text-align:right;max-width:55%;font-size:12px">${modLabel}</span></div>
      <hr class="calc-divider">
      <div class="calc-row"><span class="lbl" style="font-weight:700;color:var(--t1)">Total Estimado Final</span><span class="val success" style="font-size:17px">${fmt.brl(c.totalFinal)}</span></div>
    </div>` : ''}

    ${s.observacoes ? `
    <div class="calc-block">
      <div class="calc-block-title">Observações</div>
      <div style="font-size:13px;color:var(--t2);line-height:1.7">${escHtml(s.observacoes)}</div>
    </div>` : ''}`;
}

function buildStep3() {
  const c = state.calc;
  const ccRows = c.ccOptions.map(o => `
    <tr>
      <td>${o.n}x</td>
      <td>${fmt.brl(o.parcel)}</td>
      <td class="juros-col">${fmt.brl(o.juros)}</td>
      <td class="total-col">${fmt.brl(o.total)}</td>
    </tr>`).join('');

  return `
    <div class="step-eyebrow">Etapa 03</div>
    <div class="step-title">Opções de Pagamento</div>
    <div class="step-sub">Referência: <strong>${fmt.brl(c.totalFixo)}</strong> em honorários fixos</div>

    <div class="pay-card">
      <div class="pay-header">
        <div class="pay-title">💵 Opção 1 — À Vista</div>
        <div class="pay-badge pb-green">Recomendado</div>
      </div>
      <div class="pay-row"><span class="lbl">Valor original</span><span class="val">${fmt.brl(c.totalFixo)}</span></div>
      <div class="pay-row"><span class="lbl">Desconto de 8%</span><span class="val" style="color:var(--ok)">− ${fmt.brl(c.avistaEconomia)}</span></div>
      <div class="pay-row" style="font-size:16px;font-weight:800;padding-top:8px">
        <span>Valor Final à Vista</span><span style="color:var(--ok)">${fmt.brl(c.avista)}</span>
      </div>
      <div class="saving-box">✓ Economia de <strong>${fmt.brl(c.avistaEconomia)}</strong> em relação ao valor cheio</div>
      <div class="pay-methods">Formas aceitas: Dinheiro · Pix · Boleto Bancário</div>
    </div>

    <div class="pay-card">
      <div class="pay-header">
        <div class="pay-title">📄 Opção 2 — Parcelado</div>
        <div class="pay-badge pb-blue">Sem Juros</div>
      </div>
      <div class="pay-row"><span class="lbl">Entrada (30%)</span><span class="val">${fmt.brl(c.entrada)}</span></div>
      <div class="pay-row"><span class="lbl">Saldo restante (70%)</span><span class="val">${fmt.brl(c.saldo)}</span></div>
      <div class="pay-row"><span class="lbl">Parcelamento do saldo</span><span class="val">${c.nParcelas}x de ${fmt.brl(c.valorParcela)}</span></div>
      <div class="pay-row" style="font-weight:800;font-size:14px;padding-top:8px">
        <span>Total</span><span>${fmt.brl(c.totalFixo)}</span>
      </div>
      <div class="pay-methods">
        <strong style="color:var(--t2)">Resumo:</strong>
        Entrada de ${fmt.brl(c.entrada)} + ${c.nParcelas} parcela${c.nParcelas>1?'s':''} de ${fmt.brl(c.valorParcela)}<br>
        Formas aceitas: Boleto Bancário · Pix
      </div>
    </div>

    <div class="pay-card">
      <div class="pay-header">
        <div class="pay-title">💳 Opção 3 — Cartão de Crédito</div>
        <div class="pay-badge pb-red">Juros compostos 2,5% a.m.</div>
      </div>
      <table class="cc-table">
        <thead>
          <tr>
            <th>Parcelas</th><th>Valor/Parcela</th>
            <th>Juros Totais</th><th>Total Pago</th>
          </tr>
        </thead>
        <tbody>${ccRows}</tbody>
      </table>
    </div>

    <button class="btn btn-primary btn-full" data-action="gerar-resumo">
      📄 Gerar Resumo da Proposta
    </button>`;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function refreshInPlace() {
  calculate();
  const n = state.currentStep;
  document.getElementById('step-container').innerHTML =
    n===1 ? buildStep1() : n===2 ? buildStep2() : buildStep3();
}

function validate1() {
  let ok = true;
  [
    { field:'nomeCliente', test: state.nomeCliente.trim()!=='', msg:'Informe o nome do cliente' },
    { field:'tipoServico', test: state.tipoServico.length>0,   msg:'Selecione ao menos um tipo de serviço' },
    { field:'valorBase',   test: state.valorBase>0,            msg:'Informe o valor base' },
  ].forEach(e => {
    const el = document.querySelector(`[data-field="${e.field}"]`);
    if (!el) return;
    if (!e.test) {
      el.classList.add('has-error');
      el.querySelector('.field-error-msg').textContent = e.msg;
      ok = false;
    } else { el.classList.remove('has-error'); }
  });
  if (!ok) document.querySelector('.has-error')?.scrollIntoView({behavior:'smooth',block:'center'});
  return ok;
}

function goToStep(n, animate=true) {
  if (n<1||n>3) return;
  state.currentStep = n;
  const container = document.getElementById('step-container');
  const render = () => {
    calculate();
    container.innerHTML = n===1 ? buildStep1() : n===2 ? buildStep2() : buildStep3();
    if (n === 2) setTimeout(() => animateCounters(container), 60);
  };
  if (animate) {
    container.classList.add('step-exit');
    setTimeout(() => {
      container.classList.remove('step-exit');
      render();
      container.classList.add('step-enter');
      container.scrollIntoView({behavior:'smooth',block:'start'});
      setTimeout(() => container.classList.remove('step-enter'), 300);
    }, 200);
  } else { render(); }
  updateProgress(n);
}

function updateProgress(n) {
  [1,2,3].forEach(i => {
    const dot = document.getElementById(`dot${i}`);
    dot.classList.toggle('active', i===n);
    dot.classList.toggle('done',   i<n);
  });
  [1,2].forEach(i => {
    document.getElementById(`con${i}`)?.classList.toggle('done', i<n);
  });
  document.getElementById('btn-prev').classList.toggle('btn-invisible', n===1);
  const next = document.getElementById('btn-next');
  next.style.display = n===3 ? 'none' : '';
}

function tryAdvance() {
  if (state.currentStep===1 && !validate1()) return;
  goToStep(state.currentStep+1);
}

function showSummary() {
  calculate();
  const s=state, c=s.calc;
  const svNames = s.tipoServico.map(i=>SERVICOS[i].title).join(', ')||'—';
  const modLabel = {apenas_exito:'Apenas Êxito',fixo_exito:'Honorários Fixos + Êxito',maior:'Fixos OU Êxito (o que for maior)'}[s.modalidadeCausa];
  const now = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});

  const ccSumRows = c.ccOptions.filter(o=>[2,3,4,6,9,12].includes(o.n)).map(o=>
    `<div class="sum-row"><span class="lbl">${o.n}x cartão</span><span class="val">${fmt.brl(o.parcel)}/parc. — total ${fmt.brl(o.total)}</span></div>`
  ).join('');

  document.getElementById('summary-box').innerHTML = `
    <div class="sum-header">
      <div>
        <div class="sum-eyebrow">Proposta de Honorários Advocatícios</div>
        <div class="sum-client">${escHtml(s.nomeCliente)}</div>
        <div class="sum-date">${now}</div>
      </div>
      <div class="sum-total">
        <div class="sum-total-lbl">Honorários Fixos</div>
        <div class="sum-total-val">${fmt.brl(c.totalFixo)}</div>
      </div>
    </div>

    <div class="sum-section">
      <div class="sum-section-title">Dados do Caso</div>
      <div class="sum-row"><span class="lbl">Tipo de Serviço</span><span class="val">${svNames}</span></div>
      <div class="sum-row"><span class="lbl">Valor Base OAB/SC</span><span class="val">${fmt.brl(s.valorBase)}</span></div>
      <div class="sum-row"><span class="lbl">Horas de Análise</span><span class="val">${s.horasAnalise}h</span></div>
      ${s.tutelaLiminar?'<div class="sum-row"><span class="lbl">Tutela / Liminar</span><span class="val">Sim (+25%)</span></div>':''}
    </div>

    <div class="sum-section">
      <div class="sum-section-title">Ajustes Aplicados</div>
      <div class="sum-row"><span class="lbl">Urgência (Nível ${s.urgencia} — ${LEVEL_LABELS[s.urgencia]})</span><span class="val">+${fmt.pct(c.pctUrgencia)}</span></div>
      <div class="sum-row"><span class="lbl">Especificidade (Nível ${s.especificidade} — ${LEVEL_LABELS[s.especificidade]})</span><span class="val">+${fmt.pct(c.pctEspecific)}</span></div>
      <div class="sum-row"><span class="lbl">Complexidade (Nível ${s.complexidade} — ${LEVEL_LABELS[s.complexidade]})</span><span class="val">+${fmt.pct(c.pctComplexidade)}</span></div>
      ${s.tutelaLiminar?'<div class="sum-row"><span class="lbl">Tutela / Liminar</span><span class="val">+25,0%</span></div>':''}
      <div class="sum-row" style="font-weight:700"><span class="lbl" style="color:var(--t2)">Total de Ajustes</span><span class="val">+${fmt.pct(c.pctTotal)}</span></div>
    </div>

    <div class="sum-section">
      <div class="sum-section-title">Composição dos Honorários Fixos</div>
      <div class="sum-row"><span class="lbl">Valor Ajustado</span><span class="val">${fmt.brl(c.valorAjustado)}</span></div>
      <div class="sum-row"><span class="lbl">Adicional de Análise</span><span class="val">${fmt.brl(c.adicionalHoras)}</span></div>
      <div class="sum-row"><span class="lbl">Subtotal</span><span class="val">${fmt.brl(c.subtotal)}</span></div>
      <div class="sum-row"><span class="lbl">Imposto 4,5%</span><span class="val">${fmt.brl(c.iss)}</span></div>
      <div class="sum-row" style="font-weight:800;font-size:14px;padding-top:6px">
        <span style="color:var(--t1)">TOTAL HONORÁRIOS FIXOS</span>
        <span style="color:var(--a1)">${fmt.brl(c.totalFixo)}</span>
      </div>
    </div>

    ${s.honorariosExito?`
    <div class="sum-section">
      <div class="sum-section-title">Honorários de Êxito</div>
      <div class="sum-row"><span class="lbl">Percentual</span><span class="val">${s.percentualExito}%</span></div>
      <div class="sum-row"><span class="lbl">Valor da Causa</span><span class="val">${fmt.brl(s.valorCausa)}</span></div>
      <div class="sum-row"><span class="lbl">Honorários de Êxito</span><span class="val">${fmt.brl(c.valorExito)}</span></div>
      <div class="sum-row"><span class="lbl">Modalidade</span><span class="val">${modLabel}</span></div>
      <div class="sum-row" style="font-weight:800;font-size:14px;padding-top:6px">
        <span style="color:var(--t1)">Total Estimado Final</span>
        <span style="color:var(--ok)">${fmt.brl(c.totalFinal)}</span>
      </div>
    </div>`:''}

    <div class="sum-section">
      <div class="sum-section-title">Opções de Pagamento</div>
      <div class="sum-row"><span class="lbl">À Vista (8% desc.)</span><span class="val" style="color:var(--ok)">${fmt.brl(c.avista)} <span style="color:var(--t3);font-weight:400">(ec. ${fmt.brl(c.avistaEconomia)})</span></span></div>
      <div class="sum-row"><span class="lbl">Parcelado (Boleto/Pix)</span><span class="val">Entrada ${fmt.brl(c.entrada)} + ${c.nParcelas}x de ${fmt.brl(c.valorParcela)}</span></div>
      ${ccSumRows}
    </div>

    ${s.observacoes?`
    <div class="sum-section">
      <div class="sum-section-title">Observações</div>
      <div class="sum-obs">${escHtml(s.observacoes)}</div>
    </div>`:''}

    <div class="sum-actions">
      <button class="btn btn-primary" onclick="window.print()">🖨️ Imprimir</button>
      <button class="btn btn-outline" id="btn-copy-text">📋 Copiar Texto</button>
      <button class="btn btn-outline" onclick="novaProposta()">✦ Nova Proposta</button>
      <button class="btn btn-ghost" onclick="closeSummary()">Fechar</button>
    </div>`;

  // Salvar proposta no histórico
  (async function() {
    if (!window._sb || !window._currentUser) return;
    const s = state;
    const c = s.calc;
    await window._sb.from('propostas').insert({
      user_id:        window._currentUser.id,
      nome_cliente:   s.nomeCliente,
      tipo_servico:   s.tipoServico,
      valor_base:     s.valorBase,
      total_fixo:     c.totalFixo  || 0,
      total_final:    c.totalFinal || 0,
      dados_completos: JSON.parse(JSON.stringify(s))
    });
  })();

  document.getElementById('summary-modal').classList.add('open');
  document.getElementById('btn-copy-text').onclick = () => {
    const text = buildPlainText();
    const flash = () => { const b=document.getElementById('btn-copy-text'); if(b){b.textContent='✓ Copiado!';setTimeout(()=>{if(b)b.textContent='📋 Copiar Texto'},2000);} };
    navigator.clipboard ? navigator.clipboard.writeText(text).then(flash) : (()=>{const t=Object.assign(document.createElement('textarea'),{value:text});document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);flash();})();
  };
}

function closeSummary() { document.getElementById('summary-modal').classList.remove('open'); }

function buildPlainText() {
  const s=state, c=s.calc;
  const svNames = s.tipoServico.map(i=>SERVICOS[i].title).join(', ')||'—';
  const now = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  const sep = '─'.repeat(50);
  const lines = [
    'PROPOSTA DE HONORÁRIOS ADVOCATÍCIOS', sep,
    `Cliente: ${s.nomeCliente}`, `Data: ${now}`, '',
    'DADOS DO CASO', sep,
    `Serviço: ${svNames}`,`Valor Base: ${fmt.brl(s.valorBase)}`,
    `Horas de Análise: ${s.horasAnalise}h`,`Tutela/Liminar: ${s.tutelaLiminar?'Sim (+25%)':'Não'}`, '',
    'AJUSTES', sep,
    `Urgência (Nível ${s.urgencia}): +${fmt.pct(c.pctUrgencia)}`,
    `Especificidade (Nível ${s.especificidade}): +${fmt.pct(c.pctEspecific)}`,
    `Complexidade (Nível ${s.complexidade}): +${fmt.pct(c.pctComplexidade)}`,
    s.tutelaLiminar?'Tutela/Liminar: +25,0%':null,
    `Total: +${fmt.pct(c.pctTotal)}`, '',
    'COMPOSIÇÃO', sep,
    `Valor Ajustado: ${fmt.brl(c.valorAjustado)}`,
    `Adicional Análise: ${fmt.brl(c.adicionalHoras)}`,
    `Subtotal: ${fmt.brl(c.subtotal)}`,`Imposto 4,5%: ${fmt.brl(c.iss)}`,
    `TOTAL HONORÁRIOS FIXOS: ${fmt.brl(c.totalFixo)}`,
  ].filter(Boolean);
  if (s.honorariosExito) lines.push('','HONORÁRIOS DE ÊXITO',sep,`Percentual: ${s.percentualExito}%`,`Valor da Causa: ${fmt.brl(s.valorCausa)}`,`Honorários de Êxito: ${fmt.brl(c.valorExito)}`,`Total Estimado Final: ${fmt.brl(c.totalFinal)}`);
  lines.push('','PAGAMENTO',sep,
    `À Vista (8% desc.): ${fmt.brl(c.avista)} (ec. ${fmt.brl(c.avistaEconomia)})`,
    `Parcelado: Entrada ${fmt.brl(c.entrada)} + ${c.nParcelas}x de ${fmt.brl(c.valorParcela)}`,
    'Cartão (2,5% a.m.):',
    ...c.ccOptions.map(o=>`  ${o.n}x de ${fmt.brl(o.parcel)} — juros ${fmt.brl(o.juros)} — total ${fmt.brl(o.total)}`)
  );
  if (s.observacoes) lines.push('','OBSERVAÇÕES',sep,s.observacoes);
  return lines.join('\n');
}

// Count-up animation nos valores do resultado
function animateCounters(container) {
  container.querySelectorAll('.calc-total-box .val').forEach(el => {
    const original = el.textContent.trim();
    const digits = original.replace(/[^\d,]/g, '');
    const target = parseFloat(digits.replace(/\./g,'').replace(',','.'));
    if (!isFinite(target) || target <= 0) return;
    const duration = 700;
    const t0 = performance.now();
    const tick = now => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const v = target * ease;
      el.textContent = 'R$ ' + v.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = original;
    };
    requestAnimationFrame(tick);
  });
}

// Eventos da Calculadora de Honorários
document.getElementById('step-container').addEventListener('click', function(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  switch (a) {
    case 'toggle-servico': {
      const idx=parseInt(el.dataset.idx), pos=state.tipoServico.indexOf(idx);
      pos===-1 ? state.tipoServico.push(idx) : state.tipoServico.splice(pos,1); break;
    }
    case 'set-tutela':          state.tutelaLiminar    = el.dataset.val==='true'; break;
    case 'set-urgencia':        state.urgencia         = parseInt(el.dataset.lv);  break;
    case 'set-especificidade':  state.especificidade   = parseInt(el.dataset.lv);  break;
    case 'set-complexidade':    state.complexidade     = parseInt(el.dataset.lv);  break;
    case 'set-exito':           state.honorariosExito  = el.dataset.val==='true'; break;
    case 'set-pct-exito':       state.percentualExito  = parseInt(el.dataset.pct); break;
    case 'set-modalidade':      state.modalidadeCausa  = el.dataset.mod;           break;
    case 'gerar-resumo':        showSummary(); return;
    default: return;
  }
  refreshInPlace();
});

document.getElementById('step-container').addEventListener('input', function(e) {
  const el = e.target;
  if (!el.dataset.bind) return;
  state[el.dataset.bind] = el.type==='number' ? (parseFloat(el.value)||0) : el.value;
  el.closest('[data-field]')?.classList.remove('has-error');
});

document.getElementById('btn-prev').addEventListener('click', () => goToStep(state.currentStep-1));
document.getElementById('btn-next').addEventListener('click', () => tryAdvance());
document.getElementById('summary-modal').addEventListener('click', e => { if(e.target===e.currentTarget) closeSummary(); });
document.addEventListener('keydown', e => { if(e.key==='Escape') closeSummary(); });

// Init Calculadora de Honorários
calculate();
document.getElementById('step-container').innerHTML = buildStep1();
updateProgress(1);

/* ══════════════════════════════════════════════════════════════════
   DISTRIBUIÇÃO DE HONORÁRIOS
══════════════════════════════════════════════════════════════════ */
(function() {

  // ── Parâmetros ──
  const PARAMS = {
    imposto:    0.045,
    invest:     0.150,
    escritorio: 0.100,
    // Restante = 1 - 0.045 - 0.15 - 0.10 = 0.705
    // Pró-labore = restante * 0.75 = 0.52875
    // Reserva    = restante * 0.25 = 0.17625
  };

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

  // ── Linhas da tabela ──
  const ROWS = [
    {
      id: 'imposto',
      label: 'Simples Nacional',
      dotClass: 'color-imposto',
      pct: 4.5,
      calcFn: v => v * PARAMS.imposto,
      sub: false,
      restante: false,
    },
    {
      id: 'invest',
      label: 'Investimento',
      dotClass: 'color-invest',
      pct: 15,
      calcFn: v => v * PARAMS.invest,
      sub: false,
      restante: false,
    },
    {
      id: 'escritorio',
      label: 'Escritório',
      dotClass: 'color-escritorio',
      pct: 10,
      calcFn: v => v * PARAMS.escritorio,
      sub: false,
      restante: false,
    },
    {
      id: 'restante',
      label: 'Restante',
      dotClass: 'color-restante',
      pct: 70.5,
      calcFn: v => v * 0.705,
      sub: false,
      restante: true,
    },
    {
      id: 'prolabore',
      label: 'Pró-labore',
      dotClass: 'color-prolabore',
      pct: 52.875,
      calcFn: v => v * 0.52875,
      sub: true,
      restante: false,
    },
    {
      id: 'reserva',
      label: 'Reserva de emergência',
      dotClass: 'color-reserva',
      pct: 17.625,
      calcFn: v => v * 0.17625,
      sub: true,
      restante: false,
    },
  ];

  // ── Renderiza tabela ──
  function renderDist() {
    const V = getInputValue();

    // Atualiza total
    document.getElementById('dist-total-val').textContent = fmtBRL(V);

    const tbody = document.getElementById('dist-tbody');

    // Calcula valores para escalar barras (máx = valor do bruto)
    const valores = ROWS.map(r => ({ id: r.id, val: r.calcFn(V) }));
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
          <td class="col-pct">${fmtPctDisplay(row.pct)}</td>
          <td class="${valClass}">${fmtBRL(val)}</td>
        </tr>`;
    }).join('');

    // Atualiza valores nos cards de parâmetro (coluna direita)
    const paramMap = {
      imposto:    v => v * PARAMS.imposto,
      invest:     v => v * PARAMS.invest,
      escritorio: v => v * PARAMS.escritorio,
      prolabore:  v => v * 0.52875,
      reserva:    v => v * 0.17625,
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
  }

  // Render inicial (zerado)
  renderDist();

})();

/* ══════════════════════════════════════════════════════════════════
   CALCULADORA BACEN — PLATAFORMA REVISIONAL v2.0
══════════════════════════════════════════════════════════════════ */
(function () {

// ============================================
// PARTE I — DADOS EMBARCADOS
// ============================================

let TAXAS_BACEN = {
"20749": {"01/2018":22.74,"02/2018":22.47,"03/2018":21.75,"04/2018":21.53,"05/2018":21.49,"06/2018":21.96,"07/2018":22.34,"08/2018":22.17,"09/2018":22.17,"10/2018":22.36,"11/2018":21.68,"12/2018":21.68,"01/2019":22.36,"02/2019":22.01,"03/2019":21.38,"04/2019":21.26,"05/2019":21.10,"06/2019":20.80,"07/2019":20.34,"08/2019":20.10,"09/2019":19.79,"10/2019":19.65,"11/2019":19.29,"12/2019":19.15,"01/2020":19.73,"02/2020":19.40,"03/2020":19.76,"04/2020":20.38,"05/2020":19.46,"06/2020":18.99,"07/2020":18.88,"08/2020":18.88,"09/2020":18.56,"10/2020":18.88,"11/2020":18.97,"12/2020":19.20,"01/2021":20.21,"02/2021":19.96,"03/2021":20.64,"04/2021":21.31,"05/2021":21.29,"06/2021":21.59,"07/2021":21.94,"08/2021":22.65,"09/2021":23.90,"10/2021":24.81,"11/2021":27.45,"12/2021":26.79,"01/2022":26.87,"02/2022":26.46,"03/2022":27.15,"04/2022":27.23,"05/2022":27.15,"06/2022":27.43,"07/2022":27.64,"08/2022":27.42,"09/2022":27.10,"10/2022":27.20,"11/2022":27.65,"12/2022":28.68,"01/2023":29.05,"02/2023":28.96,"03/2023":28.58,"04/2023":28.46,"05/2023":28.08,"06/2023":26.81,"07/2023":26.06,"08/2023":26.18,"09/2023":25.95,"10/2023":26.19,"11/2023":25.98,"12/2023":25.52,"01/2024":26.07,"02/2024":25.85,"03/2024":25.43,"04/2024":25.44,"05/2024":25.54,"06/2024":25.52,"07/2024":25.45,"08/2024":25.72,"09/2024":25.51,"10/2024":25.90,"11/2024":26.39,"12/2024":27.51,"01/2025":29.52,"02/2025":29.14,"03/2025":28.59,"04/2025":28.06,"05/2025":27.61,"06/2025":27.59,"07/2025":27.29,"08/2025":27.34,"09/2025":27.30,"10/2025":27.43,"11/2025":27.02,"12/2025":26.44,"01/2026":27.72,"02/2026":27.28,"03/2026":26.61},
"20742": {"01/2018":122.58,"02/2018":125.66,"03/2018":124.99,"04/2018":125.00,"05/2018":114.84,"06/2018":114.85,"07/2018":118.72,"08/2018":121.44,"09/2018":122.29,"10/2018":126.14,"11/2018":123.07,"12/2018":107.42,"01/2019":116.38,"02/2019":122.44,"03/2019":123.68,"04/2019":126.90,"05/2019":119.94,"06/2019":120.12,"07/2019":119.20,"08/2019":116.60,"09/2019":112.90,"10/2019":98.55,"11/2019":102.31,"12/2019":94.57,"01/2020":103.59,"02/2020":106.56,"03/2020":94.74,"04/2020":86.35,"05/2020":86.51,"06/2020":84.99,"07/2020":82.32,"08/2020":70.29,"09/2020":69.53,"10/2020":77.05,"11/2020":80.30,"12/2020":73.25,"01/2021":84.84,"02/2021":84.45,"03/2021":85.21,"04/2021":86.25,"05/2021":80.70,"06/2021":79.84,"07/2021":76.99,"08/2021":79.87,"09/2021":77.41,"10/2021":83.60,"11/2021":84.37,"12/2021":85.28,"01/2022":79.81,"02/2022":83.40,"03/2022":87.95,"04/2022":84.19,"05/2022":86.28,"06/2022":87.41,"07/2022":86.50,"08/2022":85.30,"09/2022":81.58,"10/2022":83.43,"11/2022":86.35,"12/2022":81.94,"01/2023":84.24,"02/2023":86.67,"03/2023":88.01,"04/2023":92.42,"05/2023":91.47,"06/2023":91.25,"07/2023":92.61,"08/2023":92.60,"09/2023":91.30,"10/2023":89.55,"11/2023":93.92,"12/2023":94.07,"01/2024":90.04,"02/2024":91.81,"03/2024":96.32,"04/2024":95.78,"05/2024":95.58,"06/2024":95.32,"07/2024":99.16,"08/2024":95.44,"09/2024":94.23,"10/2024":97.15,"11/2024":99.33,"12/2024":103.35,"01/2025":99.89,"02/2025":106.35,"03/2025":105.25,"04/2025":105.87,"05/2025":104.30,"06/2025":108.39,"07/2025":104.55,"08/2025":103.97,"09/2025":101.10,"10/2025":101.12,"11/2025":111.49,"12/2025":116.63,"01/2026":118.13},
"20744": {"01/2018":40.56,"02/2018":41.32,"03/2018":41.32,"04/2018":40.83,"05/2018":40.11,"06/2018":39.75,"07/2018":39.09,"08/2018":38.73,"09/2018":38.88,"10/2018":38.53,"11/2018":37.24,"12/2018":37.24,"01/2019":37.52,"02/2019":38.37,"03/2019":37.70,"04/2019":37.07,"05/2019":36.39,"06/2019":35.90,"07/2019":35.15,"08/2019":34.97,"09/2019":34.90,"10/2019":34.21,"11/2019":33.07,"12/2019":32.75,"01/2020":34.04,"02/2020":33.86,"03/2020":32.57,"04/2020":29.12,"05/2020":29.64,"06/2020":29.34,"07/2020":28.67,"08/2020":28.78,"09/2020":30.09,"10/2020":30.00,"11/2020":28.27,"12/2020":29.63,"01/2021":29.66,"02/2021":30.29,"03/2021":29.90,"04/2021":28.78,"05/2021":29.42,"06/2021":29.36,"07/2021":29.53,"08/2021":29.82,"09/2021":30.82,"10/2021":32.37,"11/2021":32.90,"12/2021":34.47,"01/2022":35.47,"02/2022":36.16,"03/2022":36.59,"04/2022":36.81,"05/2022":36.81,"06/2022":36.22,"07/2022":36.91,"08/2022":37.41,"09/2022":37.46,"10/2022":46.79,"11/2022":44.45,"12/2022":39.25,"01/2023":39.32,"02/2023":39.65,"03/2023":39.29,"04/2023":39.16,"05/2023":38.99,"06/2023":38.94,"07/2023":38.54,"08/2023":38.30,"09/2023":38.07,"10/2023":37.36,"11/2023":37.26,"12/2023":38.12,"01/2024":38.48,"02/2024":38.65,"03/2024":38.07,"04/2024":38.54,"05/2024":38.79,"06/2024":38.71,"07/2024":38.55,"08/2024":38.08,"09/2024":38.38,"10/2024":38.72,"11/2024":39.06,"12/2024":40.83,"01/2025":41.14,"02/2025":40.86,"03/2025":44.04,"04/2025":59.06,"05/2025":55.60,"06/2025":56.26,"07/2025":55.47,"08/2025":56.30,"09/2025":58.44,"10/2025":59.04,"11/2025":57.13,"12/2025":56.20,"01/2026":57.38,"02/2026":59.41,"03/2026":56.77}
};

const MODALIDADES = {
    "pf-veic":          { nome: "PF — Aquisição de veículos",              serie: "20749", manual: false, base: "anual", aviso: null },
    "pf-bens":          { nome: "PF — Aquisição de outros bens",           serie: "20750", manual: true,  base: "anual", aviso: null },
    "pf-naoconsig":     { nome: "PF — Crédito pessoal não consignado",     serie: "20742", manual: false, base: "anual", aviso: "Atenção: empréstimos com garantia de veículo (home equity sobre veículo) caem nesta modalidade, NÃO em aquisição de veículos. Tribunais já cassaram revisionais por uso da série errada." },
    "pf-consig-total":  { nome: "PF — Consignado total",                   serie: "20739", manual: true,  base: "anual", aviso: null },
    "pf-consig-inss":   { nome: "PF — Consignado INSS",                    serie: "20746", manual: true,  base: "anual", aviso: null },
    "pf-consig-pub":    { nome: "PF — Consignado servidor público",        serie: "20741", manual: true,  base: "anual", aviso: null },
    "pf-consig-priv":   { nome: "PF — Consignado setor privado",           serie: "20744", manual: false, base: "anual", aviso: "Esta é a modalidade do Pine Varejo e similares (Lei 14.131/2021). Confira no app/contrato a vinculação com empregador." },
    "pf-cheque":        { nome: "PF — Cheque especial",                    serie: "20735", manual: true,  base: "anual", aviso: "Atenção: pós-06/01/2020, há teto regulamentar de 8% a.m. (Res. CMN 4.765/2019)." },
    "pf-cartao-rot":    { nome: "PF — Cartão de crédito rotativo",         serie: "20753", manual: true,  base: "anual", aviso: "Atenção: Lei 14.181/2021 impõe teto após 30/2024 — verificar regra vigente." },
    "pf-cartao-parc":   { nome: "PF — Cartão de crédito parcelado",        serie: "20754", manual: true,  base: "anual", aviso: null },
    "pf-rmc":           { nome: "PF — Cartão consignado RMC",              serie: "20739", manual: true,  base: "anual", aviso: "RMC não tem série própria. A tese típica é vício de consentimento + conversão em consignado tradicional. Use a série do consignado total (20739) como parâmetro." },
    "pf-leasing":       { nome: "PF — Leasing financeiro (veículos)",      serie: "20749", manual: true,  base: "anual", aviso: "Leasing tem regime jurídico próprio (Súmula 293/STJ, Res. CMN). Use a série do bem subjacente como parâmetro, mas mantenha as defesas específicas." },
    "pj-veic":          { nome: "PJ — Aquisição de veículos",              serie: "20728", manual: true,  base: "anual", aviso: "Verifique se o CDC se aplica (vulnerabilidade técnica/jurídica/econômica). Em PJ comum, art. 421-A do CC presume paridade." },
    "pj-bens":          { nome: "PJ — Aquisição de outros bens",           serie: "20729", manual: true,  base: "anual", aviso: null },
    "pj-cg365":         { nome: "PJ — Capital de giro até 365 dias",       serie: "20708", manual: true,  base: "anual", aviso: "CRÍTICO: confirme o prazo final (data + parcelas). Se ultrapassar 365 dias, a série correta é 20709." },
    "pj-cg365mais":     { nome: "PJ — Capital de giro acima de 365 dias",  serie: "20709", manual: true,  base: "anual", aviso: null },
    "pj-cg-rot":        { nome: "PJ — Capital de giro rotativo",           serie: "20711", manual: true,  base: "anual", aviso: null },
    "pj-contagar":      { nome: "PJ — Conta garantida",                    serie: "20712", manual: true,  base: "anual", aviso: null },
    "pj-cheque":        { nome: "PJ — Cheque especial",                    serie: "20710", manual: true,  base: "anual", aviso: null },
    "pj-duplic":        { nome: "PJ — Desconto de duplicatas",             serie: "20706", manual: true,  base: "anual", aviso: null },
    "pj-vendor":        { nome: "PJ — Vendor",                             serie: "20716", manual: true,  base: "anual", aviso: null },
};

const TARIFAS_CHECKLIST = [
    { id: "tc",     nome: "Tarifa de Cadastro (TC)",                        descricao: "Cobrança pelo cadastramento inicial do cliente. Válida apenas no INÍCIO do relacionamento bancário, em uma única operação.",                             fundamento: "Tema 618/STJ — REsp 1.251.331/RS",            regra: "multiplas",           peso: "media" },
    { id: "tac",    nome: "TAC — Tarifa de Abertura de Crédito",            descricao: "Cobrança vedada em contratos firmados após 30/04/2008.",                                                                                                   fundamento: "Tema 618/STJ; Res. CMN 3.518/2007",           regra: "data-2008-04-30",     peso: "forte" },
    { id: "tec",    nome: "TEC — Tarifa de Emissão de Carnê",               descricao: "Cobrança vedada em contratos firmados após 30/04/2008.",                                                                                                   fundamento: "Tema 618/STJ; Res. CMN 3.518/2007",           regra: "data-2008-04-30",     peso: "forte" },
    { id: "tab",    nome: "Tarifa de Avaliação do Bem (TAB)",                descricao: "Cobrança lícita apenas se houver prova da efetiva avaliação física do bem (laudo, vistoria).",                                                            fundamento: "Tema 1058/STJ — REsp 1.702.899/SP",           regra: "prova-servico",       peso: "forte" },
    { id: "treg",   nome: "Tarifa de Registro de Contrato",                 descricao: "Cobrança em contratos pós-25/02/2011 depende de prova do efetivo registro (comprovante do cartório/Detran).",                                             fundamento: "Tema 958/STJ — REsp 1.578.553/SP",            regra: "prova-servico",       peso: "media-forte" },
    { id: "tgrav",  nome: "Tarifa de Inserção de Gravame Eletrônico",       descricao: "Tarifa de pré-gravame é tida como abusiva quando cobrada do consumidor (Tema 958/STJ, tese 1.3).",                                                        fundamento: "Tema 958/STJ, tese 1.3",                      regra: "data-2011-02-25",     peso: "forte" },
    { id: "iof",    nome: "IOF financiado",                                 descricao: "IOF é tributo federal. Sua inclusão no principal só pode ocorrer dentro do percentual legal e com transparência. O ônus de demonstrar correta aplicação é do banco.", fundamento: "art. 6º, III, CDC; Resolução CMN 3.517/2007", regra: "transparencia",  peso: "fraca" },
    { id: "tps",    nome: "Taxa de Pagamento de Serviços / Tarifas mensais",descricao: "Tarifas mensais em mútuo, sem padrão normativo do BACEN (Res. CMN 3.518/2007), são presumivelmente abusivas.",                                           fundamento: "Princípio da tipicidade tarifária; art. 39, V, CDC", regra: "tipicidade",  peso: "media" },
    { id: "outras", nome: "Tarifas atípicas (administração, serviços de terceiros, assistência etc.)", descricao: "Toda tarifa atípica deve ser impugnada por ausência de previsão padronizadora e/ou ausência de prova do serviço.",               fundamento: "art. 39, I e V, CDC; Tema 618/STJ",           regra: "tipicidade",          peso: "media" },
];

// ============================================
// PARTE II — ESTADO E UTILITÁRIOS
// ============================================

let estado = inicializarEstado();
let stepAtual = 1;
let resultadoCalculado = null;

function inicializarEstado() {
    return {
        cliente: { nome: "", doc: "", tipo: "PF", vulnerab: "" },
        contrato: { banco: "", numero: "", data: "", modalidade: "", detalhe: "" },
        valores: {
            liberado: 0, financiado: 0, parcelas: 0, valorParcela: 0,
            taxaAM: 0, taxaAA: 0, cetAM: 0, cetAA: 0, iof: 0,
            sistemaAmort: "price", taxaBacenManual: 0
        },
        tarifas: {},
        tarifasOutras: { nome: "", valor: 0 },
        seguro: { tem: "nao", valor: 0, seguradora: "", mesmoGrupo: "nao-sei", opcao: "nao-sei" },
        outrosProdutos: { descricao: "", valor: 0, condicao: "nao-sei" },
        capitalizacao: { pactuada: "nao-sei", taxaDiariaInfo: "na" },
        mora: { comPermanencia: "nao", comPermCumul: "na", multaMora: 0, jurosMora: 0 },
        garantia: "",
        vencAntecip: "nao-sei",
        atual: { parcelasPagas: 0, emMora: "nao", acaoBanco: "nao", refinPortabil: "nao" }
    };
}

function formatarMoedaInput(campo) {
    let valor = campo.value.replace(/\D/g, "");
    if (!valor) { campo.value = ""; return; }
    valor = (Number(valor) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
    campo.value = valor;
}
function paraNumero(v) {
    if (!v) return 0;
    if (typeof v === "number") return v;
    const lim = v.toString().replace(/[^\d,-]/g, "").replace(",", ".");
    const n = parseFloat(lim);
    return isNaN(n) ? 0 : n;
}
function paraNumeroBR(v) {
    if (!v) return 0;
    if (typeof v === "number") return v;
    const lim = v.toString().replace(/\D/g, "");
    if (!lim) return 0;
    return Number(lim) / 100;
}
function fmt(v) {
    if (v == null || isNaN(v)) return "R$ 0,00";
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtPct(v, casas = 2) {
    if (v == null || isNaN(v)) return "—";
    return v.toFixed(casas).replace(".", ",") + "%";
}
function fmtNum(v, casas = 2) {
    if (v == null || isNaN(v)) return "—";
    return v.toFixed(casas).replace(".", ",");
}
function aaParaAm(taxaAa) { return (Math.pow(1 + taxaAa / 100, 1 / 12) - 1) * 100; }
function amParaAa(taxaAm) { return (Math.pow(1 + taxaAm / 100, 12) - 1) * 100; }
function calcularPMT(pv, taxaMensal, n) {
    const i = taxaMensal / 100;
    if (i === 0) return pv / n;
    return (pv * i) / (1 - Math.pow(1 + i, -n));
}
function calcularPV(pmt, taxaMensal, n) {
    const i = taxaMensal / 100;
    if (i === 0) return pmt * n;
    return pmt * (1 - Math.pow(1 + i, -n)) / i;
}
function calcularTIR(pv, pmt, n, chuteInicial = 0.02) {
    let i = chuteInicial;
    for (let iter = 0; iter < 200; iter++) {
        const f = pmt * (1 - Math.pow(1 + i, -n)) / i - pv;
        const fLinha = pmt * ((n * Math.pow(1 + i, -n - 1)) / i - (1 - Math.pow(1 + i, -n)) / (i * i));
        if (Math.abs(fLinha) < 1e-12) break;
        const novoI = i - f / fLinha;
        if (Math.abs(novoI - i) < 1e-9) return novoI * 100;
        i = novoI;
        if (i < -0.99) i = 0.001;
        if (i > 10) i = 1;
    }
    return i * 100;
}

function goToStep(n) {
    // Auto-save da análise BACEN
    (async function() {
      if (!window._sb || !window._currentUser || typeof coletarDados !== 'function') return;
      coletarDados(stepAtual);
      const e = estado;
      const nomeCli = (e.cliente && e.cliente.nome) ? e.cliente.nome : '';
      const banco   = (e.contrato && e.contrato.banco) ? e.contrato.banco : '';
      if (!nomeCli && !banco) return;

      const { data: existentes } = await window._sb
        .from('bacen_analises')
        .select('id')
        .eq('user_id', window._currentUser.id)
        .eq('nome_cliente', nomeCli)
        .eq('banco', banco)
        .limit(1);

      if (existentes && existentes.length > 0) {
        await window._sb.from('bacen_analises').update({
          atualizado_em:   new Date().toISOString(),
          dados_completos: JSON.parse(JSON.stringify(e))
        }).eq('id', existentes[0].id);
      } else {
        await window._sb.from('bacen_analises').insert({
          user_id:         window._currentUser.id,
          nome_cliente:    nomeCli,
          banco:           banco,
          dados_completos: JSON.parse(JSON.stringify(e))
        });
      }
    })();

    coletarDados(stepAtual);
    document.querySelectorAll('[id^="platStep"]').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('[data-plat-step-nav]').forEach(el => el.classList.add('hidden'));
    document.getElementById('platStep' + n).classList.remove('hidden');
    document.querySelector('[data-plat-step-nav="' + n + '"]').classList.remove('hidden');
    document.querySelectorAll('.plat-step-pill').forEach(p => {
        const sn = parseInt(p.getAttribute('data-plat-step'));
        p.classList.remove('active');
        if (sn === n) p.classList.add('active');
        if (sn < n) p.classList.add('completed');
        else p.classList.remove('completed');
    });
    stepAtual = n;
    if (n === 5) atualizarTestesCapitalizacao();
    document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
}

function coletarDados(step) {
    if (step === 1) {
        estado.cliente.nome = document.getElementById('cliNome').value.trim();
        estado.cliente.doc = document.getElementById('cliDoc').value.trim();
        estado.cliente.tipo = document.querySelector('input[name="cliTipo"]:checked')?.value || "PF";
        estado.cliente.vulnerab = document.getElementById('cliVulnerab').value;
        estado.contrato.banco = document.getElementById('banco').value.trim();
        estado.contrato.numero = document.getElementById('numContrato').value.trim();
        estado.contrato.data = document.getElementById('dataContrato').value;
        estado.contrato.modalidade = document.getElementById('modalidade').value;
        estado.contrato.detalhe = document.getElementById('modalidadeDetalhe').value.trim();
    }
    if (step === 2) {
        estado.valores.liberado = paraNumeroBR(document.getElementById('vLiberado').value);
        estado.valores.financiado = paraNumeroBR(document.getElementById('vFinanciado').value);
        estado.valores.parcelas = parseInt(document.getElementById('nParcelas').value) || 0;
        estado.valores.valorParcela = paraNumeroBR(document.getElementById('vParcela').value);
        estado.valores.taxaAM = parseFloat(document.getElementById('taxaAM').value) || 0;
        estado.valores.taxaAA = parseFloat(document.getElementById('taxaAA').value) || 0;
        estado.valores.cetAM = parseFloat(document.getElementById('cetAM').value) || 0;
        estado.valores.cetAA = parseFloat(document.getElementById('cetAA').value) || 0;
        estado.valores.iof = paraNumeroBR(document.getElementById('iof').value);
        estado.valores.sistemaAmort = document.getElementById('sistemaAmort').value;
        estado.valores.taxaBacenManual = parseFloat(document.getElementById('taxaBacenManual').value) || 0;
    }
    if (step === 3) {
        estado.tarifas = {};
        document.querySelectorAll('.plat-check-item[data-tar-id]').forEach(item => {
            const id = item.getAttribute('data-tar-id');
            const ativada = item.classList.contains('activated');
            const valorInput = item.querySelector('input[type="text"]');
            estado.tarifas[id] = { ativada, valor: ativada ? paraNumeroBR(valorInput.value) : 0 };
        });
        estado.tarifasOutras.nome = document.getElementById('tarifasOutras').value.trim();
        estado.tarifasOutras.valor = paraNumeroBR(document.getElementById('tarifasOutrasValor').value);
    }
    if (step === 4) {
        estado.seguro.tem = document.querySelector('input[name="seguroSimNao"]:checked')?.value || "nao";
        estado.seguro.valor = paraNumeroBR(document.getElementById('seguroValor').value);
        estado.seguro.seguradora = document.getElementById('seguroSeguradora').value.trim();
        estado.seguro.mesmoGrupo = document.querySelector('input[name="seguroMesmoGrupo"]:checked')?.value || "nao-sei";
        estado.seguro.opcao = document.querySelector('input[name="seguroOpcao"]:checked')?.value || "nao-sei";
        estado.outrosProdutos.descricao = document.getElementById('outrosProd').value.trim();
        estado.outrosProdutos.valor = paraNumeroBR(document.getElementById('outrosProdValor').value);
        estado.outrosProdutos.condicao = document.querySelector('input[name="outrosProdCondicao"]:checked')?.value || "nao-sei";
    }
    if (step === 5) {
        estado.capitalizacao.pactuada = document.querySelector('input[name="capPactuada"]:checked')?.value || "nao-sei";
        estado.capitalizacao.taxaDiariaInfo = document.querySelector('input[name="capTaxaDiariaInfo"]:checked')?.value || "na";
    }
    if (step === 6) {
        estado.mora.comPermanencia = document.querySelector('input[name="comPermanencia"]:checked')?.value || "nao";
        estado.mora.comPermCumul = document.querySelector('input[name="comPermCumul"]:checked')?.value || "na";
        estado.mora.multaMora = parseFloat(document.getElementById('multaMora').value) || 0;
        estado.mora.jurosMora = parseFloat(document.getElementById('jurosMora').value) || 0;
        estado.garantia = document.getElementById('garantia').value;
        estado.vencAntecip = document.querySelector('input[name="vencAntecip"]:checked')?.value || "nao-sei";
        estado.atual.parcelasPagas = parseInt(document.getElementById('parcelasPagas').value) || 0;
        estado.atual.emMora = document.querySelector('input[name="emMora"]:checked')?.value || "nao";
        estado.atual.acaoBanco = document.querySelector('input[name="acaoBanco"]:checked')?.value || "nao";
        estado.atual.refinPortabil = document.querySelector('input[name="refinPortabil"]:checked')?.value || "nao";
    }
}

function aplicarEstadoAosCampos() {
    document.getElementById('cliNome').value = estado.cliente.nome;
    document.getElementById('cliDoc').value = estado.cliente.doc;
    setRadio('cliTipo', estado.cliente.tipo);
    document.getElementById('cliVulnerab').value = estado.cliente.vulnerab;
    document.getElementById('banco').value = estado.contrato.banco;
    document.getElementById('numContrato').value = estado.contrato.numero;
    document.getElementById('dataContrato').value = estado.contrato.data;
    document.getElementById('modalidade').value = estado.contrato.modalidade;
    document.getElementById('modalidadeDetalhe').value = estado.contrato.detalhe;
    document.getElementById('vLiberado').value = estado.valores.liberado ? fmt(estado.valores.liberado) : "";
    document.getElementById('vFinanciado').value = estado.valores.financiado ? fmt(estado.valores.financiado) : "";
    document.getElementById('nParcelas').value = estado.valores.parcelas || "";
    document.getElementById('vParcela').value = estado.valores.valorParcela ? fmt(estado.valores.valorParcela) : "";
    document.getElementById('taxaAM').value = estado.valores.taxaAM || "";
    document.getElementById('taxaAA').value = estado.valores.taxaAA || "";
    document.getElementById('cetAM').value = estado.valores.cetAM || "";
    document.getElementById('cetAA').value = estado.valores.cetAA || "";
    document.getElementById('iof').value = estado.valores.iof ? fmt(estado.valores.iof) : "";
    document.getElementById('sistemaAmort').value = estado.valores.sistemaAmort;
    setRadio('seguroSimNao', estado.seguro.tem);
    document.getElementById('seguroValor').value = estado.seguro.valor ? fmt(estado.seguro.valor) : "";
    document.getElementById('seguroSeguradora').value = estado.seguro.seguradora;
    setRadio('seguroMesmoGrupo', estado.seguro.mesmoGrupo);
    setRadio('seguroOpcao', estado.seguro.opcao);
    document.getElementById('outrosProd').value = estado.outrosProdutos.descricao;
    document.getElementById('outrosProdValor').value = estado.outrosProdutos.valor ? fmt(estado.outrosProdutos.valor) : "";
    setRadio('outrosProdCondicao', estado.outrosProdutos.condicao);
    setRadio('capPactuada', estado.capitalizacao.pactuada);
    setRadio('capTaxaDiariaInfo', estado.capitalizacao.taxaDiariaInfo);
    setRadio('comPermanencia', estado.mora.comPermanencia);
    setRadio('comPermCumul', estado.mora.comPermCumul);
    document.getElementById('multaMora').value = estado.mora.multaMora || "";
    document.getElementById('jurosMora').value = estado.mora.jurosMora || "";
    document.getElementById('garantia').value = estado.garantia;
    setRadio('vencAntecip', estado.vencAntecip);
    document.getElementById('parcelasPagas').value = estado.atual.parcelasPagas || "";
    setRadio('emMora', estado.atual.emMora);
    setRadio('acaoBanco', estado.atual.acaoBanco);
    setRadio('refinPortabil', estado.atual.refinPortabil);
    Object.keys(estado.tarifas).forEach(id => {
        const item = document.querySelector(`.plat-check-item[data-tar-id="${id}"]`);
        if (item) {
            if (estado.tarifas[id].ativada) item.classList.add('activated');
            const valorInput = item.querySelector('input[type="text"]');
            if (valorInput) valorInput.value = estado.tarifas[id].valor ? fmt(estado.tarifas[id].valor) : "";
        }
    });
    atualizarTotaisTarifas();
}

function setRadio(name, value) {
    document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
        r.checked = (r.value === value);
        const pill = r.closest('.plat-opt-pill');
        if (pill) pill.classList.toggle('checked', r.checked);
    });
}

function atualizarTaxas(origem) {
    const elAM = document.getElementById('taxaAM');
    const elAA = document.getElementById('taxaAA');
    const elCAM = document.getElementById('cetAM');
    const elCAA = document.getElementById('cetAA');
    if (origem === 'am' && elAM.value) {
        const am = parseFloat(elAM.value);
        if (!isNaN(am)) elAA.value = amParaAa(am).toFixed(4);
    } else if (origem === 'aa' && elAA.value) {
        const aa = parseFloat(elAA.value);
        if (!isNaN(aa)) elAM.value = aaParaAm(aa).toFixed(4);
    } else if (origem === 'cetam' && elCAM.value) {
        const am = parseFloat(elCAM.value);
        if (!isNaN(am)) elCAA.value = amParaAa(am).toFixed(4);
    } else if (origem === 'cetaa' && elCAA.value) {
        const aa = parseFloat(elCAA.value);
        if (!isNaN(aa)) elCAM.value = aaParaAm(aa).toFixed(4);
    }
    validarTaxasInline();
}

function validarTaxasInline() {
    const alertas = document.getElementById('taxasAlertas');
    if (!alertas) return;
    const am = parseFloat(document.getElementById('taxaAM').value);
    const aa = parseFloat(document.getElementById('taxaAA').value);
    const cam = parseFloat(document.getElementById('cetAM').value);
    const pv = paraNumeroBR(document.getElementById('vFinanciado').value);
    const pmt = paraNumeroBR(document.getElementById('vParcela').value);
    const n = parseInt(document.getElementById('nParcelas').value);
    let html = "";
    if (!isNaN(am) && !isNaN(aa) && am > 0 && aa > 0) {
        const aaCalc = amParaAa(am);
        const diff = Math.abs(aaCalc - aa);
        if (diff > 0.5) {
            html += `<div class="plat-alert medio"><div class="plat-alert-title">⚠ Possível capitalização não pactuada</div>Taxa anual contratada (${fmtPct(aa)}) diverge do composto da mensal (${fmtPct(aaCalc)}). Diferença: ${fmtPct(diff, 2)} p.p.</div>`;
        }
    }
    if (!isNaN(am) && !isNaN(cam) && am > 0 && cam > 0) {
        const diff = cam - am;
        if (diff > 0.5) {
            html += `<div class="plat-alert fraco"><div class="plat-alert-title">CET acima da taxa nominal</div>CET (${fmtPct(cam)}) supera taxa de juros (${fmtPct(am)}) em ${fmtPct(diff, 2)} p.p. ao mês.</div>`;
        }
    }
    if (pv > 0 && pmt > 0 && n > 0 && !isNaN(am) && am > 0) {
        const pvCalc = calcularPV(pmt, am, n);
        const dif = pvCalc - pv;
        const pctDif = (dif / pv) * 100;
        if (Math.abs(pctDif) > 1) {
            const tipo = pctDif > 0 ? "fraco" : "info";
            html += `<div class="plat-alert ${tipo}"><div class="plat-alert-title">${pctDif > 0 ? "⚠" : "ⓘ"} Coerência financeira</div>PV recalculado: <strong>${fmt(pvCalc)}</strong> vs declarado: <strong>${fmt(pv)}</strong>. Diferença: ${fmt(Math.abs(dif))} (${fmtPct(Math.abs(pctDif), 1)}).</div>`;
        }
    }
    if (pv > 0 && pmt > 0 && n > 0) {
        const tirAM = calcularTIR(pv, pmt, n);
        if (!isNaN(tirAM) && !isNaN(am) && Math.abs(tirAM - am) > 0.3) {
            html += `<div class="plat-alert fraco"><div class="plat-alert-title">TIR vs taxa contratada</div>TIR calculada (${fmtPct(tirAM, 3)} a.m.) diverge da taxa contratada (${fmtPct(am)} a.m.) em ${fmtPct(Math.abs(tirAM - am), 3)} p.p.</div>`;
        }
    }
    alertas.innerHTML = html;
}

// ============================================
// PARTE III — MODALIDADE / BACEN / TARIFAS
// ============================================

function onModalidadeChange() {
    const select = document.getElementById('modalidade');
    const key = select.value;
    const alertBox = document.getElementById('modAlert');
    if (!key) { alertBox.classList.add('hidden'); alertBox.innerHTML = ""; return; }
    const mod = MODALIDADES[key];
    const temDados = TAXAS_BACEN[mod.serie] && Object.keys(TAXAS_BACEN[mod.serie]).length > 0;
    let html = "";
    if (temDados) {
        html += `<div class="plat-alert success"><div class="plat-alert-title">Taxa BACEN disponível</div>Esta modalidade usa a série <strong>${mod.serie}</strong>, atualizada automaticamente via API do Banco Central. A taxa será preenchida conforme a data de contratação.</div>`;
    } else if (window._bacenCarregando) {
        html += `<div class="plat-alert info"><div class="plat-alert-title">⏳ Buscando dados do BACEN...</div>Aguarde — estamos consultando a série <strong>${mod.serie}</strong> direto no Banco Central. Se não carregar, informe manualmente.</div>`;
    } else {
        html += `<div class="plat-alert info"><div class="plat-alert-title">Informe a taxa manualmente</div>Não foi possível carregar a série <strong>${mod.serie}</strong> automaticamente. Informe a taxa no campo da Etapa 2.<br><a href="https://www3.bcb.gov.br/sgspub/consultarvalores/consultarValoresSeries.do?method=consultarGraficoPorId&hdOidSeriesSelecionadas=${mod.serie}" target="_blank">Consultar série ${mod.serie} no SGS</a></div>`;
    }
    if (mod.aviso) {
        html += `<div class="plat-alert medio"><div class="plat-alert-title">Atenção técnica</div>${mod.aviso}</div>`;
    }
    alertBox.innerHTML = html;
    alertBox.classList.remove('hidden');
    setTimeout(atualizarTaxaBacen, 50);
}

function onDataContratoChange() { setTimeout(atualizarTaxaBacen, 50); }

function atualizarTaxaBacen() {
    const modKey = document.getElementById('modalidade').value;
    const dataContr = document.getElementById('dataContrato').value;
    const inputBacen = document.getElementById('taxaBacenManual');
    const info = document.getElementById('bacenInfo');
    const hintBacen = document.getElementById('hintBacen');
    if (!modKey) {
        inputBacen.value = ""; inputBacen.disabled = true;
        info.innerHTML = ""; info.className = "plat-val-indicator";
        hintBacen.textContent = "— escolha a modalidade na Etapa 1 primeiro";
        return;
    }
    const mod = MODALIDADES[modKey];
    const taxas = TAXAS_BACEN[mod.serie];
    const temDados = taxas && Object.keys(taxas).length > 0;
    inputBacen.disabled = false;
    hintBacen.innerHTML = `Série <strong>${mod.serie}</strong> · <a href="https://www3.bcb.gov.br/sgspub/consultarvalores/consultarValoresSeries.do?method=consultarGraficoPorId&hdOidSeriesSelecionadas=${mod.serie}" target="_blank">consultar no SGS</a>`;
    if (!temDados) {
        inputBacen.placeholder = window._bacenCarregando
            ? `⏳ Buscando série ${mod.serie}...`
            : `Informe a taxa BACEN da série ${mod.serie} manualmente (% a.a.)`;
        if (!inputBacen.value) {
            info.innerHTML = window._bacenCarregando
                ? `⏳ Consultando BACEN — aguarde...`
                : `Não disponível — informe a taxa manualmente (% a.a.)`;
            info.className = "plat-val-indicator warn";
        }
        return;
    }
    hintBacen.innerHTML += ` · atualizado via API`;
    if (!dataContr) { inputBacen.placeholder = "Preencha a data de contratação na Etapa 1"; info.innerHTML = ""; return; }
    const [aaaa, mm] = dataContr.split("-");
    const chave = `${mm}/${aaaa}`;
    if (taxas[chave] != null) {
        inputBacen.value = taxas[chave].toString().replace(".", ",");
        const am = aaParaAm(taxas[chave]);
        info.innerHTML = `✓ Série ${mod.serie} · ${chave}: ${fmtPct(taxas[chave])} a.a. (${fmtPct(am, 4)} a.m.)`;
        info.className = "plat-val-indicator ok";
    } else {
        inputBacen.value = "";
        info.innerHTML = `⚠ Mês ${chave} sem dados disponíveis. Informe manualmente (% a.a.).`;
        info.className = "plat-val-indicator warn";
        inputBacen.placeholder = "Informe a taxa BACEN do mês manualmente (% a.a.)";
    }
}

function renderTarifas() {
    const container = document.getElementById('tarifasContainer');
    container.innerHTML = "";
    TARIFAS_CHECKLIST.forEach(tar => {
        const item = document.createElement('div');
        item.className = 'plat-check-item';
        item.setAttribute('data-tar-id', tar.id);
        item.innerHTML = `
            <div class="plat-check-toggle" onclick="platToggleTarifa('${tar.id}')">✓</div>
            <div>
                <div class="plat-check-title">${tar.nome}</div>
                <div class="plat-check-desc">${tar.descricao}</div>
                <div class="plat-check-fundamento">Fundamento: ${tar.fundamento}</div>
            </div>
            <div class="plat-check-value">
                <label>Valor (R$)</label>
                <input type="text" placeholder="R$ 0,00" oninput="platFormatarMoedaInput(this); platAtualizarTotaisTarifas();">
            </div>`;
        container.appendChild(item);
    });
}

function toggleTarifa(id) {
    const item = document.querySelector(`.plat-check-item[data-tar-id="${id}"]`);
    item.classList.toggle('activated');
    atualizarTotaisTarifas();
}

function atualizarTotaisTarifas() {
    let total = 0, count = 0;
    document.querySelectorAll('.plat-check-item[data-tar-id].activated').forEach(item => {
        const v = paraNumeroBR(item.querySelector('input[type="text"]').value);
        total += v; count++;
    });
    total += paraNumeroBR(document.getElementById('tarifasOutrasValor')?.value || "");
    if (document.getElementById('tarifasOutras')?.value.trim()) count++;
    document.getElementById('tarifasCount').textContent = count;
    document.getElementById('tarifasTotal').textContent = fmt(total);
    const pv = paraNumeroBR(document.getElementById('vFinanciado').value) || estado.valores.financiado;
    if (pv > 0) document.getElementById('tarifasPct').textContent = fmtPct((total / pv) * 100);
}

function atualizarTestesCapitalizacao() {
    const am = parseFloat(document.getElementById('taxaAM').value);
    const aa = parseFloat(document.getElementById('taxaAA').value);
    const dataContr = document.getElementById('dataContrato').value;
    const duoBox = document.getElementById('duodecupTest');
    const sumBox = document.getElementById('sumula121Test');
    if (!isNaN(am) && !isNaN(aa) && am > 0 && aa > 0) {
        const aaCalc = amParaAa(am);
        const aaDuod = am * 12;
        const diffComp = aa - aaCalc;
        let classe = "info", titulo = "Teste do duodécuplo — resultado neutro";
        let corpo = `Taxa mensal: <strong>${fmtPct(am)}</strong> · Taxa anual contratada: <strong>${fmtPct(aa)}</strong> · Composto da mensal: <strong>${fmtPct(aaCalc)}</strong> · Duodécuplo simples: <strong>${fmtPct(aaDuod)}</strong>.`;
        if (Math.abs(diffComp) <= 0.3) {
            classe = "success"; titulo = "✓ Taxa anual coerente com a mensal composta";
            corpo += " A taxa anual confere com o composto da mensal (≤ 0,3 p.p.). Indica pactuação clara da capitalização.";
        } else if (aa < aaCalc) {
            classe = "fraco"; titulo = "⚠ Taxa anual INFERIOR ao composto da mensal";
            corpo += ` Diferença de <strong>${fmtPct(Math.abs(diffComp), 2)} p.p.</strong> Indício de capitalização não pactuada (Súmula 541/STJ).`;
        } else {
            classe = "medio"; titulo = "⚠ Taxa anual superior ao composto — verificar";
            corpo += ` Diferença de <strong>${fmtPct(diffComp, 2)} p.p.</strong>. Verificar capitalização múltipla ou erro de cálculo.`;
        }
        duoBox.className = `plat-alert ${classe}`;
        duoBox.innerHTML = `<div class="plat-alert-title">${titulo}</div>${corpo}`;
    }
    if (dataContr) {
        const [aaaa, mmc] = dataContr.split("-").map(Number);
        const dataNum = aaaa * 12 + mmc;
        const corteSumula121 = 2000 * 12 + 3;
        if (dataNum < corteSumula121) {
            sumBox.className = "plat-alert forte";
            sumBox.innerHTML = `<div class="plat-alert-title">⛔ Contrato anterior a 31/03/2000</div>Súmula 121/STF: capitalização vedada em contratos anteriores à MP 1.963-17/2000. Tese forte de impugnação.`;
        } else {
            sumBox.className = "plat-alert success";
            sumBox.innerHTML = `<div class="plat-alert-title">✓ Contrato posterior a 31/03/2000</div>Capitalização permitida apenas se pactuada expressamente (Súmula 539/STJ).`;
        }
    }
}

// ============================================
// PARTE IV — CÁLCULO PRINCIPAL
// ============================================

function calcular() {
    for (let s = 1; s <= 6; s++) coletarDados(s);
    const v = estado.valores;
    if (!v.financiado || !v.parcelas || !v.valorParcela || !v.taxaAM) {
        alert("Para calcular, preencha ao menos: valor financiado, parcelas, valor da parcela e taxa mensal (Etapa 2).");
        return;
    }
    if (!estado.contrato.modalidade) { alert("Selecione a modalidade do contrato na Etapa 1."); return; }

    const taxaContratadaAM = v.taxaAM;
    const taxaContratadaAA = v.taxaAA || amParaAa(v.taxaAM);
    const taxaBacenAA = v.taxaBacenManual;
    const taxaBacenAM = taxaBacenAA ? aaParaAm(taxaBacenAA) : 0;
    const cetAM = v.cetAM || (v.cetAA ? aaParaAm(v.cetAA) : 0);
    const pvCalculado = calcularPV(v.valorParcela, taxaContratadaAM, v.parcelas);
    const tirAM = calcularTIR(v.financiado, v.valorParcela, v.parcelas);
    const tirAA = amParaAa(tirAM);

    let tarifasExpurgo = 0, tarifasMarcadas = [];
    TARIFAS_CHECKLIST.forEach(t => {
        const e = estado.tarifas[t.id];
        if (e && e.ativada) { tarifasExpurgo += e.valor; tarifasMarcadas.push({ ...t, valor: e.valor }); }
    });
    if (estado.tarifasOutras.valor > 0) tarifasExpurgo += estado.tarifasOutras.valor;
    if (estado.seguro.tem === "sim") tarifasExpurgo += estado.seguro.valor;
    if (estado.outrosProdutos.valor > 0) tarifasExpurgo += estado.outrosProdutos.valor;

    const totalContratado = v.valorParcela * v.parcelas;
    const jurosContratado = totalContratado - v.financiado;
    let pmtBacen = 0, totalBacen = 0, reducaoConservadora = 0;
    if (taxaBacenAM > 0) {
        pmtBacen = calcularPMT(v.financiado, taxaBacenAM, v.parcelas);
        totalBacen = pmtBacen * v.parcelas;
        reducaoConservadora = totalContratado - totalBacen;
    }
    let pmtBacenExp = 0, totalBacenExp = 0, reducaoOtimista = 0;
    const principalExpurgado = Math.max(0, v.financiado - tarifasExpurgo);
    if (taxaBacenAM > 0) {
        pmtBacenExp = calcularPMT(principalExpurgado, taxaBacenAM, v.parcelas);
        totalBacenExp = pmtBacenExp * v.parcelas;
        reducaoOtimista = totalContratado - totalBacenExp;
    }
    const parcelasPagas = estado.atual.parcelasPagas;
    const valorPagoIndevido = parcelasPagas > 0 ? parcelasPagas * Math.max(0, v.valorParcela - pmtBacen) : 0;
    const restituicaoDobro = valorPagoIndevido * 2;

    const irregularidades = [];
    if (taxaBacenAA > 0) {
        const razao = taxaContratadaAA / taxaBacenAA;
        let peso = "fraca", titulo = "";
        if (razao >= 2.0) { peso = "forte"; titulo = `Taxa de juros superior ao DOBRO da média BACEN (${razao.toFixed(2)}x)`; }
        else if (razao >= 1.5) { peso = "media"; titulo = `Taxa de juros 1,5x ou mais acima da média BACEN (${razao.toFixed(2)}x)`; }
        else if (razao >= 1.2) { peso = "fraca"; titulo = `Taxa de juros entre 1,2x e 1,5x a média BACEN (${razao.toFixed(2)}x)`; }
        if (titulo) irregularidades.push({ peso, titulo, fundamento: "Tema 27/STJ — REsp 1.061.530/RS", detalhe: `Contratada ${fmtPct(taxaContratadaAA)} a.a. (${fmtPct(taxaContratadaAM, 3)} a.m.) versus BACEN ${fmtPct(taxaBacenAA)} a.a. da modalidade ${MODALIDADES[estado.contrato.modalidade].nome} no mês da contratação.` });
    } else {
        irregularidades.push({ peso: "fraca", titulo: "Taxa BACEN da modalidade não informada", fundamento: "metodológico", detalhe: "Sem a taxa BACEN da modalidade, a comparação fica prejudicada." });
    }
    if (cetAM > 0 && taxaContratadaAM > 0) {
        const diff = cetAM - taxaContratadaAM;
        if (diff > 0.5) irregularidades.push({ peso: "media", titulo: `CET (${fmtPct(cetAM)} a.m.) supera taxa nominal em ${fmtPct(diff, 2)} p.p.`, fundamento: "Res. CMN 3.517/2007", detalhe: "Diferença relevante indica tarifas, seguros ou encargos embutidos." });
    } else if (cetAM === 0) {
        irregularidades.push({ peso: "fraca", titulo: "CET não informado no contrato", fundamento: "Res. CMN 3.517/2007 art. 1º; art. 6º, III, CDC", detalhe: "Ausência do CET configura violação ao dever de informação." });
    }
    const difPV = pvCalculado - v.financiado;
    if (Math.abs(difPV) > v.financiado * 0.01 && difPV > 0) {
        irregularidades.push({ peso: "media", titulo: `Encargos embutidos não declarados (${fmt(difPV)})`, fundamento: "art. 39, V, CDC; Princípio da transparência", detalhe: `PV recalculado (${fmt(pvCalculado)}) supera o valor financiado declarado (${fmt(v.financiado)}).` });
    }
    if (taxaContratadaAM > 0 && Math.abs(tirAM - taxaContratadaAM) > 0.3) {
        irregularidades.push({ peso: "fraca", titulo: `TIR (${fmtPct(tirAM, 3)} a.m.) diverge da taxa contratada (${fmtPct(taxaContratadaAM)} a.m.)`, fundamento: "Coerência aritmética; art. 6º, III, CDC", detalhe: `TIR diverge ${fmtPct(Math.abs(tirAM - taxaContratadaAM), 3)} p.p. da taxa declarada.` });
    }
    const dataContrato = estado.contrato.data;
    const [aaaa, mmd] = dataContrato ? dataContrato.split("-").map(Number) : [0, 0];
    const dataNum = aaaa * 12 + mmd;
    const corte2008 = 2008 * 12 + 4, corte2011 = 2011 * 12 + 2;
    tarifasMarcadas.forEach(t => {
        let peso = t.peso === "forte" ? "forte" : (t.peso === "media-forte" ? "media" : (t.peso === "media" ? "media" : "fraca"));
        let detalhe = `Valor: ${fmt(t.valor)}. ${t.descricao}`;
        if (t.regra === "data-2008-04-30" && dataNum > corte2008) { peso = "forte"; detalhe = `${fmt(t.valor)} cobrado em contrato posterior a 30/04/2008 — vedação expressa pela Res. CMN 3.518/2007.`; }
        if (t.regra === "data-2011-02-25" && dataNum > corte2011) { peso = "forte"; detalhe = `${fmt(t.valor)} cobrado em contrato posterior a 25/02/2011 — tese 1.3 do Tema 958/STJ.`; }
        if (t.regra === "prova-servico") detalhe = `${fmt(t.valor)} cobrado sem prova do efetivo serviço/registro/avaliação. Impugnação por inversão do ônus (art. 6º, VIII, CDC).`;
        if (t.regra === "tipicidade") detalhe = `${fmt(t.valor)} cobrado sem padrão tarifário do BACEN (Res. CMN 3.518/2007).`;
        if (t.id === "tc") detalhe = `${fmt(t.valor)} de Tarifa de Cadastro. Válida apenas na PRIMEIRA operação do cliente com o banco.`;
        irregularidades.push({ peso, titulo: `${t.nome} — ${fmt(t.valor)}`, fundamento: t.fundamento, detalhe });
    });
    if (estado.tarifasOutras.valor > 0 && estado.tarifasOutras.nome) {
        irregularidades.push({ peso: "media", titulo: `Tarifa atípica: ${estado.tarifasOutras.nome} — ${fmt(estado.tarifasOutras.valor)}`, fundamento: "art. 39, I e V, CDC; princípio da tipicidade tarifária", detalhe: "Tarifa fora do rol padronizado do BACEN." });
    }
    if (estado.seguro.tem === "sim") {
        let pesoSeg = "fraca", titulo = `Seguro prestamista — ${fmt(estado.seguro.valor)}`;
        let detalhe = "Prestamista é lícito desde que: (a) contratado com liberdade de escolha e (b) prêmio proporcional ao risco.";
        if (estado.seguro.mesmoGrupo === "sim" && estado.seguro.opcao === "nao") {
            pesoSeg = "forte"; titulo = `Venda casada de seguro prestamista — ${fmt(estado.seguro.valor)}`;
            detalhe = `Seguradora "${estado.seguro.seguradora}" do mesmo grupo do banco, sem opção real. Venda casada (Tema 958/STJ tese 2.2; art. 39, I, CDC).`;
        } else if (estado.seguro.mesmoGrupo === "sim" || estado.seguro.opcao === "nao") {
            pesoSeg = "media"; detalhe += " Indício relevante: " + (estado.seguro.mesmoGrupo === "sim" ? "seguradora do mesmo grupo do banco." : "ausência de prova da opção de escolha.");
        } else if (estado.seguro.opcao === "nao-sei") {
            pesoSeg = "media"; detalhe += " Ônus de prova da opção é do banco (Tema 958/STJ).";
        }
        irregularidades.push({ peso: pesoSeg, titulo, fundamento: "Tema 958/STJ, tese 2.2; art. 39, I, CDC", detalhe });
    }
    if (estado.outrosProdutos.valor > 0 && estado.outrosProdutos.condicao === "sim") {
        irregularidades.push({ peso: "forte", titulo: `Produto vinculado como condição: ${estado.outrosProdutos.descricao} (${fmt(estado.outrosProdutos.valor)})`, fundamento: "art. 39, I, CDC", detalhe: "Vinculação como condição do crédito é venda casada típica." });
    } else if (estado.outrosProdutos.valor > 0) {
        irregularidades.push({ peso: "media", titulo: `Produto vinculado: ${estado.outrosProdutos.descricao} (${fmt(estado.outrosProdutos.valor)})`, fundamento: "art. 39, V, CDC", detalhe: "Verificar se houve consentimento livre e informado." });
    }
    if (taxaContratadaAM > 0 && taxaContratadaAA > 0) {
        const aaCalc = amParaAa(taxaContratadaAM);
        if (estado.capitalizacao.pactuada === "nao") {
            irregularidades.push({ peso: "forte", titulo: "Capitalização não pactuada expressamente", fundamento: "Súmula 539/STJ; REsp 973.827", detalhe: "Contrato não contém cláusula expressa de capitalização." });
        } else if (Math.abs(aaCalc - taxaContratadaAA) > 0.3 && estado.capitalizacao.pactuada !== "sim-mensal" && estado.capitalizacao.pactuada !== "sim-diaria") {
            irregularidades.push({ peso: "media", titulo: `Indício de capitalização não declarada (diferença de ${fmtPct(aaCalc - taxaContratadaAA, 2)} p.p.)`, fundamento: "Súmula 541/STJ; REsp 973.827", detalhe: `Taxa anual contratada (${fmtPct(taxaContratadaAA)}) diverge do composto da mensal (${fmtPct(aaCalc)}).` });
        }
    }
    if (dataContrato && dataNum > 0 && dataNum < 2000 * 12 + 3) {
        irregularidades.push({ peso: "forte", titulo: "Contrato anterior a 31/03/2000 — capitalização vedada", fundamento: "Súmula 121/STF", detalhe: "Anterior à MP 1.963-17/2000. Capitalização vedada de plano." });
    }
    if (estado.capitalizacao.pactuada === "sim-diaria" && estado.capitalizacao.taxaDiariaInfo === "nao") {
        irregularidades.push({ peso: "forte", titulo: "Capitalização diária sem informação da taxa diária", fundamento: "REsp 1.826.463/SC", detalhe: "Capitalização diária sem taxa diária expressa viola o dever de transparência." });
    }
    if (estado.mora.comPermanencia === "sim" && estado.mora.comPermCumul === "sim") {
        irregularidades.push({ peso: "forte", titulo: "Comissão de permanência cumulada", fundamento: "Súmula 472/STJ", detalhe: "Comissão de permanência cumulada com juros ou multa é vedada." });
    }
    if (estado.mora.multaMora > 2.0) {
        irregularidades.push({ peso: "forte", titulo: `Multa moratória ${fmtPct(estado.mora.multaMora)} — acima do teto legal`, fundamento: "art. 52, §1º, CDC", detalhe: "Multa moratória em relação de consumo limitada a 2%. Excesso é nulo." });
    }
    if (v.iof > 0) {
        irregularidades.push({ peso: "fraca", titulo: `IOF financiado: ${fmt(v.iof)} — verificar transparência`, fundamento: "art. 6º, III, CDC", detalhe: "Inclusão no principal exige demonstração da memória de cálculo." });
    }

    const fortes = irregularidades.filter(i => i.peso === "forte").length;
    const medias = irregularidades.filter(i => i.peso === "media").length;
    const fracas = irregularidades.filter(i => i.peso === "fraca").length;
    let veredito, vClasse, vIcon, vDesc;
    if (fortes >= 2 || (fortes >= 1 && medias >= 2)) {
        veredito = "Altamente viável"; vClasse = "altamente-viavel"; vIcon = "✓";
        vDesc = `${fortes} indício(s) forte(s) e ${medias} médio(s). Caso com base sólida para ajuizamento com tutela de urgência.`;
    } else if (fortes >= 1 || medias >= 3) {
        veredito = "Viável com reforço probatório"; vClasse = "viavel-reforco"; vIcon = "⚠";
        vDesc = `${fortes} forte(s) e ${medias} médio(s). Viável, mas reforço probatório recomendado.`;
    } else if (medias >= 1 || fracas >= 3) {
        veredito = "Marginal — requer estratégia cautelosa"; vClasse = "arriscado"; vIcon = "○";
        vDesc = `Apenas ${medias} indício(s) médio(s) e ${fracas} fraco(s). Avaliar caso a caso.`;
    } else {
        veredito = "Não recomendado o ajuizamento"; vClasse = "nao-recomendado"; vIcon = "✕";
        vDesc = "Sem indícios relevantes de abusividade. Considerar renegociação ou superendividamento.";
    }
    resultadoCalculado = {
        taxaContratadaAA, taxaContratadaAM, taxaBacenAA, taxaBacenAM,
        cetAM, pvCalculado, tirAM, tirAA, totalContratado, jurosContratado,
        pmtBacen, totalBacen, reducaoConservadora, pmtBacenExp, totalBacenExp, reducaoOtimista,
        principalExpurgado, tarifasExpurgo, restituicaoDobro,
        irregularidades, veredito, vClasse, vIcon, vDesc, fortes, medias, fracas
    };
    renderResultado();
    goToStep(7);
}

function renderResultado() {
    const r = resultadoCalculado;
    const c = document.getElementById('resultadoConteudo');
    const razaoBacen = r.taxaBacenAA > 0 ? (r.taxaContratadaAA / r.taxaBacenAA) : null;
    let html = `
        <div class="plat-card-section" style="margin-top:0;padding-top:0;border-top:none;">
            <div class="plat-card-section-title">Veredito</div>
            <div class="plat-verdict-box ${r.vClasse}">
                <div class="plat-verdict-icon">${r.vIcon}</div>
                <div class="plat-verdict-text"><strong>${r.veredito}</strong><span>${r.vDesc}</span></div>
            </div>
        </div>
        <div class="plat-card-section">
            <div class="plat-card-section-title">Estimativa econômica</div>
            <div class="plat-stat-grid">
                <div class="plat-stat-cell"><div class="plat-stat-label">Total contratado</div><div class="plat-stat-value">${fmt(r.totalContratado)}</div><div class="plat-stat-sub">${estado.valores.parcelas}× ${fmt(estado.valores.valorParcela)}</div></div>
                <div class="plat-stat-cell"><div class="plat-stat-label">Cenário conservador (BACEN)</div><div class="plat-stat-value positivo">${r.pmtBacen > 0 ? fmt(r.totalBacen) : "—"}</div><div class="plat-stat-sub">${r.pmtBacen > 0 ? "parcela " + fmt(r.pmtBacen) : "sem BACEN informado"}</div></div>
                <div class="plat-stat-cell"><div class="plat-stat-label">Cenário otimista (BACEN + expurgo)</div><div class="plat-stat-value positivo">${r.pmtBacenExp > 0 ? fmt(r.totalBacenExp) : "—"}</div><div class="plat-stat-sub">${r.pmtBacenExp > 0 ? "parcela " + fmt(r.pmtBacenExp) : "—"}</div></div>
            </div>
            <div class="plat-stat-grid">
                <div class="plat-stat-cell"><div class="plat-stat-label">Redução conservadora</div><div class="plat-stat-value ${r.reducaoConservadora > 0 ? 'positivo' : ''}">${r.reducaoConservadora > 0 ? fmt(r.reducaoConservadora) : "—"}</div><div class="plat-stat-sub">economia total estimada</div></div>
                <div class="plat-stat-cell"><div class="plat-stat-label">Redução otimista</div><div class="plat-stat-value ${r.reducaoOtimista > 0 ? 'positivo' : ''}">${r.reducaoOtimista > 0 ? fmt(r.reducaoOtimista) : "—"}</div><div class="plat-stat-sub">com expurgo de acessórios</div></div>
                <div class="plat-stat-cell"><div class="plat-stat-label">Restituição em dobro estimada</div><div class="plat-stat-value ${r.restituicaoDobro > 0 ? 'destaque' : ''}">${r.restituicaoDobro > 0 ? fmt(r.restituicaoDobro) : "—"}</div><div class="plat-stat-sub">CDC art. 42, p. único</div></div>
            </div>
        </div>
        <div class="plat-card-section">
            <div class="plat-card-section-title">Comparativo BACEN — Tema 27/STJ</div>
            <table class="plat-compare-table">
                <thead><tr><th>Indicador</th><th class="val">% a.a.</th><th class="val">% a.m.</th><th class="val">Razão</th></tr></thead>
                <tbody>
                    <tr><td>Taxa contratada</td><td class="val">${fmtPct(r.taxaContratadaAA)}</td><td class="val">${fmtPct(r.taxaContratadaAM, 3)}</td><td class="val destaque">${razaoBacen ? razaoBacen.toFixed(2) + "x" : "—"}</td></tr>
                    <tr><td>Média BACEN</td><td class="val">${r.taxaBacenAA > 0 ? fmtPct(r.taxaBacenAA) : "<em>não informada</em>"}</td><td class="val">${r.taxaBacenAM > 0 ? fmtPct(r.taxaBacenAM, 3) : "—"}</td><td class="val">1,00x (referência)</td></tr>
                    ${r.cetAM > 0 ? `<tr><td>CET informado</td><td class="val">${fmtPct(amParaAa(r.cetAM))}</td><td class="val">${fmtPct(r.cetAM, 3)}</td><td class="val ${r.cetAM > r.taxaContratadaAM ? 'neg' : ''}">+${fmtPct(r.cetAM - r.taxaContratadaAM, 3)} p.p. vs nominal</td></tr>` : ''}
                    <tr><td>TIR (calculada do fluxo)</td><td class="val">${fmtPct(r.tirAA)}</td><td class="val">${fmtPct(r.tirAM, 3)}</td><td class="val ${Math.abs(r.tirAM - r.taxaContratadaAM) > 0.3 ? 'neg' : 'pos'}">${(r.tirAM - r.taxaContratadaAM >= 0 ? "+" : "")}${fmtPct(r.tirAM - r.taxaContratadaAM, 3)} p.p. vs nominal</td></tr>
                </tbody>
            </table>
            ${razaoBacen ? renderClassificacaoTema27(razaoBacen) : ''}
        </div>
        <div class="plat-card-section">
            <div class="plat-card-section-title">Irregularidades identificadas (${r.fortes} forte · ${r.medias} médio · ${r.fracas} fraco)</div>
            <ul class="plat-irreg-list">
                ${r.irregularidades.length === 0
                    ? '<li class="plat-alert success"><div class="plat-alert-title">Sem irregularidades</div>Nenhum indício relevante foi identificado nos dados informados.</li>'
                    : r.irregularidades.map(i => `<li class="plat-irreg-item ${i.peso}"><span class="plat-irreg-peso">${i.peso}</span><div class="plat-irreg-titulo">${i.titulo}</div><div class="plat-irreg-fundamento">Fundamento: ${i.fundamento}</div><div class="plat-irreg-detalhe">${i.detalhe}</div></li>`).join('')}
            </ul>
        </div>
        <div class="plat-card-section">
            <div class="plat-card-section-title">Coerência matemática</div>
            <table class="plat-compare-table">
                <tbody>
                    <tr><td>Valor financiado declarado</td><td class="val">${fmt(estado.valores.financiado)}</td></tr>
                    <tr><td>PV recalculado (taxa nominal)</td><td class="val">${fmt(r.pvCalculado)}</td></tr>
                    <tr><td>Diferença</td><td class="val ${Math.abs(r.pvCalculado - estado.valores.financiado) > estado.valores.financiado * 0.01 ? 'neg' : 'pos'}">${fmt(r.pvCalculado - estado.valores.financiado)}</td></tr>
                    <tr><td>Total a pagar</td><td class="val">${fmt(r.totalContratado)}</td></tr>
                    <tr><td>Juros + encargos no fluxo</td><td class="val">${fmt(r.jurosContratado)}</td></tr>
                </tbody>
            </table>
        </div>
        <div class="plat-alert info" style="margin-top:24px;">
            <div class="plat-alert-title">Notas metodológicas</div>
            Os cálculos são preliminares e não substituem perícia contábil em juízo. O critério da taxa BACEN está sob reanálise no Tema 1.378/STJ (REsp 2.227.280). Mantenha a estratégia diversificada (taxa, capitalização, tarifas, seguros, mora).
        </div>`;
    c.innerHTML = html;
}

function renderClassificacaoTema27(razao) {
    let classe, texto;
    if (razao >= 2.0) { classe = "forte"; texto = `Taxa contratada é <strong>${razao.toFixed(2)}x</strong> a média BACEN. Indício FORTE de abusividade (critério Tema 27/STJ).`; }
    else if (razao >= 1.5) { classe = "medio"; texto = `Taxa contratada é <strong>${razao.toFixed(2)}x</strong> a média BACEN. Indício MÉDIO — zona cinzenta. Necessário reforço com outras irregularidades.`; }
    else if (razao >= 1.2) { classe = "fraco"; texto = `Taxa contratada é <strong>${razao.toFixed(2)}x</strong> a média BACEN. Indício FRACO. Buscar fundamento principal em outras irregularidades.`; }
    else { classe = "success"; texto = `Taxa contratada é <strong>${razao.toFixed(2)}x</strong> a média BACEN — dentro da banda de mercado. Sem indício de abusividade pelo Tema 27/STJ.`; }
    return `<div class="plat-alert ${classe}" style="margin-top:14px;"><div class="plat-alert-title">Classificação Tema 27/STJ</div>${texto}</div>`;
}

// ============================================
// PARTE V — GERADOR DE RELATÓRIO (14 BLOCOS)
// ============================================

function gerarRelatorio() {
    const r = resultadoCalculado;
    if (!r) return "<p>Execute o cálculo primeiro.</p>";
    const e = estado;
    const mod = MODALIDADES[e.contrato.modalidade];
    const dataContr = e.contrato.data ? e.contrato.data.split("-").reverse().join("/") : "—";
    const razaoBacen = r.taxaBacenAA > 0 ? (r.taxaContratadaAA / r.taxaBacenAA) : null;
    const fortes = r.irregularidades.filter(i => i.peso === "forte");
    const medias = r.irregularidades.filter(i => i.peso === "media");
    const fracas = r.irregularidades.filter(i => i.peso === "fraca");
    const hoje = new Date().toLocaleDateString("pt-BR");
    let html = `
        <h1>Análise Revisional Bancária — ${e.cliente.nome || "Cliente"}</h1>
        <p style="margin-bottom:20px;color:var(--t3);font-size:13px;"><strong>Contrato nº ${e.contrato.numero || "—"}</strong> · ${e.contrato.banco || "—"} · ${dataContr}<br>Modalidade: ${mod ? mod.nome : "—"}<br>Análise gerada em ${hoje} · Plataforma v1.0</p>
        <h2>1 · Resumo executivo</h2>
        <p>Análise técnica do contrato <strong>${e.contrato.numero || "—"}</strong>, firmado entre <strong>${e.cliente.nome || "o cliente"}</strong> (${e.cliente.tipo}) e <strong>${e.contrato.banco || "a instituição financeira"}</strong> em ${dataContr}, na modalidade <strong>${mod ? mod.nome : "—"}</strong>, valor financiado de <strong>${fmt(e.valores.financiado)}</strong>, pago em <strong>${e.valores.parcelas}× ${fmt(e.valores.valorParcela)}</strong>, taxa contratada <strong>${fmtPct(r.taxaContratadaAM, 3)} a.m. (${fmtPct(r.taxaContratadaAA)} a.a.)</strong>.</p>
        <p>Veredito: <strong>${r.veredito}</strong>. ${r.vDesc}</p>
        <h2>2 · Documentos analisados</h2>
        <ul><li>Contrato bancário nº ${e.contrato.numero || "—"} (${dataContr})</li><li>Informações declaradas pelo cliente quanto a parcelas, taxas, tarifas e produtos vinculados</li><li>Taxa média BACEN da modalidade no mês da contratação (série ${mod ? mod.serie : "—"})</li></ul>
        <h2>3 · Dados essenciais do contrato</h2>
        <table><tbody>
            <tr><th>Contratante</th><td>${e.cliente.nome || "—"} (${e.cliente.tipo}${e.cliente.doc ? " · " + e.cliente.doc : ""})</td></tr>
            <tr><th>Instituição</th><td>${e.contrato.banco || "—"}</td></tr>
            <tr><th>Modalidade</th><td>${mod ? mod.nome : "—"}</td></tr>
            <tr><th>Data de contratação</th><td>${dataContr}</td></tr>
            <tr><th>Valor liberado</th><td>${fmt(e.valores.liberado)}</td></tr>
            <tr><th>Valor financiado</th><td>${fmt(e.valores.financiado)}</td></tr>
            <tr><th>Prazo</th><td>${e.valores.parcelas} parcelas</td></tr>
            <tr><th>Valor da parcela</th><td>${fmt(e.valores.valorParcela)}</td></tr>
            <tr><th>Taxa contratada</th><td>${fmtPct(r.taxaContratadaAM, 3)} a.m. · ${fmtPct(r.taxaContratadaAA)} a.a.</td></tr>
            ${r.cetAM > 0 ? `<tr><th>CET</th><td>${fmtPct(r.cetAM, 3)} a.m. · ${fmtPct(amParaAa(r.cetAM))} a.a.</td></tr>` : ''}
            <tr><th>Garantia</th><td>${e.garantia || "não informada"}</td></tr>
            <tr><th>Situação atual</th><td>${e.atual.parcelasPagas} parcela(s) paga(s) · em mora: ${e.atual.emMora}</td></tr>
        </tbody></table>
        <h2>4 · Aplicabilidade do CDC</h2>${gerarAnaliseCDC(e)}
        <h2>5 · Comparação BACEN (Tema 27/STJ)</h2>
        ${razaoBacen ? `<table><thead><tr><th>Indicador</th><th>% a.a.</th><th>% a.m.</th></tr></thead><tbody>
            <tr><td>Taxa contratada</td><td>${fmtPct(r.taxaContratadaAA)}</td><td>${fmtPct(r.taxaContratadaAM, 3)}</td></tr>
            <tr><td>Média BACEN (${mod ? mod.serie : "—"})</td><td>${fmtPct(r.taxaBacenAA)}</td><td>${fmtPct(r.taxaBacenAM, 3)}</td></tr>
            <tr><td><strong>Razão contratada / BACEN</strong></td><td colspan="2"><strong>${razaoBacen.toFixed(2)}x</strong></td></tr>
        </tbody></table>
        <p>${razaoBacen >= 2 ? "Taxa contratada é ao menos o dobro da média BACEN. Indício forte de abusividade conforme critério majoritário pós-Tema 27/STJ." : razaoBacen >= 1.5 ? "Taxa em zona cinzenta (entre 1,5x e 2x BACEN). Aplicação do Tema 27 depende de reforço com outras irregularidades." : razaoBacen >= 1.2 ? "Diferença modesta sobre a média BACEN. Buscar fundamentos cumulativos." : "Taxa dentro da banda de mercado. Tema 27/STJ não fundamenta a revisão."}</p>
        <p><em>Nota: o critério da taxa BACEN está sob reanálise no Tema 1.378/STJ. Estratégia recomendada: não depender exclusivamente desse critério.</em></p>`
        : '<p>Taxa BACEN não informada — comparação prejudicada. Recomenda-se consulta ao SGS/BACEN.</p>'}
        <h2>6 · Irregularidades de peso FORTE</h2>
        ${fortes.length === 0 ? '<p><em>Nenhuma irregularidade forte identificada.</em></p>' : '<ul>' + fortes.map(i => `<li><strong>${i.titulo}</strong><br>${i.detalhe}<br><em>Fundamento: ${i.fundamento}</em></li>`).join('') + '</ul>'}
        <h2>7 · Irregularidades de peso MÉDIO</h2>
        ${medias.length === 0 ? '<p><em>Nenhuma irregularidade média identificada.</em></p>' : '<ul>' + medias.map(i => `<li><strong>${i.titulo}</strong><br>${i.detalhe}<br><em>Fundamento: ${i.fundamento}</em></li>`).join('') + '</ul>'}
        <h2>8 · Irregularidades de peso FRACO</h2>
        ${fracas.length === 0 ? '<p><em>Nenhuma irregularidade fraca identificada.</em></p>' : '<ul>' + fracas.map(i => `<li><strong>${i.titulo}</strong><br>${i.detalhe}<br><em>Fundamento: ${i.fundamento}</em></li>`).join('') + '</ul>'}
        <h2>9 · Teses a EVITAR</h2>
        <ul>
            <li><strong>Limitação dos juros a 12% a.a.</strong> — Súmula 596/STF afasta o Dec. 22.626/33 das instituições financeiras.</li>
            <li><strong>Aplicação do CDC para PJ comum sem vulnerabilidade comprovada</strong> — art. 421-A do CC presume paridade entre empresas.</li>
            <li><strong>Revisão isolada da taxa pelo Tema 27/STJ sem outras irregularidades</strong> — risco de não acolhimento. Tema 1.378 está sob reanálise.</li>
            ${e.contrato.modalidade && e.contrato.modalidade.indexOf("consig") >= 0 ? '<li><strong>Aplicar série de PF não consignado (20742) em contrato consignado</strong> — use a série correta da modalidade.</li>' : ''}
        </ul>
        <h2>10 · Estimativa econômica</h2>
        <table><thead><tr><th>Cenário</th><th>Parcela</th><th>Total</th><th>Redução</th></tr></thead><tbody>
            <tr><td>Contratado (status quo)</td><td>${fmt(e.valores.valorParcela)}</td><td>${fmt(r.totalContratado)}</td><td>—</td></tr>
            ${r.pmtBacen > 0 ? `<tr><td>Conservador (BACEN)</td><td>${fmt(r.pmtBacen)}</td><td>${fmt(r.totalBacen)}</td><td><strong>${fmt(r.reducaoConservadora)}</strong></td></tr>` : ''}
            ${r.pmtBacenExp > 0 ? `<tr><td>Otimista (BACEN + expurgo)</td><td>${fmt(r.pmtBacenExp)}</td><td>${fmt(r.totalBacenExp)}</td><td><strong>${fmt(r.reducaoOtimista)}</strong></td></tr>` : ''}
        </tbody></table>
        ${r.restituicaoDobro > 0 ? `<p><strong>Restituição em dobro estimada</strong> (CDC art. 42, p. único): <strong>${fmt(r.restituicaoDobro)}</strong>, considerando ${e.atual.parcelasPagas} parcela(s) já paga(s).</p>` : ''}
        <p>Tarifas/seguros/produtos passíveis de expurgo: <strong>${fmt(r.tarifasExpurgo)}</strong>.</p>
        <h2>11 · Documentos faltantes a serem requisitados</h2>
        <ul>
            <li>Cópia integral do contrato com todas as cláusulas e anexos</li>
            <li>Memória de cálculo da composição da parcela (taxa nominal × CET × encargos)</li>
            ${e.tarifas.tab && e.tarifas.tab.ativada ? '<li>Laudo de avaliação do bem (justificativa da TAB)</li>' : ''}
            ${(e.tarifas.treg && e.tarifas.treg.ativada) || (e.tarifas.tgrav && e.tarifas.tgrav.ativada) ? '<li>Comprovante do efetivo registro do contrato e da inserção do gravame eletrônico</li>' : ''}
            ${e.seguro.tem === "sim" ? '<li>Apólice do seguro prestamista, comprovante de opção por seguradora terceira (ou ausência)</li>' : ''}
            <li>Histórico de operações do cliente com o banco (para análise de tarifa de cadastro repetida)</li>
            <li>Extratos detalhados de pagamento</li>
            ${e.atual.refinPortabil === "sim" ? '<li>Contrato de origem (operação anterior refinanciada/portada)</li>' : ''}
        </ul>
        <p><em>Exigíveis via art. 396 do CPC, com inversão do ônus da prova (art. 6º, VIII, CDC).</em></p>
        <h2>12 · Riscos processuais</h2>
        <ul>
            <li><strong>Tema 1.378/STJ em aberto</strong>: REsp 2.227.280 reanalisa o critério da taxa média BACEN. Manter estratégia diversificada.</li>
            <li><strong>Ônus probatório do banco</strong>: invocar art. 6º, VIII, CDC para inverter ônus sobre tarifas, seguradora e capitalização.</li>
            <li><strong>Sucumbência</strong>: caso de improcedência total, honorários e custas para o cliente.</li>
            ${e.cliente.tipo === "PJ" && (e.cliente.vulnerab === "nao" || !e.cliente.vulnerab) ? '<li><strong>PJ sem vulnerabilidade clara</strong>: art. 421-A do CC presume paridade. Riscos elevados.</li>' : ''}
            ${r.fracas > r.fortes + r.medias ? '<li><strong>Predominância de indícios fracos</strong>: considerar negociação extrajudicial antes do ajuizamento.</li>' : ''}
        </ul>
        <h2>13 · Viabilidade e estratégia</h2>
        <p><strong>${r.veredito}.</strong> ${r.vDesc}</p>
        <p>Estratégia processual recomendada:</p>
        <ol>
            <li><strong>Ação revisional</strong> com base nas irregularidades identificadas, fundamento principal na conjugação de ${fortes.length > 0 ? "irregularidades fortes" : medias.length > 0 ? "irregularidades médias" : "indícios cumulativos"}.</li>
            <li><strong>Tutela de urgência</strong> (art. 300 CPC): (a) suspensão/redução das parcelas ao valor incontroverso; ${e.garantia === "aliencao-fid" ? "(b) proibição de busca e apreensão; (c)" : "(b)"} proibição de inscrição em órgãos de proteção ao crédito.</li>
            <li><strong>Pedido de exibição</strong> (art. 396 CPC) dos documentos listados, com inversão do ônus da prova.</li>
            <li><strong>Pedido principal</strong>: nulidade dos encargos abusivos, recálculo do contrato, repetição em dobro dos valores pagos indevidamente.</li>
            <li><strong>Danos morais</strong>: <strong>R$ 20.000,00</strong>, fundamentado nas circunstâncias concretas.</li>
        </ol>
        <h2>14 · Próximos passos</h2>
        <ol>
            <li>Apresentar a análise ao cliente em reunião, explicando os achados em linguagem acessível.</li>
            <li>Coletar dos arquivos do cliente: contrato integral, extratos, comprovantes de pagamento.</li>
            <li>Solicitar ao banco, extrajudicialmente, os documentos faltantes.</li>
            <li>Formalizar contrato de honorários após decisão informada do cliente.</li>
            <li>${r.veredito === "Altamente viável" ? "Proceder ao ajuizamento da revisional com pedido de tutela de urgência." : r.veredito === "Viável com reforço probatório" ? "Antes do ajuizamento, complementar documentação e considerar perícia contábil preliminar." : r.veredito === "Marginal — requer estratégia cautelosa" ? "Avaliar negociação extrajudicial com o banco antes de optar pelo ajuizamento." : "Orientar o cliente sobre a inviabilidade da revisional. Explorar caminhos alternativos."}</li>
        </ol>
        <p style="margin-top:32px;font-size:11px;color:var(--t3);border-top:1px solid var(--gb);padding-top:12px;"><em>Relatório preliminar gerado pela Plataforma de Análise Revisional Bancária v1.0 — uso interno do escritório. Os cálculos e classificações são estimativos. A decisão final exige análise jurídica caso-a-caso pelo advogado responsável.</em></p>`;
    return html;
}

function gerarAnaliseCDC(e) {
    if (e.cliente.tipo === "PF") return '<p>Aplicação do CDC <strong>incontroversa</strong>. Pessoa física consumidora final, em relação típica de consumo bancário (Súmula 297/STJ).</p>';
    if (!e.cliente.vulnerab || e.cliente.vulnerab === "nao") return '<p>Pessoa jurídica sem vulnerabilidade declarada. O <strong>art. 421-A do Código Civil</strong> presume paridade nas relações empresariais. A aplicação do CDC depende de comprovação de vulnerabilidade em concreto. <strong>Estratégia: documentar a vulnerabilidade.</strong></p>';
    const mapa = {
        "ME-EPP": "ME/EPP. A Lei Complementar 123/2006 reforça o tratamento diferenciado. CDC aplicável por vulnerabilidade presumida da microempresa.",
        "tecnica": "Vulnerabilidade técnica caracterizada (ausência de expertise específica). CDC viável (Súmula 297/STJ; teoria finalista mitigada).",
        "economica": "Vulnerabilidade econômica caracterizada (desequilíbrio financeiro acentuado). CDC viável (teoria finalista mitigada).",
        "informacional": "Vulnerabilidade informacional caracterizada (assimetria de informação relevante). CDC viável."
    };
    return `<p>${mapa[e.cliente.vulnerab]}</p>`;
}

// ============================================
// PARTE VI — MENSAGEM WHATSAPP
// ============================================

function gerarMensagemWhatsApp() {
    const r = resultadoCalculado;
    if (!r) return "Execute o cálculo primeiro.";
    const e = estado;
    const nome = e.cliente.nome || "[Nome do cliente]";
    const primeiroNome = nome.split(" ")[0];
    const banco = e.contrato.banco || "o banco";
    const mod = MODALIDADES[e.contrato.modalidade];
    let msg = `Oi, ${primeiroNome}! Tudo bem?\n\n`;
    msg += `Finalizei a análise do seu contrato com ${banco}`;
    if (mod) msg += ` (${mod.nome.toLowerCase()})`;
    msg += `. Quero te passar um panorama honesto antes de qualquer decisão.\n\n`;
    if (r.veredito === "Altamente viável") {
        msg += `Encontrei pontos importantes que merecem ser questionados. `;
        if (r.fortes >= 1) msg += `Identifiquei ${r.fortes} ${r.fortes === 1 ? "ponto forte" : "pontos fortes"} de irregularidade${r.medias >= 1 ? " e " + r.medias + " " + (r.medias === 1 ? "ponto médio" : "pontos médios") : ""}. `;
        msg += `Em um cenário conservador, a economia estimada gira em torno de ${fmt(r.reducaoConservadora)}, e em um cenário mais favorável, pode chegar a ${fmt(r.reducaoOtimista)}.\n\n`;
        msg += `Importante: essas são estimativas iniciais — não promessa. O resultado final depende de uma série de fatores, inclusive de jurisprudência que está em movimento (o STJ está reanalisando um critério importante esse ano).\n\n`;
        msg += `Faz sentido marcarmos uma conversa de uns 20 a 30 minutos para eu te mostrar exatamente o que encontrei? Pode ser por videochamada ou aqui no escritório.\n\n`;
    } else if (r.veredito === "Viável com reforço probatório") {
        msg += `O cenário é positivo, mas exige alguns passos antes de partir para a ação. Identifiquei ${r.fortes >= 1 ? r.fortes + " ponto" + (r.fortes !== 1 ? "s" : "") + " forte" + (r.fortes !== 1 ? "s" : "") + " e " : ""}${r.medias} ponto${r.medias !== 1 ? "s" : ""} médio${r.medias !== 1 ? "s" : ""} de questionamento.\n\n`;
        msg += `A estimativa preliminar de economia, num cenário conservador, é de ${fmt(r.reducaoConservadora)}. Antes de qualquer ajuizamento, vamos precisar reunir alguns documentos.\n\n`;
        msg += `Que tal marcarmos uma conversa para eu te explicar o que vi e os próximos passos? Sem compromisso de imediato.\n\n`;
    } else if (r.veredito === "Marginal — requer estratégia cautelosa") {
        msg += `Quero ser direto contigo: o caso tem alguns pontos questionáveis, mas não são suficientes para recomendar uma ação revisional sem hesitação.\n\n`;
        msg += `Tenho duas sugestões: ou (1) reunimos mais documentos e reavaliamos com calma, ou (2) avaliamos uma tentativa de renegociação direta com ${banco}.\n\n`;
        msg += `Posso te ligar ou marcamos uma conversa para eu te explicar com mais detalhe?\n\n`;
    } else {
        msg += `Vou ser direto: pela análise que fiz com os dados disponíveis, não identifiquei irregularidades relevantes que sustentem uma ação revisional com boa chance de sucesso.\n\n`;
        msg += `Isso não quer dizer que não haja caminhos — dependendo da sua situação, podemos avaliar superendividamento (Lei 14.181/2021) ou renegociação direta.\n\n`;
    }
    msg += `Qualquer dúvida me chama por aqui mesmo. Forte abraço.`;
    return msg;
}

// ============================================
// PARTE VII — I/O (SAVE/LOAD/RESET/COPY)
// ============================================

function abrirRelatorio() {
    if (!resultadoCalculado) { alert("Execute o cálculo primeiro."); return; }
    document.getElementById('platRelatorioConteudo').innerHTML = gerarRelatorio();
    document.getElementById('platModalRelatorio').classList.remove('hidden');
}

function abrirWhatsApp() {
    if (!resultadoCalculado) { alert("Execute o cálculo primeiro."); return; }
    document.getElementById('platWhatsappTexto').value = gerarMensagemWhatsApp();
    document.getElementById('platModalWhatsApp').classList.remove('hidden');
}

function fecharModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function copiarRelatorio() {
    const el = document.getElementById('platRelatorioConteudo');
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    try { document.execCommand('copy'); alert("Relatório copiado para a área de transferência.\nCole no Word, e-mail ou onde precisar."); }
    catch (e) { alert("Não foi possível copiar. Use Ctrl+C para copiar a seleção."); }
}

function copiarWhatsApp() {
    const ta = document.getElementById('platWhatsappTexto');
    ta.select();
    try {
        navigator.clipboard.writeText(ta.value);
        const btn = document.getElementById('platBtnCopiarWpp');
        const txtOriginal = btn.textContent;
        btn.textContent = "✓ Copiado!";
        setTimeout(() => { btn.textContent = txtOriginal; }, 2000);
    } catch (e) { document.execCommand('copy'); alert("Mensagem copiada."); }
}

function saveCase() {
    for (let s = 1; s <= 6; s++) coletarDados(s);
    const payload = { versao: "1.0", geradoEm: new Date().toISOString(), estado: estado, resultado: resultadoCalculado };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const nomeArq = `analise_${(estado.cliente.nome || "caso").replace(/\W+/g, "_").toLowerCase()}_${estado.contrato.numero || "sem_num"}.json`;
    const a = document.createElement('a');
    a.href = url; a.download = nomeArq;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}

function loadCase() { document.getElementById('platLoadFileInput').click(); }

function handleLoadFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const payload = JSON.parse(ev.target.result);
            if (payload.estado) {
                estado = payload.estado;
                resultadoCalculado = payload.resultado || null;
                aplicarEstadoAosCampos();
                if (estado.contrato.modalidade) onModalidadeChange();
                if (resultadoCalculado) { renderResultado(); goToStep(7); }
                else { goToStep(1); }
                alert("Caso carregado com sucesso.");
            } else { alert("Arquivo não reconhecido. Esperado JSON com campo 'estado'."); }
        } catch (e) { alert("Erro ao ler o arquivo: " + e.message); }
    };
    reader.readAsText(file);
    event.target.value = "";
}

function resetCase() {
    if (!confirm("Iniciar nova análise? Os dados atuais serão perdidos se não foram salvos.")) return;
    estado = inicializarEstado();
    resultadoCalculado = null;
    const pg = document.getElementById('page-bacen');
    pg.querySelectorAll('input[type="text"], input[type="number"]').forEach(el => el.value = "");
    pg.querySelectorAll('input[type="month"], input[type="date"]').forEach(el => el.value = "");
    pg.querySelectorAll('select').forEach(el => el.value = "");
    pg.querySelectorAll('input[type="radio"]').forEach(r => {
        r.checked = false;
        const pill = r.closest('.plat-opt-pill');
        if (pill) pill.classList.remove('checked');
    });
    setRadio('cliTipo', 'PF'); setRadio('seguroSimNao', 'nao');
    setRadio('seguroMesmoGrupo', 'nao-sei'); setRadio('seguroOpcao', 'nao-sei');
    setRadio('outrosProdCondicao', 'nao-sei'); setRadio('capPactuada', 'nao-sei');
    setRadio('capTaxaDiariaInfo', 'na'); setRadio('comPermanencia', 'nao');
    setRadio('comPermCumul', 'na'); setRadio('vencAntecip', 'nao-sei');
    setRadio('emMora', 'nao'); setRadio('acaoBanco', 'nao'); setRadio('refinPortabil', 'nao');
    pg.querySelectorAll('.plat-check-item.activated').forEach(el => el.classList.remove('activated'));
    document.getElementById('taxasAlertas').innerHTML = "";
    document.getElementById('modAlert').innerHTML = "";
    document.getElementById('modAlert').classList.add('hidden');
    document.getElementById('bacenInfo').innerHTML = "";
    document.getElementById('tarifasCount').textContent = "0";
    document.getElementById('tarifasTotal').textContent = "R$ 0,00";
    document.getElementById('tarifasPct').textContent = "0,00%";
    document.getElementById('resultadoConteudo').innerHTML = "";
    document.getElementById('grpVulnerabilidade').style.display = "none";
    goToStep(1);
}

// ============================================
// PARTE VIII — INICIALIZAÇÃO E EVENT LISTENERS
// ============================================

renderTarifas();

document.querySelectorAll('#page-bacen .plat-opt-pill').forEach(pill => {
    pill.addEventListener('click', function(ev) {
        const input = pill.querySelector('input');
        if (!input) return;
        if (input.type === 'radio') {
            document.querySelectorAll(`input[name="${input.name}"]`).forEach(r => {
                const p = r.closest('.plat-opt-pill');
                if (p) p.classList.remove('checked');
            });
            input.checked = true;
            pill.classList.add('checked');
            if (input.name === 'cliTipo') {
                document.getElementById('grpVulnerabilidade').style.display = input.value === 'PJ' ? '' : 'none';
            }
        } else {
            input.checked = !input.checked;
            pill.classList.toggle('checked');
        }
        ev.preventDefault();
    });
});

document.querySelectorAll('#page-bacen input[type="radio"]:checked, #page-bacen input[type="checkbox"]:checked').forEach(r => {
    const p = r.closest('.plat-opt-pill');
    if (p) p.classList.add('checked');
});

document.getElementById('modalidade').addEventListener('change', onModalidadeChange);
document.getElementById('dataContrato').addEventListener('change', onDataContratoChange);

document.getElementById('taxaBacenManual').addEventListener('input', function(ev) {
    const raw = ev.target.value.replace(",", ".");
    const v = parseFloat(raw);
    if (!isNaN(v)) {
        estado.valores.taxaBacenManual = v;
        const info = document.getElementById('bacenInfo');
        info.innerHTML = `✓ Taxa BACEN informada: ${fmtPct(v)} a.a. (${fmtPct(aaParaAm(v), 4)} a.m.)`;
        info.className = "plat-val-indicator ok";
    }
});

document.querySelectorAll('#page-bacen .plat-modal-backdrop').forEach(bd => {
    bd.addEventListener('click', function(ev) {
        if (ev.target === bd) bd.classList.add('hidden');
    });
});

document.addEventListener('keydown', function(ev) {
    if (ev.key === 'Escape') {
        document.querySelectorAll('#page-bacen .plat-modal-backdrop:not(.hidden)').forEach(bd => bd.classList.add('hidden'));
    }
});

// — Expor globais —
window.platGoToStep              = goToStep;
window.platCalcular              = calcular;
window.platFormatarMoedaInput    = formatarMoedaInput;
window.platAtualizarTaxas        = atualizarTaxas;
window.platToggleTarifa          = toggleTarifa;
window.platAtualizarTotaisTarifas = atualizarTotaisTarifas;
window.platAbrirRelatorio        = abrirRelatorio;
window.platAbrirWhatsApp         = abrirWhatsApp;
window.platSaveCase              = saveCase;
window.platLoadCase              = loadCase;
window.platResetCase             = resetCase;
window.platFecharModal           = fecharModal;
window.platCopiarRelatorio       = copiarRelatorio;
window.platCopiarWhatsApp        = copiarWhatsApp;
window.platHandleLoadFile        = handleLoadFile;
window.platOnModalidadeChange    = onModalidadeChange;
window.platAtualizarTaxaBacen    = atualizarTaxaBacen;
window.MODALIDADES               = MODALIDADES;

})();

/* ══════════════════════════════════════════════
   BACEN API — Busca automática de taxas
══════════════════════════════════════════════ */
(function() {
  var CACHE_KEY = 'bacen_taxas_v2';
  var CACHE_TTL = 12 * 60 * 60 * 1000; // 12 horas

  function lerCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (Date.now() - obj.ts > CACHE_TTL) return null;
      return obj.data;
    } catch(e) { return null; }
  }

  function salvarCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data })); } catch(e) {}
  }

  function atualizarBadge(estado, detalhe) {
    var badge = document.getElementById('platBadgeAtualizacao');
    if (!badge) return;
    badge.className = 'plat-header-badge ' + estado;
    badge.textContent = detalhe;
  }

  async function buscarSerie(serie) {
    var url = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.' + serie + '/dados/ultimos/120?formato=json';
    var resp = await fetch(url);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var arr = await resp.json();
    var result = {};
    arr.forEach(function(item) {
      var partes = item.data.split('/');
      var chave = partes[1] + '/' + partes[2]; // MM/YYYY
      result[chave] = parseFloat(String(item.valor).replace(',', '.'));
    });
    return result;
  }

  async function carregarTaxas() {
    window._bacenCarregando = true;
    atualizarBadge('badge-loading', '⏳ Atualizando taxas...');

    var cache = lerCache();
    if (cache) {
      Object.assign(TAXAS_BACEN, cache);
      window._bacenCarregando = false;
      var agora = new Date();
      var label = agora.toLocaleString('pt-BR', { month: 'short' }) + '/' + agora.getFullYear();
      atualizarBadge('badge-ok', '✓ Taxas atualizadas · ' + label);
      return;
    }

    // Coleta todos os códigos de série únicos
    var seriesMap = {};
    Object.values(MODALIDADES).forEach(function(mod) { if (mod.serie) seriesMap[mod.serie] = true; });
    var codigos = Object.keys(seriesMap);

    var novos = {};
    var erros = [];
    var resultados = await Promise.allSettled(codigos.map(async function(serie) {
      var dados = await buscarSerie(serie);
      novos[serie] = dados;
    }));
    resultados.forEach(function(r, i) {
      if (r.status === 'rejected') erros.push(codigos[i]);
    });

    Object.assign(TAXAS_BACEN, novos);
    window._bacenCarregando = false;

    if (Object.keys(novos).length > 0) salvarCache(novos);

    var agora = new Date();
    var label = agora.toLocaleString('pt-BR', { month: 'short' }) + '/' + agora.getFullYear();
    if (erros.length === 0) {
      atualizarBadge('badge-ok', '✓ Taxas atualizadas · ' + label);
    } else {
      atualizarBadge('badge-warn', '⚠ ' + erros.length + ' série(s) indisponível(is)');
    }

    // Atualiza o campo de taxa caso já haja modalidade selecionada
    var modSel = document.getElementById('modalidade');
    if (modSel && modSel.value) {
      window.platOnModalidadeChange && window.platOnModalidadeChange();
    }
  }

  document.addEventListener('DOMContentLoaded', carregarTaxas);
  window.bacenRecarregar = carregarTaxas;
})();

/* ══════════════════════════════════════════════
   AUTH — Supabase Authentication
══════════════════════════════════════════════ */

// Globals de sessão — preenchidos após login
window._sb = null;
window._currentUser = null;

(function() {

  var SUPABASE_URL = 'https://diowsecnxvvbdckptqvr.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpb3dzZWNueHZ2YmRja3B0cXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NDQ5NDUsImV4cCI6MjA5NTQyMDk0NX0.BRTua92kVE-wvKOSEKgrumF5TzaTjytE5Neb1SYxq9k';
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window._sb = sb;

  function showScreen(name) {
    document.getElementById('screen-login').style.display              = name === 'login'              ? 'flex' : 'none';
    document.getElementById('screen-cadastro').style.display           = name === 'cadastro'           ? 'flex' : 'none';
    document.getElementById('screen-email-confirmado').style.display   = name === 'email-confirmado'   ? 'flex' : 'none';
    document.getElementById('screen-recuperar-senha').style.display    = name === 'recuperar-senha'    ? 'flex' : 'none';
    document.getElementById('screen-recuperar-enviado').style.display  = name === 'recuperar-enviado'  ? 'flex' : 'none';
  }

  function setAlert(id, msg, type) {
    var el = document.getElementById(id);
    if (!msg) { el.style.display = 'none'; return; }
    el.textContent = msg;
    el.className = 'auth-alert' + (type === 'ok' ? ' auth-alert-ok' : '');
    el.style.display = 'block';
  }

  function setInputError(inputId, hasError) {
    document.getElementById(inputId).classList.toggle('has-error', hasError);
  }

  function clearLoginErrors() {
    setAlert('login-error', '');
    setAlert('login-success', '');
    setInputError('login-email', false);
    setInputError('login-senha', false);
  }

  function clearCadErrors() {
    setAlert('cadastro-error', '');
    ['cad-nome','cad-email','cad-whatsapp','cad-senha'].forEach(function(id) {
      setInputError(id, false);
    });
  }

  function setupToggleSenha(btnId, inputId, eyeOffId, eyeOnId) {
    document.getElementById(btnId).addEventListener('click', function() {
      var input  = document.getElementById(inputId);
      var eyeOff = document.getElementById(eyeOffId);
      var eyeOn  = document.getElementById(eyeOnId);
      var showing = input.type === 'text';
      input.type           = showing ? 'password' : 'text';
      eyeOff.style.display = showing ? '' : 'none';
      eyeOn.style.display  = showing ? 'none' : '';
    });
  }

  function maskWhatsApp(value) {
    var d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2)  return '(' + d;
    if (d.length <= 7)  return '(' + d.slice(0,2) + ') ' + d.slice(2);
    return '(' + d.slice(0,2) + ') ' + d.slice(2,7) + '-' + d.slice(7);
  }

  function _ocultarTelas() {
    document.getElementById('screen-login').style.display            = 'none';
    document.getElementById('screen-cadastro').style.display         = 'none';
    document.getElementById('screen-email-confirmado').style.display = 'none';
    document.getElementById('screen-recuperar-senha').style.display  = 'none';
    document.getElementById('screen-recuperar-enviado').style.display = 'none';
    document.body.classList.remove('auth-active', 'auth-clearing');
  }

  function hideAuthScreens(animado) {
    if (animado) {
      document.body.classList.add('auth-clearing');
      setTimeout(_ocultarTelas, 700);
    } else {
      document.body.classList.remove('auth-active');
      _ocultarTelas();
    }
  }

  function populateSidebarUser(user) {
    if (!user) return;
    window._currentUser = user;
    var meta  = user.user_metadata || {};
    var nome  = meta.nome || user.email || '?';
    var email = user.email || '';
    var initials = nome.trim().split(' ')
      .filter(function(w) { return w.length > 0; })
      .slice(0, 2)
      .map(function(w) { return w[0].toUpperCase(); })
      .join('');
    document.getElementById('sidebar-user-avatar').textContent = initials || '?';
    document.getElementById('sidebar-user-name').textContent   = nome.split(' ')[0];
    document.getElementById('sidebar-user-email').textContent  = email;
    var ta = document.getElementById('topbar-avatar');
    if (ta) ta.textContent = initials || '?';
  }

  async function loginUser(email, senha) {
    var btn = document.getElementById('btn-login');
    btn.disabled = true;
    var textoOriginal = btn.textContent;
    btn.textContent = 'Entrando…';

    var result = await sb.auth.signInWithPassword({ email: email, password: senha });

    btn.disabled = false;
    btn.textContent = textoOriginal;

    if (result.error) {
      var msg = 'E-mail ou senha incorretos. Verifique seus dados.';
      if (result.error.message && result.error.message.includes('Email not confirmed')) {
        msg = 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
      }
      setAlert('login-error', msg);
      setInputError('login-email', true);
      setInputError('login-senha', true);
      return;
    }

    hideAuthScreens(true);
    populateSidebarUser(result.data.user);
  }

  async function cadastrarUser(nome, email, whatsapp, senha) {
    var btn = document.getElementById('btn-cadastrar');
    btn.disabled = true;
    var textoOriginal = btn.textContent;
    btn.textContent = 'Cadastrando…';

    var result = await sb.auth.signUp({
      email: email,
      password: senha,
      options: { data: { nome: nome, whatsapp: whatsapp } }
    });

    btn.disabled = false;
    btn.textContent = textoOriginal;

    if (result.error) {
      var msg = 'Erro ao cadastrar. Tente novamente.';
      if (result.error.message && result.error.message.includes('already registered')) {
        msg = 'Este e-mail já está cadastrado. Tente fazer login.';
        setInputError('cad-email', true);
      } else if (result.error.message) {
        msg = 'Erro: ' + result.error.message;
      }
      setAlert('cadastro-error', msg);
      return;
    }

    showScreen('login');
    setTimeout(function() {
      setAlert('login-success', 'Cadastro realizado! Verifique seu e-mail para confirmar a conta.', 'ok');
    }, 80);
  }

  document.addEventListener('DOMContentLoaded', async function() {
    // Detecta link de confirmação de e-mail (type=signup na URL)
    var isEmailConfirmation = window.location.hash.includes('type=signup');

    if (isEmailConfirmation) {
      // Supabase processa o token automaticamente; aguarda um momento e faz logout
      // para que o usuário precise fazer login manualmente
      setTimeout(async function() {
        await sb.auth.signOut();
        showScreen('email-confirmado');
        // Limpa o hash da URL sem recarregar a página
        history.replaceState(null, '', window.location.pathname);
      }, 800);
    } else {
      var result = await sb.auth.getSession();
      if (result.data && result.data.session) {
        hideAuthScreens(false);
        populateSidebarUser(result.data.session.user);
      } else {
        showScreen('login');
      }
    }

    sb.auth.onAuthStateChange(function(event, session) {
      if (event === 'SIGNED_OUT' && !isEmailConfirmation) {
        showScreen('login');
        document.getElementById('sidebar-user-avatar').textContent = '?';
        document.getElementById('sidebar-user-name').textContent   = '—';
        document.getElementById('sidebar-user-email').textContent  = '—';
        var ta = document.getElementById('topbar-avatar');
        if (ta) ta.textContent = '?';
      }
    });

    setupToggleSenha('toggle-login-senha', 'login-senha', 'eye-login-off', 'eye-login-on');
    setupToggleSenha('toggle-cad-senha',   'cad-senha',   'eye-cad-off',   'eye-cad-on');

    document.getElementById('cad-whatsapp').addEventListener('input', function(e) {
      var input  = e.target;
      var pos    = input.selectionStart;
      var raw    = input.value;
      var digitsBeforeCursor = raw.slice(0, pos).replace(/\D/g, '').length;
      var masked = maskWhatsApp(raw);
      input.value = masked;
      var newPos = masked.length;
      if (digitsBeforeCursor === 0) {
        newPos = 0;
      } else {
        var count = 0;
        for (var i = 0; i < masked.length; i++) {
          if (/\d/.test(masked[i])) {
            count++;
            if (count === digitsBeforeCursor) { newPos = i + 1; break; }
          }
        }
      }
      input.setSelectionRange(newPos, newPos);
    });

    document.getElementById('btn-ir-cadastro').addEventListener('click', function() {
      clearCadErrors();
      showScreen('cadastro');
    });

    document.getElementById('btn-ir-login').addEventListener('click', function() {
      clearLoginErrors();
      showScreen('login');
    });

    /* ── Validação inline no cadastro ── */
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function setHint(id, msg, ok) {
      var el = document.getElementById('hint-' + id);
      if (!el) return;
      if (!msg) { el.className = 'auth-field-hint'; el.textContent = ''; return; }
      el.textContent = msg;
      el.className = 'auth-field-hint visible ' + (ok ? 'hint-ok' : 'hint-err');
    }

    function validarCampo(campo) {
      if (campo === 'nome') {
        var v = document.getElementById('cad-nome').value.trim();
        if (!v) { setHint('nome', '', false); return; }
        var ok = v.split(' ').filter(function(w){return w.length>0;}).length >= 2;
        setHint('nome', ok ? '✓ Nome válido' : 'Digite nome e sobrenome', ok);
      }
      if (campo === 'email') {
        var v = document.getElementById('cad-email').value.trim();
        if (!v) { setHint('email', '', false); return; }
        var ok = emailRe.test(v);
        setHint('email', ok ? '✓ E-mail válido' : 'Formato de e-mail inválido', ok);
      }
      if (campo === 'wpp') {
        var v = document.getElementById('cad-whatsapp').value.replace(/\D/g,'');
        if (!v) { setHint('wpp', '', false); return; }
        var ok = v.length >= 10;
        setHint('wpp', ok ? '✓ WhatsApp válido' : 'Digite o número completo com DDD', ok);
      }
    }

    document.getElementById('cad-nome').addEventListener('blur',  function() { validarCampo('nome'); });
    document.getElementById('cad-email').addEventListener('blur', function() { validarCampo('email'); });
    document.getElementById('cad-email').addEventListener('input', function() {
      if (emailRe.test(this.value.trim())) validarCampo('email');
    });
    document.getElementById('cad-whatsapp').addEventListener('blur', function() { validarCampo('wpp'); });

    /* ── Força da senha ── */
    function calcForca(pwd) {
      if (!pwd) return { pct: 0, label: '', cor: '' };
      var pts = 0;
      if (pwd.length >= 6)  pts++;
      if (pwd.length >= 10) pts++;
      if (/[A-Z]/.test(pwd)) pts++;
      if (/[0-9]/.test(pwd)) pts++;
      if (/[^A-Za-z0-9]/.test(pwd)) pts++;
      if (pts <= 1) return { pct: 20,  label: 'Senha fraca',    cor: 'var(--err)' };
      if (pts <= 2) return { pct: 45,  label: 'Senha razoável', cor: 'var(--warn)' };
      if (pts <= 3) return { pct: 70,  label: 'Senha boa',      cor: 'var(--a1)' };
      return               { pct: 100, label: 'Senha forte ✓',  cor: 'var(--ok)' };
    }

    document.getElementById('cad-senha').addEventListener('input', function() {
      var pwd   = this.value;
      var str   = document.getElementById('pwd-strength');
      var fill  = document.getElementById('pwd-strength-fill');
      var lbl   = document.getElementById('pwd-strength-label');
      if (!pwd) { str.classList.remove('visible'); return; }
      str.classList.add('visible');
      var f = calcForca(pwd);
      fill.style.width      = f.pct + '%';
      fill.style.background = f.cor;
      lbl.textContent       = f.label;
      lbl.style.color       = f.cor;
    });

    /* ── Esqueci minha senha ── */
    document.getElementById('btn-esqueci').addEventListener('click', function() {
      var emailVal = document.getElementById('login-email').value.trim();
      showScreen('recuperar-senha');
      if (emailVal) document.getElementById('rec-email').value = emailVal;
      setAlert('recuperar-alert', '');
    });

    document.getElementById('btn-voltar-login-rec').addEventListener('click', function() {
      showScreen('login');
      setAlert('recuperar-alert', '');
    });

    document.getElementById('btn-voltar-login-env').addEventListener('click', function() {
      showScreen('login');
    });

    document.getElementById('btn-recuperar').addEventListener('click', async function() {
      var btn   = this;
      var email = document.getElementById('rec-email').value.trim();
      setAlert('recuperar-alert', '');
      document.getElementById('rec-email').classList.remove('has-error');

      if (!email || !emailRe.test(email)) {
        document.getElementById('rec-email').classList.add('has-error');
        setAlert('recuperar-alert', 'Digite um e-mail válido para continuar.');
        return;
      }

      btn.disabled    = true;
      btn.textContent = 'Enviando...';

      try {
        var redirectUrl = window.location.origin + window.location.pathname;
        var result = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
        if (result.error) throw result.error;
        showScreen('recuperar-enviado');
      } catch (err) {
        setAlert('recuperar-alert', err.message || 'Erro ao enviar. Tente novamente.');
      } finally {
        btn.disabled    = false;
        btn.textContent = 'Enviar link de recuperação';
      }
    });

    document.getElementById('rec-email').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('btn-recuperar').click();
    });

    document.getElementById('btn-login').addEventListener('click', function() {
      clearLoginErrors();
      var email = document.getElementById('login-email').value.trim();
      var senha = document.getElementById('login-senha').value;
      if (!email || !senha) {
        setAlert('login-error', 'Preencha o e-mail e a senha para continuar.');
        setInputError('login-email', !email);
        setInputError('login-senha', !senha);
        return;
      }
      loginUser(email, senha);
    });

    document.getElementById('login-senha').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('btn-login').click();
    });

    document.getElementById('btn-cadastrar').addEventListener('click', function() {
      clearCadErrors();
      var nome     = document.getElementById('cad-nome').value.trim();
      var email    = document.getElementById('cad-email').value.trim();
      var whatsapp = document.getElementById('cad-whatsapp').value.trim();
      var senha    = document.getElementById('cad-senha').value;

      var hasErr = false;
      if (!nome)    { setInputError('cad-nome', true);  hasErr = true; }
      if (!email)   { setInputError('cad-email', true); hasErr = true; }
      if (!whatsapp || whatsapp.replace(/\D/g,'').length < 10) {
        setInputError('cad-whatsapp', true); hasErr = true;
      }
      if (!senha || senha.length < 6) { setInputError('cad-senha', true); hasErr = true; }

      if (hasErr) {
        setAlert('cadastro-error', 'Preencha todos os campos corretamente.');
        return;
      }

      var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) {
        setAlert('cadastro-error', 'Digite um e-mail válido.');
        setInputError('cad-email', true);
        return;
      }

      cadastrarUser(nome, email, whatsapp, senha);
    });

    document.getElementById('btn-ir-login-confirmado').addEventListener('click', function() {
      showScreen('login');
    });

    document.getElementById('btn-logout').addEventListener('click', async function() {
      await sb.auth.signOut();
    });
  });

})();

/* ══════════════════════════════════════════════
   HISTÓRICO DE PROPOSTAS
══════════════════════════════════════════════ */

// ── Estado da aba ativa no histórico
let _historicoTabAtiva = 'propostas';

function switchHistoricoTab(aba) {
  _historicoTabAtiva = aba;

  const btnP = document.getElementById('tab-btn-propostas');
  const btnB = document.getElementById('tab-btn-bacen');
  if (btnP && btnB) {
    if (aba === 'propostas') {
      btnP.style.borderBottomColor = 'var(--a1)'; btnP.style.color = 'var(--a1)';
      btnB.style.borderBottomColor = 'transparent'; btnB.style.color = 'var(--t3)';
    } else {
      btnB.style.borderBottomColor = 'var(--a1)'; btnB.style.color = 'var(--a1)';
      btnP.style.borderBottomColor = 'transparent'; btnP.style.color = 'var(--t3)';
    }
  }

  if (aba === 'propostas') carregarHistoricoPropostas();
  else carregarHistoricoBacen();
}

async function carregarHistorico() {
  switchHistoricoTab(_historicoTabAtiva);
}

async function carregarHistoricoPropostas() {
  const lista = document.getElementById('historico-lista');
  if (!lista) return;
  if (!window._sb || !window._currentUser) {
    lista.innerHTML = '<div style="color:var(--t3);font-size:14px;text-align:center;padding:40px 0;">Faça login para ver o histórico.</div>';
    return;
  }
  lista.innerHTML = '<div style="color:var(--t3);font-size:14px;text-align:center;padding:40px 0;">Carregando...</div>';

  const { data, error } = await window._sb
    .from('propostas')
    .select('id, criado_em, nome_cliente, tipo_servico, total_fixo, total_final, status')
    .order('criado_em', { ascending: false })
    .limit(50);

  if (error || !data || data.length === 0) {
    lista.innerHTML = '<div style="color:var(--t3);font-size:14px;text-align:center;padding:40px 0;">Nenhuma proposta encontrada.</div>';
    return;
  }

  lista.innerHTML = data.map(function(p) {
    const data_fmt = new Date(p.criado_em).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
    const total    = (p.total_final || p.total_fixo || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
    const servicos = Array.isArray(p.tipo_servico) && p.tipo_servico.length > 0
      ? p.tipo_servico.map(function(i) { return SERVICOS[i] ? SERVICOS[i].title : ''; }).filter(Boolean).join(', ')
      : '—';
    const status = p.status || 'aguardando';

    const statusCores = {
      aguardando: { bg: '#fff8e1', cor: '#f59e0b', label: 'Aguardando' },
      enviado:    { bg: '#e0f2fe', cor: '#0284c7', label: 'Enviado'    },
      assinado:   { bg: '#dcfce7', cor: '#16a34a', label: 'Assinado'   },
      nao_aceito: { bg: '#fee2e2', cor: '#dc2626', label: 'Não Aceito' }
    };
    const sc = statusCores[status] || statusCores.aguardando;

    return `
      <div class="calc-block" style="margin-bottom:10px;" id="proposta-card-${p.id}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;cursor:pointer;" onclick="reabrirProposta('${p.id}')">
          <div>
            <div style="font-family:'Sora',sans-serif;font-size:15px;font-weight:700;color:var(--t1);margin-bottom:3px;">${escHtml(p.nome_cliente)}</div>
            <div style="font-size:12px;color:var(--t3);">${servicos}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-family:'Sora',sans-serif;font-size:16px;font-weight:800;color:var(--a1);">${total}</div>
            <div style="font-size:11px;color:var(--t3);margin-top:2px;">${data_fmt}</div>
          </div>
        </div>
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-size:11px;color:var(--t3);font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Status:</span>
          <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:${sc.bg};color:${sc.cor};">${sc.label}</span>
          <div style="display:flex;gap:6px;margin-left:auto;flex-wrap:wrap;">
            ${status !== 'aguardando' ? `<button onclick="alterarStatusProposta('${p.id}', 'aguardando')" style="padding:4px 10px;font-size:11px;border-radius:6px;border:1px solid var(--border);background:var(--bg2);color:var(--t2);cursor:pointer;font-family:'Sora',sans-serif;">Aguardando</button>` : ''}
            ${status !== 'enviado'    ? `<button onclick="alterarStatusProposta('${p.id}', 'enviado')"    style="padding:4px 10px;font-size:11px;border-radius:6px;border:1px solid #bae6fd;background:#e0f2fe;color:#0284c7;cursor:pointer;font-family:'Sora',sans-serif;">Enviado</button>` : ''}
            ${status !== 'assinado'   ? `<button onclick="alterarStatusProposta('${p.id}', 'assinado')"   style="padding:4px 10px;font-size:11px;border-radius:6px;border:1px solid #bbf7d0;background:#dcfce7;color:#16a34a;cursor:pointer;font-family:'Sora',sans-serif;">Assinado</button>` : ''}
            ${status !== 'nao_aceito' ? `<button onclick="alterarStatusProposta('${p.id}', 'nao_aceito')" style="padding:4px 10px;font-size:11px;border-radius:6px;border:1px solid #fecaca;background:#fee2e2;color:#dc2626;cursor:pointer;font-family:'Sora',sans-serif;">Não Aceito</button>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

async function alterarStatusProposta(id, novoStatus) {
  if (!window._sb || !window._currentUser) return;

  if (novoStatus === 'nao_aceito') {
    const confirmar = confirm('Marcar como "Não Aceito" irá excluir este registro permanentemente. Confirmar?');
    if (!confirmar) return;
    await window._sb.from('propostas').delete().eq('id', id);
    const card = document.getElementById('proposta-card-' + id);
    if (card) card.remove();
    return;
  }

  const { error } = await window._sb.from('propostas').update({ status: novoStatus }).eq('id', id);
  if (!error) carregarHistoricoPropostas();
}

async function carregarHistoricoBacen() {
  const lista = document.getElementById('historico-lista');
  if (!lista) return;
  if (!window._sb || !window._currentUser) {
    lista.innerHTML = '<div style="color:var(--t3);font-size:14px;text-align:center;padding:40px 0;">Faça login para ver o histórico.</div>';
    return;
  }
  lista.innerHTML = '<div style="color:var(--t3);font-size:14px;text-align:center;padding:40px 0;">Carregando...</div>';

  const { data, error } = await window._sb
    .from('bacen_analises')
    .select('id, nome_cliente, banco, atualizado_em')
    .eq('user_id', window._currentUser.id)
    .order('atualizado_em', { ascending: false })
    .limit(50);

  if (error || !data || data.length === 0) {
    lista.innerHTML = '<div style="color:var(--t3);font-size:14px;text-align:center;padding:40px 0;">Nenhuma análise BACEN encontrada.</div>';
    return;
  }

  lista.innerHTML = data.map(function(a) {
    const data_fmt = new Date(a.atualizado_em).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
    return `
      <div class="calc-block" style="margin-bottom:10px;cursor:pointer;" onclick="reabrirAnalise('${a.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div>
            <div style="font-family:'Sora',sans-serif;font-size:15px;font-weight:700;color:var(--t1);margin-bottom:3px;">${escHtml(a.nome_cliente || '—')}</div>
            <div style="font-size:12px;color:var(--t3);">Banco: ${escHtml(a.banco || '—')}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:11px;color:var(--t3);">${data_fmt}</div>
            <div style="margin-top:6px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#f0f9ff;color:#0284c7;display:inline-block;">Ver análise →</div>
          </div>
        </div>
      </div>`;
  }).join('');
}

async function reabrirAnalise(id) {
  if (!window._sb || !window._currentUser) return;
  const { data, error } = await window._sb.from('bacen_analises').select('dados_completos').eq('id', id).single();
  if (error || !data) return;
  Object.assign(estado, data.dados_completos);
  navigate('bacen');
  setTimeout(function() { goToStep(1); }, 100);
}

function reabrirProposta(id) {
  if (!window._sb || !window._currentUser) return;
  window._sb.from('propostas').select('dados_completos').eq('id', id).single()
    .then(function(res) {
      if (res.error || !res.data) return;
      const saved = res.data.dados_completos;
      Object.assign(state, saved);
      state.currentStep = 2;
      navigate('calcHonorarios');
      setTimeout(function() { goToStep(2, false); }, 100);
    });
}

function novaProposta() {
  closeSummary();
  Object.assign(state, {
    nomeCliente:'', tipoServico:[], valorBase:0, horasAnalise:0,
    tutelaLiminar:false, urgencia:1, especificidade:1, complexidade:1,
    honorariosExito:false, percentualExito:20, valorCausa:0,
    modalidadeCausa:'fixo_exito', observacoes:'',
    currentStep:1, calc:{}
  });
  goToStep(1, false);
}
