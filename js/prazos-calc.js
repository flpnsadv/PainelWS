/* ══════════════════════════════════════════════════════════════════
   CÁLCULO DE PRAZOS — dias úteis, feriados nacionais, prazo em dobro
   Simplificação v1: não considera feriados estaduais/municipais nem
   suspensões de prazo — sempre exibir aviso ao usuário.
══════════════════════════════════════════════════════════════════ */

// Páscoa pelo algoritmo de Gauss
function _pascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function _addDias(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function _iso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function feriadosNacionais(ano) {
  const fixos = [
    ano + '-01-01', // Confraternização
    ano + '-04-21', // Tiradentes
    ano + '-05-01', // Trabalho
    ano + '-09-07', // Independência
    ano + '-10-12', // N. Sra. Aparecida
    ano + '-11-02', // Finados
    ano + '-11-15', // Proclamação
    ano + '-11-20', // Consciência Negra
    ano + '-12-25', // Natal
  ];
  const pascoa = _pascoa(ano);
  const moveis = [
    _iso(_addDias(pascoa, -48)), // Carnaval (seg)
    _iso(_addDias(pascoa, -47)), // Carnaval (ter)
    _iso(_addDias(pascoa, -2)),  // Paixão de Cristo
    _iso(_addDias(pascoa, 60)),  // Corpus Christi
  ];
  return fixos.concat(moveis);
}

function _ehDiaUtil(d) {
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  return !feriadosNacionais(d.getFullYear()).includes(_iso(d));
}

function _proximoDiaUtil(d) {
  let x = _addDias(d, 1);
  while (!_ehDiaUtil(x)) x = _addDias(x, 1);
  return x;
}

/**
 * Calcula prazo processual a partir da data de disponibilização no DJEN.
 * Regra: publicação = 1º dia útil após a disponibilização;
 * a contagem começa no dia útil seguinte à publicação (art. 224 CPC).
 * @param {string|Date} dataDisp - data de disponibilização (YYYY-MM-DD)
 * @param {number} dias - prazo em dias
 * @param {object} opts - { dobro: false, uteis: true }
 * @returns {{publicacao: Date, inicio: Date, fim: Date, diasEfetivos: number}}
 */
function prazoCalcular(dataDisp, dias, opts) {
  opts = opts || {};
  const base = typeof dataDisp === 'string' ? new Date(dataDisp + 'T12:00:00') : new Date(dataDisp);
  const diasEfetivos = opts.dobro ? dias * 2 : dias;
  const publicacao = _proximoDiaUtil(base);
  const inicio = _proximoDiaUtil(publicacao);
  let fim;
  if (opts.uteis === false) {
    fim = _addDias(inicio, diasEfetivos - 1);
    // se cair em dia não útil, prorroga para o próximo dia útil
    while (!_ehDiaUtil(fim)) fim = _addDias(fim, 1);
  } else {
    fim = new Date(inicio);
    let contados = 1; // o próprio dia de início conta como 1º dia útil
    while (contados < diasEfetivos) {
      fim = _proximoDiaUtil(fim);
      contados++;
    }
  }
  return { publicacao: publicacao, inicio: inicio, fim: fim, diasEfetivos: diasEfetivos };
}

function prazoFmtData(d) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
