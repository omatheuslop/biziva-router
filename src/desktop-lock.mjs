import {openSync,writeFileSync,readFileSync,unlinkSync,closeSync} from 'node:fs';
import {join} from 'node:path';import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
export const probeProof=(secret,nonce)=>createHmac('sha256',secret).update(nonce).digest('hex');
async function claimDesktopLock(dir,port){
 const file=join(dir,'desktop.lock'),secret=randomBytes(32).toString('hex');let fd;
 try{fd=openSync(file,'wx',0o600)}catch(e){if(e.code!=='EEXIST')throw e;let prior;try{prior=JSON.parse(readFileSync(file,'utf8'))}catch{throw Error('Não foi possível verificar a outra instância. Preserve os dados locais.')}
 if(!Number.isSafeInteger(prior.pid)||prior.pid<1||!Number.isInteger(prior.port)||!/^[a-f0-9]{64}$/.test(prior.secret||''))throw Error('Bloqueio local inválido. Preserve o banco e confira a instância aberta.');
 let alive=true;try{process.kill(prior.pid,0)}catch(x){if(x.code==='ESRCH')alive=false}
 if(alive){if(prior.port===port&&typeof prior.secret==='string'){const nonce=randomBytes(32).toString('hex');try{const r=await fetch('http://127.0.0.1:'+port+'/router/desktop/probe?nonce='+nonce,{redirect:'error',signal:AbortSignal.timeout(2000)}),v=await r.json();if(typeof v.proof==='string'&&v.proof.length===64&&timingSafeEqual(Buffer.from(v.proof),Buffer.from(probeProof(prior.secret,nonce))))return {existing:true,url:'http://127.0.0.1:'+port+'/'}}catch{}}
 throw Error('O Router já está aberto ou iniciando. Aguarde e use a janela existente. Nenhum banco foi alterado.')}
 if(readFileSync(file,'utf8')!==JSON.stringify(prior))throw Error('Outra instância alterou o bloqueio. Tente novamente.');unlinkSync(file);return claimDesktopLock(dir,port);
 }
 const value=JSON.stringify({pid:process.pid,port,secret});writeFileSync(fd,value);closeSync(fd);
 return {existing:false,secret,release(){try{if(readFileSync(file,'utf8')===value)unlinkSync(file)}catch{}}};
}

export async function desktopLock(dir,port){const guard=join(dir,'desktop.start'),value=JSON.stringify({pid:process.pid,nonce:randomBytes(16).toString('hex')});let fd;try{fd=openSync(guard,'wx',0o600)}catch{throw Error('Uma inicialização está em andamento ou foi interrompida. Preserve o banco e confira o processo antes de remover apenas desktop.start.')}writeFileSync(fd,value);closeSync(fd);try{return await claimDesktopLock(dir,port)}finally{try{if(readFileSync(guard,'utf8')===value)unlinkSync(guard)}catch{}}}
