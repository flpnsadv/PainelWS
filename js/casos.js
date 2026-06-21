/* ══════════════════════════════════════════════════════════════════
   CASOS E PROCESSOS — lista + detalhe com andamentos
══════════════════════════════════════════════════════════════════ */

let _casosLista = [];
let _casoAberto = null;
let _casoFiltro = '';
let _casoStatusFiltro = 'todos';

const CASO_STATUS_LABEL = { ativo: 'Ativo', suspenso: 'Suspenso', arquivado: 'Arquivado', encerrado: 'Encerrado' };

async function casosCarregar() {
  if (!window._sb || !officeId()) return;
  const { data, error } = await window._sb
    .from('casos')
    .select('*, clientes(nome)')
    .eq('office_id', officeId())
    .order('created_at', { ascending: false });
  if (error) { console.error('casosCarregar:', error); return; }
  _casosLista = data || [];
  casosRender();
}

function casosRender() {
  const cont = document.getElementById('casos-lista');
  if (!cont) return;
  const q = _casoFiltro.toLowerCase();
  const lista = _casosLista.filter(c =>
    (!q || (c.titulo || '').toLowerCase().includes(q) || (c.numero_processo || '').includes(q) ||
      (c.clientes && (c.clientes.nome || '').toLowerCase().includes(q))) &&
    (_casoStatusFiltro === 'todos' || c.status === _casoStatusFiltro)
  );
  const countEl = document.getElementById('casos-count');
  if (countEl) countEl.textContent = lista.length + (lista.length === 1 ? ' caso' : ' casos');
  if (lista.length === 0) {
    cont.innerHTML = '<div class="crud-empty">Nenhum caso encontrado.<br><span style="font-size:12px;color:var(--t3)">Clique em "Novo caso" para cadastrar.</span></div>';
    return;
  }
  cont.innerHTML = lista.map(c => `
    <div class="crud-row" onclick="casoAbrir('${c.id}')">
      <div class="crud-main">
        <div class="crud-title">${escHtml(c.titulo)}</div>
        <div class="crud-sub">${escHtml([c.clientes ? c.clientes.nome : null, c.numero_processo, c.tribunal].filter(Boolean).join(' · '))}</div>
      </div>
      <span class="crud-badge badge-${c.status}">${CASO_STATUS_LABEL[c.status] || c.status}</span>
      <span class="crud-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></span>
    </div>`).join('');
}

/* ── Form novo/editar ── */
async function casoAbrirForm(id) {
  const c = id ? _casosLista.find(x => x.id === id) : null;
  // popula select de clientes
  const sel = document.getElementById('caso-f-cliente');
  if (typeof _cliLista !== 'undefined' && _cliLista.length === 0 && typeof cliCarregar === 'function') await cliCarregar();
  sel.innerHTML = '<option value="">— Sem cliente vinculado —</option>' +
    (_cliLista || []).map(cl => `<option value="${cl.id}">${escHtml(cl.nome)}</option>`).join('');
  document.getElementById('caso-form-id').value = c ? c.id : '';
  document.getElementById('caso-form-titulo').textContent = c ? 'Editar caso' : 'Novo caso';
  document.getElementById('caso-f-titulo').value = c ? c.titulo : '';
  sel.value = c ? (c.cliente_id || '') : '';
  const numEl = document.getElementById('caso-f-numero');
  numEl.value = c ? maskProcessoCNJ(c.numero_processo || '') : '';
  clearFieldError(numEl); numEl.classList.remove('is-valid');
  document.getElementById('caso-f-tribunal').value = c ? (c.tribunal || '') : '';
  document.getElementById('caso-f-vara').value = c ? (c.vara || '') : '';
  document.getElementById('caso-f-area').value = c ? (c.area || '') : '';
  document.getElementById('caso-f-fase').value = c ? (c.fase || '') : '';
  document.getElementById('caso-f-status').value = c ? c.status : 'ativo';
  document.getElementById('caso-f-valor').value = c ? (c.valor_causa || '') : '';
  document.getElementById('caso-f-contraria').value = c ? (c.parte_contraria || '') : '';
  document.getElementById('caso-f-obs').value = c ? (c.observacoes || '') : '';
  document.getElementById('casoFormModal').classList.remove('hidden');
}

function casoFecharForm() {
  document.getElementById('casoFormModal').classList.add('hidden');
}

async function casoSalvar() {
  const id = document.getElementById('caso-form-id').value;
  const titulo = document.getElementById('caso-f-titulo').value.trim();
  if (!titulo) { alert('Informe o título do caso.'); return; }
  const numEl = document.getElementById('caso-f-numero');
  if (!validarCampoMascarado(numEl)) { numEl.focus(); return; }
  const valor = parseFloat(document.getElementById('caso-f-valor').value);
  const payload = {
    office_id: officeId(),
    titulo: titulo,
    cliente_id: document.getElementById('caso-f-cliente').value || null,
    numero_processo: document.getElementById('caso-f-numero').value.trim() || null,
    tribunal: document.getElementById('caso-f-tribunal').value.trim() || null,
    vara: document.getElementById('caso-f-vara').value.trim() || null,
    area: document.getElementById('caso-f-area').value.trim() || null,
    fase: document.getElementById('caso-f-fase').value.trim() || null,
    status: document.getElementById('caso-f-status').value,
    valor_causa: isNaN(valor) ? null : valor,
    parte_contraria: document.getElementById('caso-f-contraria').value.trim() || null,
    observacoes: document.getElementById('caso-f-obs').value.trim() || null,
    updated_at: new Date().toISOString(),
  };
  let error;
  if (id) {
    ({ error } = await window._sb.from('casos').update(payload).eq('id', id));
  } else {
    payload.created_by = window._currentUser.id;
    ({ error } = await window._sb.from('casos').insert(payload));
  }
  if (error) { console.error('casoSalvar:', error); alert('Erro ao salvar caso.'); return; }
  casoFecharForm();
  await casosCarregar();
  if (id && _casoAberto === id) casoAbrir(id);
}

/* ── Detalhe do caso ── */
async function casoAbrir(id) {
  const c = _casosLista.find(x => x.id === id);
  if (!c) { await casosCarregar(); if (!_casosLista.find(x => x.id === id)) return; return casoAbrir(id); }
  _casoAberto = id;
  document.getElementById('caso-det-titulo').textContent = c.titulo;
  document.getElementById('caso-det-meta').textContent =
    [c.clientes ? c.clientes.nome : null, c.numero_processo, c.tribunal, c.vara].filter(Boolean).join(' · ') || '—';
  document.getElementById('caso-det-status').textContent = CASO_STATUS_LABEL[c.status] || c.status;
  document.getElementById('caso-det-status').className = 'crud-badge badge-' + c.status;
  const det = document.getElementById('caso-det-info');
  det.innerHTML = [
    ['Área', c.area], ['Fase', c.fase],
    ['Valor da causa', c.valor_causa ? 'R$ ' + Number(c.valor_causa).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : null],
    ['Parte contrária', c.parte_contraria], ['Observações', c.observacoes],
  ].filter(p => p[1]).map(p => `<div class="caso-info-pair"><span>${p[0]}</span><strong>${escHtml(p[1])}</strong></div>`).join('') || '<div class="crud-empty" style="padding:8px;">Sem detalhes adicionais.</div>';
  document.getElementById('casoDetModal').classList.remove('hidden');

  // info da última sincronização automática
  const syncEl = document.getElementById('caso-det-sync');
  if (syncEl) syncEl.textContent = c.ultima_sincronizacao
    ? 'Sincronizado em ' + new Date(c.ultima_sincronizacao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : '';

  const cont = document.getElementById('caso-det-andamentos');
  cont.innerHTML = '<div class="crud-empty">Carregando…</div>';
  const { data: ands } = await window._sb
    .from('andamentos').select('*')
    .eq('caso_id', id).order('data', { ascending: false }).order('created_at', { ascending: false }).limit(100);
  cont.innerHTML = (ands && ands.length)
    ? ands.map(a => `
      <div class="and-item">
        <div class="and-data">${new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR')}${andSeloFonte(a.fonte)}</div>
        <div class="and-desc">${escHtml(a.descricao)}</div>
      </div>`).join('')
    : '<div class="crud-empty">Nenhum andamento registrado.</div>';
}

/* Selo da fonte do andamento (DJEN / DataJud) */
function andSeloFonte(fonte) {
  if (fonte === 'intimacao') return ' · <span class="crud-badge badge-tipo" style="font-size:9px;">DJEN</span>';
  if (fonte === 'datajud') return ' · <span class="crud-badge badge-tipo" style="font-size:9px;">DataJud</span>';
  return '';
}

/* ── Sincronizar andamentos no DataJud (Edge Function) ── */
async function casoSincronizar() {
  if (!_casoAberto) return;
  const btn = document.getElementById('btn-caso-sync');
  const info = document.getElementById('caso-det-sync');
  const txtOrig = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = 'Sincronizando…'; }
  if (info) { info.textContent = 'Consultando o DataJud (CNJ)…'; info.style.color = ''; }
  try {
    const { data, error } = await window._sb.functions.invoke('sync-andamentos', { body: { caso_id: _casoAberto } });
    if (error) {
      // tenta extrair a mensagem amigável do corpo da resposta
      let msg = 'Falha ao sincronizar.';
      try { const j = await error.context.json(); if (j && j.error) msg = j.error; } catch (e) {}
      if (info) { info.textContent = '⚠ ' + msg; info.style.color = 'var(--err)'; }
      return;
    }
    // recarrega a lista (para refletir ultima_sincronizacao) e re-renderiza
    if (typeof casosCarregar === 'function') await casosCarregar();
    await casoAbrir(_casoAberto);
    // mensagem final por último, pois casoAbrir reescreve o mesmo span
    const info2 = document.getElementById('caso-det-sync');
    if (info2) {
      if (data && data.aviso) { info2.textContent = 'ℹ ' + data.aviso; info2.style.color = 'var(--t3)'; }
      else if (data) {
        info2.style.color = '';
        info2.textContent = data.novos > 0
          ? '✓ ' + data.novos + (data.novos === 1 ? ' novo andamento' : ' novos andamentos') + ' importado(s)'
          : 'Tudo em dia — nenhum andamento novo.';
      }
    }
  } catch (e) {
    console.error('casoSincronizar:', e);
    if (info) { info.textContent = '⚠ Erro inesperado ao sincronizar.'; info.style.color = 'var(--err)'; }
  } finally {
    const b = document.getElementById('btn-caso-sync');
    if (b) { b.disabled = false; b.innerHTML = txtOrig; }
  }
}

function casoFecharDet() {
  _casoAberto = null;
  document.getElementById('casoDetModal').classList.add('hidden');
}

function casoEditarAtual() {
  if (_casoAberto) { const id = _casoAberto; casoFecharDet(); casoAbrirForm(id); }
}

/* ── Andamento manual ── */
async function andamentoAdd() {
  if (!_casoAberto) return;
  const desc = document.getElementById('caso-and-desc').value.trim();
  if (!desc) return;
  const { error } = await window._sb.from('andamentos').insert({
    office_id: officeId(),
    caso_id: _casoAberto,
    created_by: window._currentUser.id,
    descricao: desc,
  });
  if (error) { console.error(error); alert('Erro ao registrar andamento.'); return; }
  document.getElementById('caso-and-desc').value = '';
  casoAbrir(_casoAberto);
}

/* ── Feed geral de andamentos (page-andamentos) ── */
async function andCarregar() {
  if (!window._sb || !officeId()) return;
  const cont = document.getElementById('and-feed');
  if (!cont) return;
  cont.innerHTML = '<div class="crud-empty">Carregando…</div>';
  const { data, error } = await window._sb
    .from('andamentos')
    .select('*, casos(titulo, numero_processo)')
    .eq('office_id', officeId())
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(80);
  if (error) { console.error('andCarregar:', error); return; }
  cont.innerHTML = (data && data.length)
    ? data.map(a => `
      <div class="and-feed-item">
        <div class="and-feed-dot"></div>
        <div class="and-feed-body">
          <div class="and-feed-head">
            <span class="and-feed-caso">${escHtml(a.casos ? a.casos.titulo : 'Caso removido')}</span>
            <span class="and-feed-data">${new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR')}${a.fonte === 'intimacao' ? ' · DJEN' : (a.fonte === 'datajud' ? ' · DataJud' : '')}</span>
          </div>
          <div class="and-feed-desc">${escHtml(a.descricao)}</div>
        </div>
      </div>`).join('')
    : '<div class="crud-empty">Nenhum andamento ainda. Os andamentos dos casos aparecem aqui em ordem cronológica.</div>';
}

document.addEventListener('DOMContentLoaded', function() {
  const busca = document.getElementById('casos-busca');
  if (busca) busca.addEventListener('input', function() { _casoFiltro = this.value; casosRender(); });
  const filtro = document.getElementById('casos-filtro-status');
  if (filtro) filtro.addEventListener('change', function() { _casoStatusFiltro = this.value; casosRender(); });
});
