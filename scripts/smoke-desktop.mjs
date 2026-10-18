import {spawn} from 'node:child_process';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {resolve,join} from 'node:path';import {once} from 'node:events';
const dir=mkdtempSync(join(tmpdir(),'biziva-desktop-test-'));const file=resolve('dist',process.platform==='win32'?'BizivaRouter.exe':'BizivaRouter');
const child=spawn(file,[],{env:{...process.env,BIZIVA_DESKTOP_NO_OPEN:'1',BIZIVA_DESKTOP_DATA:dir,PORT:'0'},stdio:['ignore','pipe','pipe']});
let text='';const timeout=setTimeout(()=>{child.kill();process.exitCode=1},15000);
try{
 const ready=await new Promise((yes,no)=>{child.on('error',no);child.on('exit',code=>no(Error('Desktop exited before readiness: '+code)));child.stdout.on('data',b=>{text+=b;for(const line of text.split('\n'))try{const v=JSON.parse(line);if(v.event==='router_ready')yes(v)}catch{}})});
 const r=await fetch('http://127.0.0.1:'+ready.port+'/healthz');if(!r.ok||(await r.json()).status!=='ok')throw Error('Desktop health failed');
 const ui=await fetch('http://127.0.0.1:'+ready.port+'/');if(!ui.ok||!(await ui.text()).includes('Chat das suas IAs'))throw Error('Bundled UI missing');
 for(const file of ['app.js','chat.js','workbench.js','style.css'])if(!(await fetch('http://127.0.0.1:'+ready.port+'/'+file)).ok)throw Error('Bundled asset missing');
 console.log('Desktop binary starts with bundled UI/assets and isolated private data; no browser or paid inference.');
}finally{clearTimeout(timeout);if(child.exitCode===null&&child.signalCode===null){const ended=once(child,'exit');child.kill();await ended;}rmSync(dir,{recursive:true,force:true})}
