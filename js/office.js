/* ══════════════════════════════════════════════════════════════════
   ESCRITÓRIO — multiusuário (offices / office_members)
══════════════════════════════════════════════════════════════════ */

window._office = null; // { id, nome, role, membros: [{user_id, nome_exibicao, role}] }

function officeId() {
  return window._office ? window._office.id : null;
}

function officeMembros() {
  return window._office ? (window._office.membros || []) : [];
}

// Carrega o escritório do usuário logado. Retorna true se tem escritório.
async function officeCarregar() {
  if (!window._sb || !window._currentUser) return false;
  try {
    const { data, error } = await window._sb
      .from('office_members')
      .select('office_id, role, offices(id, nome)')
      .eq('user_id', window._currentUser.id)
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) { window._office = null; return false; }
    const m = data[0];
    window._office = {
      id: m.office_id,
      nome: m.offices ? m.offices.nome : '',
      role: m.role,
      membros: [],
    };
    // Carrega membros (para responsáveis de tarefas, comunicação etc.)
    const { data: membros } = await window._sb
      .from('office_members')
      .select('user_id, nome_exibicao, role')
      .eq('office_id', m.office_id);
    window._office.membros = membros || [];
    return true;
  } catch (err) {
    console.error('officeCarregar:', err);
    window._office = null;
    return false;
  }
}

function officeNomeMembro(userId) {
  const m = officeMembros().find(x => x.user_id === userId);
  return m ? (m.nome_exibicao || 'Membro') : '—';
}

/* ── Onboarding: criar escritório ── */
function officeMostrarOnboarding() {
  const el = document.getElementById('screen-office');
  if (el) el.style.display = 'flex';
  document.body.classList.add('auth-active');
}

function officeOcultarOnboarding() {
  const el = document.getElementById('screen-office');
  if (el) el.style.display = 'none';
  document.body.classList.remove('auth-active');
}

async function officeCriar() {
  const input = document.getElementById('office-nome');
  const alertEl = document.getElementById('office-alert');
  const btn = document.getElementById('btn-criar-office');
  const nome = (input ? input.value : '').trim();
  if (alertEl) alertEl.style.display = 'none';
  if (!nome) {
    if (alertEl) { alertEl.textContent = 'Digite o nome do escritório.'; alertEl.style.display = 'block'; }
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = 'Criando…'; }
  try {
    const { error } = await window._sb.rpc('criar_escritorio', { p_nome: nome });
    if (error) throw error;
    await officeCarregar();
    officeOcultarOnboarding();
    officeRenderEquipe();
    if (typeof cfgCarregar === 'function') cfgCarregar();
    if (typeof dashCarregar === 'function') dashCarregar(true);
  } catch (err) {
    console.error('officeCriar:', err);
    if (alertEl) { alertEl.textContent = 'Erro ao criar escritório: ' + (err.message || 'tente novamente'); alertEl.style.display = 'block'; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Criar escritório'; }
  }
}

/* ── Equipe (card no Perfil) ── */
function officeRenderEquipe() {
  const wrap = document.getElementById('office-equipe-card');
  if (!wrap) return;
  if (!window._office) { wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  const nomeEl = document.getElementById('office-equipe-nome');
  if (nomeEl) nomeEl.textContent = window._office.nome || 'Escritório';
  const lista = document.getElementById('office-equipe-lista');
  const isAdmin = ['owner','admin'].includes(window._office.role);
  if (lista) {
    lista.innerHTML = officeMembros().map(m => `
      <div class="equipe-item">
        <div class="equipe-avatar">${escHtml((m.nome_exibicao || '?').trim().charAt(0).toUpperCase())}</div>
        <div class="equipe-info">
          <div class="equipe-nome">${escHtml(m.nome_exibicao || 'Membro')}</div>
          <div class="equipe-role">${m.role === 'owner' ? 'Proprietário' : m.role === 'admin' ? 'Administrador' : 'Membro'}</div>
        </div>
      </div>`).join('');
  }
  const addWrap = document.getElementById('office-add-membro-wrap');
  if (addWrap) addWrap.style.display = isAdmin ? '' : 'none';
}

async function officeAdicionarMembro() {
  const input = document.getElementById('office-add-email');
  const msg = document.getElementById('office-add-msg');
  const email = (input ? input.value : '').trim();
  if (!email) return;
  if (msg) { msg.style.display = 'none'; }
  try {
    const { error } = await window._sb.rpc('adicionar_membro', {
      p_office: officeId(), p_email: email, p_role: 'member',
    });
    if (error) throw error;
    await officeCarregar();
    officeRenderEquipe();
    if (input) input.value = '';
    if (msg) { msg.textContent = '✓ Membro adicionado!'; msg.style.color = 'var(--ok)'; msg.style.display = 'block'; }
  } catch (err) {
    if (msg) { msg.textContent = err.message || 'Erro ao adicionar.'; msg.style.color = 'var(--err)'; msg.style.display = 'block'; }
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('btn-criar-office');
  if (btn) btn.addEventListener('click', officeCriar);
  const inp = document.getElementById('office-nome');
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') officeCriar(); });
  const btnAdd = document.getElementById('btn-office-add-membro');
  if (btnAdd) btnAdd.addEventListener('click', officeAdicionarMembro);
});
