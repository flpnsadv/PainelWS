/* ══════════════════════════════════════════════════════════════════
   CLIENTES — CRM + ficha interna do cliente (interações)
══════════════════════════════════════════════════════════════════ */

let _cliLista = [];
let _cliFiltro = '';
let _cliStatusFiltro = 'todos';
let _cliFichaAberta = null; // id do cliente com ficha aberta

const CLI_STATUS_LABEL = { ativo: 'Ativo', prospecto: 'Prospecto', inativo: 'Inativo' };
const CLI_INT_LABEL = { atendimento: 'Atendimento', reuniao: 'Reunião', anotacao: 'Anotação', ligacao: 'Ligação' };

async function cliCarregar() {
  if (!window._sb || !officeId()) return;
  const cont = document.getElementById('cli-lista');
  if (cont && _cliLista.length === 0) cont.innerHTML = '<div class="crud-empty">Carregando…</div>';
  const { data, error } = await window._sb
    .from('clientes')
    .select('*')
    .eq('office_id', officeId())
    .order('nome');
  if (error) { console.error('cliCarregar:', error); return; }
  _cliLista = data || [];
  cliRender();
}

function cliRender() {
  const cont = document.getElementById('cli-lista');
  if (!cont) return;
  const q = _cliFiltro.toLowerCase();
  let lista = _cliLista.filter(c =>
    (!q || (c.nome || '').toLowerCase().includes(q) || (c.cpf_cnpj || '').includes(q) || (c.email || '').toLowerCase().includes(q)) &&
    (_cliStatusFiltro === 'todos' || c.status === _cliStatusFiltro)
  );
  const countEl = document.getElementById('cli-count');
  if (countEl) countEl.textContent = lista.length + (lista.length === 1 ? ' cliente' : ' clientes');
  if (lista.length === 0) {
    cont.innerHTML = '<div class="crud-empty">Nenhum cliente encontrado.<br><span style="font-size:12px;color:var(--t3)">Clique em "Novo cliente" para cadastrar.</span></div>';
    return;
  }
  cont.innerHTML = lista.map(c => `
    <div class="crud-row" onclick="cliAbrirFicha('${c.id}')">
      <div class="crud-avatar">${escHtml((c.nome || '?').trim().charAt(0).toUpperCase())}</div>
      <div class="crud-main">
        <div class="crud-title">${escHtml(c.nome)}</div>
        <div class="crud-sub">${escHtml([c.tipo_pessoa, c.telefone, c.email].filter(Boolean).join(' · '))}</div>
      </div>
      <span class="crud-badge badge-${c.status}">${CLI_STATUS_LABEL[c.status] || c.status}</span>
      <span class="crud-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></span>
    </div>`).join('');
}

/* ── Form novo/editar ── */
function cliAbrirForm(id) {
  const c = id ? _cliLista.find(x => x.id === id) : null;
  document.getElementById('cli-form-id').value = c ? c.id : '';
  document.getElementById('cli-form-titulo').textContent = c ? 'Editar cliente' : 'Novo cliente';
  document.getElementById('cli-f-nome').value = c ? c.nome : '';
  document.getElementById('cli-f-tipo').value = c ? c.tipo_pessoa : 'PF';
  document.getElementById('cli-f-doc').value = c ? (c.cpf_cnpj || '') : '';
  document.getElementById('cli-f-email').value = c ? (c.email || '') : '';
  document.getElementById('cli-f-tel').value = c ? (c.telefone || '') : '';
  document.getElementById('cli-f-origem').value = c ? (c.origem || '') : '';
  document.getElementById('cli-f-status').value = c ? c.status : 'ativo';
  document.getElementById('cli-f-obs').value = c ? (c.observacoes || '') : '';
  document.getElementById('cliFormModal').classList.remove('hidden');
}

function cliFecharForm() {
  document.getElementById('cliFormModal').classList.add('hidden');
}

async function cliSalvar() {
  const id = document.getElementById('cli-form-id').value;
  const nome = document.getElementById('cli-f-nome').value.trim();
  if (!nome) { alert('Informe o nome do cliente.'); return; }
  const payload = {
    office_id: officeId(),
    nome: nome,
    tipo_pessoa: document.getElementById('cli-f-tipo').value,
    cpf_cnpj: document.getElementById('cli-f-doc').value.trim() || null,
    email: document.getElementById('cli-f-email').value.trim() || null,
    telefone: document.getElementById('cli-f-tel').value.trim() || null,
    origem: document.getElementById('cli-f-origem').value || null,
    status: document.getElementById('cli-f-status').value,
    observacoes: document.getElementById('cli-f-obs').value.trim() || null,
    updated_at: new Date().toISOString(),
  };
  let error;
  if (id) {
    ({ error } = await window._sb.from('clientes').update(payload).eq('id', id));
  } else {
    payload.created_by = window._currentUser.id;
    ({ error } = await window._sb.from('clientes').insert(payload));
  }
  if (error) { console.error('cliSalvar:', error); alert('Erro ao salvar cliente.'); return; }
  cliFecharForm();
  await cliCarregar();
  if (id && _cliFichaAberta === id) cliAbrirFicha(id);
}

/* ── Ficha do cliente (drawer) ── */
async function cliAbrirFicha(id) {
  const c = _cliLista.find(x => x.id === id);
  if (!c) return;
  _cliFichaAberta = id;
  document.getElementById('cli-ficha-nome').textContent = c.nome;
  document.getElementById('cli-ficha-meta').textContent =
    [c.tipo_pessoa, c.cpf_cnpj, c.telefone, c.email].filter(Boolean).join(' · ') || 'Sem dados de contato';
  document.getElementById('cli-ficha-status').textContent = CLI_STATUS_LABEL[c.status] || c.status;
  document.getElementById('cli-ficha-status').className = 'crud-badge badge-' + c.status;
  document.getElementById('cli-ficha-obs').textContent = c.observacoes || '—';
  document.getElementById('cliFichaModal').classList.remove('hidden');

  // Interações
  const intCont = document.getElementById('cli-ficha-interacoes');
  intCont.innerHTML = '<div class="crud-empty">Carregando…</div>';
  const { data: ints } = await window._sb
    .from('cliente_interacoes')
    .select('*')
    .eq('cliente_id', id)
    .order('data_hora', { ascending: false })
    .limit(50);
  intCont.innerHTML = (ints && ints.length)
    ? ints.map(i => `
      <div class="ficha-int-item">
        <div class="ficha-int-head">
          <span class="crud-badge badge-tipo">${CLI_INT_LABEL[i.tipo] || i.tipo}</span>
          <span class="ficha-int-data">${new Date(i.data_hora).toLocaleDateString('pt-BR')} · ${officeNomeMembro(i.autor_id)}</span>
        </div>
        <div class="ficha-int-titulo">${escHtml(i.titulo)}</div>
        ${i.descricao ? '<div class="ficha-int-desc">' + escHtml(i.descricao) + '</div>' : ''}
      </div>`).join('')
    : '<div class="crud-empty">Nenhum registro ainda. Registre atendimentos, reuniões e anotações aqui.</div>';

  // Casos vinculados
  const casosCont = document.getElementById('cli-ficha-casos');
  const { data: casos } = await window._sb
    .from('casos').select('id, titulo, numero_processo, status')
    .eq('cliente_id', id).order('created_at', { ascending: false });
  casosCont.innerHTML = (casos && casos.length)
    ? casos.map(k => `
      <div class="ficha-caso-item" onclick="cliFecharFicha(); navigate('casos'); setTimeout(function(){ casoAbrir('${k.id}'); }, 250);">
        <span>${escHtml(k.titulo)}</span>
        <span style="color:var(--t3);font-size:11px;">${escHtml(k.numero_processo || '')} · ${escHtml(k.status)}</span>
      </div>`).join('')
    : '<div class="crud-empty" style="padding:10px;">Nenhum caso vinculado.</div>';
}

function cliFecharFicha() {
  _cliFichaAberta = null;
  document.getElementById('cliFichaModal').classList.add('hidden');
}

function cliEditarAtual() {
  if (_cliFichaAberta) { const id = _cliFichaAberta; cliFecharFicha(); cliAbrirForm(id); }
}

/* ── Nova interação ── */
function cliNovaInteracao() {
  document.getElementById('cli-i-tipo').value = 'atendimento';
  document.getElementById('cli-i-titulo').value = '';
  document.getElementById('cli-i-desc').value = '';
  document.getElementById('cliIntModal').classList.remove('hidden');
}

async function cliSalvarInteracao() {
  if (!_cliFichaAberta) return;
  const titulo = document.getElementById('cli-i-titulo').value.trim();
  if (!titulo) { alert('Informe um título.'); return; }
  const { error } = await window._sb.from('cliente_interacoes').insert({
    office_id: officeId(),
    cliente_id: _cliFichaAberta,
    autor_id: window._currentUser.id,
    tipo: document.getElementById('cli-i-tipo').value,
    titulo: titulo,
    descricao: document.getElementById('cli-i-desc').value.trim() || null,
  });
  if (error) { console.error(error); alert('Erro ao salvar.'); return; }
  document.getElementById('cliIntModal').classList.add('hidden');
  cliAbrirFicha(_cliFichaAberta);
}

document.addEventListener('DOMContentLoaded', function() {
  const busca = document.getElementById('cli-busca');
  if (busca) busca.addEventListener('input', function() { _cliFiltro = this.value; cliRender(); });
  const filtro = document.getElementById('cli-filtro-status');
  if (filtro) filtro.addEventListener('change', function() { _cliStatusFiltro = this.value; cliRender(); });
});
