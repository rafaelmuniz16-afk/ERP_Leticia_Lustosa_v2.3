// ERP v2.3 - Bundler local e deterministico para fallback file://.
// Nao usa npm, rede, runtime de backend nem modifica dados da ERP.
// Uso: node scripts/build-aurora.cjs
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const configs=[
 ['js/aurora/prompts.js',['gerarPromptSistema','gerarPromptObservacao']],
 ['js/aurora/report-prompt.js',['gerarPromptResumo','formatoResumoAurora']],
 ['js/aurora/tools.js',['AURORA_TOOLS']],
 ['js/aurora/dispatcher.js',['executarFerramenta']],
 ['js/aurora/speech.js',['suportaReconhecimento','travarMicrofoneHardware','liberarMicrofoneHardware','limparTextoParaVoz','iniciarEscuta','pararEscuta','pararFala','estaFalando','falarResposta']],
 ['js/auroraAgent.js',['processarMensagemAurora','inicializarAuroraAgent','gerarObservacaoAurora','gerarResumoAurora','analisarCentralTrabalho','gerarIntegracaoAurora']]
];
const head=`// Gerado por scripts/build-aurora.cjs. Edite os módulos de origem.\n(()=>{\n'use strict';\nconst modules=Object.create(null);\n`;
let output=head;
for(const [rel,names] of configs){
 let body=fs.readFileSync(path.join(root,rel),'utf8');
 if(rel==='js/auroraAgent.js') {
   body=body.replace(/^import\s+[\s\S]*?\sfrom\s+['"][^'"]+['"];\s*/gm,'');
   body=`const { gerarPromptSistema, gerarPromptObservacao } = modules['js/aurora/prompts.js'];\n`+
   `const { gerarPromptResumo, formatoResumoAurora } = modules['js/aurora/report-prompt.js'];\n`+
   `const { AURORA_TOOLS } = modules['js/aurora/tools.js'];\n`+
   `const { executarFerramenta } = modules['js/aurora/dispatcher.js'];\n`+
   `const { suportaReconhecimento, iniciarEscuta, pararEscuta, falarResposta, pararFala, estaFalando, travarMicrofoneHardware, liberarMicrofoneHardware } = modules['js/aurora/speech.js'];\n`+body;
 }
 body=body.replace(/^export\s+(?=(?:async\s+)?(?:function|const|let|class))/gm,'');
 if(/(^|\n)\s*(?:import|export)\s/m.test(body))throw Error('Modulos ainda contem import/export: '+rel);
 for (const name of names) if(!new RegExp('\\b'+name+'\\b').test(body)) throw Error('Export ausente: '+rel+' '+name);
 output+=`modules[${JSON.stringify(rel)}]=(()=>{\n${body}\nreturn {${names.join(',')}};\n})();\n`;
}
output+='})();\n';
fs.writeFileSync(path.join(root,'js/aurora/agent.bundle.js'),output,'utf8');
console.log(`Bundle gerado: ${Buffer.byteLength(output,'utf8')} bytes; ${configs.length} modulos de origem`);
