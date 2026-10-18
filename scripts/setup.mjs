import {randomBytes} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

if(Number(process.versions.node.split('.')[0])<24)throw Error('Install Node.js 24 or later first.');
const target=resolve('.env');
const content='# Private local configuration. Back up securely; never commit or share.\n'+
 `ROUTER_MASTER_KEY=${randomBytes(32).toString('hex')}\n`+
 `ROUTER_ADMIN_TOKEN=${randomBytes(32).toString('hex')}\n`+
 'ROUTER_HOST=127.0.0.1\nPORT=8787\n';
try{
 writeFileSync(target,content,{flag:'wx',mode:0o600});
 console.log('Created private .env. Keep it across restarts and back it up securely.');
}catch(error){
 if(error.code!=='EEXIST')throw error;
 console.log('Existing .env preserved. No credentials were changed.');
}
console.log('Execute npm start em seu terminal e abra o link privado de primeiro acesso mostrado. Depois, siga o assistente no navegador. Em instalações de servidor, peça ao administrador para criar seu acesso.');
