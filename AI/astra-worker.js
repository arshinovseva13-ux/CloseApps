'use strict';
const BASE='./models/clause-astra-1-char-v002/';
let W=null, manifest=null, vocab=null;
const D=128, HEADS=4, HD=32, MAX=192;
const send=(type,data={})=>postMessage({type,...data});
function half(h){const s=(h&32768)?-1:1,e=(h>>10)&31,f=h&1023;if(e===0)return s*Math.pow(2,-14)*(f/1024);if(e===31)return f?NaN:s*Infinity;return s*Math.pow(2,e-15)*(1+f/1024)}
async function load(){
 send('status',{message:'Загружаю конфигурацию…'});
 manifest=await (await fetch(BASE+'manifest.json')).json();
 const chunks=await Promise.all(Array.from({length:manifest.weight_parts},(_,i)=>fetch(BASE+'weights/part-'+String(i+1).padStart(3,'0')+'.b64').then(r=>{if(!r.ok)throw Error('Не удалось загрузить часть весов '+(i+1));return r.text()})));
 const b64=chunks.join('');
 const raw=atob(b64);
 if(raw.length!==manifest.weight_bytes)throw Error('Размер файла весов не совпал');
 const dv=new DataView(new ArrayBuffer(0));
 const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
 if(digest!==manifest.weight_sha256)throw Error('Контрольная сумма весов не совпала');
 const view=new DataView(bytes.buffer);
 const flat=new Float32Array(manifest.weight_elements);
 for(let i=0;i<flat.length;i++)flat[i]=half(view.getUint16(i*2,true));
 W={};
 for(const item of manifest.keys)W[item.name]=flat.subarray(item.offset,item.offset+item.length);
 const tr=await fetch('./models/clause-astra-1-char-v002/tokenizer.json');
 if(!tr.ok)throw Error('Не удалось загрузить токенизатор');
 vocab=(await tr.json()).itos;
 send('ready',{bytes:raw.length,parts:chunks.length});
}
function vec(Wm,x,outSize,inSize,bias){
 const out=new Float32Array(outSize);
 for(let o=0;o<outSize;o++){let s=bias?bias[o]:0,base=o*inSize;for(let i=0;i<inSize;i++)s+=Wm[base+i]*x[i];out[o]=s}
 return out;
}
function norm(x,weight,bias){
 let mean=0;for(let i=0;i<D;i++)mean+=x[i];mean/=D;
 let variance=0;for(let i=0;i<D;i++){const d=x[i]-mean;variance+=d*d}variance/=D;
 const inv=1/Math.sqrt(variance+1e-5),out=new Float32Array(D);
 for(let i=0;i<D;i++)out[i]=(x[i]-mean)*inv*weight[i]+bias[i];
 return out;
}
function gelu(x){const x3=x*x*x;return .5*x*(1+Math.tanh(.7978845608*(x+.044715*x3)))}
function step(tokenId,pos,caches){
 const token=W['token.weight'],position=W['pos.weight'];
 let x=new Float32Array(D),off=tokenId*D,po=pos*D;
 for(let i=0;i<D;i++)x[i]=token[off+i]+position[po+i];
 for(let l=0;l<4;l++){
  const p='blocks.layers.'+l+'.';
  const n1=norm(x,W[p+'norm1.weight'],W[p+'norm1.bias']);
  const qkv=vec(W[p+'self_attn.in_proj_weight'],n1,384,128,W[p+'self_attn.in_proj_bias']);
  const cache=caches[l],co=pos*D;
  for(let i=0;i<D;i++){cache.k[co+i]=qkv[D+i];cache.v[co+i]=qkv[2*D+i]}
  const ctx=new Float32Array(D),scores=new Float32Array(pos+1);
  for(let h=0;h<HEADS;h++){
   let max=-Infinity;
   for(let t=0;t<=pos;t++){let dot=0,base=t*D+h*HD;for(let j=0;j<HD;j++)dot+=qkv[h*HD+j]*cache.k[base+j];scores[t]=dot/Math.sqrt(HD);if(scores[t]>max)max=scores[t]}
   let sum=0;for(let t=0;t<=pos;t++){scores[t]=Math.exp(scores[t]-max);sum+=scores[t]}
   for(let t=0;t<=pos;t++){const a=scores[t]/sum,base=t*D+h*HD;for(let j=0;j<HD;j++)ctx[h*HD+j]+=a*cache.v[base+j]}
  }
  const attn=vec(W[p+'self_attn.out_proj.weight'],ctx,128,128,W[p+'self_attn.out_proj.bias']);
  for(let i=0;i<D;i++)x[i]+=attn[i];
  const n2=norm(x,W[p+'norm2.weight'],W[p+'norm2.bias']);
  const ff1=vec(W[p+'linear1.weight'],n2,512,128,W[p+'linear1.bias']);
  for(let i=0;i<512;i++)ff1[i]=gelu(ff1[i]);
  const ff2=vec(W[p+'linear2.weight'],ff1,128,512,W[p+'linear2.bias']);
  for(let i=0;i<D;i++)x[i]+=ff2[i];
 }
 x=norm(x,W['norm.weight'],W['norm.bias']);
 const logits=new Float32Array(442);
 for(let t=0;t<442;t++){let s=0,base=t*D;for(let i=0;i<D;i++)s+=token[base+i]*x[i];logits[t]=s}
 return logits;
}
function sample(logits,temp=.85,topK=24){
 const arr=Array.from(logits,(v,i)=>({i,v:v/temp})).sort((a,b)=>b.v-a.v).slice(0,topK);
 const max=arr[0].v;let sum=0;for(const a of arr){a.p=Math.exp(a.v-max);sum+=a.p}
 let r=Math.random()*sum;for(const a of arr){r-=a.p;if(r<=0)return a.i}return arr[0].i;
}
function encode(s){const map=new Map(vocab.map((c,i)=>[c,i]));return Array.from(s).map(c=>map.get(c)).filter(x=>x!==undefined)}
async function generate(prompt,maxTokens=64){
 const ids=encode(prompt);if(!ids.length)throw Error('В сообщении нет символов из словаря модели');
 const context=ids.slice(-Math.min(120,MAX-maxTokens));
 const caches=Array.from({length:4},()=>({k:new Float32Array(MAX*D),v:new Float32Array(MAX*D)}));
 let logits=null;
 for(let i=0;i<context.length;i++){logits=step(context[i],i,caches);if(i%16===0)send('progress',{done:i,total:context.length})}
 let answer='';
 for(let n=0;n<Math.min(maxTokens,MAX-context.length);n++){
  const id=sample(logits,.9,28),ch=vocab[id];answer+=ch;
  const pos=context.length+n;
  if(pos>=MAX-1)break;
  logits=step(id,pos,caches);
  if(n>18&&answer.endsWith('\n\n'))break;
  if(n>28&&/[.!?…]$/.test(answer)&&Math.random()<.22)break;
  if(n%8===0)send('generation-progress',{done:n+1,total:maxTokens});
 }
 return answer.trim()||'Модель не сгенерировала текст.';
}
self.onmessage=async e=>{
 const {type,prompt,id,maxTokens}=e.data||{};
 if(type==='generate'){try{const answer=await generate(prompt,maxTokens||64);send('answer',{id,answer})}catch(err){send('error',{id,message:err.message})}}
};
load().catch(err=>send('error',{message:err.message}));
