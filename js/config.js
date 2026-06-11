/* ══════════════════════════════════════════════════════════════════
   CONFIGURAÇÕES — Parâmetros editáveis pelo usuário
══════════════════════════════════════════════════════════════════ */

// Valores padrão (usados quando o usuário não configurou nada)
const CFG_DEFAULTS = {
  // Urgência: níveis 1-5 (nível 1 é sempre 0)
  urg: [0, 0, 5, 10, 15, 20],
  // Especificidade
  esp: [0, 0, 7.5, 15, 22.5, 30],
  // Complexidade
  cmp: [0, 0, 10, 20, 30, 40],
  // Outros (honorários)
  tutela:   25,
  iss:      4.5,
  avista:   8,
  entrada:  30,
  cartao:   2.5,
  horasMes: 160,
  // Distribuição
  distImposto:   4.5,
  distInvest:    15,
  distEscritorio:10,
  distProlabore: 75, // % do restante
};

// Objeto ativo — começa com os defaults, sobrescrito ao carregar do Supabase
let CFG = JSON.parse(JSON.stringify(CFG_DEFAULTS));

// ── Carrega configurações do Supabase para o usuário logado ──
async function cfgCarregar() {
  if (!window._sb || !window._currentUser) return;
  try {
    const { data } = await window._sb
      .from('configuracoes')
      .select('dados')
      .eq('user_id', window._currentUser.id)
      .single();
    if (data && data.dados) {
      CFG = Object.assign(JSON.parse(JSON.stringify(CFG_DEFAULTS)), data.dados);
    }
  } catch (_) { /* tabela pode não existir ainda — usa defaults */ }
  cfgAplicarNasCalculadoras();
  cfgPreencherFormulario();
}

// ── Aplica CFG nas constantes usadas pelas calculadoras ──
function cfgAplicarNasCalculadoras() {
  // Honorários
  PCT_URGENCIA[1]     = 0;
  PCT_URGENCIA[2]     = CFG.urg[2];
  PCT_URGENCIA[3]     = CFG.urg[3];
  PCT_URGENCIA[4]     = CFG.urg[4];
  PCT_URGENCIA[5]     = CFG.urg[5];

  PCT_ESPECIFIC[1]    = 0;
  PCT_ESPECIFIC[2]    = CFG.esp[2];
  PCT_ESPECIFIC[3]    = CFG.esp[3];
  PCT_ESPECIFIC[4]    = CFG.esp[4];
  PCT_ESPECIFIC[5]    = CFG.esp[5];

  PCT_COMPLEXIDADE[1] = 0;
  PCT_COMPLEXIDADE[2] = CFG.cmp[2];
  PCT_COMPLEXIDADE[3] = CFG.cmp[3];
  PCT_COMPLEXIDADE[4] = CFG.cmp[4];
  PCT_COMPLEXIDADE[5] = CFG.cmp[5];
}

// ── Preenche os inputs do formulário com os valores de CFG ──
function cfgPreencherFormulario() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  set('cfg-urg-2', CFG.urg[2]);  set('cfg-urg-3', CFG.urg[3]);
  set('cfg-urg-4', CFG.urg[4]);  set('cfg-urg-5', CFG.urg[5]);
  set('cfg-esp-2', CFG.esp[2]);  set('cfg-esp-3', CFG.esp[3]);
  set('cfg-esp-4', CFG.esp[4]);  set('cfg-esp-5', CFG.esp[5]);
  set('cfg-cmp-2', CFG.cmp[2]);  set('cfg-cmp-3', CFG.cmp[3]);
  set('cfg-cmp-4', CFG.cmp[4]);  set('cfg-cmp-5', CFG.cmp[5]);
  set('cfg-tutela',   CFG.tutela);
  set('cfg-iss',      CFG.iss);
  set('cfg-avista',   CFG.avista);
  set('cfg-entrada',  CFG.entrada);
  set('cfg-cartao',   CFG.cartao);
  set('cfg-horas-mes',CFG.horasMes);
  set('cfg-dist-imposto',    CFG.distImposto);
  set('cfg-dist-invest',     CFG.distInvest);
  set('cfg-dist-escritorio', CFG.distEscritorio);
  set('cfg-dist-prolabore',  CFG.distProlabore);
  cfgAtualizarPreview();
}

// ── Lê os inputs e monta um objeto CFG ──
function cfgLerFormulario() {
  const num = (id, def) => { const v = parseFloat(document.getElementById(id)?.value); return isNaN(v) ? def : v; };
  return {
    urg: [0, 0, num('cfg-urg-2',5),  num('cfg-urg-3',10), num('cfg-urg-4',15), num('cfg-urg-5',20)],
    esp: [0, 0, num('cfg-esp-2',7.5),num('cfg-esp-3',15), num('cfg-esp-4',22.5),num('cfg-esp-5',30)],
    cmp: [0, 0, num('cfg-cmp-2',10), num('cfg-cmp-3',20), num('cfg-cmp-4',30), num('cfg-cmp-5',40)],
    tutela:        num('cfg-tutela',    25),
    iss:           num('cfg-iss',       4.5),
    avista:        num('cfg-avista',    8),
    entrada:       num('cfg-entrada',   30),
    cartao:        num('cfg-cartao',    2.5),
    horasMes:      num('cfg-horas-mes', 160),
    distImposto:   num('cfg-dist-imposto',    4.5),
    distInvest:    num('cfg-dist-invest',     15),
    distEscritorio:num('cfg-dist-escritorio', 10),
    distProlabore: num('cfg-dist-prolabore',  75),
  };
}

// ── Troca a aba ativa na página de configurações ──
function cfgSwitchTab(tabId) {
  document.querySelectorAll('.cfg-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.cfgTab === tabId)
  );
  document.querySelectorAll('.cfg-panel').forEach(p =>
    p.classList.toggle('active', p.id === 'cfg-panel-' + tabId)
  );
}

// ── Atualiza o preview de distribuição em tempo real ──
function cfgAtualizarPreview() {
  const imp  = parseFloat(document.getElementById('cfg-dist-imposto')?.value) || CFG.distImposto;
  const inv  = parseFloat(document.getElementById('cfg-dist-invest')?.value) || CFG.distInvest;
  const esc  = parseFloat(document.getElementById('cfg-dist-escritorio')?.value) || CFG.distEscritorio;
  const plPct= parseFloat(document.getElementById('cfg-dist-prolabore')?.value) || CFG.distProlabore;

  const base = imp + inv + esc;
  const rest = Math.max(0, 100 - base);
  const pl   = rest * (plPct / 100);
  const res  = rest - pl;

  const fmtP = v => v.toLocaleString('pt-BR', {minimumFractionDigits:1,maximumFractionDigits:1}) + '%';
  const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  const setBar  = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = Math.min(100, Math.max(0, pct)) + '%'; };

  setText('cfg-prev-imposto',   'Simples: '      + fmtP(imp));
  setText('cfg-prev-invest',    'Investimento: ' + fmtP(inv));
  setText('cfg-prev-escritorio','Escritório: '   + fmtP(esc));
  setText('cfg-prev-prolabore', 'Pró-labore: '   + fmtP(pl));
  setText('cfg-prev-reserva',   'Reserva: '      + fmtP(res));

  setBar('cfg-bar-imposto',    imp);
  setBar('cfg-bar-invest',     inv);
  setBar('cfg-bar-escritorio', esc);
  setBar('cfg-bar-prolabore',  pl);
  setBar('cfg-bar-reserva',    res);

  const alerta = document.getElementById('cfg-prev-alerta');
  if (alerta) alerta.style.display = base > 100 ? 'flex' : 'none';
}

// ── Ouve mudanças nos inputs de distribuição para atualizar o preview ──
['cfg-dist-imposto','cfg-dist-invest','cfg-dist-escritorio','cfg-dist-prolabore'].forEach(id => {
  document.addEventListener('input', e => {
    if (e.target && e.target.id === id) cfgAtualizarPreview();
  });
});

// ── Salva no Supabase ──
async function cfgSalvar() {
  const btn = document.getElementById('cfg-btn-salvar');
  const banner = document.getElementById('cfg-banner');

  if (!window._sb || !window._currentUser) {
    if (banner) {
      banner.textContent = '⚠ Faça login para salvar as configurações.';
      banner.className = 'err'; banner.style.display = 'block';
      setTimeout(() => { banner.style.display='none'; }, 3500);
    }
    return;
  }

  const novaCfg = cfgLerFormulario();

  // Validação: soma base da distribuição
  const base = novaCfg.distImposto + novaCfg.distInvest + novaCfg.distEscritorio;
  if (base > 100) {
    if (banner) {
      banner.textContent = '❌ A soma de Simples + Investimento + Escritório não pode ultrapassar 100%.';
      banner.className = 'err'; banner.style.display = 'block';
      setTimeout(() => { banner.style.display='none'; }, 4000);
    }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }

  try {
    // Tenta upsert (insert ou update)
    const { error } = await window._sb.from('configuracoes').upsert({
      user_id: window._currentUser.id,
      dados:   novaCfg,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (error) throw error;

    CFG = novaCfg;
    cfgAplicarNasCalculadoras();
    // Atualiza a distribuição de honorários com os novos parâmetros
    if (typeof window._renderDist === 'function') window._renderDist();

    if (banner) {
      banner.textContent = '✓ Configurações salvas com sucesso! As calculadoras já usam os novos valores.';
      banner.className = 'ok'; banner.style.display = 'block';
      setTimeout(() => { banner.style.display='none'; }, 4000);
    }
    const badge = document.getElementById('cfg-saved-badge');
    if (badge) {
      badge.style.display = 'inline-flex';
      setTimeout(() => { badge.style.display='none'; }, 4000);
    }
  } catch (err) {
    if (banner) {
      banner.textContent = '❌ Erro ao salvar. Verifique a conexão e tente novamente.';
      banner.className = 'err'; banner.style.display = 'block';
      setTimeout(() => { banner.style.display='none'; }, 4000);
    }
    console.error('cfgSalvar error:', err);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Salvar Configurações'; }
  }
}

// ── Restaura os defaults ──
function cfgRestaurarPadroes() {
  if (!confirm('Restaurar todos os parâmetros para os valores padrão do sistema?')) return;
  CFG = JSON.parse(JSON.stringify(CFG_DEFAULTS));
  cfgPreencherFormulario();
  cfgAplicarNasCalculadoras();
  const banner = document.getElementById('cfg-banner');
  if (banner) {
    banner.textContent = '↩ Valores padrão restaurados. Clique em "Salvar" para confirmar.';
    banner.className = 'ok'; banner.style.display = 'block';
    setTimeout(() => { banner.style.display='none'; }, 4000);
  }
}
