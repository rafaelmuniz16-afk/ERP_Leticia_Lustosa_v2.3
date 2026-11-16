/* Íris | Revelio F05 — apenas janela de consulta e título VISUAL.
 * Não faz fetch, gravação, leitura de registros, mudanças de ano nem de memória. */
(() => {
  'use strict';
  function mount() {
    // O título de aba é atualizado sem alterar o bind()/ano operacional.
    window.ERPIdentity?.applyPublicIdentity();
    const modal = document.getElementById('revelioArchive2026Dialog');
    const panel = document.getElementById('erp23HistoricalPanel');
    const trigger = document.getElementById('revelioOpenArchive2026');
    if (!modal || !panel || !trigger) return;
    const year2027 = Number(window.ERPTemporalYear) === 2027;
    // Preserva a barreira original da F02: 2026 só pode ser consultado em 2027.
    trigger.hidden = !year2027 || panel.hidden;
    trigger.addEventListener('click', () => {
      if (!year2027 || panel.hidden || modal.open) return;
      modal.showModal();
      document.getElementById('erp23HistoricalSearch')?.focus();
    });
    const close = () => { if (modal.open) modal.close(); };
    document.getElementById('revelioCloseArchive2026')?.addEventListener('click', close);
    document.getElementById('revelioCloseArchive2026Footer')?.addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
})();
