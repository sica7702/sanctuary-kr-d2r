(()=>{
const U=window.SKR_UNIQUE_OVERRIDES||{manual:{},newKo:{},newBase:{},aliasExtra:{}};
const SRC={
 uniques:'/data/d2r/uniqueitems.txt',
 skills:'/data/d2r/skills.txt',
 itemNames:'/data/d2r/item-names.json',
 skillNames:'/data/d2r/skill-names.json'
};
const strip=s=>(s||'').replace(/ÿc[0-9!"+<;.*]/g,'').replace(/\\92/g,"'").trim();
const norm=s=>strip(s).toLowerCase().replace(/[’‘`]/g,"'").replace(/[^0-9a-z가-힣]+/g,'');
const slug=s=>norm(s).replace(/[^0-9a-z가-힣]/g,'-')||'item';
function tsv(txt){let lines=txt.replace(/\r/g,'').split('\n').filter(x=>x.length);let h=lines.shift().split('\t');return lines.map(line=>{let c=line.split('\t'),o={};h.forEach((k,i)=>o[k]=c[i]??'');return o})}
function locMap(arr){const m=new Map();for(const x of arr||[]){const en=strip(x.enUS),ko=strip(x.koKR);if(en&&ko)m.set(norm(en),ko);if(x.Key&&ko)m.set(norm(x.Key),ko)}return m}
function range(a,b){a=(a??'').trim();b=(b??'').trim();if(a===''&&b==='')return'';if(a===b||b==='')return a;return `${a}~${b}`}
function plus(v){v=String(v); return v.startsWith('-')?v:'+'+v}
const labels={
 'str':'힘','dex':'민첩','vit':'활력','enr':'마력','all-stats':'모든 능력치','hp':'생명력','mana':'마나','hp%':'최대 생명력','mana%':'최대 마나',
 'stam':'최대 지구력','stam/lvl':'레벨 비례 지구력','regen-stam':'지구력 회복 속도','stamdrain':'지구력 고갈 속도 감소','regen':'생명력 회복','regen-mana':'마나 재생',
 'att':'명중률','att%':'명중률 보너스','ac':'방어력','ac%':'방어력 증가','ac/lvl':'레벨 비례 방어력','ac-miss':'원거리 공격 방어력','dmg%':'피해 증가','dmg':'피해','dmg-min':'최소 피해','dmg-max':'최대 피해','dmg-norm':'피해',
 'dmg-fire':'화염 피해','dmg-cold':'냉기 피해','dmg-ltng':'번개 피해','dmg-mag':'마법 피해','dmg-pois':'독 피해','fire-min':'최소 화염 피해','fire-max':'최대 화염 피해','cold-min':'최소 냉기 피해','cold-max':'최대 냉기 피해','ltng-min':'최소 번개 피해','ltng-max':'최대 번개 피해','pois-min':'최소 독 피해','pois-max':'최대 독 피해','pois-len':'독 지속시간','cold-len':'냉기 지속시간',
 'res-fire':'화염 저항','res-cold':'냉기 저항','res-ltng':'번개 저항','res-pois':'독 저항','res-mag':'마법 저항','res-all':'모든 저항','res-fire-max':'최대 화염 저항','res-cold-max':'최대 냉기 저항','res-ltng-max':'최대 번개 저항','res-pois-max':'최대 독 저항','res-pois-len':'독 지속시간 감소',
 'pierce-fire':'적의 화염 저항','pierce-cold':'적의 냉기 저항','pierce-ltng':'적의 번개 저항','pierce-pois':'적의 독 저항','pierce-mag':'적의 마법 저항','pierce-dmg':'적의 물리 피해 저항',
 'extra-fire':'화염 기술 피해','extra-cold':'냉기 기술 피해','extra-ltng':'번개 기술 피해','extra-pois':'독 기술 피해','extra-mag':'마법 기술 피해',
 'lifesteal':'적중당 생명력 훔침','manasteal':'적중당 마나 훔침','heal-kill':'적 처치 시 생명력','mana-kill':'적 처치 시 마나','dmg-to-mana':'받는 피해의 마나 전환',
 'swing1':'공격 속도','swing2':'공격 속도','swing3':'공격 속도','cast1':'시전 속도','cast2':'시전 속도','cast3':'시전 속도','move1':'달리기/걷기 속도','move2':'달리기/걷기 속도','balance1':'타격 회복 속도','balance2':'타격 회복 속도','block':'막기 확률','block1':'막기 속도','block2':'막기 속도',
 'crush':'강타 확률','deadly':'치명적 공격','openwounds':'상처 악화 확률','knock':'밀쳐내기','slow':'대상 감속','freeze':'대상 빙결','nofreeze':'빙결되지 않음','half-freeze':'빙결 지속시간 절반 감소','ignore-ac':'대상 방어력 무시','reduce-ac':'대상 방어력 감소','noheal':'괴물 회복 저지','stupidity':'대상 시야 감소',
 'dmg-demon':'악마에게 주는 피해','dmg-undead':'언데드에게 주는 피해','att-demon':'악마에 대한 명중률','att-undead':'언데드에 대한 명중률','demon-heal':'악마 처치 시 생명력',
 'mag%':'마법 아이템 발견 확률','gold%':'괴물에게서 얻는 금화','addxp':'경험치 획득량','cheap':'상점 물품 가격 감소','light':'시야','ease':'착용 조건','dur':'내구도','rep-dur':'내구도 자동 회복','rep-quant':'수량 자동 회복','sock':'홈','indestruct':'파괴 불가','ethereal':'무형',
 'red-dmg':'피해 감소','red-dmg%':'받는 물리 피해 감소','red-mag':'마법 피해 감소','abs-fire':'화염 흡수','abs-cold':'냉기 흡수','abs-ltng':'번개 흡수','abs-mag':'마법 흡수','abs-fire%':'화염 흡수','abs-cold%':'냉기 흡수','abs-ltng%':'번개 흡수','abs-mag%':'마법 흡수',
 'thorns':'공격자가 받는 피해','thorns/lvl':'레벨 비례 공격자가 받는 피해','light-thorns':'공격자가 받는 번개 피해','howl':'적 도주','fireskill':'화염 기술','allskills':'모든 기술','ama':'아마존 기술','sor':'원소술사 기술','nec':'강령술사 기술','pal':'성기사 기술','bar':'야만용사 기술','dru':'드루이드 기술','ass':'암살자 기술','war':'악마술사 기술',
 'pierce-immunity-cold':'괴물의 냉기 면역 파괴','pierce-immunity-fire':'괴물의 화염 면역 파괴','pierce-immunity-light':'괴물의 번개 면역 파괴','pierce-immunity-poison':'괴물의 독 면역 파괴','pierce-immunity-damage':'괴물의 물리 면역 파괴','pierce-immunity-magic':'괴물의 마법 면역 파괴'
};
const pct=new Set(['ac%','att%','dmg%','hp%','mana%','res-fire','res-cold','res-ltng','res-pois','res-mag','res-all','res-fire-max','res-cold-max','res-ltng-max','res-pois-max','res-pois-len','pierce-fire','pierce-cold','pierce-ltng','pierce-pois','pierce-mag','pierce-dmg','extra-fire','extra-cold','extra-ltng','extra-pois','extra-mag','lifesteal','manasteal','dmg-to-mana','swing1','swing2','swing3','cast1','cast2','cast3','move1','move2','balance1','balance2','block','block1','block2','crush','deadly','openwounds','slow','dmg-demon','dmg-undead','att-demon','att-undead','mag%','gold%','addxp','cheap','ease','red-dmg%','abs-fire%','abs-cold%','abs-ltng%','abs-mag%']);
function skillName(par,skillById,skillLoc){if(!par)return'';let raw=par, n=Number(par);if(Number.isFinite(n)&&skillById.has(n))raw=skillById.get(n);return skillLoc.get(norm(raw))||strip(raw)}
function optionText(prop,par,min,max,ctx){prop=(prop||'').trim(); if(!prop)return''; let p=prop.toLowerCase(); let r=range(min,max), label=labels[p]||'';
 if(p==='skill'||p==='oskill'){let s=skillName(par,ctx.skillById,ctx.skillLoc);return `${s} ${p==='oskill'?'(직업 제한 없음) ':''}${r?plus(r):''}`.trim()}
 if(p==='charged'){let s=skillName(par,ctx.skillById,ctx.skillLoc);return `${s} 충전 (레벨 ${max||'?'} · ${Number(min)>0?min+'회':'아이템 레벨에 따라 충전 수 결정'})`}
 if(['hit-skill','att-skill','gethit-skill','death-skill','levelup-skill','kill-skill'].includes(p)){let s=skillName(par,ctx.skillById,ctx.skillLoc),when={'hit-skill':'타격 시','att-skill':'공격 시','gethit-skill':'피격 시','death-skill':'사망 시','levelup-skill':'레벨 상승 시','kill-skill':'적 처치 시'}[p];return `${when} ${Number(min)||5}% 확률로 ${max||'?'}레벨 ${s} 시전`}
 if(p==='skilltab'||p==='skilltab-war')return `기술 계열 +${r||max||min}${par?` (계열 ${par})`:''}`;
 if(p==='skill-rand')return `무작위 직업 기술 +${range(min,max)||par}`;
 if(p==='aura')return `${skillName(par,ctx.skillById,ctx.skillLoc)} 오라 (레벨 ${r})`;
 if(p==='randclassskill')return `무작위 직업 기술 +${r||'3'}`;
 if(p==='magdam-rand')return `무작위 원소 피해 보너스`;
 if(p==='dmg-pois'){return `독 피해 ${range(min,max)} 추가 (${par||'?'} 프레임 기준)`}
 if(p==='dmg-cold'){return `냉기 피해 ${range(min,max)} 추가${par?` · 지속 ${par} 프레임`:''}`}
 if(p==='nofreeze'||p==='ignore-ac'||p==='noheal'||p==='indestruct'||p==='ethereal'||p.startsWith('pierce-immunity-'))return label||'특수 효과';
 if(p==='knock')return '밀쳐내기';
 if(p==='freeze')return `대상 빙결 +${r}`;
 if(p==='half-freeze')return '빙결 지속시간 절반 감소';
 if(p==='sock')return `홈 ${r}개`;
 if(p==='rep-dur')return `내구도 자동 회복 (${par||r}초당 1)`;
 if(p==='rep-quant')return `수량 자동 회복 (${par||r}초당 1)`;
 if(label){let val=r; if(pct.has(p)&&val) val=val+'%'; if(['pierce-fire','pierce-cold','pierce-ltng','pierce-pois','pierce-mag','pierce-dmg'].includes(p)&&val&&!String(val).startsWith('-')) val='-'+val; else if(val&&!['slow','freeze','red-dmg','red-dmg%','ease'].includes(p)) val=plus(val); return `${label} ${val}`.trim()}
 return `기타 고유 효과 · ${strip(prop)} ${par?`(${strip(par)}) `:''}${r}`.trim();
}
function options(row,ctx){let out=[];for(let i=1;i<=12;i++){let s=optionText(row['prop'+i],row['par'+i],row['min'+i],row['max'+i],ctx);if(s)out.push(s)}return out}
function cat(base,code){let b=(base||'').toLowerCase();if(code==='rin')return'반지';if(code==='amu')return'목걸이';if(code==='jew'||code==='cjw')return'주얼';if(code?.startsWith('cm'))return'부적';if(/boots|greaves/.test(b))return'장화';if(/glove|gauntlet|bracer/.test(b))return'장갑';if(/belt|sash|coil/.test(b))return'벨트';if(/shield|monarch|ward|aegis|troll nest/.test(b))return'방패';if(/helm|cap|crown|mask|visage|tiara|diadem|circlet|spirit|pelt|visor/.test(b))return'투구';if(/armor|plate|mail|robe|shroud|fleece|hide|shell/.test(b))return'갑옷';if(/bow/.test(b))return'활';if(/crossbow/.test(b))return'석궁';if(/javelin|pilum|spear|trident|pike|lance/.test(b))return'창·투창';if(/poleaxe|voulge|scythe|halberd|thresher|cryptic axe|colossus voulge/.test(b))return'폴암';if(/staff/.test(b))return'지팡이';if(/wand/.test(b))return'완드';if(/scepter/.test(b))return'셉터';if(/orb|sphere|globe|shard/.test(b))return'오브';if(/grimoire|compendium|tome|text|codex|book/.test(b))return'악마술사 마법서';if(/dagger|dirk|kris|blade|mithril point/.test(b))return'단검';if(/sword|saber|scimitar|falchion|blade|claymore/.test(b))return'검';if(/axe|pick/.test(b))return'도끼';if(/mace|hammer|maul|club|flail|scourge|morning star|knout|truncheon/.test(b))return'둔기';return'기타'}
function mergeAliases(en,ko,base){let a=[ko,en,base];let m=U.manual[en];if(m?.aliases)a.push(...m.aliases);if(U.aliasExtra[en])a.push(...U.aliasExtra[en]);return [...new Set(a.filter(Boolean))]}
async function load(){let [ut,st,ij,sj]=await Promise.all([fetch(SRC.uniques).then(r=>{if(!r.ok)throw Error('unique source '+r.status);return r.text()}),fetch(SRC.skills).then(r=>r.ok?r.text():''),fetch(SRC.itemNames).then(r=>r.ok?r.json():[]),fetch(SRC.skillNames).then(r=>r.ok?r.json():[])]);let rows=tsv(ut);let skillRows=st?tsv(st):[],skillById=new Map();for(const s of skillRows){let id=Number(s.Id??s['*Id']??s.id),nm=s.skill||s.Skill||s['*skill'];if(Number.isFinite(id)&&nm)skillById.set(id,strip(nm))}let itemLoc=locMap(ij),skillLoc=locMap(sj),ctx={skillById,skillLoc};let selected=rows.filter(r=>r.index&&r.code&&String(r.disabled).trim()!=='1');
 // 실제 필터 결과 수를 그대로 공개하고 변환 누락 여부를 검증한다.
 let items=selected.map((r,idx)=>{let en=strip(r.index);let keyForLoc=en==='Unique Warlock Helm'?"Hellwarden's Will":en;let ko=U.newKo[en]||itemLoc.get(norm(keyForLoc))||U.manual[en]?.ko||en;let baseEn=strip(r['*ItemName']||'');let baseKo=U.newBase[baseEn]||itemLoc.get(norm(baseEn))||baseEn;let manual=U.manual[en];let opts=manual?.options?.length?manual.options:options(r,ctx);let req=r['lvl req']||manual?.req||'-';let category=manual?.cat||cat(baseEn,r.code);let aliases=mergeAliases(en,ko,baseKo);let id='u-'+slug(en)+'-'+(r['*ID']||idx);return{id,en,ko,baseEn,baseKo,req,category,options:opts,aliases,rowId:Number(r['*ID'])}});return{items,count:items.length,valid:items.length===selected.length&&items.every(x=>x.en&&x.ko&&x.baseEn),source:SRC}}
let cache=null;async function get(){if(!cache)cache=load();return cache}
window.SKRUniqueDB={get,norm,slug};
window.SKR_UNIQUE_SEARCH={async load(){let d=await get();return d.items.map(x=>({type:'유니크',title:x.ko,aliases:x.aliases,url:`uniques.html?q=${encodeURIComponent(x.ko)}#${x.id}`}))}};
})();
