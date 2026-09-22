const q=document.getElementById('rwq'), s=document.getElementById('rws'), count=document.getElementById('rwcount');
const rows=[...document.querySelectorAll('#rwbody tr')];
const normalize=x=>(x||'').toLowerCase().replace(/[^0-9a-z가-힣]+/g,'');
function filterRW(scrollBest=false){
 const raw=q.value.trim().toLowerCase(), nq=normalize(raw), sv=s.value; let visible=[];
 rows.forEach(r=>{const hay=(r.dataset.search||'').toLowerCase(), nh=r.dataset.searchNorm||''; const ok=(!raw||hay.includes(raw)||nh.includes(nq))&&(!sv||r.dataset.socket===sv); r.classList.toggle('hidden',!ok); r.classList.remove('search-hit'); if(ok)visible.push(r);});
 count.textContent=visible.length+'개';
 if(scrollBest&&raw&&visible.length){let best=visible[0]; const exact=visible.find(r=>normalize(r.children[0].textContent)===nq); if(exact)best=exact; best.classList.add('search-hit'); setTimeout(()=>best.scrollIntoView({behavior:'smooth',block:'center'}),60);}
}
q.addEventListener('input',()=>filterRW(false)); s.addEventListener('change',()=>filterRW(false));
q.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();filterRW(true);}});
const params=new URLSearchParams(location.search), incoming=params.get('q'); if(incoming){q.value=incoming; filterRW(true);} else if(location.hash){const el=document.querySelector(location.hash); if(el){el.classList.add('search-hit');setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'center'}),60);}}
