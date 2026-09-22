(()=>{
const SRC={
 items:'/data/d2r/setitems.json',
 sets:'/data/d2r/sets.json',
 itemNames:'/data/d2r/item-names.json',
 skillNames:'/data/d2r/skill-names.json'
};
const strip=s=>String(s??'').replace(/ÿc[0-9!"+<;.*]/g,'').replace(/\\92/g,"'").trim();
const norm=s=>strip(s).toLowerCase().replace(/[’‘`]/g,"'").replace(/[^0-9a-z가-힣]+/g,'');
const slug=s=>norm(s).replace(/[^0-9a-z가-힣]/g,'-')||'set';
function locMap(arr){const m=new Map();for(const x of arr||[]){const ko=strip(x.koKR);if(!ko)continue;for(const k of [x.Key,x.enUS])if(k)m.set(norm(k),ko)}return m}
function range(a,b){a=String(a??'').trim();b=String(b??'').trim();if(!a&&!b)return'';if(!b||a===b)return a;return `${a}~${b}`}
const L={
 str:'힘',dex:'민첩',vit:'활력',enr:'마력','all-stats':'모든 능력치',hp:'생명력',mana:'마나','hp%':'최대 생명력','mana%':'최대 마나',stam:'최대 지구력','regen-stam':'지구력 회복 속도',regen:'생명력 회복','regen-mana':'마나 재생',
 att:'명중률','att%':'명중률 보너스',ac:'방어력','ac%':'방어력 증가','ac/lvl':'방어력','att/lvl':'명중률',dmg:'피해','dmg%':'피해 증가','dmg-min':'최소 피해','dmg-max':'최대 피해','dmg-norm':'피해','dmg/lvl':'피해','dmg-max/lvl':'최대 피해','dmg-min/lvl':'최소 피해',
 'dmg-fire':'화염 피해','dmg-cold':'냉기 피해','dmg-ltng':'번개 피해','dmg-mag':'마법 피해','dmg-pois':'독 피해','dmg-fire/lvl':'화염 피해','dmg-cold/lvl':'냉기 피해','dmg-ltng/lvl':'번개 피해','dmg-mag/lvl':'마법 피해',
 'res-fire':'화염 저항','res-cold':'냉기 저항','res-ltng':'번개 저항','res-pois':'독 저항','res-mag':'마법 저항','res-all':'모든 저항','res-fire-max':'최대 화염 저항','res-cold-max':'최대 냉기 저항','res-ltng-max':'최대 번개 저항','res-pois-max':'최대 독 저항','res-pois-len':'독 지속시간 감소',
 lifesteal:'적중당 생명력 훔침',manasteal:'적중당 마나 훔침','dmg-to-mana':'받는 피해의 마나 전환',swing3:'공격 속도',cast1:'시전 속도',cast3:'시전 속도',move3:'달리기/걷기 속도',balance3:'타격 회복 속도',block:'막기 확률',block2:'막기 속도',
 crush:'강타 확률',deadly:'치명적 공격',openwounds:'상처 악화 확률',knock:'밀쳐내기',slow:'대상 감속',freeze:'대상 빙결',nofreeze:'빙결되지 않음','half-freeze':'빙결 지속시간 절반 감소','ignore-ac':'대상 방어력 무시','noheal':'괴물 회복 저지','dmg-demon':'악마에게 주는 피해','dmg-undead':'언데드에게 주는 피해','att-demon':'악마에 대한 명중률','att-undead':'언데드에 대한 명중률',
 'mag%':'마법 아이템 발견 확률','mag%/lvl':'마법 아이템 발견 확률','gold%':'괴물에게서 얻는 금화',light:'시야',ease:'착용 조건',sock:'홈',indestruct:'파괴 불가','rep-dur':'내구도 자동 회복','red-dmg':'피해 감소','red-dmg%':'받는 물리 피해 감소','red-mag':'마법 피해 감소',thorns:'공격자가 받는 피해',pierce:'관통 공격',
 allskills:'모든 기술',ama:'아마존 기술',sor:'원소술사 기술',nec:'강령술사 기술',pal:'성기사 기술',bar:'야만용사 기술',dru:'드루이드 기술',ass:'암살자 기술',war:'악마술사 기술'
};
const PCT=new Set(['ac%','att%','dmg%','res-fire','res-cold','res-ltng','res-pois','res-mag','res-all','res-fire-max','res-cold-max','res-ltng-max','res-pois-max','res-pois-len','lifesteal','manasteal','dmg-to-mana','swing3','cast1','cast3','move3','balance3','block','block2','crush','deadly','openwounds','slow','dmg-demon','dmg-undead','att-demon','att-undead','mag%','gold%','ease','red-dmg%','pierce']);
const MANUAL_KO={
 "Bane's Garments":'재앙의 복장',"Bane's Oathmaker":'재앙의 맹약자',"Bane's Wraithskin":'재앙의 망령껍질',"Bane's Authority":'재앙의 권위',
 "Horazon's Splendor":'호라존의 광채',"Horazon's Countenance":'호라존의 표정',"Horazon's Dominion":'호라존의 지배',"Horazon's Hold":'호라존의 장악',"Horazon's Legacy":'호라존의 유산',"Horazon's Secrets":'호라존의 비밀',
 "Warlord's Glory":'군장의 영예',"Warlord's Conquest":'군장의 정복',"Warlord's Lust":'군장의 욕정',"Warlord's Mantle":'군장의 책임',"Warlord's Crushers":'군장의 분쇄자',"Warlord's Authority":'군장의 권위'
};
const SET_ALIAS={
 "Tal Rasha's Wrappings":['탈셋','탈라샤셋','탈라샤','탈세트'],Immortal_King:['임모셋'],
 "Immortal King":['임모셋','임모틀킹','불멸왕셋','불멸왕','ik셋','ik'],"Natalya's Odium":['나탈셋','나탈리아셋','나탈랴셋','나탈'],"M'avina's Battle Hymn":['마비나셋','마비셋','마비나'],"Trang-Oul's Avatar":['트랑셋','트랑울셋','트래그울셋','트랑'],"Griswold's Legacy":['그리스셋','그리셋','그리스월드셋'],"Aldur's Watchtower":['알두르셋','알더셋','알두르'],"Orphan's Call":['오펀셋','고아셋'],"The Disciple":['디사이플셋','제자셋'],"Cow King's Leathers":['카우셋','카우킹셋','소왕셋'],"Naj's Ancient Set":['나즈셋','나즈'],"Sazabi's Grand Tribute":['사자비셋','사자비'],"Bul-Kathos' Children":['불카셋','불카토스셋','불카'],"Bane's Garments":['재앙셋','베인셋'],"Horazon's Splendor":['호라존셋','호라존세트'],"Warlord's Glory":['군장셋','워로드셋'],"Sigon's Complete Steel":['시곤셋','시곤']
};
const ITEM_ALIAS={
 "Tal Rasha's Howling Wind":['탈갑','탈라샤갑','탈갑옷'],"Tal Rasha's Adjudication":['탈목','탈아뮬','탈목걸이'],"Tal Rasha's Lidless Eye":['탈봉','탈오브','탈무기'],"Tal Rasha's Fire-Spun Cloth":['탈벨','탈벨트'],"Tal Rasha's Horadric Crest":['탈뚜','탈뚜껑','탈머리'],
 "Immortal King's Will":['임모뚜','불멸왕뚜','임모머리'],"Immortal King's Stone Crusher":['임모망치','임모마울','불멸왕망치'],"Immortal King's Soul Cage":['임모갑','임모갑옷','불멸왕갑'],"Immortal King's Forge":['임모장','임모장갑'],"Immortal King's Pillar":['임모부츠','임모신발'],"Immortal King's Detail":['임모벨','임모벨트'],
 "Guillaume's Face":['기욤','기욤뚜','기욤뚜껑','길리엄','길리엄뚜'],"Laying of Hands":['안수','고무장갑','레잉오브핸즈'],"Wilhelm's Pride":['윌헬름벨트','발헬름벨트','오펀벨트'],"Magnus' Skin":['마그누스장갑','마그누스','오펀장갑'],"Whitstan's Guard":['위트스탄방패','위트누스방패','위트스탄','오펀방패'],
 "Trang-Oul's Claws":['트랑장','트랑장갑'],"Trang-Oul's Girth":['트랑벨','트랑벨트'],"Trang-Oul's Wing":['트랑방패','트랑윙'],"Trang-Oul's Guise":['트랑뚜','트랑머리'],"Trang-Oul's Scales":['트랑갑','트랑갑옷'],
 "Natalya's Soul":['나탈부츠','나탈신발'],"Natalya's Mark":['나탈클러','나탈무기'],"Natalya's Totem":['나탈뚜','나탈머리'],"Natalya's Shadow":['나탈갑','나탈갑옷'],
 "Aldur's Advance":['알두르부츠','알더부츠'],"Aldur's Gauntlet":['알두르무기','알더무기'],"M'avina's Caster":['마비나활','마비활'],"M'avina's True Sight":['마비나다뎀','마비나뚜'],"M'avina's Embrace":['마비나갑','마비나갑옷'],"M'avina's Tenet":['마비나벨트','마비벨트'],"M'avina's Icy Clutch":['마비나장갑','마비장갑'],
 "Angelic Halo":['엔젤링','천사링'],"Angelic Wings":['엔젤목','천사목','엔젤아뮬'],"Death's Guard":['데쓰벨트','데스벨트'],"Cathan's Seal":['캐탄링'],"Naj's Puzzler":['나즈봉','나즈스태프'],"Naj's Light Plate":['나즈갑','나즈갑옷'],
 "Horazon's Hold":['호라장','호라존장','호라존장갑'],"Horazon's Legacy":['호라부츠','호라존부츠','호라신발'],"Horazon's Secrets":['호라방패','호라존방패','호라책','호라존책'],"Bane's Oathmaker":['재앙단검','베인단검'],"Bane's Wraithskin":['재앙갑','베인갑'],"Bane's Authority":['재앙벨트','베인벨트']
};
function perLevel(label,par){const n=Number(par);return Number.isFinite(n)?`${label} +${+(n/8).toFixed(3)} (캐릭터 레벨당)`: `${label} (캐릭터 레벨 비례)`}
function opt(prop,par,min,max){let p=strip(prop).toLowerCase();if(!p)return'';let r=range(min,max),label=L[p];
 if(p.endsWith('/lvl'))return perLevel(label||p.replace('/lvl',''),par||min||max);
 if(p==='oskill')return `${strip(par)} +${r} (직업 제한 없음)`;
 if(p==='aura')return `${strip(par)} 오라 (레벨 ${r})`;
 if(p==='skill')return `${strip(par)} +${r}`;
 if(p==='skilltab')return `기술 계열 +${r}${par?` (계열 ${par})`:''}`;
 if(p==='state')return String(par).includes('fullset')?'완성 세트 외형 효과':'특수 상태 효과';
 if(p==='dmg-pois')return `독 피해 ${r} 추가${par?` (${par} 프레임)`:''}`;
 if(p==='dmg-cold')return `냉기 피해 ${r} 추가${par?` · 지속 ${par} 프레임`:''}`;
 if(['nofreeze','indestruct','ignore-ac','noheal'].includes(p))return label||p;
 if(p==='sock')return `홈 ${r}개`;
 if(p==='rep-dur')return `내구도 자동 회복`;
 if(p==='knock')return '밀쳐내기';
 if(p==='freeze')return `대상 빙결 +${r}`;
 if(p==='half-freeze')return '빙결 지속시간 절반 감소';
 if(label){let v=r;if(PCT.has(p)&&v)v+='%';if(v&&!['slow','red-dmg','ease'].includes(p)&&!String(v).startsWith('-'))v='+'+v;return `${label} ${v}`.trim()}
 return `기타 효과 · ${strip(prop)}${par?` (${strip(par)})`:''}${r?` ${r}`:''}`;
}
function props(row,prefix='prop',parPrefix='par',minPrefix='min',maxPrefix='max',maxN=12){let a=[];for(let i=1;i<=maxN;i++){let s=opt(row[prefix+i],row[parPrefix+i],row[minPrefix+i],row[maxPrefix+i]);if(s)a.push(s)}return a}
function itemPartials(row){let out=[];for(let i=1;i<=5;i++){for(const sfx of ['a','b']){let s=opt(row[`aprop${i}${sfx}`],row[`apar${i}${sfx}`],row[`amin${i}${sfx}`],row[`amax${i}${sfx}`]);if(s)out.push({pieces:i+1,text:s})}}return out}
function setPartials(row){let out=[];for(let i=2;i<=5;i++){for(const sfx of ['a','b']){let s=opt(row[`PCode${i}${sfx}`],row[`PParam${i}${sfx}`],row[`PMin${i}${sfx}`],row[`PMax${i}${sfx}`]);if(s)out.push({pieces:i,text:s})}}return out}
function full(row){let out=[];for(let i=1;i<=8;i++){let s=opt(row[`FCode${i}`],row[`FParam${i}`],row[`FMin${i}`],row[`FMax${i}`]);if(s)out.push(s)}return out}
function category(base,code){let b=strip(base).toLowerCase();if(code==='rin')return'반지';if(code==='amu')return'목걸이';if(/boots|greaves/.test(b))return'장화';if(/glove|gauntlet/.test(b))return'장갑';if(/belt|sash/.test(b))return'벨트';if(/shield|ward|aegis|codex/.test(b))return'방패';if(/helm|cap|crown|mask|guise|visage|diadem|circlet/.test(b))return'투구';if(/armor|plate|mail|robe|shroud|skin|hide|fleece/.test(b))return'갑옷';if(/bow/.test(b))return'활';if(/sword|sabre|blade/.test(b))return'검';if(/axe/.test(b))return'도끼';if(/mace|hammer|maul|club|flail|star/.test(b))return'둔기';if(/staff/.test(b))return'지팡이';if(/wand/.test(b))return'완드';if(/dagger|knife|kris/.test(b))return'단검';return'기타'}
async function get(){if(get.cache)return get.cache;get.cache=(async()=>{const [itemsJ,setsJ,names]=await Promise.all([fetch(SRC.items).then(r=>{if(!r.ok)throw Error('setitems '+r.status);return r.json()}),fetch(SRC.sets).then(r=>{if(!r.ok)throw Error('sets '+r.status);return r.json()}),fetch(SRC.itemNames).then(r=>r.ok?r.json():[])]);const loc=locMap(names),items=Object.values(itemsJ).filter(r=>r&&r.index&&r.set&&r.item);const setRows=Object.values(setsJ).filter(r=>r&&r.index);const setBy=new Map(setRows.map(x=>[x.index,x]));const built=items.map((r,idx)=>{const en=strip(r.index),setEn=strip(r.set),baseEn=strip(r['*ItemName']);const ko=MANUAL_KO[en]||loc.get(norm(en))||en,setKo=MANUAL_KO[setEn]||loc.get(norm(setEn))||setEn,baseKo=loc.get(norm(baseEn))||baseEn;const aliases=[ko,en,baseKo,baseEn,setKo,setEn,...(SET_ALIAS[setEn]||[]),...(ITEM_ALIAS[en]||[])];return{id:`setitem-${slug(en)}-${r['*ID']??idx}`,en,ko,setEn,setKo,baseEn,baseKo,req:r['lvl req']??'-',category:category(baseEn,r.item),options:props(r),partial:itemPartials(r),aliases:[...new Set(aliases.filter(Boolean))],availability:setEn==="Warlord's Glory"?'데이터 존재 · 자연 드롭 불가':'획득 가능',season15:!!r.firstLadderSeason};});const groups=[];for(const [setEn,list] of Object.entries(Object.groupBy?Object.groupBy(built,x=>x.setEn):built.reduce((a,x)=>((a[x.setEn]??=[]).push(x),a),{}))){const sr=setBy.get(setEn)||{},setKo=MANUAL_KO[setEn]||loc.get(norm(setEn))||setEn;groups.push({id:`set-${slug(setEn)}`,setEn,setKo,aliases:[...new Set([setKo,setEn,...(SET_ALIAS[setEn]||[])])],items:list.sort((a,b)=>Number(a.req)-Number(b.req)),partial:setPartials(sr),full:full(sr),classCode:sr.UIClass||'',availability:setEn==="Warlord's Glory"?'데이터 존재 · 자연 드롭 불가':'획득 가능'});}groups.sort((a,b)=>a.setKo.localeCompare(b.setKo,'ko'));return{items:built,groups,itemCount:built.length,setCount:groups.length,source:SRC};})();return get.cache}
window.SKRSetDB={get,norm,slug};
window.SKR_SET_SEARCH={async load(){let d=await get(),out=[];for(const g of d.groups){out.push({type:'세트',title:g.setKo,aliases:g.aliases,url:`sets.html?q=${encodeURIComponent(g.setKo)}#${g.id}`});for(const x of g.items)out.push({type:'세트 아이템',title:x.ko,aliases:x.aliases,url:`sets.html?q=${encodeURIComponent(x.ko)}#${x.id}`})}return out}};
})();
