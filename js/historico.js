/* ══════════════════════════════════════════════
   HISTÓRICO DE PROPOSTAS
══════════════════════════════════════════════ */

// ── Estado da aba ativa no histórico
let _historicoTabAtiva = 'propostas';

const HIST_STATUS = {
  aguardando: 'Aguardando',
  enviado:    'Enviado',
  assinado:   'Assinado',
  nao_aceito: 'Não Aceito',
};

function _histMsg(txt) {
  return `<div class="hist-empty">${txt}</div>`;
}

function switchHistoricoTab(aba) {
  _historicoTabAtiva = aba;
  document.getElementById('tab-btn-propostas')?.classList.toggle('active', aba === 'propostas');
  document.getElementById('tab-btn-bacen')?.classList.toggle('active', aba === 'bacen');
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
    lista.innerHTML = _histMsg('Faça login para ver o histórico.');
    return;
  }
  lista.innerHTML = _histMsg('Carregando...');

  const { data, error } = await window._sb
    .from('propostas')
    .select('id, criado_em, nome_cliente, tipo_servico, total_fixo, total_final, status')
    .eq('user_id', window._currentUser.id)
    .order('criado_em', { ascending: false })
    .limit(50);

  if (error || !data || data.length === 0) {
    lista.innerHTML = _histMsg('Nenhuma proposta encontrada.');
    return;
  }

  lista.innerHTML = data.map(function(p) {
    const dataFmt  = new Date(p.criado_em).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
    const total    = (p.total_final || p.total_fixo || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
    const servicos = Array.isArray(p.tipo_servico) && p.tipo_servico.length > 0
      ? p.tipo_servico.map(function(i) { return SERVICOS[i] ? SERVICOS[i].title : ''; }).filter(Boolean).join(', ')
      : '—';
    const status = HIST_STATUS[p.status] ? p.status : 'aguardando';

    const botoes = Object.keys(HIST_STATUS)
      .filter(s => s !== status)
      .map(s => `<button class="hist-status-btn st-${s}" data-status="${s}" data-id="${p.id}">${HIST_STATUS[s]}</button>`)
      .join('');

    return `
      <div class="calc-block hist-card" id="proposta-card-${p.id}">
        <div class="hist-card-main" data-reabrir-proposta="${p.id}">
          <div>
            <div class="hist-nome">${escHtml(p.nome_cliente)}</div>
            <div class="hist-servicos">${escHtml(servicos)}</div>
          </div>
          <div class="hist-card-right">
            <div class="hist-valor">${total}</div>
            <div class="hist-data">${dataFmt}</div>
          </div>
        </div>
        <div class="hist-status-row">
          <span class="hist-status-lbl">Status:</span>
          <span class="hist-status-badge st-${status}">${HIST_STATUS[status]}</span>
          <div class="hist-status-btns">${botoes}</div>
        </div>
      </div>`;
  }).join('');
}

async function alterarStatusProposta(id, novoStatus) {
  if (!window._sb || !window._currentUser) return;
  const { error } = await window._sb.from('propostas')
    .update({ status: novoStatus })
    .eq('id', id)
    .eq('user_id', window._currentUser.id);
  if (!error) carregarHistoricoPropostas();
}

async function carregarHistoricoBacen() {
  const lista = document.getElementById('historico-lista');
  if (!lista) return;
  if (!window._sb || !window._currentUser) {
    lista.innerHTML = _histMsg('Faça login para ver o histórico.');
    return;
  }
  lista.innerHTML = _histMsg('Carregando...');

  const { data, error } = await window._sb
    .from('bacen_analises')
    .select('id, nome_cliente, banco, atualizado_em')
    .eq('user_id', window._currentUser.id)
    .order('atualizado_em', { ascending: false })
    .limit(50);

  if (error || !data || data.length === 0) {
    lista.innerHTML = _histMsg('Nenhuma análise BACEN encontrada.');
    return;
  }

  lista.innerHTML = data.map(function(a) {
    const dataFmt = new Date(a.atualizado_em).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
    return `
      <div class="calc-block hist-card">
        <div class="hist-card-main" data-reabrir-analise="${a.id}">
          <div>
            <div class="hist-nome">${escHtml(a.nome_cliente || '—')}</div>
            <div class="hist-servicos">Banco: ${escHtml(a.banco || '—')}</div>
          </div>
          <div class="hist-card-right">
            <div class="hist-data">${dataFmt}</div>
            <span class="hist-ver-analise">Ver análise →</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

async function reabrirAnalise(id) {
  if (!window._sb || !window._currentUser) return;
  const { data, error } = await window._sb.from('bacen_analises')
    .select('dados_completos')
    .eq('id', id)
    .eq('user_id', window._currentUser.id)
    .single();
  if (error || !data) return;
  navigate('bacen');
  window.platCarregarAnalise(data.dados_completos, id);
}

async function reabrirProposta(id) {
  if (!window._sb || !window._currentUser) return;
  const { data, error } = await window._sb.from('propostas')
    .select('dados_completos')
    .eq('id', id)
    .eq('user_id', window._currentUser.id)
    .single();
  if (error || !data) return;
  Object.assign(state, data.dados_completos);
  state._propostaSalva = true; // já existe no histórico — não duplicar ao reabrir o resumo
  state.currentStep = 2;
  navigate('calcHonorarios');
  goToStep(2, false);
}

function novaProposta() {
  closeSummary();
  Object.assign(state, {
    nomeCliente:'', tipoServico:[], valorBase:0, horasAnalise:0,
    tutelaLiminar:false, urgencia:1, especificidade:1, complexidade:1,
    honorariosExito:false, percentualExito:20, valorCausa:0,
    modalidadeCausa:'fixo_exito', observacoes:'',
    currentStep:1, calc:{}, _propostaSalva:false
  });
  goToStep(1, false);
}

// ── Delegação de eventos da lista (os cards são re-renderizados a cada carga)
document.getElementById('historico-lista').addEventListener('click', function(e) {
  const btn = e.target.closest('[data-status]');
  if (btn) { alterarStatusProposta(btn.dataset.id, btn.dataset.status); return; }
  const prop = e.target.closest('[data-reabrir-proposta]');
  if (prop) { reabrirProposta(prop.dataset.reabrirProposta); return; }
  const ana = e.target.closest('[data-reabrir-analise]');
  if (ana) reabrirAnalise(ana.dataset.reabrirAnalise);
});
