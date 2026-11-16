/* Íris | F08 — Revelio no título (3s): 7 símbolos SVG outline + glow respirante.
   Importado apenas depois do clique. Sem Canvas, vídeo, timers em repouso ou biblioteca externa. */
(()=>{
 'use strict';
 const NS='http://www.w3.org/2000/svg';const DURATION=3000;
 const NAMES=['coruja','varinha','oculos','cicatriz','pomo','reliquias','plataforma'];
 const EL=(tag,attrs={},parent)=>{
   const el=document.createElementNS(NS,tag);
   Object.entries(attrs).forEach(([k,v])=>k==='text'?el.textContent=v:el.setAttribute(k,v));
   parent?.append(el);return el;
 };
 function icon(type,parent){
   const svg=EL('svg',{viewBox:'0 0 48 48','aria-hidden':'true',focusable:'false'},parent);
   const p=(d,attrs={})=>EL('path',{d,...attrs},svg);
   const c=(cx,cy,r,attrs={})=>EL('circle',{cx,cy,r,...attrs},svg);
   switch(type){
     case 'coruja':
       p('M10 17 L10 8 L18 13 Q24 10 30 13 L38 8 L38 17 Q42 24 37 31 Q32 39 24 40 Q16 39 11 31 Q6 24 10 17 Z');
       p('M15 26 Q18 29 21 26 M27 26 Q30 29 33 26 M18 35 L24 40 L30 35 M22 30 L24 33 L26 30');
       c(18,23,3.2);c(30,23,3.2);c(18,23,1.1);c(30,23,1.1);break;
     case 'varinha':
       p('M9 39 L34 14 M31 11 L37 17 M8 40 L13 35');
       p('M36 4 L38 9 L43 11 L38 13 L36 18 L34 13 L29 11 L34 9 Z');
       p('M13 12 L14 15 M10 18 L7 20 M21 7 L23 4');break;
     case 'oculos':
       c(14.5,25,10);c(34.5,25,10);p('M24.5 25 Q24.5 20 24.5 20 M4.5 22 L1 20 M44.5 22 L47 20');break;
     case 'cicatriz':
       p('M27 4 L13 23 H24 L18 44 L39 19 H26 Z');break;
     case 'pomo':
       c(24,27,7);p('M17 24 C9 11 3 11 4 24 Q12 19 17 28');
       p('M31 24 C39 11 45 11 44 24 Q36 19 31 28');
       p('M5 18 Q12 20 17 25 M43 18 Q36 20 31 25 M21 26 Q24 23 27 26');break;
     case 'reliquias':
       p('M24 4 L45 42 H3 Z M24 4 V42');c(24,29,11);break;
     case 'plataforma':
       EL('rect',{x:7,y:9,width:34,height:30,rx:4},svg);
       EL('text',{x:24,y:31,'font-size':20,'text-anchor':'middle',text:'9¾'},svg);break;
   }
   return svg;
 }
 function parseRGB(s){
   const m=String(s||'').match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
   return m?[+m[1],+m[2],+m[3]]:null;
 }
 function luminance(a){const v=a.map(x=>{const t=x/255;return t<=.04045?t/12.92:((t+.055)/1.055)**2.4});return .2126*v[0]+.7152*v[1]+.0722*v[2]}
 function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
 const mix=(a,b,t)=>a.map((v,i)=>Math.round(v*(1-t)+b[i]*t));
 const rgb=a=>`rgb(${a.map(Math.round).join(',')})`;
 function themeInk(anchor){
   const probe=document.createElement('span');
   probe.style.cssText='position:absolute;opacity:0;pointer-events:none;color:var(--cr-accent,var(--primary,#8c72cd));background:var(--cr-panel,#ffffff);';
   anchor.append(probe);
   const s=getComputedStyle(probe),accent=parseRGB(s.color)||[140,114,205],panel=parseRGB(s.backgroundColor)||[255,255,255];
   probe.remove();
   const dest=luminance(panel)>.22?[0,0,0]:[255,255,255];
   let ink=accent;
   if(contrast(ink,panel)<4.5)for(let i=1;i<=100;i++){ink=mix(accent,dest,i/100);if(contrast(ink,panel)>=4.5)break;}
   return {accent:rgb(accent),ink:rgb(ink),soft:`rgba(${accent.join(',')},.35)`,faint:`rgba(${accent.join(',')},.14)`};
 }
 function safePoints(size,target,random){
   const {innerWidth:w,innerHeight:h}=window;
   const seeds=[[.13,.22],[.48,.20],[.85,.23],[.2,.49],[.81,.51],[.31,.76],[.71,.76]];
   const points=[];
   const sensitive=[...document.querySelectorAll('button,input,textarea,select,a,h1,h2,h3,h4,h5,h6,p,label,dt,dd,th,td,[role="button"],[contenteditable="true"],.page-title,.side-card-title,.erp-f08-title-word')]
     .filter(e=>!e.closest('.erp-f08-symbol-field')).map(e=>e.getBoundingClientRect())
     .filter(r=>r.width&&r.height&&r.bottom>0&&r.top<h);
   sensitive.push(target.getBoundingClientRect());
   function clear(x,y){
     const rect={left:x-size*.55,top:y-size*.55,right:x+size*.55,bottom:y+size*.55};
     return !sensitive.some(r=>rect.left<r.right+7&&rect.right>r.left-7&&rect.top<r.bottom+7&&rect.bottom>r.top-7)
       && !points.some(p=>Math.hypot(p.x-x,p.y-y)<size*1.5);
   }
   for(const [fx,fy] of seeds){
     const offX=Math.max(size/2+8,Math.min(w-size/2-8,w*fx));
     const offY=Math.max(size/2+8,Math.min(h-size/2-8,h*fy));
     let selected=null;
     // Jitter discreto; sete setores distintos garantem distribuição equilibrada.
     for(let attempt=0;attempt<40;attempt++){
       const t=1;
       const x=Math.min(w-size/2-6,Math.max(size/2+6,offX+(random()-.5)*w*.17*t));
       const y=Math.min(h-size/2-6,Math.max(size/2+6,offY+(random()-.5)*h*.15*t));
       if(clear(x,y)){selected={x,y};break;}
     }
     // Se a tela for muito pequena/ocupada, não comprometer os controles críticos.
     // Fallback em telas densas: escolher a região de menor interferência.
     // Mantém os sete símbolos, mas penaliza fortemente campos, links e textos.
     if(!selected){
       let best={x:offX,y:offY,cost:Infinity};
       for(let gx=0;gx<17;gx++)for(let gy=0;gy<13;gy++){
         const x=size/2+7+(w-size-14)*(gx+.5)/17;
         const y=size/2+7+(h-size-14)*(gy+.5)/13;
         let cost=Math.hypot((x-offX)/Math.max(w,.1),(y-offY)/Math.max(h,.1))*12;
         const r={left:x-size*.55,top:y-size*.55,right:x+size*.55,bottom:y+size*.55};
         for(const t of sensitive){
           if(r.left<t.right+7&&r.right>t.left-7&&r.top<t.bottom+7&&r.bottom>t.top-7)cost+=150;
         }
         for(const t of points){const d=Math.hypot(t.x-x,t.y-y);if(d<size*1.55)cost+=450+(size*1.55-d)*8;}
         if(cost<best.cost)best={x,y,cost};
       }
       selected={x:best.x,y:best.y};
     }
     points.push(selected);
   }
   return points;
 }
 function seeded(seed){let x=seed>>>0;return()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296}}
 window.ERPTitularSpellF08Scene=(anchor,finished,startAt)=>{
   let disposed=false;const animations=[];let timeout=null;
   const stage=document.createElement('div');stage.className='erp-f08-symbol-field';stage.setAttribute('aria-hidden','true');
   const {accent,ink,soft,faint}=themeInk(anchor);
   stage.style.setProperty('--f08-symbol-ink',ink);stage.style.setProperty('--f08-neon-soft',soft);
   stage.style.setProperty('--f08-neon-faint',faint);
   anchor.style.setProperty('--f08-word-ink',ink);anchor.style.setProperty('--f08-neon-soft',soft);
   anchor.style.setProperty('--f08-neon-faint',faint);
   const original=anchor.textContent;
   const sweep=document.createElement('span');sweep.className='erp-f08-title-sweep';sweep.setAttribute('aria-hidden','true');
   anchor.append(sweep);
   anchor.classList.add('erp-f08-title-active');
   const main=anchor.animate([
     {offset:0,opacity:.62,clipPath:'inset(0 88% 0 0)',filter:'brightness(1)'},
     {offset:.20,opacity:.95,clipPath:'inset(0 14% 0 0)',filter:'brightness(1.08)'},
     {offset:.35,opacity:1,clipPath:'inset(0 0 0 0)',filter:'brightness(1.18)'},
     {offset:.75,opacity:1,clipPath:'inset(0 0 0 0)',filter:'brightness(1.05)'},
     {offset:1,opacity:1,clipPath:'inset(0 0 0 0)',filter:'brightness(1)'}
   ],{duration:DURATION,easing:'cubic-bezier(.22,.58,.28,1)',fill:'forwards'});
   animations.push(main);
   animations.push(sweep.animate([
     {opacity:0,transform:'translateX(-90%)'},{offset:.12,opacity:.88,transform:'translateX(-38%)'},
     {offset:.36,opacity:.8,transform:'translateX(8%)'},{offset:.56,opacity:0,transform:'translateX(85%)'},
     {opacity:0,transform:'translateX(85%)'}
   ],{duration:DURATION,easing:'ease-in-out',fill:'forwards'}));
   const random=seeded((Date.now()^Math.round(Math.random()*1e8))>>>0);
   const size=Math.max(23,Math.min(36,window.innerWidth/38));
   const positions=safePoints(size,anchor,random);
   positions.forEach((pt,i)=>{
     const slot=document.createElement('div');slot.className='erp-f08-symbol-slot';slot.dataset.symbol=NAMES[i];
     slot.style.setProperty('--f08-size',`${size}px`);slot.style.left=`${pt.x}px`;slot.style.top=`${pt.y}px`;
     const svg=icon(NAMES[i],slot);stage.append(slot);
     const entry=Math.min(370,115+i*45),exit=2600-i*20;
     animations.push(slot.animate([
       {opacity:0,offset:0,transform:'translate(-50%,-50%) translateY(9px) scale(.84)'},
       {opacity:.72,offset:(entry+360)/DURATION,transform:'translate(-50%,-50%) translateY(0px) scale(1)'},
       {opacity:.68,offset:exit/DURATION,transform:'translate(-50%,-50%) translateY(-3px) scale(1.015)'},
       {opacity:0,offset:1,transform:'translate(-50%,-50%) translateY(-8px) scale(.98)'}
     ],{duration:DURATION,easing:'ease-in-out',fill:'forwards'}));
     const period=1180+(i%4)*140;
     animations.push(svg.animate([
       {opacity:.78,filter:`drop-shadow(0 0 1.7px ${soft})`},
       {opacity:1,filter:`drop-shadow(0 0 3.8px ${soft}) drop-shadow(0 0 6px ${faint})`}
     ],{duration:period,delay:i*95,direction:'alternate',iterations:Infinity,easing:'ease-in-out'}));
   });
   document.body.append(stage);
   // F11: uma origem WAAPI comum para os efeitos já existentes; nenhuma keyframe alterada.
   if(Number.isFinite(startAt))for(const a of animations){try{a.startTime=startAt;}catch(_){ }}
   const anticipation=Number.isFinite(startAt)?Math.max(0,startAt-document.timeline.currentTime):0;
   timeout=window.setTimeout(()=>{if(!disposed)finished();},DURATION+30+anticipation);
   return {
     get symbols(){return stage.querySelectorAll('.erp-f08-symbol-slot').length},
     dispose(){
       if(disposed)return;disposed=true;window.clearTimeout(timeout);
       animations.forEach(a=>{try{a.cancel()}catch(_){}});animations.length=0;
       stage.remove();sweep.remove();anchor.classList.remove('erp-f08-title-active');
       ['--f08-word-ink','--f08-neon-soft','--f08-neon-faint'].forEach(k=>anchor.style.removeProperty(k));
       if(anchor.textContent!==original)anchor.textContent=original;
       anchor.removeAttribute('aria-busy');
     }
   };
 };
})();
