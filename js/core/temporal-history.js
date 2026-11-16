// ERP v2.3 — Consulta HISTÓRICA 2026. Nenhum dado histórico entra em bd/metas.
// Esta camada somente emite {acao:'ler'} ao backend 2026, sem qualquer escrita.
let erp23HistoricalRows = [];
let erp23HistoricalPending = false;
let erp23HistoricalLastRead = false;

// Contrato compartilhado exclusivamente de leitura. O dado bruto de metas
// pode conter credenciais no backend legado: descartar todas as entradas
// não mensais antes de retornar, sem log ou armazenamento persistente.
async function readHistorical2026Snapshot(signal) {
  const activeYear = Number(window.ERPTemporalYear);
  if (LAB_YEAR !== 2027 || activeYear !== 2027) throw new Error('CONSULTA_HISTORICA_FORA_DE_2027');
  const response = await fetch(ERP_YEAR_ENDPOINTS[2026], {
    method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'},
    body: JSON.stringify({acao: 'ler'}), signal
  });
  if (!response.ok) throw new Error('HISTORICO_HTTP_' + response.status);
  const payload = await response.json();
  if (LAB_YEAR !== 2027 || Number(window.ERPTemporalYear) !== 2027 ||
      !validYearEndpointResponse(payload, 2026) || payload.status !== 'sucesso' ||
      !validateHistorical2026(payload.dados)) throw new Error('HISTORICO_NAO_VALIDADO');
  const metasSeguras = Object.create(null);
  for (let i = 1; i <= 12; i++) {
    const month = String(i).padStart(2,'0');
    const value = payload.metas?.[month] ?? payload.metas?.[String(i)];
    if (value != null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0)
      metasSeguras[month] = Number(value);
  }
  // Em memória somente durante esta consulta; nunca devolve payload.metas cru.
  return { ano:2026, dados:payload.dados, metas:metasSeguras,
    consultadoEm:new Date().toISOString(), origem:'backend_2026_acao_ler' };
}
window.ERPTemporalHistoryRead = Object.freeze({read:readHistorical2026Snapshot});

function renderHistorical2026() {
  const tbody = document.getElementById('erp23HistoricalRows');
  const stat = document.getElementById('erp23HistoricalStatus');
  if (!tbody || !stat || LAB_YEAR !== 2027) return;
  tbody.replaceChildren();
  const q = (document.getElementById('erp23HistoricalSearch')?.value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const rows = erp23HistoricalRows.filter(r => !q || [r.id,r.processo].some(x =>
    String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(q)));
  for (const rec of rows.slice(0, 250)) {
    const tr = document.createElement('tr');
    [2026,rec.id,rec.processo,rec.tipo,rec.data,rec.mesReferencia,rec.panjud].forEach(value => {
      const td = document.createElement('td'); td.textContent = String(value || '—'); tr.append(td);
    });
    tbody.append(tr);
  }
  if (erp23HistoricalLastRead) stat.textContent = rows.length + ' registro(s) histórico(s) encontrado(s); exibindo até 250. Somente leitura, origem 2026.';
}

async function loadHistorical2026() {
  if (LAB_YEAR !== 2027 || erp23HistoricalPending) return;
  const stat = document.getElementById('erp23HistoricalStatus');
  const btn = document.getElementById('erp23HistoricalLoad');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  erp23HistoricalPending = true;
  if (btn) btn.disabled = true;
  if (stat) stat.textContent = 'Consultando backend 2026 (somente leitura)…';
  try {
    // Reutiliza o mesmo transporte histórico validado empregado pela Aurora.
    // Não grava na planilha nem mistura histórico com o banco de trabalho.
    const data = await readHistorical2026Snapshot(ctrl.signal);
    erp23HistoricalRows = data.dados.map(r => ({
      id: String(r.id || ''), processo: String(r.processo || ''),
      tipo: String(r.tipo || ''), data: String(r.data || '').slice(0, 10),
      mesReferencia: String(r.mesReferencia || '').padStart(2, '0'),
      panjud: String(r.panjud || 'Não')
    }));
    erp23HistoricalLastRead = true;
    renderHistorical2026();
  } catch (_) {
    // QA23-F02-005: uma resposta inválida não substitui o último resultado
    // histórico que já foi validado. Esse conjunto permanece só em memória.
    if (!erp23HistoricalLastRead) {
      erp23HistoricalRows = [];
      document.getElementById('erp23HistoricalRows')?.replaceChildren();
    }
    if (stat) stat.textContent = erp23HistoricalLastRead
      ? 'Atualização histórica recusada. Última consulta válida de 2026 preservada (pode estar desatualizada).'
      : 'Consulta histórica indisponível. Nenhum dado antigo foi importado.';
  } finally { clearTimeout(timer); erp23HistoricalPending = false; if (btn) btn.disabled = false; }
}
function validateHistorical2026(rows) {
  if (!Array.isArray(rows)) return false;
  return rows.every(r => {
    if (!r || typeof r !== 'object' || Array.isArray(r)) return false;
    const value = String(r.data || '');
    // O Apps Script pode serializar datas como YYYY-MM-DD ou ISO com horário.
    // Verifique dias existentes (incluindo fevereiro), não somente um prefixo.
    // QA23-F02-006: validar limites do horário e deslocamento ISO,
    // além de dia/mês (antes o padrão aceitava 99:99:99 e +25:00).
    // Horário: 00–23, minuto/segundo: 00–59; offset: ±00:00 a ±23:59.
    const match = /^2026-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?)?$/.exec(value);
    if (!match) return false;
    const day = Number(match[2]);
    const maxDay = new Date(Date.UTC(2026, Number(match[1]), 0)).getUTCDate();
    return day <= maxDay;
  });
}
function bindHistorical2026() {
  if (LAB_YEAR !== 2027) return;
  document.getElementById('erp23HistoricalLoad')?.addEventListener('click', loadHistorical2026);
  document.getElementById('erp23HistoricalSearch')?.addEventListener('input', renderHistorical2026);
}
