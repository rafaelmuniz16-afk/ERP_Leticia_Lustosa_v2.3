
// ============================================================
// CONFIGURAÇÕES E BANCO NA NUVEM (API REAL)
// ============================================================
// FASE 02 — Dois backends INDEPENDENTES. Nenhum Apps Script lê/grava a outra planilha.
// Endpoint 2026 transcrito do config-state.js do ZIP oficial da ERP v2.2 de 09/11.
const ERP_YEAR_ENDPOINTS = Object.freeze({
  2026: 'https://script.google.com/macros/s/AKfycbzkcsULH3xNPbjNFmLy-wlqKuSE0cbwBlkqmVd8t1ugoP89RHzuW9wCMHK0V7eKYrxp/exec',
  2027: 'https://script.google.com/macros/s/AKfycbw9dtriQva36w2E4DBNrZsPQTsYbeLYHx7absKLTe521jJ1gW2odNkIPqX2ZD9UMUBk/exec'
});
const ERP_YEAR_STORAGE = 'erp23_f02_year_session'; // legado: não comprova seleção manual
const ERP_YEAR_MANUAL_KEY = 'erp23_f07_manual_year_session';
const ERP_SUPPORTED_YEARS = Object.freeze(Object.keys(ERP_YEAR_ENDPOINTS).map(Number).sort());
// Retorna um ano somente se houver backend explicitamente configurado.
function erpF07SupportedYear(value) {
  const year = Number(value);
  return Number.isInteger(year) && ERP_SUPPORTED_YEARS.includes(year) &&
    typeof ERP_YEAR_ENDPOINTS[year] === 'string' && /^https:\/\//.test(ERP_YEAR_ENDPOINTS[year]) ? year : null;
}
function erpF07ResolveYear(calendarYear, manualYear, legacyYear) {
  const manual = erpF07SupportedYear(manualYear);
  if (manual && String(manualYear) === String(legacyYear)) {
    return {year:manual, source:'manual', requiresChoice:false};
  }
  // Marcador legado isolado não é uma escolha consciente do usuário.
  const current = erpF07SupportedYear(calendarYear);
  return current ? {year:current, source:'calendar', requiresChoice:false} :
    {year:null, source:'unsupported', requiresChoice:true};
}
const ERP_YEAR_SESSION = (() => {
  let manualYear = null, legacyYear = null;
  try {
    manualYear = sessionStorage.getItem(ERP_YEAR_MANUAL_KEY);
    legacyYear = sessionStorage.getItem(ERP_YEAR_STORAGE);
  } catch (_) { /* storage restrito: usa o calendário sem gravar */ }
  return Object.freeze(erpF07ResolveYear(new Date().getFullYear(), manualYear, legacyYear));
})();
// Somente a escolha consciente habilita operações em ano não vigente.
// Com ano não configurado, LAB_YEAR é nulo e a API permanece desabilitada.
const LAB_YEAR = ERP_YEAR_SESSION.year;
function erpF07ChooseYear(target) {
  const year = erpF07SupportedYear(target);
  if (!year) return false;
  try {
    sessionStorage.setItem(ERP_YEAR_STORAGE, String(year));
    sessionStorage.setItem(ERP_YEAR_MANUAL_KEY, String(year));
    return true;
  } catch (_) {
    // Impede que um valor parcial do legado seja interpretado como escolha manual.
    try { sessionStorage.removeItem(ERP_YEAR_MANUAL_KEY); } catch (_) {}
    return false;
  }
}
const API_URL = LAB_YEAR === null ? '' : ERP_YEAR_ENDPOINTS[LAB_YEAR];
const LAB_REF_DATE_KEY = 'erp23_f02_' + LAB_YEAR + '_reference_date';
const MONTHS_2027 = [['01','Janeiro'],['02','Fevereiro'],['03','Março'],['04','Abril'],['05','Maio'],['06','Junho'],['07','Julho'],['08','Agosto'],['09','Setembro'],['10','Outubro'],['11','Novembro'],['12','Dezembro']];
const MONTHS = LAB_YEAR === 2026 ? MONTHS_2027.slice(5) : MONTHS_2027;
const CACHE_KEY = 'erp23_f02_' + LAB_YEAR + '_bd';
const META_KEY = 'erp23_f02_' + LAB_YEAR + '_metas';
const LAST_MONTH_KEY = 'erp23_f02_' + LAB_YEAR + '_mes';
const AI_KEY = 'erp23_f02_' + LAB_YEAR + '_groq_api_key';
const LOGS_KEY = 'erp23_f02_' + LAB_YEAR + '_logs';
const MEMORIA_KEY = 'erp23_f02_' + LAB_YEAR + '_memoria_ia';
// Chaves compartilhadas exclusivamente com os módulos da Aurora neste ano.
if (ERP_YEAR_SESSION.requiresChoice && typeof document !== 'undefined') document.documentElement.dataset.erpYearUnconfigured = 'true';
window.ERPTemporalYear = LAB_YEAR;
window.ERPYearSession = ERP_YEAR_SESSION;
window.ERPTemporalCacheKeys = Object.freeze({bd:CACHE_KEY,metas:META_KEY,memoria:MEMORIA_KEY});

// Um cache inválido não deve impedir a leitura confirmada da nuvem.
// Não apaga nem regrava o valor original durante a inicialização.
function readCachedState(key, arrayExpected) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || (arrayExpected ? '[]' : '{}'));
    if (arrayExpected ? Array.isArray(value) : value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch (_) { /* Cache recuperável; sem conteúdo sensível no console. */ }
  return arrayExpected ? [] : {};
}
let bd = readCachedState(CACHE_KEY, true);
let metas = readCachedState(META_KEY, false);
let logsAuditoria = readCachedState(LOGS_KEY, true);
let memoriaIA = readCachedState(MEMORIA_KEY, true);
let editUid = null, currentPage = 1, itemsPerPage = 15, metaSaveTimer = null, lastConfirmedMetas = JSON.parse(JSON.stringify(metas));
let charts = {tipos:null, linha:null};
// Chave retornada pela nuvem é exclusivamente volátil; nunca entra no cache de metas.
let labGroqKey = '';
let apiKey = (() => { try { return localStorage.getItem(AI_KEY) || ''; } catch (_) { return ''; } })();
let chatHistory = [{role:'assistant', content:'Olá, Letícia! Eu sou a Aurora. ✦ Estou pronta para consultar a base, analisar indicadores e cadastrar ou editar casos.'}];

