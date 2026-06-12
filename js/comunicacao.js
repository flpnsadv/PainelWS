/* ══════════════════════════════════════════════════════════════════
   COMUNICAÇÃO — mural interno do escritório (avisos + posts)
══════════════════════════════════════════════════════════════════ */

let _comLista = [];
let _comLidos = new Set();

async function comCarregar() {
  if (!window._sb || !officeId()) return;
  const [{ data: posts, error }, { data: leituras }] = await Promise.all([
    window._sb.from('comunicados').select('*')
      .eq('office_id', officeId())
      .order('fixado', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100),
    window._sb.from('comunicado_leituras').select('comunicado_id')
      .eq('user_id', window._currentUser.id),
  ]);
  if (error) { console.error('comCarregar:', error); return; }
  _comLista = posts || [];
  _comLidos = new Set((leituras || []).map(l => l.comunicado_id));
  comRender();
  comAtualizarBadge();
}

function comRender() {
  const cont = document.getElementById('com-lista');
  if (!cont) return;
  if (_comLista.length === 0) {
    cont.innerHTML = '<div class="crud-empty">Mural vazio. Publique o primeiro aviso para a equipe.</div>';
    return;
  }
  cont.innerHTML = _comLista.map(p => {
    const naoLido = !_comLidos.has(p.id) && p.autor_id !== window._currentUser.id;
    return `
    <div class="com-post ${p.fixado ? 'com-fixado' : ''} ${naoLido ? 'com-naolido' : ''}" ${naoLido ? `onclick="comMarcarLido('${p.id}')"` : ''}>
      <div class="com-post-head">
        <div class="equipe-avatar">${escHtml(officeNomeMembro(p.autor_id).charAt(0).toUpperCase())}</div>
        <div>
          <div class="com-post-autor">${escHtml(officeNomeMembro(p.autor_id))}</div>
          <div class="com-post-data">${new Date(p.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div style="margin-left:auto;display:flex;gap:6px;align-items:center;">
          ${p.fixado ? '<span class="crud-badge badge-tipo">📌 Fixado</span>' : ''}
          ${p.tipo === 'aviso' ? '<span class="crud-badge badge-vencida">Aviso</span>' : ''}
          ${naoLido ? '<span class="com-dot-novo" title="Não lido"></span>' : ''}
        </div>
      </div>
      <div class="com-post-titulo">${escHtml(p.titulo)}</div>
      ${p.corpo ? '<div class="com-post-corpo">' + escHtml(p.corpo) + '</div>' : ''}
    </div>`;
  }).join('');
}

async function comPublicar() {
  const titulo = document.getElementById('com-f-titulo').value.trim();
  if (!titulo) { alert('Escreva o título do comunicado.'); return; }
  const { error } = await window._sb.from('comunicados').insert({
    office_id: officeId(),
    autor_id: window._currentUser.id,
    tipo: document.getElementById('com-f-tipo').value,
    titulo: titulo,
    corpo: document.getElementById('com-f-corpo').value.trim() || null,
    fixado: document.getElementById('com-f-fixado').checked,
  });
  if (error) { console.error('comPublicar:', error); alert('Erro ao publicar.'); return; }
  document.getElementById('com-f-titulo').value = '';
  document.getElementById('com-f-corpo').value = '';
  document.getElementById('com-f-fixado').checked = false;
  comCarregar();
}

async function comMarcarLido(id) {
  await window._sb.from('comunicado_leituras').upsert({
    comunicado_id: id, user_id: window._currentUser.id,
  }, { onConflict: 'comunicado_id,user_id' });
  _comLidos.add(id);
  comRender();
  comAtualizarBadge();
}

// Badge de não lidos na sidebar
function comAtualizarBadge() {
  const badge = document.getElementById('com-nav-badge');
  if (!badge) return;
  const n = _comLista.filter(p => !_comLidos.has(p.id) && p.autor_id !== window._currentUser.id).length;
  badge.textContent = n;
  badge.style.display = n > 0 ? '' : 'none';
}
