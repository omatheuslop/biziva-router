const $=id=>document.getElementById(id);
let api,notify,onResult,state,preview=null,download=null;
const num=id=>{if(!$(id).value.trim())throw Error('Preencha o valor de '+$(id).closest('label').textContent.trim()+'.');return Number($(id).value)};
const labels={fixed:'Modelo fixo',reuse:'Reaproveitar com segurança',economy:'Economia autorizada'};
function invalidate(){preview=null;$('run-test').disabled=true;$('paid-consent').checked=false;$('preview-result').textContent='Simule novamente antes de enviar. Simular não chama a IA.'}
function routeList(){
 $('route-list').replaceChildren();
 state.routes.forEach((r,i)=>{const item=document.createElement('div');item.className='route-item';const text=document.createElement('p');text.textContent=`${r.provider} · ${r.model} · ${r.task} · ${r.path||r.capabilities?.[0]} — ${r.approved?'aprovada por você':'desativada'}`;const button=document.createElement('button');button.className='secondary';button.textContent='Remover';button.onclick=()=>guard(button,async()=>{const next=state.routes.filter((_,n)=>n!==i);await saveSettings(next);invalidate()});item.append(text,button);$('route-list').append(item)});
 $('wizard-progress').textContent=state.routes.some(r=>r.approved)?'Acesso conectado → chave → rotas → simular e confirmar teste. Confira se sua chave foi salva e os preços estão atuais.':'Acesso conectado. Salve sua chave e adicione uma rota antes de simular.';
 $('saved-profile').value=state.profile;$('test-profile').value=state.profile;
}
async function saveSettings(routes=state.routes){state=await api('/router/settings','PUT',{revision:state.revision,profile:$('saved-profile').value,routes});routeList();notify('Preferências salvas nesta conta. A API só aplica um perfil quando o pedido o solicita explicitamente.')}
async function guard(button,fn){button.disabled=true;try{await fn()}catch(e){notify(e.message)}finally{button.disabled=button.id==='run-test'?(!preview||!$('paid-consent').checked):false}}
function endpointDefaults(){
 const path=$('test-path').value,token=['/v1/chat/completions','/v1/responses','/v1/messages','/v1/embeddings','/v1beta/models/MODEL:generateContent'].includes(path);$('test-media-fields').hidden=token;
}
function payload(){
 const path=$('test-path').value,model=$('test-model').value.trim(),text=$('test-prompt').value,max=num('test-max-tokens');
 if(path==='/v1/chat/completions'||path==='/v1/messages')return {model,messages:[{role:'user',content:text}],max_tokens:max};
 if(path==='/v1/responses')return {model,input:text,max_output_tokens:max};
 if(path==='/v1beta/models/MODEL:generateContent')return {model,contents:[{role:'user',parts:[{text}]}],generationConfig:{maxOutputTokens:max}};
 if(path==='/v1/embeddings')return {model,input:text};
 const extra=JSON.parse($('media-params').value||'{}');if(!extra||typeof extra!=='object'||Array.isArray(extra))throw Error('Os parâmetros de mídia precisam ser um objeto JSON.');
 return {...extra,model,...(path==='/v1/audio/speech'?{input:text}:{prompt:text})};
}
export async function mountWorkbench(call,message,refresh=async()=>{}){
 api=call;notify=message;onResult=refresh;invalidate();$('test-result').textContent='';if(download){URL.revokeObjectURL(download);download=null}$('test-download').hidden=true;state=await api('/router/settings');$('workspace').hidden=false;routeList();endpointDefaults();
 for(const e of $('test-form').querySelectorAll('input,select,textarea')){e.oninput=invalidate;e.onchange=()=>{invalidate();endpointDefaults()}}
 $('paid-consent').onchange=()=>{$('run-test').disabled=!preview||!$('paid-consent').checked};
 $('save-profile').onclick=()=>guard($('save-profile'),async()=>{await saveSettings();invalidate()});
 $('add-route').onclick=()=>guard($('add-route'),async()=>{
  const path=$('route-path').value,token=['/v1/chat/completions','/v1/responses','/v1/messages','/v1/embeddings','/v1beta/models/MODEL:generateContent'].includes(path),approved=$('approve-route').checked;
  const row={provider:$('route-provider').value,model:$('route-model').value.trim(),task:$('route-task').value.trim()||'general',path,approved,qualityAccepted:approved,priceCheckedAt:new Date().toISOString()};
  if(token)Object.assign(row,{inputUsdPerMillion:num('input-price'),outputUsdPerMillion:num('output-price'),contextTokens:num('route-context')});
  else Object.assign(row,{usdPerUnit:num('unit-price'),priceUnit:$('price-unit').value,maxInputBytes:1000000,supportedParameters:$('route-params').value.split(',').map(x=>x.trim()).filter(Boolean),constraints:JSON.parse($('route-constraints').value||'{}')});
  await saveSettings([...state.routes,row]);$('approve-route').checked=false;invalidate();
 });
 $('route-path').onchange=()=>{const token=['/v1/chat/completions','/v1/responses','/v1/messages','/v1/embeddings','/v1beta/models/MODEL:generateContent'].includes($('route-path').value);$('token-pricing').hidden=!token;$('media-pricing').hidden=token};
 $('simulate').onclick=()=>guard($('simulate'),async()=>{
  invalidate();const b={provider:$('test-provider').value,path:$('test-path').value,profile:$('test-profile').value,task:$('test-task').value.trim()||'general',allowSwitch:$('switch-consent').checked,maxEstimatedUsd:num('test-budget'),body:payload()};
  preview=await api('/router/playground/preview','POST',b);
  $('preview-result').textContent=`Simulação sem cobrança\nProvedor: ${preview.provider}\nModelo escolhido: ${preview.model}\nPerfil: ${labels[preview.profile]}\nEstimativa conservadora: US$ ${preview.estimatedUsd.toFixed(6)}\n${preview.warning}\nA confirmação vale para este pedido por até 5 minutos.`;
 });
 $('run-test').onclick=()=>guard($('run-test'),async()=>{
  if(!preview||!$('paid-consent').checked)throw Error('Simule e confirme o custo antes de enviar.');
  const id=preview.previewId;preview=null;$('paid-consent').checked=false;
  $('test-result').textContent='Pedido enviado uma única vez. Aguarde o resultado. Não repita se houver incerteza.';
  try{
   const r=await api('/router/playground/run','POST',{previewId:id,confirmPaid:true},undefined,true);
   if(download){URL.revokeObjectURL(download);download=null}$('test-download').hidden=true;
   if(r.headers.get('content-type')?.includes('application/json'))$('test-result').textContent=JSON.stringify(await r.json(),null,2);
   else{const blob=await r.blob();download=URL.createObjectURL(blob);$('test-download').href=download;$('test-download').hidden=false;$('test-result').textContent=`Resposta recebida: ${blob.type||'arquivo'} · ${blob.size} bytes. Use o botão para baixar. Vídeos assíncronos podem retornar um identificador para consultar pela API.`}
   try{await onResult()}catch{}
   notify(`Teste concluído. Cache: ${r.headers.get('x-biziva-cache')||'sem hit informado'}. Consulte o acompanhamento; custo desconhecido não equivale a custo zero.`);
  }catch(e){$('test-result').textContent='O pedido pode ter resultado incerto. Não há reenvio automático. Confira o resultado no provedor antes de criar um novo teste.\n'+e.message;throw e}
 });
}
