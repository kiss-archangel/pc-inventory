const CFG0=window.APP_CONFIG||{};
const ID0=CFG0.sheetId||'';
const GR={'ГУ':['ГУ'],'3 ДПРЗ':['1 ДПРЧ (м. Рівне)','2 ДПРЧ  (м. Рівне)','3 ДПРЧ   (м. Рівне)','25 ДПРЧ   (м. Рівне)','4 ДПРЧ (с-ще. Клевань)','17 ДПРЧ   (м. Острог)','18 ДПРЧ   (м. Здолбунів)','26 ДПРЧ   (смт Мізоч)','5 ДПРЧ    (м. Дубно)','6 ДПРЧ    (смт Млинів)','7 ДПРЧ   (м. Радивилів)','24 ДПРЧ   (смт Демидівка)','2 ДПРП   (с. Козин)','6 ДПРП   (с. Острожець)'],
'5 ДПРЗ':['8 ДПРЧ    (м. Сарни)','9 ДПРЧ   (м. Березне)','ДПРЧ-10 (с-ще.Рокитно)','11 ДПРЧ   (смт Володимирець)','12 ДПРЧ   (м. Вараш)','13 ДПРЧ  (смт Зарічне)','14 ДПРЧ  (м. Дубровиця)','15 ДПРЧ  (м. Корець)','16 ДПРЧ  (смт. Гоща)','19 ДПРЧ   (м. Костопіль)','27 ДПРЧ  (смт Рафалівка)','3 ДПРП   (с. Моквин)','4 ДПРП   (смт. Соснове)','7 ДПРП   (смт Степань)'],
'АРЗ СП':['ЧСТ (м. Рівне)','АРЗ  Адмін будівля','АРЧ АРЗ СП','ЧЗ АРЗ СП']};
const DEF={id:ID0,every:60,intro:true,cid:CFG0.clientId||'',units:Object.entries(GR).flatMap(([g,a])=>a.map(n=>({name:n,group:g})))};
const FIELDS=[['unit','Підрозділ'],['dept','Відділ / сектор'],['pos','Посада'],['person','Закріплена особа'],['model','Модель ПК'],['type','Тип ПК'],['inv','Інвентарний №'],['mol','Матеріальна особа'],['recv','Введено в експлуатацію'],['cpu','Процесор'],['rel','Рік випуску'],['name','Назва ПК'],['ip','IP'],['mac','MAC'],['win','ОС Windows (версія)'],['ubu','ОС Ubuntu (версія)'],['agent','Агент захисту (ТАК/ні)'],['ver','Версія / тип агента'],['note','Примітки']];
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const col=s=>String(s||'').replace(/\s+/g,' ').trim();
const ld=(k,d)=>{try{return JSON.parse(localStorage.getItem('pcinv.'+k))||d}catch(e){return d}},sv=(k,v)=>{try{localStorage.setItem('pcinv.'+k,JSON.stringify(v))}catch(e){}};
let cfg={...DEF,...ld('cfg',{})},ov=ld('ov',{edit:{},del:[],add:[]}),base=[],status={},src='sheet',tab='ov',timer,last=null;if(!cfg.cid)cfg.cid=DEF.cid;
let F={q:'',u:'',o:'',a:'',i:'',sk:'unit',sd:1,pg:0};
/* ---------- parsing ---------- */
function csv(t){const r=[];let row=[],c='',q=false;for(let i=0;i<t.length;i++){const h=t[i];if(q){if(h=='"'){if(t[i+1]=='"'){c+='"';i++}else q=false}else c+=h}else if(h=='"')q=true;else if(h==','){row.push(c);c=''}else if(h=='\n'||h=='\r'){if(h=='\r'&&t[i+1]=='\n')i++;row.push(c);r.push(row);row=[];c=''}else c+=h}if(c||row.length){row.push(c);r.push(row)}return r}
function hmap(h){const m={};h.forEach((x,i)=>{x=col(x).toLowerCase();let k=null;
if(x.includes('модель пк'))k='model';else if(x.includes('тип пк'))k='type';else if(x.includes('посада'))k='pos';else if(x.includes('закріплена'))k='person';else if(x.includes('інвентар'))k='inv';else if(x.includes('матеріальна'))k='mol';else if(x.includes('отримано'))k='recv';else if(x.includes('примітки'))k='note';else if(x.includes('модель процесора'))k='cpu';else if(x.includes('дата випуску'))k='rel';else if(x.includes('назва пк'))k='name';else if(x.includes('адреса')&&(x.includes('ір')||x.includes('ip')))k='ip';else if(x.includes('адреса')&&x.includes('мас'))k='mac';else if(x.includes('windw')||x.includes('windows'))k='win';else if(x.includes('ubuntu'))k='ubu';else if(x.includes('наявність'))k='agent';else if(x.includes('версія аг'))k='ver';
if(k&&!(k in m))m[k]=i});return m}
function parse(rows,u){const label=col(u.name),hi=rows.findIndex(r=>r.some(c=>col(c).toLowerCase().includes('модель пк')));if(hi<0)return[];
const m=hmap(rows[hi]),out=[];let dept='';
for(let i=hi+1;i<rows.length;i++){const r=rows[i].map(col),ne=r.filter(Boolean);if(!ne.length)continue;
if(ne.length==1&&!/^\d+$/.test(ne[0])){dept=ne[0];continue}
if(!/^\d+$/.test(r[0]))continue;
const o={id:label+'#'+i,unit:label,group:u.group||'Інше',dept};for(const k in m)o[k]=(r[m[k]]||'').replace(/^-$/,'');
if(!(o.model||o.person||o.pos||o.inv))continue;
FIELDS.forEach(([k])=>{if(!(k in o))o[k]=''});out.push(o)}return out}
async function getSheet(n){const b=`https://docs.google.com/spreadsheets/d/${cfg.id}/gviz/tq?tqx=out:csv&sheet=`;
let r=await fetch(b+encodeURIComponent(n));if(!r.ok&&col(n)!==n)r=await fetch(b+encodeURIComponent(col(n)));if(!r.ok)throw new Error('HTTP '+r.status);return r.text()}
async function refresh(){if(src=='file'){src='sheet'}dot('ld','Завантаження…');
let res;
if(tok||cfg.api){try{const j=tok?await viaOAuth():await(await fetch(cfg.api)).json();res=Object.keys(j).map(n=>{let u=cfg.units.find(x=>col(x.name)==col(n))||{name:n,group:'Інше'};const recs=parse(j[n],u);if(recs.length&&!cfg.units.includes(u)){cfg.units.push(u);sv('cfg',cfg)}return{u,recs}}).filter(x=>x.recs.length||cfg.units.includes(x.u))}catch(e){res=[{u:{name:'Apps Script'},err:e.message}]}}
else res=await Promise.all(cfg.units.map(async u=>{try{return{u,recs:parse(csv(await getSheet(u.name)),u)}}catch(e){return{u,err:e.message}}}));
const ok=res.filter(x=>!x.err);status={};res.forEach(x=>status[col(x.u.name)]=x.err||x.recs.length);
if(!ok.length){dot('er','Немає доступу до таблиці');render();return}
base=ok.flatMap(x=>x.recs);last=new Date();dot('ok','Оновлено '+last.toLocaleTimeString('uk'));render()}
let tok=null,tc=null;
function signIn(){if(!cfg.cid){alert('Вкажіть OAuth Client ID');return}if(!window.google){alert('Бібліотеку Google не завантажено (немає інтернету?)');return}
tc=google.accounts.oauth2.initTokenClient({client_id:cfg.cid,scope:'https://www.googleapis.com/auth/spreadsheets.readonly',callback:r=>{if(r.access_token){tok=r.access_token;refresh()}else dot('er','Вхід не вдався: '+(r.error||''))}});tc.requestAccessToken()}
async function viaOAuth(){const h={Authorization:'Bearer '+tok},B='https://sheets.googleapis.com/v4/spreadsheets/'+cfg.id;
const chk=async r=>{if(r.status==401){tok=null;throw new Error('Сесія Google закінчилась — увійдіть знову')}if(!r.ok)throw new Error('Sheets API '+r.status+(r.status==403?' (немає доступу до таблиці або не ввімкнено Google Sheets API)':''));return r.json()};
const names=(await chk(await fetch(B+'?fields=sheets.properties.title',{headers:h}))).sheets.map(x=>x.properties.title),o={};
for(let i=0;i<names.length;i+=8){const ch=names.slice(i,i+8),q=ch.map(n=>'ranges='+encodeURIComponent("'"+n.replace(/'/g,"''")+"'")).join('&');
const j=await chk(await fetch(B+'/values:batchGet?'+q,{headers:h}));j.valueRanges.forEach((v,k)=>o[ch[k]]=v.values||[])}return o}
function dot(c,t){$('#dot').className='dot '+c;$('#stt').textContent=t}
function auto(){clearInterval(timer);if(cfg.every>0)timer=setInterval(()=>{if(src=='sheet'&&!$('#dlg').open&&!window._sw)refresh()},cfg.every*1000)}
function importFile0(f){const rd=new FileReader();rd.onload=e=>{const wb=XLSX.read(e.target.result,{type:'array'});let all=[];
wb.SheetNames.forEach(n=>{let u=cfg.units.find(x=>col(x.name)==col(n));if(!u){u={name:n,group:'Інше'}}
const rows=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:false,defval:''});const rc=parse(rows,u);if(rc.length){all.push(...rc);if(!cfg.units.includes(u))cfg.units.push(u)}});
base=all;src='file';sv('cfg',cfg);dot('ld','Із файлу: '+f.name);render()};rd.readAsArrayBuffer(f)}
function loadXLSX(){return window.XLSX?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=ok;s.onerror=()=>no(new Error('Не вдалося завантажити бібліотеку XLSX'));document.head.appendChild(s)})}
function importFile(f){if(f)loadXLSX().then(()=>importFile0(f)).catch(e=>alert(e.message))}
/* ---------- derived ---------- */
const osOf=r=>r.win&&r.win!='-'?'Windows':r.ubu&&r.ubu!='-'?'Linux':'Невідомо';
const agOf=r=>/так/i.test(r.agent)||!!r.ver||/trelix|cortex/i.test(r.agent);
const verOf=r=>r.ver||(/так/i.test(r.agent)?'':r.agent)||'';
const nm=s=>String(s||'').replace(/[^0-9a-f]/gi,'').toUpperCase();
function data(){const d=new Set(ov.del);return base.filter(r=>!d.has(r.id)).map(r=>ov.edit[r.id]?{...r,...ov.edit[r.id]}:r).concat(ov.add)}
function analyze(L){const mac={},ip={},inv={},fl=new Map();
L.forEach(r=>{const a=nm(r.mac);if(a.length>=12)(mac[a]=mac[a]||[]).push(r);const p=col(r.ip);if(/^\d+\.\d+\.\d+\.\d+$/.test(p))(ip[p]=ip[p]||[]).push(r);const v=col(r.inv);if(v&&!/^(б\/н|-)$/i.test(v))(inv[v]=inv[v]||[]).push(r)});
L.forEach(r=>{const f=[],o=osOf(r);if(o=='Невідомо')f.push(['Немає ОС','o']);if(!agOf(r))f.push(['Немає агента','r']);if(!col(r.ip))f.push(['Немає IP','o']);if(!nm(r.mac))f.push(['Немає MAC','o']);
const a=nm(r.mac);if(a.length>=12&&mac[a].length>1)f.push(['Дубль MAC','r']);if(ip[col(r.ip)]?.length>1)f.push(['Дубль IP','r']);if(inv[col(r.inv)]?.length>1)f.push(['Дубль інв. №','o']);
if(/10/.test(r.win))f.push(['Windows 10','o']);if(/списан/i.test(r.note))f.push(['На списання','r']);const y=parseInt(r.rel);if(y&&y<=2016)f.push(['Старе (≤2016)','o']);fl.set(r.id,f.filter(x=>issOk(x[0])))});return fl}
function stat(L){const s={t:L.length,l:0,w:0,u:0,a:0};L.forEach(r=>{const o=osOf(r);o=='Linux'?s.l++:o=='Windows'?s.w++:s.u++;if(agOf(r))s.a++});return s}
const pc=(a,b)=>b?Math.round(a/b*100):0;
const sbar=s=>`<div class="bar"><i style="width:${pc(s.l,s.t)}%;background:var(--g)"></i><i style="width:${pc(s.w,s.t)}%;background:var(--bl)"></i><i style="width:${100-pc(s.l,s.t)-pc(s.w,s.t)}%;background:var(--o)"></i></div>`;
/* ---------- views ---------- */
function render(){if(!allowedTab([tab]))tab=tabList().find(allowedTab)[0];$('#nav').innerHTML=tabList().filter(allowedTab).map(([k,n])=>`<button class="${k==tab?'on':''}" onclick="tab='${k}';render()">${ic(k)}<span>${k=='st'&&!me.admin?'Профіль':n}</span></button>`).join('');
const L=data(),fl=analyze(L);let h='';
if(!L.length)h=`<div class="warn">Дані не завантажено. Таблиця має бути доступна «усім, хто має посилання» (перегляд) — або імпортуйте .xlsx у вкладці «Налаштування», або підключіть Apps Script.${Object.values(status).find(v=>typeof v=='string')?'<br>Помилка: '+esc(Object.values(status).find(v=>typeof v=='string')):''}</div>`;
h+=({ov:vOv,un:vUn,rg:vRg,is:vIs,st:vSt})[tab](L,fl);const o={};document.querySelectorAll('.mod').forEach(e=>o[e.dataset.id]=e.getBoundingClientRect());$('#app').innerHTML=h;
document.querySelectorAll('.mod').forEach(e=>{const a=o[e.dataset.id];if(!a||!e.animate)return;const b=e.getBoundingClientRect(),dx=a.left-b.left,dy=a.top-b.top;if(dx||dy)e.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'none'}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'})});cnt()}
function kpi(l,v,s,c=''){return`<div class="card kpi"><div class="l">${l}</div><div class="v ${c}" data-v="${v}">${v}</div><div class="s">${s||''}</div></div>`}
let lay=ld('lay',{});if(!lay.tabs)lay={tabs:{ov:{order:lay.order||[],hidden:lay.hidden||[],size:Object.fromEntries(Object.entries(lay.size||{}).map(([k,v])=>[k,[v,0]]))}},custom:lay.custom||[],presets:{},edit:!!lay.edit};lay.presets=lay.presets||{};lay.custom=lay.custom||[];
const mgT=t=>Object.values(t||{}).forEach(x=>Object.values(x.size||{}).forEach(z=>{z[0]=z[0]*2}));
if(!lay.v){mgT(lay.tabs);Object.values(lay.presets).forEach(p=>{if(!p.v){mgT(p.tabs);p.v=2}});lay.v=2}
const sl=()=>sv('lay',lay);
const HF=[['unit','Підрозділ'],['group','Загін'],['dept','Відділ'],['type','Тип ПК'],['model','Модель'],['cpu','Процесор'],['rel','Рік випуску'],['mol','Матеріально відповідальна особа'],['win','Версія Windows'],['ubu','Версія Ubuntu'],['os','ОС'],['ag','Агент захисту']];
const hfv=f=>r=>f=='os'?osOf(r):f=='ag'?(agOf(r)?(verOf(r)||'Встановлено'):'Немає'):f=='rel'?(parseInt(r.rel)?String(parseInt(r.rel)):''):r[f];
const cntBy=(L,f)=>{const m={};L.forEach(r=>{const k=f(r);if(k)m[k]=(m[k]||0)+1});return Object.entries(m).sort((x,y)=>y[1]-x[1])};
const histH=(a,c)=>{const m=Math.max(1,...a.map(x=>x[1]));return a.slice(0,15).map(([k,v])=>`<div class="row"><span class="n">${esc(k)}</span><div class="bar"><i style="width:${v/m*100}%;background:${c}"></i></div><span class="c">${v}</span></div>`).join('')||'<span class="mu">—</span>'};
function allMods(L,fl){const s=stat(L),ag=s.t-s.a,iss=[...fl.values()].filter(f=>f.length).length,a=pc(s.l,s.t),b=a+pc(s.w,s.t);
const M=[
{id:'k_total',t:'Всього ПК',w:3,h:kpi('Всього ПК',s.t,cfg.units.length+' підрозділів')},
{id:'k_linux',t:'Linux',w:3,h:kpi('Linux',s.l,pc(s.l,s.t)+'%','g')},
{id:'k_win',t:'Windows',w:3,h:kpi('Windows',s.w,pc(s.w,s.t)+'%','bl')},
{id:'k_unk',t:'ОС не вказана',w:3,h:kpi('ОС не вказана',s.u,pc(s.u,s.t)+'%','o')},
{id:'k_ag',t:'Агент встановлено',w:3,h:kpi('Агент встановлено',s.a,pc(s.a,s.t)+'% покриття','g')},
{id:'k_noag',t:'Без агента',w:3,h:kpi('Без агента',ag,'потребує уваги',ag?'r':'g')},
{id:'k_iss',t:'ПК із зауваженнями',w:3,h:kpi('ПК з зауваженнями',iss,'див. «Проблеми»','o')},
{id:'m_os',t:'Операційні системи',w:4,h:`<div class="card"><h2>Операційні системи</h2><div class="dc"><div class="donut" style="background:conic-gradient(var(--g) 0 ${a}%,var(--bl) ${a}% ${b}%,var(--o) ${b}% 100%)"></div><div class="lg"><div><b style="background:var(--g)"></b>Linux — ${s.l}</div><div><b style="background:var(--bl)"></b>Windows — ${s.w}</div><div><b style="background:var(--o)"></b>Невідомо — ${s.u}</div></div></div></div>`},
{id:'m_grp',t:'За загонами',w:4,h:`<div class="card"><h2>За загонами</h2>${Object.keys(groups()).map(g=>{const x=stat(L.filter(r=>r.group==g));return`<div class="row"><span class="n">${esc(g)}</span>${sbar(x)}<span class="c">${x.t} ПК · ${pc(x.a,x.t)}%🛡</span></div>`}).join('')}</div>`},
{id:'m_osv',t:'Версії ОС',w:4,h:`<div class="card"><h2>Версії ОС</h2>${histH(cntBy(L,r=>osOf(r)=='Linux'?r.ubu:osOf(r)=='Windows'?r.win:''),'var(--g)')}</div>`},
{id:'m_agv',t:'Агент захисту (версії)',w:4,h:`<div class="card"><h2>Агент захисту (версії)</h2>${histH(cntBy(L,hfv('ag')),'var(--o)')}</div>`},
{id:'m_year',t:'Рік випуску пристроїв',w:4,h:`<div class="card"><h2>Рік випуску пристроїв</h2>${histH(cntBy(L,hfv('rel')).sort((x,y)=>x[0]-y[0]),'var(--bl)')}</div>`},
{id:'m_type',t:'Типи ПК',w:4,h:`<div class="card"><h2>Типи ПК</h2>${histH(cntBy(L,r=>r.type||'—'),'var(--g)')}</div>`}];
lay.custom.forEach(c=>{if(c.kind=='hist')M.push({id:c.id,t:c.title,w:4,h:`<div class="card"><h2>${esc(c.title)}</h2>${histH(cntBy(L,hfv(c.field)),'var(--g)')}</div>`});
else{const x=L.filter(r=>(!c.unit||r.unit==c.unit)&&(!c.os||osOf(r)==c.os)&&(!c.ag||(c.ag=='y')==agOf(r)));M.push({id:c.id,t:c.title,w:3,h:kpi(c.title,x.length,c.unit||'усі підрозділи')})}});
return M}
const IC={ov:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',un:'<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/>',rg:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',is:'<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/>',st:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',lay:'<path d="M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z"/>'};
const ic=k=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;
const LT=()=>lay.tabs[tab]||(lay.tabs[tab]={order:[],hidden:[],size:{}});
function flip(fn,ex){const els=[...document.querySelectorAll('.mod')].filter(e=>e!==ex),o=new Map(els.map(e=>[e,e.getBoundingClientRect()]));fn();els.forEach(e=>{if(!e.animate)return;const a=o.get(e),b=e.getBoundingClientRect(),dx=a.left-b.left,dy=a.top-b.top;if(dx||dy)e.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'none'}],{duration:200,easing:'cubic-bezier(.2,.8,.2,1)'})})}
function layout(M){const T=LT(),ids=M.map(m=>m.id),by=Object.fromEntries(M.map(m=>[m.id,m])),ed=lay.edit,ord=[...T.order.filter(i=>ids.includes(i)),...ids.filter(i=>!T.order.includes(i))];window._ord=ord;window._M=M;const ps=Object.keys(lay.presets);
let h=`<div class="tools lt"><button class="btn ${ed?'pr':''}" onclick="lay.edit=!lay.edit;sl();render()">${ic('lay')} ${ed?'Готово':'Макет'}</button>`+(ed?`<button class="btn" onclick="addMod()">＋ Модуль</button><button class="btn" onclick="savePre()">💾 Зберегти макет</button>${ps.length?`<select onchange="loadPre(this.value)"><option value="">Завантажити…</option>${ps.map(p=>`<option>${esc(p)}</option>`).join('')}</select>`:''}<button class="btn" onclick="expLay()">⇩ Файл</button><label class="btn">⇧ Файл<input type="file" accept=".json" hidden onchange="impLay(this.files[0])"></label><button class="btn dg" onclick="resetLay()">Скинути</button><span class="mu hint">Тягніть картки · тягніть краї й кут — розмір; двічі клацніть нижній край — висота за вмістом</span>`:'<span class="mu hint">Затисніть блок мишею й перетягніть куди завгодно</span>')+`</div><div class="mg">`;
h+=ord.filter(i=>!T.hidden.includes(i)).map(i=>{const m=by[i],z=T.size[i]||[],w=z[0]||m.w*2,hh=z[1]?(z[1]>30?z[1]:z[1]*74-14):0;return`<div class="mod${ed?' ed':''}" data-id="${esc(i)}" style="grid-column:span ${w};${hh?'height:'+hh+'px':''}">${ed?'<button class="btn dg mx" onclick="hm(this)">✕</button><i class="rz rx" data-d="x"></i><i class="rz ry" data-d="y"></i><i class="rz rc" data-d="xy"></i>':''}${m.h}</div>`}).join('');return h+'</div>'}
function vOv(L,fl){return layout(allMods(L,fl).filter(m=>!(H('agent')&&['k_ag','k_noag','m_agv'].includes(m.id))))}
function hm(b){const i=b.closest('.mod').dataset.id,k=lay.custom.findIndex(c=>c.id==i);if(k>=0)lay.custom.splice(k,1);else LT().hidden.push(i);sl();render()}
function sm(i){const T=LT();T.hidden=T.hidden.filter(x=>x!=i);sl();$('#dlg').close();render()}
function savePre(){const n=prompt('Назва макета:');if(!n)return;lay.presets[n]=JSON.parse(JSON.stringify({tabs:lay.tabs,custom:lay.custom,v:2}));sl();render()}
function loadPre(n){const p=lay.presets[n];if(!p)return;lay.tabs=JSON.parse(JSON.stringify(p.tabs));lay.custom=JSON.parse(JSON.stringify(p.custom));if(!p.v)mgT(lay.tabs);sl();render()}
function expLay(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({v:2,tabs:lay.tabs,custom:lay.custom,presets:lay.presets})],{type:'application/json'}));a.download='layout.json';a.click()}
function impLay(f){f.text().then(t=>{const j=JSON.parse(t);if(!j.tabs)throw 0;if(!j.v){mgT(j.tabs);Object.values(j.presets||{}).forEach(p=>{if(!p.v){mgT(p.tabs);p.v=2}})}lay.tabs=j.tabs;lay.custom=j.custom||[];lay.presets={...lay.presets,...(j.presets||{})};sl();render()}).catch(()=>alert('Некоректний файл макета'))}
function resetLay(){if(confirm('Скинути макет цієї вкладки?')){lay.tabs[tab]={order:[],hidden:[],size:{}};if(tab=='ov')lay.custom=[];sl();render()}}
function addMod(){const hid=(window._M||[]).filter(m=>LT().hidden.includes(m.id)),d=$('#dlg'),so=a=>a.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join('');
d.innerHTML=`<h2>Додати модуль</h2>${hid.length?`<div class="tools">${hid.map(m=>`<button class="btn" onclick="sm('${esc(m.id).replace(/'/g,"\\'")}')">＋ ${esc(m.t)}</button>`).join('')}</div>`:'<p class="mu">Прихованих модулів немає.</p>'}`+(tab!='ov'?'':`
<h2 style="margin-top:18px">Створити свій</h2><div class="fm"><label>Тип<select id="ck" onchange="cf1.style.display=this.value=='hist'?'':'none';cf2.style.display=this.value=='kpi'?'':'none'"><option value="hist">Гістограма</option><option value="kpi">Лічильник</option></select></label><label>Назва<input id="ct"></label>
<label id="cf1">Розподіл за<select id="cfl">${so(HF)}</select></label>
<div id="cf2" class="fm w" style="display:none"><label>Підрозділ<select id="cu"><option value="">Усі</option>${so(cfg.units.map(u=>[col(u.name),col(u.name)]))}</select></label><label>ОС<select id="co"><option value="">Будь-яка</option><option>Linux</option><option>Windows</option><option>Невідомо</option></select></label><label>Агент<select id="ca"><option value="">Будь-який</option><option value="y">Є</option><option value="n">Немає</option></select></label></div></div>`)+`
<div class="tools" style="margin-top:16px;justify-content:flex-end"><button class="btn" onclick="$('#dlg').close()">Закрити</button>${tab=='ov'?'<button class="btn pr" onclick="mkMod()">Створити</button>':''}</div>`;d.showModal()}
function mkMod(){const k=$('#ck').value,c={id:'c'+Date.now(),kind:k,title:$('#ct').value.trim()||'Новий модуль'};if(k=='hist')c.field=$('#cfl').value;else{c.unit=$('#cu').value;c.os=$('#co').value;c.ag=$('#ca').value}lay.custom.push(c);sl();$('#dlg').close();render()}
/* resize / drag / effects */
document.addEventListener('pointerdown',e=>{const h=e.target.closest?.('.rz');if(!h)return;e.preventDefault();
const m=h.closest('.mod'),g=m.parentElement,id=m.dataset.id,d=h.dataset.d,gap=14,cw=(g.getBoundingClientRect().width-gap*23)/24,sx=e.clientX,sy=e.clientY,r0=m.getBoundingClientRect(),T=LT();
let w=Math.round((r0.width+gap)/(cw+gap)),px=r0.height,raf=0,ev=e;m.draggable=false;document.body.classList.add('rsz');
if(d.includes('x')){m.style.justifySelf='start';m.style.width=r0.width+'px'}
const apply=()=>{raf=0;if(d.includes('x')){const nw=Math.max(cw*3+gap*2,Math.min(g.getBoundingClientRect().width,r0.width+ev.clientX-sx));m.style.width=nw+'px';const k=Math.max(3,Math.min(24,Math.round((nw+gap)/(cw+gap))));if(k!=w){w=k;flip(()=>{m.style.gridColumn='span '+w},m)}}
if(d.includes('y')){px=Math.max(40,Math.min(1600,r0.height+ev.clientY-sy));m.style.height=px+'px'}};
const mv=x=>{ev=x;if(!raf)raf=requestAnimationFrame(apply)};
const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);cancelAnimationFrame(raf);apply();document.body.classList.remove('rsz');m.draggable=true;
T.size[id]=[w,d.includes('y')?Math.round(px):(T.size[id]?.[1]||0)];sl();
if(d.includes('x')){const fw=w*cw+(w-1)*gap;m.style.transition='width .2s cubic-bezier(.2,.8,.2,1)';m.style.width=fw+'px';setTimeout(()=>{m.style.transition='';m.style.width='';m.style.justifySelf=''},220)}};
addEventListener('pointermove',mv);addEventListener('pointerup',up)});
document.addEventListener('pointerdown',e=>{
if(e.button||e.pointerType=='touch'||e.target.closest('.rz,button,input,select,textarea,label,a'))return;
const m=e.target.closest?.('.mod');if(!m||m.parentElement?.className!='mg')return;
const g=m.parentElement,r0=m.getBoundingClientRect(),ox=e.clientX-r0.left,oy=e.clientY-r0.top,sx=e.clientX,sy=e.clientY;let on=0,last=0,ev=e,raf=0;
const place=()=>{m.style.transform='none';const b=m.getBoundingClientRect();m.style.transform=`translate(${ev.clientX-ox-b.left}px,${ev.clientY-oy-b.top}px)`};
const step=()=>{raf=0;place();const now=performance.now();
if(now-last>220){const t=[...g.children].find(x=>{if(x===m)return false;const r=x.getBoundingClientRect();return ev.clientX>r.left&&ev.clientX<r.right&&ev.clientY>r.top&&ev.clientY<r.bottom});
if(t){last=now;flip(()=>{g.insertBefore(m,(m.compareDocumentPosition(t)&Node.DOCUMENT_POSITION_FOLLOWING)?t.nextSibling:t);place()},m)}}
if(ev.clientY<70)scrollBy(0,-14);else if(innerHeight-ev.clientY<70)scrollBy(0,14)};
const mv=x=>{ev=x;if(!on){if(Math.hypot(x.clientX-sx,x.clientY-sy)<6)return;on=1;m.classList.add('dragging');document.body.classList.add('mvg');getSelection()?.removeAllRanges()}if(!raf)raf=requestAnimationFrame(step)};
const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);if(!on)return;cancelAnimationFrame(raf);place();
const a=m.getBoundingClientRect();m.classList.remove('dragging');document.body.classList.remove('mvg');m.style.transform='none';const b=m.getBoundingClientRect();
if(m.animate)m.animate([{transform:`translate(${a.left-b.left}px,${a.top-b.top}px) scale(1.02)`},{transform:'none'}],{duration:220,easing:'cubic-bezier(.2,.8,.2,1)'});m.style.transform='';
const ids=[...g.children].filter(x=>x.dataset.id).map(x=>x.dataset.id);LT().order=[...ids,...(window._ord||[]).filter(i=>!ids.includes(i))];window._ord=LT().order;sl();window._nc=1;setTimeout(()=>window._nc=0,60)};
addEventListener('pointermove',mv);addEventListener('pointerup',up)});
document.addEventListener('dblclick',e=>{const h=e.target.closest?.('.ry,.rc');if(!h)return;const m=h.closest('.mod'),T=LT(),w=+(m.style.gridColumn.match(/\d+/)||[0])[0];flip(()=>{m.style.height=''},m);T.size[m.dataset.id]=[w,0];sl()});
document.addEventListener('click',e=>{if(window._nc){e.stopPropagation();e.preventDefault()}},true);
document.addEventListener('pointermove',e=>{if(document.body.classList.contains('rsz')||document.body.classList.contains('mvg'))return;const c=e.target.closest?.('.card');if(c){const r=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-r.left+'px');c.style.setProperty('--my',e.clientY-r.top+'px')}});
function cnt(){window._kv=window._kv||{};document.querySelectorAll('.kpi .v[data-v]').forEach(e=>{const k=e.closest('.mod')?.dataset.id||e.dataset.v,to=+e.dataset.v,from=window._kv[k];window._kv[k]=to;if(isNaN(to)||from===to)return;const f0=from??0,t0=performance.now();(function s(t){const p=Math.min(1,(t-t0)/600),q=1-Math.pow(1-p,3);e.textContent=Math.round(f0+(to-f0)*q);if(p<1)requestAnimationFrame(s)})(t0)})}
function groups(){const g={};cfg.units.forEach(u=>(g[u.group||'Інше']=g[u.group||'Інше']||[]).push(col(u.name)));data().forEach(r=>{g[r.group||'Інше']=g[r.group||'Інше']||[];if(!g[r.group||'Інше'].includes(r.unit))g[r.group||'Інше'].push(r.unit)});return g}
function vUn(L,fl){const gs=groups();return layout(Object.keys(gs).map(g=>{const x=stat(L.filter(r=>r.group==g));
return{id:'g:'+g,t:g,w:12,h:`<div class="card"><div class="gh"><b>${esc(g)}</b><span>${x.t} ПК · Linux ${pc(x.l,x.t)}% · Windows ${pc(x.w,x.t)}% · агент ${pc(x.a,x.t)}%</span></div><div class="ug">${gs[g].map(n=>{const ul=L.filter(r=>r.unit==n),s=stat(ul),bad=ul.filter(r=>fl.get(r.id)?.length).length,e=status[n];
return`<div class="uc ucard" onclick="F={...F,u:'${esc(n).replace(/'/g,"\\'")}',pg:0};tab='rg';render()"><div class="h"><span>${esc(n)}</span><span>${s.t}</span></div>${sbar(s)}<div class="mu" style="margin-top:8px">🐧 ${s.l} · 🪟 ${s.w} · ❔ ${s.u} · 🛡 ${pc(s.a,s.t)}%</div>${bad?`<div style="margin-top:6px"><span class="tag to">${bad} із зауваженнями</span></div>`:''}${typeof e=='string'?`<div style="margin-top:6px"><span class="tag tr">помилка: ${esc(e)}</span></div>`:''}</div>`}).join('')}</div></div>`}}))}
const SORT={unit:r=>r.unit,dept:r=>r.dept,person:r=>r.person||r.pos,model:r=>r.model,type:r=>r.type,inv:r=>r.inv,os:osOf,ag:r=>agOf(r)?1:0,ip:r=>r.ip,name:r=>r.name};
function vRg(L,fl){const HK=hk();let R=L.filter(r=>{const q=F.q.toLowerCase();return(!F.u||r.unit==F.u)&&(!F.o||osOf(r)==F.o)&&(!F.a||(F.a=='y')==agOf(r))&&(!F.i||(F.i=='*'?fl.get(r.id).length:fl.get(r.id).some(x=>x[0]==F.i)))&&(!q||FIELDS.some(([k])=>!HK.has(k)&&String(r[k]||'').toLowerCase().includes(q)))});
const sf=SORT[F.sk]||SORT.unit;R.sort((a,b)=>String(sf(a)).localeCompare(String(sf(b)),'uk',{numeric:true})*F.sd);
const P=100,pages=Math.max(1,Math.ceil(R.length/P));if(F.pg>=pages)F.pg=0;const V=R.slice(F.pg*P,F.pg*P+P);
const units=[...new Set(L.map(r=>r.unit))],th=(k,n)=>`<th onclick="F.sd=F.sk=='${k}'?-F.sd:1;F.sk='${k}';render()">${n}${F.sk==k?(F.sd>0?' ▲':' ▼'):''}</th>`;
const sel=(k,o,all)=>`<select onchange="F.${k}=this.value;F.pg=0;render()"><option value="">${all}</option>${o.map(([v,t])=>`<option value="${esc(v)}" ${F[k]==v?'selected':''}>${esc(t)}</option>`).join('')}</select>`;
let h=`<div class="tools"><input placeholder="Пошук (особа, модель, IP, MAC…)" value="${esc(F.q)}" oninput="F.q=this.value;F.pg=0;clearTimeout(window._t);window._t=setTimeout(()=>{render();const i=document.querySelector('.tools input');i.focus();i.setSelectionRange(99,99)},250)" style="min-width:260px">
${sel('u',units.map(u=>[u,u]),'Усі підрозділи')}${sel('o',[['Linux','Linux'],['Windows','Windows'],['Невідомо','ОС не вказана']],'Будь-яка ОС')}${H('agent')?'':sel('a',[['y','З агентом'],['n','Без агента']],'Агент: усі')}${sel('i',[['*','Є зауваження'],...ISS.filter(issOk).map(x=>[x,x])],'Зауваження: всі')}
<button class="btn" onclick="F={q:'',u:'',o:'',a:'',i:'',sk:'unit',sd:1,pg:0};render()">Скинути</button><div class="sp"></div><button class="btn" onclick="exp()">⇩ CSV</button><button class="btn pr ed-only" onclick="edit()">＋ Додати ПК</button></div>
<div class="mu" style="margin-bottom:8px">Знайдено: ${R.length}</div><div class="tw rg"><table><tr>${th('unit','Підрозділ')}${th('dept','Відділ')}${th('person','Особа / посада')}${th('model','Модель')}${th('type','Тип')}${th('inv','Інв. №')}${th('os','ОС')}${th('ag','Агент')}${th('ip','IP / назва')}<th>Зауваження</th><th class="ed-only"></th></tr>`;
h+=V.map(r=>{const o=osOf(r),f=fl.get(r.id);return`<tr><td>${esc(r.unit)}</td><td class="mu">${esc(r.dept)}</td><td>${esc(r.person)}<div class="mu">${esc(r.pos)}</div></td><td>${esc(r.model).slice(0,70)}<div class="mu">${esc(r.cpu).slice(0,50)} ${r.rel?'· '+esc(r.rel):''}</div></td><td>${esc(r.type)}</td><td class="mono">${esc(r.inv)}</td>
<td><span class="tag ${o=='Linux'?'tg':o=='Windows'?'tb':'to'}">${o}</span><div class="mu">${esc(o=='Linux'?r.ubu:r.win)}</div></td><td>${agOf(r)?`<span class="tag tg">${esc(verOf(r)||'ТАК')}</span>`:'<span class="tag tr">немає</span>'}</td><td class="mono">${esc(r.ip)}<div class="mu">${esc(r.name)}</div></td>
<td>${f.map(x=>`<span class="tag t${x[1]}">${x[0]}</span>`).join('')}${r.note?`<div class="mu nt">${/парол|pass|@#/i.test(r.note)?'🔒 приховано':esc(r.note)}</div>`:''}</td><td class="ed-only" style="white-space:nowrap"><button class="btn" onclick="edit('${esc(r.id)}')">✎</button> <button class="btn dg" onclick="del('${esc(r.id)}')">✕</button></td></tr>`}).join('')||`<tr><td colspan="11" class="empty">Нічого не знайдено</td></tr>`;
h+=`</table></div><div class="pg"><button class="btn" ${F.pg?'':'disabled'} onclick="F.pg--;render()">‹</button>${F.pg+1} / ${pages}<button class="btn" ${F.pg+1<pages?'':'disabled'} onclick="F.pg++;render()">›</button></div>`;return h}
const ISS=['Немає ОС','Немає агента','Немає IP','Немає MAC','Дубль MAC','Дубль IP','Дубль інв. №','Windows 10','На списання','Старе (≤2016)'];
function vIs(L,fl){const m={};fl.forEach(f=>f.forEach(x=>m[x[0]]=(m[x[0]]||0)+1));
return`<div class="chips">${ISS.filter(issOk).map(n=>`<div class="card chip" onclick="F={...F,i:'${n}',pg:0};tab='rg';render()"><span class="mu">${n}</span><b class="${m[n]?(/агента|Дубль M|Дубль IP|списання/.test(n)?'r':'o'):'g'}">${m[n]||0}</b></div>`).join('')}</div><p class="mu">Натисніть на картку, щоб побачити відповідні ПК у реєстрі.</p>`}
function vSt0(){const s=Object.entries(status).filter(([k,v])=>typeof v=='string');
return`<div class="grid two"><div class="card"><h2>Джерело даних</h2><label class="mu">Google-таблиця (посилання або ID)</label><br><input id="sid" style="width:100%;margin:6px 0 12px" value="${esc(cfg.id)}">
<label class="mu">Вхід через Google — OAuth Client ID (найнадійніше для непублічних таблиць)</label><br><input id="scid" style="width:100%;margin:6px 0 8px" placeholder="123456-abc.apps.googleusercontent.com" value="${esc(cfg.cid||'')}"><button class="btn pr" onclick="saveSrc();signIn()" style="margin-bottom:14px">🔑 Увійти через Google</button><br>
<label class="mu">Apps Script URL (рекомендовано, якщо таблиця не публічна)</label><br><input id="sapi" style="width:100%;margin:6px 0 12px" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(cfg.api||'')}">
<label class="mu">Автооновлення</label><br><select id="sev" style="margin:6px 0 12px">${[[0,'Вимкнено'],[30,'30 с'],[60,'1 хв'],[300,'5 хв']].map(([v,t])=>`<option value="${v}" ${cfg.every==v?'selected':''}>${t}</option>`).join('')}</select><br>
<label class="mu" style="display:flex;gap:8px;align-items:center;margin-bottom:12px"><input type="checkbox" id="sin" ${cfg.intro!==false?'checked':''}> Вступна анімація «рій курсорів»</label><button class="btn pr" onclick="saveSrc()">Зберегти й оновити</button>
<p class="mu">Таблиця має бути відкрита «усім, хто має посилання → Читач». Дані читаються наживо, а ваші правки/додавання/видалення тут зберігаються в браузері поверх таблиці.</p>
${s.length?`<div class="warn">Не вдалося прочитати ${s.length} аркуш(ів): ${s.map(x=>esc(x[0])).join('; ')}</div>`:''}</div>
<div class="card"><h2>Резерв і імпорт</h2><p class="mu">Імпорт .xlsx (завантажений із Google Sheets: Файл → Завантажити) — запасний варіант без онлайн-доступу.</p><input type="file" accept=".xlsx,.xls" onchange="importFile(this.files[0])"><br><br>
<button class="btn" onclick="exp()">⇩ Експорт CSV</button> <button class="btn dg" onclick="if(confirm('Скасувати всі локальні зміни?')){ov={edit:{},del:[],add:[]};sv('ov',ov);render()}">Скинути локальні зміни</button>
<p class="mu">Локальних змін: правок ${Object.keys(ov.edit).length}, видалень ${ov.del.length}, додано ${ov.add.length}.</p></div>
<div class="card" style="grid-column:1/-1"><h2>Підрозділи (аркуші)</h2><div class="tw"><table><tr><th>Назва аркуша</th><th>Загін</th><th></th></tr>${cfg.units.map((u,i)=>`<tr><td>${esc(col(u.name))}</td><td><input value="${esc(u.group)}" onchange="cfg.units[${i}].group=this.value;sv('cfg',cfg)"></td><td><button class="btn dg" onclick="cfg.units.splice(${i},1);sv('cfg',cfg);refresh()">✕</button></td></tr>`).join('')}</table></div>
<div class="tools" style="margin-top:10px"><input id="nun" placeholder="Точна назва нового аркуша"><input id="ngr" placeholder="Загін"><button class="btn pr" onclick="addUnit()">＋ Додати підрозділ</button></div></div></div>`}
/* ---------- actions ---------- */
function saveSrc(){const v=$('#sid').value,m=v.match(/\/d\/([\w-]+)/);cfg.id=m?m[1]:v.trim();cfg.every=+$('#sev').value;cfg.api=$('#sapi').value.trim();cfg.cid=$('#scid').value.trim();cfg.intro=$('#sin').checked;sv('cfg',cfg);auto();refresh()}
function addUnit(){const n=$('#nun').value.trim();if(!n)return;cfg.units.push({name:n,group:$('#ngr').value.trim()||'Інше'});sv('cfg',cfg);refresh()}
function edit(id){if(!canEdit())return;const r=id?data().find(x=>x.id==id):{unit:F.u};const d=$('#dlg');
d.innerHTML=`<h2>${id?'Редагування':'Новий ПК'}</h2><datalist id="ul">${cfg.units.map(u=>`<option value="${esc(col(u.name))}">`).join('')}</datalist><div class="fm">${FIELDS.filter(([k])=>!hk().has(k)).map(([k,n])=>`<label class="${k=='note'||k=='model'?'w':''}">${n}<input name="${k}" ${k=='unit'?'list="ul"':''} value="${esc(r[k])}"></label>`).join('')}</div>
<div class="tools" style="margin-top:16px;justify-content:flex-end"><button class="btn" onclick="$('#dlg').close()">Скасувати</button><button class="btn pr" onclick="save('${id||''}')">Зберегти</button></div>`;d.showModal()}
function save(id){const o={};document.querySelectorAll('#dlg input[name]').forEach(i=>o[i.name]=i.value.trim());
const u=cfg.units.find(x=>col(x.name)==o.unit);o.group=u?u.group:'Інше';
if(!id){o.id='n'+Date.now();ov.add.push(o)}else{const i=ov.add.findIndex(x=>x.id==id);if(i>=0)ov.add[i]={...ov.add[i],...o};else ov.edit[id]=o}
sv('ov',ov);$('#dlg').close();render()}
function del(id){if(!canEdit()||!confirm('Видалити запис?'))return;const i=ov.add.findIndex(x=>x.id==id);if(i>=0)ov.add.splice(i,1);else ov.del.push(id);sv('ov',ov);render()}
function exp(){const FF=FIELDS.filter(([k])=>!hk().has(k)),L=data(),q=v=>'"'+String(v??'').replace(/"/g,'""')+'"',hd=[...FF.map(f=>f[1]),'ОС'];
const t='\ufeff'+[hd.map(q).join(','),...L.map(r=>[...FF.map(([k])=>q(r[k])),q(osOf(r))].join(','))].join('\n');
const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv'}));a.download='pc-inventory.csv';a.click()}
/* ---- Swarm intro: рій курсорів «збирає» дашборд ---- */
async function swarm(){
if(window._sw||!document.body.animate)return document.body.classList.remove('sw-pre');
window._sw=1;let ab=false;const B=document.body,T=(x,y)=>`translate(${x}px,${y}px)`,E='cubic-bezier(.5,0,.2,1)',fin=a=>a.finished.catch(()=>{}),wait=ms=>new Promise(r=>setTimeout(r,ms));
const els=[...document.querySelectorAll('header h1,header nav,header .st,header .btn,.lt,.mod')];
els.forEach(e=>e.style.opacity=0);B.classList.remove('sw-pre');
const ov=document.createElement('div');ov.id='sw';ov.innerHTML='<div class="swh">Клік або Esc — пропустити</div>';B.appendChild(ov);
const COL=['#34f5b0','#5ab0ff','#ffb454','#ff6b81','#a78bfa','#f472b6','#facc15'],NM=['Олексій','Марта','Богдан','Софія','Тарас','Іра','Назар'];
const n=Math.min(6,Math.max(2,els.length)),cs=[...Array(n)].map((_,i)=>{const el=document.createElement('div');el.className='swc';
el.innerHTML=`<svg width="22" height="22" viewBox="0 0 24 24"><path d="M3 2l7 19 3-8 8-3z" fill="${COL[i]}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg><b style="background:${COL[i]}">${NM[i]}</b>`;
const side=Math.random()<.5,x=side?-60:innerWidth+40,y=Math.random()*innerHeight;el.style.transform=T(x,y);ov.appendChild(el);return{el,x,y}});
const mv=(c,x,y,d)=>{const mx=(c.x+x)/2+(Math.random()-.5)*160,my=(c.y+y)/2+(Math.random()-.5)*160;const a=c.el.animate([{transform:T(c.x,c.y)},{transform:T(mx,my),offset:.55},{transform:T(x,y)}],{duration:d,easing:'cubic-bezier(.45,.05,.2,1)',fill:'forwards'});c.x=x;c.y=y;return fin(a)};
const done=()=>{ab=true;els.forEach(e=>{e.style.opacity='';e.getAnimations?.().forEach(a=>a.cancel())});ov.remove();removeEventListener('keydown',kd);removeEventListener('pointerdown',ab2,true);B.classList.remove('sw-pre');window._sw=0};
const kd=e=>{if(e.key=='Escape')done()},ab2=()=>done();addEventListener('keydown',kd);setTimeout(()=>addEventListener('pointerdown',ab2,true),400);
const q=els.slice();
const build=async(c,el)=>{const r=el.getBoundingClientRect();
if(r.top>innerHeight-20||!r.width){el.style.opacity=1;el.animate([{opacity:0},{opacity:1}],{duration:450});return}
await mv(c,r.left+4,r.top+4,420+Math.random()*420);if(ab)return;
const d=Math.min(1000,320+(r.width+r.height)*.55);el.style.opacity=1;
const a=el.animate([{clipPath:'inset(0 100% 100% 0)'},{clipPath:'inset(0 0% 0% 0)'}],{duration:d,easing:E});
const ca=c.el.animate([{transform:T(r.left+4,r.top+4)},{transform:T(r.right-8,r.bottom-8)}],{duration:d,easing:E,fill:'forwards'});c.x=r.right-8;c.y=r.bottom-8;
el.querySelectorAll('.kpi .v[data-v]').forEach(v=>{const to=+v.dataset.v;if(isNaN(to))return;const t0=performance.now();(function s(t){const p=Math.min(1,(t-t0)/(d+300)),k=1-Math.pow(1-p,3);v.textContent=Math.round(to*k);if(p<1&&!ab)requestAnimationFrame(s);else v.textContent=to})(t0)});
await Promise.all([fin(a),fin(ca)]);if(ab)return;
el.animate([{boxShadow:'0 0 0 2px #34f5b0aa, 0 0 28px #34f5b055'},{boxShadow:'0 0 0 0 #34f5b000'}],{duration:500})};
const worker=async(c,i)=>{await wait(i*130);while(q.length&&!ab)await build(c,q.shift())};
try{await Promise.all(cs.map(worker));if(!ab){await Promise.all(cs.map(c=>{const x=Math.random()<.5?-80:innerWidth+60;return mv(c,x,Math.random()*innerHeight,800)}));await wait(100)}}finally{done()}}

/* ---- вхід, користувачі, доступ ---- */
const AUTH=CFG0.adminHash||'';
function hh(s){let a=0xdeadbeef,b=0x41c6ce57;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);a=Math.imul(a^c,2654435761);b=Math.imul(b^c,1597334677)}a=Math.imul(a^(a>>>16),2246822507)^Math.imul(b^(b>>>13),3266489909);b=Math.imul(b^(b>>>16),2246822507)^Math.imul(a^(a>>>13),3266489909);return(4294967296*(2097151&b)+(a>>>0)).toString(36)}
function dg(l,p){const s='pcinv|'+l.trim().toLowerCase()+':'+p;let h=s;for(let i=0;i<4000;i++)h=hh(h+'|'+s);return h}
const UT=[['ov','Огляд'],['un','Підрозділи'],['rg','Реєстр'],['is','Проблеми']];
const UH=[['person','Особи та посади'],['inv','Інвентарні номери'],['net','IP, MAC, назви ПК'],['model','Модель, процесор, рік'],['note','Примітки'],['agent','Агент захисту']];
const HG={person:['pos','person','mol'],inv:['inv'],net:['ip','mac','name'],model:['model','cpu','rel','type'],note:['note'],agent:['agent','ver']};
let users=ld('users',null)||[{u:'admin',h:AUTH,admin:true,perms:{tabs:['ov','un','rg','is'],hide:[],edit:true}}],me=null;
const saveU=()=>sv('users',users),canEdit=()=>me.admin||me.perms.edit,H=g=>!me.admin&&me.perms.hide.includes(g),hk=()=>new Set(UH.flatMap(([g])=>H(g)?HG[g]:[])),allowedTab=t=>tabVis(t[0])&&(t[0]=='st'||me.admin||me.perms.tabs.includes(t[0]));
const issOk=n=>!(H('agent')&&n=='Немає агента')&&!(H('net')&&/IP|MAC/.test(n))&&!(H('inv')&&/інв/.test(n));
function applyPerms(){UH.forEach(([g])=>document.body.classList.toggle('h-'+g,H(g)));document.body.classList.toggle('noedit',!canEdit())}
const tokStore=rem=>(rem?localStorage:sessionStorage).setItem('pcinv.auth',JSON.stringify({u:me.u,h:me.h}));
function authed(){try{const raw=sessionStorage.getItem('pcinv.auth')||localStorage.getItem('pcinv.auth');if(!raw)return false;let t;try{t=JSON.parse(raw)}catch(e){t=raw===AUTH?{u:'admin',h:AUTH}:null}const x=t&&users.find(y=>y.u==t.u&&y.h==t.h);if(x){me=x;return true}}catch(e){}return false}
function logout(){try{sessionStorage.removeItem('pcinv.auth');localStorage.removeItem('pcinv.auth')}catch(e){}location.reload()}
function login(ok){const o=document.createElement('div');o.id='lg';
o.innerHTML=`<i class="bl b1"></i><i class="bl b2"></i><i class="bl b3"></i>${[...Array(22)].map(()=>`<b class="pt" style="--x:${Math.random()*100}%;--s:${2+Math.random()*4}px;--d:${7+Math.random()*9}s;--dl:${-Math.random()*12}s"></b>`).join('')}
<form class="lgc"><div class="lgl" style="--i:0"></div><h2 class="lgt">${[...'Облік ПК'].map((c,k)=>`<span style="--k:${k}">${c==' '?'&nbsp;':c}</span>`).join('')}</h2><p style="--i:2">Вхід до системи</p><label style="--i:3">Логін<input id="lgu" autocomplete="username"></label><label style="--i:4">Пароль<span class="pw"><input id="lgp" type="password" autocomplete="current-password"><button type="button" id="lgt">показати</button></span></label><label class="rm" style="--i:5"><input type="checkbox" id="lgr"> Запам'ятати на цьому пристрої</label><div class="lge" id="lge" style="--i:5"></div><button class="btn pr" id="lgb" style="--i:6">Увійти</button></form>`;
document.body.appendChild(o);const f=o.querySelector('form'),u=$('#lgu'),p=$('#lgp'),e=$('#lge'),b=$('#lgb');let bad=0,lock=0,busy=0;setTimeout(()=>u.focus(),900);
$('#lgt').onclick=()=>{p.type=p.type=='password'?'text':'password';$('#lgt').textContent=p.type=='password'?'показати':'сховати'};
f.onsubmit=ev=>{ev.preventDefault();if(busy)return;if(Date.now()<lock){e.textContent='Зачекайте '+Math.ceil((lock-Date.now())/1000)+' с';return}
busy=1;b.classList.add('ld');b.textContent='Перевірка…';
setTimeout(()=>{busy=0;b.classList.remove('ld');b.textContent='Увійти';const x=users.find(y=>y.u==u.value.trim().toLowerCase());
if(x&&dg(u.value,p.value)===x.h){me=x;try{tokStore($('#lgr').checked)}catch(z){}f.classList.add('okk');o.classList.add('out');setTimeout(()=>o.remove(),800);document.body.classList.remove('lock');ok()}
else{bad++;e.textContent=bad>=5?'Забагато спроб. Зачекайте 30 с.':'Невірний логін або пароль';if(bad>=5){lock=Date.now()+30000;bad=0}f.classList.remove('shake');void f.offsetWidth;f.classList.add('shake');p.value='';p.focus()}},450)}}
/* вкладки: перейменування, приховування, порядок */
const DT=[['ov','Огляд'],['un','Підрозділи'],['rg','Реєстр'],['is','Проблеми'],['st','Налаштування']];
const TC=()=>cfg.tabcfg||(cfg.tabcfg={names:{},hidden:[],order:[]});
const tn=k=>TC().names[k]||DT.find(t=>t[0]==k)[1],tabVis=k=>k=='st'||!TC().hidden.includes(k);
const tabOrder=()=>{const o=TC().order.filter(k=>DT.some(t=>t[0]==k));DT.forEach(t=>{if(!o.includes(t[0]))o.push(t[0])});return o};
const tabList=()=>tabOrder().filter(tabVis).map(k=>[k,tn(k)]),UTn=()=>UT.map(([k])=>[k,tn(k)]);
function tabName(k,v){v=v.trim();if(v)TC().names[k]=v;else delete TC().names[k];sv('cfg',cfg);render()}
function tabShow(k,b){const h=TC().hidden.filter(x=>x!=k);if(!b)h.push(k);TC().hidden=h;sv('cfg',cfg);render()}
function tabMove(i,d){const o=tabOrder(),j=i+d;if(j<0||j>=o.length)return;[o[i],o[j]]=[o[j],o[i]];TC().order=o;sv('cfg',cfg);render()}
function tabReset(){delete cfg.tabcfg;sv('cfg',cfg);render()}
function tabsCard(){const o=tabOrder();return`<div class="card" style="grid-column:1/-1"><h2>Вкладки</h2><div class="tw"><table><tr><th>Назва</th><th>Показувати</th><th>Порядок</th></tr>${o.map((k,i)=>`<tr><td><input value="${esc(tn(k))}" onchange="tabName('${k}',this.value)"></td><td>${k=='st'?'<span class="mu">завжди</span>':`<label class="ck"><input type="checkbox" ${tabVis(k)?'checked':''} onchange="tabShow('${k}',this.checked)"> показувати</label>`}</td><td style="white-space:nowrap"><button class="btn" ${i?'':'disabled'} onclick="tabMove(${i},-1)">↑</button> <button class="btn" ${i<o.length-1?'':'disabled'} onclick="tabMove(${i},1)">↓</button></td></tr>`).join('')}</table></div><div class="tools" style="margin-top:10px"><button class="btn dg" onclick="tabReset()">Скинути вкладки</button><span class="mu">Прихована вкладка зникає з меню; повернути її можна тут. Порожня назва повертає стандартну.</span></div></div>`}
/* settings: profile + users */
function profCard(){return`<div class="card"><h2>Мій профіль</h2><p>Користувач: <b>${esc(me.u)}</b> · ${me.admin?'адміністратор':'користувач'}</p><div class="fm"><label>Поточний пароль<input id="po" type="password" autocomplete="current-password"></label><label>Новий пароль<input id="pn" type="password" autocomplete="new-password"></label><label>Повторіть новий пароль<input id="pr" type="password" autocomplete="new-password"></label></div><p id="pwm" class="mu"></p><button class="btn pr" onclick="chPw()">Змінити пароль</button></div>`}
function usrCard(){const nm=(a,L)=>a.map(k=>L.find(t=>t[0]==k)?.[1]).filter(Boolean).join(', ')||'—';return`<div class="card" style="grid-column:1/-1"><h2>Користувачі та доступ</h2><div class="tw"><table><tr><th>Логін</th><th>Роль</th><th>Вкладки</th><th>Приховано</th><th>Редагування</th><th></th></tr>${users.map((x,i)=>`<tr><td>${esc(x.u)}</td><td>${x.admin?'<span class="tag tg">адмін</span>':'<span class="tag tm">користувач</span>'}</td><td class="mu">${x.admin?'усі':nm(x.perms.tabs,UTn())}</td><td class="mu">${x.admin?'—':nm(x.perms.hide,UH)}</td><td>${x.admin||x.perms.edit?'так':'ні'}</td><td style="white-space:nowrap"><button class="btn" onclick="userDlg(${i})">✎</button> ${x===me?'':`<button class="btn dg" onclick="delUser(${i})">✕</button>`}</td></tr>`).join('')}</table></div><div class="tools" style="margin-top:10px"><button class="btn pr" onclick="userDlg()">＋ Додати користувача</button></div></div>`}
function vSt(){if(!me.admin)return`<div class="grid two">${profCard()}</div>`;const h=vSt0(),i=h.lastIndexOf('</div>');return(h.slice(0,i)+tabsCard()+usrCard()+h.slice(i)).replace('<div class="grid two">','<div class="grid two">'+profCard())}
function chPw(){const m=$('#pwm'),o=$('#po').value,n=$('#pn').value,r=$('#pr').value,er=t=>{m.textContent=t;m.style.color='var(--r)'};
if(dg(me.u,o)!==me.h)return er('Невірний поточний пароль');if(n.length<6)return er('Новий пароль: щонайменше 6 символів');if(n!==r)return er('Паролі не збігаються');
me.h=dg(me.u,n);saveU();tokStore(localStorage.getItem('pcinv.auth')!=null);m.textContent='Пароль змінено ✓';m.style.color='var(--g)';['#po','#pn','#pr'].forEach(s=>$(s).value='')}
function userDlg(i){const x=i==null?{u:'',admin:false,perms:{tabs:['ov','un','rg'],hide:['net','note'],edit:false}}:users[i],d=$('#dlg');
d.innerHTML=`<h2>${i==null?'Новий користувач':'Користувач: '+esc(x.u)}</h2><div class="fm"><label>Логін<input id="uu" value="${esc(x.u)}" ${i==null?'':'disabled'}></label><label>${i==null?'Пароль':'Новий пароль (порожньо — без змін)'}<input id="up" type="password" autocomplete="new-password"></label>
<label class="ck w"><input type="checkbox" id="ua" ${x.admin?'checked':''}> Адміністратор (повний доступ, без обмежень)</label>
<div class="w"><div class="mu">Доступні вкладки</div>${UTn().map(([k,n])=>`<label class="ck"><input type="checkbox" class="ut" value="${k}" ${x.perms.tabs.includes(k)?'checked':''}> ${n}</label>`).join('')}</div>
<div class="w"><div class="mu">Приховати інформацію</div>${UH.map(([k,n])=>`<label class="ck"><input type="checkbox" class="uh" value="${k}" ${x.perms.hide.includes(k)?'checked':''}> ${n}</label>`).join('')}</div>
<label class="ck w"><input type="checkbox" id="ue" ${x.perms.edit?'checked':''}> Може додавати, редагувати й видаляти записи</label></div><div class="lge" id="ume"></div>
<div class="tools" style="margin-top:12px;justify-content:flex-end"><button class="btn" onclick="$('#dlg').close()">Скасувати</button><button class="btn pr" onclick="saveUser(${i==null?'null':i})">Зберегти</button></div>`;d.showModal()}
function saveUser(i){const lg=$('#uu').value.trim().toLowerCase(),pw=$('#up').value,adm=$('#ua').checked,e=$('#ume'),er=t=>{e.textContent=t},
perms={tabs:[...document.querySelectorAll('#dlg .ut:checked')].map(x=>x.value),hide:[...document.querySelectorAll('#dlg .uh:checked')].map(x=>x.value),edit:$('#ue').checked};
if(i==null){if(!/^[a-z0-9_.-]{3,}$/i.test(lg))return er('Логін: щонайменше 3 символи (літери, цифри, _ . -)');if(users.some(x=>x.u==lg))return er('Такий логін уже є');if(pw.length<6)return er('Пароль: щонайменше 6 символів');users.push({u:lg,h:dg(lg,pw),admin:adm,perms})}
else{const x=users[i];if(!adm&&x.admin&&users.filter(y=>y.admin).length<2)return er('Має лишитися хоча б один адміністратор');if(pw){if(pw.length<6)return er('Пароль: щонайменше 6 символів');x.h=dg(x.u,pw)}x.admin=adm;x.perms=perms;if(x===me)tokStore(localStorage.getItem('pcinv.auth')!=null)}
saveU();$('#dlg').close();applyPerms();render()}
function delUser(i){const x=users[i];if(x===me||(x.admin&&users.filter(y=>y.admin).length<2))return;if(confirm('Видалити користувача '+x.u+'?')){users.splice(i,1);saveU();render()}}
function start(){applyPerms();const lb=document.querySelector('header button[onclick="logout()"]');lb.textContent='⎋ '+me.u;lb.title='Вийти';if(cfg.intro!==false&&document.body.animate){document.body.classList.add('sw-pre');render();refresh().finally(()=>swarm());setTimeout(()=>{if(!window._sw)document.body.classList.remove('sw-pre')},8000)}else{render();refresh()}auto();}
if(authed()){document.body.classList.remove('lock');start()}else login(start);
