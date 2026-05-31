#!/usr/bin/env python3
"""
Gerador de Proposta de Honorários
Windsor e Serrão Advogados

Uso: python3 gerar_proposta.py dados_cliente.json
"""

import json
import sys
import os
import re
import shutil
import zipfile
from datetime import datetime

# ─────────────────────────────────────────
#  FORMATAÇÃO
# ─────────────────────────────────────────

def brl(value):
    """Formata valor como moeda brasileira: R$ 1.234,56"""
    formatted = f"{abs(value):,.2f}"
    formatted = formatted.replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {formatted}"

def pct_br(value):
    """Formata percentual com separador decimal brasileiro: +52,5%"""
    s = f"{value:.1f}".replace(".", ",")
    return f"+{s}%"

def pct_label(value):
    """Para rótulos de ajuste: (+7,5%)"""
    s = f"{value:.1f}".replace(".", ",")
    return f"(+{s}%)"

def parcela_cartao(total, n, taxa_mensal_pct):
    """
    Fórmula de parcelamento do escritório:
    PMT = (P / n) × (1 + r)^n
    """
    r = taxa_mensal_pct / 100
    pmt = (total / n) * ((1 + r) ** n)
    return round(pmt, 2)

# ─────────────────────────────────────────
#  MANIPULAÇÃO DE XML (sem lxml)
# ─────────────────────────────────────────

def find_row_containing(xml, search_text):
    """
    Encontra o <w:tr...>...</w:tr> que contém 'search_text'.
    Retorna (tr_start, tr_end) ou (-1, -1) se não encontrado.
    """
    idx = xml.find(search_text)
    if idx == -1:
        return -1, -1
    tr_start = xml.rfind('<w:tr ', 0, idx)
    if tr_start == -1:
        return -1, -1
    tr_end = xml.find('</w:tr>', idx)
    if tr_end == -1:
        return -1, -1
    tr_end += len('</w:tr>')
    return tr_start, tr_end

def insert_row_before(xml, search_text, new_row_xml):
    """Insere new_row_xml antes da linha (<w:tr>) que contém search_text."""
    tr_start, tr_end = find_row_containing(xml, search_text)
    if tr_start == -1:
        print(f"[AVISO] Não encontrou linha com '{search_text}' para inserção")
        return xml
    return xml[:tr_start] + new_row_xml + '\n      ' + xml[tr_start:]

def insert_row_after(xml, search_text, new_row_xml):
    """Insere new_row_xml após a linha (<w:tr>) que contém search_text."""
    tr_start, tr_end = find_row_containing(xml, search_text)
    if tr_start == -1:
        print(f"[AVISO] Não encontrou linha com '{search_text}' para inserção")
        return xml
    return xml[:tr_end] + '\n      ' + new_row_xml + xml[tr_end:]

def remove_row_containing(xml, search_text):
    """Remove o <w:tr>...</w:tr> que contém search_text."""
    tr_start, tr_end = find_row_containing(xml, search_text)
    if tr_start == -1:
        print(f"[AVISO] Não encontrou linha com '{search_text}' para remoção")
        return xml
    return xml[:tr_start] + xml[tr_end:]

def replace_text_in_run(xml, old_text, new_text, count=1):
    """Substitui texto dentro de elementos <w:t>...</w:t>."""
    return xml.replace(f'>{old_text}<', f'>{new_text}<', count)

# ─────────────────────────────────────────
#  GERADORES DE XML
# ─────────────────────────────────────────

def row_2col(label, valor, para_id, bold_valor=False, color_valor="222222"):
    """Gera uma linha de 2 colunas para tabelas de análise/cálculo."""
    bold = "<w:b/><w:bCs/>" if bold_valor else ""
    return (
        f'<w:tr w:rsidR="002065EE" w:rsidRPr="004939BE" '
        f'w14:paraId="{para_id}A" w14:textId="77777777">\n'
        f'        <w:tc>\n'
        f'          <w:tcPr>\n'
        f'            <w:tcW w:w="5400" w:type="dxa"/>\n'
        f'            <w:tcBorders>\n'
        f'              <w:top w:val="nil"/><w:left w:val="nil"/>\n'
        f'              <w:bottom w:val="single" w:sz="1" w:space="0" w:color="CCCCCC"/>\n'
        f'              <w:right w:val="nil"/>\n'
        f'            </w:tcBorders>\n'
        f'            <w:tcMar>\n'
        f'              <w:top w:w="60" w:type="dxa"/><w:left w:w="0" w:type="dxa"/>\n'
        f'              <w:bottom w:w="60" w:type="dxa"/><w:right w:w="80" w:type="dxa"/>\n'
        f'            </w:tcMar>\n'
        f'          </w:tcPr>\n'
        f'          <w:p w14:paraId="{para_id}B" w14:textId="77777777" '
        f'w:rsidR="002065EE" w:rsidRPr="004939BE" w:rsidRDefault="005F3371">\n'
        f'            <w:pPr><w:rPr><w:rFonts w:ascii="Nunito" w:hAnsi="Nunito"/>'
        f'</w:rPr></w:pPr>\n'
        f'            <w:r><w:rPr>\n'
        f'              <w:rFonts w:ascii="Nunito" w:hAnsi="Nunito"/>\n'
        f'              <w:color w:val="444444"/>\n'
        f'              <w:sz w:val="20"/><w:szCs w:val="20"/>\n'
        f'            </w:rPr><w:t>{label}</w:t></w:r>\n'
        f'          </w:p>\n'
        f'        </w:tc>\n'
        f'        <w:tc>\n'
        f'          <w:tcPr>\n'
        f'            <w:tcW w:w="3960" w:type="dxa"/>\n'
        f'            <w:tcBorders>\n'
        f'              <w:top w:val="nil"/><w:left w:val="nil"/>\n'
        f'              <w:bottom w:val="single" w:sz="1" w:space="0" w:color="CCCCCC"/>\n'
        f'              <w:right w:val="nil"/>\n'
        f'            </w:tcBorders>\n'
        f'            <w:tcMar>\n'
        f'              <w:top w:w="60" w:type="dxa"/><w:left w:w="80" w:type="dxa"/>\n'
        f'              <w:bottom w:w="60" w:type="dxa"/><w:right w:w="0" w:type="dxa"/>\n'
        f'            </w:tcMar>\n'
        f'          </w:tcPr>\n'
        f'          <w:p w14:paraId="{para_id}C" w14:textId="77777777" '
        f'w:rsidR="002065EE" w:rsidRPr="004939BE" w:rsidRDefault="005F3371">\n'
        f'            <w:pPr><w:jc w:val="right"/>'
        f'<w:rPr><w:rFonts w:ascii="Nunito" w:hAnsi="Nunito"/></w:rPr></w:pPr>\n'
        f'            <w:r><w:rPr>\n'
        f'              <w:rFonts w:ascii="Nunito" w:hAnsi="Nunito"/>\n'
        f'              {bold}\n'
        f'              <w:color w:val="{color_valor}"/>\n'
        f'              <w:sz w:val="20"/><w:szCs w:val="20"/>\n'
        f'            </w:rPr><w:t>{valor}</w:t></w:r>\n'
        f'          </w:p>\n'
        f'        </w:tc>\n'
        f'      </w:tr>'
    )

def row_cartao(nx_label, pmt_str, juros_str, total_str, para_id):
    """Gera linha de cartão de crédito (4 colunas)."""
    def cell(width, borders, fill, jc, color, text, pid, bold=False):
        b = "<w:b/><w:bCs/>" if bold else ""
        return (
            f'<w:tc><w:tcPr><w:tcW w:w="{width}" w:type="dxa"/>'
            f'<w:tcBorders>{borders}</w:tcBorders>'
            f'<w:shd w:val="clear" w:color="auto" w:fill="{fill}"/>'
            f'<w:tcMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/>'
            f'<w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>'
            f'</w:tcPr>'
            f'<w:p w14:paraId="{pid}" w14:textId="77777777" w:rsidR="002065EE" '
            f'w:rsidRPr="004939BE" w:rsidRDefault="00644211">'
            f'<w:pPr><w:jc w:val="{jc}"/>'
            f'<w:rPr><w:rFonts w:ascii="Nunito" w:hAnsi="Nunito"/></w:rPr></w:pPr>'
            f'<w:r><w:rPr><w:rFonts w:ascii="Nunito" w:hAnsi="Nunito"/>{b}'
            f'<w:color w:val="{color}"/>'
            f'<w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr>'
            f'<w:t>{text}</w:t></w:r></w:p></w:tc>'
        )
    rb = '<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
    lb = '<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
    row = (
        f'<w:tr w:rsidR="002065EE" w:rsidRPr="004939BE" '
        f'w14:paraId="{para_id}0" w14:textId="77777777" w:rsidTr="006667C2">'
        + cell(1440, rb, 'FBFBFB', 'center', '222222', nx_label, f'{para_id}1', bold=True)
        + cell(2640, lb+rb, 'FBFBFB', 'center', '222222', pmt_str, f'{para_id}2')
        + cell(2640, lb+rb, 'FBFBFB', 'center', '854F0B', juros_str, f'{para_id}3')
        + cell(2640, lb, 'FBFBFB', 'center', '222222', total_str, f'{para_id}4')
        + '</w:tr>'
    )
    return row

def runs_objetivos(objetivos):
    """
    Gera os <w:r> para a lista de objetivos dentro do parágrafo 'Objetivo'.
    Formato: item1; item2; ...; e itemN.
    """
    def bold(texto):
        return (
            '<w:r><w:rPr>'
            '<w:rFonts w:ascii="Nunito" w:hAnsi="Nunito"/>'
            '<w:b/><w:bCs/>'
            '<w:color w:val="333333"/>'
            f'</w:rPr><w:t>{texto}</w:t></w:r>'
        )
    def normal(texto):
        return (
            '<w:r><w:rPr>'
            '<w:rFonts w:ascii="Nunito" w:hAnsi="Nunito"/>'
            '<w:color w:val="333333"/>'
            f'</w:rPr><w:t xml:space="preserve">{texto}</w:t></w:r>'
        )
    parts = []
    for i, obj in enumerate(objetivos):
        parts.append(bold(obj))
        if i < len(objetivos) - 2:
            parts.append(normal('; '))
        elif i < len(objetivos) - 1:
            parts.append(normal('; e '))
    parts.append(normal('.'))
    return ''.join(parts)

# ─────────────────────────────────────────
#  UNPACK / PACK
# ─────────────────────────────────────────

def unpack_docx(docx_path, out_dir):
    if os.path.exists(out_dir):
        shutil.rmtree(out_dir)
    with zipfile.ZipFile(docx_path, 'r') as z:
        z.extractall(out_dir)

def pack_docx(in_dir, out_path):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with zipfile.ZipFile(out_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        ct_path = os.path.join(in_dir, '[Content_Types].xml')
        if os.path.exists(ct_path):
            zf.write(ct_path, '[Content_Types].xml')
        for root, dirs, files in os.walk(in_dir):
            dirs.sort()
            files.sort()
            for file in files:
                full_path = os.path.join(root, file)
                arc_name = os.path.relpath(full_path, in_dir)
                if arc_name == '[Content_Types].xml':
                    continue
                zf.write(full_path, arc_name)

# ─────────────────────────────────────────
#  LÓGICA PRINCIPAL
# ─────────────────────────────────────────

def localizar_template():
    """Tenta localizar o arquivo MODELO.docx."""
    candidatos = [
        os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            '..', '..', '..', 'mnt', 'Proposta',
            'MODELO_script.docx', 'Proposta de Honorarios - MODELO.docx'
        ),
        '/sessions/optimistic-trusting-fermat/mnt/Proposta/MODELO_script.docx',
        '/sessions/optimistic-trusting-fermat/mnt/Proposta/Proposta de Honorarios - MODELO.docx',
    ]
    for p in candidatos:
        p = os.path.normpath(p)
        if os.path.exists(p):
            return p
    raise FileNotFoundError(
        "Template 'MODELO_script.docx', 'Proposta de Honorarios - MODELO.docx' não encontrado.\n"
        f"Procurado em: {[os.path.normpath(c) for c in candidatos]}"
    )

def gerar_proposta(cfg):
    """
    Gera a proposta de honorários a partir de um dicionário de configuração.
    Retorna o caminho do .docx gerado.
    """
    template_path = localizar_template()
    workspace     = os.path.dirname(template_path)
    cliente       = cfg['cliente']
    output_path   = os.path.join(workspace, f'Proposta de Honorários - {cliente}.docx')

    # ─── Cálculos ────────────────────────────────────────────────
    valor_base   = float(cfg['valor_base'])
    urg_pct      = float(cfg.get('urgencia_pct', 0))
    esp_pct      = float(cfg.get('especificidade_pct', 0))
    comp_pct     = float(cfg.get('complexidade_pct', 0))
    tutela       = bool(cfg.get('tutela_liminar', False))
    tutela_pct   = 25.0 if tutela else 0.0
    total_aj_pct = urg_pct + esp_pct + comp_pct + tutela_pct

    ajuste_urg   = round(valor_base * urg_pct   / 100, 2)
    ajuste_esp   = round(valor_base * esp_pct   / 100, 2)
    ajuste_comp  = round(valor_base * comp_pct  / 100, 2)
    ajuste_tut   = round(valor_base * tutela_pct / 100, 2)
    val_ajustado = round(valor_base + ajuste_urg + ajuste_esp + ajuste_comp + ajuste_tut, 2)

    taxa_h  = float(cfg.get('taxa_horaria', 0))
    horas   = float(cfg.get('horas_analise', 0))
    adicional_h = round(taxa_h * horas, 2)

    iss_pct   = float(cfg.get('iss_pct', 0))
    subtotal  = round(val_ajustado + adicional_h, 2)
    iss_valor = round(subtotal * iss_pct / 100, 2) if iss_pct > 0 else 0.0
    total     = round(subtotal + iss_valor, 2)

    desc_av_pct  = float(cfg.get('desconto_avista_pct', 8.0))
    total_avista = round(total * (1 - desc_av_pct / 100), 2)
    economia_av  = round(total - total_avista, 2)

    ent_pct      = float(cfg.get('entrada_pct', 30.0))
    entrada      = round(total * ent_pct / 100, 2)
    saldo        = round(total - entrada, 2)
    n_boleto     = int(cfg.get('num_parcelas_boleto', 6))
    pmt_boleto   = round(saldo / n_boleto, 2)

    juros_cart_pct = float(cfg.get('juros_cartao_pct', 2.5))
    n_cart_max     = int(cfg.get('num_parcelas_cartao_max', 12))

    cartao_rows = {}
    for n in range(2, n_cart_max + 1):
        pmt = parcela_cartao(total, n, juros_cart_pct)
        tot = round(pmt * n, 2)
        jur = round(tot - total, 2)
        cartao_rows[n] = (pmt, jur, tot)

    exito       = cfg.get('honorarios_exito', None)
    tipo_servico = cfg.get('tipo_servico', 'Contencioso Judicial')
    modalidade   = cfg.get('modalidade', 'Honorários Fixos')
    tutela_label = 'Sim' if tutela else 'Não'

    urg_nivel  = cfg.get('urgencia_nivel', 'Nível ?/5')
    urg_desc   = cfg.get('urgencia_desc',  'Urgência')
    esp_nivel  = cfg.get('especificidade_nivel', 'Nível ?/5')
    esp_desc   = cfg.get('especificidade_desc',  'Especificidade')
    comp_nivel = cfg.get('complexidade_nivel', 'Nível ?/5')
    comp_desc  = cfg.get('complexidade_desc',  'Complexidade')

    descricao_caso = cfg.get('descricao_caso', '')
    objetivos      = cfg.get('objetivos', [])

    # ─── Desempacotar template ───────────────────────────────────
    tmp_dir = f'/tmp/proposta_{re.sub(r"[^a-zA-Z0-9]", "_", cliente.lower())}'
    print(f"Desempacotando template...")
    unpack_docx(template_path, tmp_dir)

    doc_path = os.path.join(tmp_dir, 'word', 'document.xml')
    with open(doc_path, 'r', encoding='utf-8') as f:
        xml = f.read()

    # ─── 1. Subtítulo ────────────────────────────────────────────
    xml = xml.replace(
        '>CONTENCIOSO JUDICIAL (PROCESSO JUDICIAL)<',
        f'>{tipo_servico.upper()}<', 1
    )

    # ─── 2. Nome do cliente ──────────────────────────────────────
    xml = xml.replace('>Allana Duarte<', f'>{cliente}<', 1)

    # ─── 3. Tipo de serviço na tabela ────────────────────────────
    xml = xml.replace(
        '>Contencioso Judicial (Processo Judicial)<',
        f'>{tipo_servico}<', 1
    )

    # ─── 4. Tutela/Liminar na tabela de identificação ────────────
    # A estrutura tem: "Tutela / Liminar" na esquerda, "Sim" na direita.
    # Para evitar substituir outros "Sim", buscar pelo contexto:
    tut_id_marker = '>Tutela / Liminar<'
    idx_tut_id = xml.find(tut_id_marker)
    if idx_tut_id != -1:
        # Próximo "Sim" ou "Não" dentro de 1500 chars
        window = xml[idx_tut_id:idx_tut_id+1500]
        for old_val in ['>Sim<', '>Não<']:
            idx_val = window.find(old_val)
            if idx_val != -1:
                abs_pos = idx_tut_id + idx_val
                xml = xml[:abs_pos] + f'>{tutela_label}<' + xml[abs_pos + len(old_val):]
                break

    # ─── 5. Modalidade ───────────────────────────────────────────
    xml = xml.replace('>Honorários Fixos + Êxito<', f'>{modalidade}<', 1)

    # ─── 6. Descrição do caso ────────────────────────────────────
    allana_frag = 'Allana tinha uma união estável'
    idx_desc = xml.find(allana_frag)
    if idx_desc != -1:
        t_start = xml.rfind('<w:t', 0, idx_desc)
        t_end   = xml.find('</w:t>', idx_desc) + len('</w:t>')
        xml = xml[:t_start] + f'<w:t>{descricao_caso}</w:t>' + xml[t_end:]

    # ─── 7. Objetivos ────────────────────────────────────────────
    obj_label = '>Objetivo<'
    idx_obj = xml.find(obj_label)
    if idx_obj != -1 and objetivos:
        p_start = xml.rfind('<w:p ', 0, idx_obj)
        p_end   = xml.find('</w:p>', idx_obj) + len('</w:p>')
        p_xml   = xml[p_start:p_end]

        # Encontrar final do run ": " (logo após "Objetivo")
        colon_pos   = p_xml.find('xml:space="preserve">: <')
        colon_close = p_xml.find('</w:r>', colon_pos) + len('</w:r>')

        new_p = p_xml[:colon_close] + runs_objetivos(objetivos) + '</w:p>'
        xml = xml[:p_start] + new_p + xml[p_end:]

    # ─── 8. Tabela de Análise – substituir valores ───────────────
    xml = replace_text_in_run(xml,
        f'Nível 3/5 \u2014 Média (+10.0%)',
        f'{urg_nivel} \u2014 {urg_desc} {pct_label(urg_pct)}'
    )
    xml = replace_text_in_run(xml,
        f'Nível 2/5 \u2014 Pouco específico (+7.5%)',
        f'{esp_nivel} \u2014 {esp_desc} {pct_label(esp_pct)}'
    )
    xml = replace_text_in_run(xml,
        f'Nível 4/5 \u2014 Complexo (+30.0%)',
        f'{comp_nivel} \u2014 {comp_desc} {pct_label(comp_pct)}'
    )
    xml = replace_text_in_run(xml, '+47.5%', pct_br(total_aj_pct))

    # ─── 9. Tutela/Liminar na tabela de Análise ──────────────────
    if tutela:
        xml = insert_row_before(xml, '>Total de ajustes aplicados<',
            row_2col(
                'Tutela / Liminar',
                f'Sim {pct_label(tutela_pct)}',
                '0A1B4C1',
                bold_valor=False, color_valor='222222'
            )
        )

    # ─── 10. Tabela de Cálculo – substituir valores ──────────────
    xml = replace_text_in_run(xml, 'R$ 5.208,98', brl(valor_base), 1)
    xml = replace_text_in_run(xml,
        'Ajuste de urgência (+10.0%)',
        f'Ajuste de urgência {pct_label(urg_pct)}', 1
    )
    xml = replace_text_in_run(xml, 'R$ 520,90', brl(ajuste_urg), 1)
    xml = replace_text_in_run(xml,
        'Ajuste de especificidade (+7.5%)',
        f'Ajuste de especificidade {pct_label(esp_pct)}', 1
    )
    xml = replace_text_in_run(xml, 'R$ 390,67', brl(ajuste_esp), 1)
    xml = replace_text_in_run(xml,
        'Ajuste de complexidade (+30.0%)',
        f'Ajuste de complexidade {pct_label(comp_pct)}', 1
    )
    xml = replace_text_in_run(xml, 'R$ 1.562,69', brl(ajuste_comp), 1)
    xml = replace_text_in_run(xml, 'R$ 7.683,25', brl(val_ajustado), 1)

    # Taxa horária
    xml = replace_text_in_run(xml, 'R$ 48,02/h', f'{brl(taxa_h)}/h'.replace('R$ ', 'R$ '), 1)

    # Adicional horas
    horas_fmt = f"{horas:g}".replace('.', ',')
    xml = replace_text_in_run(xml,
        f'Adicional horas de análise prévia (2h \u00d7 R$ 48,02)',
        f'Adicional horas de análise prévia ({horas_fmt}h \u00d7 {brl(taxa_h)})', 1
    )
    xml = replace_text_in_run(xml, 'R$ 96,04', brl(adicional_h), 1)

    # ─── 11. Tutela/Liminar na tabela de Cálculo ─────────────────
    if tutela:
        xml = insert_row_before(xml, '>Valor base ajustado<',
            row_2col(
                f'Ajuste tutela/liminar {pct_label(tutela_pct)}',
                brl(ajuste_tut),
                '0B2C5D2',
                bold_valor=False, color_valor='222222'
            )
        )

    # ─── 12. Subtotal e ISS (após Adicional horas) ───────────────
    if iss_pct > 0:
        # Inserir Subtotal após linha de "Adicional horas de análise prévia"
        xml = insert_row_after(xml, 'Adicional horas de análise prévia',
            row_2col(
                'Subtotal (antes de impostos)',
                brl(subtotal), '0C3D7E1',
                bold_valor=True, color_valor='1B3A6B'
            )
        )
        iss_label = f'ISS {str(iss_pct).rstrip("0").rstrip(".")}%'
        xml = insert_row_after(xml, 'Subtotal (antes de impostos)',
            row_2col(
                iss_label, brl(iss_valor), '0C3D7E4',
                bold_valor=False, color_valor='222222'
            )
        )

    # ─── 13. Honorários de Êxito ─────────────────────────────────
    if exito is None:
        xml = remove_row_containing(xml, 'Honorários de êxito - 10%')
    else:
        exito_pct_val = exito.get('pct', 10)
        exito_desc    = exito.get('descricao', f'{exito_pct_val}% sobre valores recuperados')
        xml = replace_text_in_run(xml,
            'Honorários de êxito - 10%',
            f'Honorários de êxito - {exito_pct_val}%', 1
        )
        xml = replace_text_in_run(xml,
            'Será apurado ao final da partilha de bens',
            exito_desc, 1
        )

    # ─── 14. Banner / Total honorários ───────────────────────────
    # Aparece 2x (Choice + Fallback)
    xml = xml.replace('>R$ 7.779,29<', f'>{brl(total)}<')

    # ─── 15. Cartão À Vista ──────────────────────────────────────
    # Valor com desconto (2x), Economia (4x), % desconto (4x)
    xml = xml.replace('>R$ 7.156,95<', f'>{brl(total_avista)}<')
    xml = xml.replace('>R$ 622,34<',   f'>{brl(economia_av)}<')
    desc_av_fmt = str(int(desc_av_pct)) if desc_av_pct == int(desc_av_pct) else str(desc_av_pct)
    xml = xml.replace('>8% de desconto<', f'>{desc_av_fmt}% de desconto<')

    # ─── 16. Cartão Parcelado ────────────────────────────────────
    xml = xml.replace('>R$ 2.333,79<', f'>{brl(entrada)}<')
    xml = xml.replace('>R$ 5.445,50<', f'>{brl(saldo)}<')
    xml = xml.replace('>Até 8x de<',   f'>{n_boleto}x de<')
    xml = xml.replace('>R$ 680,69<',   f'>{brl(pmt_boleto)}<')
    if ent_pct != 30.0:
        ent_fmt = str(int(ent_pct)) if ent_pct == int(ent_pct) else str(ent_pct)
        xml = xml.replace(
            '>Entrada (30% do total em até 10 dias)<',
            f'>Entrada ({ent_fmt}% do total em até 10 dias)<'
        )

    # ─── 17. Tabela de Cartão de Crédito ─────────────────────────
    # Valores do template (Allana)
    OLD_CART = {
        2:  ('R$ 4.037,03', 'R$ 294,77',   'R$ 8.074,06'),
        3:  ('R$ 2.742,55', 'R$ 448,36',   'R$ 8.227,65'),
        4:  ('R$ 2.087,65', 'R$ 571,31',   'R$ 8.350,61'),
        6:  ('R$ 1.422,43', 'R$ 754,89',   'R$ 8.534,18'),
        8:  ('R$ 1.091,16', 'R$ 949,99',   'R$ 8.729,28'),
        10: ('R$ 890,22',   'R$ 1.123,91', 'R$ 8.903,20'),
        12: ('R$ 751,96',   'R$ 1.244,23', 'R$ 9.023,52'),
    }
    for n, (op, oj, ot) in OLD_CART.items():
        if n in cartao_rows:
            pmt, jur, tot = cartao_rows[n]
            xml = replace_text_in_run(xml, op, brl(pmt), 1)
            xml = replace_text_in_run(xml, oj, brl(jur), 1)
            xml = replace_text_in_run(xml, ot, brl(tot), 1)

    # Inserir linhas faltantes: 5x após 4x, 7x após 6x, 9x após 8x, 11x após 10x
    NEW_IDS  = {5: '0E5F9A1', 7: '0F6A0B2', 9: '0A7B1C3', 11: '0B8C2D4'}
    AFTER    = {5: 4, 7: 6, 9: 8, 11: 10}
    for new_n, after_n in sorted(AFTER.items()):
        if new_n > n_cart_max or new_n not in cartao_rows:
            continue
        pmt, jur, tot = cartao_rows[new_n]
        xml = insert_row_after(xml, f'>{after_n}x<',
            row_cartao(f'{new_n}x', brl(pmt), brl(jur), brl(tot), NEW_IDS[new_n])
        )

    # ─── Salvar e reempacotar ─────────────────────────────────────
    with open(doc_path, 'w', encoding='utf-8') as f:
        f.write(xml)

    print(f"Salvando proposta...")
    pack_docx(tmp_dir, output_path)
    shutil.rmtree(tmp_dir)
    print(f"✓ Proposta gerada: {output_path}")
    return output_path


def main():
    if len(sys.argv) < 2:
        print("Uso: python3 gerar_proposta.py dados_cliente.json")
        sys.exit(1)
    with open(sys.argv[1], encoding='utf-8') as f:
        cfg = json.load(f)
    gerar_proposta(cfg)


if __name__ == '__main__':
    main()
