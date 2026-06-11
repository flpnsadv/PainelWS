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
  _propostaSalva: false, // evita inserts duplicados no histórico
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
  c.pctTutela       = s.tutelaLiminar ? CFG.tutela : 0;
  c.pctTotal        = c.pctUrgencia + c.pctEspecific + c.pctComplexidade + c.pctTutela;

  c.valorAjustado  = s.valorBase * (1 + c.pctTotal / 100);
  c.taxaHoraria    = c.valorAjustado / CFG.horasMes;
  c.adicionalHoras = c.taxaHoraria * (s.horasAnalise || 0);
  c.subtotal       = c.valorAjustado + c.adicionalHoras;
  c.iss            = c.subtotal * (CFG.iss / 100);
  c.totalFixo      = c.subtotal + c.iss;

  c.valorExito = (s.honorariosExito && s.valorCausa > 0)
    ? s.valorCausa * (s.percentualExito / 100) : 0;
  c.totalFinal = s.modalidadeCausa === 'apenas_exito' ? c.valorExito
               : s.modalidadeCausa === 'maior'        ? Math.max(c.totalFixo, c.valorExito)
               : c.totalFixo + c.valorExito;

  const V = c.totalFixo;
  const descAvista = CFG.avista / 100;
  const pctEntrada = CFG.entrada / 100;
  const taxaCartao = CFG.cartao / 100;

  c.avista = V * (1 - descAvista); c.avistaEconomia = V * descAvista;
  c.entrada = V * pctEntrada; c.saldo = V * (1 - pctEntrada);
  let np = Math.max(1, Math.ceil(c.saldo / 790)), pv = c.saldo / np;
  while (pv > 880 && np < 36) { np++; pv = c.saldo / np; }
  while (pv < 700 && np > 1)  { np--; pv = c.saldo / np; }
  c.nParcelas = np; c.valorParcela = pv;

  c.ccOptions = CC_PLANS.map(n => {
    const total = V * Math.pow(1 + taxaCartao, n);
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
        <div class="toggle-btn ${s.tutelaLiminar?'sel':''}" data-action="set-tutela" data-val="true">Sim — tutela/liminar (+${fmt.pct(CFG.tutela)})</div>
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

    ${s.tutelaLiminar ? `<div class="info-banner">⚡ <span><strong>Tutela/Liminar ativa</strong> — acréscimo de ${fmt.pct(CFG.tutela)} incluído nos ajustes.</span></div>` : ''}

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
      ${s.tutelaLiminar ? `<div class="calc-row"><span class="lbl">Tutela / Liminar</span><span class="badge">+${fmt.pct(CFG.tutela)}</span></div>` : ''}
      <hr class="calc-divider">
      <div class="calc-row">
        <span class="lbl" style="font-weight:700;color:var(--t1)">Total de Ajustes</span>
        ${c.pctTotal > 0 ? `<span class="badge" style="font-size:12px;padding:3px 12px">+${fmt.pct(c.pctTotal)}</span>` : `<span class="badge badge-neutral" style="font-size:12px;padding:3px 12px">0%</span>`}
      </div>
    </div>

    <div class="calc-block">
      <div class="calc-block-title">Composição dos Honorários Fixos</div>
      <div class="calc-row"><span class="lbl">Valor Ajustado (base × ${(1 + c.pctTotal/100).toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3})})</span><span class="val">${fmt.brl(c.valorAjustado)}</span></div>
      <div class="calc-row"><span class="lbl">Taxa Horária (÷ ${CFG.horasMes}h mensais)</span><span class="val">${fmt.brl(c.taxaHoraria)}/h</span></div>
      <div class="calc-row"><span class="lbl">Adicional de Análise (${s.horasAnalise}h)</span><span class="val">${fmt.brl(c.adicionalHoras)}</span></div>
      <hr class="calc-divider">
      <div class="calc-row"><span class="lbl">Subtotal</span><span class="val">${fmt.brl(c.subtotal)}</span></div>
      <div class="calc-row"><span class="lbl">Imposto ${fmt.pct(CFG.iss)}</span><span class="val">${fmt.brl(c.iss)}</span></div>
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
      <div class="pay-row"><span class="lbl">Desconto de ${fmt.pct(CFG.avista)}</span><span class="val" style="color:var(--ok)">− ${fmt.brl(c.avistaEconomia)}</span></div>
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
      <div class="pay-row"><span class="lbl">Entrada (${fmt.pct(CFG.entrada)})</span><span class="val">${fmt.brl(c.entrada)}</span></div>
      <div class="pay-row"><span class="lbl">Saldo restante (${fmt.pct(100-CFG.entrada)})</span><span class="val">${fmt.brl(c.saldo)}</span></div>
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
        <div class="pay-badge pb-red">Juros compostos ${fmt.pct(CFG.cartao)} a.m.</div>
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
      ${s.tutelaLiminar?`<div class="sum-row"><span class="lbl">Tutela / Liminar</span><span class="val">Sim (+${fmt.pct(CFG.tutela)})</span></div>`:''}
    </div>

    <div class="sum-section">
      <div class="sum-section-title">Ajustes Aplicados</div>
      <div class="sum-row"><span class="lbl">Urgência (Nível ${s.urgencia} — ${LEVEL_LABELS[s.urgencia]})</span><span class="val">+${fmt.pct(c.pctUrgencia)}</span></div>
      <div class="sum-row"><span class="lbl">Especificidade (Nível ${s.especificidade} — ${LEVEL_LABELS[s.especificidade]})</span><span class="val">+${fmt.pct(c.pctEspecific)}</span></div>
      <div class="sum-row"><span class="lbl">Complexidade (Nível ${s.complexidade} — ${LEVEL_LABELS[s.complexidade]})</span><span class="val">+${fmt.pct(c.pctComplexidade)}</span></div>
      ${s.tutelaLiminar?`<div class="sum-row"><span class="lbl">Tutela / Liminar</span><span class="val">+${fmt.pct(CFG.tutela)}</span></div>`:''}
      <div class="sum-row" style="font-weight:700"><span class="lbl" style="color:var(--t2)">Total de Ajustes</span><span class="val">+${fmt.pct(c.pctTotal)}</span></div>
    </div>

    <div class="sum-section">
      <div class="sum-section-title">Composição dos Honorários Fixos</div>
      <div class="sum-row"><span class="lbl">Valor Ajustado</span><span class="val">${fmt.brl(c.valorAjustado)}</span></div>
      <div class="sum-row"><span class="lbl">Adicional de Análise</span><span class="val">${fmt.brl(c.adicionalHoras)}</span></div>
      <div class="sum-row"><span class="lbl">Subtotal</span><span class="val">${fmt.brl(c.subtotal)}</span></div>
      <div class="sum-row"><span class="lbl">Imposto ${fmt.pct(CFG.iss)}</span><span class="val">${fmt.brl(c.iss)}</span></div>
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
      <div class="sum-row"><span class="lbl">À Vista (${fmt.pct(CFG.avista)} desc.)</span><span class="val" style="color:var(--ok)">${fmt.brl(c.avista)} <span style="color:var(--t3);font-weight:400">(ec. ${fmt.brl(c.avistaEconomia)})</span></span></div>
      <div class="sum-row"><span class="lbl">Parcelado (Boleto/Pix)</span><span class="val">Entrada ${fmt.brl(c.entrada)} + ${c.nParcelas}x de ${fmt.brl(c.valorParcela)}</span></div>
      ${ccSumRows}
    </div>

    ${s.observacoes?`
    <div class="sum-section">
      <div class="sum-section-title">Observações</div>
      <div class="sum-obs">${escHtml(s.observacoes)}</div>
    </div>`:''}

    <div class="sum-actions">
      <button class="btn btn-outline" id="btn-copy-text"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copiar Texto</button>
      <button class="btn btn-outline" id="btn-gerar-docx"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Gerar Proposta (Word)</button>
      <div style="flex-basis:100%;height:0;border-top:1px solid var(--div);margin:4px 0"></div>
      <button class="btn btn-ghost" id="btn-nova-proposta"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nova Proposta</button>
      <button class="btn btn-ghost" id="btn-fechar-resumo">Fechar</button>
    </div>`;

  // Salvar proposta no histórico — apenas uma vez por proposta
  if (!state._propostaSalva) {
    state._propostaSalva = true;
    (async function() {
      if (!window._sb || !window._currentUser) { state._propostaSalva = false; return; }
      const s = state;
      const c = s.calc;
      const { error } = await window._sb.from('propostas').insert({
        user_id:        window._currentUser.id,
        nome_cliente:   s.nomeCliente,
        tipo_servico:   s.tipoServico,
        valor_base:     s.valorBase,
        total_fixo:     c.totalFixo  || 0,
        total_final:    c.totalFinal || 0,
        dados_completos: JSON.parse(JSON.stringify(s))
      });
      if (error) state._propostaSalva = false;
      else if (typeof dashInvalidar === 'function') dashInvalidar();
    })();
  }

  document.getElementById('summary-modal').classList.add('open');
  document.getElementById('btn-gerar-docx').onclick    = () => abrirPropostaForm();
  document.getElementById('btn-nova-proposta').onclick = () => novaProposta();
  document.getElementById('btn-fechar-resumo').onclick = () => closeSummary();
  document.getElementById('btn-copy-text').onclick = () => {
    const text = buildPlainText();
    const svgCopy = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    const flash = () => { const b=document.getElementById('btn-copy-text'); if(b){b.innerHTML='✓ Copiado!';setTimeout(()=>{if(b)b.innerHTML=svgCopy+'Copiar Texto'},2000);} };
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
    `Horas de Análise: ${s.horasAnalise}h`,`Tutela/Liminar: ${s.tutelaLiminar?`Sim (+${fmt.pct(CFG.tutela)})`:'Não'}`, '',
    'AJUSTES', sep,
    `Urgência (Nível ${s.urgencia}): +${fmt.pct(c.pctUrgencia)}`,
    `Especificidade (Nível ${s.especificidade}): +${fmt.pct(c.pctEspecific)}`,
    `Complexidade (Nível ${s.complexidade}): +${fmt.pct(c.pctComplexidade)}`,
    s.tutelaLiminar?`Tutela/Liminar: +${fmt.pct(CFG.tutela)}`:null,
    `Total: +${fmt.pct(c.pctTotal)}`, '',
    'COMPOSIÇÃO', sep,
    `Valor Ajustado: ${fmt.brl(c.valorAjustado)}`,
    `Adicional Análise: ${fmt.brl(c.adicionalHoras)}`,
    `Subtotal: ${fmt.brl(c.subtotal)}`,`Imposto ${fmt.pct(CFG.iss)}: ${fmt.brl(c.iss)}`,
    `TOTAL HONORÁRIOS FIXOS: ${fmt.brl(c.totalFixo)}`,
  ].filter(Boolean);
  if (s.honorariosExito) lines.push('','HONORÁRIOS DE ÊXITO',sep,`Percentual: ${s.percentualExito}%`,`Valor da Causa: ${fmt.brl(s.valorCausa)}`,`Honorários de Êxito: ${fmt.brl(c.valorExito)}`,`Total Estimado Final: ${fmt.brl(c.totalFinal)}`);
  lines.push('','PAGAMENTO',sep,
    `À Vista (${fmt.pct(CFG.avista)} desc.): ${fmt.brl(c.avista)} (ec. ${fmt.brl(c.avistaEconomia)})`,
    `Parcelado: Entrada ${fmt.brl(c.entrada)} + ${c.nParcelas}x de ${fmt.brl(c.valorParcela)}`,
    `Cartão (${fmt.pct(CFG.cartao)} a.m.):`,
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
  state._propostaSalva = false;
  refreshInPlace();
});

document.getElementById('step-container').addEventListener('input', function(e) {
  const el = e.target;
  if (!el.dataset.bind) return;
  state[el.dataset.bind] = el.type==='number' ? (parseFloat(el.value)||0) : el.value;
  state._propostaSalva = false;
  el.closest('[data-field]')?.classList.remove('has-error');
});

document.getElementById('btn-prev').addEventListener('click', () => goToStep(state.currentStep-1));
document.getElementById('btn-next').addEventListener('click', () => tryAdvance());
document.getElementById('summary-modal').addEventListener('click', e => { if(e.target===e.currentTarget) closeSummary(); });

// Init Calculadora de Honorários
calculate();
document.getElementById('step-container').innerHTML = buildStep1();
updateProgress(1);
