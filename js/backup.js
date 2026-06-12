/* ══════════════════════════════════════════════════════════════════
   BACKUP — exporta todos os dados do escritório em JSON
══════════════════════════════════════════════════════════════════ */

async function backupGerar() {
  if (!window._sb || !officeId()) { alert('Faça login primeiro.'); return; }
  const btn = document.getElementById('btn-backup');
  if (btn) { btn.disabled = true; btn.textContent = 'Gerando backup…'; }
  try {
    const tabelas = ['clientes', 'cliente_interacoes', 'casos', 'andamentos', 'tarefas',
      'intimacoes', 'leads', 'comunicados', 'propostas', 'bacen_analises', 'configuracoes'];
    const dump = {
      versao: 1,
      gerado_em: new Date().toISOString(),
      office: { id: officeId(), nome: window._office.nome },
      tabelas: {},
    };
    for (const t of tabelas) {
      const { data, error } = await window._sb.from(t).select('*').eq('office_id', officeId());
      if (error) throw new Error(t + ': ' + error.message);
      dump.tabelas[t] = data || [];
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rito-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch (err) {
    console.error('backupGerar:', err);
    alert('Erro ao gerar backup: ' + (err.message || err));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Gerar backup (JSON)'; }
  }
}
