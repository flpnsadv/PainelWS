/* ══════════════════════════════════════════════════════════════════
   DASHBOARD — Relatórios da Home (propostas, conversão, atividade)
══════════════════════════════════════════════════════════════════ */

// Período ativo do relatório: 'mes' | '3m' | 'ano' | 'tudo'
let _dashPeriodo = 'mes';

// Cache da última carga (evita re-consultar ao trocar de período)
let _dashPropostas = null;
let _dashBacen     = null;

const DASH_STATUS_META = {
  aguardando: { label: 'Aguardando envio', cor: 'var(--warn, #f59e0b)' },
  enviado:    { label: 'Enviada',          cor: 'var(--a1)' },
  assinado:   { label: 'Assinada',         cor: 'var(--ok)' },
  nao_aceito: { label: 'Não aceita',       cor: 'var(--err)' },
};

const _dashBrl = v => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const _dashBrlFull = v => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

function _dashValorProposta(p) {
  return Number(p.total_final) || Number(p.total_fixo) || 0;
}

function _dashInicioPeriodo(periodo) {
  const now = new Date();
  if (periodo === 'mes')  return new Date(now.getFullYear(), now.getMonth(), 1);
  if (periodo === '3m')   return new Date(now.getFullYear(), now.getMonth() - 2, 1);
  if (periodo === 'ano')  return new Date(now.getFullYear(), 0, 1);
  return null; // tudo
}

// Cache da visão geral do escritório (clientes, casos, prazos, intimações, leads)
let _dashSaas = null;

// ── Carrega dados do Supabase e renderiza tudo ──
async function dashCarregar(force) {
  if (!window._sb || !window._currentUser) return;
  if (typeof officeId === 'function' && !officeId()) return; // sem escritório ainda
  const oid = officeId();
  if (force || !_dashPropostas) {
    const [props, bacen, clientes, casos, tarefas, intimacoes, leads] = await Promise.all([
      window._sb.from('propostas')
        .select('id, criado_em, nome_cliente, tipo_servico, total_fixo, total_final, status, status_atualizado_em')
        .eq('office_id', oid)
        .order('criado_em', { ascending: false }),
      window._sb.from('bacen_analises')
        .select('id, nome_cliente, banco, atualizado_em')
        .eq('office_id', oid)
        .order('atualizado_em', { ascending: false }),
      window._sb.from('clientes').select('id, status').eq('office_id', oid),
      window._sb.from('casos').select('id, status').eq('office_id', oid),
      window._sb.from('tarefas')
        .select('id, titulo, tipo, data_limite, hora, status, prioridade, casos(titulo)')
        .eq('office_id', oid).eq('status', 'pendente')
        .order('data_limite', { ascending: true, nullsFirst: false })
        .limit(200),
      window._sb.from('intimacoes').select('id, lida').eq('office_id', oid),
      window._sb.from('leads').select('id, status').eq('office_id', oid),
    ]);
    _dashPropostas = props.data || [];
    _dashBacen     = bacen.data || [];
    _dashSaas = {
      clientes:   clientes.data   || [],
      casos:      casos.data      || [],
      tarefas:    tarefas.data    || [],
      intimacoes: intimacoes.data || [],
      leads:      leads.data      || [],
    };
  }
  dashRender();
}

/* ── Visão geral do escritório: KPIs + próximos prazos ── */
function _dashRenderSaas() {
  if (!_dashSaas) return;
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const diasAte = t => Math.round((new Date(t.data_limite + 'T00:00:00') - hoje) / 86400000);

  const cliAtivos = _dashSaas.clientes.filter(c => c.status === 'ativo').length;
  set('kpi-clientes', String(cliAtivos));
  const prospectos = _dashSaas.clientes.filter(c => c.status === 'prospecto').length;
  set('kpi-clientes-sub', prospectos ? prospectos + ' prospecto' + (prospectos > 1 ? 's' : '') : 'nenhum prospecto');

  const casosAtivos = _dashSaas.casos.filter(c => c.status === 'ativo').length;
  set('kpi-casos', String(casosAtivos));
  set('kpi-casos-sub', _dashSaas.casos.length + ' no total');

  const comData = _dashSaas.tarefas.filter(t => t.data_limite);
  const vencidos = comData.filter(t => diasAte(t) < 0).length;
  const em7 = comData.filter(t => { const d = diasAte(t); return d >= 0 && d <= 7; }).length;
  set('kpi-prazos', String(em7));
  set('kpi-prazos-sub', vencidos ? '⚠ ' + vencidos + ' vencido' + (vencidos > 1 ? 's' : '') : 'nenhum vencido');
  const kpiPrazos = document.getElementById('kpi-prazos-sub');
  if (kpiPrazos) kpiPrazos.style.color = vencidos ? 'var(--err)' : '';

  set('kpi-tarefas', String(_dashSaas.tarefas.length));
  const audiencias = _dashSaas.tarefas.filter(t => t.tipo === 'audiencia').length;
  set('kpi-tarefas-sub', audiencias ? audiencias + ' audiência' + (audiencias > 1 ? 's' : '') : 'em aberto');

  const naoLidas = _dashSaas.intimacoes.filter(i => !i.lida).length;
  set('kpi-intimacoes', String(naoLidas));
  set('kpi-intimacoes-sub', _dashSaas.intimacoes.length + ' registradas');

  const leadsAbertos = _dashSaas.leads.filter(l => ['novo', 'contato', 'proposta'].includes(l.status)).length;
  set('kpi-leads', String(leadsAbertos));
  const convertidos = _dashSaas.leads.filter(l => l.status === 'convertido').length;
  set('kpi-leads-sub', convertidos ? convertidos + ' convertido' + (convertidos > 1 ? 's' : '') : 'no funil');

  // Lista de próximos prazos e audiências
  const wrap = document.getElementById('home-prazos-list');
  if (!wrap) return;
  const proximos = comData.slice(0, 6);
  if (proximos.length === 0) {
    wrap.innerHTML = '<div class="dash-empty">Nenhum prazo agendado. ✓<br><span style="font-size:11px;">Importe intimações do DJEN ou crie tarefas com data limite.</span></div>';
    return;
  }
  const tipoLbl = { prazo: 'Prazo', audiencia: 'Audiência', tarefa: 'Tarefa' };
  wrap.innerHTML = proximos.map(t => {
    const d = diasAte(t);
    const urg = d < 0 ? 'vencida' : d <= 2 ? 'urgente' : d <= 7 ? 'proxima' : '';
    const quando = d < 0 ? Math.abs(d) + 'd atrás' : d === 0 ? 'HOJE' : d === 1 ? 'amanhã' : 'em ' + d + ' dias';
    const dt = new Date(t.data_limite + 'T12:00:00');
    const mesesLbl = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `
      <div class="home-prazo-item" onclick="navigate('tarefas')">
        <div class="home-prazo-data ${urg}">
          <div class="hp-dia">${dt.getDate()}</div>
          <div class="hp-mes">${mesesLbl[dt.getMonth()]}</div>
        </div>
        <div class="home-prazo-body">
          <div class="home-prazo-titulo">${escHtml(t.titulo)}</div>
          <div class="home-prazo-meta">${tipoLbl[t.tipo] || t.tipo}${t.casos ? ' · ' + escHtml(t.casos.titulo) : ''}${t.hora ? ' · ' + t.hora.slice(0, 5) : ''}</div>
        </div>
        <span class="home-prazo-quando ${urg}">${quando}</span>
      </div>`;
  }).join('');
}

function dashSetPeriodo(periodo) {
  _dashPeriodo = periodo;
  document.querySelectorAll('#dash-period .dash-period-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.period === periodo)
  );
  dashRender();
}

// Marca o cache como sujo (chamado quando uma proposta muda)
function dashInvalidar() { _dashPropostas = null; }

function dashRender() {
  if (!_dashPropostas) return;
  const inicio = _dashInicioPeriodo(_dashPeriodo);
  const noPeriodo = p => !inicio || new Date(p.criado_em) >= inicio;

  const props = _dashPropostas.filter(noPeriodo);
  const bacen = _dashBacen.filter(a => !inicio || new Date(a.atualizado_em) >= inicio);

  _dashRenderSaas();
  _dashRenderKpis(props, bacen);
  _dashRenderFunil(props);
  _dashRenderGrafico();
  _dashRenderAtividade();
}

// ── KPIs principais ──
function _dashRenderKpis(props, bacen) {
  const setVal = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  const setSub = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

  const assinadas  = props.filter(p => p.status === 'assinado');
  const naoAceitas = props.filter(p => p.status === 'nao_aceito');
  const enviadas   = props.filter(p => ['enviado', 'assinado', 'nao_aceito'].includes(p.status));

  const valorProposto = props.reduce((s, p) => s + _dashValorProposta(p), 0);
  const valorAssinado = assinadas.reduce((s, p) => s + _dashValorProposta(p), 0);

  setVal('home-stat-propostas', String(props.length));
  setSub('home-sub-propostas', valorProposto > 0 ? _dashBrl(valorProposto) + ' propostos' : 'nenhum valor proposto');

  setVal('home-stat-assinadas', String(assinadas.length));
  setSub('home-sub-assinadas', valorAssinado > 0 ? _dashBrl(valorAssinado) + ' em contratos' : 'nenhum contrato fechado');

  // Conversão: assinadas ÷ propostas que chegaram ao cliente (enviada/assinada/não aceita)
  if (enviadas.length > 0) {
    const taxa = (assinadas.length / enviadas.length) * 100;
    setVal('home-stat-conversao', taxa.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + '%');
    setSub('home-sub-conversao', `${assinadas.length} de ${enviadas.length} enviadas`);
  } else {
    setVal('home-stat-conversao', '—');
    setSub('home-sub-conversao', 'nenhuma proposta enviada');
  }

  const ticketBase = assinadas.length ? assinadas : props;
  const ticket = ticketBase.length
    ? ticketBase.reduce((s, p) => s + _dashValorProposta(p), 0) / ticketBase.length
    : 0;
  setVal('home-stat-ticket', ticket > 0 ? _dashBrl(ticket) : '—');
  setSub('home-sub-ticket', assinadas.length ? 'média dos assinados' : 'média das propostas');

  setVal('home-stat-bacen', String(bacen.length));
  setSub('home-sub-bacen', bacen.length === 1 ? 'análise no período' : 'análises no período');
}

// ── Funil de status ──
function _dashRenderFunil(props) {
  const wrap = document.getElementById('dash-funil');
  if (!wrap) return;

  if (props.length === 0) {
    wrap.innerHTML = '<div class="dash-empty">Nenhuma proposta no período selecionado.</div>';
    return;
  }

  const max = props.length;
  wrap.innerHTML = Object.keys(DASH_STATUS_META).map(st => {
    const meta  = DASH_STATUS_META[st];
    const lista = props.filter(p => (p.status || 'aguardando') === st);
    const valor = lista.reduce((s, p) => s + _dashValorProposta(p), 0);
    const pct   = max ? (lista.length / max) * 100 : 0;
    return `
      <div class="dash-funil-row">
        <div class="dash-funil-head">
          <span class="dash-funil-label"><span class="dash-dot" style="background:${meta.cor}"></span>${meta.label}</span>
          <span class="dash-funil-num">${lista.length} · ${_dashBrl(valor)}</span>
        </div>
        <div class="dash-funil-track">
          <div class="dash-funil-fill" style="width:${pct}%;background:${meta.cor}"></div>
        </div>
      </div>`;
  }).join('');

  const pendentes = props.filter(p => ['aguardando', 'enviado'].includes(p.status || 'aguardando')).length;
  if (pendentes > 0) {
    wrap.innerHTML += `<div class="dash-funil-note">${pendentes} proposta${pendentes > 1 ? 's' : ''} aguardando decisão do cliente</div>`;
  }
}

// ── Gráfico mensal: valor proposto × valor assinado (últimos 6 meses) ──
function _dashRenderGrafico() {
  const wrap = document.getElementById('dash-grafico');
  if (!wrap) return;

  const mesesLbl = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const now = new Date();
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    meses.push({ ano: d.getFullYear(), mes: d.getMonth(), proposto: 0, assinado: 0 });
  }
  const slot = data => {
    const d = new Date(data);
    return meses.find(m => m.ano === d.getFullYear() && m.mes === d.getMonth());
  };

  _dashPropostas.forEach(p => {
    const v = _dashValorProposta(p);
    const sCriado = slot(p.criado_em);
    if (sCriado) sCriado.proposto += v;
    if (p.status === 'assinado' && p.status_atualizado_em) {
      const sAssinado = slot(p.status_atualizado_em);
      if (sAssinado) sAssinado.assinado += v;
    }
  });

  const max = Math.max(1, ...meses.map(m => Math.max(m.proposto, m.assinado)));
  const h = v => Math.max(v > 0 ? 3 : 0, (v / max) * 100);

  wrap.innerHTML = `
    <div class="dash-chart-bars">
      ${meses.map(m => `
        <div class="dash-chart-month">
          <div class="dash-chart-cols">
            <div class="dash-chart-bar bar-proposto" style="height:${h(m.proposto)}%" title="Proposto: ${_dashBrlFull(m.proposto)}"></div>
            <div class="dash-chart-bar bar-assinado" style="height:${h(m.assinado)}%" title="Assinado: ${_dashBrlFull(m.assinado)}"></div>
          </div>
          <div class="dash-chart-lbl">${mesesLbl[m.mes]}</div>
        </div>`).join('')}
    </div>
    <div class="dash-chart-legend">
      <span><span class="dash-dot" style="background:var(--a1)"></span>Proposto</span>
      <span><span class="dash-dot" style="background:var(--ok)"></span>Assinado</span>
    </div>`;
}

// ── Atividade recente (propostas + assinaturas + BACEN) ──
function _dashRenderAtividade() {
  const wrap = document.getElementById('home-act-list');
  if (!wrap) return;

  const eventos = [];
  _dashPropostas.forEach(p => {
    eventos.push({
      data: p.criado_em,
      cor: 'var(--a1)',
      titulo: `Proposta criada — ${p.nome_cliente || '—'}`,
      meta: _dashBrlFull(_dashValorProposta(p)),
    });
    if (p.status === 'assinado' && p.status_atualizado_em) {
      eventos.push({
        data: p.status_atualizado_em,
        cor: 'var(--ok)',
        titulo: `Contrato assinado — ${p.nome_cliente || '—'}`,
        meta: _dashBrlFull(_dashValorProposta(p)),
      });
    }
    if (p.status === 'nao_aceito' && p.status_atualizado_em) {
      eventos.push({
        data: p.status_atualizado_em,
        cor: 'var(--err)',
        titulo: `Proposta não aceita — ${p.nome_cliente || '—'}`,
        meta: _dashBrlFull(_dashValorProposta(p)),
      });
    }
  });
  _dashBacen.forEach(a => {
    eventos.push({
      data: a.atualizado_em,
      cor: 'var(--warn, #f59e0b)',
      titulo: `Análise BACEN — ${a.nome_cliente || a.banco || '—'}`,
      meta: a.banco || 'revisional',
    });
  });

  eventos.sort((a, b) => new Date(b.data) - new Date(a.data));
  const top = eventos.slice(0, 8);

  if (top.length === 0) {
    wrap.innerHTML = `
      <div class="act-item">
        <div class="act-dot-wrap"><div class="act-dot" style="background:var(--t3)"></div></div>
        <div><div class="act-title" style="color:var(--t3);font-size:11.5px;">Nenhum registro ainda</div></div>
      </div>`;
    return;
  }

  wrap.innerHTML = top.map(ev => {
    const d = new Date(ev.data);
    const dataFmt = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="act-item">
        <div class="act-dot-wrap"><div class="act-dot" style="background:${ev.cor}"></div><div class="act-line"></div></div>
        <div>
          <div class="act-title">${escHtml(ev.titulo)}</div>
          <div class="act-meta">${escHtml(ev.meta)} · ${dataFmt}</div>
        </div>
      </div>`;
  }).join('');
}

// ── Seletor de período ──
document.getElementById('dash-period')?.addEventListener('click', e => {
  const btn = e.target.closest('.dash-period-btn');
  if (btn) dashSetPeriodo(btn.dataset.period);
});
