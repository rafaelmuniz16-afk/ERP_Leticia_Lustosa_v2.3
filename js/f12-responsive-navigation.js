/* F12 REV02: preserva a lateral sticky da F11 e faz compactação sob demanda.
 * Nunca usa position:relative, nunca altera rolagem do documento e não cria
 * controles de navegação duplicados. Não realiza chamadas de rede ou storage. */
(function(){ 'use strict';
 const root=document.documentElement;
 function recompute(){
   const side=document.querySelector('.app > .sidebar');
   if(!side)return;
   root.removeAttribute('data-erp-f12-nav-flow'); // legado de F12 REV01
   if(root.dataset.erpLayout==='top'||innerWidth<=930||getComputedStyle(side).display==='none'){
     root.removeAttribute('data-erp-f12-nav-tight');return;
   }
   root.removeAttribute('data-erp-f12-nav-tight');
   // Após a compactação responsiva por CSS, ativar fallback somente se
   // conteúdo efetivamente ultrapassar a área visível da lateral.
   if(side.scrollHeight>side.clientHeight+3){root.dataset.erpF12NavTight='true';}
 }
 function start(){
   const side=document.querySelector('.app > .sidebar');if(!side)return;
   let scheduled=false;
   const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;recompute();});};
   addEventListener('resize',schedule,{passive:true});
   document.addEventListener('erp:appearance-change',schedule);
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
   new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['data-erp-layout','data-erp-theme']});
   new MutationObserver(schedule).observe(side,{childList:true,subtree:true});
   schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
