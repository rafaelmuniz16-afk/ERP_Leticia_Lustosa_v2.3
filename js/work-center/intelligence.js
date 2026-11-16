/* Fase 04: adaptador SOMENTE LEITURA para o interpretador homologado da Aurora.
 * Não efetua IO, não implementa regras linguísticas e não guarda observações.
 */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('../aurora/operational-intelligence.js'):root.AuroraOperationalIntel);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.ERPWorkIntelligence=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(A){
 'use strict';
 const labels=Object.freeze({
  indicio_pendencia:'Possível pendência a conferir',
  contraditorio:'Situação contraditória a conferir',
  nao_confiavel:'Observação com instrução não confiável',
  inconclusivo:'Informação insuficiente para conclusão',
  resolvido:'Observação relata regularização',
  sem_texto:'Sem observação'});
 const flags=Object.freeze(['all','with','without','cadastral','contextual','pending','contradictory','inconclusive','untrusted']);
 function assess(observation,issues=[]) {
  if(!A||typeof A.interpretarObservacao!=='function')throw new Error('Inteligência local da Aurora indisponível. Recarregue o ERP.');
  const analysis=A.interpretarObservacao(observation);
  const state=analysis.status;
  const contextual=['indicio_pendencia','contraditorio','nao_confiavel','inconclusivo'].includes(state)&&String(observation||'').trim().length>0;
  const cadastral=issues.length>0;
  const signal=cadastral||contextual;
  const priority=state==='contraditorio'||issues.includes('statusConflict')||(cadastral&&contextual&&issues.length>=2)?'first':
    (cadastral||['indicio_pendencia','nao_confiavel'].includes(state))?'check':
    contextual?'informative':'none';
  const subjects=Array.isArray(analysis.assuntos)?analysis.assuntos.slice(0,6):[];
  // A Aurora já devolve o trecho saneado quando o texto contém comando hostil.
  const evidence=String(analysis.trecho||'').slice(0,240);
  const reason=contextual?Object.freeze({kind:'contextual',label:labels[state],subjects:Object.freeze(subjects),evidence,
    guidance:String(analysis.orientacao||'Conferência humana recomendada.'),state}):null;
  return Object.freeze({state,priority,contextual,cadastral,signal,reason,
    reportedResolution:state==='resolvido',hasObservation:state!=='sem_texto',
    safeObservation:state==='nao_confiavel'?evidence:String(observation||''),
    guidance:String(analysis.orientacao||'')});
 }
 function matches(r,flag){
  const w=r.work;if(!w)return flag==='all';
  return ({all:true,with:w.signal,without:!w.signal,cadastral:w.cadastral,
   contextual:w.contextual,pending:w.state==='indicio_pendencia',
   contradictory:w.state==='contraditorio',inconclusive:w.state==='inconclusivo'&&w.contextual,
   untrusted:w.state==='nao_confiavel'})[flag]??false;
 }
 function totals(rows){const counts={first:0,check:0,informative:0,cadastral:0,contextual:0,both:0,unknown:0};
  for(const r of rows){const w=r.work;if(!w)continue;
   if(w.priority!=='none')counts[w.priority]++;
   if(w.cadastral)counts.cadastral++;
   if(w.contextual)counts.contextual++;
   if(w.cadastral&&w.contextual)counts.both++;
   if(w.state==='inconclusivo'&&w.contextual)counts.unknown++;
  }return counts;
 }
 return Object.freeze({assess,matches,totals,labels,flags});
});
