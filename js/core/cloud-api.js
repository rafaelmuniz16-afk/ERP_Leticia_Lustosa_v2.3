// ==== API & NUVEM ====
// Contrato exato da candidata LAB 2027 B14 — impede aceitar deploys antigos.
const LAB_BACKEND_VERSION_EXPECTED = 'erp-v23-lab-2027-fase01-02-groq-b14';
// 2026 é um endpoint LEGADO sem identidade de versão. A URL é fixa e
// conhecida da v2.2; rejeitar qualquer marcador 2027, mesmo em 2026.
// Atenção: sem identidade criptográfica de 2026, conferir deploy antes de
// autorizar qualquer operação de escrita nessa base em produção.
function validYearEndpointResponse(data, year) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (year === 2027) return Number(data.year) === 2027 &&
    Number(data.ano) === 2027 && data.backendVersion === LAB_BACKEND_VERSION_EXPECTED;
  if (year !== 2026) return false;
  if (data.year != null && Number(data.year) !== 2026) return false;
  if (data.ano != null && Number(data.ano) !== 2026) return false;
  if (data.backendVersion && !/^(erp-.*2026|2026)/i.test(String(data.backendVersion))) return false;
  return data.status === 'sucesso' || data.status === 'erro';
}
function validateYearRows(rows, year) {
  return Array.isArray(rows) && rows.every(row => row && typeof row === 'object' &&
    !Array.isArray(row) && String(row._uid || '').trim() &&
    new RegExp('^' + year + '-').test(String(row.data || '').slice(0, 10)) &&
    (() => { const date = String(row.data).slice(0,10), d = new Date(date + 'T12:00:00Z');
      return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === date; })() &&
    MONTHS_2027.some(([mes]) => mes === String(row.mesReferencia || '').padStart(2, '0')));
}
let cloudReadSequence = 0;
let cloudMutationRevision = 0;
let cloudMutationsPending = 0;
const cloudMetaQueues = new Map();
async function fetchAPI(acao, payload={}) {
  // Ano ativo fixado na inicialização. Sem rota de transferência entre anos.
  if ((acao === 'salvar' || acao === 'editar') &&
      (!payload.registro || !validLabDate(String(payload.registro.data || '').slice(0,10)) ||
       (payload.registro.originYear != null && Number(payload.registro.originYear) !== LAB_YEAR) ||
       (payload.registro.sourceYear != null && Number(payload.registro.sourceYear) !== LAB_YEAR))) {
    return {status:'erro', year:LAB_YEAR, codigo:'YEAR_MISMATCH',
      mensagem:'A data de encerramento deve pertencer exclusivamente a ' + LAB_YEAR + '.'};
  }
  if ((acao === 'editar' || acao === 'apagar') &&
      (!Array.isArray(bd) || !bd.some(row => String(row._uid) ===
        String(acao === 'apagar' ? payload.uid : payload.registro?._uid) &&
        (row.originYear == null || Number(row.originYear) === LAB_YEAR)))) {
    return {status:'erro', year:LAB_YEAR, codigo:'UNKNOWN_ORIGIN',
      mensagem:'UID não pertence à base ativa confirmada. Sincronize antes de editar/excluir.'};
  }
  if (acao === 'salvarMeta' && !MONTHS.some(([mes]) => mes === String(payload.mes))) {
    return {status:'erro', year:LAB_YEAR, codigo:'LAB_INVALID_MONTH',
      mensagem:'Mês de meta inválido para ' + LAB_YEAR + '.'};
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({acao, ...payload, year:LAB_YEAR}),
      signal: controller.signal
    });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!validYearEndpointResponse(data, LAB_YEAR)) {
      throw new Error('Resposta incompatível com o backend de ' + LAB_YEAR + '. Operação recusada.');
    }
    return data;
  } catch(err) {
    console.error('API', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function serverMutation(acao, payload) {
  // Invalida leituras iniciadas antes/durante uma escrita, inclusive Aurora.
  cloudMutationRevision++;
  cloudMutationsPending++;
  const execute = async () => {
  setConn('syncing', 'Salvando…');
  const res = await fetchAPI(acao, payload);
  if(!res || res.status !== 'sucesso') {
    setConn('offline', 'Falha na nuvem');
    throw new Error(res?.mensagem || res?.message || 'Servidor não confirmou a operação.');
  }
  if (acao === 'salvarMeta') lastConfirmedMetas[payload.mes] = payload.meta;
  renderSheetMemoryStatus();
  return res;
  };
  let queued;
  const month = acao === 'salvarMeta' ? String(payload.mes) : null;
  try {
    if (month !== null) {
      queued = (cloudMetaQueues.get(month) || Promise.resolve()).catch(() => {}).then(execute);
      cloudMetaQueues.set(month, queued);
      return await queued;
    }
    return await execute();
  } finally {
    if (month !== null && cloudMetaQueues.get(month) === queued) cloudMetaQueues.delete(month);
    cloudMutationsPending--;
    cloudMutationRevision++;
  }
}

async function loadCloud(initial=false) {
  const pending = () => cloudMutationsPending > 0 || (typeof hasPendingMetaSaves === 'function' && hasPendingMetaSaves());
  if (pending()) return { status: 'pendente', mensagem: 'Aguarde o salvamento pendente antes de sincronizar.' };
  const sequence = ++cloudReadSequence, revision = cloudMutationRevision;
  setConn('syncing', 'Conectando…');
  if(initial && bd.length) renderAll();
  const res = await fetchAPI('ler');
  if (sequence !== cloudReadSequence || revision !== cloudMutationRevision || pending()) {
    return { status: 'descartado', mensagem: 'Leitura antiga descartada para preservar alterações mais recentes. Sincronize novamente.' };
  }
  if(res && res.status === 'sucesso' && validateYearRows(res.dados, LAB_YEAR)) {
    let cacheSaved = true;
    bd = res.dados;
    if(res.metas && typeof res.metas === 'object' && !Array.isArray(res.metas)) {
      // A ponte B14 da Aurora vem na resposta legada de leitura do laboratório.
      // Extrair ANTES de salvar metas, renderizar indicadores ou montar prompts:
      // nunca incluir a chave em caches locais ou no resumo enviado ao modelo.
      const possibleKey = LAB_YEAR === 2027 ? res.metas.B14 :
        (res.metas.B9 || res.metas.GROQ_API_KEY);
      labGroqKey = typeof possibleKey === 'string' && /^gsk_[A-Za-z0-9_\-]{10,}$/.test(possibleKey.trim())
        ? possibleKey.trim() : '';
      for (const key of ['B14','b14','B9','b9','GROQ_API_KEY','groq_api_key']) delete res.metas[key];
      metas = res.metas;
      lastConfirmedMetas = JSON.parse(JSON.stringify(metas));
      cacheSaved = persistCacheState(META_KEY, metas) && cacheSaved;
      // Reflete no campo a meta remota confirmada para o mes atualmente selecionado.
      updateMetaInput();
    }
    if(res.logs && Array.isArray(res.logs)) {
      logsAuditoria = res.logs;
      cacheSaved = persistCacheState(LOGS_KEY, logsAuditoria) && cacheSaved;
    }
    const sheetRows = window.ERPSheetMemory?.fromResponse(res);
    if (sheetRows !== null && sheetRows !== undefined) {
      memoriaIA = window.ERPSheetMemory.normalize(sheetRows);
      cacheSaved = persistCacheState(MEMORIA_KEY, memoriaIA) && cacheSaved;
      sheetMemoryFromApi = true;
      sheetMemoryLastSuccess = Date.now();
      sheetMemoryLastAttempt = Date.now();
      renderSheetMemoryStatus();
    } else {
      // O endpoint "ler" pode não incluir a aba Memoria_IA.
      // Tenta uma leitura separada sem bloquear o carregamento dos casos.
      void refreshSheetMemory();
    }
    cacheSaved = persistCacheState(CACHE_KEY, bd) && cacheSaved;
    setConn('online', 'Online');
    $('sideCount').textContent = bd.length;
    renderAll();
    if (!cacheSaved) toast('warning', 'Dados sincronizados; o cache local não pôde ser atualizado. Uma nova abertura exige conexão.');
    if (typeof startDiagnosticLoop === 'function') {
      startDiagnosticLoop();
    }
  } else {
    setConn('offline', 'Sem conexão');
    toast('warning', 'Não foi possível confirmar os dados da nuvem.');
    if (res?.status === 'sucesso') return { status: 'erro', mensagem: 'Resposta de dados inválida; a base local foi preservada.' };
  }
  return res;
}


// Sincronização independente do histórico da aba Memoria_IA para o CHATBOT.
// A Aurora Memory analítica (episódios no navegador) permanece independente.
let sheetMemoryLastAttempt = 0;
let sheetMemoryLastSuccess = 0;
let sheetMemoryFromApi = false;
let sheetMemoryPending = null;
async function refreshSheetMemory(force = false) {
  if (sheetMemoryPending) return sheetMemoryPending;
  if (!force && Date.now() - sheetMemoryLastAttempt < 60000) return sheetMemoryFromApi;
  sheetMemoryLastAttempt = Date.now();
  sheetMemoryPending = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7500);
    try {
      const response = await fetch(API_URL, {
        method: 'POST', headers: {'Content-Type':'text/plain;charset=utf-8'},
        body: JSON.stringify({acao:'lerMemoria',year:LAB_YEAR}), signal: controller.signal
      });
      if (!response.ok) return false;
      const payload = await response.json();
      if (!validYearEndpointResponse(payload, LAB_YEAR)) return false;
      // Resposta dedicada pode usar "dados" em vez de "memoria".
      const rows = window.ERPSheetMemory?.fromResponse(payload) ??
        (Array.isArray(payload.dados) ? payload.dados : null);
      if (rows === null || rows === undefined) return false;
      // Nunca substitua memória local com um erro/mensagem do backend.
      if (payload.status && payload.status !== 'sucesso') return false;
      memoriaIA = window.ERPSheetMemory.normalize(rows);
      localStorage.setItem(MEMORIA_KEY, JSON.stringify(memoriaIA));
      sheetMemoryLastSuccess = Date.now();
      sheetMemoryFromApi = true;
      renderSheetMemoryStatus();
      return true;
    } catch (_) { return false; }
    finally { clearTimeout(timeout); }
  })();
  try { return await sheetMemoryPending; }
  finally { sheetMemoryPending = null; }
}
window.erpSheetMemoryStatus = () => ({ fromCloud: sheetMemoryFromApi, lastSuccess: sheetMemoryLastSuccess, rows: memoriaIA.length, fallback: !sheetMemoryFromApi });

function renderSheetMemoryStatus() {
  const el = document.getElementById('aiMemorySource');
  if (!el) return;
  const n = Array.isArray(memoriaIA) ? memoriaIA.length : 0;
  el.textContent = sheetMemoryFromApi
    ? `Memoria_IA · ${n} memória${n === 1 ? '' : 's'} na nuvem`
    : `Memoria_IA · ${n ? n + ' em cache local' : 'sem leitura confirmada'}`;
}
