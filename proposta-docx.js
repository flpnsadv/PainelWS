// proposta-docx.js — Gerador de Proposta em .docx no navegador
// Dependências: JSZip (global), FileSaver.js (global)

// ─── Formatação ────────────────────────────────────────────────

function _brl(v) {
  const abs = Math.abs(v);
  const [intPart, decPart] = abs.toFixed(2).split('.');
  return 'R$ ' + intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + decPart;
}

function _pctBr(v) {
  return '+' + v.toFixed(1).replace('.', ',') + '%';
}

function _pctLabel(v) {
  return '(+' + v.toFixed(1).replace('.', ',') + '%)';
}

function _parcelaCartao(total, n, taxaMensalPct) {
  const r = taxaMensalPct / 100;
  return Math.round(((total / n) * Math.pow(1 + r, n)) * 100) / 100;
}

// ─── Manipulação de XML ────────────────────────────────────────

function _findRowContaining(xml, searchText) {
  const idx = xml.indexOf(searchText);
  if (idx === -1) return [-1, -1];
  const trStart = xml.lastIndexOf('<w:tr ', idx);
  if (trStart === -1) return [-1, -1];
  const trEnd = xml.indexOf('</w:tr>', idx);
  if (trEnd === -1) return [-1, -1];
  return [trStart, trEnd + 7];
}

function _insertRowBefore(xml, searchText, newRowXml) {
  const [trStart] = _findRowContaining(xml, searchText);
  if (trStart === -1) {
    console.warn('[AVISO] Não encontrou linha com \'' + searchText + '\' para inserção');
    return xml;
  }
  return xml.slice(0, trStart) + newRowXml + '\n      ' + xml.slice(trStart);
}

function _insertRowAfter(xml, searchText, newRowXml) {
  const [, trEnd] = _findRowContaining(xml, searchText);
  if (trEnd === -1) {
    console.warn('[AVISO] Não encontrou linha com \'' + searchText + '\' para inserção');
    return xml;
  }
  return xml.slice(0, trEnd) + '\n      ' + newRowXml + xml.slice(trEnd);
}

function _removeRowContaining(xml, searchText) {
  const [trStart, trEnd] = _findRowContaining(xml, searchText);
  if (trStart === -1) {
    console.warn('[AVISO] Não encontrou linha com \'' + searchText + '\' para remoção');
    return xml;
  }
  return xml.slice(0, trStart) + xml.slice(trEnd);
}

function _replaceTextInRun(xml, oldText, newText) {
  return xml.replace('>' + oldText + '<', '>' + newText + '<');
}

// ─── Geradores de XML ──────────────────────────────────────────

function _row2col(label, valor, paraId, boldValor, colorValor) {
  boldValor  = boldValor  === undefined ? false     : boldValor;
  colorValor = colorValor === undefined ? '222222'  : colorValor;
  const bold = boldValor ? '<w:b/><w:bCs/>' : '';
  return '<w:tr w:rsidR="002065EE" w:rsidRPr="004939BE" ' +
    'w14:paraId="' + paraId + 'A" w14:textId="77777777">\n' +
    '        <w:tc>\n' +
    '          <w:tcPr>\n' +
    '            <w:tcW w:w="5400" w:type="dxa"/>\n' +
    '            <w:tcBorders>\n' +
    '              <w:top w:val="nil"/><w:left w:val="nil"/>\n' +
    '              <w:bottom w:val="single" w:sz="1" w:space="0" w:color="CCCCCC"/>\n' +
    '              <w:right w:val="nil"/>\n' +
    '            </w:tcBorders>\n' +
    '            <w:tcMar>\n' +
    '              <w:top w:w="60" w:type="dxa"/><w:left w:w="0" w:type="dxa"/>\n' +
    '              <w:bottom w:w="60" w:type="dxa"/><w:right w:w="80" w:type="dxa"/>\n' +
    '            </w:tcMar>\n' +
    '          </w:tcPr>\n' +
    '          <w:p w14:paraId="' + paraId + 'B" w14:textId="77777777" ' +
    'w:rsidR="002065EE" w:rsidRPr="004939BE" w:rsidRDefault="005F3371">\n' +
    '            <w:pPr><w:rPr><w:rFonts w:ascii="Nunito" w:hAnsi="Nunito"/>' +
    '</w:rPr></w:pPr>\n' +
    '            <w:r><w:rPr>\n' +
    '              <w:rFonts w:ascii="Nunito" w:hAnsi="Nunito"/>\n' +
    '              <w:color w:val="444444"/>\n' +
    '              <w:sz w:val="20"/><w:szCs w:val="20"/>\n' +
    '            </w:rPr><w:t>' + label + '</w:t></w:r>\n' +
    '          </w:p>\n' +
    '        </w:tc>\n' +
    '        <w:tc>\n' +
    '          <w:tcPr>\n' +
    '            <w:tcW w:w="3960" w:type="dxa"/>\n' +
    '            <w:tcBorders>\n' +
    '              <w:top w:val="nil"/><w:left w:val="nil"/>\n' +
    '              <w:bottom w:val="single" w:sz="1" w:space="0" w:color="CCCCCC"/>\n' +
    '              <w:right w:val="nil"/>\n' +
    '            </w:tcBorders>\n' +
    '            <w:tcMar>\n' +
    '              <w:top w:w="60" w:type="dxa"/><w:left w:w="80" w:type="dxa"/>\n' +
    '              <w:bottom w:w="60" w:type="dxa"/><w:right w:w="0" w:type="dxa"/>\n' +
    '            </w:tcMar>\n' +
    '          </w:tcPr>\n' +
    '          <w:p w14:paraId="' + paraId + 'C" w14:textId="77777777" ' +
    'w:rsidR="002065EE" w:rsidRPr="004939BE" w:rsidRDefault="005F3371">\n' +
    '            <w:pPr><w:jc w:val="right"/>' +
    '<w:rPr><w:rFonts w:ascii="Nunito" w:hAnsi="Nunito"/></w:rPr></w:pPr>\n' +
    '            <w:r><w:rPr>\n' +
    '              <w:rFonts w:ascii="Nunito" w:hAnsi="Nunito"/>\n' +
    '              ' + bold + '\n' +
    '              <w:color w:val="' + colorValor + '"/>\n' +
    '              <w:sz w:val="20"/><w:szCs w:val="20"/>\n' +
    '            </w:rPr><w:t>' + valor + '</w:t></w:r>\n' +
    '          </w:p>\n' +
    '        </w:tc>\n' +
    '      </w:tr>';
}

function _rowCartao(nxLabel, pmtStr, jurosStr, totalStr, paraId) {
  const rb = '<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>';
  const lb = '<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>';

  function cell(width, borders, fill, jc, color, text, pid, bold) {
    const b = bold ? '<w:b/><w:bCs/>' : '';
    return '<w:tc><w:tcPr><w:tcW w:w="' + width + '" w:type="dxa"/>' +
      '<w:tcBorders>' + borders + '</w:tcBorders>' +
      '<w:shd w:val="clear" w:color="auto" w:fill="' + fill + '"/>' +
      '<w:tcMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/>' +
      '<w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>' +
      '</w:tcPr>' +
      '<w:p w14:paraId="' + pid + '" w14:textId="77777777" w:rsidR="002065EE" ' +
      'w:rsidRPr="004939BE" w:rsidRDefault="00644211">' +
      '<w:pPr><w:jc w:val="' + jc + '"/>' +
      '<w:rPr><w:rFonts w:ascii="Nunito" w:hAnsi="Nunito"/></w:rPr></w:pPr>' +
      '<w:r><w:rPr><w:rFonts w:ascii="Nunito" w:hAnsi="Nunito"/>' + b +
      '<w:color w:val="' + color + '"/>' +
      '<w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr>' +
      '<w:t>' + text + '</w:t></w:r></w:p></w:tc>';
  }

  return '<w:tr w:rsidR="002065EE" w:rsidRPr="004939BE" ' +
    'w14:paraId="' + paraId + '0" w14:textId="77777777" w:rsidTr="006667C2">' +
    cell(1440, rb,       'FBFBFB', 'center', '222222', nxLabel,  paraId + '1', true) +
    cell(2640, lb + rb,  'FBFBFB', 'center', '222222', pmtStr,   paraId + '2', false) +
    cell(2640, lb + rb,  'FBFBFB', 'center', '854F0B', jurosStr, paraId + '3', false) +
    cell(2640, lb,       'FBFBFB', 'center', '222222', totalStr, paraId + '4', false) +
    '</w:tr>';
}

function _runsObjetivos(objetivos) {
  function boldRun(texto) {
    return '<w:r><w:rPr>' +
      '<w:rFonts w:ascii="Nunito" w:hAnsi="Nunito"/>' +
      '<w:b/><w:bCs/>' +
      '<w:color w:val="333333"/>' +
      '</w:rPr><w:t>' + texto + '</w:t></w:r>';
  }
  function normalRun(texto) {
    return '<w:r><w:rPr>' +
      '<w:rFonts w:ascii="Nunito" w:hAnsi="Nunito"/>' +
      '<w:color w:val="333333"/>' +
      '</w:rPr><w:t xml:space="preserve">' + texto + '</w:t></w:r>';
  }
  const parts = [];
  for (let i = 0; i < objetivos.length; i++) {
    parts.push(boldRun(objetivos[i]));
    if (i < objetivos.length - 2) {
      parts.push(normalRun('; '));
    } else if (i < objetivos.length - 1) {
      parts.push(normalRun('; e '));
    }
  }
  parts.push(normalRun('.'));
  return parts.join('');
}

// ─── Função principal ──────────────────────────────────────────

async function gerarPropostaDocx(cfg) {
  // 1. Fetch template
  let arrayBuffer;
  try {
    const resp = await fetch('templates/MODELO_script.docx');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    arrayBuffer = await resp.arrayBuffer();
  } catch (e) {
    alert('Não foi possível carregar o modelo MODELO_script.docx. Verifique se o arquivo está na pasta templates/.');
    return;
  }

  try {
    // 2. Abrir zip
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 3. Ler document.xml
    let xml = await zip.file('word/document.xml').async('string');

    // ─── Cálculos (espelho do Python) ──────────────────────
    const valorBase  = parseFloat(cfg.valor_base);
    const urgPct     = parseFloat(cfg.urgencia_pct   || 0);
    const espPct     = parseFloat(cfg.especificidade_pct || 0);
    const compPct    = parseFloat(cfg.complexidade_pct || 0);
    const tutela     = Boolean(cfg.tutela_liminar);
    const tutelaPct  = tutela ? 25.0 : 0.0;
    const totalAjPct = urgPct + espPct + compPct + tutelaPct;

    const ajusteUrg  = Math.round(valorBase * urgPct   / 100 * 100) / 100;
    const ajusteEsp  = Math.round(valorBase * espPct   / 100 * 100) / 100;
    const ajusteComp = Math.round(valorBase * compPct  / 100 * 100) / 100;
    const ajusteTut  = Math.round(valorBase * tutelaPct / 100 * 100) / 100;
    const valAjustado = Math.round((valorBase + ajusteUrg + ajusteEsp + ajusteComp + ajusteTut) * 100) / 100;

    const taxaH      = parseFloat(cfg.taxa_horaria || 0);
    const horas      = parseFloat(cfg.horas_analise || 0);
    const adicionalH = Math.round(taxaH * horas * 100) / 100;

    const issPct    = parseFloat(cfg.iss_pct || 0);
    const subtotal  = Math.round((valAjustado + adicionalH) * 100) / 100;
    const issValor  = issPct > 0 ? Math.round(subtotal * issPct / 100 * 100) / 100 : 0;
    const total     = Math.round((subtotal + issValor) * 100) / 100;

    const descAvPct  = parseFloat(cfg.desconto_avista_pct !== undefined ? cfg.desconto_avista_pct : 8.0);
    const totalAvista = Math.round(total * (1 - descAvPct / 100) * 100) / 100;
    const economiaAv  = Math.round((total - totalAvista) * 100) / 100;

    const entPct     = parseFloat(cfg.entrada_pct !== undefined ? cfg.entrada_pct : 30.0);
    const entrada    = Math.round(total * entPct / 100 * 100) / 100;
    const saldo      = Math.round((total - entrada) * 100) / 100;
    const nBoleto    = parseInt(cfg.num_parcelas_boleto || 6);
    const pmtBoleto  = Math.round(saldo / nBoleto * 100) / 100;

    const jurosCartPct = parseFloat(cfg.juros_cartao_pct !== undefined ? cfg.juros_cartao_pct : 2.5);
    const nCartMax     = parseInt(cfg.num_parcelas_cartao_max || 12);

    const cartaoRows = {};
    for (let n = 2; n <= nCartMax; n++) {
      const pmt = _parcelaCartao(total, n, jurosCartPct);
      const tot = Math.round(pmt * n * 100) / 100;
      const jur = Math.round((tot - total) * 100) / 100;
      cartaoRows[n] = [pmt, jur, tot];
    }

    const exito       = cfg.honorarios_exito || null;
    const tipoServico = cfg.tipo_servico || 'Contencioso Judicial';
    const modalidade  = cfg.modalidade   || 'Honorários Fixos';
    const tutelaLabel = tutela ? 'Sim' : 'Não';

    const urgNivel  = cfg.urgencia_nivel          || 'Nível ?/5';
    const urgDesc   = cfg.urgencia_desc           || 'Urgência';
    const espNivel  = cfg.especificidade_nivel    || 'Nível ?/5';
    const espDesc   = cfg.especificidade_desc     || 'Especificidade';
    const compNivel = cfg.complexidade_nivel      || 'Nível ?/5';
    const compDesc  = cfg.complexidade_desc       || 'Complexidade';

    const descricaoCaso = cfg.descricao_caso || '';
    const objetivos     = cfg.objetivos      || [];

    // ─── 1. Subtítulo ──────────────────────────────────────
    xml = xml.replace('>CONTENCIOSO JUDICIAL (PROCESSO JUDICIAL)<',
      '>' + tipoServico.toUpperCase() + '<');

    // ─── 2. Nome do cliente ────────────────────────────────
    xml = xml.replace('>Allana Duarte<', '>' + cfg.cliente + '<');

    // ─── 3. Tipo de serviço na tabela ──────────────────────
    xml = xml.replace('>Contencioso Judicial (Processo Judicial)<',
      '>' + tipoServico + '<');

    // ─── 4. Tutela/Liminar na tabela de identificação ──────
    const tutIdMarker = '>Tutela / Liminar<';
    const idxTutId = xml.indexOf(tutIdMarker);
    if (idxTutId !== -1) {
      const window1500 = xml.slice(idxTutId, idxTutId + 1500);
      let replaced = false;
      for (const oldVal of ['>Sim<', '>Não<']) {
        const idxVal = window1500.indexOf(oldVal);
        if (idxVal !== -1) {
          const absPos = idxTutId + idxVal;
          xml = xml.slice(0, absPos) + '>' + tutelaLabel + '<' + xml.slice(absPos + oldVal.length);
          replaced = true;
          break;
        }
      }
    }

    // ─── 5. Modalidade ─────────────────────────────────────
    xml = xml.replace('>Honorários Fixos + Êxito<', '>' + modalidade + '<');

    // ─── 6. Descrição do caso ──────────────────────────────
    const allanaFrag = 'Allana tinha uma união estável';
    const idxDesc = xml.indexOf(allanaFrag);
    if (idxDesc !== -1) {
      const tStart = xml.lastIndexOf('<w:t', idxDesc);
      const tEnd   = xml.indexOf('</w:t>', idxDesc) + 6;
      xml = xml.slice(0, tStart) + '<w:t>' + descricaoCaso + '</w:t>' + xml.slice(tEnd);
    }

    // ─── 7. Objetivos ──────────────────────────────────────
    const objLabel = '>Objetivo<';
    const idxObj = xml.indexOf(objLabel);
    if (idxObj !== -1 && objetivos.length > 0) {
      const pStart = xml.lastIndexOf('<w:p ', idxObj);
      const pEnd   = xml.indexOf('</w:p>', idxObj) + 6;
      const pXml   = xml.slice(pStart, pEnd);

      const colonPos   = pXml.indexOf('xml:space="preserve">: <');
      const colonClose = pXml.indexOf('</w:r>', colonPos) + 6;

      const newP = pXml.slice(0, colonClose) + _runsObjetivos(objetivos) + '</w:p>';
      xml = xml.slice(0, pStart) + newP + xml.slice(pEnd);
    }

    // ─── 8. Tabela de Análise – substituir valores ─────────
    xml = _replaceTextInRun(xml,
      'Nível 3/5 — Média (+10.0%)',
      urgNivel + ' — ' + urgDesc + ' ' + _pctLabel(urgPct)
    );
    xml = _replaceTextInRun(xml,
      'Nível 2/5 — Pouco específico (+7.5%)',
      espNivel + ' — ' + espDesc + ' ' + _pctLabel(espPct)
    );
    xml = _replaceTextInRun(xml,
      'Nível 4/5 — Complexo (+30.0%)',
      compNivel + ' — ' + compDesc + ' ' + _pctLabel(compPct)
    );
    xml = _replaceTextInRun(xml, '+47.5%', _pctBr(totalAjPct));

    // ─── 9. Tutela/Liminar na tabela de Análise ────────────
    if (tutela) {
      xml = _insertRowBefore(xml, '>Total de ajustes aplicados<',
        _row2col(
          'Tutela / Liminar',
          'Sim ' + _pctLabel(tutelaPct),
          '0A1B4C1',
          false, '222222'
        )
      );
    }

    // ─── 10. Tabela de Cálculo – substituir valores ────────
    xml = _replaceTextInRun(xml, 'R$ 5.208,98', _brl(valorBase));
    xml = _replaceTextInRun(xml,
      'Ajuste de urgência (+10.0%)',
      'Ajuste de urgência ' + _pctLabel(urgPct)
    );
    xml = _replaceTextInRun(xml, 'R$ 520,90', _brl(ajusteUrg));
    xml = _replaceTextInRun(xml,
      'Ajuste de especificidade (+7.5%)',
      'Ajuste de especificidade ' + _pctLabel(espPct)
    );
    xml = _replaceTextInRun(xml, 'R$ 390,67', _brl(ajusteEsp));
    xml = _replaceTextInRun(xml,
      'Ajuste de complexidade (+30.0%)',
      'Ajuste de complexidade ' + _pctLabel(compPct)
    );
    xml = _replaceTextInRun(xml, 'R$ 1.562,69', _brl(ajusteComp));
    xml = _replaceTextInRun(xml, 'R$ 7.683,25', _brl(valAjustado));

    // Taxa horária
    xml = _replaceTextInRun(xml, 'R$ 48,02/h', _brl(taxaH) + '/h');

    // Adicional horas
    const horasFmt = String(parseFloat(horas.toFixed(10))).replace('.', ',');
    xml = _replaceTextInRun(xml,
      'Adicional horas de análise prévia (2h × R$ 48,02)',
      'Adicional horas de análise prévia (' + horasFmt + 'h × ' + _brl(taxaH) + ')'
    );
    xml = _replaceTextInRun(xml, 'R$ 96,04', _brl(adicionalH));

    // ─── 11. Tutela/Liminar na tabela de Cálculo ───────────
    if (tutela) {
      xml = _insertRowBefore(xml, '>Valor base ajustado<',
        _row2col(
          'Ajuste tutela/liminar ' + _pctLabel(tutelaPct),
          _brl(ajusteTut),
          '0B2C5D2',
          false, '222222'
        )
      );
    }

    // ─── 12. Subtotal e ISS ────────────────────────────────
    if (issPct > 0) {
      xml = _insertRowAfter(xml, 'Adicional horas de análise prévia',
        _row2col(
          'Subtotal (antes de impostos)',
          _brl(subtotal), '0C3D7E1',
          true, '1B3A6B'
        )
      );
      const issLabel = 'ISS ' + issPct + '%';
      xml = _insertRowAfter(xml, 'Subtotal (antes de impostos)',
        _row2col(issLabel, _brl(issValor), '0C3D7E4', false, '222222')
      );
    }

    // ─── 13. Honorários de Êxito ───────────────────────────
    if (exito === null || exito === undefined) {
      xml = _removeRowContaining(xml, 'Honorários de êxito - 10%');
    } else {
      const exitoPctVal = exito.pct !== undefined ? exito.pct : 10;
      const exitoDesc   = exito.descricao || (exitoPctVal + '% sobre valores recuperados');
      xml = _replaceTextInRun(xml,
        'Honorários de êxito - 10%',
        'Honorários de êxito - ' + exitoPctVal + '%'
      );
      xml = _replaceTextInRun(xml,
        'Será apurado ao final da partilha de bens',
        exitoDesc
      );
    }

    // ─── 14. Banner / Total honorários (aparece 2x) ────────
    xml = xml.replaceAll('>R$ 7.779,29<', '>' + _brl(total) + '<');

    // ─── 15. Cartão À Vista ────────────────────────────────
    xml = xml.replaceAll('>R$ 7.156,95<', '>' + _brl(totalAvista) + '<');
    xml = xml.replaceAll('>R$ 622,34<',   '>' + _brl(economiaAv) + '<');
    const descAvFmt = descAvPct === Math.floor(descAvPct)
      ? String(Math.floor(descAvPct))
      : String(descAvPct);
    xml = xml.replaceAll('>8% de desconto<', '>' + descAvFmt + '% de desconto<');

    // ─── 16. Cartão Parcelado ──────────────────────────────
    xml = xml.replaceAll('>R$ 2.333,79<', '>' + _brl(entrada) + '<');
    xml = xml.replaceAll('>R$ 5.445,50<', '>' + _brl(saldo) + '<');
    xml = xml.replaceAll('>Até 8x de<',   '>' + nBoleto + 'x de<');
    xml = xml.replaceAll('>R$ 680,69<',   '>' + _brl(pmtBoleto) + '<');
    if (entPct !== 30.0) {
      const entFmt = entPct === Math.floor(entPct)
        ? String(Math.floor(entPct))
        : String(entPct);
      xml = xml.replaceAll(
        '>Entrada (30% do total em até 10 dias)<',
        '>Entrada (' + entFmt + '% do total em até 10 dias)<'
      );
    }

    // ─── 17. Tabela de Cartão de Crédito ───────────────────
    const OLD_CART = {
      2:  ['R$ 4.037,03', 'R$ 294,77',   'R$ 8.074,06'],
      3:  ['R$ 2.742,55', 'R$ 448,36',   'R$ 8.227,65'],
      4:  ['R$ 2.087,65', 'R$ 571,31',   'R$ 8.350,61'],
      6:  ['R$ 1.422,43', 'R$ 754,89',   'R$ 8.534,18'],
      8:  ['R$ 1.091,16', 'R$ 949,99',   'R$ 8.729,28'],
      10: ['R$ 890,22',   'R$ 1.123,91', 'R$ 8.903,20'],
      12: ['R$ 751,96',   'R$ 1.244,23', 'R$ 9.023,52'],
    };
    for (const [n, [op, oj, ot]] of Object.entries(OLD_CART)) {
      const ni = parseInt(n);
      if (cartaoRows[ni]) {
        const [pmt, jur, tot] = cartaoRows[ni];
        xml = _replaceTextInRun(xml, op, _brl(pmt));
        xml = _replaceTextInRun(xml, oj, _brl(jur));
        xml = _replaceTextInRun(xml, ot, _brl(tot));
      }
    }

    // Inserir linhas ímpares ausentes no template
    const NEW_IDS = { 5: '0E5F9A1', 7: '0F6A0B2', 9: '0A7B1C3', 11: '0B8C2D4' };
    const AFTER   = [[5, 4], [7, 6], [9, 8], [11, 10]];
    for (const [newN, afterN] of AFTER) {
      if (newN > nCartMax || !cartaoRows[newN]) continue;
      const [pmt, jur, tot] = cartaoRows[newN];
      xml = _insertRowAfter(xml, '>' + afterN + 'x<',
        _rowCartao(newN + 'x', _brl(pmt), _brl(jur), _brl(tot), NEW_IDS[newN])
      );
    }

    // 5. Salvar XML modificado de volta no zip
    zip.file('word/document.xml', xml);

    // 6. Gerar blob
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    // 7. Disparar download
    saveAs(blob, 'Proposta de Honorários - ' + cfg.cliente + '.docx');

  } catch (e) {
    console.error('[gerarPropostaDocx]', e);
    alert('Erro ao gerar a proposta: ' + e.message);
  }
}

// ─── Helpers de UI ─────────────────────────────────────────────

function buildPropostaCfg(extras) {
  const s = state;
  const c = s.calc;

  let modalidade;
  if (!s.honorariosExito) {
    modalidade = 'Honorários Fixos';
  } else if (s.modalidadeCausa === 'fixo_exito') {
    modalidade = 'Honorários Fixos + Êxito';
  } else if (s.modalidadeCausa === 'apenas_exito') {
    modalidade = 'Apenas Êxito';
  } else {
    modalidade = 'Fixos OU Êxito (o que for maior)';
  }

  return {
    cliente:                 s.nomeCliente,
    tipo_servico:            s.tipoServico.map(function(i) { return SERVICOS[i].title; }).join(', ') || 'Contencioso Judicial',
    tutela_liminar:          s.tutelaLiminar,
    modalidade:              modalidade,
    urgencia_nivel:          'Nível ' + s.urgencia + '/5',
    urgencia_desc:           LEVEL_LABELS[s.urgencia],
    urgencia_pct:            PCT_URGENCIA[s.urgencia],
    especificidade_nivel:    'Nível ' + s.especificidade + '/5',
    especificidade_desc:     LEVEL_LABELS[s.especificidade],
    especificidade_pct:      PCT_ESPECIFIC[s.especificidade],
    complexidade_nivel:      'Nível ' + s.complexidade + '/5',
    complexidade_desc:       LEVEL_LABELS[s.complexidade],
    complexidade_pct:        PCT_COMPLEXIDADE[s.complexidade],
    valor_base:              s.valorBase,
    taxa_horaria:            c.taxaHoraria,
    horas_analise:           s.horasAnalise,
    iss_pct:                 CFG.iss,
    desconto_avista_pct:     CFG.avista,
    entrada_pct:             CFG.entrada,
    num_parcelas_boleto:     c.nParcelas,
    juros_cartao_pct:        CFG.cartao,
    num_parcelas_cartao_max: Math.max.apply(null, c.ccOptions.map(function(o) { return o.n; })),
    descricao_caso:          extras.descricaoCaso,
    objetivos:               extras.objetivos,
    honorarios_exito:        s.honorariosExito
      ? { pct: s.percentualExito, descricao: s.percentualExito + '% sobre valores recuperados' }
      : null,
  };
}

function abrirPropostaForm() {
  document.getElementById('proposta-descricao').value = '';
  document.getElementById('proposta-objetivos').value = '';
  document.getElementById('propostaFormModal').classList.remove('hidden');
}

function fecharPropostaForm() {
  document.getElementById('propostaFormModal').classList.add('hidden');
}

async function confirmarGerarProposta() {
  const descricao  = document.getElementById('proposta-descricao').value.trim();
  const objetivos  = document.getElementById('proposta-objetivos').value
    .split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });

  if (!descricao) { alert('Informe a descrição do caso.'); return; }
  if (objetivos.length < 2) { alert('Informe pelo menos 2 objetivos.'); return; }

  fecharPropostaForm();

  const btn = document.getElementById('btn-gerar-docx');
  if (btn) { btn.textContent = '⏳ Gerando...'; btn.disabled = true; }

  try {
    await gerarPropostaDocx(buildPropostaCfg({ descricaoCaso: descricao, objetivos: objetivos }));
    const btnCopy = document.getElementById('btn-copy-text');
    if (btnCopy) {
      const orig = btnCopy.textContent;
      btnCopy.textContent = '✓ Proposta gerada!';
      setTimeout(function() { if (btnCopy) btnCopy.textContent = orig; }, 3000);
    }
  } finally {
    if (btn) { btn.textContent = '📄 Gerar documento'; btn.disabled = false; }
  }
}
