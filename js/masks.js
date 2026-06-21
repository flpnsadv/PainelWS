/* ══════════════════════════════════════════════════════════════════
   MÁSCARAS E VALIDAÇÃO — CPF/CNPJ, telefone, nº de processo CNJ
   Módulo compartilhado. Auto-aplica em qualquer input [data-mask].
══════════════════════════════════════════════════════════════════ */

/* ── Helpers ── */
function _soDigitos(v) { return String(v == null ? '' : v).replace(/\D/g, ''); }

/* ── Formatadores ── */
function maskCPF(v) {
  const d = _soDigitos(v).slice(0, 11);
  let out = d;
  if (d.length > 9)      out = d.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2}).*/, '$1.$2.$3-$4');
  else if (d.length > 6) out = d.replace(/^(\d{3})(\d{3})(\d{1,3}).*/, '$1.$2.$3');
  else if (d.length > 3) out = d.replace(/^(\d{3})(\d{1,3}).*/, '$1.$2');
  return out;
}

function maskCNPJ(v) {
  const d = _soDigitos(v).slice(0, 14);
  let out = d;
  if (d.length > 12)      out = d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2}).*/, '$1.$2.$3/$4-$5');
  else if (d.length > 8)  out = d.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4}).*/, '$1.$2.$3/$4');
  else if (d.length > 5)  out = d.replace(/^(\d{2})(\d{3})(\d{1,3}).*/, '$1.$2.$3');
  else if (d.length > 2)  out = d.replace(/^(\d{2})(\d{1,3}).*/, '$1.$2');
  return out;
}

/* Escolhe CPF (≤11 díg.) ou CNPJ (>11 díg.) automaticamente. */
function maskCpfCnpj(v) {
  return _soDigitos(v).length > 11 ? maskCNPJ(v) : maskCPF(v);
}

function maskTelefone(v) {
  const d = _soDigitos(v).slice(0, 11);
  if (d.length <= 2)  return d.length ? '(' + d : d;
  if (d.length <= 6)  return '(' + d.slice(0, 2) + ') ' + d.slice(2);
  if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
}

/* Nº de processo CNJ: 0000000-00.0000.0.00.0000 (20 dígitos) */
function maskProcessoCNJ(v) {
  const d = _soDigitos(v).slice(0, 20);
  let out = d;
  if (d.length > 16)      out = d.replace(/^(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{1,4}).*/, '$1-$2.$3.$4.$5.$6');
  else if (d.length > 15) out = d.replace(/^(\d{7})(\d{2})(\d{4})(\d{1})(\d{1,2}).*/, '$1-$2.$3.$4.$5');
  else if (d.length > 14) out = d.replace(/^(\d{7})(\d{2})(\d{4})(\d{1,1}).*/, '$1-$2.$3.$4');
  else if (d.length > 10) out = d.replace(/^(\d{7})(\d{2})(\d{1,4}).*/, '$1-$2.$3');
  else if (d.length > 8)  out = d.replace(/^(\d{7})(\d{1,2}).*/, '$1-$2');
  return out;
}

/* ── Validadores ── */
function validarCPF(v) {
  const c = _soDigitos(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(c[i], 10) * (10 - i);
  let dig = 11 - (soma % 11); if (dig >= 10) dig = 0;
  if (dig !== parseInt(c[9], 10)) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(c[i], 10) * (11 - i);
  dig = 11 - (soma % 11); if (dig >= 10) dig = 0;
  return dig === parseInt(c[10], 10);
}

function validarCNPJ(v) {
  const c = _soDigitos(v);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (len) => {
    let soma = 0, pos = len - 7;
    for (let i = 0; i < len; i++) {
      soma += parseInt(c[i], 10) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === parseInt(c[12], 10) && calc(13) === parseInt(c[13], 10);
}

/* Valida CPF ou CNPJ conforme o nº de dígitos. */
function validarCpfCnpj(v) {
  const d = _soDigitos(v);
  return d.length > 11 ? validarCNPJ(v) : validarCPF(v);
}

function validarTelefone(v) {
  const len = _soDigitos(v).length;
  return len === 10 || len === 11;
}

function validarEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
}

/* Detecta se o conteúdo é (provavelmente) um e-mail e não um telefone. */
function _pareceEmail(v) { return /[a-zA-Z@]/.test(String(v || '')); }

function validarProcessoCNJ(v) {
  return _soDigitos(v).length === 20;
}

/* ══════════════════════════════════════════════════════════════════
   ESTADOS VISUAIS DE VALIDAÇÃO
══════════════════════════════════════════════════════════════════ */
function clearFieldError(input) {
  if (!input) return;
  input.classList.remove('is-invalid');
  const grp = input.closest('.plat-form-group') || input.parentElement;
  const msg = grp && grp.querySelector('.field-err');
  if (msg) msg.remove();
}

function setFieldError(input, mensagem) {
  if (!input) return;
  input.classList.remove('is-valid');
  input.classList.add('is-invalid');
  const grp = input.closest('.plat-form-group') || input.parentElement;
  if (grp) {
    let msg = grp.querySelector('.field-err');
    if (!msg) {
      msg = document.createElement('div');
      msg.className = 'field-err';
      grp.appendChild(msg);
    }
    msg.textContent = mensagem || 'Valor inválido.';
  }
  // re-dispara o shake
  input.classList.remove('plat-shake');
  void input.offsetWidth;
  input.classList.add('plat-shake');
  input.addEventListener('animationend', function h() {
    input.classList.remove('plat-shake');
    input.removeEventListener('animationend', h);
  });
}

function setFieldOk(input) {
  if (!input) return;
  clearFieldError(input);
  if ((input.value || '').trim()) input.classList.add('is-valid');
  else input.classList.remove('is-valid');
}

/* Valida o campo conforme seu data-mask. Devolve true se válido (ou vazio
   quando não obrigatório). Aplica estado visual. */
function validarCampoMascarado(input, opts) {
  opts = opts || {};
  const tipo = input.getAttribute('data-mask');
  const val = (input.value || '').trim();
  if (!val) {
    clearFieldError(input);
    input.classList.remove('is-valid');
    return !opts.obrigatorio ? true : (setFieldError(input, opts.msgVazio || 'Campo obrigatório.'), false);
  }
  let ok = true, msg = 'Valor inválido.';
  if (tipo === 'cpf')          { ok = validarCPF(val);      msg = 'CPF inválido.'; }
  else if (tipo === 'cnpj')    { ok = validarCNPJ(val);     msg = 'CNPJ inválido.'; }
  else if (tipo === 'cpf-cnpj'){ ok = validarCpfCnpj(val);  msg = 'CPF/CNPJ inválido.'; }
  else if (tipo === 'tel')     { ok = validarTelefone(val); msg = 'Telefone incompleto.'; }
  else if (tipo === 'tel-ou-email') { ok = _pareceEmail(val) ? validarEmail(val) : validarTelefone(val); msg = _pareceEmail(val) ? 'E-mail inválido.' : 'Telefone incompleto.'; }
  else if (tipo === 'processo'){ ok = validarProcessoCNJ(val); msg = 'Nº de processo deve ter 20 dígitos.'; }
  if (ok) { setFieldOk(input); return true; }
  setFieldError(input, msg);
  return false;
}

/* ══════════════════════════════════════════════════════════════════
   AUTO-BINDER
══════════════════════════════════════════════════════════════════ */
function _aplicarMascara(tipo, valor, tipoSelEl) {
  switch (tipo) {
    case 'cpf':      return maskCPF(valor);
    case 'cnpj':     return maskCNPJ(valor);
    case 'cpf-cnpj': {
      const t = _lerTipoPessoa(tipoSelEl);
      if (t === 'PF') return maskCPF(valor);
      if (t === 'PJ') return maskCNPJ(valor);
      return maskCpfCnpj(valor); // sem referência → decide pelo comprimento
    }
    case 'tel':      return maskTelefone(valor);
    case 'tel-ou-email': return _pareceEmail(valor) ? valor : maskTelefone(valor);
    case 'processo': return maskProcessoCNJ(valor);
    default:         return valor;
  }
}

/* Lê PF/PJ de um <select> ou de um grupo de radios apontado por data-mask-tipo. */
function _lerTipoPessoa(ref) {
  if (ref && typeof ref.value !== 'undefined') return ref.value;
  return null;
}

function _resolverTipoRef(input) {
  const sel = input.getAttribute('data-mask-tipo');
  if (!sel) return null;
  // pode ser um seletor de elemento (#id) ou nome de grupo de radios (radio:nome)
  if (sel.indexOf('radio:') === 0) {
    const nome = sel.slice(6);
    return {
      value: (document.querySelector('input[name="' + nome + '"]:checked') || {}).value || null,
      _radios: document.querySelectorAll('input[name="' + nome + '"]'),
    };
  }
  return document.querySelector(sel);
}

function _bindInput(input) {
  if (input._maskBound) return;
  input._maskBound = true;
  const tipo = input.getAttribute('data-mask');
  if (tipo !== 'tel-ou-email') input.setAttribute('inputmode', 'numeric');
  input.setAttribute('autocomplete', input.getAttribute('autocomplete') || 'off');

  const tipoRef = _resolverTipoRef(input);

  const reformatar = (preservarCursor) => {
    const ref = tipoRef && tipoRef._radios
      ? { value: (document.querySelector('input[name="' + input.getAttribute('data-mask-tipo').slice(6) + '"]:checked') || {}).value }
      : tipoRef;
    const raw = input.value;
    const pos = input.selectionStart || raw.length;
    const digitosAntes = _soDigitos(raw.slice(0, pos)).length;
    const masked = _aplicarMascara(tipo, raw, ref);
    input.value = masked;
    if (preservarCursor) {
      // recoloca o cursor após o mesmo nº de dígitos
      let novo = masked.length, cont = 0;
      for (let i = 0; i < masked.length; i++) {
        if (/\d/.test(masked[i])) cont++;
        if (cont >= digitosAntes) { novo = i + 1; break; }
      }
      try { input.setSelectionRange(novo, novo); } catch (e) {}
    }
  };

  input.addEventListener('input', function () {
    if (input.classList.contains('is-invalid')) clearFieldError(input);
    reformatar(true);
  });
  input.addEventListener('blur', function () { validarCampoMascarado(input); });

  // re-mascara quando o tipo PF/PJ muda
  if (tipoRef) {
    const onTipo = () => { reformatar(false); if (input.value.trim()) validarCampoMascarado(input); };
    if (tipoRef._radios) tipoRef._radios.forEach(r => r.addEventListener('change', onTipo));
    else tipoRef.addEventListener('change', onTipo);
  }
}

function bindMasks(root) {
  (root || document).querySelectorAll('[data-mask]').forEach(_bindInput);
}

/* Exposição global (padrão do projeto) */
window.maskCPF = maskCPF;
window.maskCNPJ = maskCNPJ;
window.maskCpfCnpj = maskCpfCnpj;
window.maskTelefone = maskTelefone;
window.maskProcessoCNJ = maskProcessoCNJ;
window.validarCPF = validarCPF;
window.validarCNPJ = validarCNPJ;
window.validarCpfCnpj = validarCpfCnpj;
window.validarTelefone = validarTelefone;
window.validarEmail = validarEmail;
window.validarProcessoCNJ = validarProcessoCNJ;
window.setFieldError = setFieldError;
window.clearFieldError = clearFieldError;
window.setFieldOk = setFieldOk;
window.validarCampoMascarado = validarCampoMascarado;
window.bindMasks = bindMasks;

document.addEventListener('DOMContentLoaded', function () { bindMasks(document); });
