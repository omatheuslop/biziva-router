import {build} from 'esbuild';import {inject} from 'postject';
import {mkdirSync,writeFileSync,readFileSync,copyFileSync,chmodSync,symlinkSync,existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';import {spawnSync} from 'node:child_process';
const root=resolve('.'),out=join(root,'dist');mkdirSync(out,{recursive:true});
function run(cmd,args){const r=spawnSync(cmd,args,{stdio:'inherit'});if(r.status!==0)throw Error('Build command failed: '+cmd)}
const main=join(out,'router.cjs');await build({entryPoints:[join(root,'src/server.mjs')],bundle:true,platform:'node',target:'node24',format:'cjs',outfile:main,logLevel:'warning'});
const assets={};for(const name of ['index.html','app.js','workbench.js','chat.js','style.css'])assets['web/'+name]=join(root,'web',name);
const blob=join(out,'router.blob'),config=join(out,'sea-config.json');writeFileSync(config,JSON.stringify({main,output:blob,disableExperimentalSEAWarning:true,useSnapshot:false,useCodeCache:false,assets}));
run(process.execPath,['--experimental-sea-config',config]);
const filename=process.platform==='win32'?'BizivaRouter.exe':'BizivaRouter';const binary=join(out,filename);copyFileSync(process.execPath,binary);
if(process.platform==='darwin'){const info=spawnSync('lipo',['-info',binary],{encoding:'utf8'});if(info.stdout?.includes('Architectures in the fat file'))run('lipo',[binary,'-thin',process.arch==='arm64'?'arm64':'x86_64','-output',binary]);run('codesign',['--remove-signature',binary]);}
await inject(binary,'NODE_SEA_BLOB',readFileSync(blob),{sentinelFuse:'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',machoSegmentName:'NODE_SEA'});
if(process.platform==='darwin')run('codesign',['--sign','-',binary]);if(process.platform!=='win32')chmodSync(binary,0o755);
if(process.platform==='darwin'){
 const stage=mkdtempSync(join(tmpdir(),'biziva-package-')),app=join(stage,'Biziva Router.app','Contents');mkdirSync(join(app,'MacOS'),{recursive:true});copyFileSync(binary,join(app,'MacOS','BizivaRouter'));chmodSync(join(app,'MacOS','BizivaRouter'),0o755);
 writeFileSync(join(app,'Info.plist'),'<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleName</key><string>Biziva Router</string><key>CFBundleIdentifier</key><string>br.com.biziva.router</string><key>CFBundleExecutable</key><string>BizivaRouter</string><key>CFBundleVersion</key><string>0.3.1</string><key>CFBundlePackageType</key><string>APPL</string></dict></plist>');
 run('xattr',['-cr',join(stage,'Biziva Router.app')]);run('codesign',['--force','--deep','--sign','-',join(stage,'Biziva Router.app')]);if(!existsSync(join(stage,'Applications')))symlinkSync('/Applications',join(stage,'Applications'));
 run('hdiutil',['create','-volname','Biziva Router','-srcfolder',stage,'-ov','-format','UDZO',join(out,'BizivaRouter-macos-'+process.arch+'.dmg')]);rmSync(stage,{recursive:true,force:true});
}
console.log(JSON.stringify({built:filename,platform:process.platform,arch:process.arch,signedByPublisher:false}));
