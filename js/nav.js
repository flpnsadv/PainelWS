/* ══════════════════════════════════════════════════════════════════
   NAVEGAÇÃO DO PAINEL
══════════════════════════════════════════════════════════════════ */
const PAGE_META = {
  home:           'Home',
  calcHonorarios: 'Calculadora de Honorários',
  distribuicao:   'Distribuição de Honorários',
  bacen:          'Análise Revisional - BACEN',
  historico:      'Histórico de Propostas',
  perfil:         'Meu Perfil',
  config:         'Configurações',
};

const topbarSub = {
  home:           'Painel Rito',
  calcHonorarios: 'Calculadora de Honorários',
  distribuicao:   'Rateio interno de honorários',
  bacen:          'Revisional de contratos',
  historico:      'Propostas e registros',
  perfil:         'Dados da conta',
  config:         'Preferências do sistema',
};

let currentPage = 'home';

/* ── Slider da topbar ── */
function updateNavGlider(pageId) {
  const glider  = document.getElementById('mnav-glider');
  const nav     = document.querySelector('.mnav-links');
  if (!glider || !nav) return;
  const activeEl = nav.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (!activeEl) { glider.style.opacity = '0'; return; }
  const navRect  = nav.getBoundingClientRect();
  const itemRect = activeEl.getBoundingClientRect();
  glider.style.left  = (itemRect.left - navRect.left) + 'px';
  glider.style.width = itemRect.width + 'px';
  glider.style.opacity = '1';
}

function navigate(pageId) {
  if (!PAGE_META[pageId] || pageId === currentPage) return;

  const outgoing = document.querySelector('.page-section.active');
  const incoming = document.getElementById('page-' + pageId);
  if (!incoming) return;

  // Atualiza menu e título imediatamente
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });
  updateNavGlider(pageId);
  // Sincroniza bottom nav mobile
  document.querySelectorAll('#bottom-nav .bnav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });
  const label = PAGE_META[pageId];
  document.title = 'Rito — ' + label;
  const elPage = document.getElementById('topbar-page');
  const elSub  = document.getElementById('topbar-sub');
  if (elPage) elPage.textContent = label;
  if (elSub)  elSub.textContent  = topbarSub[pageId] || 'Painel Rito';
  // mantém compatibilidade com mobile topbar
  const elTitle = document.getElementById('topbar-title');
  if (elTitle) elTitle.textContent = label;
  currentPage = pageId;
  if (window.innerWidth < 768) closeMobileSidebar();
  if (pageId === 'historico') carregarHistorico();

  if (!outgoing || outgoing === incoming) {
    incoming.classList.add('active');
    return;
  }

  // Fade-out da página atual com slide leve
  outgoing.style.transition = 'opacity .18s ease, transform .18s ease';
  outgoing.style.opacity    = '0';
  outgoing.style.transform  = 'translateX(-12px)';

  setTimeout(() => {
    outgoing.classList.remove('active');
    outgoing.style.cssText = '';

    // Prepara página entrante vindo da direita
    incoming.style.opacity   = '0';
    incoming.style.transform = 'translateX(16px)';
    incoming.classList.add('active');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        incoming.style.transition = 'opacity .24s ease, transform .24s ease';
        incoming.style.opacity    = '1';
        incoming.style.transform  = 'translateX(0)';
      });
    });

    setTimeout(() => { incoming.style.cssText = ''; }, 280);
  }, 190);
}

// Cliques nos itens do menu
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.page));
});

// Inicializa posição do glider sem animação
(function initGlider() {
  const glider = document.getElementById('mnav-glider');
  if (!glider) return;
  glider.style.transition = 'none';
  updateNavGlider(currentPage);
  requestAnimationFrame(() => { glider.style.transition = ''; });
})();

// Cliques no bottom nav mobile
document.querySelectorAll('#bottom-nav .bnav-item').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.page));
});

/* ── Colapso Desktop ── */
const collapseBtn = document.getElementById('collapse-btn');
collapseBtn.addEventListener('click', () => {
  document.body.classList.toggle('sidebar-collapsed');
});

/* ── Toggle de tema (light/dark) ── */
const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('rito-theme', next); } catch (e) {}
  });
}

/* ── Mobile Sidebar ── */
const hamburgerBtn  = document.getElementById('hamburger-btn');
const sidebarEl     = document.getElementById('sidebar');
const overlayEl     = document.getElementById('sidebar-overlay');

function openMobileSidebar() {
  sidebarEl.classList.add('mobile-open');
  overlayEl.classList.add('open');
}
function closeMobileSidebar() {
  sidebarEl.classList.remove('mobile-open');
  overlayEl.classList.remove('open');
}

hamburgerBtn.addEventListener('click', openMobileSidebar);
overlayEl.addEventListener('click', closeMobileSidebar);

/* ── Escape fecha qualquer modal aberto (handler único do painel) ── */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  document.getElementById('summary-modal')?.classList.remove('open');
  document.querySelectorAll('.plat-modal-backdrop:not(.hidden)').forEach(bd => bd.classList.add('hidden'));
});

