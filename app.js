const $=s=>document.querySelector(s);
const W=solanaWeb3;
const LS={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
let pubkey=null;
const rpc=()=>LS.get('rpc','')||'https://api.mainnet-beta.solana.com';
const conn=()=>new W.Connection(rpc(),'confirmed');
const provider=()=>window.phantom?.solana??window.solana;

document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('main section').forEach(s=>s.classList.toggle('hide',s.id!==b.dataset.p));
  if(b.dataset.p==='portfolio')loadPortfolio();
});

async function refresh(){
  if(!pubkey)return;
  try{
    const sol=(await conn().getBalance(pubkey))/W.LAMPORTS_PER_SOL;
    $('#bal').textContent=sol.toFixed(4)+' SOL';$('#d-bal').textContent=sol.toFixed(4);
  }catch(e){console.error('RPC',e);$('#bal').textContent='RPC ошибка'}
}
function renderHist(){
  const h=LS.get('hist',[]);
  $('#d-cnt').textContent=h.length;
  $('#d-spent').textContent=h.reduce((a,x)=>a+Number(x.amount||0),0).toFixed(3);
  $('#empty').classList.toggle('hide',h.length>0);
  const short=s=>s.slice(0,4)+'…'+s.slice(-4);
  $('#hist').innerHTML=h.slice().reverse().map(x=>`<tr><td>${esc(x.symbol)}</td><td><a target="_blank" rel="noopener" href="https://pump.fun/coin/${x.mint}">${short(x.mint)}</a></td><td>${x.amount}</td><td><a target="_blank" rel="noopener" href="https://solscan.io/tx/${x.sig}">${short(x.sig)}</a></td><td>${new Date(x.t).toLocaleString('ru')}</td></tr>`).join('');
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function setWallet(pk){
  pubkey=pk;
  const a=pk.toBase58();
  $('#connect').textContent=a.slice(0,4)+'…'+a.slice(-4);
  refresh();
  if(!$('#portfolio').classList.contains('hide'))loadPortfolio();
}
$('#connect').onclick=async()=>{
  const p=provider();
  if(!p?.isPhantom){window.open('https://phantom.app','_blank');return}
  try{setWallet((await p.connect()).publicKey)}catch{}
};
$('#rpc').value=LS.get('rpc','');
$('#save').onclick=async()=>{
  const v=$('#rpc').value.trim(),m=$('#rpcmsg');
  if(v&&!/^https:\/\//.test(v)){m.className='err';m.textContent='Ссылка должна начинаться с https://';return}
  LS.set('rpc',v);
  m.className='';m.textContent='Проверяю…';
  try{
    await conn().getLatestBlockhash();
    m.className='ok';m.textContent='Сохранено, RPC работает';
  }catch(e){
    m.className='err';m.textContent='RPC не отвечает ('+(e.message||e)+'). Проверь ссылку и правила CSP в vercel.json.';
  }
  refresh();
};

const log=(m,c='')=>{$('#log').innerHTML=`<span class="${c}">${m}</span>`};

/* ===== Выбор лаунчпада ===== */
// status: ready — запуск реализован; soon — скоро; off — недоступно
const LAUNCHPADS=[
  {id:'pump',name:'Pump.fun',ico:'P',c:'#4ade80',status:'ready',pool:'pump',coin:'https://pump.fun/coin/',
   desc:'Создание токена на bonding curve и покупка создателем в одной транзакции.'},
  {id:'paid',name:'Paid',ico:'$',c:'#4ade80',status:'soon',desc:'Комиссии создателя направляются в Paid для аккаунта X.'},
  {id:'raydium',name:'Raydium CPMM',ico:'R',c:'#a78bfa',status:'soon',desc:'Свой токен и пул Raydium, открытый кошельком владельца.'},
  {id:'stonk',name:'StonkFun',ico:'S',c:'#60a5fa',status:'soon',desc:'Пара с акциями вроде NVIDIA и Tesla. Dev buy нельзя снайпить.'},
  {id:'meteora',name:'Meteora',ico:'M',c:'#f87171',status:'off',desc:'Meteora DBC требует свой chain RPC и адаптер запуска.'},
  {id:'bonk',name:'bonk.fun',ico:'B',c:'#fbbf24',status:'soon',desc:'Запуски bonk.fun ещё не включены.'}
];
let lp=null;
const TAGS={soon:'Скоро',off:'Недоступно'};
function renderLP(){
  $('#lp-list').innerHTML=LAUNCHPADS.map(x=>`<div class="lp-row${x.status==='ready'?'':' off'}" data-id="${x.id}">
    <div class="lp-ico" style="color:${x.c}">${esc(x.ico)}</div>
    <div class="lp-txt"><b>${esc(x.name)}${TAGS[x.status]?`<span class="lp-tag">${TAGS[x.status]}</span>`:''}</b><small>${esc(x.desc)}</small></div>
    ${x.status==='ready'?'<span class="lp-arr">›</span>':''}</div>`).join('');
}
function showLP(id){
  lp=LAUNCHPADS.find(x=>x.id===id)||null;
  $('#lp-pick').classList.toggle('hide',!!lp);
  $('#lp-form').classList.toggle('hide',!lp);
  if(lp){$('#lp-cur').textContent=lp.name.toUpperCase();$('#lp-sub').textContent='Один кошелёк: создание токена на '+lp.name+' и покупка создателем';$('#log').innerHTML=''}
}
$('#lp-list').onclick=e=>{const r=e.target.closest('.lp-row');if(!r||r.classList.contains('off'))return;showLP(r.dataset.id)};
$('#lp-back').onclick=()=>showLP(null);
renderLP();

/* ===== Base58 ===== */
const B58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58enc(u8){const d=[0];for(const b of u8){let c=b;for(let j=0;j<d.length;j++){c+=d[j]<<8;d[j]=c%58;c=(c/58)|0}while(c){d.push(c%58);c=(c/58)|0}}let s='';for(const b of u8){if(b)break;s+='1'}for(let i=d.length-1;i>=0;i--)s+=B58[d[i]];return s}
function b58dec(s){const b=[0];for(const ch of s){const v=B58.indexOf(ch);if(v<0)throw new Error('Неверный base58');let c=v;for(let j=0;j<b.length;j++){c+=b[j]*58;b[j]=c&255;c>>=8}while(c){b.push(c&255);c>>=8}}for(const ch of s){if(ch!=='1')break;b.push(0)}return new Uint8Array(b.reverse())}

/* ===== Режимы покупки ===== */
const MODES=[
  {id:'dev',ico:'●',name:'Только покупка дева',desc:'Покупает только dev-кошелёк.',ok:true},
  {id:'b0',ico:'▣',name:'Покупка в 0 блоке',desc:'DEV и выбранные кошельки покупают в блоке запуска. Трекеры могут показать их как бандл.',ok:true},
  {id:'snipe',ico:'⌖',name:'Снайперские покупки',tag:'Покупки с интервалом',desc:'DEV запускает монету, затем каждый снайперский кошелёк покупает сам, с интервалом из диапазона задержки.',ok:true},
  {id:'b0snipe',ico:'➶',name:'Покупка в 0 блоке + снайперские покупки',desc:'DEV и кошельки 0 блока входят в блоке запуска, затем снайперские кошельки покупают по одному (нужен Jito bundle).',ok:false}
];
let mode='dev';
function renderModes(){
  $('#modes').innerHTML=MODES.map(m=>`<div class="md${m.id===mode?' on':''}${m.ok?'':' off'}" data-id="${m.id}">
    <div class="ico">${m.ico}</div>
    <div class="t"><b>${esc(m.name)}${m.tag?`<span class="lp-tag">${esc(m.tag)}</span>`:''}${m.ok?'':'<span class="lp-tag">Скоро</span>'}</b><small>${esc(m.desc)}</small></div>
    <div class="rd"></div></div>`).join('');
  $('#snp').style.display=mode==='snipe'?'grid':'none';
  renderB0();
}
$('#modes').onclick=e=>{const d=e.target.closest('.md');if(!d||d.classList.contains('off'))return;mode=d.dataset.id;renderModes()};

/* ===== Кошельки ===== */
const wallets=()=>LS.get('wallets',[]);
const saveW=a=>LS.set('wallets',a);
const kpOf=w=>W.Keypair.fromSecretKey(b58dec(w.sk));
const shortA=s=>s.slice(0,4)+'…'+s.slice(-4);
const wbal={};
const MAXW=200;
function addW(kp,role){
  const a=wallets(),pk=kp.publicKey.toBase58();
  if(a.some(x=>x.pk===pk))return false;
  const n=LS.get('wseq',0)+1;LS.set('wseq',n);
  a.push({pk,sk:b58enc(kp.secretKey),role,sel:true,name:'Wallet '+n});saveW(a);return true;
}
function renderW(){
  const a=wallets(),n=a.filter(x=>x.sel).length;
  $('#w-cnt').textContent='Кошельки ('+a.length+')';
  $('#w-sel').textContent=n+' выбрано';
  $('#w-exp').disabled=!n;
  $('#wlist').innerHTML=a.length?a.map((w,i)=>[w,i]).sort((p,q)=>(q[0].role==='dev')-(p[0].role==='dev')).map(([w,i])=>`<div class="wcard${w.sel?' on':''}">
    <input type="checkbox" data-i="${i}" ${w.sel?'checked':''}>
    <span class="lp-tag" style="color:var(--acc)">${w.role==='dev'?'DEV':'BUNDLE'}</span>
    <div class="i"><div class="nm">${esc(w.name||'Wallet '+(i+1))}</div>
      <div class="ad">${shortA(w.pk)} <button class="ic" type="button" data-copy="${w.pk}" title="Копировать адрес">⧉</button></div>
      <div class="bl">◎ ${wbal[w.pk]==null?'—':wbal[w.pk].toFixed(4)} SOL</div></div>
    ${w.role==='dev'?'':`<button class="ic mk" type="button" data-mk="${i}">➶ Сделать <b>DEV</b></button>`}
    <button class="ic" type="button" data-del="${i}" title="Удалить">🗑</button></div>`).join('')
    :'<div class="wempty">Кошельки пока не добавлены<br><small>Нажми «+ DEV» или «Создать», чтобы добавить кошельки</small></div>';
  const ns=a.filter(x=>x.role==='sniper').length;
  $('#usemax').textContent='из '+ns+' (выбрано '+a.filter(x=>x.role==='sniper'&&x.sel).length+')';
  $('#usen').max=ns;
  $('#gfree').textContent=(MAXW-a.length)+' свободно (макс. 25 за раз)';
  if(typeof renderB0==='function'&&typeof B0!=='undefined')renderB0();
}
$('#wlist').onclick=e=>{
  const a=wallets(),t=e.target;
  if(t.matches('input[data-i]')){a[t.dataset.i].sel=t.checked;
    if(t.checked&&a[t.dataset.i].role==='dev')a.forEach((x,j)=>{if(x.role==='dev'&&j!=t.dataset.i)x.sel=false});
    saveW(a);renderW()}
  else if(t.closest('[data-mk]')){
    const i=t.closest('[data-mk]').dataset.mk;
    a.forEach(x=>{if(x.role==='dev'){x.role='sniper';x.sel=false}});
    a[i].role='dev';a[i].sel=true;saveW(a);renderW()}
  else if(t.dataset.copy){navigator.clipboard?.writeText(t.dataset.copy)}
  else if(t.dataset.del!==undefined){
    if(!confirm('Удалить кошелёк из браузера? Если ключ не сохранён отдельно, доступ к нему будет потерян.'))return;
    a.splice(t.dataset.del,1);saveW(a);renderW()}
};
$('#w-dev').onclick=()=>{
  const a=wallets();a.forEach(x=>{if(x.role==='dev')x.sel=false});saveW(a);
  addW(W.Keypair.generate(),'dev');renderW();
};
$('#usego').onclick=()=>{
  const a=wallets(),sn=a.filter(x=>x.role==='sniper');
  const n=Math.max(0,Math.min(sn.length,parseInt($('#usen').value,10)||0));
  const pick=$('#userand').checked?sn.slice().sort(()=>Math.random()-.5).slice(0,n):sn.slice(0,n);
  sn.forEach(x=>x.sel=pick.includes(x));
  saveW(a);renderW();
};
const gnum=()=>Math.max(1,Math.min(25,parseInt($('#gn').value,10)||1));
const gsync=()=>{$('#gn').value=gnum();$('#ggo').textContent='Сгенерировать кошельки ('+gnum()+')'};
$('#w-new').onclick=()=>$('#gen').classList.toggle('hide');
$('#gminus').onclick=()=>{$('#gn').value=gnum()-1;gsync()};
$('#gplus').onclick=()=>{$('#gn').value=gnum()+1;gsync()};
$('#gn').oninput=gsync;
$('#ggo').onclick=()=>{
  const n=Math.min(gnum(),MAXW-wallets().length);
  if(n<=0)return alert('Лимит кошельков: '+MAXW);
  for(let i=0;i<n;i++)addW(W.Keypair.generate(),'sniper');
  renderW();
};
$('#w-bal').onclick=async()=>{
  const a=wallets();
  await Promise.all(a.map(async w=>{try{wbal[w.pk]=(await conn().getBalance(new W.PublicKey(w.pk)))/W.LAMPORTS_PER_SOL}catch{}}));
  renderW();
};
$('#w-imp').onclick=()=>{
  const t=prompt('Приватные ключи (base58), по одному в строке. Префикс "dev:" — импорт как DEV-кошелёк.');
  if(!t)return;
  let ok=0,bad=0;
  for(const line of t.split(/\s*\n\s*|\s+/).filter(Boolean)){
    try{
      const dev=line.startsWith('dev:'),s=dev?line.slice(4):line;
      if(addW(W.Keypair.fromSecretKey(b58dec(s)),dev?'dev':'sniper'))ok++;
    }catch{bad++}
  }
  renderW();alert('Импортировано: '+ok+(bad?', ошибок: '+bad:''));
};
$('#w-exp').onclick=()=>{
  const a=wallets().filter(x=>x.sel);if(!a.length)return;
  const blob=new Blob([JSON.stringify(a.map(x=>({address:x.pk,privateKey:x.sk,role:x.role})),null,2)],{type:'application/json'});
  const l=document.createElement('a');l.href=URL.createObjectURL(blob);l.download='wallets.json';l.click();
  setTimeout(()=>URL.revokeObjectURL(l.href),5000);
};
$('#w-fund').onclick=async()=>{
  try{
    if(!pubkey)throw new Error('Подключи Phantom');
    const t=wallets().filter(x=>x.sel);if(!t.length)throw new Error('Выбери кошельки');
    const amt=Number(prompt('Сколько SOL отправить на каждый выбранный кошелёк?','0.05'));
    if(!(amt>0))return;
    const tx=new W.Transaction();
    for(const w of t)tx.add(W.SystemProgram.transfer({fromPubkey:pubkey,toPubkey:new W.PublicKey(w.pk),lamports:Math.round(amt*W.LAMPORTS_PER_SOL)}));
    tx.feePayer=pubkey;tx.recentBlockhash=(await conn().getLatestBlockhash()).blockhash;
    const {signature}=await provider().signAndSendTransaction(tx);
    alert('Отправлено: '+signature);
    setTimeout(()=>$('#w-bal').click(),4000);
  }catch(e){alert(e.message||e)}
};

/* ===== Пресеты ===== */
const presets=()=>LS.get('presets',[]);
function renderP(){
  const p=presets(),has=p.length>0;
  $('#pempty').classList.toggle('hide',has);
  $('#pset').classList.toggle('hide',!has);
  $('#pdel').classList.toggle('hide',!has);
  $('#papply').disabled=!has;
  $('#pset').innerHTML=p.map((x,i)=>`<option value="${i}">${esc(x.name)}</option>`).join('');
}
const PF=['amount','slippage','fee','snAmt','snMin','snMax'];
$('#psave').onclick=()=>{
  const name=(prompt('Название пресета')||'').trim();if(!name)return;
  const f=$('#f');
  const v={};PF.forEach(k=>v[k]=f.elements[k].value);
  const p=presets().filter(x=>x.name!==name);
  p.push({name,mode,b0:JSON.parse(JSON.stringify(B0)),v,sel:wallets().filter(x=>x.sel).map(x=>x.pk)});
  LS.set('presets',p);renderP();$('#pset').value=String(p.length-1);
};
$('#papply').onclick=()=>{
  const x=presets()[$('#pset').value];if(!x)return;
  const f=$('#f');PF.forEach(k=>{if(x.v[k]!=null)f.elements[k].value=x.v[k]});
  if(x.b0){B0={...B0D,...x.b0};saveB0()}
  mode=MODES.find(m=>m.id===x.mode&&m.ok)?x.mode:'dev';renderModes();
  const a=wallets();a.forEach(w=>w.sel=x.sel.includes(w.pk));saveW(a);renderW();
};
$('#pdel').onclick=()=>{
  const p=presets();p.splice($('#pset').value,1);LS.set('presets',p);renderP();
};
/* ===== Покупка в 0 блоке ===== */
const WFEE=0.0025,MINW=0.0225;
const B0D={total:'',dev:'',spread:false,dist:'equal',amts:{},slip:1,tip:0.001,gfOn:false,gf:0.5,tab:'farm',
  farmOn:false,farmVol:'',smartOn:false,smartPct:50,tpOn:false,tpX:2,tpPct:100,rep:1};
let B0={...B0D,...LS.get('b0',{})};
const saveB0=()=>LS.set('b0',B0);
const bw=()=>wallets().filter(x=>x.sel&&x.role==='sniper');
const devSel=()=>wallets().find(x=>x.sel&&x.role==='dev');
const r4=v=>Math.max(0,Math.floor(v*1e4)/1e4);
function b0amts(){
  const ws=bw();
  if(B0.dist==='custom')return ws.map(w=>Number(B0.amts[w.pk])||0);
  const each=ws.length?Math.max(0,((Number(B0.total)||0)-ws.length*WFEE)/ws.length):0;
  return ws.map(()=>each);
}
const sw=(k,on)=>`<span class="sw${on?' on':''}" data-sw="${k}"></span>`;
const q=t=>`<span class="q" title="${esc(t)}">?</span>`;
function renderB0(){
  const box=$('#b0'),on=mode==='b0';
  box.classList.toggle('hide',!on);
  document.querySelectorAll('.nb0').forEach(e=>e.style.display=on?'none':'');
  if(!on)return;
  const ws=bw(),dv=devSel(),eq=B0.dist==='equal';
  const tabs=[['farm','Farm Snipers'],['smart','Умная продажа'],['tp','Авто TP'],['rep','Повторить']];
  const tabBody={
    farm:`<div class="opt"><div><b>Farm Snipers</b> ${q('Продать всё, когда внешние покупки в сумме достигнут заданного объёма')}<small>Продать всё, когда внешние покупки в сумме достигнут заданного объёма</small></div>${sw('farmOn',B0.farmOn)}</div>
      <label ${B0.farmOn?'':'class="dis"'}>Объём внешних покупок, SOL<input data-f="farmVol" type="number" min="0" step="0.1" value="${esc(B0.farmVol)}" ${B0.farmOn?'':'disabled'}></label>`,
    smart:`<div class="opt"><div><b>Умная продажа</b><small>Продавать долю позиции с кошельков бандла по мере роста цены</small></div>${sw('smartOn',B0.smartOn)}</div>
      <label ${B0.smartOn?'':'class="dis"'}>Доля за шаг, %<input data-f="smartPct" type="number" min="1" max="100" value="${esc(B0.smartPct)}" ${B0.smartOn?'':'disabled'}></label>`,
    tp:`<div class="opt"><div><b>Авто TP</b><small>Продать часть позиции при достижении множителя от цены входа</small></div>${sw('tpOn',B0.tpOn)}</div>
      <div class="row"><label ${B0.tpOn?'':'class="dis"'}>Множитель, ×<input data-f="tpX" type="number" min="1" step="0.1" value="${esc(B0.tpX)}" ${B0.tpOn?'':'disabled'}></label>
      <label ${B0.tpOn?'':'class="dis"'}>Продать, %<input data-f="tpPct" type="number" min="1" max="100" value="${esc(B0.tpPct)}" ${B0.tpOn?'':'disabled'}></label></div>`,
    rep:`<label>Повторить запуск, раз<input data-f="rep" type="number" min="1" max="10" value="${esc(B0.rep)}"></label>`
  };
  box.innerHTML=`
  <div class="b0h">Настройки покупки в 0 блоке ${q('DEV создаёт токен, кошельки бандла покупают в том же блоке через Jito bundle')}</div>
  <div class="b0box"><span>Выбранные кошельки</span><b class="gold">${ws.length+(dv?1:0)} шт. (${dv?1:0} DEV + ${ws.length} в бандле)</b></div>
  <div class="b0grid">
    <div><div class="b0l">Всего <b>SOL</b> для распределения ${q('Сумма делится поровну между кошельками бандла за вычетом резерва на комиссии')}</div>
      <input data-f="total" type="number" min="0" step="0.001" value="${esc(B0.total)}" placeholder="0" ${eq?'':'disabled'}>
      <small id="h-total"></small></div>
    <div><div class="b0l">Бюджет <b>DEV</b> (SOL) ${q('Сколько SOL DEV тратит на покупку при создании токена')}</div>
      <input data-f="dev" type="number" min="0" step="0.001" value="${esc(B0.dev)}" placeholder="Введите сумму">
      <small id="h-dev"></small></div>
  </div>
  <div class="opt"><div>Разнести покупки <b>0 блока</b><small>Случайно меняет каждую сумму на ±15%, чтобы покупки не выглядели одинаковыми</small></div>${sw('spread',B0.spread)}</div>
  <div class="b0l" style="margin-top:16px">Распределение ${q('Поровну — из общей суммы. Кастом — своя сумма для каждого кошелька')}</div>
  <div class="row seg"><button class="btn ${eq?'':'ghost'}" type="button" data-dist="equal" style="flex:1">Поровну</button><button class="btn ${eq?'ghost':''}" type="button" data-dist="custom" style="flex:1">Кастом</button></div>
  <div class="card" style="margin:16px 0">
    <div style="display:flex;gap:16px;justify-content:space-between;flex-wrap:wrap">
      <div><b>% баланса бандла</b><small class="mut">Применить процент от баланса каждого кошелька бандла перед запуском.</small></div>
      <div class="row" style="gap:8px;flex:none">${[90,95,100].map(p=>`<button class="btn ghost" type="button" data-pct="${p}" style="padding:8px 16px">${p}%</button>`).join('')}</div>
    </div>
    <div class="row" style="align-items:center;margin-top:16px;gap:16px"><input id="pctin" type="number" min="1" max="100" value="95" style="width:96px"> <span>%</span><button class="btn" type="button" data-apply="1" style="padding:12px 24px">Применить</button><small class="mut">Пропускает кошельки с балансом ниже ${MINW} SOL.</small></div>
  </div>
  <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px"><b>Кошельки (${ws.length})</b><div class="row" style="gap:16px;flex:none;align-items:center"><button class="btn ghost" type="button" data-maxall="1" style="padding:4px 16px;font-size:12px">МАКС ВСЕМ</button><small class="mut" id="h-sum"></small></div></div>
  <div class="wlist" style="max-height:360px">${ws.length?ws.map((w,i)=>`<div class="wcard on"><span class="lp-tag">BUNDLE</span>
    <div class="i"><div class="nm">${esc(w.name||'Wallet')}</div><div class="ad">${shortA(w.pk)}</div><div class="bl">◎ ${wbal[w.pk]==null?'—':wbal[w.pk].toFixed(4)} SOL на балансе</div></div>
    <button class="ic mk" type="button" data-max="${w.pk}" ${eq?'disabled':''}>МАКС</button>
    <input data-amt="${w.pk}" type="number" min="0" step="0.0001" style="width:128px" value="${eq?'':esc(B0.amts[w.pk]??'')}" ${eq?'disabled':''}></div>`).join(''):'<div class="wempty">Выбери BUNDLE-кошельки в списке выше</div>'}</div>
  <div class="b0sep"></div>
  <div class="b0t">Общие параметры</div>
  <div class="b0grid">
    <div><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span class="b0l">Проскальзывание (%) ${q('Максимальное отклонение цены при покупке')}</span><b class="gold" id="v-slip">${B0.slip}%</b></div>
      <input data-f="slip" type="range" min="1" max="50" step="1" value="${B0.slip}" style="padding:0;width:100%;accent-color:var(--gold)"></div>
    <div><div class="b0l">Чаевые Jito (SOL) ${q('Чаевые валидатору Jito. Платятся в первой транзакции бандла')}</div><input data-f="tip" type="number" min="0.0001" step="0.0001" value="${esc(B0.tip)}"></div>
    <div><div class="opt" style="padding:0"><span class="b0l">Глобальные комиссии (SOL)</span>${sw('gfOn',B0.gfOn)}</div>
      <input data-f="gf" type="number" min="0" step="0.0001" value="${esc(B0.gf)}" ${B0.gfOn?'':'disabled'}></div>
  </div>
  <div class="b0sep"></div>
  <div class="b0t">Дополнительные параметры</div>
  <div class="tabs">${tabs.map(([k,n])=>`<button type="button" class="${B0.tab===k?'on':''}" data-tab="${k}">${n}</button>`).join('')}</div>
  <div class="tabbody">${tabBody[B0.tab]}</div>
  <p class="mut" style="font-size:12px;line-height:16px">Farm Snipers, умная продажа, авто TP и повтор сохраняются в настройках и пресетах. Автоисполнение после запуска пока не подключено.</p>
  <div class="b0sep"></div>
  <div class="row" style="align-items:center;justify-content:space-between"><div><b>Автоматизация</b> <small class="mut">(необязательно)</small> ${q('Действия, которые срабатывают сразу после запуска')}</div>
    <div class="row" style="gap:8px;flex:none"><button class="btn ghost" type="button" disabled>Бамп-бот</button><button class="btn ghost" type="button" disabled>Задача на покупку</button><button class="btn ghost" type="button" disabled>Volume Bot</button></div></div>
  <div class="pempty" style="text-align:center;margin:16px 0">Автоматизации не настроены<br><small>Бамп-бот, задача на покупку и Volume Bot: скоро</small></div>
  <div class="card" style="margin-top:16px"><b style="font-size:18px">Сводка запуска</b>
    <div class="sumr"><span>Режим покупки</span><b>Покупка в 0 блоке</b></div>
    <div class="sumr"><span>Проскальзывание</span><b id="s-slip"></b></div>
    <div class="sumr"><span>Чаевые Jito</span><b id="s-tip"></b></div>
    <div class="sumr"><span>Кошельки бандла</span><b id="s-n"></b></div>
    <div class="sumr"><span>Сумма бандла, SOL</span><b id="s-sum"></b></div>
    <div class="sumr"><span>Покупка DEV</span><b id="s-dev"></b></div>
    <div class="sumr"><span>Повторить</span><b id="s-rep"></b></div>
  </div>`;
  updB0();
}
function updB0(){
  if(mode!=='b0')return;
  const ws=bw(),am=b0amts(),sum=am.reduce((a,x)=>a+x,0),eq=B0.dist==='equal';
  const reserve=ws.length*WFEE,min=ws.length*MINW+reserve;
  const t=n=>Number(n).toFixed(4);
  $('#h-total').textContent=`~${t(ws.length?am[0]||0:0)} SOL на кошелёк бандла. ${t(reserve)} SOL резерв на комиссии. Минимум: ${t(min)} SOL`;
  $('#h-dev').textContent='На DEV-кошельке держи бюджет + ~0.03 SOL на создание токена, комиссии и чаевые Jito.';
  $('#h-sum').textContent='Всего: '+t(sum)+' SOL';
  if(eq)document.querySelectorAll('[data-amt]').forEach((e,i)=>e.value=t(am[i]||0));
  $('#v-slip').textContent=B0.slip+'%';
  $('#s-slip').textContent=B0.slip+'%';
  $('#s-tip').textContent=B0.tip+' SOL';
  $('#s-n').textContent=ws.length;
  $('#s-sum').textContent=t(sum)+' SOL';
  $('#s-dev').textContent=t(Number(B0.dev)||0)+' SOL';
  $('#s-rep').textContent=(B0.rep||1)+'x';
}
$('#b0').oninput=e=>{
  const t=e.target;
  if(t.dataset.f){B0[t.dataset.f]=t.type==='range'?Number(t.value):t.value;saveB0();updB0()}
  else if(t.dataset.amt){B0.amts[t.dataset.amt]=t.value;saveB0();updB0()}
};
$('#b0').onclick=e=>{
  const t=e.target.closest('[data-sw],[data-dist],[data-tab],[data-pct],[data-apply],[data-max],[data-maxall]');
  if(!t)return;
  const d=t.dataset;
  if(d.sw){B0[d.sw]=!B0[d.sw]}
  else if(d.dist){B0.dist=d.dist;if(d.dist==='custom')bw().forEach((w,i)=>{if(B0.amts[w.pk]==null)B0.amts[w.pk]=r4(b0amts()[i])})}
  else if(d.tab){B0.tab=d.tab}
  else if(d.pct){$('#pctin').value=d.pct;return}
  else if(d.apply){
    const p=Math.min(100,Math.max(1,Number($('#pctin').value)||0));
    bw().forEach(w=>{const b=wbal[w.pk]||0;if(b>=MINW)B0.amts[w.pk]=r4(b*p/100)});
    B0.dist='custom'}
  else if(d.max){B0.amts[d.max]=r4((wbal[d.max]||0)-WFEE)}
  else if(d.maxall){bw().forEach(w=>B0.amts[w.pk]=r4((wbal[w.pk]||0)-WFEE));B0.dist='custom'}
  saveB0();renderB0();
};
async function uploadMeta(f){
  const meta=new FormData();
  meta.append('file',f.get('file'));
  for(const k of['name','symbol','description','twitter','telegram','website'])meta.append(k,f.get(k)||'');
  meta.append('showName','true');
  const mr=await fetch('https://pump.fun/api/ipfs',{method:'POST',body:meta});
  if(!mr.ok)throw new Error('IPFS: '+mr.status);
  return (await mr.json()).metadataUri;
}
async function launchB0(f){
  const devW=devSel();
  if(!devW)return log('Для 0 блока нужен локальный DEV-кошелёк (кнопка «+ DEV»)','err');
  const ws=bw(),raw=b0amts();
  const items=ws.map((w,i)=>({w,a:B0.spread?r4(raw[i]*(0.85+Math.random()*0.3)):r4(raw[i])})).filter(x=>x.a>0);
  if(!items.length)return log('Задай суммы для кошельков бандла','err');
  if(items.length>4)return log('В одном Jito bundle максимум 5 транзакций: DEV и 4 кошелька. Выбери до 4 BUNDLE-кошельков.','err');
  const dev=Number(B0.dev);
  if(!(dev>0))return log('Укажи бюджет DEV','err');
  const tip=Number(B0.tip);
  if(!(tip>0))return log('Укажи чаевые Jito','err');
  const total=items.reduce((a,x)=>a+x.a,0)+dev+tip;
  if(!confirm(`Запуск в 0 блоке\nDEV: ${dev} SOL\nБандл: ${items.length} кошельков, ${items.reduce((a,x)=>a+x.a,0).toFixed(4)} SOL\nЧаевые Jito: ${tip} SOL\nПроскальзывание: ${B0.slip}%\nИтого ≈ ${total.toFixed(4)} SOL + комиссии\n\nОтправить bundle?`))return;
  const btn=$('#go');btn.disabled=true;
  try{
    log('Загрузка метаданных…');
    const uri=await uploadMeta(f);
    log('Сборка bundle…');
    const devKp=kpOf(devW),mint=W.Keypair.generate(),m=mint.publicKey.toBase58();
    const common={denominatedInSol:'true',slippage:Number(B0.slip)||1,pool:lp.pool};
    const reqs=[
      {publicKey:devKp.publicKey.toBase58(),action:'create',tokenMetadata:{name:f.get('name'),symbol:f.get('symbol'),uri},mint:m,amount:dev,priorityFee:tip,...common},
      ...items.map(x=>({publicKey:x.w.pk,action:'buy',mint:m,amount:x.a,priorityFee:0,...common}))];
    const tr=await fetch('https://pumpportal.fun/api/trade-local',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(reqs)});
    if(!tr.ok)throw new Error('Trade API: '+tr.status+' '+await tr.text());
    const enc=await tr.json();
    if(!Array.isArray(enc)||enc.length!==reqs.length)throw new Error('Trade API вернул неожиданный ответ');
    const signers=[[mint,devKp],...items.map(x=>[kpOf(x.w)])];
    const txs=enc.map((e,i)=>{const t=W.VersionedTransaction.deserialize(b58dec(e));t.sign(signers[i]);return t});
    log('Отправка bundle в Jito…');
    const jr=await fetch('https://mainnet.block-engine.jito.wtf/api/v1/bundles',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0',id:1,method:'sendBundle',params:[txs.map(t=>b58enc(t.serialize()))]})});
    const j=await jr.json();
    if(j.error)throw new Error('Jito: '+(j.error.message||JSON.stringify(j.error)));
    const sig=b58enc(txs[0].signatures[0]);
    LS.set('hist',[...LS.get('hist',[]),{symbol:f.get('symbol'),mint:m,amount:String(dev),sig,t:Date.now(),lp:lp.id}]);
    renderHist();
    log(`Bundle отправлен (id ${esc(String(j.result).slice(0,8))}…). Он может не пройти, если не попал в слот: проверь статус. <a target="_blank" rel="noopener" href="https://explorer.jito.wtf/bundle/${esc(String(j.result))}">Bundle</a> · <a target="_blank" rel="noopener" href="${lp.coin}${m}">Токен</a> · <a target="_blank" rel="noopener" href="https://solscan.io/tx/${sig}">Tx</a>`,'ok');
    setTimeout(()=>$('#w-bal').click(),5000);
  }catch(err){log(esc(err.message||err),'err')}
  btn.disabled=false;
}

renderModes();renderW();renderP();
renderB0();

/* ===== Запуск ===== */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tradeLocal(kp,body){
  const r=await fetch('https://pumpportal.fun/api/trade-local',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({publicKey:kp.publicKey.toBase58(),...body})});
  if(!r.ok)throw new Error('Trade API: '+r.status+' '+await r.text());
  const tx=W.VersionedTransaction.deserialize(new Uint8Array(await r.arrayBuffer()));
  return tx;
}
async function sendLocal(tx,signers){
  tx.sign(signers);
  return conn().sendRawTransaction(tx.serialize(),{skipPreflight:true,maxRetries:3});
}

$('#f').onsubmit=async e=>{
  e.preventDefault();
  if(!lp||lp.status!=='ready')return log('Выбери лаунчпад','err');
  const f=new FormData(e.target);
  if(mode==='b0')return launchB0(f);
  const devW=wallets().find(x=>x.sel&&x.role==='dev');
  if(!devW&&!pubkey)return log('Подключи Phantom или выбери DEV-кошелёк','err');
  const snipers=mode==='snipe'?wallets().filter(x=>x.sel&&x.role==='sniper'):[];
  if(mode==='snipe'&&!snipers.length)return log('Выбери снайперские кошельки','err');
  const btn=$('#go');btn.disabled=true;
  try{
    log('Загрузка метаданных…');
    const metadataUri=await uploadMeta(f);

    log('Сборка транзакции…');
    const mint=W.Keypair.generate();
    const devKp=devW?kpOf(devW):null;
    const devAddr=devKp?devKp.publicKey.toBase58():pubkey.toBase58();
    const body={action:'create',
      tokenMetadata:{name:f.get('name'),symbol:f.get('symbol'),uri:metadataUri},
      mint:mint.publicKey.toBase58(),denominatedInSol:'true',
      amount:Number(f.get('amount')),slippage:Number(f.get('slippage')),
      priorityFee:Number(f.get('fee')),pool:lp.pool};
    const tr=await fetch('https://pumpportal.fun/api/trade-local',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({publicKey:devAddr,...body})});
    if(!tr.ok)throw new Error('Trade API: '+tr.status+' '+await tr.text());
    const tx=W.VersionedTransaction.deserialize(new Uint8Array(await tr.arrayBuffer()));
    let signature;
    if(devKp){signature=await sendLocal(tx,[mint,devKp])}
    else{tx.sign([mint]);log('Подтверди в Phantom…');signature=(await provider().signAndSendTransaction(tx)).signature}

    const m=mint.publicKey.toBase58();
    LS.set('hist',[...LS.get('hist',[]),{symbol:f.get('symbol'),mint:m,amount:f.get('amount'),sig:signature,t:Date.now(),lp:lp.id}]);
    renderHist();refresh();
    const link=`<a target="_blank" rel="noopener" href="${lp.coin}${m}">Открыть токен</a> · <a target="_blank" rel="noopener" href="https://solscan.io/tx/${signature}">Tx</a>`;
    if(!devKp)track('create',m,String(f.get('symbol')),signature);
    log('Запуск отправлен. '+link);

    if(snipers.length){
      const st=await settle(signature);
      if(!st||st.failed)throw new Error('Запуск не подтверждён, снайперские покупки отменены');
      const lo=Math.max(0,Number(f.get('snMin'))||0),hi=Math.max(lo,Number(f.get('snMax'))||lo);
      const amt=Number(f.get('snAmt'));
      let done=0,fail=0;
      for(const [i,w] of snipers.entries()){
        const d=lo+Math.random()*(hi-lo);
        log(`Снайпер ${i+1}/${snipers.length}: жду ${d.toFixed(1)} с… (ок: ${done}, ошибок: ${fail})<br>${link}`);
        await sleep(d*1000);
        try{
          const kp=kpOf(w);
          const t=await tradeLocal(kp,{action:'buy',mint:m,denominatedInSol:'true',amount:amt,slippage:Number(f.get('slippage')),priorityFee:Number(f.get('fee')),pool:'auto'});
          await sendLocal(t,[kp]);done++;
        }catch(er){fail++;console.error('sniper',w.pk,er)}
      }
      log(`Готово. Снайперы: ок ${done}, ошибок ${fail}.<br>${link}`,fail?'err':'ok');
      $('#w-bal').click();
    }else log('Готово. '+link,'ok');
  }catch(err){log(esc(err.message||err),'err')}
  btn.disabled=false;
};

/* ===== Портфель и PnL ===== */
const TOKEN_PROGRAMS=['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'];
const SOL_MINT='So11111111111111111111111111111111111111112';
const fmt=(n,d=4)=>(n==null||!isFinite(n))?'—':Number(n).toFixed(d);
const sgn=n=>(n>0?'+':'')+fmt(n);
const cls=n=>n>0?'pos':n<0?'neg':'';
const ledgerAll=()=>LS.get('ledger',[]);
const ledger=()=>pubkey?ledgerAll().filter(x=>x.w===pubkey.toBase58()):[];
const pmsg=(m,c='')=>{const e=$('#pmsg');e.className=c;e.textContent=m};

// Net SOL change of the wallet (fee payer = account 0) after the tx lands
async function settle(sig){
  const c=conn();
  for(let i=0;i<40;i++){
    await new Promise(r=>setTimeout(r,1500));
    try{
      const tx=await c.getTransaction(sig,{maxSupportedTransactionVersion:0,commitment:'confirmed'});
      if(tx){
        if(tx.meta?.err)return {failed:true};
        return {delta:(tx.meta.postBalances[0]-tx.meta.preBalances[0])/W.LAMPORTS_PER_SOL};
      }
    }catch{}
  }
  return null;
}
async function track(type,mint,symbol,sig){
  const w=pubkey.toBase58();
  const r=await settle(sig);
  if(!r){pmsg('Не удалось подтвердить '+sig.slice(0,8)+'…, проверь в Solscan','err');return false}
  if(r.failed){pmsg('Транзакция не прошла в сети. Комиссия списана, сделка не учтена.','err');return false}
  LS.set('ledger',[...ledgerAll(),{t:Date.now(),w,type,mint,symbol,sol:r.delta,sig}]);
  refresh();
  if(!$('#portfolio').classList.contains('hide'))loadPortfolio();
  return true;
}

async function trade(action,mint,amount,denomSol){
  if(!pubkey)throw new Error('Подключи кошелёк');
  new W.PublicKey(mint);
  const r=await fetch('https://pumpportal.fun/api/trade-local',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({publicKey:pubkey.toBase58(),action,mint,denominatedInSol:denomSol?'true':'false',amount,
      slippage:Number($('#tslip').value)||15,priorityFee:Number($('#tfee').value)||0.0005,pool:'auto'})});
  if(!r.ok)throw new Error('Trade API: '+r.status+' '+await r.text());
  const tx=W.VersionedTransaction.deserialize(new Uint8Array(await r.arrayBuffer()));
  return (await provider().signAndSendTransaction(tx)).signature;
}

async function holdings(){
  const c=conn(),out=new Map();
  for(const pid of TOKEN_PROGRAMS){
    const r=await c.getParsedTokenAccountsByOwner(pubkey,{programId:new W.PublicKey(pid)});
    for(const {account} of r.value){
      const i=account.data.parsed.info,ui=i.tokenAmount.uiAmount||0;
      if(ui>0)out.set(i.mint,(out.get(i.mint)||0)+ui);
    }
  }
  return out;
}
async function prices(mints){
  const list=[SOL_MINT,...mints],res={};
  for(let i=0;i<list.length;i+=30){
    try{
      const r=await fetch('https://api.dexscreener.com/tokens/v1/solana/'+list.slice(i,i+30).join(','));
      if(!r.ok)continue;
      for(const p of await r.json()){
        const a=p.baseToken?.address,liq=p.liquidity?.usd||0;
        if(a&&(!res[a]||liq>res[a].liq))res[a]={sol:Number(p.priceNative),usd:Number(p.priceUsd),sym:p.baseToken.symbol,liq,quote:p.quoteToken?.address};
      }
    }catch{}
  }
  return res;
}

function drawChart(L){
  const svg=$('#chart');
  if(!L.length){svg.innerHTML='<text x="300" y="84" fill="#8b95ab" text-anchor="middle" font-size="14">Пока нет сделок</text>';return}
  let acc=0;
  const ys=[0,...L.slice().sort((a,b)=>a.t-b.t).map(x=>acc+=x.sol)];
  const lo=Math.min(...ys),hi=Math.max(...ys),span=(hi-lo)||1,P=16;
  const X=i=>P+(ys.length===1?0:i*(600-2*P)/(ys.length-1));
  const Y=v=>160-P-((v-lo)/span)*(160-2*P);
  const pts=ys.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ');
  const last=ys[ys.length-1];
  svg.innerHTML=`<line x1="${P}" x2="${600-P}" y1="${Y(0)}" y2="${Y(0)}" stroke="#263149" stroke-dasharray="4 4"/>
  <polyline points="${pts}" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linejoin="round"/>
  <text x="${600-P}" y="${Math.max(14,Y(last)-8)}" fill="${last>=0?'#4ade80':'#f87171'}" text-anchor="end" font-size="12">${sgn(last)} SOL</text>`;
}

let ploading=false;
async function loadPortfolio(){
  if(!pubkey){pmsg('Подключи кошелёк','err');return}
  if(ploading)return;
  ploading=true;pmsg('Загрузка…');
  try{
    const h=await holdings(),L=ledger();
    const mints=[...new Set([...h.keys(),...L.map(x=>x.mint)])];
    const pr=await prices(mints);
    const solUsd=pr[SOL_MINT]?.usd||0;
    const priceSol=m=>{
      const p=pr[m];if(!p)return null;
      if(p.quote===SOL_MINT)return p.sol;
      return solUsd?p.usd/solUsd:null;
    };
    const rows=mints.map(m=>{
      const e=L.filter(x=>x.mint===m);
      const inv=-e.filter(x=>x.type!=='sell').reduce((a,x)=>a+x.sol,0);
      const rev=e.filter(x=>x.type==='sell').reduce((a,x)=>a+x.sol,0);
      const bal=h.get(m)||0,ps=priceSol(m),val=ps==null?null:bal*ps;
      const tracked=e.length>0;
      const pnl=tracked&&(bal===0||val!=null)?rev-inv+(val||0):null;
      return {m,bal,ps,val,tracked,inv,rev,pnl,
        sym:pr[m]?.sym||e.find(x=>x.symbol)?.symbol||m.slice(0,4)+'…'};
    }).sort((a,b)=>(b.val||0)-(a.val||0));

    const sum=f=>rows.reduce((a,r)=>a+(f(r)||0),0);
    const tVal=sum(r=>r.val),tInv=sum(r=>r.tracked?r.inv:0),tRev=sum(r=>r.tracked?r.rev:0),tPnl=sum(r=>r.pnl);
    const set=(id,v,signed)=>{
      $('#p-'+id).textContent=signed?sgn(v):fmt(v);
      $('#p-'+id).className='n'+(signed?' '+cls(v):'');
      $('#p-'+id+'-usd').textContent=solUsd?'≈ $'+(v*solUsd).toFixed(2):'';
    };
    set('val',tVal);set('inv',tInv);set('rev',tRev);set('pnl',tPnl,true);

    $('#ptb').innerHTML=rows.length?rows.map(r=>{
      const sell=r.bal>0?[25,50,100].map(p=>`<button class="sm" data-mint="${esc(r.m)}" data-pct="${p}" data-sym="${esc(r.sym)}">${p}%</button>`).join(''):'';
      return `<tr>
        <td><a target="_blank" rel="noopener" href="https://pump.fun/coin/${esc(r.m)}">${esc(r.sym)}</a></td>
        <td class="num">${r.bal?r.bal.toLocaleString('ru',{maximumFractionDigits:2}):'0'}</td>
        <td class="num">${r.ps==null?'—':r.ps.toExponential(3)}</td>
        <td class="num">${fmt(r.val)}</td>
        <td class="num">${r.tracked?fmt(r.inv):'—'}</td>
        <td class="num">${r.tracked?fmt(r.rev):'—'}</td>
        <td class="num ${r.pnl==null?'':cls(r.pnl)}">${r.pnl==null?'—':sgn(r.pnl)}</td>
        <td>${sell}</td></tr>`;
    }).join(''):'<tr><td colspan="8" style="color:var(--mute)">Токенов на кошельке нет</td></tr>';

    drawChart(L);
    pmsg(Object.keys(pr).length?'':'Цены не получены (DexScreener). Баланс показан без стоимости.',Object.keys(pr).length?'':'err');
  }catch(e){
    console.error('portfolio',e);
    pmsg('Ошибка загрузки: '+(e.message||e),'err');
  }
  ploading=false;
}

$('#preload').onclick=loadPortfolio;
$('#buybtn').onclick=async()=>{
  const mint=$('#bmint').value.trim(),amt=Number($('#bamt').value);
  const btn=$('#buybtn');btn.disabled=true;
  try{
    if(!(amt>0))throw new Error('Сумма должна быть больше 0');
    pmsg('Подтверди в Phantom…');
    const sig=await trade('buy',mint,amt,true);
    pmsg('Отправлено, жду подтверждения…');
    if(await track('buy',mint,'',sig))pmsg('Покупка учтена','ok');
  }catch(e){pmsg(e.message||String(e),'err')}
  btn.disabled=false;
};
$('#ptb').onclick=async e=>{
  const b=e.target.closest('button[data-mint]');if(!b)return;
  const {mint,pct,sym}=b.dataset;
  if(!confirm('Продать '+pct+'% '+sym+'?'))return;
  try{
    pmsg('Подтверди в Phantom…');
    const sig=await trade('sell',mint,pct+'%',false);
    pmsg('Отправлено, жду подтверждения…');
    if(await track('sell',mint,sym,sig))pmsg('Продажа учтена','ok');
  }catch(err){pmsg(err.message||String(err),'err')}
};

renderHist();
(async()=>{
  const p=provider();
  if(p?.isPhantom){try{setWallet((await p.connect({onlyIfTrusted:true})).publicKey)}catch{}}
})();
