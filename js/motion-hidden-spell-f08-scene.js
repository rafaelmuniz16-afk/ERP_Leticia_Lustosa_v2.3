/* ERP v2.3 — Íris | F08 The Hidden Spell REV02
 * Cena SVG + DOM / Web Animations API, sob demanda e totalmente localizada.
 * Referência oficial: gemini_generated_video_20d081c1.mp4, 10s @ 24fps.
 * Sem video-player, Canvas, WebGL, áudio ou efeitos fora do codinome.
 */
(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg', DURATION=10000;
  const easing='cubic-bezier(.2,.66,.27,1)';
  function node(tag, attrs={}, parent) {
    const e=document.createElementNS(NS,tag);
    for(const [k,v] of Object.entries(attrs)){
      if(k==='text') e.textContent=String(v);
      else e.setAttribute(k,String(v));
    }
    if(parent)parent.append(e);
    return e;
  }
  function pathOfRing(cx,cy,rx,ry,seed=0,rough=5){
    const parts=[];const n=88;
    for(let j=0;j<=n;j++){
      const angle=j/n*Math.PI*2;
      const shake=(Math.sin(j*2.9+seed)*.47+Math.sin(j*7.15+seed*2)*.25+Math.sin(j*1.26+seed*3)*.28)*rough;
      const x=cx+(rx+shake)*Math.cos(angle), y=cy+(ry+shake*.65)*Math.sin(angle);
      parts.push(`${j?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return parts.join(' ')+' Z';
  }
  function seeded(seed){let s=seed>>>0;return()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};}
  window.ERPHiddenSpellF08Scene = function makeScene(anchor,completed,wordFx,startAt){
    const animations=[];let closed=false,timeout=null;
    const range=document.createRange();range.selectNodeContents(anchor);
    const r=range.getBoundingClientRect(),width=Math.max(102,Math.min(172,r.width*2.06));
    const holder=document.createElement('span');holder.className='erp-f08-stage';holder.setAttribute('aria-hidden','true');
    const box=anchor.getBoundingClientRect();
    holder.style.left=(r.left-box.left+r.width/2).toFixed(1)+'px';
    holder.style.setProperty('--erp-f08-width',width.toFixed(1)+'px');
    holder.style.setProperty('--erp-f08-height',(width*.62).toFixed(1)+'px');
    const svg=node('svg',{viewBox:'0 0 300 178',preserveAspectRatio:'xMidYMid meet','aria-hidden':'true',focusable:'false'},holder);
    const defs=node('defs',{},svg);
    function grad(id,stops){const g=node('radialGradient',{id},defs);for(const [offset,color,opacity] of stops)node('stop',{offset,'stop-color':color,'stop-opacity':opacity??1},g);}
    function linear(id,stops){const g=node('linearGradient',{id,x1:'0%',y1:'0%',x2:'100%',y2:'100%'},defs);for(const [offset,color,opacity] of stops)node('stop',{offset,'stop-color':color,'stop-opacity':opacity??1},g);}
    grad('f08-back',[["0%",'#2a1f48',.82],["56%",'#222747',.53],["100%",'#181b37',0]]);
    grad('f08-blue',[["0%",'#c2f5ff',.88],["26%",'#5bcbff',.68],["70%",'#657aff',.28],["100%",'#3b4eaa',0]]);
    grad('f08-gold',[["0%",'#fff1a1',.96],["24%",'#ffe087',.75],["64%",'#e9a633',.28],["100%",'#e8ad48',0]]);
    linear('f08-ink',[["0%",'#f7f8fc'],["34%",'#c9edff'],["61%",'#d9b768'],["100%",'#ffedb1']]);
    linear('f08-goldstroke',[["0%",'#e0a84b',0],["25%",'#fff6c6',.98],["54%",'#ffd06b',.96],["100%",'#b3772d',0]]);
    function filter(id,blur){const f=node('filter',{id,x:'-130%',y:'-170%',width:'360%',height:'440%'},defs);node('feGaussianBlur',{stdDeviation:blur,result:'glow'},f);const merge=node('feMerge',{},f);node('feMergeNode',{in:'glow'},merge);node('feMergeNode',{in:'SourceGraphic'},merge);}
    filter('f08-blur',3.3);filter('f08-soft',1.6);
    const backdrop=node('ellipse',{cx:150,cy:87,rx:123,ry:73,fill:'url(#f08-back)',opacity:0},svg);
    const blueFog=node('ellipse',{cx:148,cy:87,rx:112,ry:65,fill:'url(#f08-blue)',opacity:0},svg);
    const goldFog=node('ellipse',{cx:150,cy:95,rx:112,ry:65,fill:'url(#f08-gold)',opacity:0},svg);
    const lowerCircle=node('g',{opacity:0},svg);
    node('ellipse',{cx:150,cy:153,rx:95,ry:13,fill:'none',stroke:'#a8eaff','stroke-width':1.1,opacity:.66},lowerCircle);
    node('ellipse',{cx:150,cy:153,rx:69,ry:8,fill:'none',stroke:'#c2edff','stroke-width':.7,opacity:.69},lowerCircle);
    node('path',{d:'M56 153 H246 M150 139 V167 M83 145 Q150 162 218 145 M99 142 Q150 163 201 142',fill:'none',stroke:'#c3e5f4','stroke-width':.7,opacity:.5},lowerCircle);
    const rings=node('g',{opacity:0},svg);
    node('path',{d:pathOfRing(150,87,98,55,2,6.9),fill:'none',stroke:'#76e3ff','stroke-width':4.5,opacity:.68,filter:'url(#f08-blur)'},rings);
    node('path',{d:pathOfRing(150,87,98,55,2,5.3),fill:'none',stroke:'#b6f4ff','stroke-width':2.8,opacity:.92},rings);
    node('path',{d:pathOfRing(150,87,88,48,5,4),fill:'none',stroke:'#5c91e7','stroke-width':2.4,opacity:.67},rings);
    node('ellipse',{cx:150,cy:87,rx:99,ry:56,fill:'none',stroke:'#b7ecff','stroke-width':.85,opacity:.75},rings);
    const goldenTraces=node('g',{opacity:0},svg);
    node('path',{d:'M28 116 C64 144 107 103 147 119 S226 110 271 101',fill:'none',stroke:'url(#f08-goldstroke)','stroke-width':6,filter:'url(#f08-blur)'},goldenTraces);
    node('path',{d:'M28 116 C64 144 107 103 147 119 S226 110 271 101',fill:'none',stroke:'#ffe9a3','stroke-width':1.9},goldenTraces);
    node('path',{d:'M46 110 C84 123 111 133 149 118 S210 112 248 120',fill:'none',stroke:'#b5dffe','stroke-width':1.25,opacity:.9},goldenTraces);
    const runicOrbit=node('g',{opacity:0},svg);
    node('ellipse',{cx:150,cy:89,rx:122,ry:72,fill:'none',stroke:'#e7b96d','stroke-width':.9,'stroke-dasharray':'2 5',opacity:.78},runicOrbit);
    const runes='ᚠᛖᚱᛟᛚᛁᛟᛃᚷᚹᚲᛗᛈᛉᚹᛞᚠᚢᚱᚺᚾᛇᛒᛋᚦᛟᛖᛟ';
    for(let i=0;i<28;i++){
      const a=i/28*2*Math.PI-Math.PI/2;
      node('text',{x:(150+119*Math.cos(a)).toFixed(1),y:(89+69*Math.sin(a)).toFixed(1),
        'font-size':13.3,'text-anchor':'middle','dominant-baseline':'middle',fill:'#ffe4a4',
        transform:`rotate(${(a*180/Math.PI+90).toFixed(1)} ${(150+119*Math.cos(a)).toFixed(1)} ${(89+69*Math.sin(a)).toFixed(1)})`,
        opacity:.92,text:runes[i]},runicOrbit);
    }
    const constellations=node('g',{opacity:0},svg);
    for (const d of ['M29 96 L45 72 L63 84 L68 62','M222 64 L249 46 L268 67 L259 98','M88 26 L102 17 L115 25']) {
      node('path',{d,fill:'none',stroke:'#c3e6ff','stroke-width':.7,opacity:.85},constellations);
    }
    for (const [x,y] of [[29,96],[45,72],[63,84],[68,62],[222,64],[249,46],[268,67],[259,98],[88,26],[102,17],[115,25]]) {
      node('circle',{cx:x,cy:y,r:1.4,fill:'#ebfbff'},constellations);
    }
    const deer=node('g',{opacity:0,transform:'translate(222 37) scale(.43)'},svg);
    node('path',{d:'M-24 46 C-26 35 -16 23 -6 20 L4 18 L19 14 L25 2 M-6 20 L-16 0 L-28 -13 M-16 0 L-6 -11 L-1 -23 M19 14 L30 -10 L39 -21 M30 -10 L19 -24 L15 -34 M-24 46 L-44 58 M-23 42 L-4 56 L18 53 L29 71',fill:'none',stroke:'#c8f0ff','stroke-width':2.8,'stroke-linecap':'round','stroke-linejoin':'round',filter:'url(#f08-soft)'},deer);
    node('path',{d:'M-24 46 C-17 42 -12 43 -5 45 L-2 56 M-23 46 L-34 62 M-5 45 L8 35 L24 36',fill:'none',stroke:'#c9efff','stroke-width':2.1,'stroke-linecap':'round'},deer);
    const emblem=node('g',{opacity:0},svg);
    node('path',{d:'M57 43 L72 37 L88 43 L90 62 Q72 77 55 62 Z',fill:'none',stroke:'#f6d99e','stroke-width':1.1},emblem);
    node('text',{x:72,y:56,'text-anchor':'middle','font-size':17,fill:'#ffe6a5',text:'9¾'},emblem);
    const mark=node('g',{opacity:0},svg);
    node('path',{d:'M119 41 C128 35 134 33 142 38 M153 41 C160 34 168 35 176 39',fill:'none',stroke:'#f7cf81','stroke-width':1.3},mark);
    node('circle',{cx:147,cy:40,r:2,fill:'#ffe99b'},mark);
    const textAura=node('g',{opacity:0},svg);
    node('ellipse',{cx:150,cy:97,rx:96,ry:22,fill:'url(#f08-gold)',opacity:.0,filter:'url(#f08-soft)'},textAura);
    node('path',{d:'M57 98 Q103 87 150 95 T244 94',fill:'none',stroke:'#ffeab0','stroke-width':1.4,opacity:.88,filter:'url(#f08-soft)'},textAura);
    const lateHalo=node('g',{opacity:0},svg);
    node('ellipse',{cx:150,cy:93,rx:121,ry:68,fill:'none',stroke:'#fff5cc','stroke-width':2.3,filter:'url(#f08-soft)'},lateHalo);
    node('ellipse',{cx:150,cy:93,rx:116,ry:64,fill:'none',stroke:'#edb95c','stroke-width':1.35,'stroke-dasharray':'5 4',opacity:.78},lateHalo);
    const winged=node('g',{opacity:0},svg);
    const flying=node('g',{transform:'translate(210 62)'},winged);
    node('path',{d:'M0 2 Q-22 -15 -39 -5 Q-23 -4 -15 6 Q-26 3 -33 11 Q-10 11 0 5 M0 2 Q22 -15 39 -5 Q23 -4 15 6 Q26 3 33 11 Q10 11 0 5',fill:'#e3b251',stroke:'#fff5bd','stroke-width':.9},flying);
    node('circle',{cx:0,cy:3,r:8.1,fill:'#c48a30',stroke:'#fff1a7','stroke-width':1.3},flying);
    node('circle',{cx:-2,cy:1,r:3,fill:'#ffe7a7'},flying);
    const sparks=node('g',{},svg);const rnd=seeded(8032026);
    for(let i=0;i<78;i++){
      const a=rnd()*Math.PI*2;
      const rr=(.43+rnd()*.63);
      const x=150+Math.cos(a)*128*rr, y=87+Math.sin(a)*70*rr;
      const size=.58+rnd()*2.1, bright=rnd();
      const dot=node(bright>.78?'path':'circle',bright>.78 ? {
        d:`M${x.toFixed(1)} ${(y-size*2).toFixed(1)} V${(y+size*2).toFixed(1)} M${(x-size*2).toFixed(1)} ${y.toFixed(1)} H${(x+size*2).toFixed(1)}`,
        stroke:bright>.91?'#fff5bc':'#dbb964','stroke-width':.62,fill:'none',opacity:0
      }:{cx:x.toFixed(2),cy:y.toFixed(2),r:size.toFixed(2),fill:i%4?'#ffe49e':'#b2edff',opacity:0},sparks);
      const at=2600+rnd()*5800;const dur=450+rnd()*1200;
      tween(dot,[{opacity:0,transform:'scale(.25)'},{offset:.42,opacity:(.4+rnd()*.55).toFixed(2),transform:'scale(1.25)'},{opacity:0,transform:'scale(.5)'}],{delay:at,duration:dur});
    }
    const radiants=node('g',{},svg);
    for(let i=0;i<36;i++){
      const a=i/36*Math.PI*2+(rnd()-.5)*.15;
      const r1=80+rnd()*18,r2=113+rnd()*24;
      const s=node('line',{x1:(150+r1*Math.cos(a)).toFixed(2),y1:(86+r1*.57*Math.sin(a)).toFixed(2),
        x2:(150+r2*Math.cos(a)).toFixed(2),y2:(86+r2*.57*Math.sin(a)).toFixed(2),
        stroke:i%4?'#a5e9ff':'#ffe09b','stroke-width':i%3?1:.5,opacity:0},radiants);
      tween(s,[{opacity:0},{offset:.38,opacity:.85},{opacity:0}],{delay:1600+rnd()*1250,duration:500+rnd()*650});
    }
    function tween(el,frames,options){
      const a=el.animate(frames,{duration:options.duration,delay:options.delay||0,fill:'both',easing:options.easing||'linear'});
      animations.push(a);return a;
    }
    // Linha temporal derivada do vídeo de 10 segundos; tempos em milissegundos.
    tween(backdrop,[{opacity:0},{offset:.15,opacity:.28},{offset:.58,opacity:.42},{offset:.88,opacity:.72},{opacity:0}],{delay:200,duration:9800});
    tween(blueFog,[{opacity:0,transform:'scale(.25)'},{offset:.22,opacity:.65,transform:'scale(1)'},{offset:.68,opacity:.18,transform:'scale(1.12)'},{opacity:0,transform:'scale(1.25)'}],{delay:900,duration:7800});
    tween(goldFog,[{opacity:0},{offset:.42,opacity:.12},{offset:.77,opacity:.54},{opacity:0}],{delay:2400,duration:7600});
    tween(rings,[{opacity:0,transform:'scale(.23) rotate(-14deg)'},{offset:.26,opacity:1,transform:'scale(.97) rotate(9deg)'},{offset:.58,opacity:.68,transform:'scale(1.02) rotate(21deg)'},{opacity:0,transform:'scale(1.25) rotate(42deg)'}],{delay:1150,duration:5900});
    tween(goldenTraces,[{opacity:0,transform:'translateX(-33px)'},{offset:.3,opacity:.9,transform:'translateX(0)'},{offset:.75,opacity:.46,transform:'translateX(8px)'},{opacity:0,transform:'translateX(20px)'}],{delay:2150,duration:3900});
    tween(runicOrbit,[{opacity:0,transform:'rotate(-10deg) scale(.8)'},{offset:.3,opacity:.9,transform:'rotate(0deg) scale(1)'},{offset:.76,opacity:.87,transform:'rotate(14deg) scale(1)'},{opacity:0,transform:'rotate(20deg) scale(1.05)'}],{delay:2550,duration:7320});
    tween(constellations,[{opacity:0},{offset:.25,opacity:.6},{offset:.73,opacity:.86},{opacity:0}],{delay:2750,duration:6800});
    tween(lowerCircle,[{opacity:0,transform:'scale(.62)'},{offset:.34,opacity:.9,transform:'scale(1)'},{offset:.81,opacity:.68,transform:'scale(1.05)'},{opacity:0,transform:'scale(1.1)'}],{delay:3350,duration:6430});
    tween(deer,[{opacity:0},{offset:.35,opacity:.7},{offset:.7,opacity:.86},{opacity:0}],{delay:3340,duration:5410});
    tween(emblem,[{opacity:0},{offset:.31,opacity:.83},{offset:.81,opacity:.96},{opacity:0}],{delay:2650,duration:7040});
    tween(mark,[{opacity:0},{offset:.4,opacity:.7},{offset:.8,opacity:.9},{opacity:0}],{delay:3100,duration:6500});
    tween(textAura,[{opacity:0,transform:'scale(.95)'},{offset:.23,opacity:.42,transform:'scale(1)'},{offset:.72,opacity:.84,transform:'scale(1.02)'},{offset:.88,opacity:.82,transform:'scale(1.01)'},{opacity:0,transform:'scale(1)'}],{delay:2650,duration:7310});
    tween(lateHalo,[{opacity:0,transform:'rotate(-16deg) scale(.78)'},{offset:.55,opacity:1,transform:'rotate(4deg) scale(1)'},{offset:.85,opacity:1,transform:'rotate(14deg) scale(1.05)'},{opacity:0,transform:'rotate(20deg) scale(1.08)'}],{delay:6900,duration:3060});
    tween(winged,[{opacity:0,transform:'translate(-40px,-14px) scale(.6)'},{offset:.32,opacity:1,transform:'translate(-8px,0px) scale(.92)'},{offset:.61,opacity:1,transform:'translate(8px,3px) scale(1)'},{opacity:0,transform:'translate(40px,-18px) scale(.68)'}],{delay:3950,duration:6000});
    tween(holder,[{opacity:1},{offset:.94,opacity:1},{opacity:0}],{delay:0,duration:DURATION});
    anchor.append(holder);
    // F11: mesmo T0 das letras e do áudio, sem modificar duração/keyframes F08.
    if(Number.isFinite(startAt))for(const a of animations){try{a.startTime=startAt;}catch(_){ }}
    const anticipation=Number.isFinite(startAt)?Math.max(0,startAt-document.timeline.currentTime):0;
    timeout=window.setTimeout(()=>{if(!closed)completed();},DURATION+40+anticipation);
    return {dispose(){if(closed)return;closed=true;clearTimeout(timeout);for(const a of animations){try{a.cancel();}catch(_){}}
      try{wordFx?.cancel?.();}catch(_){}
      animations.length=0;holder.remove();},get scene(){return holder;},get animationCount(){return animations.length;}};
  };
})();
