import {isSea,getAsset} from 'node:sea';
import {desktopLock,probeProof} from './desktop-lock.mjs';
import {prepareDesktop,openDesktop} from './desktop.mjs';
import {createServer} from 'node:http';
import https from 'node:https';
import {randomBytes} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {mkdirSync,readFileSync,chmodSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VERSION} from './core.mjs';
import {Store} from './store.mjs';import {makeGateway} from './gateway.mjs';import {attachRealtime} from './websocket.mjs';
export function createRouterServer({store,adminToken,catalog=[],publicOrigin,send,connect=https.request,bootstrap=null,onQuit=null,desktopProof=null,metadataSend}){
 if(publicOrigin){const origin=new URL(publicOrigin);if(origin.origin!==publicOrigin||origin.username||origin.password||origin.protocol!=='https:'&&!['127.0.0.1','localhost','[::1]'].includes(origin.hostname))throw Error('ROUTER_PUBLIC_ORIGIN must be an exact HTTPS origin');}
 const gateway=makeGateway({store,adminToken,catalog,send,bootstrap,metadataSend,onQuit,isRealtimeBusy:()=>realtime?.activeCount()>0});
 let realtime;
 const server=createServer(async(req,res)=>{
  const controller=new AbortController();res.on('close',()=>{if(!res.writableFinished)controller.abort()});
  try{
   const origin=publicOrigin||'http://'+req.headers.host;const url=new URL(req.url,origin);
   if(!publicOrigin&&!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(req.headers.host||'')){res.writeHead(421);res.end();return}
   if(req.method==='GET'&&url.pathname==='/router/desktop/probe'&&desktopProof){const nonce=url.searchParams.get('nonce');if(!/^[a-f0-9]{64}$/.test(nonce||'')){res.writeHead(400);res.end();return}res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({proof:probeProof(desktopProof,nonce)}));return}
   if(req.method==='GET'&&['/','/app.js','/workbench.js','/chat.js','/controls.js','/style.css'].includes(url.pathname)){
    const name=url.pathname==='/'?'index.html':url.pathname.slice(1);res.writeHead(200,{'content-type':name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8','content-security-policy':"default-src 'self'; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'x-content-type-options':'nosniff','cache-control':'no-store','referrer-policy':'no-referrer'});res.end(isSea()?getAsset('web/'+name,'utf8'):readFileSync(new URL('../web/'+name,import.meta.url)));return;
   }
   const request=new Request(url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Readable.toWeb(req),duplex:'half',signal:controller.signal});
   const response=await gateway(request);res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body)await pipeline(Readable.fromWeb(response.body),res);else res.end();
  }catch{if(!res.headersSent){res.writeHead(500,{'content-type':'application/json'});res.end('{"error":{"code":"internal_error"}}')}else res.destroy()}
 });
 server.requestTimeout=300000;server.headersTimeout=15000;server.maxHeadersCount=100;
 realtime=attachRealtime(server,{store,connect,publicOrigin,isDraining:gateway.isDraining});server.closeRealtime=realtime.close;return server;
}
async function main(){
 const desktop=isSea()||process.argv.includes('--desktop');if(desktop)prepareDesktop();
 const dir=resolve(process.env.ROUTER_DATA_DIR||'data');mkdirSync(dir,{recursive:true,mode:0o700});chmodSync(dir,0o700);
 const port=Number(process.env.PORT||8787);const lock=await desktopLock(dir,port);if(lock?.existing){if(desktop&&process.env.BIZIVA_DESKTOP_NO_OPEN!=='1')openDesktop(lock.url);return}if(lock)process.once('exit',()=>lock.release());
 const store=new Store(resolve(dir,'router.db'),process.env.ROUTER_MASTER_KEY);chmodSync(resolve(dir,'router.db'),0o600);
 const adminToken=process.env.ROUTER_ADMIN_TOKEN;const catalog=process.env.ROUTER_CATALOG_FILE?JSON.parse(readFileSync(process.env.ROUTER_CATALOG_FILE,'utf8')):[];
 const host=process.env.ROUTER_HOST||'127.0.0.1';
 // First-account capability is issued only on explicit interactive local startup, never in service logs.
 const bootstrap=(desktop||process.argv.includes('--onboard')&&process.stdout.isTTY)&&!process.env.ROUTER_PUBLIC_ORIGIN&&['127.0.0.1','localhost','::1'].includes(host)&&store.clientCount()===0?{token:randomBytes(32).toString('hex'),expires:Date.now()+600000,used:false}:null;
 const shutdown=async()=>{await server.closeRealtime();server.close(()=>{store.close();lock?.release();process.exit(0)})};
 const server=createRouterServer({store,adminToken,catalog,publicOrigin:process.env.ROUTER_PUBLIC_ORIGIN,bootstrap,onQuit:desktop?shutdown:null,desktopProof:lock?.secret});
 server.on('error',error=>{if(error.code==='EADDRINUSE')console.error('A porta já está em uso. Feche a outra instância do Router antes de abrir novamente.');else console.error('Não foi possível iniciar o Router.');store.close();lock?.release();process.exitCode=1});
 server.listen(port,host,()=>{console.log(JSON.stringify({event:'router_ready',host,port:server.address().port,version:VERSION,credentialsLogged:false}));const link='http://'+(host==='::1'?'[::1]':host)+':'+server.address().port+'/'+(bootstrap?'#setup='+bootstrap.token:'');if(desktop){if(process.env.BIZIVA_DESKTOP_NO_OPEN!=='1')openDesktop(link)}else if(bootstrap)console.log('Primeiro acesso: abra este link privado neste computador (expira em 10 minutos; não compartilhe): '+link)});
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,shutdown);
}

if(isSea()||process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Não foi possível iniciar. Outra instância pode estar aberta. Preserve os dados locais.');process.exitCode=1});
