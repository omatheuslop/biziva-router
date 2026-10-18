// Framework-independent policies shared with the hosted integration. No credentials or network.
export const VERSION='0.1.1';
export class RouterError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}
export function stable(value){
 if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
export function protectedRequest(body){
 return !!(body?.tools?.length||body?.functions?.length||body?.previous_response_id||body?.conversation||body?.background||body?.reasoning||body?.thinking||body?.tool_choice||body?.function_call||body?.store===true||(Array.isArray(body?.input)&&body.input.some(x=>x.type&&x.type!=='message'))||(Array.isArray(body?.messages)&&body.messages.some(m=>m.role==='tool'||m.tool_calls||m.function_call||Array.isArray(m.content))));
}
export function optimize(body,{deduplicateInstructions=false}={}){
 const result=structuredClone(body);let removed=0;
 // Only exact adjacent instruction messages, explicitly requested, with every field equal.
 if(deduplicateInstructions&&!protectedRequest(body)&&Array.isArray(body.messages)){
  result.messages=body.messages.filter((m,i,a)=>{
   const duplicate=i>0&&['system','developer'].includes(m.role)&&a[i-1].role===m.role&&stable(a[i-1])===stable(m);
   if(duplicate)removed++;return !duplicate;
  });
 }
 return {body:result,metrics:{removedInstructions:removed,originalBytes:new TextEncoder().encode(stable(body)).length,optimizedBytes:new TextEncoder().encode(stable(result)).length,estimatedTokens:false,summarized:false}};
}
export function selectContext({query,items,maxBytes}){
 if(typeof query!=='string'||query.length>8000||!Array.isArray(items)||items.length>100||!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>1000000)throw new RouterError(400,'invalid_context','Invalid context selection');
 const terms=new Set(query.toLocaleLowerCase().match(/[\p{L}\p{N}_]+/gu)||[]);let budget=maxBytes;
 const ids=new Set();
 const ranked=items.map((item,i)=>{
  if(!item||typeof item.id!=='string'||typeof item.text!=='string'||item.text.length>1000000||ids.has(item.id)||item.required!=null&&typeof item.required!=='boolean')throw new RouterError(400,'invalid_context','Invalid context item');
  ids.add(item.id);
  const words=new Set(item.text.toLocaleLowerCase().match(/[\p{L}\p{N}_]+/gu)||[]);
  return {...item,index:i,score:[...terms].filter(t=>words.has(t)).length,bytes:new TextEncoder().encode(item.text).length};
 }).sort((a,b)=>Number(b.required===true)-Number(a.required===true)||b.score-a.score||a.index-b.index);
 const selected=[];for(const item of ranked){if(item.bytes<=budget){selected.push(item);budget-=item.bytes}else if(item.required===true)throw new RouterError(422,'required_context_exceeds_budget','Required context cannot be removed');}
 selected.sort((a,b)=>a.index-b.index);
 return {items:selected.map(({index,score,bytes,...item})=>item),excludedIds:ranked.filter(x=>!selected.includes(x)).map(x=>x.id),selectedBytes:maxBytes-budget,lossy:true,method:'explicit auxiliary documents, lexical relevance; original conversation untouched'};
}
export function cacheEligible(path,body){
 return ['/v1/chat/completions','/v1/embeddings'].includes(path)&&!body.stream&&!protectedRequest(body)&&!body.user&&!body.metadata;
}
export function requirements(path,body){
 const req=new Set([path]);
 if(body.tools?.length||body.functions?.length)req.add('tools');
 if(body.response_format||body.text?.format)req.add('structured');
 if(body.stream)req.add('stream');
 if(protectedRequest(body))req.add('protected');
 return [...req];
}
export function chooseRoute({path,body,provider,allowSwitch=false,task,catalog=[]}){
 if(body.model!=='biziva-auto')return {provider,model:body.model,switched:false,reason:'explicit_model'};
 if(!allowSwitch)throw new RouterError(400,'consent_required','Model switching must be explicitly enabled');
 // Do not move stateful developer sessions between models/providers.
 if(protectedRequest(body))throw new RouterError(422,'stateful_route_required','Use an explicit native model for stateful/tool requests');
 const required=requirements(path,body),bytes=new TextEncoder().encode(stable(body)).length;
 const tokenPath=['/v1/chat/completions','/v1/responses','/v1/messages','/v1/embeddings'].includes(path);
 const maxOutput=path==='/v1/embeddings'?0:body.max_tokens??body.max_completion_tokens??body.max_output_tokens;
 if(tokenPath&&(!Number.isSafeInteger(maxOutput)||maxOutput<0||maxOutput===0&&path!=='/v1/embeddings'))throw new RouterError(400,'output_budget_required','An explicit output limit is required for automatic token routing');
 const mediaParameters=['size','quality','seconds','duration','resolution','voice','response_format'];
 function estimate(x){
  if(tokenPath){if(!Number.isFinite(x.inputUsdPerMillion)||x.inputUsdPerMillion<0||!Number.isFinite(x.outputUsdPerMillion)||x.outputUsdPerMillion<0||!Number.isInteger(x.contextTokens)||x.contextTokens<bytes+maxOutput)return null;return (bytes*x.inputUsdPerMillion+maxOutput*x.outputUsdPerMillion)/1e6;}
  if(!Number.isFinite(x.usdPerUnit)||x.usdPerUnit<0||!Number.isInteger(x.maxInputBytes)||x.maxInputBytes<bytes)return null;
  // Every requested media parameter must have been explicitly qualified. Never lower quality/size/voice.
  if(mediaParameters.some(k=>body[k]!=null&&!x.constraints?.[k]?.includes(body[k])))return null;
  if(Object.keys(body).some(k=>!['model','prompt','input'].includes(k)&&!x.supportedParameters?.includes(k)))return null;
  const units=x.priceUnit==='image'?(body.n??1):x.priceUnit==='second'?Number(body.seconds??body.duration):x.priceUnit==='character'&&typeof body.input==='string'?[...body.input].length:x.priceUnit==='request'?1:NaN;
  return Number.isFinite(units)&&units>0?units*x.usdPerUnit:null;
 }
 const candidates=catalog.filter(x=>x.approved===true&&x.task===task&&x.provider===provider&&required.every(r=>x.capabilities?.includes(r))).map(x=>({...x,estimate:estimate(x)})).filter(x=>x.estimate!=null);
 if(!candidates.length)throw new RouterError(422,'no_qualified_route','No qualified route meets the task, protocol and context/media requirements');
 candidates.sort((a,b)=>a.estimate-b.estimate||a.model.localeCompare(b.model));
 const chosen=candidates[0];return {provider:chosen.provider,model:chosen.model,switched:true,reason:'qualified_lowest_estimated_upper_budget',estimatedUsd:chosen.estimate,costBasis:tokenPath?'configured_prices_utf8_upper_bound_no_cache_assumed':'configured_media_unit_price_parameters_preserved'};
}

export function usageOf(data){
 const u=data?.usage||data?.usageMetadata;if(!u)return null;
 return {inputTokens:u.input_tokens??u.prompt_tokens??u.promptTokenCount??null,outputTokens:u.output_tokens??u.completion_tokens??u.candidatesTokenCount??null,cachedInputTokens:u.input_tokens_details?.cached_tokens??u.prompt_tokens_details?.cached_tokens??u.cache_read_input_tokens??u.cachedContentTokenCount??null,cacheWriteTokens:u.cache_creation_input_tokens??null,providerReportedUsd:typeof u.cost==='number'&&Number.isFinite(u.cost)&&u.cost>=0?u.cost:null};
}
