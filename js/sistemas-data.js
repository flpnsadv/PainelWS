/* ══════════════════════════════════════════════════════════════════
   SISTEMAS ELETRÔNICOS — catálogo de tribunais e sistemas
══════════════════════════════════════════════════════════════════ */

const SISTEMAS_TRIBUNAIS = [
  // Santa Catarina (base do escritório)
  { slug: 'eproc-tjsc-1g', nome: 'eproc TJSC — 1º Grau', uf: 'SC', tipo: 'Justiça Estadual', url: 'https://eproc1g.tjsc.jus.br/eproc/' },
  { slug: 'eproc-tjsc-2g', nome: 'eproc TJSC — 2º Grau', uf: 'SC', tipo: 'Justiça Estadual', url: 'https://eproc2g.tjsc.jus.br/eproc/' },
  { slug: 'tjsc-portal', nome: 'Portal TJSC', uf: 'SC', tipo: 'Justiça Estadual', url: 'https://www.tjsc.jus.br/' },

  // Federal — Sul
  { slug: 'eproc-trf4-1g', nome: 'eproc JFSC / TRF4 — 1º Grau', uf: 'Sul', tipo: 'Justiça Federal', url: 'https://eproc.jfsc.jus.br/eprocV2/' },
  { slug: 'eproc-trf4-2g', nome: 'eproc TRF4 — 2º Grau', uf: 'Sul', tipo: 'Justiça Federal', url: 'https://eproc.trf4.jus.br/eproc2trf4/' },

  // Trabalhista
  { slug: 'pje-trt12', nome: 'PJe TRT12 (SC)', uf: 'SC', tipo: 'Justiça do Trabalho', url: 'https://pje.trt12.jus.br/primeirograu/login.seam' },
  { slug: 'pje-tst', nome: 'PJe TST', uf: 'BR', tipo: 'Justiça do Trabalho', url: 'https://pje.tst.jus.br/tst/login.seam' },

  // Superiores
  { slug: 'stj', nome: 'STJ — Peticionamento', uf: 'BR', tipo: 'Tribunal Superior', url: 'https://www.stj.jus.br/sites/portalp/Processos/Peticionamento-eletronico' },
  { slug: 'stf', nome: 'STF — Peticionamento', uf: 'BR', tipo: 'Tribunal Superior', url: 'https://sistemas.stf.jus.br/peticionamento/' },

  // Estaduais — vizinhos e comuns
  { slug: 'eproc-tjrs', nome: 'eproc TJRS', uf: 'RS', tipo: 'Justiça Estadual', url: 'https://eproc1g.tjrs.jus.br/eproc/' },
  { slug: 'projudi-tjpr', nome: 'Projudi TJPR', uf: 'PR', tipo: 'Justiça Estadual', url: 'https://projudi.tjpr.jus.br/projudi/' },
  { slug: 'esaj-tjsp', nome: 'e-SAJ TJSP', uf: 'SP', tipo: 'Justiça Estadual', url: 'https://esaj.tjsp.jus.br/esaj/portal.do' },
  { slug: 'pje-tjmg', nome: 'PJe TJMG', uf: 'MG', tipo: 'Justiça Estadual', url: 'https://pje.tjmg.jus.br/pje/login.seam' },
  { slug: 'pje-tjrj', nome: 'PJe TJRJ', uf: 'RJ', tipo: 'Justiça Estadual', url: 'https://tjrj.pje.jus.br/1g/login.seam' },

  // Nacionais / serviços
  { slug: 'djen', nome: 'DJEN — Diário de Justiça Eletrônico Nacional', uf: 'BR', tipo: 'Serviço', url: 'https://comunica.pje.jus.br/' },
  { slug: 'pje-cnj', nome: 'Portal PJe — CNJ', uf: 'BR', tipo: 'Serviço', url: 'https://www.pje.jus.br/navegador/' },
  { slug: 'jus-br', nome: 'Portal Jus.br (CNJ)', uf: 'BR', tipo: 'Serviço', url: 'https://www.jus.br/' },
  { slug: 'consulta-inss', nome: 'Meu INSS', uf: 'BR', tipo: 'Serviço', url: 'https://meu.inss.gov.br/' },
  { slug: 'sisbajud', nome: 'SISBAJUD', uf: 'BR', tipo: 'Serviço', url: 'https://sisbajud.cnj.jus.br/' },
  { slug: 'cnj-datajud', nome: 'Consulta processual unificada (CNJ)', uf: 'BR', tipo: 'Serviço', url: 'https://www.cnj.jus.br/pjecnj/ConsultaPublica/listView.seam' },
  { slug: 'oab-sc', nome: 'OAB/SC', uf: 'SC', tipo: 'Serviço', url: 'https://www.oab-sc.org.br/' },
  { slug: 'sgs-bacen', nome: 'SGS — Séries Temporais BACEN', uf: 'BR', tipo: 'Serviço', url: 'https://www3.bcb.gov.br/sgspub/localizarseries/localizarSeries.do?method=prepararTelaLocalizarSeries' },
];
