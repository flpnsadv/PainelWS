/* ══════════════════════════════════════════════════════════════════
   MARKETING — gestão de leads, funil e origem de clientes
══════════════════════════════════════════════════════════════════ */

let _mktLeads = [];

const LEAD_STATUS = ['novo', 'contato', 'proposta', 'convertido', 'perdido'];
const LEAD_STATUS_LABEL = { novo: 'Novo', contato: 'Em contato', proposta: 'Proposta enviada', convertido: 'Convertido', perdido: 'Perdido' };
const LEAD_ORIGEM_LABEL = { indicacao: 'Indicação', google: 'Google', instagram: 'Instagram', site: 'Site', outro: 'Outro' };

async function mktCarregar() {
  if (!window._sb || !officeId()) return;
  const { data, error } = await window._sb
    .from('leads').select('*')
    .eq('office_id', officeId())
    .order('created_at', { ascending: false });
  if (error) { console.error('mktCarregar:', error); return; }
  _mktLeads = data || [];
  mktRender();
}

function mktRender() {
  // Funil em colunas
  const funil = document.getElementById('mkt-funil');
  if (!funil) return;
  funil.innerHTML = LEAD_STATUS.map(st => {
    const leads = _mktLeads.filter(l => l.status === st);
    return `
    <div class="mkt-col mkt-col-${st}">
      <div class="mkt-col-head">${LEAD_STATUS_LABEL[st]} <span class="mkt-col-count">${leads.length}</span></div>
      <div class="mkt-col-body">
        ${leads.map(l => `
          <div class="mkt-card" onclick="leadAbrirForm('${l.id}')">
            <div class="mkt-card-nome">${escHtml(l.nome)}</div>
            <div class="mkt-card-sub">${escHtml([LEAD_ORIGEM_LABEL[l.origem], l.interesse].filter(Boolean).join(' · '))}</div>
            ${l.valor_estimado ? '<div class="mkt-card-valor">R$ ' + Number(l.valor_estimado).toLocaleString('pt-BR') + '</div>' : ''}
          </div>`).join('') || '<div class="mkt-col-empty">—</div>'}
      </div>
    </div>`;
  }).join('');

  // Estatísticas de origem
  const stats = document.getElementById('mkt-origens');
  if (stats) {
    const total = _mktLeads.length || 1;
    const porOrigem = {};
    _mktLeads.forEach(l => { porOrigem[l.origem] = (porOrigem[l.origem] || 0) + 1; });
    stats.innerHTML = Object.keys(LEAD_ORIGEM_LABEL).map(o => {
      const n = porOrigem[o] || 0;
      const pct = Math.round(n / total * 100);
      return `
      <div class="mkt-origem-row">
        <span class="mkt-origem-lbl">${LEAD_ORIGEM_LABEL[o]}</span>
        <div class="mkt-origem-track"><div class="mkt-origem-fill" style="width:${pct}%"></div></div>
        <span class="mkt-origem-num">${n}</span>
      </div>`;
    }).join('');
  }
  const conv = document.getElementById('mkt-taxa-conv');
  if (conv) {
    const fechados = _mktLeads.filter(l => l.status === 'convertido').length;
    const encerrados = fechados + _mktLeads.filter(l => l.status === 'perdido').length;
    conv.textContent = encerrados ? Math.round(fechados / encerrados * 100) + '%' : '—';
  }
}

/* ── Form lead ── */
function leadAbrirForm(id) {
  const l = id ? _mktLeads.find(x => x.id === id) : null;
  document.getElementById('lead-form-id').value = l ? l.id : '';
  document.getElementById('lead-form-titulo').textContent = l ? 'Editar lead' : 'Novo lead';
  document.getElementById('lead-f-nome').value = l ? l.nome : '';
  document.getElementById('lead-f-contato').value = l ? (l.contato || '') : '';
  document.getElementById('lead-f-origem').value = l ? l.origem : 'indicacao';
  document.getElementById('lead-f-status').value = l ? l.status : 'novo';
  document.getElementById('lead-f-interesse').value = l ? (l.interesse || '') : '';
  document.getElementById('lead-f-valor').value = l ? (l.valor_estimado || '') : '';
  document.getElementById('lead-f-obs').value = l ? (l.observacoes || '') : '';
  document.getElementById('btn-lead-converter').style.display = (l && l.status !== 'convertido') ? '' : 'none';
  document.getElementById('leadFormModal').classList.remove('hidden');
}

function leadFecharForm() {
  document.getElementById('leadFormModal').classList.add('hidden');
}

async function leadSalvar() {
  const id = document.getElementById('lead-form-id').value;
  const nome = document.getElementById('lead-f-nome').value.trim();
  if (!nome) { alert('Informe o nome.'); return; }
  const valor = parseFloat(document.getElementById('lead-f-valor').value);
  const payload = {
    office_id: officeId(),
    nome: nome,
    contato: document.getElementById('lead-f-contato').value.trim() || null,
    origem: document.getElementById('lead-f-origem').value,
    status: document.getElementById('lead-f-status').value,
    interesse: document.getElementById('lead-f-interesse').value.trim() || null,
    valor_estimado: isNaN(valor) ? null : valor,
    observacoes: document.getElementById('lead-f-obs').value.trim() || null,
    updated_at: new Date().toISOString(),
  };
  let error;
  if (id) {
    ({ error } = await window._sb.from('leads').update(payload).eq('id', id));
  } else {
    payload.created_by = window._currentUser.id;
    ({ error } = await window._sb.from('leads').insert(payload));
  }
  if (error) { console.error('leadSalvar:', error); alert('Erro ao salvar lead.'); return; }
  leadFecharForm();
  mktCarregar();
}

// Converte lead em cliente (cria registro em clientes e marca convertido)
async function leadConverter() {
  const id = document.getElementById('lead-form-id').value;
  const l = _mktLeads.find(x => x.id === id);
  if (!l || !confirm('Converter este lead em cliente?')) return;
  const { data: novo, error } = await window._sb.from('clientes').insert({
    office_id: officeId(),
    created_by: window._currentUser.id,
    nome: l.nome,
    telefone: l.contato || null,
    origem: l.origem,
    status: 'ativo',
    observacoes: l.interesse ? 'Interesse: ' + l.interesse : null,
  }).select('id').single();
  if (error) { console.error(error); alert('Erro ao converter.'); return; }
  await window._sb.from('leads').update({
    status: 'convertido', cliente_id: novo.id, updated_at: new Date().toISOString(),
  }).eq('id', id);
  leadFecharForm();
  mktCarregar();
  if (typeof cliCarregar === 'function') cliCarregar();
}
