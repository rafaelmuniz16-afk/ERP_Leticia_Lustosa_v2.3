/* F07/OS-02 REV02 — Fonte única de identidade institucional.
 * Módulo local, sem rede, storage, autorização ou qualquer escrita operacional. */
(() => {
  'use strict';
  const IDENTITY = Object.freeze({
    productName: 'ERP Letícia Lustosa',
    displayName: 'ERP Letícia Lustosa - Revelio',
    version: 'v2.3',
    releaseName: 'Revelio',
    designSystem: 'Cinematic Rebirth',
    creatorName: 'Rafael Soares',
    directorName: 'Rafael Soares',
    departments: Object.freeze([
      Object.freeze({sector:'Innovation Lab', name:'Nexus', function:'Planejamento, visão de produto e especificação'}),
      Object.freeze({sector:'Desenvolvimento Geral', name:'Atlas', function:'Desenvolvimento, integração e correções'}),
      Object.freeze({sector:'QA & Testes', name:'Atlas', function:'Testes independentes, auditoria e homologação'}),
      Object.freeze({sector:'Motion & Animações', name:'Íris', function:'Identidade visual, onze temas e animações'}),
      Object.freeze({sector:'Performance & Otimização', name:'Vetor', function:'Desempenho, fluidez e eficiência'}),
      Object.freeze({sector:'Continuidade', name:'Atlas', function:'Histórico e preservação institucional'}),
      Object.freeze({sector:'Entrega Final & Correções', name:'Prisma', function:'Auditoria final e correções autorizadas'}),
      Object.freeze({sector:'Pontos Críticos', name:'Nexo', function:'Investigação extraordinária de problemas críticos'})
    ]),
    history: 'Fundação operacional para 2027, separação de 2026 e 2027, evolução da Aurora, Central de Trabalho, identidade Cinematic Rebirth e Modo Desempenho. A Fase 07 acrescenta seleção do ano vigente e identificação institucional.'
  });
  function text(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }
  function applyPublicIdentity(root = document) {
    document.title = IDENTITY.displayName;
    root.querySelectorAll('[data-erp-display-name],.brand-title,.cr-logo-main').forEach(element => {
      element.textContent = IDENTITY.displayName;
    });
    root.querySelectorAll('.cr-logo').forEach(element => element.setAttribute('aria-label', IDENTITY.displayName));
  }
  function render() {
    applyPublicIdentity();
    text('erp-f07-about-version', IDENTITY.version);
    text('erp-f07-about-codename', IDENTITY.releaseName);
    text('erp-f07-about-design', IDENTITY.designSystem);
    text('erp-f07-about-creator', `${IDENTITY.creatorName} — Criador, idealizador e diretor do projeto.`);
    // F13: departamentos e histórico da F07 permanecem no manifesto interno,
    // sem renderização pública; a seção "A Era Revelio" é conteúdo editorial do HTML.
  }
  function bind() {
    render();
    const trigger = document.getElementById('erp-f07-about-trigger');
    const dialog = document.getElementById('erp-f07-about-dialog');
    if (!trigger || !dialog) return;
    let previousFocus = null;
    const close = () => { if (!dialog.open) return; if (typeof dialog.close === 'function') dialog.close(); else { dialog.removeAttribute('open'); if (previousFocus?.isConnected) previousFocus.focus({preventScroll:true}); previousFocus = null; } };
    trigger.addEventListener('click', () => {
      if (dialog.open) return;
      previousFocus = document.activeElement;
      render();
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else { dialog.setAttribute('open',''); dialog.setAttribute('aria-modal','true'); }
      document.getElementById('erp-f07-about-close')?.focus();
    });
    document.getElementById('erp-f07-about-close')?.addEventListener('click', close);
    document.getElementById('erp-f07-about-close-footer')?.addEventListener('click', close);
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape' && typeof dialog.close !== 'function') { event.preventDefault(); close(); }
    });
    dialog.addEventListener('close', () => {
      if (previousFocus?.isConnected) previousFocus.focus({preventScroll:true});
      else trigger.focus({preventScroll:true});
      previousFocus = null;
    });
  }
  window.ERPIdentity = Object.freeze({...IDENTITY, applyPublicIdentity, render});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, {once:true});
  else bind();
})();
