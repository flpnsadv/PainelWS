/* ══════════════════════════════════════════════════════════════════
   INTIMAÇÕES — busca no DJEN (Comunica PJe) + cadastro manual + prazos
══════════════════════════════════════════════════════════════════ */

const DJEN_API = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';

let _intLista = [];
let _intResultadosDJEN = [];
let _intPrazoAlvo = null; // intimação selecionada para gerar prazo

async function intCarregar() {
  if (!window._sb || !officeId()) return;
  const { data, error } = await window._sb
    .from('intimacoes')
    .select('*, casos(titulo)')
    .eq('office_id', officeId())
    .order('data_disponibilizacao', { ascending: false })
    .limit(200);
  if (error) { console.error('intCarregar:', error); return; }
  _intLista = data || [];
  intRender();
}

function intRender() {
  const cont = document.getElementById('int-lista');
  if (!cont) return;
  const naoLidas = _intLista.filter(i => !i.lida).length;
  const countEl = document.getElementById('int-count');
  if (countEl) countEl.textContent = naoLidas + (naoLidas === 1 ? ' não lida' : ' não lidas');
  if (_intLista.length === 0) {
    cont.innerHTML = '<div class="crud-empty">Nenhuma intimação registrada.<br><span style="font-size:12px;color:var(--t3)">Busque no DJEN pela sua OAB ou cadastre manualmente.</span></div>';
    return;
  }
  cont.innerHTML = _intLista.map(i => `
    <div class="int-row ${i.lida ? 'int-lida' : ''}">
      <div class="crud-main" onclick="intVerTexto('${i.id}')" style="cursor:pointer">
        <div class="crud-title">${escHtml(i.numero_processo || 'Processo não informado')}
          ${i.fonte === 'djen' ? '<span class="crud-badge badge-tipo" style="margin-left:6px;font-size:9px;">DJEN</span>' : ''}
        </div>
        <div class="crud-sub">${escHtml([i.tribunal, i.orgao, i.tipo_comunicacao].filter(Boolean).join(' · '))}</div>
      </div>
      <div class="tar-right">
        ${i.data_disponibilizacao ? `<span class="tar-data">${new Date(i.data_disponibilizacao + 'T12:00:00').toLocaleDateString('pt-BR')}</span>` : ''}
        <button class="plat-btn plat-btn-secondary int-btn-sm" onclick="intAbrirPrazo('${i.id}')">Gerar prazo</button>
        ${!i.lida ? `<button class="plat-btn plat-btn-secondary int-btn-sm" onclick="intMarcarLida('${i.id}')">✓ Lida</button>` : ''}
      </div>
    </div>`).join('');
}

function intVerTexto(id) {
  const i = _intLista.find(x => x.id === id);
  if (!i) return;
  document.getElementById('int-texto-titulo').textContent = i.numero_processo || 'Intimação';
  document.getElementById('int-texto-meta').textContent =
    [i.tribunal, i.orgao, i.data_disponibilizacao ? new Date(i.data_disponibilizacao + 'T12:00:00').toLocaleDateString('pt-BR') : null].filter(Boolean).join(' · ');
  // textContent: o texto do DJEN é conteúdo externo — nunca injetar como HTML
  document.getElementById('int-texto-corpo').textContent = (i.texto || 'Sem teor disponível.').replace(/<[^>]+>/g, ' ');
  document.getElementById('intTextoModal').classList.remove('hidden');
}

async function intMarcarLida(id) {
  const { error } = await window._sb.from('intimacoes').update({ lida: true }).eq('id', id);
  if (error) { console.error(error); return; }
  const i = _intLista.find(x => x.id === id);
  if (i) i.lida = true;
  intRender();
}

/* ── Busca no DJEN ── */
async function intBuscarDJEN() {
  const oab = document.getElementById('int-oab-num').value.trim();
  const uf = document.getElementById('int-oab-uf').value;
  const status = document.getElementById('int-djen-status');
  const resCont = document.getElementById('int-djen-resultados');
  if (!oab) { status.textContent = 'Informe o número da OAB.'; return; }
  // guarda OAB nas configurações do escritório para a próxima busca
  try {
    if (typeof CFG !== 'undefined') { CFG.oabNumero = oab; CFG.oabUf = uf; }
    localStorage.setItem('rito-oab', JSON.stringify({ num: oab, uf: uf }));
  } catch (e) {}
  const fim = new Date();
  const ini = new Date(); ini.setDate(ini.getDate() - 7);
  const isoD = d => d.toISOString().slice(0, 10);
  const params = new URLSearchParams({
    numeroOab: oab, ufOab: uf,
    dataDisponibilizacaoInicio: isoD(ini),
    dataDisponibilizacaoFim: isoD(fim),
    itensPorPagina: '50', pagina: '1',
  });
  status.textContent = 'Buscando no DJEN (últimos 7 dias)…';
  resCont.innerHTML = '';
  try {
    const resp = await fetch(DJEN_API + '?' + params.toString(), { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const json = await resp.json();
    _intResultadosDJEN = json.items || json.content || [];
    if (_intResultadosDJEN.length === 0) {
      status.textContent = 'Nenhuma comunicação encontrada nos últimos 7 dias para OAB ' + oab + '/' + uf + '.';
      return;
    }
    status.textContent = _intResultadosDJEN.length + ' comunicação(ões) encontrada(s). Importe as relevantes:';
    const jaImportadas = new Set(_intLista.map(i => i.djen_id).filter(Boolean));
    resCont.innerHTML = _intResultadosDJEN.map((r, idx) => {
      const djenId = String(r.id || r.hash || (r.numero_processo || r.numeroprocessocommascara || '') + '|' + (r.data_disponibilizacao || r.datadisponibilizacao || ''));
      const ja = jaImportadas.has(djenId);
      return `
      <div class="int-djen-item">
        <div class="crud-main">
          <div class="crud-title">${escHtml(r.numero_processo || r.numeroprocessocommascara || 'Sem número')}</div>
          <div class="crud-sub">${escHtml([r.siglaTribunal || r.sigla_tribunal, r.nomeOrgao || r.nomeorgao, r.tipoComunicacao || r.tipocomunicacao, (r.data_disponibilizacao || r.datadisponibilizacao || '').slice(0, 10)].filter(Boolean).join(' · '))}</div>
        </div>
        <button class="plat-btn ${ja ? 'plat-btn-secondary' : 'plat-btn-primary'} int-btn-sm" ${ja ? 'disabled' : ''} onclick="intImportar(${idx}, this)">${ja ? '✓ Importada' : 'Importar'}</button>
      </div>`;
    }).join('');
  } catch (err) {
    console.error('intBuscarDJEN:', err);
    status.textContent = '⚠ Não foi possível consultar o DJEN (' + (err.message || 'erro de rede') + '). Tente novamente ou cadastre manualmente.';
  }
}

async function intImportar(idx, btn) {
  const r = _intResultadosDJEN[idx];
  if (!r) return;
  const numero = r.numero_processo || r.numeroprocessocommascara || null;
  const djenId = String(r.id || r.hash || (numero || '') + '|' + (r.data_disponibilizacao || r.datadisponibilizacao || ''));
  // vínculo automático a caso pelo número do processo
  let casoId = null;
  if (numero && typeof _casosLista !== 'undefined') {
    if (_casosLista.length === 0 && typeof casosCarregar === 'function') await casosCarregar();
    const digitos = numero.replace(/\D/g, '');
    const caso = (_casosLista || []).find(c => c.numero_processo && c.numero_processo.replace(/\D/g, '') === digitos);
    if (caso) casoId = caso.id;
  }
  const payload = {
    office_id: officeId(),
    created_by: window._currentUser.id,
    numero_processo: numero,
    tribunal: r.siglaTribunal || r.sigla_tribunal || null,
    orgao: r.nomeOrgao || r.nomeorgao || null,
    data_disponibilizacao: (r.data_disponibilizacao || r.datadisponibilizacao || '').slice(0, 10) || null,
    texto: r.texto || r.conteudo || null,
    tipo_comunicacao: r.tipoComunicacao || r.tipocomunicacao || null,
    meio: r.meio || r.meiocompleto || null,
    fonte: 'djen',
    djen_id: djenId,
    caso_id: casoId,
  };
  const { error } = await window._sb.from('intimacoes').upsert(payload, { onConflict: 'djen_id' });
  if (error) { console.error('intImportar:', error); alert('Erro ao importar.'); return; }
  // registra andamento no caso vinculado
  if (casoId) {
    await window._sb.from('andamentos').insert({
      office_id: officeId(), caso_id: casoId, created_by: window._currentUser.id,
      data: payload.data_disponibilizacao || new Date().toISOString().slice(0, 10),
      descricao: 'Intimação DJEN: ' + (payload.tipo_comunicacao || 'comunicação') + (payload.orgao ? ' — ' + payload.orgao : ''),
      fonte: 'intimacao',
    });
  }
  if (btn) { btn.disabled = true; btn.textContent = '✓ Importada'; btn.className = 'plat-btn plat-btn-secondary int-btn-sm'; }
  intCarregar();
}

/* ── Cadastro manual ── */
function intAbrirManual() {
  ['int-m-numero', 'int-m-tribunal', 'int-m-orgao', 'int-m-texto'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('int-m-data').value = new Date().toISOString().slice(0, 10);
  document.getElementById('intManualModal').classList.remove('hidden');
}

async function intSalvarManual() {
  const numero = document.getElementById('int-m-numero').value.trim();
  const { error } = await window._sb.from('intimacoes').insert({
    office_id: officeId(),
    created_by: window._currentUser.id,
    numero_processo: numero || null,
    tribunal: document.getElementById('int-m-tribunal').value.trim() || null,
    orgao: document.getElementById('int-m-orgao').value.trim() || null,
    data_disponibilizacao: document.getElementById('int-m-data').value || null,
    texto: document.getElementById('int-m-texto').value.trim() || null,
    fonte: 'manual',
  });
  if (error) { console.error(error); alert('Erro ao salvar.'); return; }
  document.getElementById('intManualModal').classList.add('hidden');
  intCarregar();
}

/* ── Gerar prazo a partir da intimação ── */
function intAbrirPrazo(id) {
  _intPrazoAlvo = _intLista.find(x => x.id === id);
  if (!_intPrazoAlvo) return;
  document.getElementById('int-p-info').textContent =
    (_intPrazoAlvo.numero_processo || 'Processo') + ' — disponibilizada em ' +
    (_intPrazoAlvo.data_disponibilizacao ? new Date(_intPrazoAlvo.data_disponibilizacao + 'T12:00:00').toLocaleDateString('pt-BR') : '—');
  document.getElementById('int-p-dias').value = '15';
  document.getElementById('int-p-dobro').checked = false;
  intPrazoPreview();
  document.getElementById('intPrazoModal').classList.remove('hidden');
}

function intPrazoPreview() {
  const out = document.getElementById('int-p-preview');
  if (!_intPrazoAlvo || !_intPrazoAlvo.data_disponibilizacao) {
    out.innerHTML = '<span style="color:var(--err)">Intimação sem data de disponibilização — informe o prazo manualmente na aba Tarefas.</span>';
    return;
  }
  const dias = parseInt(document.getElementById('int-p-dias').value, 10) || 15;
  const dobro = document.getElementById('int-p-dobro').checked;
  const r = prazoCalcular(_intPrazoAlvo.data_disponibilizacao, dias, { dobro: dobro, uteis: true });
  out.innerHTML =
    'Publicação: <strong>' + prazoFmtData(r.publicacao) + '</strong> · Início: <strong>' + prazoFmtData(r.inicio) + '</strong><br>' +
    'Vencimento (' + r.diasEfetivos + ' dias úteis): <strong style="color:var(--err);font-size:15px;">' + prazoFmtData(r.fim) + '</strong>' +
    '<div style="margin-top:6px;font-size:11px;color:var(--t3)">⚠ Confira feriados locais e suspensões de prazo do tribunal — o cálculo considera apenas feriados nacionais.</div>';
}

async function intCriarPrazo() {
  if (!_intPrazoAlvo || !_intPrazoAlvo.data_disponibilizacao) return;
  const dias = parseInt(document.getElementById('int-p-dias').value, 10) || 15;
  const dobro = document.getElementById('int-p-dobro').checked;
  const r = prazoCalcular(_intPrazoAlvo.data_disponibilizacao, dias, { dobro: dobro, uteis: true });
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const { error } = await window._sb.from('tarefas').insert({
    office_id: officeId(),
    created_by: window._currentUser.id,
    titulo: 'Prazo — ' + (_intPrazoAlvo.numero_processo || 'intimação') + ' (' + r.diasEfetivos + ' dias)',
    tipo: 'prazo',
    data_limite: iso(r.fim),
    prioridade: 'alta',
    caso_id: _intPrazoAlvo.caso_id || null,
    intimacao_id: _intPrazoAlvo.id,
    descricao: 'Gerado da intimação disponibilizada em ' + prazoFmtData(new Date(_intPrazoAlvo.data_disponibilizacao + 'T12:00:00')) + '. Confira feriados locais e suspensões.',
  });
  if (error) { console.error(error); alert('Erro ao criar prazo.'); return; }
  await window._sb.from('intimacoes').update({ prazo_dias: r.diasEfetivos, lida: true }).eq('id', _intPrazoAlvo.id);
  document.getElementById('intPrazoModal').classList.add('hidden');
  intCarregar();
  if (typeof tarefasCarregar === 'function') tarefasCarregar();
}

document.addEventListener('DOMContentLoaded', function() {
  // restaura OAB salva
  try {
    const oab = JSON.parse(localStorage.getItem('rito-oab') || 'null');
    if (oab) {
      const n = document.getElementById('int-oab-num');
      const u = document.getElementById('int-oab-uf');
      if (n) n.value = oab.num || '';
      if (u && oab.uf) u.value = oab.uf;
    }
  } catch (e) {}
  ['int-p-dias', 'int-p-dobro'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', intPrazoPreview);
    if (el) el.addEventListener('input', intPrazoPreview);
  });
});
