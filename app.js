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
});

async function refresh(){
  if(!pubkey)return;
  try{
    const sol=(await conn().getBalance(pubkey))/W.LAMPORTS_PER_SOL;
    $('#bal').textContent=sol.toFixed(4)+' SOL';$('#d-bal').textContent=sol.toFixed(4);
  }catch(e){$('#bal').textContent='RPC ошибка'}
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

$('#connect').onclick=async()=>{
  const p=provider();
  if(!p?.isPhantom){window.open('https://phantom.app','_blank');return}
  try{
    const r=await p.connect();
    pubkey=r.publicKey;
    $('#connect').textContent=pubkey.toBase58().slice(0,4)+'…'+pubkey.toBase58().slice(-4);
    refresh();
  }catch{}
};
$('#rpc').value=LS.get('rpc','');
$('#save').onclick=()=>{LS.set('rpc',$('#rpc').value.trim());refresh()};

const log=(m,c='')=>{$('#log').innerHTML=`<span class="${c}">${m}</span>`};

$('#f').onsubmit=async e=>{
  e.preventDefault();
  if(!pubkey)return log('Подключи кошелёк','err');
  const f=new FormData(e.target);
  const btn=$('#go');btn.disabled=true;
  try{
    log('Загрузка метаданных…');
    const meta=new FormData();
    meta.append('file',f.get('file'));
    for(const k of['name','symbol','description','twitter','telegram','website'])meta.append(k,f.get(k)||'');
    meta.append('showName','true');
    const mr=await fetch('https://pump.fun/api/ipfs',{method:'POST',body:meta});
    if(!mr.ok)throw new Error('IPFS: '+mr.status);
    const {metadataUri}=await mr.json();

    log('Сборка транзакции…');
    const mint=W.Keypair.generate();
    const tr=await fetch('https://pumpportal.fun/api/trade-local',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        publicKey:pubkey.toBase58(),action:'create',
        tokenMetadata:{name:f.get('name'),symbol:f.get('symbol'),uri:metadataUri},
        mint:mint.publicKey.toBase58(),denominatedInSol:'true',
        amount:Number(f.get('amount')),slippage:Number(f.get('slippage')),
        priorityFee:Number(f.get('fee')),pool:'pump'})});
    if(!tr.ok)throw new Error('Trade API: '+tr.status+' '+await tr.text());
    const tx=W.VersionedTransaction.deserialize(new Uint8Array(await tr.arrayBuffer()));
    tx.sign([mint]);

    log('Подтверди в Phantom…');
    const {signature}=await provider().signAndSendTransaction(tx);
    LS.set('hist',[...LS.get('hist',[]),{symbol:f.get('symbol'),mint:mint.publicKey.toBase58(),amount:f.get('amount'),sig:signature,t:Date.now()}]);
    renderHist();refresh();
    log(`Готово. <a target="_blank" rel="noopener" href="https://pump.fun/coin/${mint.publicKey.toBase58()}">Открыть токен</a> · <a target="_blank" rel="noopener" href="https://solscan.io/tx/${signature}">Tx</a>`,'ok');
  }catch(err){log(esc(err.message||err),'err')}
  btn.disabled=false;
};
renderHist();
