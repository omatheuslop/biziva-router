import {RouterError} from './core.mjs';
export async function fetchCatalog(send=fetch){
 // Public metadata only. No provider key, no prompt and no paid inference.
 const response=await send('https://openrouter.ai/api/v1/models',{redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new RouterError(502,'catalog_unavailable','O catálogo de preços não respondeu. Tente depois.');
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>8*1024*1024){await reader.cancel();throw new RouterError(502,'catalog_too_large','Catálogo excedeu o limite.')}chunks.push(r.value)}}finally{reader.releaseLock()}
 let data;try{data=JSON.parse(Buffer.concat(chunks).toString())}catch{throw new RouterError(502,'catalog_invalid','Não foi possível ler o catálogo. Nenhum preço foi importado.')}
 if(!Array.isArray(data?.data))throw new RouterError(502,'catalog_invalid','Catálogo sem lista de modelos. Nenhuma rota foi alterada.');
 const fetchedAt=new Date().toISOString();const models=(data.data||[]).filter(m=>typeof m.id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9/._:-]{0,199}$/.test(m.id)&&m.architecture?.output_modalities?.includes('text')&&m.architecture?.input_modalities?.includes('text')&&Number.isSafeInteger(m.context_length)&&m.context_length>0&&m.context_length<=10000000&&m.pricing&&['prompt','completion'].every(k=>m.pricing[k]!=null&&m.pricing[k]!==''&&Number.isFinite(Number(m.pricing[k]))&&Number(m.pricing[k])>=0)&&Number(m.pricing.request||0)===0).map(m=>({provider:'openrouter',model:m.id,name:String(m.name||m.id).slice(0,200),task:'general',path:'/v1/chat/completions',approved:false,qualityAccepted:false,priceCheckedAt:fetchedAt,inputUsdPerMillion:Number(m.pricing.prompt)*1e6,outputUsdPerMillion:Number(m.pricing.completion)*1e6,contextTokens:m.context_length})).slice(0,1500);
 return {source:'https://openrouter.ai/api/v1/models',fetchedAt,models,warning:'Preços públicos do OpenRouter. Acesso e fatura dependem da sua conta; confira condições adicionais. Importar não aprova qualidade nem faz inferência.'};
}
export const AGENTS=[
 {id:'assistant',name:'Assistente geral',task:'general',instructions:'Ajude com o pedido do usuário. Seja claro. Não invente fatos ou ações executadas.'},
 {id:'writing',name:'Redator',task:'writing',instructions:'Escreva e revise textos para o objetivo informado. Preserve fatos e indique informações faltantes. Não alegue publicar ou enviar nada.'},
 {id:'summary',name:'Resumidor',task:'summary',instructions:'Resuma apenas o material fornecido. Preserve ressalvas, números e instruções relevantes. Não invente fontes.'},
 {id:'coding',name:'Assistente de código',task:'coding',instructions:'Ajude a analisar e escrever código. Explique premissas e testes. Você não executa código nem altera arquivos nesta conversa.'},
 {id:'planning',name:'Planejador',task:'planning',instructions:'Transforme o objetivo em passos práticos. Identifique dependências e decisões. Você não realiza ações externas.'},
 {id:'analysis',name:'Analista',task:'analysis',instructions:'Analise os dados fornecidos. Separe fatos, hipóteses e cálculos. Não invente dados nem acesso a fontes externas.'}
];
