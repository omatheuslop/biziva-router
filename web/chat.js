import {attachVideo,clearVideos} from './video.js';
const $=id=>document.getElementById(id);let api,notify,refresh,agents=[],history=[],pending=null,objectUrls=[];
export function clearChat(){clearVideos();history=[];pending=null;$('messages').replaceChildren();$('chat-preview').textContent='';$('chat-confirm').disabled=true;for(const url of objectUrls)URL.revokeObjectURL(url);objectUrls=[]}
function message(role,text){const el=document.createElement('article');el.className='message '+role;const label=document.createElement('strong');label.textContent=role==='user'?'Você':'Biziva · sua IA';const content=document.createElement('div');content.textContent=text;el.append(label,content);$('messages').append(el);return el}
function plain(data,provider){if(provider==='anthropic')return data.content?.filter(x=>x.type==='text').map(x=>x.text).join('\n');if(provider==='gemini')return data.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('\n');return data.choices?.[0]?.message?.content||data.output?.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n')}
function invalidate(){pending=null;$('chat-confirm').disabled=true;$('chat-paid').checked=false;$('chat-preview').textContent='Clique em Conferir pedido para ver modelo e estimativa antes de enviar.'}
export async function mountChat(call,messageFn,refreshFn){
 api=call;notify=messageFn;refresh=refreshFn;clearChat();agents=(await api('/router/agents')).agents;
 const select=$('chat-agent');select.replaceChildren();$('agent-cards').replaceChildren();
 for(const a of agents){const option=document.createElement('option');option.value=a.id;option.textContent=a.name;select.append(option);const card=document.createElement('article');card.className='agent-card';const title=document.createElement('h3');title.textContent=a.name;const text=document.createElement('p');text.textContent=a.instructions;const button=document.createElement('button');button.textContent='Usar no chat';button.onclick=()=>{select.value=a.id;$('chat-custom').value='';clearChat();invalidate();document.querySelector('[data-view="chat"]').click()};card.append(title,text,button);$('agent-cards').append(card)}
 $('chat-new').onclick=()=>{clearChat();invalidate();notify('Conversa nova. O histórico anterior foi removido desta página.')};
 for(const e of $('chat-controls').querySelectorAll('input,select,textarea'))e.oninput=invalidate;
 $('chat-agent').onchange=()=>{clearChat();invalidate()};$('chat-provider').onchange=()=>{clearChat();invalidate()};$('chat-mode').onchange=()=>{clearChat();invalidate();$('chat-media').hidden=$('chat-mode').value==='text'};
 $('chat-prompt').oninput=invalidate;
 $('chat-paid').onchange=()=>{$('chat-confirm').disabled=!pending||!$('chat-paid').checked};
 $('chat-check').onclick=async()=>{const button=$('chat-check');button.disabled=true;try{
  invalidate();const provider=$('chat-provider').value,mode=$('chat-mode').value,model=$('chat-model').value.trim(),prompt=$('chat-prompt').value.trim();if(!prompt)throw Error('Escreva seu pedido.');
  const agent=agents.find(a=>a.id===$('chat-agent').value)||agents[0],instructions=$('chat-custom').value.trim()||agent.instructions;
  const max=Number($('chat-output').value),turns=[...history,{role:'user',content:prompt}];if(turns.length>40)throw Error('Abra uma conversa nova para manter o histórico controlado.');
  let path='/v1/chat/completions',body={model,messages:[{role:'system',content:instructions},...turns],max_tokens:max};
  if(mode==='text'&&provider==='anthropic'){path='/v1/messages';body={model,system:instructions,messages:turns,max_tokens:max}}
  if(mode==='text'&&provider==='gemini'){path='/v1beta/models/MODEL:generateContent';body={model,systemInstruction:{parts:[{text:instructions}]},contents:turns.map(x=>({role:x.role==='assistant'?'model':'user',parts:[{text:x.content}]})),generationConfig:{maxOutputTokens:max}}}
  if(mode!=='text'){if(provider==='anthropic'||provider==='gemini')throw Error('Nesta área, criação de mídia usa Biziva/OpenAI/OpenRouter conforme suporte do provedor. Use a integração nativa para outros fluxos.');const params=JSON.parse($('chat-media-options').value||'{}');path=mode==='image'?'/v1/images/generations':mode==='voice'?'/v1/audio/speech':'/v1/videos';body={...params,model,...(mode==='voice'?{input:prompt}:{prompt})}}
  const profile=$('chat-profile').value,task=mode==='text'?agent.task:mode;
  const result=await api('/router/playground/preview','POST',{provider,path,profile,task,body,allowSwitch:$('chat-switch').checked,maxEstimatedUsd:Number($('chat-budget').value)});
  pending={...result,prompt,provider,mode};$('chat-preview').textContent=`Modelo: ${result.model}\nEstimativa: US$ ${result.estimatedUsd.toFixed(6)}\n${result.warning}`;
 }catch(e){notify(e.message)}finally{button.disabled=false}};
 $('chat-confirm').onclick=async()=>{if(!pending||!$('chat-paid').checked)return;const current=pending;pending=null;$('chat-confirm').disabled=true;$('chat-paid').checked=false;message('user',current.prompt);$('chat-prompt').value='';
  try{const r=await api('/router/playground/run','POST',{previewId:current.previewId,confirmPaid:true},undefined,true);
   if(r.headers.get('content-type')?.includes('application/json')){const data=await r.json();const text=plain(data,current.provider);const entry=message('assistant',text||JSON.stringify(data,null,2));
    if(current.mode==='video')attachVideo(entry,data,current.provider,api,notify);
    if(current.mode==='text'&&text)history.push({role:'user',content:current.prompt},{role:'assistant',content:text});
    if(current.mode==='image')for(const item of data.data||[]){if(typeof item.b64_json==='string'&&item.b64_json.length<45000000){const img=document.createElement('img');img.alt='Imagem gerada pelo seu provedor';img.src='data:image/png;base64,'+item.b64_json;entry.replaceChildren(img)}else if(typeof item.url==='string'){const url=new URL(item.url);if(url.protocol==='https:'){const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Abrir imagem no provedor';entry.append(link)}}}
   }else{const blob=await r.blob(),url=URL.createObjectURL(blob);objectUrls.push(url);const entry=message('assistant','Arquivo recebido do seu provedor.');if(blob.type.startsWith('audio/')){const audio=document.createElement('audio');audio.controls=true;audio.src=url;entry.append(audio)}const a=document.createElement('a');a.href=url;a.download='resultado-biziva';a.textContent='Baixar arquivo';entry.append(a)}
   $('chat-preview').textContent='Pedido concluído. Um novo pedido precisa de nova simulação. Cache: '+(r.headers.get('x-biziva-cache')||'sem hit informado');try{await refresh()}catch{}
  }catch(e){message('assistant','Não foi possível confirmar a entrega. Não há reenvio automático. Confira o resultado no provedor antes de tentar de novo.\n'+e.message);notify(e.message)}
 };
}
