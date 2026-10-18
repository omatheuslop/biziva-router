import {randomUUID,timingSafeEqual} from 'node:crypto';
import {RouterError,VERSION,stable,optimize,selectContext,cacheEligible,chooseRoute,usageOf} from './core.mjs';
import {hash} from './store.mjs';
import {PROVIDERS,endpoint,upstreamHeaders,queryString} from './providers.mjs';
function parseJSON(bytes){try{return JSON.parse(bytes.toString())}catch{throw new RouterError(400,'invalid_json','Invalid JSON body')}}
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export async function boundedBytes(stream,max){
 if(!stream)return Buffer.alloc(0);const reader=stream.getReader(),chunks=[];let bytes=0;
 try{while(true){const r=await reader.read();if(r.done)break;bytes+=r.value.byteLength;if(bytes>max){await reader.cancel();throw new RouterError(413,'body_too_large','Request/response exceeds configured buffering limit')}chunks.push(r.value)}}finally{reader.releaseLock()}
 return Buffer.concat(chunks);
}
export function makeGateway({store,adminToken,catalog=[],send=fetch,maxBodyBytes=32*1024*1024,maxCacheBytes=1024*1024,timeoutMs=300000,maxConcurrent=4}){
 if(typeof adminToken!=='string'||adminToken.length<32)throw Error('Admin token must contain at least 32 characters');
 const concurrency=new Map();
 return async function handle(request){
  try{return await run(request)}catch(e){return json({error:{type:'biziva_router_error',code:e.code||'internal_error',message:e instanceof RouterError?e.message:'Internal gateway error'}},e.status||500)}
 };
 async function run(request){
  const url=new URL(request.url),path=url.pathname;
  if(path==='/healthz'&&request.method==='GET')return json({status:'ok',version:VERSION});
  const token=(request.headers.get('authorization')?.replace(/^Bearer /i,'')||request.headers.get('x-api-key')||'');
  if(path==='/router/admin/clients'&&request.method==='POST'){
   const isAdmin=timingSafeEqual(Buffer.from(hash(token)),Buffer.from(hash(adminToken)));if(!isAdmin)throw new RouterError(401,'unauthorized','Authentication required');
   requireOrigin(request,url);const body=parseJSON(await boundedBytes(request.body,4096));
   if(!/^[a-zA-Z0-9_-]{1,80}$/.test(body.id||''))throw new RouterError(400,'invalid_client','Use a short unique account identifier');
   return json({id:body.id,token:store.createClient(body.id)},201);
  }
  const owner=store.authenticate(token);if(!owner)throw new RouterError(401,'unauthorized','Authentication required');
  if(!['GET','HEAD'].includes(request.method))requireOrigin(request,url);
  if(path==='/router/metrics'&&request.method==='GET')return json(store.metrics(owner));
  if(path==='/router/providers'&&request.method==='GET')return json({providers:store.providers(owner),supported:Object.keys(PROVIDERS)});
  if(path.startsWith('/router/providers/')){
   const provider=path.slice('/router/providers/'.length);if(!PROVIDERS[provider])throw new RouterError(404,'unknown_provider','Unknown provider');
   if(request.method==='DELETE'){store.deleteKey(owner,provider);return json({deleted:true})}
   if(request.method!=='PUT')throw new RouterError(405,'unsupported_method','Use PUT to register your provider key');
   const b=parseJSON(await boundedBytes(request.body,8192));if(typeof b.key!=='string'||b.key.length<8||b.key.length>4096||/[\r\n]/.test(b.key))throw new RouterError(400,'invalid_key','Invalid provider key');
   store.putKey(owner,provider,b.key);return json({provider,configured:true});
  }
  if(path==='/router/context/select'&&request.method==='POST')return json(selectContext(parseJSON(await boundedBytes(request.body,maxBodyBytes))));
  const provider=request.headers.get('x-biziva-provider')||(path==='/v1/messages'||path==='/v1/messages/count_tokens'?'anthropic':path.startsWith('/v1beta/')?'gemini':'openai');
  const upstreamUrl=endpoint(provider,path,request.method)+queryString(provider,url.searchParams),key=store.getKey(owner,provider);
  if(!key)throw new RouterError(409,'provider_key_missing','Register your own provider key first');
  // Every remote resource is associated with its creating gateway account.
  if(['GET','DELETE'].includes(request.method)){
   const id=path.startsWith('/v1beta/')?path.slice('/v1beta/'.length):path.split('/')[3];
   if(!store.owns(owner,provider,id))throw new RouterError(404,'resource_not_found','Resource not found in this account');
  }
  if((concurrency.get(owner)||0)>=maxConcurrent)throw new RouterError(429,'concurrency_limit','Too many active requests');
  const original=await boundedBytes(request.body,maxBodyBytes);let body=null,bytes=original,optimization=null,route={provider,model:null,switched:false};
  const contentType=request.headers.get('content-type')||'';
  if(original.length&&contentType.includes('application/json')){
   try{body=JSON.parse(original.toString())}catch{throw new RouterError(400,'invalid_json','Invalid JSON body')}
   if(!body||typeof body!=='object'||Array.isArray(body))throw new RouterError(400,'invalid_json','Expected an object');
   if(body.previous_response_id&&!store.owns(owner,provider,body.previous_response_id))throw new RouterError(404,'resource_not_found','Previous response not found in this account');
   if(body.conversation)throw new RouterError(422,'conversation_not_supported','Use stateless input or a gateway-owned previous_response_id');
   if(body.model!=null&&(typeof body.model!=='string'||body.model.length>200||/[\r\n]/.test(body.model)))throw new RouterError(400,'invalid_model','Invalid model identifier');
   route=chooseRoute({path,body,provider,allowSwitch:request.headers.get('x-biziva-allow-model-switch')==='1',task:request.headers.get('x-biziva-task')||'general',catalog});
   if(route.switched)body.model=route.model;
   optimization=optimize(body,{deduplicateInstructions:request.headers.get('x-biziva-deduplicate-instructions')==='1'});body=optimization.body;bytes=Buffer.from(JSON.stringify(body));
  }
  const semanticHeaders=Object.fromEntries(['anthropic-version','anthropic-beta','anthropic-workspace-id','openai-beta'].map(n=>[n,request.headers.get(n)||'']));
  const fingerprint=hash(stable({provider,path,query:url.search,method:request.method,body:body||original.toString('base64'),headers:semanticHeaders,credential:hash(key)}));
  const idem=request.headers.get('idempotency-key')||request.headers.get('x-idempotency-key');
  if(idem&&(idem.length>200||!/^[\x21-\x7e]+$/.test(idem)))throw new RouterError(400,'invalid_idempotency_key','Invalid idempotency key');
  const cache=request.headers.get('x-biziva-cache')==='exact'&&body&&cacheEligible(path,body),cacheKey=fingerprint;
  let claim=null;
  if(idem){claim=store.claim(owner,idem,fingerprint);if(!claim.claimed){
   if(claim.fingerprint!==fingerprint)throw new RouterError(409,'idempotency_conflict','This key belongs to a different request');
   if(claim.response)return fromSaved(claim.response,{'x-biziva-replay':'1'});
   throw new RouterError(409,claim.state==='uncertain'?'result_uncertain':'request_already_claimed','No new upstream request was sent; inspect the original operation');
  }}
  if(cache){const hit=store.cacheGet(owner,cacheKey);if(hit){if(idem)store.finish(owner,idem,'completed',hit);store.event(owner,{cacheHit:true,upstreamCall:false,provider,path});return fromSaved(hit,{'x-biziva-cache':'hit'})}}
  concurrency.set(owner,(concurrency.get(owner)||0)+1);let released=false;
  const release=()=>{if(!released){released=true;concurrency.set(owner,Math.max(0,(concurrency.get(owner)||1)-1))}};
  const started=Date.now(),requestId=randomUUID();
  const event={requestId,provider,path,model:route.model,upstreamCall:true,route,optimization:optimization?.metrics};
  try{
   const timeout=AbortSignal.timeout(timeoutMs),signal=AbortSignal.any([timeout,request.signal]);
   // One dispatch only: no blind retries or cross-provider failover after a paid submission.
   const upstream=await send(upstreamUrl,{method:request.method,headers:upstreamHeaders(provider,key,request.headers),body:bytes.length?bytes:undefined,redirect:'error',signal});
   const headers=new Headers();for(const n of ['content-type','retry-after','request-id','x-request-id','anthropic-ratelimit-requests-remaining','anthropic-ratelimit-tokens-remaining','x-should-retry','retry-after-ms','x-stainless-request-id','anthropic-ratelimit-unified-status','anthropic-ratelimit-unified-reset','anthropic-ratelimit-unified-representative-claim','anthropic-ratelimit-unified-fallback-percentage']){const v=upstream.headers.get(n);if(v)headers.set(n,v)}
   if(provider==='anthropic')for(const [name,value] of upstream.headers)if(name.startsWith('anthropic-ratelimit-'))headers.set(name,value);
   headers.set('cache-control','no-store');headers.set('x-biziva-request-id',requestId);headers.set('x-biziva-provider',provider);if(route.model)headers.set('x-biziva-model',route.model);if(optimization)headers.set('x-biziva-removed-instructions',String(optimization.metrics.removedInstructions));
   if(upstream.headers.get('content-type')?.includes('application/json')){
    const data=await boundedBytes(upstream.body,maxBodyBytes),saved=data.length<=maxCacheBytes?{status:upstream.status,headers:Object.fromEntries(headers),body:data.toString('base64')}:null;
    let decoded;try{decoded=JSON.parse(data.toString())}catch{}
    if(upstream.ok){if(decoded?.id)store.remember(owner,provider,decoded.id);if(typeof decoded?.name==='string'&&/^(?:models\/[a-zA-Z0-9._-]+\/)?operations\/[a-zA-Z0-9._-]+$/.test(decoded.name))store.remember(owner,provider,decoded.name)}
    const state=upstream.status>=500?'uncertain':upstream.ok?'completed':'rejected';
    if(idem)store.finish(owner,idem,state,saved);
    if(cache&&upstream.ok&&saved&&(decoded?.choices?.length>0&&decoded.choices.every(x=>x.finish_reason==='stop'&&x.message?.content&&!x.message?.tool_calls)||path==='/v1/embeddings'&&Array.isArray(decoded?.data)))store.cachePut(owner,cacheKey,saved,300);
    store.event(owner,{...event,status:upstream.status,state,latencyMs:Date.now()-started,usage:usageOf(decoded)});release();return new Response(data,{status:upstream.status,headers});
   }
   // Stream SSE/binary without buffering media or changing events. Streaming replay is deliberately disabled.
   const reader=upstream.body?.getReader();let terminal=false,pending='',usage=null,ended=false;const decoder=new TextDecoder();
   const finish=(state)=>{if(ended)return;ended=true;if(idem)store.finish(owner,idem,state,null);store.event(owner,{...event,status:upstream.status,state,latencyMs:Date.now()-started,usage});release()};
   const sse=upstream.headers.get('content-type')?.includes('text/event-stream');
   const stream=new ReadableStream({async pull(controller){try{
    const r=reader?await reader.read():{done:true};if(r.done){finish(upstream.status>=500||sse&&!terminal?'uncertain':upstream.ok?'completed':'rejected');controller.close();return}
    if(sse){pending+=decoder.decode(r.value,{stream:true});if(pending.length>1048576)pending='';const lines=pending.split('\n');pending=lines.pop();for(const line of lines){if(!line.startsWith('data:'))continue;const data=line.slice(5).trim();if(data==='[DONE]'){terminal=true;continue}try{const v=JSON.parse(data);if(['response.completed','message_stop'].includes(v.type))terminal=true;if(v.type==='response.created'&&v.response?.id)store.remember(owner,provider,v.response.id);if(v.type==='message_start'&&v.message?.id)store.remember(owner,provider,v.message.id);const current=usageOf(v.response||v.message||v);if(current)usage={...usage,...Object.fromEntries(Object.entries(current).filter(([,v])=>v!=null))}}catch{}}}
    controller.enqueue(r.value);
   }catch(e){finish('uncertain');controller.error(e)}},async cancel(){try{await reader?.cancel()}finally{finish('uncertain')}}});
   return new Response(stream,{status:upstream.status,headers});
  }catch(e){if(idem)store.finish(owner,idem,'uncertain',null);store.event(owner,{...event,state:'uncertain',latencyMs:Date.now()-started});release();throw new RouterError(502,'result_uncertain','Upstream result is uncertain. Do not resend automatically. Reconcile with the provider.');}
 }
}
function fromSaved(saved,extra){return new Response(Buffer.from(saved.body,'base64'),{status:saved.status,headers:{...saved.headers,...extra,'cache-control':'no-store'}})}
function requireOrigin(request,url){const origin=request.headers.get('origin');if(origin&&origin!==url.origin)throw new RouterError(403,'origin_rejected','Cross-origin mutation rejected')}
