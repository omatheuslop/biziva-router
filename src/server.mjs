import {createServer} from 'node:http';
import https from 'node:https';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {mkdirSync,readFileSync,chmodSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Store} from './store.mjs';import {makeGateway} from './gateway.mjs';import {attachRealtime} from './websocket.mjs';
export function createRouterServer({store,adminToken,catalog=[],publicOrigin,send,connect=https.request}){
 if(publicOrigin){const origin=new URL(publicOrigin);if(origin.origin!==publicOrigin||origin.username||origin.password||origin.protocol!=='https:'&&!['127.0.0.1','localhost','[::1]'].includes(origin.hostname))throw Error('ROUTER_PUBLIC_ORIGIN must be an exact HTTPS origin');}
 const gateway=makeGateway({store,adminToken,catalog,send});
 const server=createServer(async(req,res)=>{
  const controller=new AbortController();res.on('close',()=>{if(!res.writableFinished)controller.abort()});
  try{
   const origin=publicOrigin||'http://'+req.headers.host;const url=new URL(req.url,origin);
   if(!publicOrigin&&!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(req.headers.host||'')){res.writeHead(421);res.end();return}
   if(req.method==='GET'&&['/','/app.js','/style.css'].includes(url.pathname)){
    const name=url.pathname==='/'?'index.html':url.pathname.slice(1);res.writeHead(200,{'content-type':name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8','content-security-policy':"default-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'x-content-type-options':'nosniff','cache-control':'no-store','referrer-policy':'no-referrer'});res.end(readFileSync(new URL('../web/'+name,import.meta.url)));return;
   }
   const request=new Request(url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Readable.toWeb(req),duplex:'half',signal:controller.signal});
   const response=await gateway(request);res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body)await pipeline(Readable.fromWeb(response.body),res);else res.end();
  }catch{if(!res.headersSent){res.writeHead(500,{'content-type':'application/json'});res.end('{"error":{"code":"internal_error"}}')}else res.destroy()}
 });
 server.requestTimeout=300000;server.headersTimeout=15000;server.maxHeadersCount=100;
 server.closeRealtime=attachRealtime(server,{store,connect,publicOrigin}).close;return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const dir=resolve(process.env.ROUTER_DATA_DIR||'data');mkdirSync(dir,{recursive:true,mode:0o700});chmodSync(dir,0o700);
 const store=new Store(resolve(dir,'router.db'),process.env.ROUTER_MASTER_KEY);chmodSync(resolve(dir,'router.db'),0o600);
 const adminToken=process.env.ROUTER_ADMIN_TOKEN;const catalog=process.env.ROUTER_CATALOG_FILE?JSON.parse(readFileSync(process.env.ROUTER_CATALOG_FILE,'utf8')):[];
 const server=createRouterServer({store,adminToken,catalog,publicOrigin:process.env.ROUTER_PUBLIC_ORIGIN});
 const host=process.env.ROUTER_HOST||'127.0.0.1',port=Number(process.env.PORT||8787);
 server.listen(port,host,()=>console.log(JSON.stringify({event:'router_ready',host,port,version:'0.1.0',credentialsLogged:false})));
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,async()=>{await server.closeRealtime();server.close(()=>{store.close();process.exit(0)})});
}
