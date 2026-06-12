/* ══════════════════════════════════════════════════════════════════
   CALCULADORA BACEN — PLATAFORMA REVISIONAL v2.0
══════════════════════════════════════════════════════════════════ */
(function () {


// ============================================
// PARTE II — ESTADO E UTILITÁRIOS
// ============================================

let estado = inicializarEstado();
let stepAtual = 1;
let resultadoCalculado = null;

function inicializarEstado() {
    return {
        cliente: { nome: "", doc: "", tipo: "PF", vulnerab: "" },
        contrato: { banco: "", numero: "", data: "", modalidade: "", detalhe: "" },
        valores: {
            liberado: 0, financiado: 0, parcelas: 0, valorParcela: 0,
            taxaAM: 0, taxaAA: 0, cetAM: 0, cetAA: 0, iof: 0,
            sistemaAmort: "price", taxaBacenManual: 0
        },
        tarifas: {},
        tarifasOutras: { nome: "", valor: 0 },
        seguro: { tem: "nao", valor: 0, seguradora: "", mesmoGrupo: "nao-sei", opcao: "nao-sei" },
        outrosProdutos: { descricao: "", valor: 0, condicao: "nao-sei" },
        capitalizacao: { pactuada: "nao-sei", taxaDiariaInfo: "na" },
        mora: { comPermanencia: "nao", comPermCumul: "na", multaMora: 0, jurosMora: 0 },
        garantia: "",
        vencAntecip: "nao-sei",
        atual: { parcelasPagas: 0, emMora: "nao", acaoBanco: "nao", refinPortabil: "nao" }
    };
}

function formatarMoedaInput(campo) {
    let valor = campo.value.replace(/\D/g, "");
    if (!valor) { campo.value = ""; return; }
    valor = (Number(valor) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
    campo.value = valor;
}
function paraNumero(v) {
    if (!v) return 0;
    if (typeof v === "number") return v;
    const lim = v.toString().replace(/[^\d,-]/g, "").replace(",", ".");
    const n = parseFloat(lim);
    return isNaN(n) ? 0 : n;
}
function paraNumeroBR(v) {
    if (!v) return 0;
    if (typeof v === "number") return v;
    const lim = v.toString().replace(/\D/g, "");
    if (!lim) return 0;
    return Number(lim) / 100;
}
function fmt(v) {
    if (v == null || isNaN(v)) return "R$ 0,00";
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtPct(v, casas = 2) {
    if (v == null || isNaN(v)) return "—";
    return v.toFixed(casas).replace(".", ",") + "%";
}
function fmtNum(v, casas = 2) {
    if (v == null || isNaN(v)) return "—";
    return v.toFixed(casas).replace(".", ",");
}
function aaParaAm(taxaAa) { return (Math.pow(1 + taxaAa / 100, 1 / 12) - 1) * 100; }
function amParaAa(taxaAm) { return (Math.pow(1 + taxaAm / 100, 12) - 1) * 100; }
function calcularPMT(pv, taxaMensal, n) {
    const i = taxaMensal / 100;
    if (i === 0) return pv / n;
    return (pv * i) / (1 - Math.pow(1 + i, -n));
}
function calcularPV(pmt, taxaMensal, n) {
    const i = taxaMensal / 100;
    if (i === 0) return pmt * n;
    return pmt * (1 - Math.pow(1 + i, -n)) / i;
}
function calcularTIR(pv, pmt, n, chuteInicial = 0.02) {
    let i = chuteInicial;
    for (let iter = 0; iter < 200; iter++) {
        const f = pmt * (1 - Math.pow(1 + i, -n)) / i - pv;
        const fLinha = pmt * ((n * Math.pow(1 + i, -n - 1)) / i - (1 - Math.pow(1 + i, -n)) / (i * i));
        if (Math.abs(fLinha) < 1e-12) break;
        const novoI = i - f / fLinha;
        if (Math.abs(novoI - i) < 1e-9) return novoI * 100;
        i = novoI;
        if (i < -0.99) i = 0.001;
        if (i > 10) i = 1;
    }
    return i * 100;
}

// ── Auto-save da análise BACEN ──
// Guarda o id da linha após o primeiro save (evita SELECTs repetidos) e
// usa um lock simples para impedir saves concorrentes em conexão lenta.
let _analiseRowId = null;
let _analiseSalvando = false;

async function salvarAnaliseAuto() {
    if (_analiseSalvando) return;
    if (!window._sb || !window._currentUser) return;
    const nomeCli = (estado.cliente && estado.cliente.nome) ? estado.cliente.nome : '';
    const banco   = (estado.contrato && estado.contrato.banco) ? estado.contrato.banco : '';
    if (!nomeCli && !banco) return;

    _analiseSalvando = true;
    try {
        if (!_analiseRowId) {
            const { data: existentes } = await window._sb
                .from('bacen_analises')
                .select('id')
                .eq('user_id', window._currentUser.id)
                .eq('nome_cliente', nomeCli)
                .eq('banco', banco)
                .limit(1);
            if (existentes && existentes.length > 0) _analiseRowId = existentes[0].id;
        }
        const payload = JSON.parse(JSON.stringify(estado));
        if (_analiseRowId) {
            await window._sb.from('bacen_analises').update({
                atualizado_em:   new Date().toISOString(),
                dados_completos: payload
            }).eq('id', _analiseRowId).eq('user_id', window._currentUser.id);
        } else {
            const { data } = await window._sb.from('bacen_analises').insert({
                office_id:       (typeof officeId === 'function' ? officeId() : null),
                user_id:         window._currentUser.id,
                nome_cliente:    nomeCli,
                banco:           banco,
                dados_completos: payload
            }).select('id').single();
            if (data) _analiseRowId = data.id;
        }
    } catch (_) { /* save silencioso — não interrompe a navegação */ }
    finally { _analiseSalvando = false; }
}

function goToStep(n) {
    coletarDados(stepAtual);
    salvarAnaliseAuto();
    document.querySelectorAll('[id^="platStep"]').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('[data-plat-step-nav]').forEach(el => el.classList.add('hidden'));
    document.getElementById('platStep' + n).classList.remove('hidden');
    document.querySelector('[data-plat-step-nav="' + n + '"]').classList.remove('hidden');
    document.querySelectorAll('.plat-step-pill').forEach(p => {
        const sn = parseInt(p.getAttribute('data-plat-step'));
        p.classList.remove('active');
        if (sn === n) p.classList.add('active');
        if (sn < n) p.classList.add('completed');
        else p.classList.remove('completed');
    });
    stepAtual = n;
    if (n === 5) atualizarTestesCapitalizacao();
    document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
}

function coletarDados(step) {
    if (step === 1) {
        estado.cliente.nome = document.getElementById('cliNome').value.trim();
        estado.cliente.doc = document.getElementById('cliDoc').value.trim();
        estado.cliente.tipo = document.querySelector('input[name="cliTipo"]:checked')?.value || "PF";
        estado.cliente.vulnerab = document.getElementById('cliVulnerab').value;
        estado.contrato.banco = document.getElementById('banco').value.trim();
        estado.contrato.numero = document.getElementById('numContrato').value.trim();
        estado.contrato.data = document.getElementById('dataContrato').value;
        estado.contrato.modalidade = document.getElementById('modalidade').value;
        estado.contrato.detalhe = document.getElementById('modalidadeDetalhe').value.trim();
    }
    if (step === 2) {
        estado.valores.liberado = paraNumeroBR(document.getElementById('vLiberado').value);
        estado.valores.financiado = paraNumeroBR(document.getElementById('vFinanciado').value);
        estado.valores.parcelas = parseInt(document.getElementById('nParcelas').value) || 0;
        estado.valores.valorParcela = paraNumeroBR(document.getElementById('vParcela').value);
        estado.valores.taxaAM = parseFloat(document.getElementById('taxaAM').value) || 0;
        estado.valores.taxaAA = parseFloat(document.getElementById('taxaAA').value) || 0;
        estado.valores.cetAM = parseFloat(document.getElementById('cetAM').value) || 0;
        estado.valores.cetAA = parseFloat(document.getElementById('cetAA').value) || 0;
        estado.valores.iof = paraNumeroBR(document.getElementById('iof').value);
        estado.valores.sistemaAmort = document.getElementById('sistemaAmort').value;
        estado.valores.taxaBacenManual = parseFloat(document.getElementById('taxaBacenManual').value) || 0;
    }
    if (step === 3) {
        estado.tarifas = {};
        document.querySelectorAll('.plat-check-item[data-tar-id]').forEach(item => {
            const id = item.getAttribute('data-tar-id');
            const ativada = item.classList.contains('activated');
            const valorInput = item.querySelector('input[type="text"]');
            estado.tarifas[id] = { ativada, valor: ativada ? paraNumeroBR(valorInput.value) : 0 };
        });
        estado.tarifasOutras.nome = document.getElementById('tarifasOutras').value.trim();
        estado.tarifasOutras.valor = paraNumeroBR(document.getElementById('tarifasOutrasValor').value);
    }
    if (step === 4) {
        estado.seguro.tem = document.querySelector('input[name="seguroSimNao"]:checked')?.value || "nao";
        estado.seguro.valor = paraNumeroBR(document.getElementById('seguroValor').value);
        estado.seguro.seguradora = document.getElementById('seguroSeguradora').value.trim();
        estado.seguro.mesmoGrupo = document.querySelector('input[name="seguroMesmoGrupo"]:checked')?.value || "nao-sei";
        estado.seguro.opcao = document.querySelector('input[name="seguroOpcao"]:checked')?.value || "nao-sei";
        estado.outrosProdutos.descricao = document.getElementById('outrosProd').value.trim();
        estado.outrosProdutos.valor = paraNumeroBR(document.getElementById('outrosProdValor').value);
        estado.outrosProdutos.condicao = document.querySelector('input[name="outrosProdCondicao"]:checked')?.value || "nao-sei";
    }
    if (step === 5) {
        estado.capitalizacao.pactuada = document.querySelector('input[name="capPactuada"]:checked')?.value || "nao-sei";
        estado.capitalizacao.taxaDiariaInfo = document.querySelector('input[name="capTaxaDiariaInfo"]:checked')?.value || "na";
    }
    if (step === 6) {
        estado.mora.comPermanencia = document.querySelector('input[name="comPermanencia"]:checked')?.value || "nao";
        estado.mora.comPermCumul = document.querySelector('input[name="comPermCumul"]:checked')?.value || "na";
        estado.mora.multaMora = parseFloat(document.getElementById('multaMora').value) || 0;
        estado.mora.jurosMora = parseFloat(document.getElementById('jurosMora').value) || 0;
        estado.garantia = document.getElementById('garantia').value;
        estado.vencAntecip = document.querySelector('input[name="vencAntecip"]:checked')?.value || "nao-sei";
        estado.atual.parcelasPagas = parseInt(document.getElementById('parcelasPagas').value) || 0;
        estado.atual.emMora = document.querySelector('input[name="emMora"]:checked')?.value || "nao";
        estado.atual.acaoBanco = document.querySelector('input[name="acaoBanco"]:checked')?.value || "nao";
        estado.atual.refinPortabil = document.querySelector('input[name="refinPortabil"]:checked')?.value || "nao";
    }
}

function aplicarEstadoAosCampos() {
    document.getElementById('cliNome').value = estado.cliente.nome;
    document.getElementById('cliDoc').value = estado.cliente.doc;
    setRadio('cliTipo', estado.cliente.tipo);
    document.getElementById('cliVulnerab').value = estado.cliente.vulnerab;
    document.getElementById('banco').value = estado.contrato.banco;
    document.getElementById('numContrato').value = estado.contrato.numero;
    document.getElementById('dataContrato').value = estado.contrato.data;
    document.getElementById('modalidade').value = estado.contrato.modalidade;
    document.getElementById('modalidadeDetalhe').value = estado.contrato.detalhe;
    document.getElementById('vLiberado').value = estado.valores.liberado ? fmt(estado.valores.liberado) : "";
    document.getElementById('vFinanciado').value = estado.valores.financiado ? fmt(estado.valores.financiado) : "";
    document.getElementById('nParcelas').value = estado.valores.parcelas || "";
    document.getElementById('vParcela').value = estado.valores.valorParcela ? fmt(estado.valores.valorParcela) : "";
    document.getElementById('taxaAM').value = estado.valores.taxaAM || "";
    document.getElementById('taxaAA').value = estado.valores.taxaAA || "";
    document.getElementById('cetAM').value = estado.valores.cetAM || "";
    document.getElementById('cetAA').value = estado.valores.cetAA || "";
    document.getElementById('iof').value = estado.valores.iof ? fmt(estado.valores.iof) : "";
    document.getElementById('sistemaAmort').value = estado.valores.sistemaAmort;
    setRadio('seguroSimNao', estado.seguro.tem);
    document.getElementById('seguroValor').value = estado.seguro.valor ? fmt(estado.seguro.valor) : "";
    document.getElementById('seguroSeguradora').value = estado.seguro.seguradora;
    setRadio('seguroMesmoGrupo', estado.seguro.mesmoGrupo);
    setRadio('seguroOpcao', estado.seguro.opcao);
    document.getElementById('outrosProd').value = estado.outrosProdutos.descricao;
    document.getElementById('outrosProdValor').value = estado.outrosProdutos.valor ? fmt(estado.outrosProdutos.valor) : "";
    setRadio('outrosProdCondicao', estado.outrosProdutos.condicao);
    setRadio('capPactuada', estado.capitalizacao.pactuada);
    setRadio('capTaxaDiariaInfo', estado.capitalizacao.taxaDiariaInfo);
    setRadio('comPermanencia', estado.mora.comPermanencia);
    setRadio('comPermCumul', estado.mora.comPermCumul);
    document.getElementById('multaMora').value = estado.mora.multaMora || "";
    document.getElementById('jurosMora').value = estado.mora.jurosMora || "";
    document.getElementById('garantia').value = estado.garantia;
    setRadio('vencAntecip', estado.vencAntecip);
    document.getElementById('parcelasPagas').value = estado.atual.parcelasPagas || "";
    setRadio('emMora', estado.atual.emMora);
    setRadio('acaoBanco', estado.atual.acaoBanco);
    setRadio('refinPortabil', estado.atual.refinPortabil);
    Object.keys(estado.tarifas).forEach(id => {
        const item = document.querySelector(`.plat-check-item[data-tar-id="${id}"]`);
        if (item) {
            if (estado.tarifas[id].ativada) item.classList.add('activated');
            const valorInput = item.querySelector('input[type="text"]');
            if (valorInput) valorInput.value = estado.tarifas[id].valor ? fmt(estado.tarifas[id].valor) : "";
        }
    });
    atualizarTotaisTarifas();
}

function setRadio(name, value) {
    document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
        r.checked = (r.value === value);
        const pill = r.closest('.plat-opt-pill');
        if (pill) pill.classList.toggle('checked', r.checked);
    });
}

function atualizarTaxas(origem) {
    const elAM = document.getElementById('taxaAM');
    const elAA = document.getElementById('taxaAA');
    const elCAM = document.getElementById('cetAM');
    const elCAA = document.getElementById('cetAA');
    if (origem === 'am' && elAM.value) {
        const am = parseFloat(elAM.value);
        if (!isNaN(am)) elAA.value = amParaAa(am).toFixed(4);
    } else if (origem === 'aa' && elAA.value) {
        const aa = parseFloat(elAA.value);
        if (!isNaN(aa)) elAM.value = aaParaAm(aa).toFixed(4);
    } else if (origem === 'cetam' && elCAM.value) {
        const am = parseFloat(elCAM.value);
        if (!isNaN(am)) elCAA.value = amParaAa(am).toFixed(4);
    } else if (origem === 'cetaa' && elCAA.value) {
        const aa = parseFloat(elCAA.value);
        if (!isNaN(aa)) elCAM.value = aaParaAm(aa).toFixed(4);
    }
    validarTaxasInline();
}

function validarTaxasInline() {
    const alertas = document.getElementById('taxasAlertas');
    if (!alertas) return;
    const am = parseFloat(document.getElementById('taxaAM').value);
    const aa = parseFloat(document.getElementById('taxaAA').value);
    const cam = parseFloat(document.getElementById('cetAM').value);
    const pv = paraNumeroBR(document.getElementById('vFinanciado').value);
    const pmt = paraNumeroBR(document.getElementById('vParcela').value);
    const n = parseInt(document.getElementById('nParcelas').value);
    let html = "";
    if (!isNaN(am) && !isNaN(aa) && am > 0 && aa > 0) {
        const aaCalc = amParaAa(am);
        const diff = Math.abs(aaCalc - aa);
        if (diff > 0.5) {
            html += `<div class="plat-alert medio"><div class="plat-alert-title">⚠ Possível capitalização não pactuada</div>Taxa anual contratada (${fmtPct(aa)}) diverge do composto da mensal (${fmtPct(aaCalc)}). Diferença: ${fmtPct(diff, 2)} p.p.</div>`;
        }
    }
    if (!isNaN(am) && !isNaN(cam) && am > 0 && cam > 0) {
        const diff = cam - am;
        if (diff > 0.5) {
            html += `<div class="plat-alert fraco"><div class="plat-alert-title">CET acima da taxa nominal</div>CET (${fmtPct(cam)}) supera taxa de juros (${fmtPct(am)}) em ${fmtPct(diff, 2)} p.p. ao mês.</div>`;
        }
    }
    if (pv > 0 && pmt > 0 && n > 0 && !isNaN(am) && am > 0) {
        const pvCalc = calcularPV(pmt, am, n);
        const dif = pvCalc - pv;
        const pctDif = (dif / pv) * 100;
        if (Math.abs(pctDif) > 1) {
            const tipo = pctDif > 0 ? "fraco" : "info";
            html += `<div class="plat-alert ${tipo}"><div class="plat-alert-title">${pctDif > 0 ? "⚠" : "ⓘ"} Coerência financeira</div>PV recalculado: <strong>${fmt(pvCalc)}</strong> vs declarado: <strong>${fmt(pv)}</strong>. Diferença: ${fmt(Math.abs(dif))} (${fmtPct(Math.abs(pctDif), 1)}).</div>`;
        }
    }
    if (pv > 0 && pmt > 0 && n > 0) {
        const tirAM = calcularTIR(pv, pmt, n);
        if (!isNaN(tirAM) && !isNaN(am) && Math.abs(tirAM - am) > 0.3) {
            html += `<div class="plat-alert fraco"><div class="plat-alert-title">TIR vs taxa contratada</div>TIR calculada (${fmtPct(tirAM, 3)} a.m.) diverge da taxa contratada (${fmtPct(am)} a.m.) em ${fmtPct(Math.abs(tirAM - am), 3)} p.p.</div>`;
        }
    }
    alertas.innerHTML = html;
}

// ============================================
// PARTE III — MODALIDADE / BACEN / TARIFAS
// ============================================

function onModalidadeChange() {
    const select = document.getElementById('modalidade');
    const key = select.value;
    const alertBox = document.getElementById('modAlert');
    if (!key) { alertBox.classList.add('hidden'); alertBox.innerHTML = ""; return; }
    const mod = MODALIDADES[key];
    const temDados = TAXAS_BACEN[mod.serie] && Object.keys(TAXAS_BACEN[mod.serie]).length > 0;
    let html = "";
    if (temDados) {
        html += `<div class="plat-alert success"><div class="plat-alert-title">Taxa BACEN disponível</div>Esta modalidade usa a série <strong>${mod.serie}</strong>, atualizada automaticamente via API do Banco Central. A taxa será preenchida conforme a data de contratação.</div>`;
    } else if (window._bacenCarregando) {
        html += `<div class="plat-alert info"><div class="plat-alert-title">⏳ Buscando dados do BACEN...</div>Aguarde — estamos consultando a série <strong>${mod.serie}</strong> direto no Banco Central. Se não carregar, informe manualmente.</div>`;
    } else {
        html += `<div class="plat-alert info"><div class="plat-alert-title">Informe a taxa manualmente</div>Não foi possível carregar a série <strong>${mod.serie}</strong> automaticamente. Informe a taxa no campo da Etapa 2.<br><a href="https://www3.bcb.gov.br/sgspub/consultarvalores/consultarValoresSeries.do?method=consultarGraficoPorId&hdOidSeriesSelecionadas=${mod.serie}" target="_blank">Consultar série ${mod.serie} no SGS</a></div>`;
    }
    if (mod.aviso) {
        html += `<div class="plat-alert medio"><div class="plat-alert-title">Atenção técnica</div>${mod.aviso}</div>`;
    }
    alertBox.innerHTML = html;
    alertBox.classList.remove('hidden');
    setTimeout(atualizarTaxaBacen, 50);
}

function onDataContratoChange() { setTimeout(atualizarTaxaBacen, 50); }

function atualizarTaxaBacen() {
    const modKey = document.getElementById('modalidade').value;
    const dataContr = document.getElementById('dataContrato').value;
    const inputBacen = document.getElementById('taxaBacenManual');
    const info = document.getElementById('bacenInfo');
    const hintBacen = document.getElementById('hintBacen');
    if (!modKey) {
        inputBacen.value = ""; inputBacen.disabled = true;
        info.innerHTML = ""; info.className = "plat-val-indicator";
        hintBacen.textContent = "— escolha a modalidade na Etapa 1 primeiro";
        return;
    }
    const mod = MODALIDADES[modKey];
    const taxas = TAXAS_BACEN[mod.serie];
    const temDados = taxas && Object.keys(taxas).length > 0;
    inputBacen.disabled = false;
    hintBacen.innerHTML = `Série <strong>${mod.serie}</strong> · <a href="https://www3.bcb.gov.br/sgspub/consultarvalores/consultarValoresSeries.do?method=consultarGraficoPorId&hdOidSeriesSelecionadas=${mod.serie}" target="_blank">consultar no SGS</a>`;
    if (!temDados) {
        inputBacen.placeholder = window._bacenCarregando
            ? `⏳ Buscando série ${mod.serie}...`
            : `Informe a taxa BACEN da série ${mod.serie} manualmente (% a.a.)`;
        if (!inputBacen.value) {
            info.innerHTML = window._bacenCarregando
                ? `⏳ Consultando BACEN — aguarde...`
                : `Não disponível — informe a taxa manualmente (% a.a.)`;
            info.className = "plat-val-indicator warn";
        }
        return;
    }
    hintBacen.innerHTML += ` · atualizado via API`;
    if (!dataContr) { inputBacen.placeholder = "Preencha a data de contratação na Etapa 1"; info.innerHTML = ""; return; }
    const [aaaa, mm] = dataContr.split("-");
    const chave = `${mm}/${aaaa}`;
    if (taxas[chave] != null) {
        inputBacen.value = taxas[chave].toString().replace(".", ",");
        const am = aaParaAm(taxas[chave]);
        info.innerHTML = `✓ Série ${mod.serie} · ${chave}: ${fmtPct(taxas[chave])} a.a. (${fmtPct(am, 4)} a.m.)`;
        info.className = "plat-val-indicator ok";
    } else {
        inputBacen.value = "";
        info.innerHTML = `⚠ Mês ${chave} sem dados disponíveis. Informe manualmente (% a.a.).`;
        info.className = "plat-val-indicator warn";
        inputBacen.placeholder = "Informe a taxa BACEN do mês manualmente (% a.a.)";
    }
}

function renderTarifas() {
    const container = document.getElementById('tarifasContainer');
    container.innerHTML = "";
    TARIFAS_CHECKLIST.forEach(tar => {
        const item = document.createElement('div');
        item.className = 'plat-check-item';
        item.setAttribute('data-tar-id', tar.id);
        item.innerHTML = `
            <div class="plat-check-toggle">✓</div>
            <div>
                <div class="plat-check-title">${tar.nome}</div>
                <div class="plat-check-desc">${tar.descricao}</div>
                <div class="plat-check-fundamento">Fundamento: ${tar.fundamento}</div>
            </div>
            <div class="plat-check-value">
                <label>Valor (R$)</label>
                <input type="text" placeholder="R$ 0,00">
            </div>`;
        container.appendChild(item);
    });
}

// Delegação de eventos do checklist de tarifas (itens re-renderizáveis)
(function() {
    const container = document.getElementById('tarifasContainer');
    if (!container) return;
    container.addEventListener('click', ev => {
        const toggle = ev.target.closest('.plat-check-toggle');
        if (!toggle) return;
        const item = toggle.closest('.plat-check-item[data-tar-id]');
        if (item) toggleTarifa(item.getAttribute('data-tar-id'));
    });
    container.addEventListener('input', ev => {
        if (!ev.target.matches('input[type="text"]')) return;
        formatarMoedaInput(ev.target);
        atualizarTotaisTarifas();
    });
})();

function toggleTarifa(id) {
    const item = document.querySelector(`.plat-check-item[data-tar-id="${id}"]`);
    item.classList.toggle('activated');
    atualizarTotaisTarifas();
}

function atualizarTotaisTarifas() {
    let total = 0, count = 0;
    document.querySelectorAll('.plat-check-item[data-tar-id].activated').forEach(item => {
        const v = paraNumeroBR(item.querySelector('input[type="text"]').value);
        total += v; count++;
    });
    total += paraNumeroBR(document.getElementById('tarifasOutrasValor')?.value || "");
    if (document.getElementById('tarifasOutras')?.value.trim()) count++;
    document.getElementById('tarifasCount').textContent = count;
    document.getElementById('tarifasTotal').textContent = fmt(total);
    const pv = paraNumeroBR(document.getElementById('vFinanciado').value) || estado.valores.financiado;
    if (pv > 0) document.getElementById('tarifasPct').textContent = fmtPct((total / pv) * 100);
}

function atualizarTestesCapitalizacao() {
    const am = parseFloat(document.getElementById('taxaAM').value);
    const aa = parseFloat(document.getElementById('taxaAA').value);
    const dataContr = document.getElementById('dataContrato').value;
    const duoBox = document.getElementById('duodecupTest');
    const sumBox = document.getElementById('sumula121Test');
    if (!isNaN(am) && !isNaN(aa) && am > 0 && aa > 0) {
        const aaCalc = amParaAa(am);
        const aaDuod = am * 12;
        const diffComp = aa - aaCalc;
        let classe = "info", titulo = "Teste do duodécuplo — resultado neutro";
        let corpo = `Taxa mensal: <strong>${fmtPct(am)}</strong> · Taxa anual contratada: <strong>${fmtPct(aa)}</strong> · Composto da mensal: <strong>${fmtPct(aaCalc)}</strong> · Duodécuplo simples: <strong>${fmtPct(aaDuod)}</strong>.`;
        if (Math.abs(diffComp) <= 0.3) {
            classe = "success"; titulo = "✓ Taxa anual coerente com a mensal composta";
            corpo += " A taxa anual confere com o composto da mensal (≤ 0,3 p.p.). Indica pactuação clara da capitalização.";
        } else if (aa < aaCalc) {
            classe = "fraco"; titulo = "⚠ Taxa anual INFERIOR ao composto da mensal";
            corpo += ` Diferença de <strong>${fmtPct(Math.abs(diffComp), 2)} p.p.</strong> Indício de capitalização não pactuada (Súmula 541/STJ).`;
        } else {
            classe = "medio"; titulo = "⚠ Taxa anual superior ao composto — verificar";
            corpo += ` Diferença de <strong>${fmtPct(diffComp, 2)} p.p.</strong>. Verificar capitalização múltipla ou erro de cálculo.`;
        }
        duoBox.className = `plat-alert ${classe}`;
        duoBox.innerHTML = `<div class="plat-alert-title">${titulo}</div>${corpo}`;
    }
    if (dataContr) {
        const [aaaa, mmc] = dataContr.split("-").map(Number);
        const dataNum = aaaa * 12 + mmc;
        const corteSumula121 = 2000 * 12 + 3;
        if (dataNum < corteSumula121) {
            sumBox.className = "plat-alert forte";
            sumBox.innerHTML = `<div class="plat-alert-title">⛔ Contrato anterior a 31/03/2000</div>Súmula 121/STF: capitalização vedada em contratos anteriores à MP 1.963-17/2000. Tese forte de impugnação.`;
        } else {
            sumBox.className = "plat-alert success";
            sumBox.innerHTML = `<div class="plat-alert-title">✓ Contrato posterior a 31/03/2000</div>Capitalização permitida apenas se pactuada expressamente (Súmula 539/STJ).`;
        }
    }
}

// ============================================
// PARTE IV — CÁLCULO PRINCIPAL
// ============================================

function calcular() {
    for (let s = 1; s <= 6; s++) coletarDados(s);
    const v = estado.valores;
    if (!v.financiado || !v.parcelas || !v.valorParcela || !v.taxaAM) {
        alert("Para calcular, preencha ao menos: valor financiado, parcelas, valor da parcela e taxa mensal (Etapa 2).");
        return;
    }
    if (!estado.contrato.modalidade) { alert("Selecione a modalidade do contrato na Etapa 1."); return; }

    const taxaContratadaAM = v.taxaAM;
    const taxaContratadaAA = v.taxaAA || amParaAa(v.taxaAM);
    const taxaBacenAA = v.taxaBacenManual;
    const taxaBacenAM = taxaBacenAA ? aaParaAm(taxaBacenAA) : 0;
    const cetAM = v.cetAM || (v.cetAA ? aaParaAm(v.cetAA) : 0);
    const pvCalculado = calcularPV(v.valorParcela, taxaContratadaAM, v.parcelas);
    const tirAM = calcularTIR(v.financiado, v.valorParcela, v.parcelas);
    const tirAA = amParaAa(tirAM);

    let tarifasExpurgo = 0, tarifasMarcadas = [];
    TARIFAS_CHECKLIST.forEach(t => {
        const e = estado.tarifas[t.id];
        if (e && e.ativada) { tarifasExpurgo += e.valor; tarifasMarcadas.push({ ...t, valor: e.valor }); }
    });
    if (estado.tarifasOutras.valor > 0) tarifasExpurgo += estado.tarifasOutras.valor;
    if (estado.seguro.tem === "sim") tarifasExpurgo += estado.seguro.valor;
    if (estado.outrosProdutos.valor > 0) tarifasExpurgo += estado.outrosProdutos.valor;

    const totalContratado = v.valorParcela * v.parcelas;
    const jurosContratado = totalContratado - v.financiado;
    let pmtBacen = 0, totalBacen = 0, reducaoConservadora = 0;
    if (taxaBacenAM > 0) {
        pmtBacen = calcularPMT(v.financiado, taxaBacenAM, v.parcelas);
        totalBacen = pmtBacen * v.parcelas;
        reducaoConservadora = totalContratado - totalBacen;
    }
    let pmtBacenExp = 0, totalBacenExp = 0, reducaoOtimista = 0;
    const principalExpurgado = Math.max(0, v.financiado - tarifasExpurgo);
    if (taxaBacenAM > 0) {
        pmtBacenExp = calcularPMT(principalExpurgado, taxaBacenAM, v.parcelas);
        totalBacenExp = pmtBacenExp * v.parcelas;
        reducaoOtimista = totalContratado - totalBacenExp;
    }
    const parcelasPagas = estado.atual.parcelasPagas;
    const valorPagoIndevido = parcelasPagas > 0 ? parcelasPagas * Math.max(0, v.valorParcela - pmtBacen) : 0;
    const restituicaoDobro = valorPagoIndevido * 2;

    const irregularidades = [];
    if (taxaBacenAA > 0) {
        const razao = taxaContratadaAA / taxaBacenAA;
        let peso = "fraca", titulo = "";
        if (razao >= 2.0) { peso = "forte"; titulo = `Taxa de juros superior ao DOBRO da média BACEN (${razao.toFixed(2)}x)`; }
        else if (razao >= 1.5) { peso = "media"; titulo = `Taxa de juros 1,5x ou mais acima da média BACEN (${razao.toFixed(2)}x)`; }
        else if (razao >= 1.2) { peso = "fraca"; titulo = `Taxa de juros entre 1,2x e 1,5x a média BACEN (${razao.toFixed(2)}x)`; }
        if (titulo) irregularidades.push({ peso, titulo, fundamento: "Tema 27/STJ — REsp 1.061.530/RS", detalhe: `Contratada ${fmtPct(taxaContratadaAA)} a.a. (${fmtPct(taxaContratadaAM, 3)} a.m.) versus BACEN ${fmtPct(taxaBacenAA)} a.a. da modalidade ${MODALIDADES[estado.contrato.modalidade].nome} no mês da contratação.` });
    } else {
        irregularidades.push({ peso: "fraca", titulo: "Taxa BACEN da modalidade não informada", fundamento: "metodológico", detalhe: "Sem a taxa BACEN da modalidade, a comparação fica prejudicada." });
    }
    if (cetAM > 0 && taxaContratadaAM > 0) {
        const diff = cetAM - taxaContratadaAM;
        if (diff > 0.5) irregularidades.push({ peso: "media", titulo: `CET (${fmtPct(cetAM)} a.m.) supera taxa nominal em ${fmtPct(diff, 2)} p.p.`, fundamento: "Res. CMN 3.517/2007", detalhe: "Diferença relevante indica tarifas, seguros ou encargos embutidos." });
    } else if (cetAM === 0) {
        irregularidades.push({ peso: "fraca", titulo: "CET não informado no contrato", fundamento: "Res. CMN 3.517/2007 art. 1º; art. 6º, III, CDC", detalhe: "Ausência do CET configura violação ao dever de informação." });
    }
    const difPV = pvCalculado - v.financiado;
    if (Math.abs(difPV) > v.financiado * 0.01 && difPV > 0) {
        irregularidades.push({ peso: "media", titulo: `Encargos embutidos não declarados (${fmt(difPV)})`, fundamento: "art. 39, V, CDC; Princípio da transparência", detalhe: `PV recalculado (${fmt(pvCalculado)}) supera o valor financiado declarado (${fmt(v.financiado)}).` });
    }
    if (taxaContratadaAM > 0 && Math.abs(tirAM - taxaContratadaAM) > 0.3) {
        irregularidades.push({ peso: "fraca", titulo: `TIR (${fmtPct(tirAM, 3)} a.m.) diverge da taxa contratada (${fmtPct(taxaContratadaAM)} a.m.)`, fundamento: "Coerência aritmética; art. 6º, III, CDC", detalhe: `TIR diverge ${fmtPct(Math.abs(tirAM - taxaContratadaAM), 3)} p.p. da taxa declarada.` });
    }
    const dataContrato = estado.contrato.data;
    const [aaaa, mmd] = dataContrato ? dataContrato.split("-").map(Number) : [0, 0];
    const dataNum = aaaa * 12 + mmd;
    const corte2008 = 2008 * 12 + 4, corte2011 = 2011 * 12 + 2;
    tarifasMarcadas.forEach(t => {
        let peso = t.peso === "forte" ? "forte" : (t.peso === "media-forte" ? "media" : (t.peso === "media" ? "media" : "fraca"));
        let detalhe = `Valor: ${fmt(t.valor)}. ${t.descricao}`;
        if (t.regra === "data-2008-04-30" && dataNum > corte2008) { peso = "forte"; detalhe = `${fmt(t.valor)} cobrado em contrato posterior a 30/04/2008 — vedação expressa pela Res. CMN 3.518/2007.`; }
        if (t.regra === "data-2011-02-25" && dataNum > corte2011) { peso = "forte"; detalhe = `${fmt(t.valor)} cobrado em contrato posterior a 25/02/2011 — tese 1.3 do Tema 958/STJ.`; }
        if (t.regra === "prova-servico") detalhe = `${fmt(t.valor)} cobrado sem prova do efetivo serviço/registro/avaliação. Impugnação por inversão do ônus (art. 6º, VIII, CDC).`;
        if (t.regra === "tipicidade") detalhe = `${fmt(t.valor)} cobrado sem padrão tarifário do BACEN (Res. CMN 3.518/2007).`;
        if (t.id === "tc") detalhe = `${fmt(t.valor)} de Tarifa de Cadastro. Válida apenas na PRIMEIRA operação do cliente com o banco.`;
        irregularidades.push({ peso, titulo: `${t.nome} — ${fmt(t.valor)}`, fundamento: t.fundamento, detalhe });
    });
    if (estado.tarifasOutras.valor > 0 && estado.tarifasOutras.nome) {
        irregularidades.push({ peso: "media", titulo: `Tarifa atípica: ${escHtml(estado.tarifasOutras.nome)} — ${fmt(estado.tarifasOutras.valor)}`, fundamento: "art. 39, I e V, CDC; princípio da tipicidade tarifária", detalhe: "Tarifa fora do rol padronizado do BACEN." });
    }
    if (estado.seguro.tem === "sim") {
        let pesoSeg = "fraca", titulo = `Seguro prestamista — ${fmt(estado.seguro.valor)}`;
        let detalhe = "Prestamista é lícito desde que: (a) contratado com liberdade de escolha e (b) prêmio proporcional ao risco.";
        if (estado.seguro.mesmoGrupo === "sim" && estado.seguro.opcao === "nao") {
            pesoSeg = "forte"; titulo = `Venda casada de seguro prestamista — ${fmt(estado.seguro.valor)}`;
            detalhe = `Seguradora "${escHtml(estado.seguro.seguradora)}" do mesmo grupo do banco, sem opção real. Venda casada (Tema 958/STJ tese 2.2; art. 39, I, CDC).`;
        } else if (estado.seguro.mesmoGrupo === "sim" || estado.seguro.opcao === "nao") {
            pesoSeg = "media"; detalhe += " Indício relevante: " + (estado.seguro.mesmoGrupo === "sim" ? "seguradora do mesmo grupo do banco." : "ausência de prova da opção de escolha.");
        } else if (estado.seguro.opcao === "nao-sei") {
            pesoSeg = "media"; detalhe += " Ônus de prova da opção é do banco (Tema 958/STJ).";
        }
        irregularidades.push({ peso: pesoSeg, titulo, fundamento: "Tema 958/STJ, tese 2.2; art. 39, I, CDC", detalhe });
    }
    if (estado.outrosProdutos.valor > 0 && estado.outrosProdutos.condicao === "sim") {
        irregularidades.push({ peso: "forte", titulo: `Produto vinculado como condição: ${escHtml(estado.outrosProdutos.descricao)} (${fmt(estado.outrosProdutos.valor)})`, fundamento: "art. 39, I, CDC", detalhe: "Vinculação como condição do crédito é venda casada típica." });
    } else if (estado.outrosProdutos.valor > 0) {
        irregularidades.push({ peso: "media", titulo: `Produto vinculado: ${escHtml(estado.outrosProdutos.descricao)} (${fmt(estado.outrosProdutos.valor)})`, fundamento: "art. 39, V, CDC", detalhe: "Verificar se houve consentimento livre e informado." });
    }
    if (taxaContratadaAM > 0 && taxaContratadaAA > 0) {
        const aaCalc = amParaAa(taxaContratadaAM);
        if (estado.capitalizacao.pactuada === "nao") {
            irregularidades.push({ peso: "forte", titulo: "Capitalização não pactuada expressamente", fundamento: "Súmula 539/STJ; REsp 973.827", detalhe: "Contrato não contém cláusula expressa de capitalização." });
        } else if (Math.abs(aaCalc - taxaContratadaAA) > 0.3 && estado.capitalizacao.pactuada !== "sim-mensal" && estado.capitalizacao.pactuada !== "sim-diaria") {
            irregularidades.push({ peso: "media", titulo: `Indício de capitalização não declarada (diferença de ${fmtPct(aaCalc - taxaContratadaAA, 2)} p.p.)`, fundamento: "Súmula 541/STJ; REsp 973.827", detalhe: `Taxa anual contratada (${fmtPct(taxaContratadaAA)}) diverge do composto da mensal (${fmtPct(aaCalc)}).` });
        }
    }
    if (dataContrato && dataNum > 0 && dataNum < 2000 * 12 + 3) {
        irregularidades.push({ peso: "forte", titulo: "Contrato anterior a 31/03/2000 — capitalização vedada", fundamento: "Súmula 121/STF", detalhe: "Anterior à MP 1.963-17/2000. Capitalização vedada de plano." });
    }
    if (estado.capitalizacao.pactuada === "sim-diaria" && estado.capitalizacao.taxaDiariaInfo === "nao") {
        irregularidades.push({ peso: "forte", titulo: "Capitalização diária sem informação da taxa diária", fundamento: "REsp 1.826.463/SC", detalhe: "Capitalização diária sem taxa diária expressa viola o dever de transparência." });
    }
    if (estado.mora.comPermanencia === "sim" && estado.mora.comPermCumul === "sim") {
        irregularidades.push({ peso: "forte", titulo: "Comissão de permanência cumulada", fundamento: "Súmula 472/STJ", detalhe: "Comissão de permanência cumulada com juros ou multa é vedada." });
    }
    if (estado.mora.multaMora > 2.0) {
        irregularidades.push({ peso: "forte", titulo: `Multa moratória ${fmtPct(estado.mora.multaMora)} — acima do teto legal`, fundamento: "art. 52, §1º, CDC", detalhe: "Multa moratória em relação de consumo limitada a 2%. Excesso é nulo." });
    }
    if (v.iof > 0) {
        irregularidades.push({ peso: "fraca", titulo: `IOF financiado: ${fmt(v.iof)} — verificar transparência`, fundamento: "art. 6º, III, CDC", detalhe: "Inclusão no principal exige demonstração da memória de cálculo." });
    }

    const fortes = irregularidades.filter(i => i.peso === "forte").length;
    const medias = irregularidades.filter(i => i.peso === "media").length;
    const fracas = irregularidades.filter(i => i.peso === "fraca").length;
    let veredito, vClasse, vIcon, vDesc;
    if (fortes >= 2 || (fortes >= 1 && medias >= 2)) {
        veredito = "Altamente viável"; vClasse = "altamente-viavel"; vIcon = "✓";
        vDesc = `${fortes} indício(s) forte(s) e ${medias} médio(s). Caso com base sólida para ajuizamento com tutela de urgência.`;
    } else if (fortes >= 1 || medias >= 3) {
        veredito = "Viável com reforço probatório"; vClasse = "viavel-reforco"; vIcon = "⚠";
        vDesc = `${fortes} forte(s) e ${medias} médio(s). Viável, mas reforço probatório recomendado.`;
    } else if (medias >= 1 || fracas >= 3) {
        veredito = "Marginal — requer estratégia cautelosa"; vClasse = "arriscado"; vIcon = "○";
        vDesc = `Apenas ${medias} indício(s) médio(s) e ${fracas} fraco(s). Avaliar caso a caso.`;
    } else {
        veredito = "Não recomendado o ajuizamento"; vClasse = "nao-recomendado"; vIcon = "✕";
        vDesc = "Sem indícios relevantes de abusividade. Considerar renegociação ou superendividamento.";
    }
    resultadoCalculado = {
        taxaContratadaAA, taxaContratadaAM, taxaBacenAA, taxaBacenAM,
        cetAM, pvCalculado, tirAM, tirAA, totalContratado, jurosContratado,
        pmtBacen, totalBacen, reducaoConservadora, pmtBacenExp, totalBacenExp, reducaoOtimista,
        principalExpurgado, tarifasExpurgo, restituicaoDobro,
        irregularidades, veredito, vClasse, vIcon, vDesc, fortes, medias, fracas
    };
    renderResultado();
    goToStep(7);
}

function renderResultado() {
    const r = resultadoCalculado;
    const c = document.getElementById('resultadoConteudo');
    const razaoBacen = r.taxaBacenAA > 0 ? (r.taxaContratadaAA / r.taxaBacenAA) : null;
    let html = `
        <div class="plat-card-section" style="margin-top:0;padding-top:0;border-top:none;">
            <div class="plat-card-section-title">Veredito</div>
            <div class="plat-verdict-box ${r.vClasse}">
                <div class="plat-verdict-icon">${r.vIcon}</div>
                <div class="plat-verdict-text"><strong>${r.veredito}</strong><span>${r.vDesc}</span></div>
            </div>
        </div>
        <div class="plat-card-section">
            <div class="plat-card-section-title">Estimativa econômica</div>
            <div class="plat-stat-grid">
                <div class="plat-stat-cell"><div class="plat-stat-label">Total contratado</div><div class="plat-stat-value">${fmt(r.totalContratado)}</div><div class="plat-stat-sub">${estado.valores.parcelas}× ${fmt(estado.valores.valorParcela)}</div></div>
                <div class="plat-stat-cell"><div class="plat-stat-label">Cenário conservador (BACEN)</div><div class="plat-stat-value positivo">${r.pmtBacen > 0 ? fmt(r.totalBacen) : "—"}</div><div class="plat-stat-sub">${r.pmtBacen > 0 ? "parcela " + fmt(r.pmtBacen) : "sem BACEN informado"}</div></div>
                <div class="plat-stat-cell"><div class="plat-stat-label">Cenário otimista (BACEN + expurgo)</div><div class="plat-stat-value positivo">${r.pmtBacenExp > 0 ? fmt(r.totalBacenExp) : "—"}</div><div class="plat-stat-sub">${r.pmtBacenExp > 0 ? "parcela " + fmt(r.pmtBacenExp) : "—"}</div></div>
            </div>
            <div class="plat-stat-grid">
                <div class="plat-stat-cell"><div class="plat-stat-label">Redução conservadora</div><div class="plat-stat-value ${r.reducaoConservadora > 0 ? 'positivo' : ''}">${r.reducaoConservadora > 0 ? fmt(r.reducaoConservadora) : "—"}</div><div class="plat-stat-sub">economia total estimada</div></div>
                <div class="plat-stat-cell"><div class="plat-stat-label">Redução otimista</div><div class="plat-stat-value ${r.reducaoOtimista > 0 ? 'positivo' : ''}">${r.reducaoOtimista > 0 ? fmt(r.reducaoOtimista) : "—"}</div><div class="plat-stat-sub">com expurgo de acessórios</div></div>
                <div class="plat-stat-cell"><div class="plat-stat-label">Restituição em dobro estimada</div><div class="plat-stat-value ${r.restituicaoDobro > 0 ? 'destaque' : ''}">${r.restituicaoDobro > 0 ? fmt(r.restituicaoDobro) : "—"}</div><div class="plat-stat-sub">CDC art. 42, p. único</div></div>
            </div>
        </div>
        <div class="plat-card-section">
            <div class="plat-card-section-title">Comparativo BACEN — Tema 27/STJ</div>
            <table class="plat-compare-table">
                <thead><tr><th>Indicador</th><th class="val">% a.a.</th><th class="val">% a.m.</th><th class="val">Razão</th></tr></thead>
                <tbody>
                    <tr><td>Taxa contratada</td><td class="val">${fmtPct(r.taxaContratadaAA)}</td><td class="val">${fmtPct(r.taxaContratadaAM, 3)}</td><td class="val destaque">${razaoBacen ? razaoBacen.toFixed(2) + "x" : "—"}</td></tr>
                    <tr><td>Média BACEN</td><td class="val">${r.taxaBacenAA > 0 ? fmtPct(r.taxaBacenAA) : "<em>não informada</em>"}</td><td class="val">${r.taxaBacenAM > 0 ? fmtPct(r.taxaBacenAM, 3) : "—"}</td><td class="val">1,00x (referência)</td></tr>
                    ${r.cetAM > 0 ? `<tr><td>CET informado</td><td class="val">${fmtPct(amParaAa(r.cetAM))}</td><td class="val">${fmtPct(r.cetAM, 3)}</td><td class="val ${r.cetAM > r.taxaContratadaAM ? 'neg' : ''}">+${fmtPct(r.cetAM - r.taxaContratadaAM, 3)} p.p. vs nominal</td></tr>` : ''}
                    <tr><td>TIR (calculada do fluxo)</td><td class="val">${fmtPct(r.tirAA)}</td><td class="val">${fmtPct(r.tirAM, 3)}</td><td class="val ${Math.abs(r.tirAM - r.taxaContratadaAM) > 0.3 ? 'neg' : 'pos'}">${(r.tirAM - r.taxaContratadaAM >= 0 ? "+" : "")}${fmtPct(r.tirAM - r.taxaContratadaAM, 3)} p.p. vs nominal</td></tr>
                </tbody>
            </table>
            ${razaoBacen ? renderClassificacaoTema27(razaoBacen) : ''}
        </div>
        <div class="plat-card-section">
            <div class="plat-card-section-title">Irregularidades identificadas (${r.fortes} forte · ${r.medias} médio · ${r.fracas} fraco)</div>
            <ul class="plat-irreg-list">
                ${r.irregularidades.length === 0
                    ? '<li class="plat-alert success"><div class="plat-alert-title">Sem irregularidades</div>Nenhum indício relevante foi identificado nos dados informados.</li>'
                    : r.irregularidades.map(i => `<li class="plat-irreg-item ${i.peso}"><span class="plat-irreg-peso">${i.peso}</span><div class="plat-irreg-titulo">${i.titulo}</div><div class="plat-irreg-fundamento">Fundamento: ${i.fundamento}</div><div class="plat-irreg-detalhe">${i.detalhe}</div></li>`).join('')}
            </ul>
        </div>
        <div class="plat-card-section">
            <div class="plat-card-section-title">Coerência matemática</div>
            <table class="plat-compare-table">
                <tbody>
                    <tr><td>Valor financiado declarado</td><td class="val">${fmt(estado.valores.financiado)}</td></tr>
                    <tr><td>PV recalculado (taxa nominal)</td><td class="val">${fmt(r.pvCalculado)}</td></tr>
                    <tr><td>Diferença</td><td class="val ${Math.abs(r.pvCalculado - estado.valores.financiado) > estado.valores.financiado * 0.01 ? 'neg' : 'pos'}">${fmt(r.pvCalculado - estado.valores.financiado)}</td></tr>
                    <tr><td>Total a pagar</td><td class="val">${fmt(r.totalContratado)}</td></tr>
                    <tr><td>Juros + encargos no fluxo</td><td class="val">${fmt(r.jurosContratado)}</td></tr>
                </tbody>
            </table>
        </div>
        <div class="plat-alert info" style="margin-top:24px;">
            <div class="plat-alert-title">Notas metodológicas</div>
            Os cálculos são preliminares e não substituem perícia contábil em juízo. O critério da taxa BACEN está sob reanálise no Tema 1.378/STJ (REsp 2.227.280). Mantenha a estratégia diversificada (taxa, capitalização, tarifas, seguros, mora).
        </div>`;
    c.innerHTML = html;
}

function renderClassificacaoTema27(razao) {
    let classe, texto;
    if (razao >= 2.0) { classe = "forte"; texto = `Taxa contratada é <strong>${razao.toFixed(2)}x</strong> a média BACEN. Indício FORTE de abusividade (critério Tema 27/STJ).`; }
    else if (razao >= 1.5) { classe = "medio"; texto = `Taxa contratada é <strong>${razao.toFixed(2)}x</strong> a média BACEN. Indício MÉDIO — zona cinzenta. Necessário reforço com outras irregularidades.`; }
    else if (razao >= 1.2) { classe = "fraco"; texto = `Taxa contratada é <strong>${razao.toFixed(2)}x</strong> a média BACEN. Indício FRACO. Buscar fundamento principal em outras irregularidades.`; }
    else { classe = "success"; texto = `Taxa contratada é <strong>${razao.toFixed(2)}x</strong> a média BACEN — dentro da banda de mercado. Sem indício de abusividade pelo Tema 27/STJ.`; }
    return `<div class="plat-alert ${classe}" style="margin-top:14px;"><div class="plat-alert-title">Classificação Tema 27/STJ</div>${texto}</div>`;
}

// ============================================
// PARTE V — GERADOR DE RELATÓRIO (14 BLOCOS)
// ============================================

function gerarRelatorio() {
    const r = resultadoCalculado;
    if (!r) return "<p>Execute o cálculo primeiro.</p>";
    const e = estado;
    // Campos digitados pelo usuário — escapados antes de ir para innerHTML
    const nomeEsc     = escHtml(e.cliente.nome);
    const docEsc      = escHtml(e.cliente.doc);
    const bancoEsc    = escHtml(e.contrato.banco);
    const numEsc      = escHtml(e.contrato.numero);
    const garantiaEsc = escHtml(e.garantia);
    const mod = MODALIDADES[e.contrato.modalidade];
    const dataContr = e.contrato.data ? e.contrato.data.split("-").reverse().join("/") : "—";
    const razaoBacen = r.taxaBacenAA > 0 ? (r.taxaContratadaAA / r.taxaBacenAA) : null;
    const fortes = r.irregularidades.filter(i => i.peso === "forte");
    const medias = r.irregularidades.filter(i => i.peso === "media");
    const fracas = r.irregularidades.filter(i => i.peso === "fraca");
    const hoje = new Date().toLocaleDateString("pt-BR");
    let html = `
        <h1>Análise Revisional Bancária — ${nomeEsc || "Cliente"}</h1>
        <p style="margin-bottom:20px;color:var(--t3);font-size:13px;"><strong>Contrato nº ${numEsc || "—"}</strong> · ${bancoEsc || "—"} · ${dataContr}<br>Modalidade: ${mod ? mod.nome : "—"}<br>Análise gerada em ${hoje} · Plataforma v1.0</p>
        <h2>1 · Resumo executivo</h2>
        <p>Análise técnica do contrato <strong>${numEsc || "—"}</strong>, firmado entre <strong>${nomeEsc || "o cliente"}</strong> (${e.cliente.tipo}) e <strong>${bancoEsc || "a instituição financeira"}</strong> em ${dataContr}, na modalidade <strong>${mod ? mod.nome : "—"}</strong>, valor financiado de <strong>${fmt(e.valores.financiado)}</strong>, pago em <strong>${e.valores.parcelas}× ${fmt(e.valores.valorParcela)}</strong>, taxa contratada <strong>${fmtPct(r.taxaContratadaAM, 3)} a.m. (${fmtPct(r.taxaContratadaAA)} a.a.)</strong>.</p>
        <p>Veredito: <strong>${r.veredito}</strong>. ${r.vDesc}</p>
        <h2>2 · Documentos analisados</h2>
        <ul><li>Contrato bancário nº ${numEsc || "—"} (${dataContr})</li><li>Informações declaradas pelo cliente quanto a parcelas, taxas, tarifas e produtos vinculados</li><li>Taxa média BACEN da modalidade no mês da contratação (série ${mod ? mod.serie : "—"})</li></ul>
        <h2>3 · Dados essenciais do contrato</h2>
        <table><tbody>
            <tr><th>Contratante</th><td>${nomeEsc || "—"} (${e.cliente.tipo}${docEsc ? " · " + docEsc : ""})</td></tr>
            <tr><th>Instituição</th><td>${bancoEsc || "—"}</td></tr>
            <tr><th>Modalidade</th><td>${mod ? mod.nome : "—"}</td></tr>
            <tr><th>Data de contratação</th><td>${dataContr}</td></tr>
            <tr><th>Valor liberado</th><td>${fmt(e.valores.liberado)}</td></tr>
            <tr><th>Valor financiado</th><td>${fmt(e.valores.financiado)}</td></tr>
            <tr><th>Prazo</th><td>${e.valores.parcelas} parcelas</td></tr>
            <tr><th>Valor da parcela</th><td>${fmt(e.valores.valorParcela)}</td></tr>
            <tr><th>Taxa contratada</th><td>${fmtPct(r.taxaContratadaAM, 3)} a.m. · ${fmtPct(r.taxaContratadaAA)} a.a.</td></tr>
            ${r.cetAM > 0 ? `<tr><th>CET</th><td>${fmtPct(r.cetAM, 3)} a.m. · ${fmtPct(amParaAa(r.cetAM))} a.a.</td></tr>` : ''}
            <tr><th>Garantia</th><td>${garantiaEsc || "não informada"}</td></tr>
            <tr><th>Situação atual</th><td>${e.atual.parcelasPagas} parcela(s) paga(s) · em mora: ${e.atual.emMora}</td></tr>
        </tbody></table>
        <h2>4 · Aplicabilidade do CDC</h2>${gerarAnaliseCDC(e)}
        <h2>5 · Comparação BACEN (Tema 27/STJ)</h2>
        ${razaoBacen ? `<table><thead><tr><th>Indicador</th><th>% a.a.</th><th>% a.m.</th></tr></thead><tbody>
            <tr><td>Taxa contratada</td><td>${fmtPct(r.taxaContratadaAA)}</td><td>${fmtPct(r.taxaContratadaAM, 3)}</td></tr>
            <tr><td>Média BACEN (${mod ? mod.serie : "—"})</td><td>${fmtPct(r.taxaBacenAA)}</td><td>${fmtPct(r.taxaBacenAM, 3)}</td></tr>
            <tr><td><strong>Razão contratada / BACEN</strong></td><td colspan="2"><strong>${razaoBacen.toFixed(2)}x</strong></td></tr>
        </tbody></table>
        <p>${razaoBacen >= 2 ? "Taxa contratada é ao menos o dobro da média BACEN. Indício forte de abusividade conforme critério majoritário pós-Tema 27/STJ." : razaoBacen >= 1.5 ? "Taxa em zona cinzenta (entre 1,5x e 2x BACEN). Aplicação do Tema 27 depende de reforço com outras irregularidades." : razaoBacen >= 1.2 ? "Diferença modesta sobre a média BACEN. Buscar fundamentos cumulativos." : "Taxa dentro da banda de mercado. Tema 27/STJ não fundamenta a revisão."}</p>
        <p><em>Nota: o critério da taxa BACEN está sob reanálise no Tema 1.378/STJ. Estratégia recomendada: não depender exclusivamente desse critério.</em></p>`
        : '<p>Taxa BACEN não informada — comparação prejudicada. Recomenda-se consulta ao SGS/BACEN.</p>'}
        <h2>6 · Irregularidades de peso FORTE</h2>
        ${fortes.length === 0 ? '<p><em>Nenhuma irregularidade forte identificada.</em></p>' : '<ul>' + fortes.map(i => `<li><strong>${i.titulo}</strong><br>${i.detalhe}<br><em>Fundamento: ${i.fundamento}</em></li>`).join('') + '</ul>'}
        <h2>7 · Irregularidades de peso MÉDIO</h2>
        ${medias.length === 0 ? '<p><em>Nenhuma irregularidade média identificada.</em></p>' : '<ul>' + medias.map(i => `<li><strong>${i.titulo}</strong><br>${i.detalhe}<br><em>Fundamento: ${i.fundamento}</em></li>`).join('') + '</ul>'}
        <h2>8 · Irregularidades de peso FRACO</h2>
        ${fracas.length === 0 ? '<p><em>Nenhuma irregularidade fraca identificada.</em></p>' : '<ul>' + fracas.map(i => `<li><strong>${i.titulo}</strong><br>${i.detalhe}<br><em>Fundamento: ${i.fundamento}</em></li>`).join('') + '</ul>'}
        <h2>9 · Teses a EVITAR</h2>
        <ul>
            <li><strong>Limitação dos juros a 12% a.a.</strong> — Súmula 596/STF afasta o Dec. 22.626/33 das instituições financeiras.</li>
            <li><strong>Aplicação do CDC para PJ comum sem vulnerabilidade comprovada</strong> — art. 421-A do CC presume paridade entre empresas.</li>
            <li><strong>Revisão isolada da taxa pelo Tema 27/STJ sem outras irregularidades</strong> — risco de não acolhimento. Tema 1.378 está sob reanálise.</li>
            ${e.contrato.modalidade && e.contrato.modalidade.indexOf("consig") >= 0 ? '<li><strong>Aplicar série de PF não consignado (20742) em contrato consignado</strong> — use a série correta da modalidade.</li>' : ''}
        </ul>
        <h2>10 · Estimativa econômica</h2>
        <table><thead><tr><th>Cenário</th><th>Parcela</th><th>Total</th><th>Redução</th></tr></thead><tbody>
            <tr><td>Contratado (status quo)</td><td>${fmt(e.valores.valorParcela)}</td><td>${fmt(r.totalContratado)}</td><td>—</td></tr>
            ${r.pmtBacen > 0 ? `<tr><td>Conservador (BACEN)</td><td>${fmt(r.pmtBacen)}</td><td>${fmt(r.totalBacen)}</td><td><strong>${fmt(r.reducaoConservadora)}</strong></td></tr>` : ''}
            ${r.pmtBacenExp > 0 ? `<tr><td>Otimista (BACEN + expurgo)</td><td>${fmt(r.pmtBacenExp)}</td><td>${fmt(r.totalBacenExp)}</td><td><strong>${fmt(r.reducaoOtimista)}</strong></td></tr>` : ''}
        </tbody></table>
        ${r.restituicaoDobro > 0 ? `<p><strong>Restituição em dobro estimada</strong> (CDC art. 42, p. único): <strong>${fmt(r.restituicaoDobro)}</strong>, considerando ${e.atual.parcelasPagas} parcela(s) já paga(s).</p>` : ''}
        <p>Tarifas/seguros/produtos passíveis de expurgo: <strong>${fmt(r.tarifasExpurgo)}</strong>.</p>
        <h2>11 · Documentos faltantes a serem requisitados</h2>
        <ul>
            <li>Cópia integral do contrato com todas as cláusulas e anexos</li>
            <li>Memória de cálculo da composição da parcela (taxa nominal × CET × encargos)</li>
            ${e.tarifas.tab && e.tarifas.tab.ativada ? '<li>Laudo de avaliação do bem (justificativa da TAB)</li>' : ''}
            ${(e.tarifas.treg && e.tarifas.treg.ativada) || (e.tarifas.tgrav && e.tarifas.tgrav.ativada) ? '<li>Comprovante do efetivo registro do contrato e da inserção do gravame eletrônico</li>' : ''}
            ${e.seguro.tem === "sim" ? '<li>Apólice do seguro prestamista, comprovante de opção por seguradora terceira (ou ausência)</li>' : ''}
            <li>Histórico de operações do cliente com o banco (para análise de tarifa de cadastro repetida)</li>
            <li>Extratos detalhados de pagamento</li>
            ${e.atual.refinPortabil === "sim" ? '<li>Contrato de origem (operação anterior refinanciada/portada)</li>' : ''}
        </ul>
        <p><em>Exigíveis via art. 396 do CPC, com inversão do ônus da prova (art. 6º, VIII, CDC).</em></p>
        <h2>12 · Riscos processuais</h2>
        <ul>
            <li><strong>Tema 1.378/STJ em aberto</strong>: REsp 2.227.280 reanalisa o critério da taxa média BACEN. Manter estratégia diversificada.</li>
            <li><strong>Ônus probatório do banco</strong>: invocar art. 6º, VIII, CDC para inverter ônus sobre tarifas, seguradora e capitalização.</li>
            <li><strong>Sucumbência</strong>: caso de improcedência total, honorários e custas para o cliente.</li>
            ${e.cliente.tipo === "PJ" && (e.cliente.vulnerab === "nao" || !e.cliente.vulnerab) ? '<li><strong>PJ sem vulnerabilidade clara</strong>: art. 421-A do CC presume paridade. Riscos elevados.</li>' : ''}
            ${r.fracas > r.fortes + r.medias ? '<li><strong>Predominância de indícios fracos</strong>: considerar negociação extrajudicial antes do ajuizamento.</li>' : ''}
        </ul>
        <h2>13 · Viabilidade e estratégia</h2>
        <p><strong>${r.veredito}.</strong> ${r.vDesc}</p>
        <p>Estratégia processual recomendada:</p>
        <ol>
            <li><strong>Ação revisional</strong> com base nas irregularidades identificadas, fundamento principal na conjugação de ${fortes.length > 0 ? "irregularidades fortes" : medias.length > 0 ? "irregularidades médias" : "indícios cumulativos"}.</li>
            <li><strong>Tutela de urgência</strong> (art. 300 CPC): (a) suspensão/redução das parcelas ao valor incontroverso; ${e.garantia === "aliencao-fid" ? "(b) proibição de busca e apreensão; (c)" : "(b)"} proibição de inscrição em órgãos de proteção ao crédito.</li>
            <li><strong>Pedido de exibição</strong> (art. 396 CPC) dos documentos listados, com inversão do ônus da prova.</li>
            <li><strong>Pedido principal</strong>: nulidade dos encargos abusivos, recálculo do contrato, repetição em dobro dos valores pagos indevidamente.</li>
            <li><strong>Danos morais</strong>: <strong>R$ 20.000,00</strong>, fundamentado nas circunstâncias concretas.</li>
        </ol>
        <h2>14 · Próximos passos</h2>
        <ol>
            <li>Apresentar a análise ao cliente em reunião, explicando os achados em linguagem acessível.</li>
            <li>Coletar dos arquivos do cliente: contrato integral, extratos, comprovantes de pagamento.</li>
            <li>Solicitar ao banco, extrajudicialmente, os documentos faltantes.</li>
            <li>Formalizar contrato de honorários após decisão informada do cliente.</li>
            <li>${r.veredito === "Altamente viável" ? "Proceder ao ajuizamento da revisional com pedido de tutela de urgência." : r.veredito === "Viável com reforço probatório" ? "Antes do ajuizamento, complementar documentação e considerar perícia contábil preliminar." : r.veredito === "Marginal — requer estratégia cautelosa" ? "Avaliar negociação extrajudicial com o banco antes de optar pelo ajuizamento." : "Orientar o cliente sobre a inviabilidade da revisional. Explorar caminhos alternativos."}</li>
        </ol>
        <p style="margin-top:32px;font-size:11px;color:var(--t3);border-top:1px solid var(--gb);padding-top:12px;"><em>Relatório preliminar gerado pela Plataforma de Análise Revisional Bancária v1.0 — uso interno do escritório. Os cálculos e classificações são estimativos. A decisão final exige análise jurídica caso-a-caso pelo advogado responsável.</em></p>`;
    return html;
}

function gerarAnaliseCDC(e) {
    if (e.cliente.tipo === "PF") return '<p>Aplicação do CDC <strong>incontroversa</strong>. Pessoa física consumidora final, em relação típica de consumo bancário (Súmula 297/STJ).</p>';
    if (!e.cliente.vulnerab || e.cliente.vulnerab === "nao") return '<p>Pessoa jurídica sem vulnerabilidade declarada. O <strong>art. 421-A do Código Civil</strong> presume paridade nas relações empresariais. A aplicação do CDC depende de comprovação de vulnerabilidade em concreto. <strong>Estratégia: documentar a vulnerabilidade.</strong></p>';
    const mapa = {
        "ME-EPP": "ME/EPP. A Lei Complementar 123/2006 reforça o tratamento diferenciado. CDC aplicável por vulnerabilidade presumida da microempresa.",
        "tecnica": "Vulnerabilidade técnica caracterizada (ausência de expertise específica). CDC viável (Súmula 297/STJ; teoria finalista mitigada).",
        "economica": "Vulnerabilidade econômica caracterizada (desequilíbrio financeiro acentuado). CDC viável (teoria finalista mitigada).",
        "informacional": "Vulnerabilidade informacional caracterizada (assimetria de informação relevante). CDC viável."
    };
    return `<p>${mapa[e.cliente.vulnerab]}</p>`;
}

// ============================================
// PARTE VI — MENSAGEM WHATSAPP
// ============================================

function gerarMensagemWhatsApp() {
    const r = resultadoCalculado;
    if (!r) return "Execute o cálculo primeiro.";
    const e = estado;
    const nome = e.cliente.nome || "[Nome do cliente]";
    const primeiroNome = nome.split(" ")[0];
    const banco = e.contrato.banco || "o banco";
    const mod = MODALIDADES[e.contrato.modalidade];
    let msg = `Oi, ${primeiroNome}! Tudo bem?\n\n`;
    msg += `Finalizei a análise do seu contrato com ${banco}`;
    if (mod) msg += ` (${mod.nome.toLowerCase()})`;
    msg += `. Quero te passar um panorama honesto antes de qualquer decisão.\n\n`;
    if (r.veredito === "Altamente viável") {
        msg += `Encontrei pontos importantes que merecem ser questionados. `;
        if (r.fortes >= 1) msg += `Identifiquei ${r.fortes} ${r.fortes === 1 ? "ponto forte" : "pontos fortes"} de irregularidade${r.medias >= 1 ? " e " + r.medias + " " + (r.medias === 1 ? "ponto médio" : "pontos médios") : ""}. `;
        msg += `Em um cenário conservador, a economia estimada gira em torno de ${fmt(r.reducaoConservadora)}, e em um cenário mais favorável, pode chegar a ${fmt(r.reducaoOtimista)}.\n\n`;
        msg += `Importante: essas são estimativas iniciais — não promessa. O resultado final depende de uma série de fatores, inclusive de jurisprudência que está em movimento (o STJ está reanalisando um critério importante esse ano).\n\n`;
        msg += `Faz sentido marcarmos uma conversa de uns 20 a 30 minutos para eu te mostrar exatamente o que encontrei? Pode ser por videochamada ou aqui no escritório.\n\n`;
    } else if (r.veredito === "Viável com reforço probatório") {
        msg += `O cenário é positivo, mas exige alguns passos antes de partir para a ação. Identifiquei ${r.fortes >= 1 ? r.fortes + " ponto" + (r.fortes !== 1 ? "s" : "") + " forte" + (r.fortes !== 1 ? "s" : "") + " e " : ""}${r.medias} ponto${r.medias !== 1 ? "s" : ""} médio${r.medias !== 1 ? "s" : ""} de questionamento.\n\n`;
        msg += `A estimativa preliminar de economia, num cenário conservador, é de ${fmt(r.reducaoConservadora)}. Antes de qualquer ajuizamento, vamos precisar reunir alguns documentos.\n\n`;
        msg += `Que tal marcarmos uma conversa para eu te explicar o que vi e os próximos passos? Sem compromisso de imediato.\n\n`;
    } else if (r.veredito === "Marginal — requer estratégia cautelosa") {
        msg += `Quero ser direto contigo: o caso tem alguns pontos questionáveis, mas não são suficientes para recomendar uma ação revisional sem hesitação.\n\n`;
        msg += `Tenho duas sugestões: ou (1) reunimos mais documentos e reavaliamos com calma, ou (2) avaliamos uma tentativa de renegociação direta com ${banco}.\n\n`;
        msg += `Posso te ligar ou marcamos uma conversa para eu te explicar com mais detalhe?\n\n`;
    } else {
        msg += `Vou ser direto: pela análise que fiz com os dados disponíveis, não identifiquei irregularidades relevantes que sustentem uma ação revisional com boa chance de sucesso.\n\n`;
        msg += `Isso não quer dizer que não haja caminhos — dependendo da sua situação, podemos avaliar superendividamento (Lei 14.181/2021) ou renegociação direta.\n\n`;
    }
    msg += `Qualquer dúvida me chama por aqui mesmo. Forte abraço.`;
    return msg;
}

// ============================================
// PARTE VII — I/O (SAVE/LOAD/RESET/COPY)
// ============================================

function abrirRelatorio() {
    if (!resultadoCalculado) { alert("Execute o cálculo primeiro."); return; }
    document.getElementById('platRelatorioConteudo').innerHTML = gerarRelatorio();
    document.getElementById('platModalRelatorio').classList.remove('hidden');
}

function abrirWhatsApp() {
    if (!resultadoCalculado) { alert("Execute o cálculo primeiro."); return; }
    document.getElementById('platWhatsappTexto').value = gerarMensagemWhatsApp();
    document.getElementById('platModalWhatsApp').classList.remove('hidden');
}

function fecharModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function copiarRelatorio() {
    const el = document.getElementById('platRelatorioConteudo');
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    try { document.execCommand('copy'); alert("Relatório copiado para a área de transferência.\nCole no Word, e-mail ou onde precisar."); }
    catch (e) { alert("Não foi possível copiar. Use Ctrl+C para copiar a seleção."); }
}

function copiarWhatsApp() {
    const ta = document.getElementById('platWhatsappTexto');
    ta.select();
    try {
        navigator.clipboard.writeText(ta.value);
        const btn = document.getElementById('platBtnCopiarWpp');
        const txtOriginal = btn.textContent;
        btn.textContent = "✓ Copiado!";
        setTimeout(() => { btn.textContent = txtOriginal; }, 2000);
    } catch (e) { document.execCommand('copy'); alert("Mensagem copiada."); }
}

function saveCase() {
    for (let s = 1; s <= 6; s++) coletarDados(s);
    const payload = { versao: "1.0", geradoEm: new Date().toISOString(), estado: estado, resultado: resultadoCalculado };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const nomeArq = `analise_${(estado.cliente.nome || "caso").replace(/\W+/g, "_").toLowerCase()}_${estado.contrato.numero || "sem_num"}.json`;
    const a = document.createElement('a');
    a.href = url; a.download = nomeArq;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}

function loadCase() { document.getElementById('platLoadFileInput').click(); }

function handleLoadFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const payload = JSON.parse(ev.target.result);
            if (payload.estado) {
                estado = payload.estado;
                resultadoCalculado = payload.resultado || null;
                aplicarEstadoAosCampos();
                if (estado.contrato.modalidade) onModalidadeChange();
                if (resultadoCalculado) { renderResultado(); goToStep(7); }
                else { goToStep(1); }
                alert("Caso carregado com sucesso.");
            } else { alert("Arquivo não reconhecido. Esperado JSON com campo 'estado'."); }
        } catch (e) { alert("Erro ao ler o arquivo: " + e.message); }
    };
    reader.readAsText(file);
    event.target.value = "";
}

function resetCase() {
    if (!confirm("Iniciar nova análise? Os dados atuais serão perdidos se não foram salvos.")) return;
    estado = inicializarEstado();
    resultadoCalculado = null;
    _analiseRowId = null;
    const pg = document.getElementById('page-bacen');
    pg.querySelectorAll('input[type="text"], input[type="number"]').forEach(el => el.value = "");
    pg.querySelectorAll('input[type="month"], input[type="date"]').forEach(el => el.value = "");
    pg.querySelectorAll('select').forEach(el => el.value = "");
    pg.querySelectorAll('input[type="radio"]').forEach(r => {
        r.checked = false;
        const pill = r.closest('.plat-opt-pill');
        if (pill) pill.classList.remove('checked');
    });
    setRadio('cliTipo', 'PF'); setRadio('seguroSimNao', 'nao');
    setRadio('seguroMesmoGrupo', 'nao-sei'); setRadio('seguroOpcao', 'nao-sei');
    setRadio('outrosProdCondicao', 'nao-sei'); setRadio('capPactuada', 'nao-sei');
    setRadio('capTaxaDiariaInfo', 'na'); setRadio('comPermanencia', 'nao');
    setRadio('comPermCumul', 'na'); setRadio('vencAntecip', 'nao-sei');
    setRadio('emMora', 'nao'); setRadio('acaoBanco', 'nao'); setRadio('refinPortabil', 'nao');
    pg.querySelectorAll('.plat-check-item.activated').forEach(el => el.classList.remove('activated'));
    document.getElementById('taxasAlertas').innerHTML = "";
    document.getElementById('modAlert').innerHTML = "";
    document.getElementById('modAlert').classList.add('hidden');
    document.getElementById('bacenInfo').innerHTML = "";
    document.getElementById('tarifasCount').textContent = "0";
    document.getElementById('tarifasTotal').textContent = "R$ 0,00";
    document.getElementById('tarifasPct').textContent = "0,00%";
    document.getElementById('resultadoConteudo').innerHTML = "";
    document.getElementById('grpVulnerabilidade').style.display = "none";
    goToStep(1);
}

// ============================================
// PARTE VIII — INICIALIZAÇÃO E EVENT LISTENERS
// ============================================

renderTarifas();

document.querySelectorAll('#page-bacen .plat-opt-pill').forEach(pill => {
    pill.addEventListener('click', function(ev) {
        const input = pill.querySelector('input');
        if (!input) return;
        if (input.type === 'radio') {
            document.querySelectorAll(`input[name="${input.name}"]`).forEach(r => {
                const p = r.closest('.plat-opt-pill');
                if (p) p.classList.remove('checked');
            });
            input.checked = true;
            pill.classList.add('checked');
            if (input.name === 'cliTipo') {
                document.getElementById('grpVulnerabilidade').style.display = input.value === 'PJ' ? '' : 'none';
            }
        } else {
            input.checked = !input.checked;
            pill.classList.toggle('checked');
        }
        ev.preventDefault();
    });
});

document.querySelectorAll('#page-bacen input[type="radio"]:checked, #page-bacen input[type="checkbox"]:checked').forEach(r => {
    const p = r.closest('.plat-opt-pill');
    if (p) p.classList.add('checked');
});

document.getElementById('modalidade').addEventListener('change', onModalidadeChange);
document.getElementById('dataContrato').addEventListener('change', onDataContratoChange);

document.getElementById('taxaBacenManual').addEventListener('input', function(ev) {
    const raw = ev.target.value.replace(",", ".");
    const v = parseFloat(raw);
    if (!isNaN(v)) {
        estado.valores.taxaBacenManual = v;
        const info = document.getElementById('bacenInfo');
        info.innerHTML = `✓ Taxa BACEN informada: ${fmtPct(v)} a.a. (${fmtPct(aaParaAm(v), 4)} a.m.)`;
        info.className = "plat-val-indicator ok";
    }
});

document.querySelectorAll('#page-bacen .plat-modal-backdrop').forEach(bd => {
    bd.addEventListener('click', function(ev) {
        if (ev.target === bd) bd.classList.add('hidden');
    });
});

// — Expor globais —
window.platGoToStep              = goToStep;
window.platCalcular              = calcular;
window.platFormatarMoedaInput    = formatarMoedaInput;
window.platAtualizarTaxas        = atualizarTaxas;
window.platToggleTarifa          = toggleTarifa;
window.platAtualizarTotaisTarifas = atualizarTotaisTarifas;
window.platAbrirRelatorio        = abrirRelatorio;
window.platAbrirWhatsApp         = abrirWhatsApp;
window.platSaveCase              = saveCase;
window.platLoadCase              = loadCase;
window.platResetCase             = resetCase;
window.platFecharModal           = fecharModal;
window.platCopiarRelatorio       = copiarRelatorio;
window.platCopiarWhatsApp        = copiarWhatsApp;
window.platHandleLoadFile        = handleLoadFile;
window.platOnModalidadeChange    = onModalidadeChange;
window.platAtualizarTaxaBacen    = atualizarTaxaBacen;

// Carrega uma análise salva (chamado pelo histórico, que está fora desta IIFE)
window.platCarregarAnalise = function(dados, rowId) {
    estado = Object.assign(inicializarEstado(), dados);
    resultadoCalculado = null;
    _analiseRowId = rowId || null;
    aplicarEstadoAosCampos();
    if (estado.contrato.modalidade) onModalidadeChange();
    goToStep(1);
};

})();
