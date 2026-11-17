const $ = id => document.getElementById(id);
const monthName = m => MONTHS.find(x => x[0] === String(m))?.[1] || '—';

// DATA OFICIAL LOCAL (AMERICA/FORTALEZA - UTC-3)
function getRealTodayLocal() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(new Date());
  } catch(e) {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
}
// Referência temporal interna da Fase 04 (sem controle invisível persistido).
// Quando o ano operacional é o ano real, utilizar o dia real de Fortaleza.
// Ano passado: usar 31/12 do próprio ano. Ano futuro em laboratório:
// projetar mês/dia atual, corrigindo 29/02 em ano não bissexto.
// Não altera logs, datas de registros nem os endpoints independentes.
function validLabDate(value) {
  if (typeof value !== 'string' || !new RegExp('^' + LAB_YEAR + '-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$').test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}
function getTodayLocal() {
  const real = getRealTodayLocal();
  const realYear = Number(real.slice(0,4));
  if (LAB_YEAR === realYear) return real;
  if (LAB_YEAR < realYear) return LAB_YEAR + '-12-31';
  const projected = LAB_YEAR + real.slice(4);
  return validLabDate(projected) ? projected : LAB_YEAR + '-02-28';
}

function setLoading(show, title='Sincronizando…') {
  $('loadingTitle').textContent = title;
  $('loading').classList.toggle('show', show);
}

// Revelio: fechamento de segurança para notificações temporárias.
// Não interfere em diálogos SweetAlert2 de confirmação ou em outros toasts.
function toast(icon, title) {
  const duration = 2800;
  const fallbackDelay = 4200;
  let popup = null;
  let safetyTimer = null;
  let visibilityHandler = null;
  let dueAt = 0;

  function cleanup() {
    if (safetyTimer !== null) { clearTimeout(safetyTimer); safetyTimer = null; }
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }
  }

  function closeIfStillThisToast() {
    if (!popup || !Swal.isVisible() || Swal.getPopup() !== popup ||
        !popup.classList.contains('swal2-toast')) {
      cleanup();
      return;
    }
    cleanup();
    Swal.close();
  }

  return Swal.fire({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: duration,
    timerProgressBar: true,
    icon,
    title,
    didOpen(element) {
      popup = element;
      dueAt = Date.now() + fallbackDelay;
      safetyTimer = setTimeout(closeIfStillThisToast, fallbackDelay);
      visibilityHandler = () => {
        if (document.visibilityState === 'visible' && Date.now() >= dueAt) {
          closeIfStillThisToast();
        }
      };
      document.addEventListener('visibilitychange', visibilityHandler);
    },
    willClose: cleanup,
    didDestroy: cleanup
  });
}

function normalizeDate(v) {
  if(!v) return '';
  let s = String(v);
  return s.includes('T') ? s.split('T')[0] : s.includes(' ') ? s.split(' ')[0] : s;
}

function getMesCorreto(d) {
  let m = d.mesReferencia;
  if(!m || isNaN(parseInt(m))) {
    let dt = normalizeDate(d.data);
    return dt && dt.includes('-') ? dt.split('-')[1] : '00';
  }
  return String(parseInt(m)).padStart(2,'0');
}

function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function safeText(value) {
  return escapeHTML(value).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

function formatMoney(v) {
  return Number(v || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
}

function parseNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function setConn(state, label) {
  const dot = $('sideDot');
  dot.className = 'status-dot ' + (state === 'online' ? 'status-online' : state === 'syncing' ? 'status-syncing' : 'status-offline');
  $('sideStatus').textContent = label;
}



// Cache local é auxiliar: sua indisponibilidade não desfaz confirmação remota.
function persistCacheState(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_) {
    return false;
  }
}
