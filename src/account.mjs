import {randomBytes,createCipheriv,createDecipheriv,scryptSync} from 'node:crypto';
import {RouterError} from './core.mjs';
import {validateRoutes} from './workbench.mjs';
import {PROVIDERS} from './providers.mjs';
const bad=()=>{throw new RouterError(400,'invalid_backup','Backup inválido ou senha incorreta. Nada foi importado.')};
export function encryptBackup(value,password){
 if(typeof password!=='string'||password.length<12||password.length>256)throw new RouterError(400,'backup_password','Use uma senha de backup com 12 a 256 caracteres.');
 const salt=randomBytes(16),iv=randomBytes(12),key=scryptSync(password,salt,32),c=createCipheriv('aes-256-gcm',key,iv);c.setAAD(Buffer.from('biziva-backup-v1'));
 const data=Buffer.concat([c.update(JSON.stringify(value)),c.final()]);return {format:'biziva-backup-v1',salt:salt.toString('hex'),iv:iv.toString('hex'),tag:c.getAuthTag().toString('hex'),data:data.toString('base64')};
}
export function decryptBackup(value,password){
 if(typeof password!=='string'||password.length<12||password.length>256||value?.format!=='biziva-backup-v1'||!/^[a-f0-9]{32}$/.test(value.salt)||!/^[a-f0-9]{24}$/.test(value.iv)||!/^[a-f0-9]{32}$/.test(value.tag)||typeof value.data!=='string'||value.data.length>12000000)bad();
 try{const d=createDecipheriv('aes-256-gcm',scryptSync(password,Buffer.from(value.salt,'hex'),32),Buffer.from(value.iv,'hex'));d.setAAD(Buffer.from('biziva-backup-v1'));d.setAuthTag(Buffer.from(value.tag,'hex'));return JSON.parse(Buffer.concat([d.update(Buffer.from(value.data,'base64')),d.final()]).toString())}catch{bad()}
}
export function conversation(value){
 if(!value||!Array.isArray(value.messages)||value.messages.length>40||!PROVIDERS[value.provider]||!['assistant','writing','summary','coding','planning','analysis'].includes(value.agent)||typeof value.title!=='string'||value.title.length>120)throw new RouterError(400,'invalid_conversation','Conversa inválida.');
 for(const m of value.messages)if(!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>32000)throw new RouterError(400,'invalid_conversation','Conversa inválida.');
 if(Buffer.byteLength(JSON.stringify(value))>256000)throw new RouterError(413,'conversation_too_large','A conversa excede o limite local.');
 if(value.instructions!=null&&(typeof value.instructions!=='string'||value.instructions.length>16000))throw new RouterError(400,'invalid_conversation','Instruções inválidas.');
 return {title:value.title,provider:value.provider,agent:value.agent,instructions:value.instructions||'',messages:value.messages.map(m=>({role:m.role,content:m.content}))};
}
export function validateBackup(value,owner){
 if(!value||value.owner!==owner||!Array.isArray(value.keys)||value.keys.length>10||!Array.isArray(value.conversations)||value.conversations.length>50||!Array.isArray(value.operations)||value.operations.length>2000||!Array.isArray(value.resources)||value.resources.length>10000)bad();
 if(value.settings){if(!['fixed','reuse','economy'].includes(value.settings.profile))bad();value.settings={profile:value.settings.profile,routes:validateRoutes(value.settings.routes)}}
 for(const x of value.keys)if(!PROVIDERS[x.provider]||typeof x.key!=='string'||x.key.length<8||x.key.length>4096||/[\r\n]/.test(x.key))bad();
 for(const x of value.conversations){if(!/^[a-zA-Z0-9_-]{1,80}$/.test(x.id))bad();x.value=conversation(x.value)}
 for(const x of value.operations){if(x.receipt&&(!PROVIDERS[x.receipt.provider]||!/^[a-f0-9]{64}$/.test(x.receipt.credential||'')||typeof x.receipt.path!=='string'||x.receipt.path.length>500||x.receipt.resourceId!=null&&(typeof x.receipt.resourceId!=='string'||x.receipt.resourceId.length>200)||x.receipt.resourceType!=null&&!['responses','videos'].includes(x.receipt.resourceType)))bad();if(typeof x.idem!=='string'||!/^[\x21-\x7e]{1,200}$/.test(x.idem)||!/^[a-f0-9]{64}$/.test(x.fingerprint)||!['completed','running','uncertain','rejected'].includes(x.state)||!Number.isSafeInteger(x.created_at)||x.response&&(!Number.isInteger(x.response.status)||x.response.status<200||x.response.status>599||typeof x.response.body!=='string'||x.response.body.length>1400000||!x.response.headers||typeof x.response.headers!=='object'))bad()}
 for(const x of value.operations)if(x.response){x.response.headers=Object.fromEntries(Object.entries(x.response.headers).filter(([k,v])=>['content-type','x-biziva-request-id','x-biziva-provider','x-biziva-model','x-biziva-cache'].includes(k)&&typeof v==='string'&&!/[\r\n]/.test(v)));x.response.headers['x-should-retry']='false';x.response.headers['cache-control']='no-store';if(![204,205,304].includes(x.response.status)&&!/^application\/json(?:\s*;|$)/i.test(x.response.headers['content-type']||''))bad();if(![204,205,304].includes(x.response.status))x.response.headers['content-type']='application/json; charset=utf-8'}
 for(const x of value.resources)if(!PROVIDERS[x.provider]||typeof x.id!=='string'||x.id.length>500)bad();
 return value;
}
