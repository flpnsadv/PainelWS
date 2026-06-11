/* ══════════════════════════════════════════════
   BACEN API — Busca automática de taxas
══════════════════════════════════════════════ */
(function() {
  var CACHE_KEY = 'bacen_taxas_v2';
  var CACHE_TTL = 12 * 60 * 60 * 1000; // 12 horas

  function lerCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (Date.now() - obj.ts > CACHE_TTL) return null;
      return obj.data;
    } catch(e) { return null; }
  }

  function salvarCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data })); } catch(e) {}
  }

  function atualizarBadge(estado, detalhe) {
    var badge = document.getElementById('platBadgeAtualizacao');
    if (!badge) return;
    badge.className = 'plat-header-badge ' + estado;
    badge.textContent = detalhe;
  }

  async function buscarSerie(serie) {
    // O endpoint /ultimos/N passou a aceitar no máximo 20 pontos (HTTP 400 acima disso).
    // O endpoint por intervalo de datas retorna o histórico completo.
    // Timeout de 10s: algumas séries (ex. 20711) travam no servidor do BCB.
    var dataFinal = '31/12/' + new Date().getFullYear();
    var url = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.' + serie + '/dados?formato=json&dataInicial=01/01/2018&dataFinal=' + dataFinal;
    var resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var arr = await resp.json();
    var result = {};
    arr.forEach(function(item) {
      var partes = item.data.split('/');
      var chave = partes[1] + '/' + partes[2]; // MM/YYYY
      result[chave] = parseFloat(String(item.valor).replace(',', '.'));
    });
    return result;
  }

  async function carregarTaxas() {
    window._bacenCarregando = true;
    atualizarBadge('badge-loading', '⏳ Atualizando taxas...');

    var cache = lerCache();
    if (cache) {
      Object.assign(TAXAS_BACEN, cache);
      window._bacenCarregando = false;
      var agora = new Date();
      var label = agora.toLocaleString('pt-BR', { month: 'short' }) + '/' + agora.getFullYear();
      atualizarBadge('badge-ok', '✓ Taxas atualizadas · ' + label);
      return;
    }

    // Coleta todos os códigos de série únicos
    var seriesMap = {};
    Object.values(MODALIDADES).forEach(function(mod) { if (mod.serie) seriesMap[mod.serie] = true; });
    var codigos = Object.keys(seriesMap);

    // A API do BCB bloqueia rajadas grandes de requisições paralelas —
    // busca em lotes de 3 com pequena pausa entre eles.
    var novos = {};
    var erros = [];
    var LOTE = 3;
    for (var i = 0; i < codigos.length; i += LOTE) {
      var lote = codigos.slice(i, i + LOTE);
      var resultados = await Promise.allSettled(lote.map(async function(serie) {
        var dados = await buscarSerie(serie);
        novos[serie] = dados;
      }));
      resultados.forEach(function(r, j) {
        if (r.status === 'rejected') erros.push(lote[j]);
      });
      if (i + LOTE < codigos.length) await new Promise(function(res) { setTimeout(res, 350); });
    }

    Object.assign(TAXAS_BACEN, novos);
    window._bacenCarregando = false;

    if (Object.keys(novos).length > 0) salvarCache(novos);

    var agora = new Date();
    var label = agora.toLocaleString('pt-BR', { month: 'short' }) + '/' + agora.getFullYear();
    if (erros.length === 0) {
      atualizarBadge('badge-ok', '✓ Taxas atualizadas · ' + label);
    } else {
      atualizarBadge('badge-warn', '⚠ ' + erros.length + ' série(s) indisponível(is)');
    }

    // Atualiza o campo de taxa caso já haja modalidade selecionada
    var modSel = document.getElementById('modalidade');
    if (modSel && modSel.value) {
      window.platOnModalidadeChange && window.platOnModalidadeChange();
    }
  }

  document.addEventListener('DOMContentLoaded', carregarTaxas);
  window.bacenRecarregar = carregarTaxas;
})();
