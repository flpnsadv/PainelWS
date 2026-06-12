/* ══════════════════════════════════════════════
   AUTH — Supabase Authentication
══════════════════════════════════════════════ */

// Globals de sessão — preenchidos após login
window._sb = null;
window._currentUser = null;

(function() {

  var SUPABASE_URL = 'https://diowsecnxvvbdckptqvr.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpb3dzZWNueHZ2YmRja3B0cXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NDQ5NDUsImV4cCI6MjA5NTQyMDk0NX0.BRTua92kVE-wvKOSEKgrumF5TzaTjytE5Neb1SYxq9k';
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window._sb = sb;

  function showScreen(name) {
    document.getElementById('screen-login').style.display              = name === 'login'              ? 'flex' : 'none';
    document.getElementById('screen-cadastro').style.display           = name === 'cadastro'           ? 'flex' : 'none';
    document.getElementById('screen-email-confirmado').style.display   = name === 'email-confirmado'   ? 'flex' : 'none';
    document.getElementById('screen-recuperar-senha').style.display    = name === 'recuperar-senha'    ? 'flex' : 'none';
    document.getElementById('screen-recuperar-enviado').style.display  = name === 'recuperar-enviado'  ? 'flex' : 'none';
  }

  function setAlert(id, msg, type) {
    var el = document.getElementById(id);
    if (!msg) { el.style.display = 'none'; return; }
    el.textContent = msg;
    el.className = 'auth-alert' + (type === 'ok' ? ' auth-alert-ok' : '');
    el.style.display = 'block';
  }

  function setInputError(inputId, hasError) {
    document.getElementById(inputId).classList.toggle('has-error', hasError);
  }

  function clearLoginErrors() {
    setAlert('login-error', '');
    setAlert('login-success', '');
    setInputError('login-email', false);
    setInputError('login-senha', false);
  }

  function clearCadErrors() {
    setAlert('cadastro-error', '');
    ['cad-nome','cad-email','cad-whatsapp','cad-senha'].forEach(function(id) {
      setInputError(id, false);
    });
  }

  function setupToggleSenha(btnId, inputId, eyeOffId, eyeOnId) {
    document.getElementById(btnId).addEventListener('click', function() {
      var input  = document.getElementById(inputId);
      var eyeOff = document.getElementById(eyeOffId);
      var eyeOn  = document.getElementById(eyeOnId);
      var showing = input.type === 'text';
      input.type           = showing ? 'password' : 'text';
      eyeOff.style.display = showing ? '' : 'none';
      eyeOn.style.display  = showing ? 'none' : '';
    });
  }

  function maskWhatsApp(value) {
    var d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2)  return '(' + d;
    if (d.length <= 7)  return '(' + d.slice(0,2) + ') ' + d.slice(2);
    return '(' + d.slice(0,2) + ') ' + d.slice(2,7) + '-' + d.slice(7);
  }

  function _ocultarTelas() {
    document.getElementById('screen-login').style.display            = 'none';
    document.getElementById('screen-cadastro').style.display         = 'none';
    document.getElementById('screen-email-confirmado').style.display = 'none';
    document.getElementById('screen-recuperar-senha').style.display  = 'none';
    document.getElementById('screen-recuperar-enviado').style.display = 'none';
    document.body.classList.remove('auth-active', 'auth-clearing');
  }

  function hideAuthScreens(animado) {
    if (animado) {
      document.body.classList.add('auth-clearing');
      setTimeout(_ocultarTelas, 700);
    } else {
      document.body.classList.remove('auth-active');
      _ocultarTelas();
    }
  }

  async function populateSidebarUser(user) {
    if (!user) return;
    window._currentUser = user;

    // Carrega o escritório (multiusuário). Sem escritório → onboarding.
    if (typeof officeCarregar === 'function') {
      var temOffice = await officeCarregar();
      if (!temOffice) {
        officeMostrarOnboarding();
      } else if (typeof officeRenderEquipe === 'function') {
        officeRenderEquipe();
      }
    }
    var meta  = user.user_metadata || {};
    var nome  = meta.nome || user.email || '?';
    var email = user.email || '';
    var initials = nome.trim().split(' ')
      .filter(function(w) { return w.length > 0; })
      .slice(0, 2)
      .map(function(w) { return w[0].toUpperCase(); })
      .join('');
    document.getElementById('sidebar-user-avatar').textContent = initials || '?';
    document.getElementById('sidebar-user-name').textContent   = nome.split(' ')[0];
    document.getElementById('sidebar-user-email').textContent  = email;
    var ta = document.getElementById('topbar-avatar');
    if (ta) ta.textContent = initials || '?';
    var taBtn = document.getElementById('topbar-avatar-btn');
    if (taBtn) taBtn.textContent = initials || '?';
    var pAvatar = document.getElementById('perfil-avatar');
    var pNome   = document.getElementById('perfil-nome');
    var pEmail  = document.getElementById('perfil-email');
    if (pAvatar) pAvatar.textContent = initials || '?';
    if (pNome)   pNome.textContent   = nome;
    if (pEmail)  pEmail.textContent  = email;

    // Saudação dinâmica na home
    var primeiroNome = nome.split(' ')[0];
    var hora = new Date().getHours();
    var saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    var greetingEl = document.getElementById('hw-greeting');
    if (greetingEl) greetingEl.textContent = saudacao + ', ' + primeiroNome;

    // Carrega configurações personalizadas do usuário
    cfgCarregar();

    // Carrega os relatórios do dashboard da home
    if (typeof dashCarregar === 'function') dashCarregar(true);

    // Data na home
    var hwTime = document.getElementById('hw-time');
    if (hwTime) {
      var days   = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
      var months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
      var now    = new Date();
      hwTime.textContent = days[now.getDay()] + ', ' + now.getDate() + ' de ' + months[now.getMonth()] + ' de ' + now.getFullYear();
    }
  }

  async function loginUser(email, senha) {
    var btn = document.getElementById('btn-login');
    btn.disabled = true;
    var textoOriginal = btn.textContent;
    btn.textContent = 'Entrando…';

    var result = await sb.auth.signInWithPassword({ email: email, password: senha });

    btn.disabled = false;
    btn.textContent = textoOriginal;

    if (result.error) {
      var msg = 'E-mail ou senha incorretos. Verifique seus dados.';
      if (result.error.message && result.error.message.includes('Email not confirmed')) {
        msg = 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
      }
      setAlert('login-error', msg);
      setInputError('login-email', true);
      setInputError('login-senha', true);
      return;
    }

    hideAuthScreens(true);
    populateSidebarUser(result.data.user);
  }

  async function cadastrarUser(nome, email, whatsapp, senha) {
    var btn = document.getElementById('btn-cadastrar');
    btn.disabled = true;
    var textoOriginal = btn.textContent;
    btn.textContent = 'Cadastrando…';

    var result = await sb.auth.signUp({
      email: email,
      password: senha,
      options: { data: { nome: nome, whatsapp: whatsapp } }
    });

    btn.disabled = false;
    btn.textContent = textoOriginal;

    if (result.error) {
      var msg = 'Erro ao cadastrar. Tente novamente.';
      if (result.error.message && result.error.message.includes('already registered')) {
        msg = 'Este e-mail já está cadastrado. Tente fazer login.';
        setInputError('cad-email', true);
      } else if (result.error.message) {
        msg = 'Erro: ' + result.error.message;
      }
      setAlert('cadastro-error', msg);
      return;
    }

    showScreen('login');
    setTimeout(function() {
      setAlert('login-success', 'Cadastro realizado! Verifique seu e-mail para confirmar a conta.', 'ok');
    }, 80);
  }

  document.addEventListener('DOMContentLoaded', async function() {
    // Detecta link de confirmação de e-mail (type=signup na URL)
    var isEmailConfirmation = window.location.hash.includes('type=signup');

    if (isEmailConfirmation) {
      // Supabase processa o token automaticamente; aguarda um momento e faz logout
      // para que o usuário precise fazer login manualmente
      setTimeout(async function() {
        await sb.auth.signOut();
        showScreen('email-confirmado');
        // Limpa o hash da URL sem recarregar a página
        history.replaceState(null, '', window.location.pathname);
      }, 800);
    } else {
      var result = await sb.auth.getSession();
      if (result.data && result.data.session) {
        hideAuthScreens(false);
        populateSidebarUser(result.data.session.user);
      } else {
        showScreen('login');
      }
    }

    sb.auth.onAuthStateChange(function(event, session) {
      if (event === 'SIGNED_OUT' && !isEmailConfirmation) {
        showScreen('login');
        document.getElementById('sidebar-user-avatar').textContent = '?';
        document.getElementById('sidebar-user-name').textContent   = '—';
        document.getElementById('sidebar-user-email').textContent  = '—';
        var ta = document.getElementById('topbar-avatar');
        if (ta) ta.textContent = '?';
      }
    });

    setupToggleSenha('toggle-login-senha', 'login-senha', 'eye-login-off', 'eye-login-on');
    setupToggleSenha('toggle-cad-senha',   'cad-senha',   'eye-cad-off',   'eye-cad-on');

    document.getElementById('cad-whatsapp').addEventListener('input', function(e) {
      var input  = e.target;
      var pos    = input.selectionStart;
      var raw    = input.value;
      var digitsBeforeCursor = raw.slice(0, pos).replace(/\D/g, '').length;
      var masked = maskWhatsApp(raw);
      input.value = masked;
      var newPos = masked.length;
      if (digitsBeforeCursor === 0) {
        newPos = 0;
      } else {
        var count = 0;
        for (var i = 0; i < masked.length; i++) {
          if (/\d/.test(masked[i])) {
            count++;
            if (count === digitsBeforeCursor) { newPos = i + 1; break; }
          }
        }
      }
      input.setSelectionRange(newPos, newPos);
    });

    document.getElementById('btn-ir-cadastro').addEventListener('click', function() {
      clearCadErrors();
      showScreen('cadastro');
    });

    document.getElementById('btn-ir-login').addEventListener('click', function() {
      clearLoginErrors();
      showScreen('login');
    });

    /* ── Validação inline no cadastro ── */
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function setHint(id, msg, ok) {
      var el = document.getElementById('hint-' + id);
      if (!el) return;
      if (!msg) { el.className = 'auth-field-hint'; el.textContent = ''; return; }
      el.textContent = msg;
      el.className = 'auth-field-hint visible ' + (ok ? 'hint-ok' : 'hint-err');
    }

    function validarCampo(campo) {
      if (campo === 'nome') {
        var v = document.getElementById('cad-nome').value.trim();
        if (!v) { setHint('nome', '', false); return; }
        var ok = v.split(' ').filter(function(w){return w.length>0;}).length >= 2;
        setHint('nome', ok ? '✓ Nome válido' : 'Digite nome e sobrenome', ok);
      }
      if (campo === 'email') {
        var v = document.getElementById('cad-email').value.trim();
        if (!v) { setHint('email', '', false); return; }
        var ok = emailRe.test(v);
        setHint('email', ok ? '✓ E-mail válido' : 'Formato de e-mail inválido', ok);
      }
      if (campo === 'wpp') {
        var v = document.getElementById('cad-whatsapp').value.replace(/\D/g,'');
        if (!v) { setHint('wpp', '', false); return; }
        var ok = v.length >= 10;
        setHint('wpp', ok ? '✓ WhatsApp válido' : 'Digite o número completo com DDD', ok);
      }
    }

    document.getElementById('cad-nome').addEventListener('blur',  function() { validarCampo('nome'); });
    document.getElementById('cad-email').addEventListener('blur', function() { validarCampo('email'); });
    document.getElementById('cad-email').addEventListener('input', function() {
      if (emailRe.test(this.value.trim())) validarCampo('email');
    });
    document.getElementById('cad-whatsapp').addEventListener('blur', function() { validarCampo('wpp'); });

    /* ── Força da senha ── */
    function calcForca(pwd) {
      if (!pwd) return { pct: 0, label: '', cor: '' };
      var pts = 0;
      if (pwd.length >= 6)  pts++;
      if (pwd.length >= 10) pts++;
      if (/[A-Z]/.test(pwd)) pts++;
      if (/[0-9]/.test(pwd)) pts++;
      if (/[^A-Za-z0-9]/.test(pwd)) pts++;
      if (pts <= 1) return { pct: 20,  label: 'Senha fraca',    cor: 'var(--err)' };
      if (pts <= 2) return { pct: 45,  label: 'Senha razoável', cor: 'var(--warn)' };
      if (pts <= 3) return { pct: 70,  label: 'Senha boa',      cor: 'var(--a1)' };
      return               { pct: 100, label: 'Senha forte ✓',  cor: 'var(--ok)' };
    }

    document.getElementById('cad-senha').addEventListener('input', function() {
      var pwd   = this.value;
      var str   = document.getElementById('pwd-strength');
      var fill  = document.getElementById('pwd-strength-fill');
      var lbl   = document.getElementById('pwd-strength-label');
      if (!pwd) { str.classList.remove('visible'); return; }
      str.classList.add('visible');
      var f = calcForca(pwd);
      fill.style.width      = f.pct + '%';
      fill.style.background = f.cor;
      lbl.textContent       = f.label;
      lbl.style.color       = f.cor;
    });

    /* ── Esqueci minha senha ── */
    document.getElementById('btn-esqueci').addEventListener('click', function() {
      var emailVal = document.getElementById('login-email').value.trim();
      showScreen('recuperar-senha');
      if (emailVal) document.getElementById('rec-email').value = emailVal;
      setAlert('recuperar-alert', '');
    });

    document.getElementById('btn-voltar-login-rec').addEventListener('click', function() {
      showScreen('login');
      setAlert('recuperar-alert', '');
    });

    document.getElementById('btn-voltar-login-env').addEventListener('click', function() {
      showScreen('login');
    });

    document.getElementById('btn-recuperar').addEventListener('click', async function() {
      var btn   = this;
      var email = document.getElementById('rec-email').value.trim();
      setAlert('recuperar-alert', '');
      document.getElementById('rec-email').classList.remove('has-error');

      if (!email || !emailRe.test(email)) {
        document.getElementById('rec-email').classList.add('has-error');
        setAlert('recuperar-alert', 'Digite um e-mail válido para continuar.');
        return;
      }

      btn.disabled    = true;
      btn.textContent = 'Enviando...';

      try {
        var redirectUrl = window.location.origin + window.location.pathname;
        var result = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
        if (result.error) throw result.error;
        showScreen('recuperar-enviado');
      } catch (err) {
        setAlert('recuperar-alert', err.message || 'Erro ao enviar. Tente novamente.');
      } finally {
        btn.disabled    = false;
        btn.textContent = 'Enviar link de recuperação';
      }
    });

    document.getElementById('rec-email').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('btn-recuperar').click();
    });

    document.getElementById('btn-login').addEventListener('click', function() {
      clearLoginErrors();
      var email = document.getElementById('login-email').value.trim();
      var senha = document.getElementById('login-senha').value;
      if (!email || !senha) {
        setAlert('login-error', 'Preencha o e-mail e a senha para continuar.');
        setInputError('login-email', !email);
        setInputError('login-senha', !senha);
        return;
      }
      loginUser(email, senha);
    });

    document.getElementById('login-senha').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('btn-login').click();
    });

    document.getElementById('btn-cadastrar').addEventListener('click', function() {
      clearCadErrors();
      var nome     = document.getElementById('cad-nome').value.trim();
      var email    = document.getElementById('cad-email').value.trim();
      var whatsapp = document.getElementById('cad-whatsapp').value.trim();
      var senha    = document.getElementById('cad-senha').value;

      var hasErr = false;
      if (!nome)    { setInputError('cad-nome', true);  hasErr = true; }
      if (!email)   { setInputError('cad-email', true); hasErr = true; }
      if (!whatsapp || whatsapp.replace(/\D/g,'').length < 10) {
        setInputError('cad-whatsapp', true); hasErr = true;
      }
      if (!senha || senha.length < 6) { setInputError('cad-senha', true); hasErr = true; }

      if (hasErr) {
        setAlert('cadastro-error', 'Preencha todos os campos corretamente.');
        return;
      }

      var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) {
        setAlert('cadastro-error', 'Digite um e-mail válido.');
        setInputError('cad-email', true);
        return;
      }

      cadastrarUser(nome, email, whatsapp, senha);
    });

    document.getElementById('btn-ir-login-confirmado').addEventListener('click', function() {
      showScreen('login');
    });

    document.getElementById('btn-logout').addEventListener('click', async function() {
      await sb.auth.signOut();
    });
  });

})();
