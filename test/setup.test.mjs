import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

test('setup persists private independent secrets, never prints them and never overwrites',()=>{
 const dir=mkdtempSync(join(tmpdir(),'bzr-setup-'));
 try{
  const setup=fileURLToPath(new URL('../scripts/setup.mjs',import.meta.url));
  const run=()=>spawnSync(process.execPath,[setup],{cwd:dir,encoding:'utf8'});
  const first=run();assert.equal(first.status,0,first.stderr);
  const content=readFileSync(join(dir,'.env'),'utf8');
  const master=content.match(/^ROUTER_MASTER_KEY=([a-f0-9]{64})$/m)?.[1];
  const admin=content.match(/^ROUTER_ADMIN_TOKEN=([a-f0-9]{64})$/m)?.[1];
  assert.ok(master&&admin);assert.notEqual(master,admin);
  assert.ok(!first.stdout.includes(master)&&!first.stdout.includes(admin));
  if(process.platform!=='win32')assert.equal(statSync(join(dir,'.env')).mode&0o777,0o600);
  const second=run();assert.equal(second.status,0,second.stderr);assert.match(second.stdout,/preserved/);
  assert.equal(readFileSync(join(dir,'.env'),'utf8'),content);
  const parsed=spawnSync(process.execPath,['--env-file=.env','-e','process.exit(/^[a-f0-9]{64}$/.test(process.env.ROUTER_MASTER_KEY)?0:1)'],{cwd:dir,encoding:'utf8',env:{PATH:process.env.PATH}});
  assert.equal(parsed.status,0,parsed.stderr);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
