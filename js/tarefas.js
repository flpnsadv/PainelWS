/* ══════════════════════════════════════════════════════════════════
   TAREFAS E PRAZOS — lista, próximos prazos, conclusão
══════════════════════════════════════════════════════════════════ */

let _tarLista = [];
let _tarFiltroTipo = 'todos';
let _tarMostrarConcluidas = false;

const TAR_TIPO_LABEL = { tarefa: 'Tarefa', prazo: 'Prazo', audiencia: 'Audiência' };

async function tarefasCarregar() {
  if (!window._sb || !officeId()) return;
  const { data, error } = await window._sb
    .from('tarefas')
    .select('*, casos(titulo), clientes(nome)')
    .eq('office_id', officeId())
    .order('data_limite', { ascending: true, nullsFirst: false })
    .limit(300);
  if (error) { console.error('tarefasCarregar:', error); return; }
  _tarLista = data || [];
  tarefasRender();
}

function _tarUrgencia(t) {
  if (!t.data_limite || t.status === 'concluida') return '';
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const lim = new Date(t.data_limite + 'T00:00:00');
  const diff = Math.round((lim - hoje) / 86400000);
  if (diff < 0) return 'vencida';
  if (diff <= 2) return 'urgente';
  if (diff <= 7) return 'proxima';
  return '';
}

function tarefasRender() {
  const cont = document.getElementById('tar-lista');
  if (!cont) return;
  let lista = _tarLista.filter(t =>
    (_tarFiltroTipo === 'todos' || t.tipo === _tarFiltroTipo) &&
    (_tarMostrarConcluidas || t.status !== 'concluida')
  );
  const countEl = document.getElementById('tar-count');
  if (countEl) {
    const pend = _tarLista.filter(t => t.status === 'pendente').length;
    countEl.textContent = pend + (pend === 1 ? ' pendente' : ' pendentes');
  }
  if (lista.length === 0) {
    cont.innerHTML = '<div class="crud-empty">Nenhuma tarefa por aqui. ✓</div>';
    return;
  }
  cont.innerHTML = lista.map(t => {
    const urg = _tarUrgencia(t);
    const vinculo = [t.casos ? t.casos.titulo : null, t.clientes ? t.clientes.nome : null].filter(Boolean).join(' · ');
    return `
    <div class="tar-row ${t.status === 'concluida' ? 'tar-done' : ''} ${urg ? 'tar-' + urg : ''}">
      <button class="tar-check" onclick="tarefaToggle('${t.id}')" title="${t.status === 'concluida' ? 'Reabrir' : 'Concluir'}">
        ${t.status === 'concluida' ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </button>
      <div class="crud-main" onclick="tarefaAbrirForm('${t.id}')" style="cursor:pointer">
        <div class="crud-title">${escHtml(t.titulo)}</div>
        <div class="crud-sub">${escHtml(vinculo || (t.descricao || '').slice(0, 80))}</div>
      </div>
      <div class="tar-right">
        <span class="crud-badge badge-tipo badge-tar-${t.tipo}">${TAR_TIPO_LABEL[t.tipo]}</span>
        ${t.data_limite ? `<span class="tar-data ${urg}">${new Date(t.data_limite + 'T12:00:00').toLocaleDateString('pt-BR')}${t.hora ? ' ' + t.hora.slice(0, 5) : ''}</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function tarefaToggle(id) {
  const t = _tarLista.find(x => x.id === id);
  if (!t) return;
  const novo = t.status === 'concluida' ? 'pendente' : 'concluida';
  const { error } = await window._sb.from('tarefas')
    .update({ status: novo, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) { console.error(error); return; }
  t.status = novo;
  tarefasRender();
}

/* ── Form ── */
async function tarefaAbrirForm(id) {
  const t = id ? _tarLista.find(x => x.id === id) : null;
  if (typeof _cliLista !== 'undefined' && _cliLista.length === 0 && typeof cliCarregar === 'function') await cliCarregar();
  if (typeof _casosLista !== 'undefined' && _casosLista.length === 0 && typeof casosCarregar === 'function') await casosCarregar();
  const selCaso = document.getElementById('tar-f-caso');
  selCaso.innerHTML = '<option value="">— Sem caso —</option>' +
    (_casosLista || []).map(c => `<option value="${c.id}">${escHtml(c.titulo)}</option>`).join('');
  const selResp = document.getElementById('tar-f-resp');
  selResp.innerHTML = '<option value="">— Sem responsável —</option>' +
    officeMembros().map(m => `<option value="${m.user_id}">${escHtml(m.nome_exibicao || 'Membro')}</option>`).join('');
  document.getElementById('tar-form-id').value = t ? t.id : '';
  document.getElementById('tar-form-titulo').textContent = t ? 'Editar tarefa' : 'Nova tarefa';
  document.getElementById('tar-f-titulo').value = t ? t.titulo : '';
  document.getElementById('tar-f-tipo').value = t ? t.tipo : 'tarefa';
  document.getElementById('tar-f-data').value = t ? (t.data_limite || '') : '';
  document.getElementById('tar-f-hora').value = t ? (t.hora || '') : '';
  document.getElementById('tar-f-prioridade').value = t ? t.prioridade : 'media';
  selCaso.value = t ? (t.caso_id || '') : '';
  selResp.value = t ? (t.responsavel_id || '') : '';
  document.getElementById('tar-f-desc').value = t ? (t.descricao || '') : '';
  document.getElementById('btn-tar-excluir').style.display = t ? '' : 'none';
  document.getElementById('tarFormModal').classList.remove('hidden');
}

function tarefaFecharForm() {
  document.getElementById('tarFormModal').classList.add('hidden');
}

async function tarefaSalvar() {
  const id = document.getElementById('tar-form-id').value;
  const titulo = document.getElementById('tar-f-titulo').value.trim();
  if (!titulo) { alert('Informe o título.'); return; }
  const payload = {
    office_id: officeId(),
    titulo: titulo,
    tipo: document.getElementById('tar-f-tipo').value,
    data_limite: document.getElementById('tar-f-data').value || null,
    hora: document.getElementById('tar-f-hora').value || null,
    prioridade: document.getElementById('tar-f-prioridade').value,
    caso_id: document.getElementById('tar-f-caso').value || null,
    responsavel_id: document.getElementById('tar-f-resp').value || null,
    descricao: document.getElementById('tar-f-desc').value.trim() || null,
    updated_at: new Date().toISOString(),
  };
  let error;
  if (id) {
    ({ error } = await window._sb.from('tarefas').update(payload).eq('id', id));
  } else {
    payload.created_by = window._currentUser.id;
    ({ error } = await window._sb.from('tarefas').insert(payload));
  }
  if (error) { console.error('tarefaSalvar:', error); alert('Erro ao salvar tarefa.'); return; }
  tarefaFecharForm();
  tarefasCarregar();
}

async function tarefaExcluir() {
  const id = document.getElementById('tar-form-id').value;
  if (!id || !confirm('Excluir esta tarefa?')) return;
  const { error } = await window._sb.from('tarefas').delete().eq('id', id);
  if (error) { console.error(error); alert('Erro ao excluir.'); return; }
  tarefaFecharForm();
  tarefasCarregar();
}

document.addEventListener('DOMContentLoaded', function() {
  const filtro = document.getElementById('tar-filtro-tipo');
  if (filtro) filtro.addEventListener('change', function() { _tarFiltroTipo = this.value; tarefasRender(); });
  const chk = document.getElementById('tar-mostrar-concluidas');
  if (chk) chk.addEventListener('change', function() { _tarMostrarConcluidas = this.checked; tarefasRender(); });
});
