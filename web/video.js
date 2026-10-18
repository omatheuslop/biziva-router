const urls=new Set();
export function clearVideos(){for(const u of urls)URL.revokeObjectURL(u);urls.clear()}
const statuses={prepared:'Preparando',submitting:'Enviando',submitted:'Na fila ou processando',queued:'Na fila',in_progress:'Processando',finalizing:'Finalizando',succeeded:'Concluído',completed:'Concluído',failed:'Falhou',expired:'Arquivo expirado',reconciliation_pending:'Resultado em conciliação: não crie outro pedido'};
export function attachVideo(container,data,provider,api,notify){
 if(!['biziva','openai'].includes(provider)||typeof data.id!=='string'||!/^[-a-zA-Z0-9_]{8,100}$/.test(data.id))return;
 const id=data.id,path='/v1/videos/'+id,headers={'x-biziva-provider':provider};let state=data.status,finished=false;
 const section=document.createElement('section');section.className='card video-result';
 const title=document.createElement('p');title.textContent='Vídeo · '+provider+' · '+id;
 const status=document.createElement('p'),check=document.createElement('button'),download=document.createElement('button');
 check.className='secondary';check.textContent='Consultar andamento';download.textContent='Baixar vídeo';
 const note=document.createElement('p');note.className='hint';note.textContent='Consulta o pedido existente. Não gera outro vídeo. Se houver incerteza, preserve este ID e confira o mesmo pedido. O arquivo depende da retenção do provedor.';
 function render(){status.textContent='Estado: '+(statuses[state]||state||'Pedido recebido');download.hidden=finished||!['succeeded','completed'].includes(state);}
 check.onclick=async()=>{check.disabled=true;try{const r=await api(path,'GET',undefined,undefined,true,headers),next=await r.json();if(next.id!==id)throw Error('O identificador retornado não corresponde ao pedido.');if(!section.isConnected)return;state=next.status;render()}catch(e){notify(e.message)}finally{check.disabled=false}};
 download.onclick=async()=>{download.disabled=true;try{
  const r=await api(path+'/content','GET',undefined,undefined,true,headers);
  if(!/^video\/mp4(?:;|$)/i.test(r.headers.get('content-type')||''))throw Error('O provedor não devolveu um vídeo MP4. Consulte o estado novamente.');
  const max=64*1024*1024;if(Number(r.headers.get('content-length')||0)>max){await r.body?.cancel();throw Error('Arquivo excede o limite de prévia de 64 MiB. Use o download pela API.');}
  const reader=r.body?.getReader(),chunks=[];let size=0;if(!reader)throw Error('Arquivo vazio.');
  try{while(true){const x=await reader.read();if(x.done)break;size+=x.value.byteLength;if(size>max){await reader.cancel();throw Error('Arquivo excede o limite de prévia de 64 MiB. Use o download pela API.');}chunks.push(x.value)}}finally{reader.releaseLock()}
  if(!size)throw Error('Arquivo vazio.');if(!section.isConnected)return;
  const url=URL.createObjectURL(new Blob(chunks,{type:'video/mp4'}));urls.add(url);
  if(!finished){const video=document.createElement('video');video.controls=true;video.playsInline=true;video.style.maxWidth='100%';video.src=url;const link=document.createElement('a');link.href=url;link.download=id+'.mp4';link.textContent='Salvar vídeo MP4';section.append(video,link);finished=true;download.hidden=true;}
 }catch(e){notify(e.message)}finally{download.disabled=false}};
 section.append(title,status,check,download,note);container.append(section);render();
}
