import {randomUUID} from 'node:crypto';
import {RouterError,chooseRoute,protectedRequest} from './core.mjs';
import {PROVIDERS,endpoint} from './providers.mjs';
import {hash} from './store.mjs';
export const PROFILES=Object.freeze(Object.assign(Object.create(null),{
 fixed:{label:'Modelo fixo',description:'Preserva seu modelo e pedido. Sem cache ou redução automática.',cache:false,dedup:false},
 reuse:{label:'Reaproveitar com segurança',description:'Modelo fixo; cache exato e remoção de instruções adjacentes idênticas em pedidos elegíveis.',cache:true,dedup:true},
 economy:{label:'Economia autorizada',description:'Menor custo estimado entre suas rotas aprovadas para a tarefa, no mesmo provedor. Pode mudar a qualidade; exige autorização por pedido.',cache:true,dedup:true,requiresSwitch:true}
}));
const tokenPaths=['/v1/chat/completions','/v1/responses','/v1/messages','/v1/embeddings','/v1beta/models/MODEL:generateContent'];
export const PLAY_PATHS=[...tokenPaths,'/v1/images/generations','/v1/audio/speech','/v1/videos'];
const mediaKeys=['size','quality','seconds','duration','resolution','voice','response_format'];
const fail=message=>{throw new RouterError(400,'invalid_settings',message)};
export function validateRoutes(routes){
 if(!Array.isArray(routes)||routes.length>50)fail('Cadastre até 50 rotas.');
 const ids=new Set();return routes.map(row=>{
  if(!row||!PROVIDERS[row.provider]||typeof row.model!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9/._:-]{0,199}$/.test(row.model)||typeof row.task!=='string'||!/^[a-zA-Z0-9_-]{1,60}$/.test(row.task)||!PLAY_PATHS.includes(row.path))fail('Confira provedor, modelo, tarefa e tipo de pedido.');
  endpoint(row.provider,row.path,'POST');if(row.priceCurrency!=null&&!['USD','BRL'].includes(row.priceCurrency))fail('Escolha USD ou BRL.');
  const id=[row.provider,row.model,row.task,row.path].join(':');if(ids.has(id))fail('Esta rota já está cadastrada.');ids.add(id);
  if(typeof row.approved!=='boolean'||row.approved&&row.qualityAccepted!==true)fail('Aprovar uma rota exige confirmar sua qualidade para esta tarefa.');
  if(typeof row.priceCheckedAt!=='string'||!Number.isFinite(Date.parse(row.priceCheckedAt))||Date.parse(row.priceCheckedAt)>Date.now()+60000)fail('Informe uma data válida de conferência do preço.');
  const result={provider:row.provider,model:row.model,task:row.task,path:row.path,approved:row.approved,qualityAccepted:row.qualityAccepted===true,priceCheckedAt:new Date(row.priceCheckedAt).toISOString(),priceCurrency:row.priceCurrency||'USD',capabilities:[row.path]};
  if(tokenPaths.includes(row.path)){
   for(const k of ['inputUsdPerMillion','outputUsdPerMillion']){if(typeof row[k]!=='number'||!Number.isFinite(row[k])||row[k]<0||row[k]>1000000)fail('Informe os preços na moeda escolhida por milhão de tokens.');result[k]=row[k]}
   if(!Number.isSafeInteger(row.contextTokens)||row.contextTokens<1||row.contextTokens>10000000)fail('Informe a capacidade de contexto do modelo.');result.contextTokens=row.contextTokens;
  }else{
   if(typeof row.usdPerUnit!=='number'||!Number.isFinite(row.usdPerUnit)||row.usdPerUnit<0||row.usdPerUnit>100000||!['image','second','character','request'].includes(row.priceUnit))fail('Informe o preço por imagem, segundo, caractere ou pedido.');
   if(!Number.isSafeInteger(row.maxInputBytes)||row.maxInputBytes<1||row.maxInputBytes>32000000)fail('Informe o limite de entrada homologado.');
   result.usdPerUnit=row.usdPerUnit;result.priceUnit=row.priceUnit;result.maxInputBytes=row.maxInputBytes;
   if(!Array.isArray(row.supportedParameters)||row.supportedParameters.length>40||row.supportedParameters.some(k=>typeof k!=='string'||!/^[a-zA-Z0-9_]{1,60}$/.test(k)))fail('Confira os parâmetros de mídia aprovados.');
   result.supportedParameters=row.supportedParameters;result.constraints={};
   for(const k of mediaKeys){if(row.constraints?.[k]!=null){const a=row.constraints[k];if(!Array.isArray(a)||a.length>30||a.some(v=>!['string','number','boolean'].includes(typeof v)||typeof v==='string'&&v.length>200||typeof v==='number'&&!Number.isFinite(v)))fail('Confira os valores de qualidade/mídia aprovados.');result.constraints[k]=a}}
  }
  return result;
 });
}
export function activeRoutes(routes){return routes.filter(r=>r.approved&&(!r.priceCheckedAt||Date.now()-Date.parse(r.priceCheckedAt)<=30*86400000))}
export function profileHeaders(profile,allowSwitch){
 const p=PROFILES[profile];if(!p)throw new RouterError(400,'unknown_profile','Escolha um perfil válido.');
 if(p.requiresSwitch&&allowSwitch!==true)throw new RouterError(400,'consent_required','Autorize explicitamente a troca de modelo e a possível diferença de qualidade.');
 return {'x-biziva-cache':p.cache?'exact':'off','x-biziva-deduplicate-instructions':p.dedup?'1':'0',...(allowSwitch?{'x-biziva-allow-model-switch':'1'}:{})};
}
export function makeWorkbench({store,catalog,dispatch}){
 const previews=new Map();
 function settings(owner){return store.settings(owner)||{revision:0,profile:'fixed',routes:catalog}}
 function freshRoutes(owner){return activeRoutes(settings(owner).routes)}
 function quote(owner,input){
  if(!input||!PROVIDERS[input.provider]||!PLAY_PATHS.includes(input.path)||!input.body||typeof input.body!=='object'||Array.isArray(input.body))throw new RouterError(400,'invalid_preview','Confira o serviço, tipo e corpo do pedido.');
  endpoint(input.provider,input.path,'POST');
  const b=input.body;if(b.stream||protectedRequest(b)||b.n!=null&&b.n!==1)throw new RouterError(422,'preview_unsupported','O teste usa JSON sem streaming, estado anterior ou múltiplas saídas. A API nativa continua disponível para outros fluxos.');
  const output=b.max_tokens??b.max_completion_tokens??b.max_output_tokens??b.generationConfig?.maxOutputTokens;if(tokenPaths.includes(input.path)&&input.path!=='/v1/embeddings'&&(!Number.isSafeInteger(output)||output<1||output>16384))throw new RouterError(400,'output_budget_required','O teste permite de 1 a 16.384 tokens de saída.');
  const profile=input.profile||settings(owner).profile,headers=profileHeaders(profile,input.allowSwitch);
  if(b.model==='biziva-auto'&&profile!=='economy')throw new RouterError(400,'consent_required','O modelo automático exige o perfil Economia autorizada.');
  const amount=input.maxEstimatedAmount??input.maxEstimatedUsd;
  if(typeof amount!=='number'||!Number.isFinite(amount)||amount<=0||amount>100)throw new RouterError(400,'budget_required','Informe um limite de estimativa maior que zero e até 100 na moeda escolhida.');
  const key=store.getKey(owner,input.provider);if(!key)throw new RouterError(409,'provider_key_missing','Cadastre sua chave deste provedor primeiro.');
  const currency=input.currency||'USD';if(currency!=='USD'&&input.maxEstimatedAmount==null)fail('Use maxEstimatedAmount e currency para orçamento em reais.');if(!['USD','BRL'].includes(currency))fail('Moeda inválida.');const routes=freshRoutes(owner).filter(r=>(r.priceCurrency||'USD')===currency),task=input.task||'general';
  const route=chooseRoute({path:input.path,body:b,provider:input.provider,allowSwitch:input.allowSwitch===true,task,catalog:routes});
  const model=route.model;
  // Also price exact-model tests against an approved route; no guessed model prices.
  const matches=routes.filter(r=>r.provider===input.provider&&r.model===model&&r.task===task&&r.path===input.path);
  const priced=chooseRoute({path:input.path,body:{...b,model:'biziva-auto'},provider:input.provider,allowSwitch:true,task,catalog:matches});
  if(priced.estimatedUsd>amount)throw new RouterError(422,'estimated_budget_exceeded','A estimativa excede o limite informado. Nada foi enviado.');
  return {provider:input.provider,path:input.path,body:structuredClone(b),profile,headers:{...headers,'x-biziva-provider':input.provider,'x-biziva-task':task,'x-biziva-price-currency':currency},model,currency,estimatedUsd:priced.estimatedUsd,revision:settings(owner).revision,credential:hash(key),maxEstimatedAmount:amount,maxEstimatedUsd:amount,task,allowSwitch:input.allowSwitch===true};
 }
 return {settings,freshRoutes,async handle(request,owner,token,readJSON){
  const path=new URL(request.url).pathname,method=request.method;
  if(path==='/router/settings'){
   if(method==='GET')return Response.json({...settings(owner),profiles:PROFILES});
   if(method!=='PUT')throw new RouterError(405,'unsupported_method','Use GET ou PUT.');
   const b=await readJSON();if(!PROFILES[b.profile]||!Number.isSafeInteger(b.revision)||b.revision<0)fail('Confira perfil e revisão da configuração.');
   const routes=validateRoutes(b.routes);const revision=store.saveSettings(owner,{profile:b.profile,routes},b.revision);
   return Response.json({revision,profile:b.profile,routes,profiles:PROFILES});
  }
  if(path==='/router/playground/preview'&&method==='POST'){
   for(const [id,p] of previews)if(p.expires<=Date.now())previews.delete(id);
   if([...previews.values()].filter(p=>p.owner===owner).length>=10||previews.size>=500)throw new RouterError(429,'preview_limit','Conclua os testes pendentes ou aguarde cinco minutos.');
   const q=quote(owner,await readJSON()),id=randomUUID();previews.set(id,{owner,expires:Date.now()+300000,quote:q});
   return Response.json({previewId:id,expiresInSeconds:300,provider:q.provider,model:q.model,profile:q.profile,currency:q.currency,estimatedAmount:q.estimatedUsd,...(q.currency==='USD'?{estimatedUsd:q.estimatedUsd}:{}),paidConfirmationRequired:true,warning:'Estimativa com preços informados por você, não teto da fatura. Podem existir custos adicionais do provedor. Nenhum pedido foi enviado.'});
  }
  if(path==='/router/playground/run'&&method==='POST'){
   const b=await readJSON(),p=previews.get(b.previewId);
   if(!p||p.owner!==owner||p.expires<=Date.now())throw new RouterError(409,'preview_expired','Simule novamente. Nenhum novo pedido foi enviado.');
   if(b.confirmPaid!==true)throw new RouterError(400,'paid_confirmation_required','Confirme que o teste pode consumir saldo do seu provedor.');
   const q=p.quote,current=quote(owner,{...q,profile:q.profile,maxEstimatedUsd:q.maxEstimatedUsd});
   if(q.revision!==current.revision||q.credential!==current.credential||q.model!==current.model||q.estimatedUsd!==current.estimatedUsd)throw new RouterError(409,'preview_stale','A configuração ou chave mudou. Simule novamente antes de confirmar.');
   previews.delete(b.previewId); // Consume before any async dispatch; no retry, including uncertain results.
   const body={...q.body,model:q.model};let target=q.path;if(q.provider==='gemini'){target=q.path.replace('/MODEL:', '/'+q.model+':');delete body.model;endpoint(q.provider,target,'POST')}return dispatch(new Request(new URL(target,request.url),{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json',...q.headers,'x-biziva-settings-revision':String(q.revision),'idempotency-key':'playground-'+b.previewId},body:JSON.stringify(body),signal:request.signal}));
  }
  if(path.startsWith('/router/playground/'))throw new RouterError(405,'unsupported_method','Use POST para simular ou executar.');
  return null;
 }};
}
