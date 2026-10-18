// Native realtime tunnel: preserves model and frames. No compression, cache, retry or protocol conversion.
export function attachRealtime(server,{store,connect,publicOrigin,isDraining=()=>false}){
 const active=new Map(),sockets=new Set();
 server.on('upgrade',(req,socket,head)=>{
  sockets.add(socket);socket.once('close',()=>sockets.delete(socket));
  const reject=status=>{socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`)};
  try{
   if(isDraining())return reject('503 Service Unavailable');
   if(!publicOrigin&&!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(req.headers.host||''))return reject('421 Misdirected Request');
   const url=new URL(req.url,publicOrigin||'http://'+req.headers.host),origin=req.headers.origin;
   if(origin&&origin!==url.origin)return reject('403 Forbidden');
   if(url.pathname!=='/v1/realtime'||[...url.searchParams.keys()].some(x=>x!=='model')||!url.searchParams.get('model')||url.searchParams.get('model').length>200)return reject('400 Bad Request');
   const token=String(req.headers.authorization||'').replace(/^Bearer /i,''),owner=store.authenticate(token);if(!owner)return reject('401 Unauthorized');
   const key=store.getKey(owner,'openai');if(!key)return reject('409 Conflict');
   if((active.get(owner)||0)>=2)return reject('429 Too Many Requests');
   if(req.headers['sec-websocket-protocol']&&req.headers['sec-websocket-protocol']!=='realtime')return reject('400 Bad Request');
   const headers={authorization:'Bearer '+key,upgrade:'websocket',connection:'Upgrade','sec-websocket-key':req.headers['sec-websocket-key'],'sec-websocket-version':'13'};
   if(req.headers['sec-websocket-protocol'])headers['sec-websocket-protocol']='realtime';if(req.headers['openai-beta'])headers['openai-beta']=req.headers['openai-beta'];
   active.set(owner,(active.get(owner)||0)+1);let done=false,remote=null;const started=Date.now();
   const finish=state=>{if(done)return;done=true;active.set(owner,Math.max(0,(active.get(owner)||1)-1));store.event(owner,{provider:'openai',path:'/v1/realtime',model:url.searchParams.get('model'),upstreamCall:true,state,latencyMs:Date.now()-started,usage:null})};
   const upstream=connect('https://api.openai.com/v1/realtime'+url.search,{method:'GET',headers});
   upstream.setTimeout(30000,()=>upstream.destroy());
   upstream.on('upgrade',(res,other,otherHead)=>{remote=other;upstream.setTimeout(0);let lines='HTTP/1.1 101 Switching Protocols\r\n';for(const name of ['upgrade','connection','sec-websocket-accept','sec-websocket-protocol'])if(res.headers[name])lines+=name+': '+res.headers[name]+'\r\n';socket.write(lines+'\r\n');if(otherHead.length)socket.write(otherHead);if(head.length)other.write(head);socket.pipe(other).pipe(socket);other.on('error',()=>{finish('uncertain');socket.destroy()});other.on('close',()=>{finish('closed_usage_unknown');socket.destroy()});});
   upstream.on('response',res=>{res.resume();finish('rejected');reject('502 Bad Gateway')});upstream.on('error',()=>{finish('uncertain');socket.destroy()});socket.on('error',()=>{finish('uncertain');upstream.destroy();remote?.destroy()});socket.on('close',()=>{finish('closed_usage_unknown');upstream.destroy();remote?.destroy()});upstream.end();
  }catch{reject('500 Internal Server Error')}
 });
 return {activeCount:()=>sockets.size,async close(){await Promise.all([...sockets].map(s=>new Promise(resolve=>{s.once('close',resolve);s.destroy()})))}};
}
