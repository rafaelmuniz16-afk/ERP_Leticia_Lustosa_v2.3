/* Íris F08 — título Revelio | bootstrap mínimo e sem cena ativa em repouso.
   Não modifica identidade F07; observa só os títulos reescritos pela própria F07. */
(()=>{
 'use strict';
 const LABEL='ERP Letícia Lustosa - Revelio', PREFIX='ERP Letícia Lustosa - ', WORD='Revelio';
 const CSS='css/motion-title-spell-f08.css?v=iris-f08-seven-20261113';
 const SCRIPT='js/motion-title-spell-f08-scene.js?v=iris-f08-seven-20261113';
 const state={active:false,started:0,ended:0,loaded:false,mode:'idle',lastFinish:null};
 Object.defineProperty(window,'ERPTitleSpellF08State',{value:state,configurable:true});
 let load=null, current=null, watched=null, titleWatcher=null, readyWatcher=null;
 const titleElement=()=>document.querySelector('#cr-chrome .cr-logo-main') || document.querySelector('.sidebar .brand-title');
 function attach(el){
   if(!el || el.querySelector('.erp-f08-title-word'))return;
   if(el.textContent.trim()!==LABEL)return;
   const button=document.createElement('button');
   button.type='button';button.className='erp-f08-title-word';button.textContent=WORD;
   button.setAttribute('aria-label','Ativar revelação mágica de Revelio');
   button.setAttribute('title','Revelio — toque para revelar o feitiço');
   el.replaceChildren(document.createTextNode(PREFIX),button);
 }
 function install(){
   // Caso o Chrome Cinematic surja depois da barra lateral, apenas a marca principal permanece interativa.
   if(document.querySelector('#cr-chrome .cr-logo-main')){
     const side=document.querySelector('.sidebar .brand-title');
     if(side?.querySelector('.erp-f08-title-word'))side.textContent=LABEL;
   }
   const el=titleElement();if(!el)return;
   if(watched!==el){
     titleWatcher?.disconnect();watched=el;
     titleWatcher=new MutationObserver(()=>{
       if(current && !el.contains(current.word)){cancel('identity-rewritten');}
       // Reaplica só se F07 reescrever os nós, sem inserir wrappers duplicados.
       if(!el.querySelector('.erp-f08-title-word'))attach(el);
     });
     titleWatcher.observe(el,{childList:true});
   }
   attach(el);
 }
 function lazy(){
   if(load)return load;
   load=new Promise((resolve,reject)=>{
     const link=document.createElement('link');link.rel='stylesheet';link.href=CSS;link.dataset.erpF08TitleAsset='css';
     link.onload=()=>{
       const script=document.createElement('script');script.async=true;script.src=SCRIPT;script.dataset.erpF08TitleAsset='js';
       script.onload=()=>typeof window.ERPTitularSpellF08Scene==='function'?resolve(window.ERPTitularSpellF08Scene):reject(new Error('Cena indisponível'));
       script.onerror=()=>reject(new Error('JS indisponível'));
       document.head.append(script);
     };
     link.onerror=()=>reject(new Error('CSS indisponível'));
     document.head.append(link);
   }).then(factory=>{state.loaded=true;return factory;}).catch(err=>{load=null;throw err;});
   return load;
 }
 function cancel(reason='complete'){
   if(!current)return;
   const act=current;current=null;
   try{act.scene?.dispose?.();}catch(_){ }
   try{window.ERPHiddenEchoF11?.stop(act.audio);}catch(_){ }
   try{act.abort.abort();}catch(_){ }
   // QA23-F08-TITLE-001: the reduced-motion branch has no visual scene to
   // clear aria-busy. Keep cleanup owned by the session controller for all
   // completion, cancellation, loading-error and theme-change paths.
   act.word?.removeAttribute('aria-busy');
   state.ended++;state.active=false;state.mode='idle';state.lastFinish=reason;
 }
 function hookAbort(act){
   const {signal}=act.abort;
   document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel('tab-hidden');},{signal});
   window.addEventListener('pagehide',()=>cancel('pagehide'),{signal});
   window.addEventListener('resize',()=>cancel('resize'),{signal});
   window.addEventListener('scroll',()=>cancel('scroll'),{signal,passive:true,capture:true});
   document.documentElement.addEventListener('erp-theme-changed',()=>cancel('theme-change'),{signal});
   const observer=new MutationObserver(m=>{
     if(m.some(x=>['data-erp-theme','data-glass-light','data-erp-layout','data-erp-year','data-erp-year-unconfigured'].includes(x.attributeName)))cancel('theme-or-layout-change');
   });
   observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-erp-theme','data-glass-light','data-erp-layout','data-erp-year','data-erp-year-unconfigured']});
   signal.addEventListener('abort',()=>observer.disconnect(),{once:true});
 }
 async function run(button){
   if(current||document.hidden||!button.isConnected)return;
   const act={word:button,abort:new AbortController(),scene:null,audio:null};current=act;
   state.started++;state.active=true;state.mode='loading';hookAbort(act);
   button.setAttribute('aria-busy','true');
   const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
   if(reduced){
     state.mode='reduced';
     const a=button.animate([{opacity:1},{offset:.45,opacity:.86,filter:'brightness(1.08)'},{opacity:1}],{duration:480,easing:'ease-in-out'});
     act.scene={dispose:()=>a.cancel()};
     a.finished.then(()=>{if(current===act)cancel('complete')}).catch(()=>{});
     return;
   }
   // Áudio preparado NO gesto real, jamais antes. O primeiro clique carrega o MP3.
   act.audio=window.ERPHiddenEchoF11?.prepare('title')||null;
   try{
     const [make,available]=await Promise.all([lazy(),act.audio?.readyPromise||Promise.resolve(false)]);
     if(current!==act||!button.isConnected)return;
     const startAt=available ? document.timeline.currentTime+240 : null;
     state.mode='playing';
     act.scene=make(button,()=>{if(current===act)cancel('complete')},startAt);
     if(available)window.ERPHiddenEchoF11?.schedule(act.audio,startAt);
     else if(act.audio)window.ERPHiddenEchoF11?.stop(act.audio);

   }catch(err){state.lastError=String(err?.message||err);if(current===act)cancel('load-error');}
   // The active session owns aria-busy through cancel(); no asynchronous
   // finally handler may remove it from a newer session.
 }
 function init(){
   install();
   // A barra cinematic é inserida por outro módulo; observar apenas até seu surgimento.
   if(!document.querySelector('#cr-chrome .cr-logo-main')){
     readyWatcher=new MutationObserver(()=>{if(document.querySelector('#cr-chrome .cr-logo-main')){readyWatcher.disconnect();readyWatcher=null;install();}});
     readyWatcher.observe(document.body,{childList:true});
   }
   document.addEventListener('click',event=>{
     const button=event.target.closest?.('.erp-f08-title-word');
     if(!button||button!==titleElement()?.querySelector('.erp-f08-title-word'))return;
     event.stopPropagation();run(button);
   });
   document.addEventListener('keydown',event=>{
     if(event.key==='Escape'&&current)cancel('escape');
   });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
