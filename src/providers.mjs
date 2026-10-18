import {RouterError} from './core.mjs';
export const PROVIDERS=Object.freeze(Object.assign(Object.create(null),{biziva:{origin:'https://api.biziva.com.br',prefix:'/v1',auth:'bearer'},openai:{origin:'https://api.openai.com',prefix:'/v1',auth:'bearer'},anthropic:{origin:'https://api.anthropic.com',prefix:'/v1',auth:'anthropic'},openrouter:{origin:'https://openrouter.ai',prefix:'/api/v1',auth:'bearer'},gemini:{origin:'https://generativelanguage.googleapis.com',prefix:'/v1beta',auth:'google'}}));
export function endpoint(provider,path,method){
 const cfg=PROVIDERS[provider];if(!cfg)throw new RouterError(400,'unknown_provider','Unknown provider');
 if(['GET','DELETE'].includes(method)&&/^\/v1\/(responses|files|videos)\/[a-zA-Z0-9_-]+(?:\/(content|input_items))?$/.test(path)&&provider==='openai')return cfg.origin+path;
 if(method==='GET'&&provider==='gemini'&&/^\/v1beta\/(?:models\/[a-zA-Z0-9._-]+\/)?operations\/[a-zA-Z0-9._-]+$/.test(path))return cfg.origin+path;
 if(method!=='POST')throw new RouterError(405,'unsupported_method','Only explicit inference POST endpoints are exposed');
 if(provider==='biziva'){if(!['/v1/chat/completions','/v1/embeddings','/v1/images/generations','/v1/audio/speech'].includes(path))throw new RouterError(404,'unsupported_endpoint','Endpoint não habilitado para a integração Biziva.');return cfg.origin+path;}
 const native=provider==='gemini';
 const allowed=native?/^\/v1beta\/models\/[a-zA-Z0-9._-]+:(generateContent|streamGenerateContent|embedContent|batchEmbedContents|predictLongRunning)$/.test(path):provider==='anthropic'?['/v1/messages','/v1/messages/count_tokens'].includes(path):['/v1/chat/completions','/v1/responses','/v1/responses/compact','/v1/embeddings','/v1/images/generations','/v1/images/edits','/v1/images/variations','/v1/audio/speech','/v1/audio/transcriptions','/v1/audio/translations','/v1/videos','/v1/files'].includes(path);
 if(!allowed)throw new RouterError(404,'unsupported_endpoint','Endpoint is not enabled for this provider');
 return cfg.origin+(native?path:cfg.prefix+path.slice(3));
}
export function upstreamHeaders(provider,key,requestHeaders){
 const h=new Headers();for(const name of ['content-type','accept','anthropic-version','anthropic-beta','anthropic-workspace-id','openai-beta']){const v=requestHeaders.get(name);if(v)h.set(name,v)}
 if(provider==='biziva')for(const name of ['x-biziva-cache','x-biziva-deduplicate-instructions']){const value=requestHeaders.get(name);if(value)h.set(name,value)}
 if(provider==='anthropic')for(const [name,value] of requestHeaders)if(name.startsWith('anthropic-'))h.set(name,value);
 if(provider==='anthropic'){h.set('x-api-key',key);if(!h.has('anthropic-version'))h.set('anthropic-version','2023-06-01')}
 else if(provider==='gemini')h.set('x-goog-api-key',key);else h.set('authorization','Bearer '+key);
 return h;
}
export function queryString(provider,searchParams){
 const out=new URLSearchParams();for(const [k,v] of searchParams){if(provider==='gemini'&&k==='alt'&&v==='sse'||provider==='anthropic'&&k==='beta'&&v==='true')out.set(k,v);else throw new RouterError(400,'unsupported_query','Unsupported query parameter')}
 return out.size?'?'+out.toString():'';
}
