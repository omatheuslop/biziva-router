import {mkdirSync,existsSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';import {homedir} from 'node:os';import {randomBytes} from 'node:crypto';import {execFile} from 'node:child_process';
export function prepareDesktop(){
 const dir=process.env.BIZIVA_DESKTOP_DATA||join(homedir(),'.biziva-router');mkdirSync(dir,{recursive:true,mode:0o700});
 const file=join(dir,'.env');if(!existsSync(file))writeFileSync(file,`ROUTER_MASTER_KEY=${randomBytes(32).toString('hex')}\nROUTER_ADMIN_TOKEN=${randomBytes(32).toString('hex')}\n`,{flag:'wx',mode:0o600});
 // Desktop is deliberately local. Never inherit a remote bind/origin from another application.
 delete process.env.ROUTER_MASTER_KEY;delete process.env.ROUTER_ADMIN_TOKEN;process.loadEnvFile(file);
 if(process.env.BIZIVA_DESKTOP_NO_OPEN!=='1')process.env.PORT='8787';process.env.ROUTER_DATA_DIR=dir;process.env.ROUTER_HOST='127.0.0.1';delete process.env.ROUTER_PUBLIC_ORIGIN;delete process.env.ROUTER_CATALOG_FILE;
 return dir;
}
export function openDesktop(url){
 const parsed=new URL(url);if(parsed.protocol!=='http:'||parsed.hostname!=='127.0.0.1')throw Error('Desktop opens only its own local server');
 const [cmd,args]=process.platform==='darwin'?['open',[url]]:process.platform==='win32'?['rundll32',['url.dll,FileProtocolHandler',url]]:['xdg-open',[url]];
 execFile(cmd,args,{windowsHide:true},error=>{if(error)console.error('Não foi possível abrir o navegador. O Router continua disponível no endereço local informado.');});
}
