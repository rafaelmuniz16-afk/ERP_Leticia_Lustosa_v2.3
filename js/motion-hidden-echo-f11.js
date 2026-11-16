/* ERP v2.3 — F11 The Hidden Echo | Íris | audio sob demanda.
 * SVG/WAAPI F08 permanecem artisticamente intactos.
 * Um AudioContext por ativação e UM T0 para todos os cues da cena.
 * Nenhum MediaElement, fetch, Web Audio ou temporizador em repouso.
 */
(()=>{
  'use strict';
  const BASE='assets/audio/f11/';
  const CLIPS=Object.freeze({
    title:[['A0','f11_title_revelio.mp3',0,3000,.48]],
    about:[
      ['B1','f11_about_ambiente.mp3',0,10000,.40],
      ['B2','f11_aneis_runas.mp3',1150,8720,.39],
      ['B3','f11_rastros_dourados.mp3',2150,3900,.30],
      ['B4','f11_sete_letras.mp3',2280,3000,.095],
      ['B8','f11_particulas.mp3',2600,7400,.36],
      ['B6','f11_cervo.mp3',3340,5410,.55],
      ['B5','f11_pomo_voador.mp3',3950,6000,1.68],
      ['B7','f11_halo_final.mp3',6900,3060,.48]
    ]
  });
  const diagnostics={starts:0,stops:0,scheduled:[],lastError:null,lastMode:null,activeSessions:0};
  Object.defineProperty(window,'ERPHiddenEchoF11Diagnostics',{value:diagnostics,configurable:false});
  const AudioClass=window.AudioContext||window.webkitAudioContext;
  const TIMEOUT_MS=8500;
  let offlineLoader=null;
  // file:// bloqueia fetch do MP3 em navegadores; manter a mesma qualidade
  // com payload JS LOCAL carregado dinamicamente após interação.
  function offlineMedia(){
    if(window.ERPF11OfflineMedia)return Promise.resolve(window.ERPF11OfflineMedia);
    if(!offlineLoader)offlineLoader=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=BASE+'f11_offline_mp3_payload.js';script.async=true;
      script.onload=()=>window.ERPF11OfflineMedia?resolve(window.ERPF11OfflineMedia):reject(new Error('Payload offline inválido'));
      script.onerror=()=>reject(new Error('Payload offline indisponível'));
      document.head.append(script);
    }).catch(err=>{offlineLoader=null;throw err});
    return offlineLoader;
  }
  function decodeBase64(base64){
    const str=atob(base64),out=new Uint8Array(str.length);
    for(let i=0;i<str.length;i++)out[i]=str.charCodeAt(i);
    return out.buffer;
  }
  // O usuário deve clicar; a chamada a resume() ocorre ANTES de qualquer await.
  function prepare(kind){
    if(!CLIPS[kind])return null;
    const session={kind,ctx:null,controller:new AbortController(),buffers:[],sources:[],gains:[],master:null,
      disposed:false,ready:false,scheduled:false,startedAt:null,visualAt:null};
    diagnostics.starts++;diagnostics.activeSessions++;
    let context=null;
    try{
      if(!AudioClass)throw new Error('Web Audio não suportado');
      context=new AudioClass({latencyHint:'interactive'});
      session.ctx=context;
      // Resume imediato dentro da ativação legítima, respeitando o navegador.
      const resumed=context.resume();
      // Não permitir rejeição assíncrona sem tratamento.
      const safeResume=Promise.race([Promise.resolve(resumed),new Promise((_,reject)=>{
        const timer=setTimeout(()=>{if(!session.disposed)reject(new Error('AudioContext resume timeout'));},TIMEOUT_MS);
        Promise.resolve(resumed).finally(()=>clearTimeout(timer)).catch(()=>{});
      })]);
      session.readyPromise=Promise.all([safeResume,loadBuffers(session)]).then(()=>{
        if(session.disposed||context.state!=='running')return false;
        session.ready=true;return true;
      }).catch(error=>{
        if(!session.disposed)diagnostics.lastError=String(error?.message||error);
        return false;
      });
    }catch(error){
      diagnostics.lastError=String(error?.message||error);
      session.readyPromise=Promise.resolve(false);
    }
    return session;
  }
  async function loadBuffers(session){
    const {ctx,controller}=session;
    const timer=setTimeout(()=>controller.abort('audio-load-timeout'),TIMEOUT_MS);
    try{
      const local=location.protocol==='file:'?await offlineMedia():null;
      const data=await Promise.all(CLIPS[session.kind].map(async ([id,file])=>{
        let array;
        if(local){
          if(!local[file])throw new Error('MP3 offline ausente '+id);
          array=decodeBase64(local[file]);
        }else{
          const response=await fetch(BASE+file,{signal:controller.signal,cache:'force-cache'});
          if(!response.ok)throw new Error(id+' HTTP '+response.status);
          array=await response.arrayBuffer();
        }
        if(session.disposed)throw new Error('audio-cancelled');
        const buffer=await ctx.decodeAudioData(array);
        if(!buffer || !buffer.duration)throw new Error('Audio vazio '+id);
        return buffer;
      }));
      if(session.disposed)throw new Error('audio-cancelled');
      session.buffers=data;
    }finally{clearTimeout(timer)}
  }
  // Compensa o mapeamento de relógios quando a implementação existe.
  function mapClock(ctx,visualT0){
    const perfNow=performance.now();
    const delta=(visualT0-perfNow)/1000;
    let target=ctx.currentTime+delta;
    try{
      const ts=ctx.getOutputTimestamp?.();
      if(ts&&ts.performanceTime>0&&ts.contextTime>=0){
        const mapped=ts.contextTime+(visualT0-ts.performanceTime)/1000;
        if(Number.isFinite(mapped)&&Math.abs(mapped-target)<.15)target=mapped;
      }
    }catch(_){ }
    return Math.max(ctx.currentTime+.035,target);
  }
  function safeSet(gain,at,v){gain.setValueAtTime(Math.max(0,v),at)}
  function soundEnvelope(gain,id,base,start,end){
    safeSet(gain,start,0);
    const rise=id==='B5'?.085:id==='B7'?.095:.025;
    gain.linearRampToValueAtTime(id==='B7'?base*.12:base,start+rise);
    if(id==='B5'){
      // O início naturalmente sutil do MP3 é preservado; reforço leve após 1,5 s.
      safeSet(gain,start+1.32,base);
      gain.linearRampToValueAtTime(base*1.035,start+2.0);
      gain.linearRampToValueAtTime(base,start+3.55);
    }
    if(id==='B7'){
      // O MP3 decai ~24 dB entre 0,35 e 1,65 s. Ganho de compensação
      // modela um crescendo perceptível até T0+8,583 s, sem mudar o áudio.
      gain.linearRampToValueAtTime(base*.22,start+.54);
      gain.linearRampToValueAtTime(base*.9,start+1.07);
      gain.linearRampToValueAtTime(base*7.5,start+1.683);
      gain.linearRampToValueAtTime(base*6.2,start+1.95);
      gain.linearRampToValueAtTime(base*.3,start+2.65);
    }
    const out=Math.min(.075,Math.max(.02,(end-start)*.065));
    safeSet(gain,Math.max(start+rise+.002,end-out),id==='B7'?base*.3:base);
    gain.linearRampToValueAtTime(0,end);
  }
  function schedule(session,visualT0){
    if(!session || session.disposed || !session.ready || session.scheduled || session.ctx?.state!=='running')return false;
    const {ctx}=session;
    // Não aceitar um agendamento já vencido: som atrasado seria pior que silêncio.
    if(!Number.isFinite(visualT0)||visualT0-performance.now()<70){
      diagnostics.lastError='janela de sincronismo insuficiente; cena continua silenciosa';
      stop(session);return false;
    }
    const t0=mapClock(ctx,visualT0);
    const master=ctx.createGain();master.gain.value=1.65;master.connect(ctx.destination);session.master=master;
    const records=[];
    try{
      CLIPS[session.kind].forEach(([id,file,offsetMs,nominalMs,base],index)=>{
        const buffer=session.buffers[index];if(!buffer)throw new Error('Buffer ausente '+id);
        const source=ctx.createBufferSource();source.buffer=buffer;
        const gain=ctx.createGain();source.connect(gain);gain.connect(master);
        const start=t0+offsetMs/1000;
        const length=Math.min(buffer.duration,nominalMs/1000);
        const end=start+length;
        const level=base;
        // Faixas da mixagem com envelope anticlique no final (sem deslocar onset).
        soundEnvelope(gain.gain,id,level,start,end);
        if(session.kind==='about' && ['B1','B2','B8','B6'].includes(id)){
          // Ducking programado em horários da cena, respeita os envelopes de fim.
          const enter=Math.max(start+.12,t0+4.35),leave=Math.min(end-.13,t0+9.34);
          if(leave>enter+.5){
            gain.gain.setValueAtTime(level,enter);
            gain.gain.linearRampToValueAtTime(level*.68,enter+.34);
            gain.gain.setValueAtTime(level*.68,Math.max(enter+.35,leave-.36));
            gain.gain.linearRampToValueAtTime(level,leave);
            // Repõe fade final se necessário; leave é anterior ao end.
          }
        }
        source.start(start,0,length);
        source.stop(end+.006);
        session.sources.push(source);session.gains.push(gain);
        records.push({id,offsetMs,scheduledAudioContextS:start,nominalMs,lengthS:Number(length.toFixed(4)),gain:level,
          predictedErrorMs:Number(((start-t0)*1000-offsetMs).toFixed(2))});
      });
      session.scheduled=true;session.startedAt=t0;session.visualAt=visualT0;
      diagnostics.lastMode=session.kind;
      diagnostics.scheduled=records;
      return true;
    }catch(error){
      diagnostics.lastError='schedule: '+String(error?.message||error);
      stop(session);
      return false;
    }
  }
  function stop(session){
    if(!session||session.disposed)return;
    session.disposed=true;diagnostics.stops++;diagnostics.activeSessions=Math.max(0,diagnostics.activeSessions-1);
    try{session.controller.abort()}catch(_){ }
    const ctx=session.ctx;
    if(ctx){
      const now=ctx.currentTime;
      if(session.master){
        try{
          session.master.gain.cancelScheduledValues(now);
          session.master.gain.setValueAtTime(session.master.gain.value,now);
          session.master.gain.linearRampToValueAtTime(0,now+.018);
        }catch(_){ }
      }
      for(const src of session.sources){try{src.stop(now+.024)}catch(_){ }}
      // Esta sessão está encerrada: nenhum callback ou faixa continua tocando.
      setTimeout(()=>{
        for(const src of session.sources)try{src.disconnect()}catch(_){ }
        for(const gn of session.gains)try{gn.disconnect()}catch(_){ }
        try{session.master?.disconnect()}catch(_){ }
        session.sources.length=0;session.gains.length=0;session.buffers.length=0;
        ctx.close().catch(()=>{});
      },35);
    }
    session.buffers.length=0;
  }
  window.ERPHiddenEchoF11=Object.freeze({prepare,schedule,stop});
})();
