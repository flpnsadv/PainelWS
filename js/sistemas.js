/* ══════════════════════════════════════════════════════════════════
   SISTEMAS ELETRÔNICOS — busca, filtro e favoritos por usuário
══════════════════════════════════════════════════════════════════ */

let _sisFavoritos = new Set();
let _sisFiltro = '';
let _sisFavCarregado = false;

async function sisCarregarFavoritos() {
  if (!window._sb || !window._currentUser) return;
  const { data } = await window._sb
    .from('tribunais_favoritos').select('slug_tribunal')
    .eq('user_id', window._currentUser.id);
  _sisFavoritos = new Set((data || []).map(f => f.slug_tribunal));
  _sisFavCarregado = true;
}

async function sisRender() {
  if (!_sisFavCarregado) await sisCarregarFavoritos();
  const cont = document.getElementById('sis-grid');
  if (!cont) return;
  const q = _sisFiltro.toLowerCase();
  let lista = SISTEMAS_TRIBUNAIS.filter(s =>
    !q || s.nome.toLowerCase().includes(q) || s.uf.toLowerCase().includes(q) || s.tipo.toLowerCase().includes(q)
  );
  // favoritos primeiro, depois por tipo/nome
  lista.sort((a, b) => {
    const fa = _sisFavoritos.has(a.slug) ? 0 : 1;
    const fb = _sisFavoritos.has(b.slug) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    return a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome);
  });
  if (lista.length === 0) {
    cont.innerHTML = '<div class="crud-empty">Nenhum sistema encontrado.</div>';
    return;
  }
  cont.innerHTML = lista.map(s => `
    <div class="sis-card ${_sisFavoritos.has(s.slug) ? 'sis-fav' : ''}">
      <button class="sis-star" onclick="sisFavoritar('${s.slug}')" title="${_sisFavoritos.has(s.slug) ? 'Remover dos favoritos' : 'Favoritar'}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="${_sisFavoritos.has(s.slug) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </button>
      <a class="sis-body" href="${s.url}" target="_blank" rel="noopener noreferrer">
        <div class="sis-nome">${escHtml(s.nome)}</div>
        <div class="sis-meta"><span class="crud-badge badge-tipo">${escHtml(s.tipo)}</span><span class="sis-uf">${escHtml(s.uf)}</span></div>
      </a>
      <span class="sis-ext"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></span>
    </div>`).join('');
}

async function sisFavoritar(slug) {
  if (_sisFavoritos.has(slug)) {
    _sisFavoritos.delete(slug);
    await window._sb.from('tribunais_favoritos').delete()
      .eq('user_id', window._currentUser.id).eq('slug_tribunal', slug);
  } else {
    _sisFavoritos.add(slug);
    await window._sb.from('tribunais_favoritos').upsert({
      user_id: window._currentUser.id, slug_tribunal: slug,
    }, { onConflict: 'user_id,slug_tribunal' });
  }
  sisRender();
}

document.addEventListener('DOMContentLoaded', function() {
  const busca = document.getElementById('sis-busca');
  if (busca) busca.addEventListener('input', function() { _sisFiltro = this.value; sisRender(); });
});
