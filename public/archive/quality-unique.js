import {setCandidates as rawSetCandidates,baseCandidates} from './item-identity.js?v=115';
const manualRolls=new Map();
import {esc} from './unified-core.js?v=129';
import {runewordCandidates} from './option-intake.js?v=127';
export function identityLines(lines){
 return lines.filter(l=>{
  const text=String(l.text||'').trim();
  if(!text)return false;
  if(/(?:[+−-]\s*\d+|\d+\s*%|복합\s*효과|개별\s*기술)/i.test(text))return false;
  if(/^(?:명칭 한 줄 보완|명칭 보완|상단 명칭|상단 색상명)$/.test(l.pass||''))return true;
  return !Number.isInteger(l.i)||l.i<=2;
 });
}
const setCandidates=(lines,records)=>rawSetCandidates(identityLines(lines),records);
export function uniqueCandidates(lines,records){
const header=identityLines(lines);
const norm=s=>String(s).toLowerCase().replace(/[^a-z가-힣0-9]/g,'');
let candidates=records.filter(r=>r.kind==='유니크'&&header.some(l=>[r.name,r.en,...(r.identityAliases||[])].filter(Boolean).some(n=>norm(l.text)===norm(n)||(norm(n).length>3&&norm(l.text).includes(norm(n))))));
if(candidates.length>1&&candidates.every(r=>r.en==='Rainbow Facet')){
 const text=lines.map(l=>l.text).join(' ');const elems=[['번개','ltng'],['냉기','cold'],['화염','fire'],['독','pois']].filter(([ko])=>new RegExp(ko+'\\s*기술\\s*피해|적의\\s*'+ko+'\\s*저항').test(text));
 if(elems.length===1)candidates=candidates.filter(r=>r.mods.some(m=>m.code==='extra-'+elems[0][1]));
 const death=/사망|죽었을|죽을|\bdeath\b/i.test(text),level=/레벨\s*상승|레벨이\s*오|레벨\s*업|level.?up/i.test(text);
 if(death!==level)candidates=candidates.filter(r=>r.mods.some(m=>m.code===(death?'death-skill':'levelup-skill')));
}
const longest=Math.max(0,...candidates.map(r=>Math.max(...[r.name,r.en,...(r.identityAliases||[])].filter(n=>header.some(l=>norm(l.text).includes(norm(n)))).map(n=>norm(n).length))));
return candidates.filter(r=>[r.name,r.en,...(r.identityAliases||[])].some(n=>norm(n).length===longest&&header.some(l=>norm(l.text).includes(norm(n)))));
}
export function blueTitle(pixels){let blue=0,colored=0;for(let i=0;i<pixels.length;i+=4){const [r,g,b]=pixels.slice(i,i+3);if(Math.max(r,g,b)>95&&Math.max(r,g,b)-Math.min(r,g,b)>45){colored++;if(b>r*1.22&&b>g*1.12)blue++;}}return blue>=25&&blue/Math.max(1,colored)>.45;}
export function roll(mod,value){if(value===''||value==null)return {status:'미인식'};if(/skill$|charged|aura|\/lvl|^dmg-(pois|cold|fire|ltng|elem|mag)$|^pois-|Affix|affix|^rep-|^sock$/.test(mod.code))return {status:'복합·계산 옵션 · 원문 확인'};const n=Number(value),a=Number(mod.min),b=Number(mod.max);if(!Number.isFinite(n)||mod.min===''||mod.max===''||!Number.isFinite(a)||!Number.isFinite(b))return {status:'별도 확인'};const lo=Math.min(a,b),hi=Math.max(a,b);if(n<lo||n>hi)return {status:'범위 밖 · 보석/주얼·합산 확인'};return {status:lo===hi?'고정값 일치':'범위 내',position:lo===hi?null:Math.round((n-lo)/(hi-lo)*100)};}
export function initQuality(api){const q=document.getElementById('sourceQuality');let manual=false,titleEvidence=null;const info=document.createElement('p');info.id='qualityStatus';q.parentElement.after(info);const select=document.createElement('select');select.id='uniqueIdentity';select.setAttribute('aria-label','유니크 아이템 선택');select.innerHTML='<option value="">유니크 이름 선택</option>'+api.getData().records.filter(r=>['유니크','세트'].includes(r.kind)).map(r=>'<option value="'+esc(r.id)+'">'+esc(r.name)+' · '+esc(r.en)+'</option>').join('');q.parentElement.after(select);select.hidden=true;
q.addEventListener('change',()=>{manual=true;select.hidden=!['unique','set'].includes(q.value);info.textContent='직접 선택한 아이템 종류를 유지합니다.';});select.onchange=()=>{manualRolls.clear();window.SKR_APPRAISAL_UI?.appraise();};document.addEventListener('change',e=>{if(e.target.dataset.uniqueRoll!==undefined){manualRolls.set(e.target.dataset.uniqueRoll,e.target.value);window.SKR_APPRAISAL_UI?.appraise();}});
window.SKR_QUALITY={reset(){select.value='';info.textContent='아이템 종류 확인 전';},detect(lines,pixels){if(['magic','rare','crafted','normal'].includes(pixels))titleEvidence=pixels;const titleBase=titleEvidence==='normal'&&baseCandidates(lines.filter(l=>l.i===0||l.pass==='명칭 한 줄 보완'),api.getData()).length===1;const uniques=uniqueCandidates(lines,api.getData().records),sets=setCandidates(lines,api.getData().records);const candidates=uniques.length?uniques:sets;if(!manual){if(candidates.length===1){q.value=candidates[0].kind==='세트'?'set':'unique';select.value=candidates[0].id;info.textContent=candidates[0].kind+' 명칭 DB 일치 · 사진과 확인하세요.';}else if(candidates.length>1){q.value=candidates[0].kind==='세트'?'set':'unique';select.value='';info.textContent='이름이 같은 유니크 후보가 여러 개입니다. 종류를 선택하세요.';}else if(titleEvidence&&(titleEvidence!=='normal'||titleBase)){q.value=titleEvidence==='normal'&&lines.some(l=>/^(?:고급|Superior)\s/i.test(l.text))?'superior':titleEvidence;info.textContent='아이템 이름 줄의 색상으로 '+({magic:'매직',rare:'레어',crafted:'크래프트',normal:'일반',superior:'고급'})[q.value]+' 추정 · 스킨 사용 시 원본과 확인하세요.';}else if(q.value==='unknown')info.textContent='등급을 확정할 근거가 부족합니다. 직접 선택하세요.';}select.hidden=!['unique','set'].includes(q.value);},newImage(){manualRolls.clear();manual=false;titleEvidence=null;q.value='unknown';select.value='';select.hidden=true;info.textContent='새 이미지의 아이템 종류를 확인합니다.';}};
}
export function uniqueAssessment(api){const r=api.getData().records.find(r=>r.id===document.getElementById('uniqueIdentity').value);if(!r)return {html:'<h3>유니크 아이템 이름을 선택하세요.</h3>',result:null};const ledger=api.getLedger();const all=ledger.flatMap(l=>l.status==='ignored'?[]:l.options||[]);const rows=r.mods.map((m,index)=>{const found=all.filter(o=>sameOption(o,m));const values=[...new Set(found.map(o=>o.value).filter(v=>v!==''&&v!=null).map(Number))];const key=r.id+':'+index;const value=manualRolls.has(key)?manualRolls.get(key):values.length===1?values[0]:'';return {key,mod:m,value,assessment:values.length>1&&!manualRolls.has(key)?{status:'서로 다른 판독값'}:roll(m,value)};});return {result:{quality:r.kind==='세트'?'set':'unique',id:r.id,rows,pending:ledger.filter(l=>l.status==='unresolved').length},html:'<h2>'+esc(r.name)+' · '+esc(r.kind)+' 옵션 감정</h2><p><strong>'+rows.filter(x=>x.value!=='').length+' / '+rows.length+'개 옵션 수치 연결</strong> · 미인식 '+rows.filter(x=>x.value==='').length+'개</p><p>고정 옵션과 변동 범위를 대조합니다. 변동 위치는 거래 가치 점수가 아닙니다. 미인식 값은 채우지 않습니다.</p><table><thead><tr><th>옵션</th><th>DB 범위</th><th>인식값</th><th>대조</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+esc(x.mod.label||x.mod.code)+'</td><td>'+(/\/lvl/.test(x.mod.code)?'캐릭터 레벨에 따라 변동':/skill$|charged|aura|^sock$|Affix|affix/.test(x.mod.code)?'복합 효과 · 원본 상세 확인':esc(x.mod.min)+' ~ '+esc(x.mod.max))+'</td><td>'+'<input type="number" placeholder="미확인" aria-label="'+esc(x.mod.label||x.mod.code)+' 직접 확인값" data-unique-roll="'+esc(x.key)+'" value="'+esc(x.value)+'">'+'</td><td>'+esc(x.assessment.status)+(x.assessment.position!=null?' · 수치 위치 '+x.assessment.position+'%':'')+'</td></tr>').join('')+'</tbody></table><p>방어력 총합·레벨 비례·발동·충전·소켓에 박힌 효과는 별도 확인이 필요합니다. 전체 옵션을 읽었다거나 진품·시세가 검증됐다는 판정은 아닙니다.</p><a href="unified.html?q='+encodeURIComponent(r.name)+'">아이템 상세·드랍 보기 →</a>'};}

export function sameOption(a,b){const code=x=>String(x).replace(/^(cast|swing|balance|move)[123]$/,'$1');const param=x=>String(x||'').replace(/^0$/,'');return code(a.code)===code(b.code)&&param(a.param)===param(b.param);}

export function enableRunewordQuality(api){
 if(window.__SKR_RUNE_QUALITY_READY)return;
 window.__SKR_RUNE_QUALITY_READY=true;
 const q=document.getElementById('sourceQuality'),select=document.getElementById('uniqueIdentity'),info=document.getElementById('qualityStatus');
 q.insertAdjacentHTML('beforeend','<option value="runeword">룬워드</option>');
 select.setAttribute('aria-label','유니크·세트·룬워드 아이템 선택');
 select.insertAdjacentHTML('beforeend',api.getData().records.filter(r=>r.kind==='룬워드').map(r=>'<option value="'+esc(r.id)+'">'+esc(r.name)+' · '+esc(r.en)+'</option>').join(''));
 q.addEventListener('change',()=>{if(q.value==='runeword'){select.hidden=false;info.textContent='직접 선택한 룬워드를 유지합니다. 이름과 베이스·룬 순서를 사진과 확인하세요.';}});
 const prior=window.SKR_QUALITY.detect;
 window.SKR_QUALITY.detect=(lines,pixels)=>{
  prior(lines,pixels);
  if(info.textContent.startsWith('직접 선택한'))return;
  const matches=runewordCandidates(identityLines(lines),api.getData().records);
  if(matches.length===1){q.value='runeword';select.value=matches[0].id;select.hidden=false;info.textContent='룬워드 이름 또는 룬 순서 DB 일치 · 사진과 확인하세요.';}
  else if(matches.length>1){q.value='runeword';select.value='';select.hidden=false;info.textContent='가능한 룬워드가 여러 개입니다. 이름과 베이스를 확인하세요.';}
 };
}

if(typeof document!=='undefined')document.addEventListener('skr:ocr-ready',()=>enableRunewordQuality(window.SKR_OCR_EVIDENCE),{once:true});

export function identifiedAssessment(api){
 const r=api.getData().records.find(item=>item.id===document.getElementById('uniqueIdentity').value);
 if(!r||r.kind!=='룬워드')return uniqueAssessment(api);
 const base=api.getData().bases.find(b=>b.code===document.getElementById('evidenceBase').value);
 const socketGroup=base?.type==='shld'?'shield':base?.type==='tors'||base?.type==='helm'?'helm':base?'weapon':null;
 const mods=[...r.mods,...(socketGroup?r.socketMods?.[socketGroup]||[]:[])];
 const all=api.getLedger().filter(l=>l.status!=='ignored').flatMap(l=>l.options||[]);
 const rows=mods.map((mod,i)=>{const values=[...new Set(all.filter(o=>sameOption(o,mod)).map(o=>String(o.value)).filter(Boolean))];return {mod,key:r.id+':'+i,value:values.length===1?values[0]:'',conflict:values.length>1};});
 return {result:{quality:'runeword',id:r.id,rows,pending:api.getLedger().filter(l=>l.status==='unresolved').length},html:'<h2>'+esc(r.name)+' · 룬워드 옵션 확인</h2><p>베이스·룬 순서와 고정 효과를 사진과 대조하세요. 발동 효과의 수치는 기술 레벨이며 충전 횟수가 아닙니다.</p><table><thead><tr><th>옵션</th><th>DB 기준</th><th>인식값</th><th>대조</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+esc(x.mod.label)+'</td><td>'+(['hit-skill','gethit-skill'].includes(x.mod.code)?'발동 '+esc(x.mod.min)+'% · 기술 레벨 '+esc(x.mod.max):esc(x.mod.min)+' ~ '+esc(x.mod.max))+'</td><td>'+esc(x.value||'미확인')+'</td><td>'+esc(x.conflict?'판독값 충돌 · 원본 확인':roll(x.mod,x.value).status)+'</td></tr>').join('')+'</tbody></table><p>박힌 룬의 옵션은 적용 베이스에 따라 다릅니다. 미확인 수치와 다른 판독값은 자동 확정하지 않습니다.</p><a href="unified.html?q='+encodeURIComponent(r.name)+'">아이템 상세·드랍 보기 →</a>'};
}
