import {DatabaseSync} from 'node:sqlite';
import {createHash,randomBytes,createCipheriv,createDecipheriv,scryptSync,timingSafeEqual} from 'node:crypto';
export const hash=value=>createHash('sha256').update(value).digest('hex');
export class Store{
 constructor(path,masterKey){
  if(!/^[a-f0-9]{64}$/i.test(masterKey||''))throw Error('ROUTER_MASTER_KEY must be 32 random bytes encoded as hex');
  this.key=Buffer.from(masterKey,'hex');this.db=new DatabaseSync(path);this.db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS clients(id TEXT PRIMARY KEY,token_hash TEXT UNIQUE NOT NULL,created_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS vault(owner TEXT NOT NULL,provider TEXT NOT NULL,cipher TEXT NOT NULL,PRIMARY KEY(owner,provider));
  CREATE TABLE IF NOT EXISTS operations(owner TEXT NOT NULL,idem TEXT NOT NULL,fingerprint TEXT NOT NULL,state TEXT NOT NULL,response TEXT,created_at INTEGER NOT NULL,PRIMARY KEY(owner,idem));
  CREATE TABLE IF NOT EXISTS exact_cache(owner TEXT NOT NULL,key TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL,PRIMARY KEY(owner,key));
  CREATE TABLE IF NOT EXISTS resources(owner TEXT NOT NULL,provider TEXT NOT NULL,id TEXT NOT NULL,PRIMARY KEY(owner,provider,id));
  CREATE TABLE IF NOT EXISTS integration_tokens(owner TEXT PRIMARY KEY,token_hash TEXT UNIQUE NOT NULL);
  CREATE TABLE IF NOT EXISTS passwords(owner TEXT PRIMARY KEY,salt TEXT NOT NULL,hash TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,owner TEXT NOT NULL,expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS router_settings(owner TEXT PRIMARY KEY,revision INTEGER NOT NULL,data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,owner TEXT NOT NULL,data TEXT NOT NULL,created_at INTEGER NOT NULL);`);
   this.db.exec("UPDATE operations SET state='uncertain' WHERE state='running'");
 }
 seal(owner,purpose,value){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',this.key,iv);c.setAAD(Buffer.from(owner+':'+purpose));const encrypted=Buffer.concat([c.update(JSON.stringify(value)),c.final()]);return Buffer.concat([iv,c.getAuthTag(),encrypted]).toString('base64')}
 open(owner,purpose,value){const b=Buffer.from(value,'base64'),d=createDecipheriv('aes-256-gcm',this.key,b.subarray(0,12));d.setAAD(Buffer.from(owner+':'+purpose));d.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString())}
 createClient(id){const token='bzr_'+randomBytes(32).toString('hex');this.db.prepare('INSERT INTO clients VALUES(?,?,?)').run(id,hash(token),Date.now());return token}
 authenticate(token){return this.db.prepare('SELECT id FROM clients WHERE token_hash=?').get(hash(token||''))?.id||this.db.prepare('SELECT owner FROM sessions WHERE token_hash=? AND expires>?').get(hash(token||''),Date.now())?.owner||this.db.prepare('SELECT owner FROM integration_tokens WHERE token_hash=?').get(hash(token||''))?.owner||null}
 putKey(owner,provider,key){this.db.prepare('INSERT INTO vault VALUES(?,?,?) ON CONFLICT(owner,provider) DO UPDATE SET cipher=excluded.cipher').run(owner,provider,this.seal(owner,provider,{key}))}
 getKey(owner,provider){const row=this.db.prepare('SELECT cipher FROM vault WHERE owner=? AND provider=?').get(owner,provider);return row?this.open(owner,provider,row.cipher).key:null}
 deleteKey(owner,provider){this.db.prepare('DELETE FROM vault WHERE owner=? AND provider=?').run(owner,provider);this.db.prepare('DELETE FROM exact_cache WHERE owner=?').run(owner)}
 remember(owner,provider,id){if(typeof id==='string'&&id.length<500)this.db.prepare('INSERT OR IGNORE INTO resources VALUES(?,?,?)').run(owner,provider,id)}
 owns(owner,provider,id){return !!this.db.prepare('SELECT 1 FROM resources WHERE owner=? AND provider=? AND id=?').get(owner,provider,id)}
 providers(owner){return this.db.prepare('SELECT provider FROM vault WHERE owner=?').all(owner).map(x=>x.provider)}
 claim(owner,idem,fingerprint){
  const r=this.db.prepare("INSERT OR IGNORE INTO operations(owner,idem,fingerprint,state,created_at) VALUES(?,?,?,'running',?)").run(owner,idem,fingerprint,Date.now());
  if(r.changes)return {claimed:true};const row=this.db.prepare('SELECT * FROM operations WHERE owner=? AND idem=?').get(owner,idem);
  return {...row,response:row.response?this.open(owner,'operation:'+idem,row.response):null,claimed:false};
 }
 finish(owner,idem,state,response){this.db.prepare('UPDATE operations SET state=?,response=? WHERE owner=? AND idem=?').run(state,response?this.seal(owner,'operation:'+idem,response):null,owner,idem)}
 cacheGet(owner,key){const row=this.db.prepare('SELECT response FROM exact_cache WHERE owner=? AND key=? AND expires>?').get(owner,key,Date.now());return row?this.open(owner,'cache:'+key,row.response):null}
 cachePut(owner,key,response,seconds){this.db.prepare('DELETE FROM exact_cache WHERE expires<=?').run(Date.now());this.db.prepare('INSERT INTO exact_cache VALUES(?,?,?,?) ON CONFLICT(owner,key) DO UPDATE SET response=excluded.response,expires=excluded.expires').run(owner,key,this.seal(owner,'cache:'+key,response),Date.now()+seconds*1000)}
 event(owner,data){this.db.prepare('INSERT INTO events(owner,data,created_at) VALUES(?,?,?)').run(owner,JSON.stringify(data),Date.now());this.db.prepare('DELETE FROM events WHERE created_at<?').run(Date.now()-30*86400000)}
 metrics(owner){const rows=this.db.prepare('SELECT data FROM events WHERE owner=? ORDER BY id DESC LIMIT 1000').all(owner).map(r=>JSON.parse(r.data));return {window:'last 1000 events, at most 30 days',requests:rows.length,upstreamCalls:rows.filter(x=>x.upstreamCall).length,cacheHits:rows.filter(x=>x.cacheHit).length,uncertain:rows.filter(x=>x.state==='uncertain').length,providerReportedUsd:rows.reduce((s,x)=>s+(x.usage?.providerReportedUsd||0),0),costIncomplete:rows.some(x=>x.upstreamCall&&x.usage?.providerReportedUsd==null),events:rows}}
 integrationToken(owner){const token='bzi_'+randomBytes(32).toString('hex');this.db.prepare('INSERT INTO integration_tokens VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET token_hash=excluded.token_hash').run(owner,hash(token));return token}
 setPassword(owner,password){
  if(typeof password!=='string'||password.length<10||password.length>256){const e=Error('Use uma senha com 10 a 256 caracteres.');e.status=400;e.code='invalid_password';throw e}
  const salt=randomBytes(16).toString('hex'),value=scryptSync(password,salt,32).toString('hex');this.db.prepare('INSERT INTO passwords VALUES(?,?,?) ON CONFLICT(owner) DO UPDATE SET salt=excluded.salt,hash=excluded.hash').run(owner,salt,value);
 }
 passwordLogin(owner,password){
  if(typeof owner!=='string'||typeof password!=='string'||password.length>256)return null;
  const row=this.db.prepare('SELECT salt,hash FROM passwords WHERE owner=?').get(owner);
  const got=scryptSync(password,row?.salt||'synthetic-constant-for-missing-account',32);
  if(!row||!timingSafeEqual(got,Buffer.from(row.hash,'hex')))return null;
  const token='bzs_'+randomBytes(32).toString('hex');this.db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),owner,Date.now()+12*3600000);return token;
 }
 logout(token){this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token))}
 settings(owner){const row=this.db.prepare('SELECT revision,data FROM router_settings WHERE owner=?').get(owner);return row?{...JSON.parse(row.data),revision:row.revision}:null}
 saveSettings(owner,data,expected){
  this.db.exec('BEGIN IMMEDIATE');try{const current=this.settings(owner);if((current?.revision||0)!==expected){const e=Error('A configuração foi alterada em outra janela. Atualize antes de salvar.');e.status=409;e.code='settings_conflict';throw e}
   const revision=expected+1;this.db.prepare('INSERT INTO router_settings VALUES(?,?,?) ON CONFLICT(owner) DO UPDATE SET revision=excluded.revision,data=excluded.data').run(owner,revision,JSON.stringify(data));this.db.exec('COMMIT');return revision;
  }catch(e){this.db.exec('ROLLBACK');throw e}
 }
 clientCount(){return this.db.prepare('SELECT COUNT(*) n FROM clients').get().n}
 close(){this.db.close()}
}
