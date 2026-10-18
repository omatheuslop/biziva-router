import test from 'node:test';import assert from 'node:assert/strict';
import {Store} from '../src/store.mjs';import {makeGateway} from '../src/gateway.mjs';
import {validateRoutes} from '../src/workbench.mjs';
const master='ab'.repeat(32),admin='synthetic-workbench-admin-fixture-only';
const row=(model='cheap',price=1)=>({provider:'openai',model,task:'general',path:'/v1/chat/completions',approved:true,qualityAccepted:true,priceCheckedAt:new Date().toISOString(),inputUsdPerMillion:price,outputUsdPerMillion:price,contextTokens:100000});
function fixture(send=async()=>Response.json({choices:[{message:{content:'synthetic'},finish_reason:'stop'}],usage:{prompt_tokens:5,completion_tokens:2,cost:.0001}})){
 const store=new Store(':memory:',master),a=store.createClient('a'),b=store.createClient('b');store.putKey('a','openai','synthetic-provider-key-a');store.putKey('b','openai','synthetic-provider-key-b');let calls=0,seen;
 const handle=makeGateway({store,adminToken:admin,send:async(u,o)=>{calls++;seen=JSON.parse(o.body);return send(u,o)}});
 const req=(token,path,body,method='POST',headers={})=>handle(new Request('http://localhost'+path,{method,headers:{authorization:'Bearer '+token,'content-type':'application/json',...headers},body:method==='GET'?undefined:JSON.stringify(body)}));
 const save=async(routes=[row()],profile='fixed',revision=0)=>req(a,'/router/settings',{routes,profile,revision},'PUT');
 const input=(extra={})=>({provider:'openai',path:'/v1/chat/completions',profile:'fixed',body:{model:'cheap',messages:[{role:'user',content:'Hello'}],max_tokens:64},maxEstimatedUsd:1,...extra});
 return {store,a,b,req,save,input,calls:()=>calls,seen:()=>seen};
}
test('settings are private, persistent and use revision compare-and-swap',async()=>{const f=fixture();try{
 assert.equal((await f.save()).status,200);assert.equal(f.store.settings('a').revision,1);assert.equal(f.store.settings('b'),null);
 const foreign=await(await f.req(f.b,'/router/settings',null,'GET')).json();assert.equal(foreign.routes.length,0);
 const writes=await Promise.all([f.save([row('one')],'reuse',1),f.save([row('two')],'fixed',1)]);assert.deepEqual(writes.map(r=>r.status).sort(),[200,409]);
 assert.equal((await f.req(f.a,'/router/settings',{routes:[],profile:'fixed',revision:2},'PUT',{origin:'https://other.invalid'})).status,403);
}finally{f.store.close()}});
test('approval, native protocol, finite price and media constraints are validated',()=>{
 assert.throws(()=>validateRoutes([{...row(),qualityAccepted:false}]));assert.throws(()=>validateRoutes([{...row(),inputUsdPerMillion:-1}]));assert.throws(()=>validateRoutes([{...row(),provider:'gemini'}]));assert.throws(()=>validateRoutes([row(),row()]));
 assert.equal(validateRoutes([row()])[0].capabilities[0],'/v1/chat/completions');
});
test('preview makes no provider call; paid confirmation and owner are required; run consumes once',async()=>{const f=fixture();try{
 await f.save();const p=await(await f.req(f.a,'/router/playground/preview',f.input())).json();assert.ok(p.previewId);assert.equal(f.calls(),0);
 assert.equal((await f.req(f.b,'/router/playground/run',{previewId:p.previewId,confirmPaid:true})).status,409);
 assert.equal((await f.req(f.a,'/router/playground/run',{previewId:p.previewId})).status,400);assert.equal(f.calls(),0);
 const results=await Promise.all([f.req(f.a,'/router/playground/run',{previewId:p.previewId,confirmPaid:true}),f.req(f.a,'/router/playground/run',{previewId:p.previewId,confirmPaid:true})]);assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);assert.equal(f.calls(),1);
}finally{f.store.close()}});
test('economy requires consent, chooses cheaper qualified model and pins reviewed model',async()=>{const f=fixture();try{
 await f.save([row('expensive',10),row('cheap',1)]);
 const input=f.input({profile:'economy',body:{model:'biziva-auto',messages:[{role:'user',content:'Hello'}],max_tokens:64}});
 assert.equal((await f.req(f.a,'/router/playground/preview',input)).status,400);
 const p=await(await f.req(f.a,'/router/playground/preview',{...input,allowSwitch:true})).json();assert.equal(p.model,'cheap');
 assert.equal((await f.req(f.a,'/router/playground/run',{previewId:p.previewId,confirmPaid:true})).status,200);assert.equal(f.seen().model,'cheap');assert.equal(f.calls(),1);
}finally{f.store.close()}});
test('stale key/config and exceeded estimate refuse before dispatch',async()=>{const f=fixture();try{
 await f.save();assert.equal((await f.req(f.a,'/router/playground/preview',f.input({maxEstimatedUsd:.000000001}))).status,422);
 const p=await(await f.req(f.a,'/router/playground/preview',f.input())).json();f.store.putKey('a','openai','synthetic-rotated-provider-key');assert.equal((await f.req(f.a,'/router/playground/run',{previewId:p.previewId,confirmPaid:true})).status,409);
 const q=await(await f.req(f.a,'/router/playground/preview',f.input())).json();await f.save([row()],'reuse',1);assert.equal((await f.req(f.a,'/router/playground/run',{previewId:q.previewId,confirmPaid:true})).status,409);assert.equal(f.calls(),0);
}finally{f.store.close()}});
test('expired prices and stateful/streaming previews fail closed; native exact API stays available',async()=>{const f=fixture();try{
 await f.save([{...row(),priceCheckedAt:new Date(Date.now()-31*86400000).toISOString()}]);assert.equal((await f.req(f.a,'/router/playground/preview',f.input())).status,422);
 await f.save([row()],'fixed',1);for(const extra of [{stream:true},{previous_response_id:'other'},{background:true},{n:2}])assert.equal((await f.req(f.a,'/router/playground/preview',f.input({body:{...f.input().body,...extra}}))).status,422);
 assert.equal((await f.req(f.a,'/v1/chat/completions',f.input().body)).status,200);
}finally{f.store.close()}});
test('uncertain test is never dispatched twice and cache profile avoids identical paid calls',async()=>{
 const fail=fixture(async()=>{throw Error('synthetic uncertain')});try{await fail.save();const p=await(await fail.req(fail.a,'/router/playground/preview',fail.input())).json();assert.equal((await fail.req(fail.a,'/router/playground/run',{previewId:p.previewId,confirmPaid:true})).status,502);assert.equal((await fail.req(fail.a,'/router/playground/run',{previewId:p.previewId,confirmPaid:true})).status,409);assert.equal(fail.calls(),1)}finally{fail.store.close()}
 const f=fixture();try{await f.save();for(let i=0;i<2;i++){const p=await(await f.req(f.a,'/router/playground/preview',f.input({profile:'reuse'}))).json();const r=await f.req(f.a,'/router/playground/run',{previewId:p.previewId,confirmPaid:true});assert.equal(r.status,200);if(i)assert.equal(r.headers.get('x-biziva-cache'),'hit')}assert.equal(f.calls(),1)}finally{f.store.close()}
});
test('media previews preserve quality and native JSON; incompatible settings refuse',async()=>{const f=fixture();try{
 const media={provider:'openai',model:'image-model',task:'general',path:'/v1/images/generations',approved:true,qualityAccepted:true,priceCheckedAt:new Date().toISOString(),usdPerUnit:.05,priceUnit:'image',maxInputBytes:1000000,supportedParameters:['size','quality','n'],constraints:{size:['1024x1024'],quality:['high']}};
 await f.save([media]);const input=f.input({path:media.path,body:{model:'image-model',prompt:'synthetic',size:'1024x1024',quality:'high',n:1}});const p=await(await f.req(f.a,'/router/playground/preview',input)).json();assert.equal(p.estimatedUsd,.05);assert.equal((await f.req(f.a,'/router/playground/run',{previewId:p.previewId,confirmPaid:true})).status,200);assert.equal(f.seen().quality,'high');assert.equal(f.seen().size,'1024x1024');
 assert.equal((await f.req(f.a,'/router/playground/preview',{...input,body:{...input.body,quality:'low'}})).status,422);
}finally{f.store.close()}});
test('bootstrap requires private capability, origin, expiry and an empty installation, one use',async()=>{
 const s=new Store(':memory:',master),bootstrap={token:'synthetic-private-first-access-capability',expires:Date.now()+60000,used:false};const h=makeGateway({store:s,adminToken:admin,bootstrap,send:()=>{throw Error('forbidden')}});
 const req=(token,origin)=>h(new Request('http://localhost/router/setup',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json',...(origin?{origin}:{})},body:JSON.stringify({id:'first'})}));
 try{assert.equal((await req('bad')).status,401);assert.equal((await req(bootstrap.token,'https://evil.invalid')).status,403);const attempts=await Promise.all([req(bootstrap.token),req(bootstrap.token)]);assert.deepEqual(attempts.map(r=>r.status).sort(),[201,409]);assert.equal(s.clientCount(),1);assert.equal((await req(bootstrap.token)).status,401)}finally{s.close()}
 const expired=new Store(':memory:',master);try{const h2=makeGateway({store:expired,adminToken:admin,bootstrap:{...bootstrap,used:false,expires:Date.now()-1}});assert.equal((await h2(new Request('http://localhost/router/setup',{method:'POST',headers:{authorization:'Bearer '+bootstrap.token},body:'{}'}))).status,401)}finally{expired.close()}
});
test('password sign-in is scoped, hashed, rate-limited; integration tokens survive session logout',async()=>{
 const s=new Store(':memory:',master),bootstrap={token:'synthetic-password-setup-capability',expires:Date.now()+60000,used:false};const h=makeGateway({store:s,adminToken:admin,bootstrap});
 const req=(path,body,token='')=>h(new Request('http://localhost'+path,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body)}));
 try{
  const created=await req('/router/setup',{id:'person',password:'synthetic-password-only'},bootstrap.token);assert.equal(created.status,201);
  assert.notEqual(s.db.prepare('SELECT hash FROM passwords').get().hash,'synthetic-password-only');
  assert.equal((await req('/router/login',{id:'person',password:'wrong'})).status,401);
  const login=await(await req('/router/login',{id:'person',password:'synthetic-password-only'})).json();assert.equal(s.authenticate(login.token),'person');
  const integration=await(await req('/router/integration-token',{},login.token)).json();assert.equal(s.authenticate(integration.token),'person');
  assert.equal((await req('/router/logout',{},login.token)).status,200);assert.equal(s.authenticate(login.token),null);assert.equal(s.authenticate(integration.token),'person');
  for(let i=0;i<10;i++)await req('/router/login',{id:'person',password:'wrong'});assert.equal((await req('/router/login',{id:'person',password:'synthetic-password-only'})).status,429);
 }finally{s.close()}
});
test('public catalog metadata never sends a provider key or approves quality',async()=>{
 const {fetchCatalog}=await import('../src/catalog.mjs');let seen;
 const result=await fetchCatalog(async(url,options)=>{seen={url,options};return Response.json({data:[{id:'vendor/model',name:'Sample',context_length:16000,architecture:{input_modalities:['text'],output_modalities:['text']},pricing:{prompt:'0.000001',completion:'0.000002',request:'0'}},{id:'bad',context_length:10,architecture:{input_modalities:['text'],output_modalities:['text']},pricing:{prompt:'-1',completion:'1'}}]})});
 assert.equal(seen.url,'https://openrouter.ai/api/v1/models');assert.equal(seen.options.headers,undefined);assert.equal(result.models.length,1);assert.equal(result.models[0].inputUsdPerMillion,1);assert.equal(result.models[0].approved,false);
});
test('Gemini playground preserves native content and resolves only the reviewed model URL',async()=>{
 let seen;const s=new Store(':memory:',master),token=s.createClient('g');s.putKey('g','gemini','synthetic-gemini-key');const h=makeGateway({store:s,adminToken:admin,send:async(url,o)=>{seen={url,body:JSON.parse(o.body)};return Response.json({candidates:[{content:{parts:[{text:'synthetic'}]}}]})}});
 const req=(path,body,method='POST')=>h(new Request('http://localhost'+path,{method,headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body)}));
 try{const route={...row('gemini-synthetic'),provider:'gemini',path:'/v1beta/models/MODEL:generateContent'};assert.equal((await req('/router/settings',{revision:0,profile:'fixed',routes:[route]},'PUT')).status,200);
  const body={model:'gemini-synthetic',contents:[{role:'user',parts:[{text:'Hello'}]}],generationConfig:{maxOutputTokens:64}};
  const p=await(await req('/router/playground/preview',{provider:'gemini',path:route.path,profile:'fixed',body,maxEstimatedUsd:1})).json();assert.ok(p.previewId);
  assert.equal((await req('/router/playground/run',{previewId:p.previewId,confirmPaid:true})).status,200);assert.equal(seen.url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-synthetic:generateContent');const {model,...native}=body;assert.deepEqual(seen.body,native);
 }finally{s.close()}
});

test('Biziva video route preview requires paid confirmation and only creates once',async()=>{
 const f=fixture(async(url,o)=>{assert.equal(url,'https://api.biziva.com.br/v1/videos');assert.equal(o.headers.get('authorization'),'Bearer synthetic-biziva-key');return Response.json({id:'video_workbench_032',status:'submitted'},{status:202})});
 try{f.store.putKey('a','biziva','synthetic-biziva-key');
  const route={provider:'biziva',model:'biziva-video',task:'video',path:'/v1/videos',approved:true,qualityAccepted:true,priceCheckedAt:new Date().toISOString(),usdPerUnit:0.01,priceUnit:'request',maxInputBytes:100000,supportedParameters:['seconds','resolution','audio'],constraints:{seconds:[5],resolution:['720p']}};
  assert.equal((await f.save([route])).status,200);
  const input={provider:'biziva',path:'/v1/videos',profile:'fixed',task:'video',maxEstimatedUsd:1,body:{model:'biziva-video',prompt:'synthetic ball',seconds:5,resolution:'720p',audio:true}};
  const p=await f.req(f.a,'/router/playground/preview',input);assert.equal(p.status,200);const {previewId}=await p.json();assert.equal(f.calls(),0);
  assert.equal((await f.req(f.a,'/router/playground/run',{previewId,confirmPaid:false})).status,400);assert.equal(f.calls(),0);
  assert.equal((await f.req(f.a,'/router/playground/run',{previewId,confirmPaid:true})).status,202);assert.equal(f.calls(),1);assert.deepEqual(f.seen(),input.body);
  assert.equal((await f.req(f.a,'/router/playground/run',{previewId,confirmPaid:true})).status,409);assert.equal(f.calls(),1);
 }finally{f.store.close()}
});
