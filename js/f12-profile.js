/* ERP Revelio F12 · Perfil fotográfico: browser-only, sem APIs remotas.
 * Persistência IndexedDB independente da memória operacional 2026/2027.
 * FaceDetector nativo quando presente; cascata Haar local sob demanda como fallback.
 */
(function () {
  'use strict';
  const DEFAULT = 'assets/images/erp-f12-avatar-default.webp';
  const DB_NAME='erp-f12-user-profile';
  const STORE='preferences';
  const KEY='leticia-avatar-v1';
  const MAX_FILE=10*1024*1024;
  const CANVAS_SIZE=320;
  let trigger=null,avatar=null,dialog=null,preview=null,ctx=null,fileInput=null,status=null,saveButton=null,zoomInput=null;
  let currentBlob=null,activeUrl=null,selectionUrl=null,editing=null,taskId=0,opening=false;
  let channel=null,drag=null,faceLoad=null;
  const $=id=>document.getElementById(id);
  const message=(text,error=false)=>{if(status){status.textContent=text;status.dataset.error=error?'true':'false';}};
  const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
  function requestDB(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)){reject(new Error('IndexedDB indisponível'));return;}
      let req;
      try{req=indexedDB.open(DB_NAME,1);}catch(e){reject(e);return;}
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('Falha ao abrir armazenamento'));
      req.onblocked=()=>reject(new Error('Armazenamento bloqueado por outra aba'));
    });
  }
  async function useDB(mode,method,value){
    const db=await requestDB();
    try{
      return await new Promise((resolve,reject)=>{
        let tx,req,result;
        try{
          tx=db.transaction(STORE,mode);
          const store=tx.objectStore(STORE);
          req=method==='get'?store.get(KEY):method==='delete'?store.delete(KEY):store.put(value,KEY);
        }catch(e){reject(e);return;}
        req.onsuccess=()=>{result=req.result;};
        req.onerror=()=>reject(req.error||new Error('Operação rejeitada'));
        tx.oncomplete=()=>resolve(result);
        tx.onabort=()=>reject(tx.error||new Error('Transação cancelada'));
        tx.onerror=()=>reject(tx.error||new Error('Erro de transação'));
      });
    }finally{db.close();}
  }
  function setAvatar(blob){
    if(activeUrl){URL.revokeObjectURL(activeUrl);activeUrl=null;}
    currentBlob=blob instanceof Blob?blob:null;
    if(currentBlob){activeUrl=URL.createObjectURL(currentBlob);avatar.src=activeUrl;}
    else avatar.src=DEFAULT;
  }
  async function readPersisted(){
    try{
      const val=await useDB('readonly','get');
      if(val && val.version===1 && val.blob instanceof Blob && val.blob.size>0)setAvatar(val.blob);
      else setAvatar(null);
    }catch(_){setAvatar(null); /* ausência de armazenamento não é sucesso de gravação */}
  }
  function createDialog(){
    if(dialog)return;
    dialog=document.createElement('dialog');dialog.id='erp-f12-profile-dialog';
    dialog.setAttribute('aria-labelledby','erp-f12-profile-title');
    dialog.innerHTML=`
      <div class="erp-f12-profile-head"><div><p class="erp-f12-eyebrow">PERFIL PESSOAL</p><h2 id="erp-f12-profile-title">Foto da Letícia</h2><p>Enquadre o rosto no círculo e salve neste navegador.</p></div>
      <button id="erp-f12-close" type="button" aria-label="Fechar edição de foto" title="Fechar">×</button></div>
      <div class="erp-f12-profile-body">
        <div class="erp-f12-profile-circle"><canvas id="erp-f12-profile-preview" width="320" height="320" tabindex="0" role="img" aria-label="Prévia do retrato. Arraste para reposicionar; use as setas ou o controle de zoom para ajustar"></canvas></div>
        <p class="erp-f12-profile-message" id="erp-f12-profile-status" role="status" aria-live="polite">Escolha uma imagem para alterar a foto.</p>
        <input type="file" id="erp-f12-profile-file" accept="image/jpeg,image/png,image/webp" hidden>
        <div class="erp-f12-profile-adjust"><label for="erp-f12-profile-zoom">Aproximação</label><input type="range" id="erp-f12-profile-zoom" min="1" max="3.5" step="0.05" value="1" disabled><span>Arraste a foto para centralizar</span></div>
        <div class="erp-f12-profile-actions"><button type="button" id="erp-f12-choose" class="erp-f12-secondary">Escolher imagem</button><button type="button" id="erp-f12-save" class="erp-f12-primary" disabled>Salvar foto</button><button type="button" id="erp-f12-restore" class="erp-f12-secondary">Restaurar foto original</button><button type="button" id="erp-f12-cancel" class="erp-f12-quiet">Cancelar</button></div>
      </div>`;
    document.body.appendChild(dialog);
    preview=$('erp-f12-profile-preview');ctx=preview.getContext('2d',{alpha:false});
    fileInput=$('erp-f12-profile-file');status=$('erp-f12-profile-status');saveButton=$('erp-f12-save');zoomInput=$('erp-f12-profile-zoom');
    $('erp-f12-close').addEventListener('click',()=>dialog.close());
    $('erp-f12-cancel').addEventListener('click',()=>dialog.close());
    $('erp-f12-choose').addEventListener('click',()=>{fileInput.value='';fileInput.click();});
    $('erp-f12-restore').addEventListener('click',restore);
    saveButton.addEventListener('click',save);
    fileInput.addEventListener('change',onFile);
    zoomInput.addEventListener('input',()=>{if(editing){editing.zoom=Number(zoomInput.value);draw();}});
    preview.addEventListener('pointerdown',onPointerDown);
    preview.addEventListener('pointermove',onPointerMove);
    preview.addEventListener('pointerup',onPointerEnd);
    preview.addEventListener('pointercancel',onPointerEnd);
    preview.addEventListener('keydown',onCropKeys);
    dialog.addEventListener('close',()=>{taskId++;selectionUrl&&URL.revokeObjectURL(selectionUrl);selectionUrl=null;editing=null;drag=null;opening=false;});
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  }
  function loadImage(url){return new Promise((resolve,reject)=>{
    const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Não foi possível decodificar a imagem'));
    img.src=url;
  });}
  function resetCrop(img,face){
    const w=img.naturalWidth,h=img.naturalHeight;
    let side,cx,cy;
    if(face){
      side=clamp(Math.max(face.width*1.48,face.height*1.56),Math.min(70,Math.min(w,h)),Math.min(w,h));
      cx=face.x+face.width/2;cy=face.y+face.height/2-face.height*.055;
    }else{side=Math.min(w,h);cx=w/2;cy=h/2;}
    return {img,cx,cy,side,zoom:1};
  }
  function sourceBox(){
    if(!editing)return null;
    const {img,cx,cy,side,zoom}=editing;
    const cut=Math.max(1,side/zoom),w=img.naturalWidth,h=img.naturalHeight;
    const x=clamp(cx-cut/2,0,Math.max(0,w-cut));
    const y=clamp(cy-cut/2,0,Math.max(0,h-cut));
    return {x,y,size:cut};
  }
  function draw(){
    if(!ctx||!editing)return;
    const b=sourceBox();
    ctx.clearRect(0,0,CANVAS_SIZE,CANVAS_SIZE);
    ctx.drawImage(editing.img,b.x,b.y,b.size,b.size,0,0,CANVAS_SIZE,CANVAS_SIZE);
  }
  async function open(){
    createDialog();if(opening)return;opening=true;
    editing=null;zoomInput.disabled=true;zoomInput.value='1';saveButton.disabled=true;
    message('Escolha uma imagem para alterar a foto. A foto atual continua salva até você confirmar.');
    dialog.showModal();
    try{
      const previous=await loadImage(activeUrl||DEFAULT);
      if(!dialog.open)return;
      editing=resetCrop(previous,null);draw();
      editing=null; // a foto anterior é somente prévia, não uma alteração pendente
    }catch(_){/* Sem interferir em funcionamento da ERP */}
    opening=false;
  }
  async function validateFile(file){
    if(!(file instanceof File))throw new Error('Selecione uma imagem válida.');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use JPG, PNG ou WebP. SVG não é permitido.');
    if(file.size<16)throw new Error('O arquivo está vazio ou inválido.');
    if(file.size>MAX_FILE)throw new Error('A imagem deve ter até 10 MB.');
    const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());
    const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
    const png=bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10';
    const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
    if(!(file.type==='image/jpeg'&&jpeg || file.type==='image/png'&&png || file.type==='image/webp'&&webp))throw new Error('A extensão não corresponde a uma imagem válida.');
  }
  function lazyHaar(){
    if(window.ERPF12Haar)return Promise.resolve(window.ERPF12Haar);
    if(faceLoad)return faceLoad;
    faceLoad=new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src='js/vendor/f12-haar-detector.js?v=atlas-f12-20261115';s.async=true;
      s.onload=()=>window.ERPF12Haar?resolve(window.ERPF12Haar):reject(new Error('Modelo não inicializado'));
      s.onerror=()=>reject(new Error('Modelo local indisponível'));
      document.head.appendChild(s);
    }).catch(e=>{faceLoad=null;throw e;});
    return faceLoad;
  }
  async function findFaces(img){
    let native=[];
    if('FaceDetector' in window){
      try{
        const detector=new window.FaceDetector({fastMode:true,maxDetectedFaces:6});
        native=(await detector.detect(img)).map(d=>d.boundingBox).filter(r=>r&&r.width>0&&r.height>0);
        if(native.length)return native;
      }catch(_){/* cair para detector offline */}
    }
    const haar=await lazyHaar();return await haar.detect(img);
  }
  function pickFace(faces,img){
    const cx=img.naturalWidth/2,cy=img.naturalHeight/2;
    return faces.map(f=>({f,score:Math.sqrt(f.width*f.height)/(1+Math.hypot(f.x+f.width/2-cx,f.y+f.height/2-cy)/Math.max(cx,cy)*.45)}))
      .sort((a,b)=>b.score-a.score)[0].f;
  }
  async function onFile(){
    const file=fileInput.files?.[0];if(!file)return;
    const mine=++taskId;
    saveButton.disabled=true;zoomInput.disabled=true;
    message('Validando a imagem e procurando o rosto localmente…');
    try{
      await validateFile(file);
      const url=URL.createObjectURL(file);
      const img=await loadImage(url).catch(e=>{URL.revokeObjectURL(url);throw e;});
      if(img.naturalWidth<80||img.naturalHeight<80||img.naturalWidth*img.naturalHeight>32000000){URL.revokeObjectURL(url);throw new Error('Resolução inválida. Use imagem de pelo menos 80 px e até 32 megapixels.');}
      let faces=[],reason='';
      try{faces=await findFaces(img);}catch(_){reason='O detector local não pôde ser carregado.';}
      if(mine!==taskId||!dialog.open){URL.revokeObjectURL(url);return;}
      if(selectionUrl)URL.revokeObjectURL(selectionUrl);
      selectionUrl=url;
      const face=faces.length?pickFace(faces,img):null;
      editing=resetCrop(img,face);
      zoomInput.value='1';zoomInput.disabled=false;saveButton.disabled=false;draw();
      if(face)message(faces.length>1?'Rostos detectados. Centralizamos o principal; ajuste se desejar.':'Rosto detectado e enquadrado automaticamente. Você pode ajustar antes de salvar.');
      else message((reason?reason+' ':'')+'Nenhum rosto detectado automaticamente. Ajuste arrastando e usando o zoom.',true);
    }catch(e){if(mine===taskId)message(e.message||'Não foi possível abrir esta imagem.',true);}
  }
  function onPointerDown(e){if(!editing||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};preview.setPointerCapture?.(e.pointerId);}
  function onPointerMove(e){
    if(!drag||!editing||e.pointerId!==drag.id)return;
    const b=sourceBox();const display=preview.getBoundingClientRect().width||CANVAS_SIZE;
    editing.cx-=((e.clientX-drag.x)/display)*b.size;
    editing.cy-=((e.clientY-drag.y)/display)*b.size;
    drag.x=e.clientX;drag.y=e.clientY;draw();
  }
  function onPointerEnd(e){if(drag&&e.pointerId===drag.id)drag=null;}
  function onCropKeys(e){
    if(!editing)return;
    const step=Math.max(2,sourceBox().size*.025);
    if(e.key==='ArrowLeft')editing.cx-=step;
    else if(e.key==='ArrowRight')editing.cx+=step;
    else if(e.key==='ArrowUp')editing.cy-=step;
    else if(e.key==='ArrowDown')editing.cy+=step;
    else if(e.key==='+'||e.key==='=')editing.zoom=clamp(editing.zoom+.1,1,3.5);
    else if(e.key==='-')editing.zoom=clamp(editing.zoom-.1,1,3.5);
    else return;
    e.preventDefault();zoomInput.value=String(editing.zoom);draw();
  }
  function toBlob(){
    return new Promise((resolve,reject)=>{
      // Somente a miniatura já recortada será armazenada, sem metadados EXIF.
      preview.toBlob(blob=>blob&&blob.size?resolve(blob):reject(new Error('Não foi possível gerar a miniatura')),'image/webp',.88);
    });
  }
  async function save(){
    if(!editing)return;
    const mine=++taskId;
    saveButton.disabled=true;message('Salvando foto neste navegador…');
    try{
      draw();const blob=await toBlob();
      await useDB('readwrite','put',{version:1,blob,savedAt:Date.now()});
      setAvatar(blob);
      channel?.postMessage({type:'updated'});
      message('Foto salva neste navegador.');
      if(dialog.open)dialog.close();
    }catch(e){message('Não foi possível salvar a foto. Confira espaço/permissões deste navegador. '+(e?.name||''),true);}
    finally{if(mine===taskId)saveButton.disabled=!editing;}
  }
  async function restore(){
    taskId++;
    const b=$('erp-f12-restore');b.disabled=true;message('Restaurando foto original…');
    try{
      await useDB('readwrite','delete');
      setAvatar(null);
      channel?.postMessage({type:'updated'});
      message('Foto original restaurada neste navegador.');
      if(dialog.open)dialog.close();
    }catch(_){message('Não foi possível restaurar; a foto salva continua preservada.',true);}
    finally{b.disabled=false;}
  }
  function mount(chrome){
    if(trigger)return;
    trigger=chrome?.querySelector('.erp-f12-profile-trigger');avatar=trigger?.querySelector('img');
    if(!trigger||!avatar)return;
    trigger.addEventListener('click',open);
    readPersisted();
    if('BroadcastChannel' in window){
      try{channel=new BroadcastChannel('erp-f12-photo-saved');channel.onmessage=e=>{if(e.data?.type==='updated'&&!dialog?.open)readPersisted();};}catch(_){/* opcional */}
    }
    window.addEventListener('pagehide',()=>{if(activeUrl)URL.revokeObjectURL(activeUrl);if(selectionUrl)URL.revokeObjectURL(selectionUrl);channel?.close();},{once:true});
  }
  window.ERPProfileF12={mount,version:'f12-20261115'};
})();
