const fields=document.getElementById('fields');
const drop=document.getElementById('drop'),file=document.getElementById('file'),preview=document.getElementById('preview'),empty=document.getElementById('empty');
const conf=document.getElementById('conf'),ocrbar=document.getElementById('ocrbar'),ocrtext=document.getElementById('ocrtext');
let currentFile=null;

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function draw(rows=[]){fields.innerHTML=rows.map((r,i)=>`<div class="frow"><input value="${esc(r.name)}" aria-label="옵션명"><input type="number" value="${esc(r.value)}" aria-label="수치"><div class="cap"><div>${r.max?`MAX ${r.max}`:'MAX ?'}</div><div class="ok ${r.max?'':'warn'}">${r.max?'사전 보정':'확인 필요'}</div></div><button class="remove" title="삭제" onclick="this.parentElement.remove()">×</button></div>`).join('')}
draw([]);
function setImageBlob(blob,source='업로드'){
 if(!blob||!blob.type.startsWith('image/')) return;
 currentFile=blob; const url=URL.createObjectURL(blob); preview.src=url; preview.style.display='block'; empty.style.display='none';
 conf.innerHTML=`<b>${source} 이미지 준비 완료</b><span class="sourcebadge ok">${Math.round(blob.size/1024)} KB</span><div class="progress"><i id="ocrbar" style="width:0"></i></div>`;
 window.ocrbar=document.querySelector('#conf #ocrbar');
}
file.onchange=e=>setImageBlob(e.target.files[0],'파일');
drop.ondragover=e=>{e.preventDefault();drop.style.borderColor='#9a7947'};
drop.ondragleave=()=>drop.style.borderColor='';
drop.ondrop=e=>{e.preventDefault();drop.style.borderColor='';setImageBlob(e.dataTransfer.files[0],'드래그')};
document.addEventListener('paste',e=>{const item=[...e.clipboardData.items].find(x=>x.type.startsWith('image/'));if(item){e.preventDefault();setImageBlob(item.getAsFile(),'Ctrl+V')}});

const DICT=[
 {re:/시전\s*속도|패캐|faster\s*cast/i,name:'시전 속도 증가',max:10},
 {re:/공격\s*속도|공속|increased\s*attack\s*speed/i,name:'공격 속도 증가',max:20},
 {re:/힘|strength/i,name:'힘',max:20}, {re:/민첩|dexterity/i,name:'민첩',max:15},
 {re:/생명력|라이프|life/i,name:'생명력',max:40}, {re:/마나(?!\s*재생)/i,name:'마나',max:90},
 {re:/모든\s*저항|올레|all\s*resist/i,name:'모든 저항',max:11},
 {re:/화염\s*저항|파이어\s*레지|fire\s*resist/i,name:'화염 저항',max:30},
 {re:/냉기\s*저항|콜드\s*레지|cold\s*resist/i,name:'냉기 저항',max:30},
 {re:/번개\s*저항|라이트닝\s*레지|lightning\s*resist/i,name:'번개 저항',max:30},
 {re:/독\s*저항|포이즌\s*레지|poison\s*resist/i,name:'독 저항',max:30},
 {re:/적중당\s*마나|마나.*훔|mana\s*stolen/i,name:'적중당 마나 훔침',max:6},
 {re:/적중당\s*생명|생명.*훔|life\s*stolen/i,name:'적중당 생명력 훔침',max:8},
 {re:/마나\s*재생|regenerate\s*mana/i,name:'마나 재생',max:10},
 {re:/달리기|걷기|run\/walk|faster\s*run/i,name:'달리기/걷기 속도 증가',max:30},
 {re:/타격\s*회복|hit\s*recovery/i,name:'타격 회복 속도 증가',max:10},
 {re:/악마술사.*기술|warlock.*skill/i,name:'악마술사 기술 레벨',max:2}
];
function cleanLine(x){return x.replace(/[|¦]/g,' ').replace(/[，]/g,',').replace(/\s+/g,' ').trim()}
function extractValue(line){let ms=[...line.matchAll(/([+-]?\d{1,3})(?:\s*%)?/g)]; if(!ms.length)return null; return parseInt(ms[ms.length-1][1],10)}
function normalizeOCR(text){
 const rows=[]; const seen=new Set();
 for(const raw of text.split(/\n+/)){const line=cleanLine(raw); if(line.length<2)continue; for(const d of DICT){if(d.re.test(line)){const value=extractValue(line); if(value!==null){let key=d.name+'|'+value;if(!seen.has(key)){seen.add(key);rows.push({name:d.name,value,max:d.max})}} break;}}
 }
 return rows;
}
function inferMeta(text){
 const t=text.replace(/\s+/g,' ');
 if(/레어|희귀|Rare/i.test(t)) rarity.value='레어'; else if(/매직|Magic/i.test(t))rarity.value='매직'; else if(/제작|크래프트|Crafted/i.test(t))rarity.value='크래프트';
 if(/반지|Ring/i.test(t))slot.value='반지'; else if(/목걸이|Amulet/i.test(t))slot.value='목걸이'; else if(/써클릿|코로니트|Circlet|Coronet/i.test(t))slot.value='써클릿'; else if(/장갑|Gloves/i.test(t))slot.value='장갑'; else if(/부츠|Boots/i.test(t))slot.value='부츠'; else if(/벨트|Belt/i.test(t))slot.value='벨트';
 const lines=text.split(/\n/).map(cleanLine).filter(x=>x.length>1); if(lines.length) name.value=lines[0].slice(0,28);
}
async function runOCR(){
 if(!currentFile){conf.innerHTML='<span style="color:#d49a83">먼저 이미지를 업로드하거나 Ctrl+V로 붙여넣으세요.</span>';return}
 if(!window.Tesseract){conf.innerHTML='<span style="color:#d49a83">OCR 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.</span>';return}
 drop.classList.add('scanning'); ocrtext.style.display='block';ocrtext.textContent='OCR 엔진 초기화 중...';
 try{
   const res=await Tesseract.recognize(currentFile,'kor+eng',{logger:m=>{if(m.status==='recognizing text'){const pct=Math.round((m.progress||0)*100);const b=document.querySelector('#conf .progress i');if(b)b.style.width=pct+'%';conf.childNodes[0] && (conf.innerHTML=`<b>실제 OCR 인식 중 · ${pct}%</b><div class="progress"><i style="width:${pct}%"></i></div>`)}else{ocrtext.textContent=`${m.status||'처리 중'}...`}}});
   const text=res.data.text||''; ocrtext.textContent=text.trim()||'(텍스트를 인식하지 못했습니다)';
   const rows=normalizeOCR(text); draw(rows); inferMeta(text);
   const certainty=Math.round(res.data.confidence||0); conf.innerHTML=`<b>OCR 완료 · 평균 신뢰도 ${certainty}%</b><span class="sourcebadge ${rows.length?'ok':''}">${rows.length}개 옵션 정규화</span><div class="progress"><i style="width:100%"></i></div>`;
   if(!rows.length) conf.innerHTML += '<div style="margin-top:6px;color:#d7b16d">옵션 자동 매칭 실패. 아래 OCR 원문을 참고해 수동 입력해주세요.</div>';
 }catch(err){console.error(err);conf.innerHTML='<span style="color:#d49a83">OCR 처리 중 오류가 발생했습니다. 이미지가 너무 크면 툴팁 부분만 캡처해 다시 시도해주세요.</span>'}
 finally{drop.classList.remove('scanning')}
}
document.getElementById('scan').onclick=runOCR;
document.getElementById('clear').onclick=()=>{preview.style.display='none';preview.src='';empty.style.display='block';file.value='';currentFile=null;draw([]);conf.innerHTML='인식 대기 · 스크린샷을 올리거나 Ctrl+V로 붙여넣으세요.<div class="progress"><i style="width:0"></i></div>';ocrtext.style.display='none';ocrtext.textContent='';document.getElementById('result').style.display='none';document.getElementById('name').value=''};
document.getElementById('add').onclick=()=>{fields.insertAdjacentHTML('beforeend','<div class="frow"><input placeholder="옵션명"><input type="number" placeholder="수치"><div class="cap"><div>MAX ?</div><div class="ok warn">수동</div></div><button class="remove" title="삭제" onclick="this.parentElement.remove()">×</button></div>')};
document.getElementById('judge').onclick=()=>{const vals=[...fields.querySelectorAll('.frow')].map(r=>{let ins=r.querySelectorAll('input');return [ins[0].value,+ins[1].value]});let score=30, strengths=[],misses=[];for(const [n,v] of vals){if(/시전|패캐/.test(n)&&v>=10){score+=18;strengths.push('패캐 핵심')}if(n==='힘'&&v>=15){score+=12;strengths.push('고힘')}if(n==='마나'&&v>=60){score+=11;strengths.push('고마나')}if(/모든 저항|올레/.test(n)&&v>=8){score+=11;strengths.push('올레')}if(/저항/.test(n)&&v>=20){score+=7;strengths.push('고저항')}if(/생명력/.test(n)&&v>=30){score+=8;strengths.push('고생명')}if(/훔침/.test(n)&&v>=5){score+=6;strengths.push('흡수 옵션')}}score=Math.min(96,score);if(!vals.some(([n])=>/생명력/.test(n)))misses.push('생명력');if(!vals.some(([n])=>/모든 저항|저항/.test(n)))misses.push('저항');let g=score>=90?'S급':score>=78?'A급':score>=64?'B급':'C급';document.getElementById('grade').textContent=g;document.getElementById('scoretxt').textContent=`종합 감정 점수 ${score} / 100`;document.getElementById('bar').style.width=score+'%';document.getElementById('tags').innerHTML=(strengths.length?strengths:['핵심 조합 부족']).slice(0,6).map(x=>`<span class="tag">${x}</span>`).join('');document.getElementById('why').textContent=strengths.length?`${strengths.join(' + ')} 조합이 동시에 확보되어 실사용 가치가 형성됩니다. 옵션 개수보다 서로 필요한 능력치가 겹치는지가 핵심입니다.`:'현재 인식된 옵션만으로는 강한 시너지 조합이 확인되지 않습니다. OCR 결과를 먼저 검토해 주세요.';document.getElementById('use').textContent=/시전|패캐/.test(vals.map(x=>x[0]).join(' '))?'패캐 브레이크포인트를 맞추는 캐스터 계열 빌드에서 우선 검토할 수 있습니다.':'현재 옵션 조합에 따라 물리/캐스터/범용 세팅 수요를 추가 검토해야 합니다.';document.getElementById('miss').textContent=misses.length?`${misses.join(', ')} 같은 범용 선호 옵션이 추가되면 상위 평가로 갈 가능성이 있습니다.`:'뚜렷한 결손은 적지만 실제 거래가치는 시즌·래더 수요와 조합 희소성을 함께 봐야 합니다.';document.getElementById('result').style.display='block';document.getElementById('result').scrollIntoView({behavior:'smooth',block:'start'})};
