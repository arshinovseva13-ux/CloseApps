'use strict';
/* Code Video Studio. Всё видео рисуется на ОДНОМ canvas по единой шкале времени P.t —
   поэтому его можно записать через captureStream. Звук — Web Audio, без файлов. */
const W=1280,H=720,$=id=>document.getElementById(id);
const cv=$('stage'),c=cv.getContext('2d');cv.width=W;cv.height=H;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches,MO=RM?.25:1;
const SANS='"Segoe UI",Inter,system-ui,-apple-system,sans-serif',MONO='ui-monospace,Consolas,Menlo,monospace';
const CY='#3df2ff',MG='#ff6bb5',AM='#ffb347',VI='#9a7bff',GR='#7dffb0';
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),lerp=(a,b,k)=>a+(b-a)*k;
const ease=x=>{x=cl(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2};
let sd=7;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
const ping=a=>a.map(x=>[x,'ping']);
const S=[
{d:14,v:'Это рассказ о том, куда движется искусственный интеллект. Подтверждённых данных о ChatGPT 5.5 нет, поэтому дальше — общие тенденции, а догадки названы догадками.',cue:[[0,'riser'],[5,'hit']]},
{d:16,v:'ИИ учится на огромных массивах текстов, кода и данных. Он находит связи между понятиями — как узлы в большой сети.',cue:ping([.8])},
{d:18,v:'Запрос превращается в числа, проходит через слои вычислений, и на выходе появляется наиболее вероятный и полезный ответ.',cue:ping([.8])},
{d:18,v:'Код, тексты, анализ данных, обучение, творчество, автоматизация рутины — один помощник для разных задач.',cue:ping([0,3,6,9,12,15])},
{d:20,v:'В разработке ИИ предлагает код, объясняет ошибки и помогает собрать интерфейс. Но результат проверяет человек.',cue:ping([1.5,14.4])},
{d:20,v:'В обычной жизни: объяснить сложное, разобраться в отчёте, спланировать поездку, найти идею.',cue:ping([0,5,10,15])},
{d:16,v:'ИИ может ошибаться. Важные факты стоит проверять, а решения остаются за человеком.',cue:ping([1,6,11])},
{d:16,v:'Что дальше? Вероятно, помощники будут глубже встроены в работу и учёбу. Это предположение, а не обещание.',cue:[[3,'hit']]},
{d:12,v:'Следующий уровень ИИ — не замена людям, а новые возможности вместе с ними.',cue:[[2,'final']]}
];
let TOT=0;const CUES=[];
S.forEach((s,i)=>{s.st=TOT;TOT+=s.d;if(i)CUES.push({t:s.st-.4,k:'whoosh'});s.cue.forEach(([l,k])=>CUES.push({t:s.st+l,k}))});
const sceneAt=t=>{const i=S.findIndex(s=>t<s.st+s.d);return i<0?S.length-1:i};
let GA=1;const al=v=>{c.globalAlpha=GA*v};
function T(txt,x,y,sz,lt,dl,o={}){
  const col=o.col||'#fff',ag=o.al||'center',sp=o.sp??.03;
  c.save();c.font=`${o.w||800} ${sz}px ${SANS}`;c.textAlign='left';
  const ch=[...txt],ws=ch.map(s=>c.measureText(s).width+sz*sp),tot=ws.reduce((a,b)=>a+b,0);
  let px=ag==='center'?x-tot/2:ag==='right'?x-tot:x;
  ch.forEach((s,i)=>{const e=ease((lt-dl-i*.04)/.6);
    if(e>0){c.globalAlpha=GA*(o.a??1)*e;c.fillStyle=col;c.shadowColor=o.glow||col;c.shadowBlur=sz*.3*e;c.fillText(s,px,y+(1-e)*sz*.6)}
    px+=ws[i]});
  c.restore()}
function wrap(t,mx){const r=[];let l='';for(const s of t.split(' ')){const n=l?l+' '+s:s;if(c.measureText(n).width>mx&&l){r.push(l);l=s}else l=n}r.push(l);return r}
const ST=Array.from({length:200},()=>({x:rnd()*2-1,y:rnd()*2-1,z:rnd()}));
function stars(lt,sp,col,a,cx=W/2,cy=H/2){c.fillStyle=col;
  for(const p of ST){const z=((p.z-lt*sp*(RM?.2:1))%1+1)%1+.02,k=.12/z,sx=cx+p.x*W*.5*k,sy=cy+p.y*H*.5*k;
    if(sx<0||sx>W||sy<0||sy>H)continue;al(a*cl(1-z)*cl(z*6));const r=.6+(1-z)*2;c.fillRect(sx,sy,r,r)}}
function seg(x1,y1,x2,y2){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
function s1(lt){stars(lt,.03,'#8fe9ff',ease(lt/6)*.9);
  const w=ease(lt/4.5)*W*.7,f=1-cl((lt-5.5)/1.5);
  if(f>0){c.save();al(f);c.shadowColor=CY;c.shadowBlur=24;c.fillStyle=CY;c.fillRect(W/2-w/2,H/2-1,w,2);c.restore()}
  T('ChatGPT 5.5',W/2,H/2+30,128,lt-5,0,{glow:CY});
  T('Следующий уровень искусственного интеллекта',W/2,H/2+95,34,lt-8,0,{col:CY,w:300,sp:.06})}
const ND=Array.from({length:80},(_,i)=>{const y=1-2*(i+.5)/80,r=Math.sqrt(1-y*y),a=i*2.399963;return{x:Math.cos(a)*r,y,z:Math.sin(a)*r}});
const LK=[];for(let i=0;i<80;i++)for(let j=i+1;j<80;j++)if(Math.hypot(ND[i].x-ND[j].x,ND[i].y-ND[j].y,ND[i].z-ND[j].z)<.42)LK.push([i,j]);
function s2(lt){stars(lt,.02,'#7fb8ff',.5);
  const zoom=.7+ease(lt/14)*.45,ang=lt*.35*MO+.5,cs=Math.cos(ang),sn=Math.sin(ang),R=250*zoom,cx=W*.7,cy=H*.54;
  const pr=ND.map(p=>{const x=p.x*cs+p.z*sn,z=-p.x*sn+p.z*cs,y=p.y*.94+z*.34,z2=z*.94-p.y*.34,f=1/(1.9-z2*.6);return{x:cx+x*R*f,y:cy+y*R*f,z:z2,f}});
  c.lineWidth=1;c.strokeStyle=CY;
  LK.forEach(([i,j])=>{const a=pr[i],b=pr[j];al(.05+.3*(a.z+b.z+2)/4);seg(a.x,a.y,b.x,b.y)});
  pr.forEach((p,i)=>{al(.35+.6*(p.z+1)/2);c.fillStyle=i%7?'#bff6ff':MG;c.beginPath();c.arc(p.x,p.y,1.5+p.f*2.2,0,6.3);c.fill()});
  c.fillStyle='#fff';al(.9);
  LK.forEach(([i,j],k)=>{if(k%4)return;const u=(lt*.5+k*.37)%1,a=pr[i],b=pr[j];c.fillRect(lerp(a.x,b.x,u)-1.5,lerp(a.y,b.y,u)-1.5,3,3)});
  T('Новая эпоха ИИ',70,150,64,lt-1,0,{al:'left'});
  T('Данные, смысл и контекст — всё связано.',70,205,28,lt-3,0,{al:'left',w:300,col:CY})}
function s3(lt){stars(lt,.015,'#a58bff',.35);const L=6,N=7,sway=Math.sin(lt*.4)*12*MO;
  const X=i=>230+i*(820/(L-1)),Y=j=>215+j*52+sway;
  c.lineWidth=1;c.strokeStyle=VI;al(.14);
  for(let i=0;i<L-1;i++)for(let j=0;j<N;j++)for(let k=0;k<N;k++)if(!((j*3+k*5+i)%4))seg(X(i),Y(j),X(i+1),Y(k));
  for(let i=0;i<L;i++)for(let j=0;j<N;j++){const pu=.5+.5*Math.sin(lt*2+i*1.3+j*.9);al(.25+.5*pu);c.fillStyle=pu>.8?MG:'#c9bfff';c.beginPath();c.arc(X(i),Y(j),3+pu*2,0,6.3);c.fill()}
  al(.95);
  for(let k=0;k<36;k++){const p=((lt*.3+k/36)%1)*(L-1),i=Math.floor(p),f=p-i,a=(k*3+i)%N,b=(k*5+i+1)%N;c.fillStyle=`hsl(${185+p*28},100%,70%)`;c.fillRect(lerp(X(i),X(i+1),f)-2,lerp(Y(a),Y(b),f)-2,5,5)}
  T('вопрос',110,330,30,lt-2,0,{col:CY,w:300});T('ответ',1170,330,30,lt-9,0,{col:MG,w:300});
  T('Как это работает',W/2,100,60,lt-1,0);
  T('Слова становятся числами, числа — закономерностями.',W/2,150,26,lt-4,0,{w:300,col:'#cfc8ff'})}
const WD=['Код','Текст','Анализ','Обучение','Творчество','Автоматизация'],CP=['Пишет и объясняет программы','Составляет и редактирует тексты','Находит закономерности в данных','Объясняет шаг за шагом','Предлагает идеи и варианты','Берёт на себя рутину'],WC=[CY,MG,AM,VI,GR,'#ff8a5c'];
function s4(lt){stars(lt,.01,'#fff',.25);const cx=W/2,cy=H/2+10;
  c.lineWidth=1.5;c.strokeStyle=CY;al(.25);c.beginPath();c.ellipse(cx,cy,430,160,0,0,6.3);c.stroke();al(.12);c.beginPath();c.ellipse(cx,cy,330,110,0,0,6.3);c.stroke();
  const ix=Math.min(5,Math.floor(lt/3)),el=lt-ix*3;
  c.save();c.textAlign='center';
  WD.forEach((w,i)=>{if(i===ix)return;const a=i/6*6.283+lt*.2*MO,d=(Math.sin(a)+1)/2;al(.2+.4*d);c.fillStyle=WC[i];c.font=`700 ${20+d*14}px ${SANS}`;c.fillText(w,cx+Math.cos(a)*430,cy+Math.sin(a)*160)});
  c.restore();
  const fo=cl((3-el)/.4);
  T(WD[ix],cx,cy+25,ix===5?96:120,el,0,{col:WC[ix],a:fo});
  T(CP[ix],cx,cy+80,28,el,.4,{w:400,col:'#dff',a:fo});
  T('Что умеет ИИ',70,100,44,lt-.3,0,{al:'left'})}
const CODE=[['// запрос человека','#6b7a99'],['function assistant(question) {',CY],['  const context = readContext();','#dfe8ff'],['  const plan = think(question, context);','#dfe8ff'],['  const code = write(plan);','#dfe8ff'],['  return review(code);',AM],['}','#dfe8ff'],['',''],['render(<App />);',MG],['// проверка — за человеком','#6b7a99']];
function s5(lt){stars(lt,.01,'#6ee7ff',.25);
  T('ИИ и программирование',70,100,50,lt-.3,0,{al:'left'});
  let n=Math.floor(Math.max(0,lt-1.5)*30);c.save();c.font=`500 24px ${MONO}`;c.textAlign='left';
  CODE.forEach(([s,col],i)=>{const m=cl(n,0,s.length),y=190+i*38;
    if(m>0){al(1);c.fillStyle=col;c.fillText(s.slice(0,m),70,y)}
    if(n>=0&&n<=s.length&&lt<16&&Math.floor(lt*2)%2){al(1);c.fillStyle=CY;c.fillRect(70+c.measureText(s.slice(0,m)).width+2,y-20,12,26)}
    n-=s.length+1});
  c.restore();
  const x0=690,y0=170,w=510,h=360,per=2*(w+h);
  c.save();al(1);c.strokeStyle=CY;c.lineWidth=2;c.shadowColor=CY;c.shadowBlur=14;c.setLineDash([per*ease((lt-3)/2.5),per]);c.strokeRect(x0,y0,w,h);c.restore();
  c.lineWidth=1.5;c.strokeStyle=CY;
  const hd=ease((lt-5.5)/1);al(.8);seg(x0,y0+46,x0+w*hd,y0+46);
  c.fillStyle=MG;[0,1,2].forEach(i=>{al(hd);c.beginPath();c.arc(x0+22+i*20,y0+23,5,0,6.3);c.fill()});
  const sb=ease((lt-6.5)/1);al(.8);seg(x0+130,y0+46,x0+130,y0+46+(h-46)*sb);
  c.fillStyle=VI;[0,1,2,3].forEach(i=>{al(.6*ease((lt-7+i*.3)/.6));c.fillRect(x0+20,y0+76+i*36,80,10)});
  [.4,.7,.5,.9,.65].forEach((v,i)=>{const e=ease((lt-8.5-i*.4)/.9);al(.85);c.fillStyle=i===3?MG:CY;c.fillRect(x0+165+i*62,y0+h-90-v*170*e,40,v*170*e)});
  const bx=x0+w-200,by=y0+h-66,bt=ease((lt-10.5)/.8),ck=lt>14.4;
  c.strokeStyle=AM;c.lineWidth=2;al(bt);c.strokeRect(bx,by,160,40);
  if(ck){al(.9);c.fillStyle=AM;c.fillRect(bx,by,160,40)}
  const cu=ease((lt-11)/2.5),px=lerp(x0+w+30,bx+90,cu),py=lerp(y0+h+40,by+22,cu);
  if(lt>11){al(1);c.fillStyle='#fff';c.beginPath();c.moveTo(px,py);c.lineTo(px+4,py+24);c.lineTo(px+11,py+17);c.closePath();c.fill()}
  if(ck){al(cl(1-(lt-14.4)/1.2)*.5);c.fillStyle=CY;c.fillRect(x0,y0,w,h)}
  T('Интерфейс собран',x0+w/2,y0+h+60,30,lt-14.6,0,{col:CY})}
const TG=['Учёба','Работа','Дорога','Идеи'],HD=['Объяснить сложное простыми словами','Разобраться в отчёте','Спланировать поездку','Найти свежую идею'],PT=[[700,470],[790,380],[870,420],[960,300],[1060,340],[1160,220]];
function s6(lt){const ep=Math.min(3,Math.floor(lt/5)),el=lt-ep*5,f=cl(Math.min(el/.6,(5-el)/.6)),col=[CY,AM,GR,MG][ep];
  stars(lt,.01,'#fff',.2);
  T(TG[ep],80,170,72,el,0,{al:'left',col,a:f});T(HD[ep],80,225,30,el,.3,{al:'left',w:300,a:f});
  c.lineWidth=2.5;c.strokeStyle=col;c.fillStyle=col;
  if(ep===0){for(let k=0;k<6;k++){const r=((el*.35+k/6)%1)*260;al(f*(1-r/260)*.8);c.beginPath();c.arc(880,320,r,0,6.3);c.stroke()}al(f);c.beginPath();c.arc(880,320,7,0,6.3);c.fill()}
  if(ep===1){for(let i=0;i<8;i++){const hh=ease((el-.3-i*.15)/.8)*(60+((i*37)%5)*40);al(f*.85);c.fillRect(700+i*60,480-hh,40,hh)}}
  if(ep===2){const pp=ease(el/3.5)*(PT.length-1);al(f);c.beginPath();c.moveTo(...PT[0]);
    for(let i=1;i<PT.length;i++){const u=cl(pp-(i-1));if(u<=0)break;c.lineTo(lerp(PT[i-1][0],PT[i][0],u),lerp(PT[i-1][1],PT[i][1],u))}c.stroke();
    PT.forEach((p,i)=>{if(pp>=i){c.beginPath();c.arc(p[0],p[1],7,0,6.3);c.fill()}})}
  if(ep===3){for(let k=0;k<4;k++){al(f*(.8-k*.15));c.beginPath();for(let x=680;x<=1180;x+=6){const y=320+Math.sin(x*.02+el*3+k)*(70-k*12)*ease(el/1.2);x===680?c.moveTo(x,y):c.lineTo(x,y)}c.stroke()}}}
const PH=[[1,'ИИ может ошибаться'],[6,'Проверяйте важное'],[11,'Решение — за человеком']],RW=[.9,.7,1,.6,.85,.75,.95,.55];
function s7(lt){const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#08203a');g.addColorStop(1,'#04060d');al(1);c.fillStyle=g;c.fillRect(0,0,W,H);
  stars(lt,.006,'#9fd8ff',.4);
  const sc=cl((lt-3)/9)*8;
  RW.forEach((v,i)=>{const y=250+i*34;al(.5);c.fillStyle='#9fc4e6';c.fillRect(120,y,400*v,10);
    if(sc>i){const ok=i!==4||lt>9.5;al(1);c.strokeStyle=ok?GR:AM;c.lineWidth=3;c.beginPath();
      if(ok){c.moveTo(560,y+5);c.lineTo(568,y+13);c.lineTo(582,y-3)}else{c.moveTo(572,y-4);c.lineTo(572,y+8);c.moveTo(572,y+13);c.lineTo(572,y+14)}c.stroke()}});
  if(lt>3&&lt<12.5){const y=250+cl(sc,0,7.5)*34;al(.9);c.strokeStyle=CY;c.lineWidth=2;c.strokeRect(108,y-9,490,28)}
  const hm=ease((lt-10)/1.5);
  for(let k=0;k<3;k++){const r=((lt*.3+k/3)%1)*140;al(hm*(1-r/140)*.6);c.strokeStyle=CY;c.beginPath();c.arc(950,380,60+r,0,6.3);c.stroke()}
  al(hm);c.fillStyle='#dff6ff';c.beginPath();c.arc(950,350,26,0,6.3);c.fill();c.beginPath();c.arc(950,430,48,Math.PI,0);c.fill();
  let pi=0;PH.forEach((p,i)=>{if(lt>=p[0])pi=i});const nx=PH[pi+1]?PH[pi+1][0]:1e9;
  T(PH[pi][1],120,150,60,lt-PH[pi][0],0,{al:'left',col:'#eaf6ff',glow:CY,a:cl((nx-lt)/.4)})}
function s8(lt){const hy=H*.46,cx=W/2+Math.sin(lt*.3)*70*MO,v=RM?.3:1;stars(lt,.07,'#bfe9ff',.8,cx,hy);
  c.strokeStyle=VI;c.lineWidth=1.2;al(.35);
  for(let i=-14;i<=14;i++)seg(cx+i*18,hy,cx+i*190,H);
  for(let k=0;k<12;k++){const z=((k/12+lt*.1*v)%1),y=hy+(H-hy)*Math.pow(z,2.2);al(.15+.5*z);seg(0,y,W,y)}
  for(let k=0;k<9;k++){const z=((k/9+lt*.07*v)%1)+.001,r=40+Math.pow(z,2.2)*900;al(Math.min(.8,(1-z)*1.2)*cl(z*6));c.strokeStyle=k%3?CY:MG;c.lineWidth=1+z*4;c.beginPath();c.arc(cx,hy,r,0,6.3);c.stroke()}
  T('Будущее технологий',W/2,215,84,lt-3,0,{glow:CY});
  T('Помощники станут глубже встроены в работу и учёбу',W/2,275,28,lt-6.5,0,{w:300,col:CY});
  T('Это предположение, а не обещание',W/2,318,24,lt-9,0,{w:300,col:AM})}
function s9(lt){const cx=W/2,cy=H*.44;stars(lt,.05,'#fff',.7);
  if(lt<2){const k=ease(lt/2);c.lineWidth=1.5;for(let i=0;i<48;i++){const a=i/48*6.283,r0=700*(1-k)+20;al(k*.8);c.strokeStyle=i%2?CY:MG;seg(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0,cx+Math.cos(a)*(r0+90),cy+Math.sin(a)*(r0+90))}}
  else{const e=lt-2,fl=Math.max(0,1-e/.5);
    if(fl>0){al(fl*.8);c.fillStyle='#fff';c.fillRect(0,0,W,H)}
    c.lineWidth=2;for(let i=0;i<64;i++){const a=i/64*6.283,r=ease(e/2.5)*(300+(i%5)*120);al(cl(1-e/3.5)*.9);c.strokeStyle=i%2?CY:MG;seg(cx+Math.cos(a)*r*.55,cy+Math.sin(a)*r*.55,cx+Math.cos(a)*r,cy+Math.sin(a)*r)}
    T('ChatGPT 5.5',cx,cy+40,136,e-.2,0,{glow:CY});
    T('Следующий уровень — вместе с человеком',cx,cy+100,32,e-2.5,0,{col:CY,w:300});
    T('Спасибо за просмотр',cx,cy+150,28,e-5.5,0,{w:300})}}
const D=[s1,s2,s3,s4,s5,s6,s7,s8,s9];
function render(t){
  const i=sceneAt(t),s=S[i],lt=t-s.st;
  const a=Math.min(cl(lt/(i?.9:2.5)),cl((s.d-lt)/(i<8?.9:1.8)));
  c.globalAlpha=1;c.fillStyle='#04060d';c.fillRect(0,0,W,H);
  GA=ease(a);const zm=1+lt/s.d*.04*MO+(1-GA)*.06*MO;
  c.save();c.translate(W/2,H/2);c.scale(zm,zm);c.translate(-W/2,-H/2);
  D[i](lt,s.d);c.restore();c.globalAlpha=1;
  c.save();c.font=`400 25px ${SANS}`;
  const ln=wrap(s.v,1020),sa=cl(Math.min(lt-1,s.d-lt-.4)/.5);
  if(sa>0){const g=c.createLinearGradient(0,H-170,0,H);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.7)');c.globalAlpha=sa;c.fillStyle=g;c.fillRect(0,H-170,W,170);
    c.fillStyle='#eaf6ff';c.textAlign='center';ln.forEach((l,k)=>c.fillText(l,W/2,H-44-(ln.length-1-k)*34))}
  c.restore();c.globalAlpha=1}
const A={ctx:null,mus:.7,sfx:.8,vol:.8,muted:false,last:null};
function ainit(){const AC=window.AudioContext||window.webkitAudioContext;if(A.ctx||!AC)return;
  const x=A.ctx=new AC();A.m=x.createGain();A.mu=x.createGain();A.sf=x.createGain();A.sp=x.createGain();A.dest=x.createMediaStreamDestination();
  const rv=x.createConvolver(),n=x.sampleRate*2.2|0,b=x.createBuffer(2,n,x.sampleRate);
  for(let k=0;k<2;k++){const d=b.getChannelData(k);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.5)}
  rv.buffer=b;const rg=x.createGain();rg.gain.value=.35;
  A.mu.connect(A.m);A.sf.connect(A.m);A.mu.connect(rv);A.sf.connect(rv);rv.connect(rg);rg.connect(A.m);
  A.m.connect(A.dest);A.m.connect(A.sp);A.sp.connect(x.destination);avol()}
function avol(){if(!A.ctx)return;A.m.gain.value=A.vol;A.mu.gain.value=A.mus*.55;A.sf.gain.value=A.sfx;A.sp.gain.value=A.muted?0:1}
function tone(f,t,d,ty,g,dst,lp,at=.02){const x=A.ctx,o=x.createOscillator(),e=x.createGain();o.type=ty;o.frequency.value=f;let n=o;
  if(lp){const q=x.createBiquadFilter();q.type='lowpass';q.frequency.value=lp;o.connect(q);n=q}
  e.gain.setValueAtTime(.0001,t);e.gain.linearRampToValueAtTime(g,t+Math.min(at,d/3));e.gain.exponentialRampToValueAtTime(.0001,t+d);
  n.connect(e);e.connect(dst);o.start(t);o.stop(t+d+.05)}
function noise(t,d,ty,f0,f1,g,dst){const x=A.ctx;
  if(!A.nb){A.nb=x.createBuffer(1,x.sampleRate*2,x.sampleRate);const a=A.nb.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1}
  const s=x.createBufferSource();s.buffer=A.nb;s.loop=true;const q=x.createBiquadFilter();q.type=ty;q.frequency.setValueAtTime(f0,t);q.frequency.exponentialRampToValueAtTime(f1,t+d);
  const e=x.createGain();e.gain.setValueAtTime(.0001,t);e.gain.exponentialRampToValueAtTime(g,t+d*.6);e.gain.exponentialRampToValueAtTime(.0001,t+d);
  s.connect(q);q.connect(e);e.connect(dst);s.start(t);s.stop(t+d+.05)}
function kick(t,g,dst){const x=A.ctx,o=x.createOscillator(),e=x.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(40,t+.15);
  e.gain.setValueAtTime(g,t);e.gain.exponentialRampToValueAtTime(.0001,t+.4);o.connect(e);e.connect(dst);o.start(t);o.stop(t+.45)}
const FX={
  whoosh:t=>noise(t,1,'bandpass',250,3500,.5,A.sf),
  ping:t=>{tone(880,t,.9,'sine',.18,A.sf);tone(1320,t+.02,.7,'sine',.1,A.sf);tone(1760,t+.04,.5,'triangle',.05,A.sf)},
  hit:t=>{kick(t,.9,A.sf);noise(t,.9,'lowpass',4000,200,.5,A.sf);tone(55,t,1.6,'sine',.5,A.sf);tone(660,t,1.4,'sawtooth',.05,A.sf,2500)},
  riser:t=>{noise(t,5.2,'bandpass',200,6000,.5,A.sf);tone(110,t,5.5,'sawtooth',.05,A.sf,700,3)},
  final:t=>{[110,220,277.18,329.63,440,659.25].forEach(f=>tone(f,t,5,'sawtooth',.06,A.sf,3000,.05));FX.hit(t)}};
const CH=[[220,261.63,329.63],[174.61,220,261.63],[196,261.63,329.63],[196,246.94,293.66]],BS=[55,43.65,65.41,49],BL=60/92;
const LV={arp:[0,1,1,1,1,1,.5,1,1],kick:[0,0,1,1,1,1,0,1,1],bass:[0,0,0,1,1,1,0,1,1],pad:[.5,.8,.8,.9,.9,.9,1,1,1]};
function beat(b,si){const t=A.ctx.currentTime+.03,bar=Math.floor(b/4)%4,ch=CH[bar],k=b%4;
  if(k===0)ch.forEach((f,j)=>{const g=.05*LV.pad[si],d=BL*4+.6;tone(f*(j?1:.5),t,d,'sawtooth',g,A.mu,900,1.2);tone(f*(j?1:.5)*1.004,t,d,'sawtooth',g,A.mu,900,1.2)});
  if(LV.arp[si])[0,.5].forEach((e,q)=>tone(ch[(b*2+q)%3]*(si===6?4:2),t+e*BL,si===6?1.2:.5,si===6?'sine':'triangle',.07*LV.arp[si],A.mu,3500));
  if(LV.kick[si]){kick(t,.5,A.mu);noise(t+BL/2,.1,'highpass',6000,9000,.1,A.mu)}
  if(LV.bass[si]&&(k===0||k===2))tone(BS[bar],t,BL*1.8,'sawtooth',.16,A.mu,260)}
function atick(t,pt){if(!A.ctx||A.ctx.state!=='running'||!P.playing)return;
  const b=Math.floor(t/BL);if(b!==A.last){A.last=b;beat(b,sceneAt(t))}
  for(const q of CUES)if(q.t>pt&&q.t<=t&&t-pt<.3)FX[q.k](A.ctx.currentTime+.02)}
const P={t:0,pt:-1,playing:false,spk:-1,rec:null};
const IC={play:'<path d="M8 5v14l11-7z"/>',pause:'<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>',prev:'<path d="M6 6h2v12H6zm3 6l9-6v12z"/>',next:'<path d="M16 6h2v12h-2zM15 12L6 6v12z"/>',
 restart:'<path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/>',vol:'<path d="M3 9v6h4l5 4V5L7 9zm13 3a4 4 0 0 0-2-3.5v7A4 4 0 0 0 16 12z"/>',
 mute:'<path d="M3 9v6h4l5 4V5L7 9z"/><path d="M16 9l6 6M22 9l-6 6" fill="none" stroke-width="2"/>',
 full:'<path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z"/>',
 eye:'<path d="M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8z"/>'};
const ic=n=>`<svg viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
document.querySelectorAll('[data-i]').forEach(b=>b.innerHTML=ic(b.dataset.i));
const fmt=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
function msg(t,ms=4500){const m=$('msg');m.textContent=t;m.classList.add('on');clearTimeout(msg.h);msg.h=setTimeout(()=>m.classList.remove('on'),ms)}
function say(i){try{speechSynthesis.cancel();if(!$('spk').checked)return;const u=new SpeechSynthesisUtterance(S[i].v);u.lang='ru-RU';u.rate=1.05;speechSynthesis.speak(u)}catch(e){}}
function stopSay(){try{speechSynthesis.cancel()}catch(e){}}
function seek(t){P.t=cl(t,0,TOT-.01);P.pt=P.t;A.last=null;P.spk=-1;stopSay()}
function play(){if(P.t>=TOT-.05)seek(0);P.playing=true;P.pt=P.t;if(A.ctx&&A.ctx.state==='suspended')A.ctx.resume()}
function pause(){P.playing=false;stopSay()}
function end(){stopSay();if(P.rec)setTimeout(stopRec,800)}
function frame(n){const dt=Math.min(.1,(n-frame.l)/1000||0);frame.l=n;
  if(P.playing){P.pt=P.t;P.t+=dt;if(P.t>=TOT){P.t=TOT-.001;P.playing=false;end()}
    const si=sceneAt(P.t);if(si!==P.spk){P.spk=si;say(si)}}
  render(P.t);atick(P.t,P.pt);
  $('prog').value=drag?$('prog').value:Math.round(P.t/TOT*1000);$('tm').textContent=fmt(P.t)+' / '+fmt(TOT);
  if(frame.p!==P.playing){frame.p=P.playing;$('bPlay').innerHTML=ic(P.playing?'pause':'play')}
  if(P.playing&&n-lastMove>3000&&$('panel').hidden)document.body.classList.add('idle');
  requestAnimationFrame(frame)}
let drag=false,lastMove=0;
const wake=()=>{lastMove=performance.now();document.body.classList.remove('idle')};
['pointermove','pointerdown','keydown'].forEach(e=>addEventListener(e,wake));
function begin(withSound){$('start').hidden=true;if(withSound){ainit();if(A.ctx)A.ctx.resume();else msg('Web Audio не поддерживается — видео без звука.')}else{A.muted=true;ainit()}syncMute();seek(0);play()}
function syncMute(){$('bMute').innerHTML=ic(A.muted?'mute':'vol');avol()}
$('goSound').onclick=()=>begin(true);$('goMute').onclick=()=>begin(false);
$('bPlay').onclick=()=>P.playing?pause():play();
$('bRestart').onclick=()=>{seek(0);play()};
$('bPrev').onclick=()=>{const i=sceneAt(P.t);seek(P.t-S[i].st>2||!i?S[i].st:S[i-1].st)};
$('bNext').onclick=()=>{const i=sceneAt(P.t);i<S.length-1?seek(S[i+1].st):seek(TOT-.5)};
$('bMute').onclick=()=>{A.muted=!A.muted;syncMute();if(!A.muted&&!A.ctx)ainit()};
$('bSet').onclick=()=>{$('panel').hidden=!$('panel').hidden};
$('bFull').onclick=()=>{const e=$('wrap'),f=e.requestFullscreen||e.webkitRequestFullscreen;
  if(document.fullscreenElement||document.webkitFullscreenElement){(document.exitFullscreen||document.webkitExitFullscreen).call(document)}
  else if(f)f.call(e).catch(()=>msg('Полноэкранный режим недоступен.'));else msg('Полноэкранный режим недоступен в этом браузере.')};
function clean(on){document.body.classList.toggle('clean',on);$('uiShow').hidden=!on;if(on)msg('Интерфейс скрыт. Нажмите H или значок справа сверху.',3000)}
$('bClean').onclick=()=>clean(true);$('uiShow').onclick=()=>clean(false);
$('prog').addEventListener('pointerdown',()=>drag=true);addEventListener('pointerup',()=>drag=false);
$('prog').addEventListener('input',e=>seek(e.target.value/1000*TOT));
$('vMaster').oninput=e=>{A.vol=e.target.value/100;avol()};$('vMus').oninput=e=>{A.mus=e.target.value/100;avol()};$('vSfx').oninput=e=>{A.sfx=e.target.value/100;avol()};
$('spk').onchange=()=>{P.spk=-1};
cv.addEventListener('click',()=>{if(!$('start').hidden)return;P.playing?pause():play()});
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'&&e.target.type!=='checkbox')return;const k=e.key.toLowerCase();
  if(k===' '){e.preventDefault();$('bPlay').click()}else if(k==='arrowright')$('bNext').click();else if(k==='arrowleft')$('bPrev').click();
  else if(k==='f')$('bFull').click();else if(k==='m')$('bMute').click();else if(k==='h')clean(!document.body.classList.contains('clean'))});
function stopRec(){if(P.rec&&P.rec.state!=='inactive')P.rec.stop()}
$('bRec').onclick=()=>{
  if(P.rec){stopRec();return}
  if(!window.MediaRecorder||!cv.captureStream)return msg('Запись не поддерживается этим браузером.');
  const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
  if(!mime)return msg('Формат WebM недоступен в этом браузере.');
  ainit();if(A.ctx)A.ctx.resume();
  const st=cv.captureStream(30);if(A.ctx)A.dest.stream.getAudioTracks().forEach(t=>st.addTrack(t));
  const ch=[],r=P.rec=new MediaRecorder(st,{mimeType:mime,videoBitsPerSecond:6e6});
  r.ondataavailable=e=>e.data.size&&ch.push(e.data);
  r.onstop=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(ch,{type:'video/webm'}));a.download='code-video-studio.webm';document.body.appendChild(a);a.click();a.remove();
    P.rec=null;$('bRec').textContent='Записать видео';msg('Готово: файл WebM сохранён.')};
  r.start(1000);$('bRec').textContent='Остановить запись';$('panel').hidden=true;
  msg('Идёт запись ≈2:30. Не сворачивайте вкладку.',6000);seek(0);play()};
try{ainit();if(A.ctx&&A.ctx.state==='running'){$('start').hidden=true;syncMute();play()}}catch(e){msg('Ошибка аудио: '+e.message)}
syncMute();frame.l=performance.now();requestAnimationFrame(frame);
