/* ERP v2.3 | F08 REV02B | Íris — controlador mínimo: nenhum bundle de cena no carregamento. */
(() => {
  'use strict';
  const ID = 'erp-f07-about-codename';
  const DIALOG = 'erp-f07-about-dialog';
  const SCENE_JS = 'js/motion-hidden-spell-f08-scene.js?v=iris-f08-rev02b-20261113';
  const SCENE_CSS = 'css/motion-hidden-spell-f08.css?v=iris-f08-rev02b-20261113';
  const status = {active:false, starts:0, ends:0, loaded:false, lastCancel:null, durationMs:10000, mode:'idle'};
  Object.defineProperty(window,'ERPHiddenSpellF08State',{value:status,configurable:false,enumerable:false});
  let loader = null, styleLoader = null, active = null, controller = null, stopHooks = null;
  const target = () => document.getElementById(ID);
  const ctx = () => document.getElementById(DIALOG);
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function loadResources() {
    if (!styleLoader) {
      styleLoader = new Promise((resolve,reject) => {
        const link = document.createElement('link'); link.rel='stylesheet'; link.href=SCENE_CSS; link.dataset.erpF08Style='';
        link.addEventListener('load',resolve,{once:true}); link.addEventListener('error',()=>reject(new Error('CSS F08 indisponível')),{once:true});
        document.head.append(link);
      });
    }
    if (!loader) loader = new Promise((resolve,reject) => {
      if (typeof window.ERPHiddenSpellF08Scene === 'function') return resolve(window.ERPHiddenSpellF08Scene);
      const script = document.createElement('script'); script.src=SCENE_JS; script.dataset.erpF08Scene='';script.async=true;
      script.addEventListener('load',()=> typeof window.ERPHiddenSpellF08Scene==='function' ? resolve(window.ERPHiddenSpellF08Scene) : reject(new Error('Cena F08 ausente')), {once:true});
      script.addEventListener('error',()=>reject(new Error('JS F08 indisponível')),{once:true});
      document.head.append(script);
    });
    return Promise.all([styleLoader, loader]).then(([,make])=>{status.loaded=true;return make;});
  }
  // Paleta da própria identidade F07, resolvida só após o clique; sem tabela paralela de temas.
  // --erp-f07-accent acompanha os 11 temas e as duas iluminações do Glass.
  function readRgb(value){
    const match = String(value || '').match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
    return match ? [Number(match[1]),Number(match[2]),Number(match[3])] : null;
  }
  const blend=(a,b,t)=>a.map((v,i)=>Math.round(v*(1-t)+b[i]*t));
  const rgb=a=>`rgb(${a.map(v=>Math.round(v)).join(', ')})`;
  const rgba=(a,alpha)=>`rgba(${a.map(v=>Math.round(v)).join(', ')}, ${alpha})`;
  function luminance(a){
    const c=a.map(v=>{const x=v/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});
    return .2126*c[0]+.7152*c[1]+.0722*c[2];
  }
  function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
  function themePalette(el){
    const probe=document.createElement('span');
    probe.setAttribute('aria-hidden','true');
    probe.style.cssText='position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden;color:var(--erp-f07-accent,var(--cr-accent,#a68be4));background-color:var(--cr-panel2,var(--cr-panel,#fff))';
    el.append(probe);
    const cs=getComputedStyle(probe);
    const accent=readRgb(cs.color)||[166,139,228];
    const bg=readRgb(cs.backgroundColor)||[255,255,255];
    probe.remove();
    const toward=luminance(bg)>.24?[0,0,0]:[255,255,255];
    let ink=accent;
    // Cor temática continua sendo a origem; ajuste mínimo para legibilidade no painel real.
    if(contrast(ink,bg)<4.7){
      for(let k=1;k<=100;k++){
        ink=blend(accent,toward,k/100);
        if(contrast(ink,bg)>=4.7)break;
      }
    }
    const flash=blend(ink,toward,.16);
    const values={
      '--erp-f08-theme-accent':rgb(accent),
      '--erp-f08-theme-ink':rgb(ink),
      '--erp-f08-theme-flash':rgb(flash),
      '--erp-f08-theme-glow':rgba(accent,.46),
      '--erp-f08-theme-glow-strong':rgba(accent,.78),
      '--erp-f08-theme-glow-soft':rgba(accent,.23),
      '--erp-f08-theme-shine':rgba(flash,.82),
      '--erp-f08-theme-shine-soft':rgba(accent,.35),
      '--erp-f08-theme-shine-haze':rgba(accent,.10)
    };
    for(const [key,val] of Object.entries(values))el.style.setProperty(key,val);
    status.lastPalette={theme:document.documentElement.dataset.erpTheme||'original',
      light:document.documentElement.dataset.glassLight||'',accent:rgb(accent),ink:rgb(ink),
      panel:rgb(bg),contrast:Number(contrast(ink,bg).toFixed(2))};
    return Object.keys(values);
  }
  const PALETTE_KEYS=['--erp-f08-theme-accent','--erp-f08-theme-ink','--erp-f08-theme-flash',
    '--erp-f08-theme-glow','--erp-f08-theme-glow-strong','--erp-f08-theme-glow-soft',
    '--erp-f08-theme-shine','--erp-f08-theme-shine-soft','--erp-f08-theme-shine-haze'];
  function originalText(el){ return el?.dataset.erpF08OriginalText || (el?.textContent || 'Revelio'); }
  function mountWord(el){
    if(!el) return null;
    const text = originalText(el).trim() || 'Revelio';
    el.dataset.erpF08OriginalText = text;
    el.textContent = '';
    const shine = document.createElement('span'); shine.className='erp-f08-shine'; shine.setAttribute('aria-hidden','true');
    const word = document.createElement('span'); word.className='erp-f08-word'; word.setAttribute('aria-hidden','true');
    for(const ch of text){
      const s = document.createElement('span'); s.className='erp-f08-letter'; s.dataset.char=ch; s.textContent=ch; word.appendChild(s);
    }
    el.append(shine, word);
    return {word, shine, letters:[...word.children]};
  }
  function restoreWord(el){
    if(!el) return;
    const txt = originalText(el);
    el.textContent = txt;
  }
  function playWordTransition(el,startAt){
    const mounted = mountWord(el); if(!mounted) return {cancel(){}, finish(){}};
    const anims = [], timers = []; const {letters, shine} = mounted;
    const anticipation=Number.isFinite(startAt)?Math.max(0,startAt-document.timeline.currentTime):0;
    letters.forEach((letter,i)=>{
      const delay = 2280 + i*135;
      letter.classList.remove('erp-f08-gold','erp-f08-lift');
      anims.push(letter.animate([
        { color:'var(--erp-f08-letter-base,var(--cr-ink,var(--text,#202136)))', textShadow:'0 0 0 transparent', filter:'none', transform:'translateY(0) scale(1)' },
        { offset:.12, color:'var(--erp-f08-letter-base,var(--cr-ink,var(--text,#202136)))', textShadow:'0 0 0 transparent', filter:'none', transform:'translateY(0) scale(1)' },
        { offset:.38, color:'var(--erp-f08-theme-flash)', textShadow:'0 0 8px var(--erp-f08-theme-glow-strong)', filter:'drop-shadow(0 0 4px var(--erp-f08-theme-glow))', transform:'translateY(-.03em) scale(1.02)' },
        { offset:.72, color:'var(--erp-f08-theme-ink)', textShadow:'0 0 1px var(--erp-f08-theme-shine), 0 0 7px var(--erp-f08-theme-glow)', filter:'drop-shadow(0 0 4px var(--erp-f08-theme-glow))', transform:'translateY(-.02em) scale(1.016)' },
        { color:'var(--erp-f08-theme-ink)', textShadow:'0 0 1px var(--erp-f08-theme-shine), 0 0 6px var(--erp-f08-theme-glow-soft)', filter:'drop-shadow(0 0 4px var(--erp-f08-theme-glow-soft))', transform:'translateY(0) scale(1)' }
      ],{duration:2100, delay, easing:'cubic-bezier(.24,.73,.24,1)', fill:'forwards'}));
      timers.push(window.setTimeout(()=>{ if(letter.isConnected){ letter.classList.add('erp-f08-gold','erp-f08-lift'); } }, delay+720+anticipation));
      timers.push(window.setTimeout(()=>{ if(letter.isConnected){ letter.classList.remove('erp-f08-lift'); } }, delay+1450+anticipation));
    });
    anims.push(shine.animate([
      { opacity:0, transform:'translateX(-72%) skewX(-12deg)' },
      { offset:.15, opacity:0 },
      { offset:.28, opacity:.95, transform:'translateX(-28%) skewX(-12deg)' },
      { offset:.54, opacity:.88, transform:'translateX(12%) skewX(-12deg)' },
      { offset:.76, opacity:.25, transform:'translateX(44%) skewX(-12deg)' },
      { opacity:0, transform:'translateX(72%) skewX(-12deg)' }
    ],{duration:3100, delay:2500, easing:'cubic-bezier(.2,.7,.25,1)', fill:'forwards'}));
    // F11: all seven staggered letters + shine start from scene T0.
    if(Number.isFinite(startAt))for(const a of anims){try{a.startTime=startAt;}catch(_){ }}
    return {
      cancel(){ for(const t of timers)clearTimeout(t); for(const a of anims){ try{a.cancel();}catch(_){} } },
      finish(){ for(const t of timers)clearTimeout(t); for(const a of anims){ try{a.finish();}catch(_){} } }
    };
  }
  function disposeHooks() { if(stopHooks){stopHooks();stopHooks=null;} }
  function cleanup(reason='complete') {
    const act=active; active=null;
    if (controller) { const c=controller;controller=null; try{c.dispose();}catch(_){} }
    if (act?.audio) { try{window.ERPHiddenEchoF11?.stop(act.audio);}catch(_){} }
    disposeHooks();
    const el=target();
    if(el){el.classList.remove('erp-f08-casting','erp-f08-reduced');el.removeAttribute('aria-busy');restoreWord(el);for(const key of PALETTE_KEYS)el.style.removeProperty(key);}
    if(act){status.ends++;status.lastCancel=reason;}
    status.active=false; status.mode='idle';
  }
  function watch() {
    const dialog=ctx();
    const html=document.documentElement;
    const observer=new MutationObserver(mutations=>{
      if(mutations.some(m=>['data-erp-theme','data-erp-year','data-erp-layout','data-erp-year-unconfigured'].includes(m.attributeName))) cleanup('configuration-change');
    });
    observer.observe(html,{attributes:true,attributeFilter:['data-erp-theme','data-erp-year','data-erp-layout','data-erp-year-unconfigured']});
    const onClose=()=>cleanup('dialog-closed');
    const onHide=()=>{if(document.hidden)cleanup('tab-hidden');};
    const onLeave=()=>cleanup('page-leave');
    dialog?.addEventListener('close',onClose);
    window.addEventListener('pagehide',onLeave);
    document.addEventListener('visibilitychange',onHide);
    window.addEventListener('hashchange',onLeave);
    stopHooks=()=>{
      observer.disconnect();dialog?.removeEventListener('close',onClose);
      window.removeEventListener('pagehide',onLeave);
      document.removeEventListener('visibilitychange',onHide);
      window.removeEventListener('hashchange',onLeave);
    };
  }
  async function activate() {
    const el=target(); const dialog=ctx();
    if(!el || !dialog?.open || active || document.hidden) return;
    const act={audio:null};active=act;status.active=true;status.starts++;status.lastCancel=null;
    el.setAttribute('aria-busy','true');watch();
    themePalette(el);
    if(reduced()) {
      status.mode='reduced';mountWord(el);el.classList.add('erp-f08-reduced');
      const a=el.animate([{color:'var(--cr-ink,var(--text,#202136))',filter:'brightness(1)',textShadow:'0 0 0px transparent'},{offset:.45,color:'var(--erp-f08-theme-ink)',filter:'brightness(1.15)',textShadow:'0 0 10px var(--erp-f08-theme-glow-strong)'},{color:'var(--cr-ink,var(--text,#202136))',filter:'brightness(1)',textShadow:'0 0 0px transparent'}],{duration:750,easing:'ease-in-out'});
      controller={dispose:()=>a.cancel()};
      a.finished.then(()=>{if(active===act)cleanup('complete');}).catch(()=>{});
      return;
    }
    status.mode='loading';
    act.audio=window.ERPHiddenEchoF11?.prepare('about')||null;
    try {
      const [make,available]=await Promise.all([loadResources(),act.audio?.readyPromise||Promise.resolve(false)]);
      if(active!==act || !dialog.open || !el.isConnected) return;
      const startAt=available?document.timeline.currentTime+240:null;
      el.classList.add('erp-f08-casting');status.mode='playing';
      const wordFx = playWordTransition(el,startAt);
      controller=make(el,()=>{if(active===act)cleanup('complete');},wordFx,startAt);
      if(available)window.ERPHiddenEchoF11?.schedule(act.audio,startAt);
      else if(act.audio)window.ERPHiddenEchoF11?.stop(act.audio);
    } catch(error) {
      if(active===act){status.lastError=String(error?.message||error);cleanup('resource-failure');}
    }
  }
  function bind() {
    const el=target();if(!el)return;
    el.dataset.erpF08OriginalText = (el.textContent || 'Revelio').trim() || 'Revelio';
    el.classList.add('erp-f08-trigger');el.setAttribute('role','button');el.tabIndex=0;
    el.setAttribute('aria-label','Ativar The Hidden Spell na palavra Revelio');
    el.addEventListener('click',activate);
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
    ctx()?.addEventListener('close',()=>{if(active) cleanup('dialog-closed');});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind,{once:true}); else bind();
})();
