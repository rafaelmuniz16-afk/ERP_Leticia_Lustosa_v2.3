/* Read-only work projections using the existing export query engine. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('../export/data.js'):root.ERPExport.Data,typeof module==='object'&&module.exports?require('../export/filters.js'):root.ERPExport.Filters,typeof module==='object'&&module.exports?require('./intelligence.js'):root.ERPWorkIntelligence);if(typeof module==='object'&&module.exports)module.exports=api;else root.ERPWork=api;})(typeof globalThis!=='undefined'?globalThis:this,function(D,F,I){
'use strict';
const periodKeys=['today','yesterday','week','previousWeek','month','previousMonth','last7','last30','year','all','custom'];
const defaults=()=>({...F.defaults(),period:'month',statusMode:'literal',sort:'date',direction:'desc',workFlag:'all',workPriority:'all',groupPriority:false});
const identity=r=>['string','number'].includes(typeof r?._uid)?String(r._uid):'';
function snapshot(source,today,validate){
 const base=D.snapshot(source,today,validate),cached=new Map();
 const rows=base.rows.map(r=>{
  const issues=Object.freeze(D.review(r));
  const observation=r.record.observacoes;
  // Deduplicação apenas neste snapshot; nunca persistir textos operacionais.
  const cacheKey=JSON.stringify([observation,issues]);
  let work=cached.get(cacheKey);
  if(!work){work=I.assess(observation,issues);cached.set(cacheKey,work);}
  return Object.freeze({...r,uid:identity(source[r.index]),issues,work});
 });
 return Object.freeze({...base,rows:Object.freeze(rows)});
}
function metrics(rows,today){
 const m={total:rows.length,unconfirmed:0,refused:0,confirmed:0,today:0,review:0,conflict:0,nonstandardStatus:0,reviewCadastral:0,reviewContextual:0,reviewBoth:0,reviewInconclusive:0,types:{'Ônus':0,Acordo:0,'Êxito':0,'Inativação':0,Outros:0},unconfirmedTypes:{'Ônus':0,Acordo:0,'Êxito':0,'Inativação':0,Outros:0},issues:{},days:{}};
 rows.forEach(r=>{const u=r.record.panjud==='Não';if(u)m.unconfirmed++;if(r.record.recusado==='Sim')m.refused++;if(r.record.panjud==='Sim')m.confirmed++;if(r.date?.iso===today)m.today++;
 const issues=r.issues||D.review(r);if(r.work?.signal)m.review++;if(r.work?.cadastral)m.reviewCadastral++;if(r.work?.contextual)m.reviewContextual++;if(r.work?.cadastral&&r.work?.contextual)m.reviewBoth++;if(r.work?.state==='inconclusivo'&&r.work?.contextual)m.reviewInconclusive++;if(issues.includes('statusConflict'))m.conflict++;if(issues.includes('invalidStatus'))m.nonstandardStatus++;issues.forEach(k=>{m.issues[k]=(m.issues[k]||0)+1;});
 const type=D.knownTypes.includes(r.record.tipo)?r.record.tipo:'Outros';m.types[type]++;if(u)m.unconfirmedTypes[type]++;const day=r.date?.iso||'sem_data_valida';m.days[day]=(m.days[day]||0)+1;});return m;
}
function query(base,filters){
 // F.run é o filtro oficial de registros/exportações; filtros contextuais são
 // aplicados SOMENTE na Central, sem modificar o motor exportador compartilhado.
 const temporal=F.run(base,{...defaults(),period:filters.period,start:filters.start,end:filters.end,workReview:false});
 const result=F.run(base,{...filters,workReview:false});
 const flag=I.flags.includes(filters.workFlag)?filters.workFlag:'all';
 let rows=result.rows.filter(r=>(!filters.workReview||r.work?.signal)&&I.matches(r,flag));
 const priorities=['first','check','informative','none'];
 if(priorities.includes(filters.workPriority))rows=rows.filter(r=>r.work?.priority===filters.workPriority);
 if(filters.groupPriority){
  // Stable sort: priority is operational, the chosen record ordering remains
  // the secondary ordering INSIDE each priority group.
  rows=rows.map((r,i)=>({r,i})).sort((a,b)=>priorities.indexOf(a.r.work.priority)-priorities.indexOf(b.r.work.priority)||a.i-b.i).map(x=>x.r);
 }
 return {...result,rows,overview:metrics(temporal.rows,base.today),metrics:metrics(rows,base.today),priorities:I.totals(rows)};
}
function shortcut(input,key,today){const f=structuredClone(input);if(key==='all')return {...defaults(),period:f.period,start:f.start,end:f.end};if(key==='unconfirmed')f.panjud='nao';if(key==='confirmed')f.panjud='sim';if(key==='refused')f.recusado='sim';if(key==='pending'){f.panjud='nao';f.recusado='nao';}if(D.knownTypes.includes(key))f.types=[key];if(key==='today'){f.dateOp='exact';f.dateA=today;f.dateB='';}if(key==='review'){f.workReview=!f.workReview;f.workFlag='all';}if(['hasObs','noObs'].includes(key)){f.obsGroups=f.obsGroups.filter(g=>!g.every(r=>['filled','empty'].includes(r.op)));f.obsGroups.push([{op:key==='hasObs'?'filled':'empty',value:'',not:false}]);}return f;}
function card(input,key,today){return shortcut({...defaults(),period:input.period,start:input.start,end:input.end},key,today);}
function paginate(rows,index=0,size=25){const pages=Math.max(1,Math.ceil(rows.length/size)),page=Math.max(0,Math.min(index,pages-1));return {page,pages,rows:rows.slice(page*size,(page+1)*size)};}
function locate(source,uid){if(!uid)return {error:'Este registro não possui identificador interno válido. Confira-o no cadastro original.'};const matches=source.filter(r=>identity(r)===String(uid));if(!matches.length)return {error:'O registro não está mais disponível. Atualize a consulta.'};if(matches.length!==1)return {error:'O identificador interno está repetido. A abertura foi bloqueada para não selecionar o registro errado.'};return {row:matches[0]};}
function summaryScope(base,filters){const errors=F.validate(filters);if(errors.length)return {error:errors.join(' ')};const limits=F.range(filters,base.today);let start,end;if(limits)[start,end]=limits.map(D.fromOrdinal);else{const dates=base.rows.filter(r=>r.date&&r.date.iso<=base.today).map(r=>r.date.iso).sort();start=dates[0]||base.today;end=dates.at(-1)||base.today;}if(start>base.today)return {error:'O Copiar Resumo aceita somente períodos até hoje. Escolha um período compatível.'};end=end>base.today?base.today:end;return {selection:{period:'custom',start,end},notice:`O Copiar Resumo considera TODOS os registros do período, sem os filtros de ID, CNJ, tipo, status, referência, observações ou conferência desta Central. Mantém os acumulados mensais e as regras oficiais do resumo. Datas inválidas e futuras não entram. Período solicitado ao resumo: ${D.formatDate(start)} a ${D.formatDate(end)}.`};}
function context(base,filters,m){
 const facts={total:`Registros selecionados: ${m.total}.`,unconfirmed:`Não confirmados no Panjud: ${m.unconfirmed}.`,refused:`Recusados no Panjud: ${m.refused}.`,confirmed:`Confirmados no Panjud: ${m.confirmed}.`,review:`Registros para conferência: ${m.review} (cadastrais: ${m.reviewCadastral}; contextuais: ${m.reviewContextual}; ambas: ${m.reviewBoth}).`};
 for(const [i,[type,count]] of Object.entries(m.types).entries())facts['type'+i]=`${type}: ${count} registros; ${m.unconfirmedTypes[type]} não confirmados.`;
 for(const [key,count] of Object.entries(m.issues))facts[key]=`${D.reviewLabels[key]}: ${count} registros.`;
 let days=Object.entries(m.days).sort(([a],[b])=>a.localeCompare(b)),resolution='dia';if(days.length>90){const months={};days.forEach(([date,n])=>{const k=date==='sem_data_valida'?date:date.slice(0,7);months[k]=(months[k]||0)+n;});days=Object.entries(months);resolution='mês';}
 const top=days.filter(([d])=>d!=='sem_data_valida').sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];if(top)facts.peak=`Maior quantidade no recorte por ${resolution}: ${top[0]}, com ${top[1]} registros (empates: primeiro período).`;
 // Never transmit free-form searches, raw types, identifiers or observations.
 return {period:F.periodLabel(filters,base.today),scope:'Resultados filtrados; status exatos do cadastro. Alertas podem se sobrepor. Não é diagnóstico jurídico.',total:m.total,confirmed:m.confirmed,refused:m.refused,unconfirmed:m.unconfirmed,review:m.review,types:{...m.types},unconfirmedTypes:{...m.unconfirmedTypes},issues:{...m.issues},distribution:{resolution,values:days},facts};
}
return Object.freeze({defaults,periodKeys,snapshot,metrics,query,shortcut,card,paginate,locate,summaryScope,context,workFlags:I.flags});
});
