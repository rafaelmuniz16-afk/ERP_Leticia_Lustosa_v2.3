'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const results=[];const test=async(label,fn)=>{try{await fn();results.push({label,ok:true});}catch(e){results.push({label,ok:false,message:e.message});}};
const row=(year,uid)=>({_uid:uid,id:uid,processo:'1234567-88.9999.1.00.1111',data:`${year}-10-10`,mesReferencia:'10',panjud:'Sim',recusado:'Não',observacoes:'Teste fictício'});
(async()=>{
 await test('Metas locais 2027 não respondem pergunta 2026',()=>{
   global.window={ERPTemporalYear:2027};
   const M=require(path.join(root,'js/aurora/goal-metrics.js'));
   const ctx={calculate:()=>({reais:2,meta:10}),getSelectedMonth:()=> '10'};
   assert.equal(M.response('Quantos faltam para a meta em outubro de 2026?',ctx),null);
   assert.ok(M.response('Quantos faltam para a meta em outubro de 2027?',ctx).includes('2 encerramentos'));
 });
 await test('Transporte 2026 somente acao ler e sanitiza GROQ_API_KEY',async()=>{
   let calls=[];
   const fake={status:'sucesso',dados:[row(2026,'old')],metas:{'10':30,'B9':'gsk_SUPERSECRET','GROQ_API_KEY':'gsk_SUPERSECRET'}};
   const sandbox={window:{ERPTemporalYear:2027},LAB_YEAR:2027,ERP_YEAR_ENDPOINTS:{2026:'https://example.invalid/2026'},
    validYearEndpointResponse:(p,y)=>y===2026&&p.status==='sucesso',
    fetch:async (url,options)=>{calls.push([url,options]);return {ok:true,json:async()=>structuredClone(fake)};},
    AbortController,console,Date,document:{getElementById:()=>null},setTimeout,clearTimeout};
   vm.createContext(sandbox);
   vm.runInContext(fs.readFileSync(path.join(root,'js/core/temporal-history.js'),'utf8'),sandbox);
   const result=await sandbox.window.ERPTemporalHistoryRead.read();
   assert.equal(calls.length,1);assert.equal(calls[0][1].method,'POST');
   assert.deepEqual(JSON.parse(calls[0][1].body),{acao:'ler'});
   assert.equal(result.metas['10'],30);assert.equal(result.metas.GROQ_API_KEY,undefined);
   assert.equal(JSON.stringify(result).includes('gsk_SUPERSECRET'),false);
   assert.equal(result.dados.length,1);
 });
 await test('Recusa retorno histórico com ano cruzado',async()=>{
   const sandbox={window:{ERPTemporalYear:2027},LAB_YEAR:2027,ERP_YEAR_ENDPOINTS:{2026:'https://example.invalid/2026'},
    validYearEndpointResponse:(p,y)=>p.status==='sucesso',fetch:async()=>({ok:true,json:async()=>({status:'sucesso',dados:[row(2027,'wrong')],metas:{}})}),
    AbortController,console,Date,document:{getElementById:()=>null},setTimeout,clearTimeout};
   vm.createContext(sandbox);
   vm.runInContext(fs.readFileSync(path.join(root,'js/core/temporal-history.js'),'utf8'),sandbox);
   await assert.rejects(()=>sandbox.window.ERPTemporalHistoryRead.read(),/HISTORICO_NAO_VALIDADO/);
 });
 await test('Dispatcher fecha nomes de novas ferramentas sem mutação',async()=>{
   const source=fs.readFileSync(path.join(root,'js/aurora/dispatcher.js'),'utf8').replace('export async function','async function');
   const fake=Object.freeze({consultarPeriodo:()=>({status:'sucesso',ano:2027}),consultarHistorico:()=>({status:'sucesso',historico:true}),analisarObservacoes:()=>({status:'sucesso',somenteLeitura:true}),prepararCadastro:()=>({status:'rascunho'})});
   const context={window:{AuroraOperationalIntel:fake},console,document:{},setTimeout};
   vm.createContext(context);vm.runInContext(source+'\nthis.testDispatcher=executarFerramenta;',context);
   const args={};const erp={};
   assert.equal((await context.testDispatcher('consultarPeriodoMultianual',args,erp)).ano,2027);
   assert.equal((await context.testDispatcher('consultarHistoricoProcesso',args,erp)).historico,true);
   assert.equal((await context.testDispatcher('analisarObservacoes',args,erp)).somenteLeitura,true);
   assert.equal((await context.testDispatcher('prepararRascunhoCaso',args,erp)).status,'rascunho');
 });
 await test('Bundle file:// registra Aurora e mantém ferramentas',()=>{
   const sandbox={window:{},document:{readyState:'loading',addEventListener:()=>{}},console,AbortController,setTimeout,clearTimeout,URL,Intl,CustomEvent:class{},navigator:{},localStorage:{getItem:()=>null},Date,TextEncoder};
   vm.createContext(sandbox);
   vm.runInContext(fs.readFileSync(path.join(root,'js/aurora/agent.bundle.js'),'utf8'),sandbox);
   assert.equal(typeof sandbox.window.processarMensagemAurora,'function');
   assert.equal(typeof sandbox.window.AuroraIntegrationAI.generate,'function');
 });
 const pass=results.filter(x=>x.ok).length;
 const report={passed:pass,total:results.length,failed:results.filter(x=>!x.ok)};
 console.log(JSON.stringify(report,null,2));
 if(pass!==results.length) process.exitCode=1;
})();
