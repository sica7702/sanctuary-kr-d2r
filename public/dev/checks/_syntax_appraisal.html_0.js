
const DB=window.SKR_APPRAISAL_DB;let active=DB.categories[0].id;
const $=x=>document.getElementById(x);function esc(s){return String(s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}
const BUILDS={
 '아마존':['자벨마 PvM','잽마 PvP','활마 물리','텔레아마 PvP'],
 '소서리스':['화염','냉기','번개','에쉴 PvP'],
 '네크로맨서':['본넥 PvP','독넥','소환','PvM 캐스터'],
 '팔라딘':['해머딘','FOH','질딘 PvP','슴딘','BvC 상대 PvP'],
 '야만용사':['BvB','BvC','휠윈드 PvM','삥바바','싱어'],
 '드루이드':['윈드 PvP','화염','퓨리 늑드루','소환'],
 '어쌔신':['트랩씬','WW씬','하이브리드 PvP','무술 PvM'],
 '악마술사':['혼돈','기괴','악마']
};
const SKILL_TREES={
 '아마존':['활과 쇠뇌','지속 효과와 마법','투창과 창'],
 '소서리스':['화염','번개','냉기'],
 '네크로맨서':['저주','독과 뼈','소환'],
 '팔라딘':['전투 기술','공격 오라','방어 오라'],
 '야만용사':['전투 기술','전투 숙련','함성'],
 '드루이드':['원소','변신','소환'],
 '어쌔신':['무술','그림자 단련','덫'],
 '악마술사':['혼돈','기괴','악마']
};
const PROFILE_FIELDS={
  ring:['itemtype','mode','realm'], boots:['itemtype','purpose','mode','realm'], belt:['itemtype','purpose','mode','realm'], crossbow:['build','mode','realm'],
  amulet:['itemtype','char','build','mode','realm'], circlet:['char','build','mode','realm'], gloves:['itemtype','char','build','mode','realm'], classarmor:['char','build','mode','realm'], melee:['char','build','mode','realm'], polearm:['char','build','mode','realm'], wand:['char','build','mode','realm'], caster:['char','build','mode','realm'],
  bow:['build','mode','realm'], jav:['build','mode','realm'], claw:['build','mode','realm'], orb:['build','mode','realm']
};
const FIXED_CHAR={bow:'아마존',crossbow:'아마존',jav:'아마존',claw:'어쌔신',orb:'소서리스'};
const PROFILE_DEF={
 itemtype:['s','itemtype','아이템 유형',['레어','캐스터 크래프트','블러드 크래프트','힛파워 크래프트','세이프티 크래프트']], char:['s','char','직업',Object.keys(BUILDS)], build:['s','build','빌드',BUILDS['아마존']],
 purpose:['s','purpose','세부 용도',['일반','PvP','삥바바','LLD/MLD']], mode:['s','mode','용도',['PvM','PvP','LLD/MLD']], realm:['s','realm','시장',['스탠/Non-Ladder','래더']]
};
const BASE_MELEE=['버서커 액스','에틴 액스','워 스파이크','스몰 크레센트','레전더리 말렛','데빌 스타','리인포스드 메이스','타이런트 클럽','미지컬 소드','콜로서스 소드','하이드라 엣지','아타간','세라프 로드','캐듀시어스','기타'];
const BASE_BOW=['메이트리어컬 보우','그랜드 메이트런 보우','다이아몬드 보우','쉐도우 보우','블레이드 보우','그레이트 보우','기타'];
const BASE_XBOW=['고르곤 크로스보우','콜로서스 크로스보우','데몬 크로스보우','기타'];
const BASE_CLAW=['그레이터 탤런','루닉 탤런','페럴 클러','수웨이야','워 피스트','리스트 소드','시저스 수웨이야','기타'];

const BASE_META={
 '버서커 액스':{wsm:0,range:'+2',req:64,str:138,dex:59,sockets:6,kind:'1H'},
 '워 스파이크':{wsm:-10,range:'+1',req:59,str:133,dex:54,sockets:6,kind:'1H'},
 '스몰 크레센트':{wsm:10,range:'+1',req:45,str:115,dex:83,sockets:4,kind:'1H'},
 '레전더리 말렛':{wsm:20,range:'+1',req:61,str:189,dex:0,sockets:4,kind:'1H'},
 '미지컬 소드':{wsm:0,range:'+1',req:66,str:147,dex:124,sockets:3,kind:'1H'},
 '아타간':{wsm:-20,range:'+0',req:45,str:138,dex:95,sockets:2,kind:'1H'},
 '세라프 로드':{wsm:10,range:'+1',req:57,str:108,dex:69,sockets:3,kind:'1H'},
 '메이트리어컬 보우':{wsm:-10,range:'원거리',req:39,str:87,dex:187,sockets:5,kind:'bow'},
 '그랜드 메이트런 보우':{wsm:10,range:'원거리',req:58,str:108,dex:152,sockets:5,kind:'bow'},
 '그레이터 탤런':{wsm:-30,range:'+1',req:37,str:79,dex:79,sockets:3,kind:'claw'},
 '루닉 탤런':{wsm:-30,range:'+1',req:60,str:115,dex:115,sockets:3,kind:'claw'},
 '페럴 클러':{wsm:-20,range:'+1',req:58,str:113,dex:113,sockets:3,kind:'claw'},
 '수웨이야':{wsm:0,range:'+1',req:44,str:99,dex:99,sockets:3,kind:'claw'},
 '워 피스트':{wsm:10,range:'+1',req:51,str:108,dex:108,sockets:2,kind:'claw'},
 '리스트 소드':{wsm:-10,range:'+1',req:46,str:105,dex:105,sockets:3,kind:'claw'},
 '시저스 수웨이야':{wsm:0,range:'+1',req:64,str:118,dex:118,sockets:3,kind:'claw'}
};
const WW_ITEM_IAS={20:[[0,8],[9,7],[26,6],[54,5],[125,4]],10:[[0,7],[13,6],[35,5],[89,4]],5:[[0,7],[7,6],[27,5],[75,4]],0:[[0,7],[2,6],[20,5],[63,4]],'-10':[[0,6],[8,5],[42,4]],'-20':[[0,5],[26,4]],'-30':[[0,5],[13,4]]};
function baseInfo(){const b=val('base'),m=BASE_META[b];if(!m)return '';return `베이스: <b>${esc(b)}</b> · 기본속도(WSM) <b>${m.wsm}</b> · rangeadder <b>${m.range}</b> · 기본 요구레벨 <b>${m.req}</b> · 힘/민첩 <b>${m.str}/${m.dex}</b> · 베이스 최대소켓 <b>${m.sockets}</b>`}
function frameInfo(){const b=val('base'),m=BASE_META[b],build=val('build');if(!m)return '';
 const total=val('ias')+val('offias');
 if((build==='BvB'||build==='BvC'||build==='휠윈드 PvM'||build==='WW씬')&&m.kind==='1H'){
   if(val('skillias')!==0)return `프레임: 스킬 IAS ${val('skillias')}% 입력됨 → D2R 2.4.3+ 휠윈드는 스킬 IAS/슬로우까지 영향하므로 단순 표로 확정하지 않음.`;
   const t=WW_ITEM_IAS[String(m.wsm)]||WW_ITEM_IAS[m.wsm];if(t){let f=t[0][1];for(const [need,fr] of t)if(total>=need)f=fr;return `휠윈드 참고: 총 장비 IAS ${total}% / WSM ${m.wsm} → <b>${f} FPA</b> (1H·2H소드 계열, 스킬 IAS 0 조건).`;}
 }
 if(build==='활마 물리'&&b==='메이트리어컬 보우'&&val('skillias')===0){const t=[[0,12],[8,11],[22,10],[42,9],[75,8],[142,7]];let f=12;for(const [need,fr] of t)if(total>=need)f=fr;return `메이트리어컬 보우 일반 공격 참고: IAS ${total}% → <b>${f} FPA</b> (Fanaticism/스킬 IAS 0, Strafe·Multi는 별도 계산).`;}
 if(build==='트랩씬'&&m.kind==='claw'&&val('skillias')===0){if(m.wsm===-30)return `트랩 설치속도 참고: Fade/BoS 미사용 기준 -30 WSM 클러는 약 <b>42 IAS</b>가 대표 최대속도 목표선으로 쓰임.`;if(m.wsm===-20)return `트랩 설치속도 참고: Fade/BoS 미사용 기준 -20 WSM 클러는 약 <b>63 IAS</b>가 대표 최대속도 목표선으로 쓰임.`;}
 return '프레임: 현재 선택 빌드는 오라 레벨·스킬·쌍수 WSM 등 추가 변수가 있어 자동 확정 대신 베이스 속도만 반영.';
}

const INPUTS={
ring:[['n','fcr','패캐 %'],['n','ar','명중률(어레)'],['n','str','힘'],['n','dex','민첩'],['n','energy','마력'],['n','life','생명력'],['n','mana','마나'],['n','rep','생명력 회복(리플)'],['n','ll','생명력 훔침 %'],['n','ml','마나 훔침 %'],['n','mpk','적 처치 시 마나(마상)'],['n','mregen','마나 재생(마쟁) % · 캐스터 크랩 전용'],['n','allres','모든 저항'],['n','fire','화염 저항 추가분(올레 제외)'],['n','light','번개 저항 추가분(올레 제외)'],['n','cold','냉기 저항 추가분(올레 제외)'],['n','poison','독 저항 추가분(올레 제외)'],['n','mindmg','최소 피해'],['n','maxdmg','최대 피해'],['n','mf','매찬 %'],['n','gf','삥 / 적에게서 얻는 금화 % 증가'],['n','plr','독 지속시간 감소 %'],['n','dr','피해 감소(정수)'],['n','mdr','마법 피해 감소(정수)'],['n','maxstam','최대 지구력'],['n','lightradius','시야(빛 반경) +']],
amulet:[['n','classskill','직업 전체 기술 +'],['st','skilltree_name','스킬트리 종류'],['n','skilltab','선택 스킬트리 +'],['n','fcr','패캐 %'],['n','str','힘'],['n','dex','민첩'],['n','energy','마력'],['n','life','생명력'],['n','mana','마나'],['n','rep','생명력 회복(리플)'],['n','ll','생명력 훔침 %'],['n','ml','마나 훔침 %'],['n','mregen','마나 재생(마쟁) % · 캐스터 크랩 고정옵'],['n','allres','모든 저항'],['n','fire','화염 저항 추가분(올레 제외)'],['n','light','번개 저항 추가분(올레 제외)'],['n','cold','냉기 저항 추가분(올레 제외)'],['n','poison','독 저항 추가분(올레 제외)'],['n','mf','매찬 %'],['n','gf','삥 / 적에게서 얻는 금화 % 증가'],['n','mindmg','최소 피해'],['n','maxdmg','최대 피해'],['n','plr','독 지속시간 감소 %'],['n','dr','피해 감소(정수)'],['n','mdr','마법 피해 감소(정수)'],['n','dtm','받는 피해의 %만큼 마나 회복'],['n','ar','명중률(어레)'],['n','maxstam','최대 지구력'],['n','lightradius','시야(빛 반경) +']],
circlet:[['n','classskill','직업 전체 기술 +'],['st','skilltree_name','스킬트리 종류'],['n','skilltab','선택 스킬트리 +'],['n','fcr','패캐 %'],['n','frw','달려 %'],['n','sockets','소켓 수'],['n','str','힘'],['n','dex','민첩'],['n','energy','마력'],['n','life','생명력'],['n','mana','마나'],['n','rep','생명력 회복(리플)'],['n','ll','생명력 훔침 %'],['n','ml','마나 훔침 %'],['n','ar','명중률(어레)'],['n','ed','피해 증가(ED) %'],['n','mindmg','최소 피해'],['n','maxdmg','최대 피해'],['n','mpk','적 처치 시 마나(마상)'],['n','allres','모든 저항'],['n','fire','화염 저항 추가분(올레 제외)'],['n','light','번개 저항 추가분(올레 제외)'],['n','cold','냉기 저항 추가분(올레 제외)'],['n','poison','독 저항 추가분(올레 제외)'],['n','mf','매찬 %'],['n','plr','독 지속시간 감소 %'],['n','dr','피해 감소(정수)'],['n','mdr','마법 피해 감소(정수)'],['n','visionary','레벨 비례 명중률 % (비전)'],['n','maxstam','최대 지구력']],
gloves:[['st','skilltree_name','스킬트리 종류'],['n','skilltab','선택 스킬트리 +'],['n','ias','공격속도 %'],['n','str','힘'],['n','dex','민첩'],['n','ar','명중률(어레)'],['n','mana','마나'],['n','rep','생명력 회복(리플)'],['n','ll','생명력 훔침 %'],['n','ml','마나 훔침 %'],['n','fire','화염 저항'],['n','light','번개 저항'],['n','cold','냉기 저항'],['n','poison','독 저항'],['n','mf','매찬 %'],['n','gf','삥 / 적에게서 얻는 금화 % 증가']],
boots:[['n','frw','달려 %'],['n','fhr','패힛 %'],['n','dex','민첩'],['n','mana','마나'],['n','rep','생명력 회복(리플)'],['n','maxstam','최대 지구력'],['n','stamregen','지구력 회복 %'],['n','eddef','방어력 증가 %'],['n','fire','화염 저항'],['n','light','번개 저항'],['n','cold','냉기 저항'],['n','poison','독 저항'],['n','gf','삥 / 적에게서 얻는 금화 % 증가'],['n','mf','매찬 %']],
belt:[['n','fhr','패힛 %'],['n','str','힘'],['n','life','생명력'],['n','mana','마나'],['n','rep','생명력 회복(리플)'],['n','maxstam','최대 지구력'],['n','eddef','방어력 증가 %'],['n','fire','화염 저항'],['n','light','번개 저항'],['n','cold','냉기 저항'],['n','poison','독 저항'],['n','gf','삥 / 적에게서 얻는 금화 % 증가']],
classarmor:[['n','classskill','직업 전체 기술 +'],['st','skilltree_name','스킬트리 종류'],['n','skilltab','선택 스킬트리 +'],['t','main_name','핵심 스태프모드 스킬명'],['n','staff1','핵심 스태프모드 +'],['t','support_name','보조 스태프모드 스킬명'],['n','staff2','보조 스태프모드 +'],['n','ed','방어력 증가 %'],['n','sockets','소켓 수'],['n','allres','자동옵/모든 저항'],['c','eth','에테리얼'],['c','repair','내구도 자동 회복'],['c','block','쌍패/블럭 핵심옵 보유']],
melee:[['s','base','베이스',BASE_MELEE],['n','offias','장비 외 공속(무기 외 IAS) %'],['n','skillias','스킬 공속 보정 %'],['n','ed','피해 증가(ED) %'],['n','ias','공격속도 %'],['n','ar','추가 명중률'],['n','mindmg','최소 피해'],['n','maxdmg','최대 피해'],['n','ll','생명력 훔침 %'],['n','ml','마나 훔침 %'],['n','sockets','소켓 수'],['c','fools','풀스(Fool\'s)'],['c','eth','에테리얼'],['c','repair','내구도 자동 회복'],['c','amp','앰플(피해 증폭)']],
bow:[['s','base','활 베이스',BASE_BOW],['n','offias','무기 외 IAS %'],['n','skillias','오라/스킬 공속 보정 %'],['n','classskill','아마존 전체 기술 +'],['st','skilltree_name','스킬트리 종류'],['n','skilltab','선택 스킬트리 +'],['n','ed','피해 증가(ED) %'],['n','ias','공격속도 %'],['n','ar','명중률'],['n','mindmg','최소 피해'],['n','maxdmg','최대 피해'],['n','ll','생명력 훔침 %'],['n','ml','마나 훔침 %'],['n','sockets','소켓 수'],['c','fools','풀스(Fool\'s)'],['c','amp','앰플(피해 증폭)']],
crossbow:[['s','base','쇠뇌 베이스',BASE_XBOW],['n','offias','무기 외 IAS %'],['n','skillias','오라/스킬 공속 보정 %'],['n','classskill','아마존 전체 기술 +'],['st','skilltree_name','스킬트리 종류'],['n','skilltab','선택 스킬트리 +'],['n','ed','피해 증가(ED) %'],['n','ias','공격속도 %'],['n','ar','명중률'],['n','mindmg','최소 피해'],['n','maxdmg','최대 피해'],['n','ll','생명력 훔침 %'],['n','ml','마나 훔침 %'],['n','sockets','소켓 수'],['c','fools','풀스(Fool\'s)'],['c','amp','앰플(피해 증폭)']],
jav:[['n','classskill','아마존 전체 기술 +'],['st','skilltree_name','스킬트리 종류'],['n','skilltab','선택 스킬트리 +'],['n','ias','공격속도 %'],['n','ed','피해 증가(ED) %'],['n','ar','명중률'],['n','ll','생명력 훔침 %'],['n','ml','마나 훔침 %'],['c','replenish','수량 자동 회복'],['c','fools','풀스(Fool\'s)'],['c','eth','에테리얼']],
polearm:[['s','base','무기군',['아마존 스피어','스피어','폴암']],['n','offias','무기 외 IAS %'],['n','skillias','스킬 공속 보정 %'],['n','ed','피해 증가(ED) %'],['n','ias','공격속도 %'],['n','ar','추가 명중률'],['n','ll','생명력 훔침 %'],['n','ml','마나 훔침 %'],['c','fools','풀스(Fool\'s)'],['c','eth','에테리얼'],['c','repair','내구도 자동 회복'],['c','amp','앰플']],
claw:[['s','base','클러 베이스',BASE_CLAW],['n','offias','무기 외 IAS %'],['n','skillias','폭발적인 속도 등 스킬 IAS %'],['n','classskill','어쌔신 전체 기술 +'],['st','skilltree_name','스킬트리 종류'],['n','skilltab','선택 스킬트리 +'],['n','ias','공격속도 %'],['n','ed','피해 증가(ED) %'],['n','main','번개 파수기 등 핵심 스태프모드 +'],['n','support','마인드블라스트/죽음파수기/블레이드실드 등 +'],['n','sockets','소켓 수'],['c','fools','풀스'],['c','eth','에테리얼'],['c','repair','내회']],
orb:[['n','classskill','소서리스 전체 기술 +'],['st','skilltree_name','스킬트리 종류'],['n','skilltab','선택 스킬트리 +'],['n','fcr','패캐 %'],['t','main_name','핵심 스태프모드 스킬명'],['n','main','핵심 스태프모드 +'],['t','support_name','보조 스태프모드 스킬명'],['n','support','보조 스태프모드 +'],['n','sockets','소켓 수'],['n','mana','마나'],['n','energy','마력'],['n','allres','모든 저항'],['n','fire','화염 저항'],['n','light','번개 저항'],['n','cold','냉기 저항'],['n','poison','독 저항'],['n','dtm','받는 피해의 %만큼 마나 회복'],['n','mdr','마법 피해 감소']],
wand:[['s','ctype','무기 종류',['네크 완드','팔라 셉터','악마술사 나이프','악마술사 그리모어']],['n','classskill','직업 전체 기술 +'],['st','skilltree_name','스킬트리 종류'],['n','skilltab','선택 스킬트리 +'],['n','fcr','패캐 %'],['t','main_name','핵심 스태프모드 스킬명'],['n','main','핵심 스태프모드 +'],['t','support_name','보조/유틸 스태프모드 스킬명'],['n','support','보조/유틸 스태프모드 +'],['n','sockets','소켓 수'],['n','ed','물리형 ED %'],['n','ias','물리형 IAS %'],['n','ll','생명력 훔침 %'],['n','ml','마나 훔침 %']],
caster:[['s','ctype','무기 종류',['소서 오브','네크 완드','팔라 셉터','어쌔 클러','악마술사 나이프','악마술사 그리모어']],['n','classskill','직업 전체 기술 +'],['st','skilltree_name','스킬트리 종류'],['n','skilltab','선택 스킬트리 +'],['n','fcr','패캐 %'],['n','ias','공격속도 %'],['t','main_name','핵심 스태프모드 스킬명'],['n','main','핵심 스태프모드 +'],['t','support_name','보조 스태프모드 스킬명'],['n','support','보조 스태프모드 +'],['n','sockets','소켓 수'],['n','mana','마나/유효 보조수치']]
};

// v45: 정확 스킬명 기반 충전/발동 옵션 입력. 일반화된 '충전 기술' 한 칸으로 뭉개지 않는다.
const DYNAMIC_SKILL_ELIGIBLE=new Set(['ring','amulet','circlet','gloves','boots','belt','classarmor','melee','bow','crossbow','jav','polearm','claw','orb','wand','caster']);
function dynamicSkillFields(){if(!DYNAMIC_SKILL_ELIGIBLE.has(active))return [];return [
 ['t','charge_skill_name','충전 기술 정확 스킬명'],['n','charge_skill_level','충전 기술 레벨'],['n','charge_count','최대 충전 횟수'],
 ['t','proc_skill_name','발동 기술 정확 스킬명'],['n','proc_skill_level','발동 기술 레벨'],['n','proc_chance','발동 확률 %'],['s','proc_trigger','발동 조건',['없음/선택','타격 시','공격 시','피격 시']]
];}
const MAX_CAPS={
 ring:{fcr:10,ar:120,str:20,dex:15,energy:15,life:40,mana:90,rep:9,ll:8,ml:6,mpk:1,mregen:10,allres:11,fire:30,light:30,cold:30,poison:30,mindmg:9,maxdmg:4,mf:15,gf:60,plr:25,dr:2,mdr:2,maxstam:20,lightradius:5},
 amulet:{classskill:2,skilltab:2,fcr:10,str:30,dex:20,energy:20,life:60,mana:90,rep:10,ll:6,ml:8,mregen:10,allres:20,fire:40,light:40,cold:40,poison:50,mf:25,gf:120,mindmg:9,maxdmg:4,plr:75,dr:4,mdr:6,dtm:12,ar:20,maxstam:20,lightradius:5},
 circlet:{classskill:2,skilltab:2,fcr:20,frw:30,sockets:2,str:30,dex:20,energy:20,life:60,mana:90,rep:10,ll:8,ml:8,ar:120,ed:30,mindmg:9,maxdmg:8,mpk:5,allres:20,fire:40,light:40,cold:40,poison:40,mf:25,plr:75,dr:7,mdr:6,visionary:99,maxstam:20},
 gloves:{skilltab:2,ias:20,str:15,dex:15,ar:20,mana:40,rep:5,ll:3,ml:3,fire:30,light:30,cold:30,poison:30,mf:25,gf:120,maxstam:10},
 boots:{frw:30,fhr:10,dex:9,mana:40,rep:5,maxstam:30,stamregen:50,eddef:200,fire:40,light:40,cold:40,poison:40,gf:120,mf:25},
 belt:{fhr:24,str:30,life:60,mana:20,rep:9,maxstam:30,eddef:200,fire:30,light:30,cold:30,poison:30,gf:120},
 classarmor:{classskill:2,skilltab:2,staff1:3,staff2:3,ed:200,sockets:2,allres:45},
 melee:{ed:450,ias:40,ar:300,mindmg:20,maxdmg:63,ll:9,ml:9,sockets:2},
 bow:{classskill:2,skilltab:2,ed:450,ias:20,ar:300,mindmg:20,maxdmg:63,ll:5,ml:5,sockets:2}, crossbow:{classskill:2,skilltab:2,ed:450,ias:20,ar:300,mindmg:20,maxdmg:63,ll:5,ml:5,sockets:2},
 jav:{classskill:2,skilltab:2,ias:40,ed:450,ar:300,ll:9,ml:9}, polearm:{ed:450,ias:40,ar:300,ll:9,ml:9},
 claw:{classskill:2,skilltab:2,ias:40,ed:450,main:3,support:3,sockets:2},
 orb:{classskill:2,skilltab:2,fcr:20,main:3,support:3,sockets:2,mana:90,energy:20,allres:20,fire:40,light:40,cold:40,poison:40,dtm:12,mdr:6},
 wand:{classskill:2,skilltab:2,fcr:20,main:3,support:3,sockets:2,ed:450,ias:40,ll:9,ml:9},
 caster:{classskill:2,skilltab:2,fcr:20,ias:40,main:3,support:3,sockets:2,mana:90}
};
const CAP_NOTES={
 ring:{mregen:'캐스터 크랩 고정 4~10 · 일반 레어 불가',mindmg:'레어 9 · 10~13은 매직 전용',energy:'레어 15 · 16~20은 매직 전용',mf:'레어 15 · 16~25는 매직 전용',lightradius:'레어 최대 +5'},amulet:{mregen:'캐스터 크랩 고정 4~10 · 일반 레어 불가',rep:'레어 10 · 11~15는 매직 전용',mindmg:'레어 9 · 10~13은 매직 전용',mf:'레어 25 · 26~35는 매직 전용',lightradius:'레어 최대 +5'},
 circlet:{skilltab:'레어 +2 · 매직은 +3 가능',rep:'레어 10 · 11~15는 매직 전용',mindmg:'레어 9 · 10~13은 매직 전용',maxdmg:'레어 8 · 9~12는 매직 전용',mf:'레어 25 · 26~35는 매직 전용',visionary:'레벨 비례 옵션 · 캐릭터 레벨과 함께 확인'},gloves:{skilltab:'레어 +2 · 매직은 +3 가능'},claw:{skilltab:'레어 +2 · 매직은 +3 가능'},orb:{skilltab:'레어 +2 · 매직은 +3 가능'},wand:{skilltab:'레어 +2 · 매직은 +3 가능'}
};
const CRAFT_CAPS={
 '캐스터 크래프트':{ring:{energy:20,mana:110,mregen:10},amulet:{fcr:20,mana:110,mregen:10},gloves:{mana:60,mpk:3,mregen:10},boots:{mana:60,maxmana_pct:5,mregen:10},belt:{fcr:10,mana:40,mregen:10}},
 '블러드 크래프트':{ring:{str:25,ll:11,life:60},amulet:{frw:10,ll:10,life:80},gloves:{cb:10,ll:6,life:20},boots:{rep:15,ll:3,life:20},belt:{ow:10,ll:3,life:80}},
 '힛파워 크래프트':{ring:{dex:20,attacker:6},amulet:{flee:11,attacker:10},gloves:{attacker:7},boots:{meleedr:50,attacker:7},belt:{dtm:10,attacker:7}},
 '세이프티 크래프트':{ring:{vitality:5,dr:6,mdr:4},amulet:{blockpct:10,dr:8,mdr:8},gloves:{eddef:30,cold:40,dr:4,mdr:2},boots:{eddef:230,fire:50,dr:4,mdr:2},belt:{eddef:230,poison:40,dr:4,mdr:2}}
};
const CRAFT_EXTRA={
 '캐스터 크래프트':{gloves:[['n','mpk','적 처치 시 마나(고정옵)'],['n','mregen','마나 재생 %']],boots:[['n','maxmana_pct','최대 마나 증가 %'],['n','mregen','마나 재생 %']],belt:[['n','fcr','패캐 %'],['n','mregen','마나 재생 %']]},
 '블러드 크래프트':{amulet:[['n','frw','달려 %']],gloves:[['n','cb','강타 확률 %'],['n','life','생명력']],boots:[['n','ll','생명력 훔침 %'],['n','life','생명력']],belt:[['n','ow','상처 악화 %'],['n','ll','생명력 훔침 %']]},
 '힛파워 크래프트':{ring:[['n','attacker','공격자가 받는 피해']],amulet:[['n','flee','몬스터 도주 %'],['n','attacker','공격자가 받는 피해']],gloves:[['n','attacker','공격자가 받는 피해']],boots:[['n','meleedr','근접 공격 방어'],['n','attacker','공격자가 받는 피해']],belt:[['n','dtm','받는 피해의 %만큼 마나 회복'],['n','attacker','공격자가 받는 피해']]},
 '세이프티 크래프트':{ring:[['n','vitality','활력']],amulet:[['n','blockpct','막기 확률 증가 %']],gloves:[['n','eddef','방어력 증가 %'],['n','dr','피해 감소(정수)'],['n','mdr','마법 피해 감소(정수)']],boots:[['n','dr','피해 감소(정수)'],['n','mdr','마법 피해 감소(정수)']],belt:[['n','dr','피해 감소(정수)'],['n','mdr','마법 피해 감소(정수)']]}
};
function itemType(){return String(val('itemtype')||'레어')}
function capOf(k){const t=itemType();const cc=((CRAFT_CAPS[t]||{})[active]||{})[k];return cc!==undefined?cc:(MAX_CAPS[active]||{})[k]}
function capHint(k){const t=itemType(),cap=capOf(k),note=((CAP_NOTES[active]||{})[k]);if(t!=='레어'&&((CRAFT_CAPS[t]||{})[active]||{})[k]!==undefined)return `표시 총합 최대 ${cap} · 고정옵+랜덤 접사 중첩 가능`;return note|| (cap!==undefined?`레어 최대 ${cap}`:'')}
function craftExtraFields(){return (((CRAFT_EXTRA[itemType()]||{})[active])||[])}
function profileChar(){return FIXED_CHAR[active]||val('char')||''}
function profileBuild(){return val('build')||''}
function profileParts(){const fs=PROFILE_FIELDS[active]||[];const out=[];if(fs.includes('char')||FIXED_CHAR[active])out.push(profileChar());if(fs.includes('build'))out.push(profileBuild());if(fs.includes('purpose'))out.push(val('purpose'));if(fs.includes('mode'))out.push(val('mode'));if(fs.includes('realm'))out.push(val('realm'));return out.filter(Boolean)}
function fieldHTML(f){
 if(f[0]==='n'){const cap=capOf(f[1]),note=capHint(f[1]);const hint=note?`<span class="maxhint">${esc(note)}</span>`:'';const mx=cap!==undefined?` max="${cap}"`:'';return `<div class="field"><label>${esc(f[2])}${hint}</label><input type="number" min="0"${mx} step="1" id="in_${f[1]}" placeholder="0"></div>`}
 if(f[0]==='t')return `<div class="field"><label>${esc(f[2])}</label><input type="text" id="in_${f[1]}" placeholder="게임 화면의 스킬명을 그대로 입력"></div>`;
 if(f[0]==='c')return `<div class="field check"><label>${esc(f[2])}</label><input type="checkbox" id="in_${f[1]}"></div>`;
 if(f[0]==='st'){const trees=SKILL_TREES[profileChar()]||[];return `<div class="field"><label>${esc(f[2])}</label><select id="in_${f[1]}">${trees.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>`}
 return `<div class="field"><label>${esc(f[2])}</label><select id="in_${f[1]}">${f[3].map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>`
}
function renderProfile(){
 const g=$('profileGrid'),fields=PROFILE_FIELDS[active]||[];g.innerHTML='';
 fields.forEach(k=>{let f=[...PROFILE_DEF[k]];if(k==='build'){const c=FIXED_CHAR[active]||'아마존';f[3]=BUILDS[c]}g.insertAdjacentHTML('beforeend',fieldHTML(f))});
 if(FIXED_CHAR[active])g.insertAdjacentHTML('afterbegin',`<div class="profile-note">고정 직업: <b>${esc(FIXED_CHAR[active])}</b> · 이 부위는 직업 선택이 필요하지 않아 빌드만 표시합니다.</div>`);
 else if(!fields.includes('char')&&!fields.includes('build'))g.insertAdjacentHTML('afterbegin',`<div class="profile-note">이 부위는 직업/빌드 선택 없이 ${fields.includes('purpose')?'세부 용도·':''}PvM/PvP·시장 기준으로 감정합니다.</div>`);
 const ch=$('in_char');if(ch)ch.onchange=()=>{const b=$('in_build');if(b)b.innerHTML=BUILDS[ch.value].map(x=>`<option>${esc(x)}</option>`).join('');renderInputs()};const it=$('in_itemtype');if(it)it.onchange=()=>renderInputs()
}
function renderInputs(){const g=$('inputGrid');g.innerHTML='';g.insertAdjacentHTML('beforeend',`<div class="field"><label>아이템 요구레벨 <span class="maxhint">LLD/MLD 판정용</span></label><input type="number" min="0" max="99" step="1" id="in_reqlevel" placeholder="0"></div>`);const t=itemType();if(t!=='레어'){g.insertAdjacentHTML('beforeend',`<div class="field"><label>제작 캐릭터 레벨 <span class="maxhint">선택 입력 · craft ilvl 참고</span></label><input type="number" min="1" max="99" step="1" id="in_craft_clvl" placeholder="0"></div><div class="field"><label>재료 아이템 레벨(ilvl) <span class="maxhint">선택 입력 · 도박/드랍 ilvl</span></label><input type="number" min="1" max="99" step="1" id="in_craft_ilvl" placeholder="0"></div>`);}[...(INPUTS[active]||[]),...dynamicSkillFields()].forEach(f=>{if(f[1]==='mregen'&&['ring','amulet'].includes(active)&&t!=='캐스터 크래프트')return;g.insertAdjacentHTML('beforeend',fieldHTML(f))});craftExtraFields().forEach(f=>{if(!$('in_'+f[1]))g.insertAdjacentHTML('beforeend',fieldHTML(f))});const info=craftInfo();if(info)g.insertAdjacentHTML('beforeend',`<div class="profile-note" style="grid-column:1/-1"><b>크래프트 고정옵</b> · ${info}<br><span class="muted">입력칸의 최대치는 게임 화면에 표시될 수 있는 총합 기준입니다. 고정옵과 랜덤 접사가 같은 능력치를 올리면 합산될 수 있습니다.</span></div>`);$('resultBox').style.display='none'}
function val(k){const e=$('in_'+k);if(!e)return 0;if(e.type==='checkbox')return e.checked?1:0;if(e.tagName==='SELECT')return e.value;return Number(e.value)||0}
function addCap(v,cap,w){return Math.min(Math.max(v,0)/cap,1)*w}function countRes(keys,th=20){return keys.filter(k=>val(k)>=th).length}
function grade(score){if(score>=85)return ['트로피 후보','낭비 옵션이 적고 고롤이 밀집된 조합'];if(score>=70)return ['고가 후보','실거래 교차검증을 권장할 상급 조합'];if(score>=50)return ['거래권','명확한 실사용 축이 있는 거래 가능 후보'];if(score>=30)return ['확인 가치','추가 옵션·수치에 따라 거래 가능성이 갈리는 구간'];return ['환/저가 가능성 높음','핵심 축이 부족하거나 수치가 낮은 편']}

const CRAFT_FIXED={
 '캐스터 크래프트':{ring:'마력 +1~5 · 마나 재생 4~10% · 마나 +10~20',amulet:'패캐 5~10% · 마나 재생 4~10% · 마나 +10~20',gloves:'적 처치 시 마나 +1~3 · 마나 재생 4~10% · 마나 +10~20',boots:'최대 마나 2~5% · 마나 재생 4~10% · 마나 +10~20',belt:'패캐 5~10% · 마나 재생 4~10% · 마나 +10~20'},
 '블러드 크래프트':{ring:'힘 +1~5 · 생명력 훔침 1~3% · 생명력 +10~20',amulet:'달려 5~10% · 생명력 훔침 1~4% · 생명력 +10~20',gloves:'강타 5~10% · 생명력 훔침 1~3% · 생명력 +10~20',boots:'생명력 회복 +5~10 · 생명력 훔침 1~3% · 생명력 +10~20',belt:'상처 악화 5~10% · 생명력 훔침 1~3% · 생명력 +10~20'},
 '힛파워 크래프트':{ring:'민첩 +1~5 · 피격 시 5% 레벨4 서릿발 · 공격자가 피해 3~6',amulet:'몬스터 도주 3~11% · 피격 시 5% 레벨4 서릿발 · 공격자가 피해 3~10',gloves:'밀쳐내기 · 피격 시 5% 레벨4 서릿발 · 공격자가 피해 3~7',boots:'근접 방어 +25~50 · 피격 시 5% 레벨4 서릿발 · 공격자가 피해 3~7',belt:'피해를 마나로 전환 5~10% · 피격 시 5% 레벨4 서릿발 · 공격자가 피해 3~7'},
 '세이프티 크래프트':{ring:'활력 +1~5 · 마법 피해 감소 1~2 · 피해 감소 1~4',amulet:'막기 확률 1~10% · 마법 피해 감소 1~2 · 피해 감소 1~4',gloves:'방어력 증가 10~30% · 냉기저항 5~10% · 마법 피해 감소 1~2 · 피해 감소 1~4',boots:'방어력 증가 10~30% · 화염저항 5~10% · 마법 피해 감소 1~2 · 피해 감소 1~4',belt:'방어력 증가 10~30% · 독저항 5~10% · 마법 피해 감소 1~2 · 피해 감소 1~4'}
};
function craftInfo(){const t=String(val('itemtype')||'레어');if(t==='레어')return '';return (CRAFT_FIXED[t]||{})[active]||'이 부위의 해당 크래프트 고정옵은 별도 레시피 검증이 필요합니다.'}
const AFFIX_SLOT={
 ring:{P:['ar','mana','mpk','allres','fire','light','cold','poison'],S:['fcr','str','dex','energy','life','rep','ll','ml','mindmg','maxdmg','gf','plr','dr','mdr'],F:['mf']},
 amulet:{P:['classskill','skilltab','mana','allres','fire','light','cold','poison','dtm','ar'],S:['fcr','str','dex','energy','life','rep','ll','ml','mindmg','maxdmg','gf','plr','dr','mdr'],F:['mf']},
 circlet:{P:['classskill','skilltab','ar','mana','ed','mpk','allres','fire','light','cold','poison','sockets'],S:['fcr','frw','str','dex','energy','life','rep','ll','ml','mindmg','maxdmg','gf','plr','dr','mdr'],F:['mf']},
 gloves:{P:['skilltab','ar','mana','fire','light','cold','poison'],S:['ias','str','dex','rep','ll','ml','gf'],F:['mf']},
 boots:{P:['mana','fire','light','cold','poison','maxstam','stamregen','eddef'],S:['frw','fhr','dex','rep','gf'],F:['mf']},
 belt:{P:['mana','fire','light','cold','poison','maxstam','eddef'],S:['fhr','str','life','rep','gf'],F:[]}
};
function affixStructure(warn){const t=String(val('itemtype')||'레어');const m=AFFIX_SLOT[active];if(!m)return '';let p=m.P.filter(k=>val(k)>0).length,sf=m.S.filter(k=>val(k)>0).length,flex=m.F.filter(k=>val(k)>0).length;let best=null;for(let x=0;x<=flex;x++){const pp=p+x,ss=sf+(flex-x);if(pp<=3&&ss<=3&&pp+ss<=6){best=[pp,ss];break}}if(t==='레어'){if(!best)warn.push(`입력된 핵심 옵션만으로도 접사 슬롯이 3접두/3접미 한도를 넘을 가능성이 큽니다. 화면 옵션이 자동옵·스태프모드·합산표시인지 다시 확인하세요.`);return best?`접사 슬롯 추정: 접두 ${best[0]} / 접미 ${best[1]} (레어 최대 3/3)`:`접사 슬롯 추정: 재확인 필요`;}return `크래프트: 고정옵과 랜덤 접사를 분리 평가합니다. 화면 총합만으로 각 랜덤 접사를 역산할 수 없으며 랜덤 접사는 최대 4개입니다.`}
function reqLevelCheck(warn){const r=val('reqlevel');const m=String(val('mode'));if(!r)return '';if(m==='LLD/MLD'){if(r<=30)return `요구레벨 ${r}: LLD(30 이하) 후보`;if(r<=49)return `요구레벨 ${r}: MLD(31~49) 후보`;warn.push(`요구레벨 ${r}은 일반적인 LLD/MLD 49 이하 구간을 벗어납니다.`);}return `요구레벨 ${r}`}
function legality(warn){const t=itemType();
 if(['ring','amulet'].includes(active)&&t==='레어'&&val('mregen')>0)warn.push('마나 재생 %는 일반 레어 접사가 아닙니다. 캐스터 크래프트 고정옵 여부를 확인하세요.');
 if(val('classskill')>2)warn.push('일반 레어/크래프트의 랜덤 +직업 전체 기술은 +2 초과 입력을 재확인하세요.');
 if(val('skilltab')>2&&['amulet','circlet','gloves','claw','orb','wand','caster'].includes(active))warn.push('+3 스킬탭은 매직 전용입니다. 스태프모드 +3과 혼동하지 마세요.');
 if(active==='ring'&&t==='레어'&&val('mf')>15)warn.push('레어 반지 매찬은 최대 15입니다. 16~25는 매직 전용 접사입니다.');
 if(['amulet','circlet'].includes(active)&&t==='레어'&&val('mf')>25)warn.push('레어 목걸이/써클릿 매찬은 최대 25입니다. 26~35는 매직 전용 접사입니다.');
 if(active==='ring'&&val('energy')>15&&t==='레어')warn.push('레어 반지 마력은 최대 15입니다. 16~20은 매직 전용 등급입니다.');
 if(['ring','amulet','circlet'].includes(active)&&val('mindmg')>9&&t==='레어')warn.push('레어 반지/목걸이/써클릿의 최소피해는 최대 9입니다. 10~13은 매직 전용입니다.');
 if(['amulet','circlet'].includes(active)&&val('rep')>10&&t==='레어')warn.push('레어 목걸이/써클릿 리플은 최대 10입니다. 11~15는 매직 전용입니다.');
 if(active==='circlet'&&val('maxdmg')>8)warn.push('레어 써클릿 최대피해는 8까지입니다. 9~12는 매직 전용입니다.');
 if(active==='amulet'&&t==='레어'&&val('fcr')>10)warn.push('일반 레어 목걸이 패캐는 최대 10입니다. 11~20 표시라면 캐스터 크래프트 여부를 확인하세요.');
 if(active==='amulet'&&t==='캐스터 크래프트'&&val('fcr')>20)warn.push('캐스터 목걸이의 표시 패캐 총합은 최대 20%입니다.');
 for(const f of [...(INPUTS[active]||[]),...dynamicSkillFields(),...craftExtraFields()]){if(f[0]!=='n')continue;const c=capOf(f[1]),v=val(f[1]);if(c!==undefined&&v>c)warn.push(`${f[2]} ${v}: 현재 아이템 유형의 검증 상한 ${c}을 초과합니다.`)}
 affixStructure(warn);reqLevelCheck(warn)
}
function craftSpecialScore(id,st){const t=itemType();if(t==='레어')return 0;let b=0;
 if(t==='캐스터 크래프트'){b+=addCap(val('mregen'),10,4);if(id==='amulet')b+=addCap(val('fcr'),20,7);if(id==='belt')b+=addCap(val('fcr'),10,5);if(id==='boots')b+=addCap(val('maxmana_pct'),5,4);if(val('mana')>=60)b+=3;st.push('캐스터 크래프트: 고정옵과 랜덤 접사를 분리 평가');}
 if(t==='블러드 크래프트'){if(id==='amulet')b+=addCap(val('frw'),10,4);if(id==='gloves')b+=addCap(val('cb'),10,6);if(id==='belt')b+=addCap(val('ow'),10,5);if(val('life')>=20)b+=3;st.push('블러드 크래프트: 생명/흡혈·부위별 고정옵 반영');}
 if(t==='힛파워 크래프트'){b+=2;if(val('attacker')>0)b+=1;st.push('힛파워 크래프트: 고정 발동/밀쳐내기 계열은 보조가치로 평가');}
 if(t==='세이프티 크래프트'){b+=addCap(val('dr'),Math.max(capOf('dr')||4,1),3)+addCap(val('mdr'),Math.max(capOf('mdr')||2,1),3);if(val('vitality')||val('blockpct'))b+=2;st.push('세이프티 크래프트: DR/MDR·방어 고정옵 반영');}
 return Math.min(b,12)}
function buildFitLabel(adj){if(adj>=15)return 'S';if(adj>=10)return 'A';if(adj>=5)return 'B';return 'C'}
function marketConfidence(warn,score){if(warn.length>=3)return ['낮음','생성/입력 재확인 필요'];if(['melee','polearm','bow','crossbow','claw','wand','caster'].includes(active)||String(val('mode')).includes('LLD'))return ['보통','니치·트로피 시장은 실거래 교차검증 필요'];if(score>=70)return ['보통~높음','대표 옵션축은 명확하나 가격은 실거래 확인 필요'];return ['보통','자동 감정은 품질 선별용']}
function craftIlvlInfo(){if(itemType()==='레어')return '';const c=val('craft_clvl'),i=val('craft_ilvl');if(!c||!i)return '크래프트 ilvl: 제작/재료 레벨을 입력하면 참고값을 계산합니다.';const out=Math.floor(c/2)+Math.floor(i/2);return `크래프트 결과 ilvl 참고: ${out} = floor(${c}/2)+floor(${i}/2). 실제 접사 가능 여부는 베이스 qlvl/alvl까지 확인해야 하므로 여기서 확정하지 않습니다.`}
function rollBreakdown(){const all=[...(INPUTS[active]||[]),...dynamicSkillFields(),...craftExtraFields()],seen=new Set(),rows=[];for(const f of all){if(f[0]!=='n'||seen.has(f[1]))continue;seen.add(f[1]);const v=val(f[1]),c=capOf(f[1]);if(v<=0||!c)continue;const pct=Math.min(Math.round(v/c*100),100);const q=pct>=100?'만땅':pct>=85?'상급':pct>=65?'중상':pct>=40?'중급':'낮음';rows.push([pct,`${f[2]} ${v}/${c} (${q} ${pct}%)`])}rows.sort((a,b)=>b[0]-a[0]);return rows.slice(0,6).map(x=>x[1]).join(' · ')}
function profileAdjust(id,st){let p=0;const c=profileChar(),b=profileBuild(),m=val('mode');
 if(c==='아마존'&&b.includes('자벨')&&id==='jav'){p+=10;if(val('ias')>=40)p+=4;if(val('replenish'))p+=3;st.push('자벨마 프로필: 스킬/공속/수량회복 가중');}
 if(c==='아마존'&&b.includes('활마')&&(id==='bow'||id==='crossbow')){p+=9;if(val('amp'))p+=4;if(val('ed')>=350)p+=3;st.push('물리 활마 프로필: 앰플/ED/공속 가중');}
 if(id==='boots'&&val('purpose')==='삥바바'){p+=8+Math.min(val('gf')/20,4);if(val('fire')>=25||val('light')>=25)p+=3;st.push('삥바바 용도: 삥+파레/라레/매찬 가중');}
 if(c==='야만용사'&&(b==='BvB'||b==='BvC')&&id==='melee'){p+=9;if(val('fools'))p+=4;if(val('eth')&&val('repair'))p+=4;st.push('BvB/BvC 프로필: 풀스·에테내회·공속 가중');}
 if(c==='팔라딘'&&b.includes('질딘')&&id==='melee'){p+=10;if(val('fools'))p+=4;if(val('sockets')>=2)p+=3;st.push('질딘 PvP 프로필: 베이스/공속/풀스/2솟 가중');}
 if(c==='소서리스'&&b.includes('에쉴')&&id==='ring'){p+=8;if(val('mana')>=70)p+=5;if(val('rep')>=6)p+=3;st.push('에쉴 PvP 프로필: 마나·리플·패캐 가중');}
 if(c==='소서리스'&&id==='orb'){p+=8;if(val('fcr')>=20&&val('main')>=3)p+=5;st.push('소서 오브 프로필: 2소서/20패캐/핵심스태프모드 가중');}
 if(c==='네크로맨서'&&b.includes('본넥')&&(id==='amulet'||id==='circlet'||id==='wand')){p+=8;if(val('fcr')>=10)p+=3;st.push('본넥 PvP 프로필: 패캐·스킬·생명/마나 가중');}
 if(c==='드루이드'&&b.includes('윈드')&&id==='classarmor'){p+=10;if(val('staff1')>=3)p+=5;st.push('윈드드루 프로필: +토네이도급 핵심 스태프모드 가중');}
 if(c==='어쌔신'&&b==='트랩씬'&&id==='claw'){p+=10;if(val('main')>=3)p+=6;if(val('ias')>=30)p+=3;st.push('트랩씬 프로필: +3 핵심트랩·베이스/IAS 가중');}
 if(c==='어쌔신'&&(b==='WW씬'||b.includes('하이브리드'))&&id==='claw'){p+=9;if(val('ed')>=250||val('fools'))p+=4;st.push('WW/하이브리드 프로필: 물리ED·풀스·IAS 가중');}
 if(c==='팔라딘'&&b==='해머딘'&&(id==='amulet'||id==='circlet'||id==='ring')){p+=6;if(val('fcr')>=10)p+=3;st.push('해머딘: FCR 브레이크포인트·스킬·스탯 가중');}
 if(c==='팔라딘'&&b==='FOH'&&(id==='amulet'||id==='circlet'||id==='wand')){p+=6;if(val('classskill')>=2||val('main')>=3)p+=3;st.push('FOH: +스킬·패캐·스태프모드 가중');}
 if(c==='네크로맨서'&&b==='독넥'&&(id==='amulet'||id==='circlet'||id==='wand')){p+=7;if(val('main')>=3||val('classskill')>=2)p+=3;st.push('독넥: 맹독확산/저주 유틸·패캐 가중');}
 if(c==='드루이드'&&b==='퓨리 늑드루'&&id==='melee'){p+=8;if(val('ias')>=30)p+=3;if(val('ed')>=300)p+=3;st.push('퓨리 늑드루: 베이스 공속·고ED 가중');}
 if(c==='어쌔신'&&b==='무술 PvM'&&(id==='claw'||id==='gloves')){p+=6;if(val('ias')>=20)p+=3;st.push('무술씬: 공속·스킬탭·베이스 가중');}
 if(c==='악마술사'&&['amulet','circlet','wand','caster'].includes(id)){p+=8;if(val('classskill')>=2)p+=4;const tr=String(val('skilltree_name'));if(tr&&tr===b&&val('skilltab')>=2)p+=5;st.push('악마술사: 전체 기술과 혼돈/기괴/악마 트리 일치 여부 가중');}
 if(m==='PvP'&&['ring','amulet','circlet','boots','classarmor','melee','claw'].includes(id))p+=3;
 return Math.min(p,22)}
function expertNarrative(id,quality,st,warn){const good=[],bad=[],note=[];const v=k=>+val(k)||0, cls=v('classskill'), fcr=v('fcr'), frw=v('frw'), sock=v('sockets'), ar=v('ar'), str=v('str'), dex=v('dex'), life=v('life'), mana=v('mana'), all=v('allres'), ll=v('ll'), ml=v('ml');
 if(id==='ring'){
  if(fcr>=10)good.push('10패캐는 캐스터/PvP 링의 핵심 출발선입니다.');
  if(ar>=100)good.push(`어레 ${ar}는 물리/PvP 링에서 상급 명중축입니다.`);
  if(ll>0&&ml>0)good.push(`듀얼흡 ${ll}/${ml}은 물리 PvM용 실사용 정체성을 만듭니다.`);
  if(str>=15||mana>=60||all>=8)good.push('스탯·마나·저항 중 적어도 하나가 상급 보조축으로 붙었습니다.');
  if(!fcr&&!ar&&!(ll&&ml))bad.push('패캐링·어레링·듀얼링 중 어느 쪽인지 정체성이 뚜렷하지 않습니다.');
  if(fcr>=10&&str<15&&mana<50&&all<8&&v('fire')<20&&v('light')<20)bad.push('패캐는 있지만 고스탯·고마나·핵심저항이 부족해 고가 패캐링과 격차가 큽니다.');
  note.push('반지는 옵션 개수보다 한 빌드 방향으로 옵션이 얼마나 밀집했는지가 가격을 결정합니다.');
 }
 if(id==='amulet'){
  if(cls>=2)good.push('+2 직업스킬은 레어 목걸이의 핵심 프리미엄 골격입니다.');
  if(fcr>=10)good.push('10패캐는 레어 아뮬에서 가능한 캐스터 핵심 상한축입니다.');
  if(cls>=2&&fcr>=10)good.push('2스킬/10패캐가 동시에 있어 상위 캐스터 거래군 진입 조건을 충족합니다.');
  if(cls<2)bad.push('레어 목걸이 고가군에서 가장 중요한 +2 직업스킬이 없습니다.');
  if(cls>=2&&fcr<10)bad.push('캐스터형이라면 10패캐 부재가 가장 큰 결손입니다. 패캐 비의존 빌드라면 스탯/저항이 이를 보완해야 합니다.');
  if(all<15&&v('fire')<30&&v('light')<30)bad.push('마라·크래프트 아뮬과 경쟁할 고저항 축이 약합니다.');
  note.push('레어 아뮬은 2스킬/10패캐 또는 2스킬+극고스탯/저항이라는 명확한 방향성이 있어야 고가군으로 올라갑니다.');
 }
 if(id==='circlet'){
  if(cls>=2)good.push('+2 직업스킬은 써클릿 고가군의 핵심 골격입니다.');
  if(fcr>=20)good.push('20패캐는 캐스터/PvP형 핵심 프리미엄입니다.');
  if(frw>=30)good.push('30달려는 기동형 PvP/아마존 계열에서 강한 프리미엄입니다.');
  if(sock>=2)good.push('2소켓은 주얼/룬 커스터마이징 때문에 가격 천장을 크게 올립니다.');
  if(sock<2)bad.push(`${sock||0}소켓: 써클릿에서 가장 먼저 확인해야 할 결손입니다. 2솟 상위군과 가치 차이가 크게 납니다.`);
  if(cls>=2&&fcr<20&&frw<30)bad.push('2스킬은 있으나 20패캐/30달려 중 핵심 속도축이 없어 상위군 경쟁력이 약합니다.');
  if(ar>=100||v('maxd')>=7)good.push('명중/피해 옵션이 있어 물리/PvP형 특화 가능성이 있습니다.');
  note.push('써클릿은 2/20만으로 평가하지 않고, 2솟·30달려·스탯·저항·AR/피해 중 어떤 완성형을 만드는지 봐야 합니다.');
 }
 if(id==='gloves'){
  if(v('skilltab')>=2&&v('ias')>=20)good.push('2스킬탭/20공속으로 레어 장갑의 대표 핵심골격을 완성했습니다.');
  if(v('ias')<20)bad.push('20공속 부재는 자벨/활/무술 장갑의 가장 큰 감점 요소입니다.');
  if(v('skilltab')<2)bad.push('+2 핵심 스킬탭이 없어 고가 레어 장갑군과 거리가 있습니다.');
  note.push('장갑은 2/20 이후 마흡·민첩·라레/파레 같은 실제 빌드용 보조옵의 밀도가 중요합니다.');
 }
 if(id==='boots'){
  if(frw>=30)good.push('30달려로 범용/PvP 부츠의 기본 골격을 충족합니다.');
  const rc=['fire','light','cold','poison'].filter(k=>v(k)>=25).length;if(rc>=3)good.push(`25+급 레지가 ${rc}줄로 삼레 상위군에 가깝습니다.`); else if(rc<2)bad.push('25+급 유효 레지가 2줄 미만이라 쌍레/삼레 거래군 경쟁력이 약합니다.');
  if(frw<30)bad.push('30달려 부재가 가장 큰 범용 가치 손실입니다.');
  note.push('부츠는 30달려/10패힛/레지 조합과 삥·매찬 특수시장을 분리해서 봐야 합니다.');
 }
 if(id==='belt'){
  if(v('fhr')>=24)good.push('24패힛은 레어 벨트의 대표 핵심축입니다.'); else bad.push('24패힛 부재로 PvP/범용 레어벨트 상위군과 차이가 큽니다.');
  if(str>=20&&life>=40)good.push('고힘+고생명 조합이 경쟁 유니크 대비 차별점을 만듭니다.');
  note.push('벨트는 24패힛 단독이 아니라 힘·생명·리플·저항/삥이 같은 용도로 모여야 거래 프리미엄이 생깁니다.');
 }
 if(['melee','polearm','bow','crossbow','jav','claw'].includes(id)){
  if(v('ed')>=300)good.push(`고ED ${v('ed')}%는 물리 레어무기의 핵심 딜축입니다.`); else if(v('ed')>0&&v('ed')<250)bad.push('물리무기 기준 ED가 낮아 다른 희귀옵션이 좋아도 가격 천장이 제한됩니다.');
  if(v('ias')>=30)good.push(`공속 ${v('ias')}%로 프레임 경쟁력이 있습니다.`);
  if(v('eth')&&v('repair'))good.push('에테+내회는 지속사용 가능한 희귀 프리미엄 조합입니다.');
  if(v('sockets')>=2)good.push('2솟은 물리무기 커스터마이징 가치가 큽니다.');
  note.push('레어 물리무기는 옵션만이 아니라 베이스 속도·사거리·평균딜과 프레임까지 같이 평가해야 합니다.');
 }
 if(['orb','wand','caster','claw'].includes(id)){
  if(cls>=2&&v('main')>=3)good.push('2직업+핵심 스태프모드 +3 조합으로 스킬포인트/딜 효율이 높습니다.');
  if(v('main')<3)bad.push('실제 빌드 핵심 스태프모드 +3이 없어 고가 캐스터 전용템군과 차이가 있습니다.');
  note.push('캐스터 직업전용템은 총 +스킬 합계가 아니라 실제 주력/유틸 스킬이 붙었는지가 핵심입니다.');
 }
 if(!good.length)good.push('현재 입력값에서는 상위 거래군을 명확히 정의하는 핵심 조합이 아직 부족합니다.');
 if(!bad.length)bad.push('치명적 결손은 뚜렷하지 않지만 베이스·요구레벨·실거래 표본을 추가 확인해야 합니다.');
 return {good,bad,note:note.join(' ')} }
function professionalVerdict(id,quality,ex){const v=k=>+val(k)||0;const parts=[];const strongest=(ex.good||[])[0]||'핵심 프리미엄 축이 아직 약합니다.';const bottleneck=(ex.bad||[])[0]||'치명적 결손은 적지만 상위 실거래 표본 확인이 필요합니다.';parts.push(`<b>핵심 강점</b> · ${esc(strongest)}`);parts.push(`<b>가격 천장 병목</b> · ${esc(bottleneck)}`);
 const gap=[];
 if(id==='ring'){if(v('fcr')<10)gap.push('10패캐');if(v('ar')<80&&!(v('ll')&&v('ml')))gap.push('고어레 또는 듀얼흡 정체성');if(v('str')<15&&v('dex')<10)gap.push('고스탯');if(v('mana')<60&&v('life')<30)gap.push('생존/마나축');}
 if(id==='amulet'){if(v('classskill')<2)gap.push('+2 직업스킬');if(v('fcr')<10)gap.push('10패캐(캐스터형)');if(v('allres')<15&&v('fire')<30&&v('light')<30)gap.push('고저항');if(v('str')<20&&v('dex')<15&&v('life')<40&&v('mana')<60)gap.push('상급 스탯/생존축');}
 if(id==='circlet'){if(v('classskill')<2)gap.push('+2 직업스킬');if(v('fcr')<20&&v('frw')<30)gap.push('20패캐 또는 30달려');if(v('sockets')<2)gap.push('2소켓');if(v('str')<20&&v('dex')<15&&v('life')<40&&v('allres')<15)gap.push('상급 보조옵');}
 if(id==='gloves'){if(v('skilltab')<2)gap.push('+2 핵심 스킬탭');if(v('ias')<20)gap.push('20공속');if(v('ml')<2&&v('str')<10&&v('dex')<10&&v('fire')<20&&v('light')<20)gap.push('마흡/스탯/저항 보조축');}
 if(id==='boots'){if(v('frw')<30)gap.push('30달려');if(['fire','light','cold'].filter(k=>v(k)>=25).length<2)gap.push('상급 2~3레지');if(v('fhr')<10)gap.push('10패힛(쌍패형)');}
 if(id==='belt'){if(v('fhr')<24)gap.push('24패힛');if(v('str')<20)gap.push('고힘');if(v('life')<40)gap.push('고생명');}
 if(['melee','polearm','bow','crossbow','jav','claw'].includes(id)){if(v('ed')<300)gap.push('고ED');if(v('ias')<30)gap.push('공속 프레임');if(v('sockets')<2)gap.push('2소켓/커스터마이징');if(!v('eth')&&!v('amp')&&!v('fools'))gap.push('에테/앰플/풀스 같은 희귀 공격축');}
 if(gap.length)parts.push(`<b>상위형으로 가려면</b> · ${gap.slice(0,4).map(esc).join(' → ')}`);
 const stance=quality>=85?'트로피/고가군 후보로 볼 수 있으나 실제 완료거래와 베이스 적합성 확인이 필요합니다.':quality>=70?'실사용/거래 가능성이 있으나 상위형과의 결손을 먼저 확인해야 합니다.':quality>=50?'조건부 실사용군입니다. 핵심 골격이 부족하면 호가가 있어도 체결력은 낮을 수 있습니다.':'득환 우선순위가 낮습니다. 특수 PvP/LLD/컬렉터 수요가 아니라면 보수적으로 보는 편이 맞습니다.';parts.push(`<b>전문 판정</b> · ${esc(stance)}`);return parts.join('<br><br>')}

function assess(){let s=0,st=[],warn=[];const id=active;legality(warn);
if(id==='ring'){s+=addCap(val('fcr'),10,20)+addCap(val('ar'),120,12)+addCap(val('str'),20,10)+addCap(val('dex'),15,8)+addCap(val('life'),40,10)+addCap(val('mana'),90,12)+addCap(val('energy'),15,4)+addCap(val('rep'),9,8)+addCap(val('mpk'),1,4)+addCap(val('mf'),15,4)+addCap(val('gf'),40,2)+addCap(val('ll'),8,6)+addCap(val('ml'),6,6)+addCap(val('allres'),11,8);s+=countRes(['fire','light','cold','poison'],20)*3;if(val('fcr')>=10)st.push('10패캐 완성');if(val('mana')>=70&&val('rep')>=6)st.push('고마나+리플 PvP 시너지');}
if(id==='amulet'){s+=addCap(val('classskill'),2,28)+addCap(val('skilltab'),2,14)+addCap(val('fcr'),10,18)+addCap(val('str'),30,10)+addCap(val('dex'),20,9)+addCap(val('life'),60,9)+addCap(val('mana'),90,8)+addCap(val('rep'),10,6)+addCap(val('ll'),6,5)+addCap(val('ml'),8,5)+addCap(val('mf'),25,4)+addCap(val('allres'),20,10);if(val('classskill')>=2&&val('fcr')>=10)st.push(itemType()==='캐스터 크래프트'&&val('fcr')>=20?'2직업/20패캐 캐스터 핵심':'2직업/10패캐 핵심');}
if(id==='circlet'){s+=addCap(val('classskill'),2,22)+addCap(val('skilltab'),2,10)+addCap(val('fcr'),20,18)+addCap(val('frw'),30,12)+addCap(val('sockets'),2,16)+addCap(val('str'),30,8)+addCap(val('dex'),20,7)+addCap(val('life'),60,6)+addCap(val('mana'),90,5)+addCap(val('rep'),10,5)+addCap(val('ll'),8,4)+addCap(val('ml'),8,4)+addCap(val('ar'),120,3)+addCap(val('mf'),25,3)+addCap(val('allres'),20,8);if(val('classskill')>=2&&val('fcr')>=20)st.push('2/20 핵심축');if(val('frw')>=30&&val('sockets')>=2)st.push('30달려/2솟 PvP 축');if(val('sockets')>2)warn.push('레어 써클릿 2솟 초과 입력 재확인');}
if(id==='gloves'){s+=addCap(val('skilltab'),2,28)+addCap(val('ias'),20,25)+addCap(val('str'),15,8)+addCap(val('dex'),15,10)+addCap(val('ar'),20,4)+addCap(val('ml'),3,7)+addCap(val('ll'),3,5)+countRes(['fire','light','cold'],20)*5+addCap(val('mf'),25,5);if(val('skilltab')>=2&&val('ias')>=20)st.push('2스킬탭/20공속 핵심');}
if(id==='boots'){s+=addCap(val('frw'),30,20)+addCap(val('fhr'),10,14)+addCap(val('dex'),9,5)+addCap(val('rep'),5,5)+countRes(['fire','light','cold','poison'],25)*10+addCap(val('gf'),120,10)+addCap(val('mf'),25,8);const tri=countRes(['fire','light','cold'],25);if(val('frw')>=30&&val('fhr')>=10&&tri>=3)st.push('30/10 정통 삼레');if(val('gf')>=90&&(val('fire')>=20||val('light')>=20))st.push('고삥 부츠 핵심축');}
if(id==='belt'){s+=addCap(val('fhr'),24,28)+addCap(val('str'),30,15)+addCap(val('life'),60,15)+addCap(val('rep'),9,8)+countRes(['fire','light','cold'],20)*7+addCap(val('gf'),120,10);}
if(id==='classarmor'){s+=addCap(val('classskill'),2,18)+addCap(val('staff1'),3,18)+addCap(val('staff2'),3,10)+addCap(val('ed'),200,12)+addCap(val('sockets'),2,12)+addCap(val('allres'),45,10)+val('eth')*7+val('repair')*8+val('block')*10;if(val('eth')&&val('repair'))st.push('에테내회 극딮 축');}
if(id==='melee'||id==='polearm'){s+=addCap(val('ed'),450,32)+addCap(val('ias'),40,20)+addCap(val('ar'),300,5)+addCap(val('sockets'),2,12)+val('fools')*12+val('eth')*6+val('repair')*7+val('amp')*7;if(val('eth')&&val('repair'))st.push('에테내회');if(val('fools')&&val('ias')>=40)st.push('풀스+퀵');if(val('ed')<200)warn.push('고급 레어 물리무기는 ED가 낮으면 가치가 급감');}
if(id==='bow'||id==='crossbow'){s+=addCap(val('classskill'),2,5)+addCap(val('skilltab'),2,6)+addCap(val('ed'),450,35)+addCap(val('ias'),20,20)+addCap(val('sockets'),2,12)+val('fools')*10+val('amp')*15;if(val('amp'))st.push('앰플 보유');if(val('amp')&&val('ed')>=350&&val('ias')>=20)st.push('앰플 고증뎀/공속 핵심');if(val('amp')&&val('ed')<250)warn.push('앰플 단독은 고가 판정 금지');}
if(id==='jav'){s+=addCap(val('classskill'),2,14)+addCap(val('skilltab'),2,18)+addCap(val('ias'),40,25)+addCap(val('ed'),450,12)+addCap(val('ml'),6,6)+val('replenish')*12+val('fools')*9+val('eth')*6;if(val('classskill')+val('skilltab')>=4&&val('ias')>=40)st.push('4/40 스킬형 핵심');if(val('fools')&&val('eth')&&val('replenish'))st.push('PK 잽마 물리형 핵심');}
if(id==='claw'){s+=addCap(val('classskill'),2,18)+addCap(val('skilltab'),2,10)+addCap(val('ias'),40,18)+addCap(val('ed'),450,10)+addCap(val('main'),3,24)+addCap(val('support'),3,10)+addCap(val('sockets'),2,10)+val('fools')*8+val('eth')*4+val('repair')*5;if(val('classskill')>=2&&val('main')>=3)st.push('2어쌔+핵심 스태프모드3');if(val('ias')>=40&&val('sockets')>=2)st.push('40IAS/2솟 완성축');}
if(id==='orb'){s+=addCap(val('classskill'),2,22)+addCap(val('skilltab'),2,8)+addCap(val('fcr'),20,18)+addCap(val('main'),3,26)+addCap(val('support'),3,14)+addCap(val('sockets'),2,7)+addCap(val('mana'),90,5);if(val('classskill')>=2&&val('fcr')>=20&&val('main')>=3)st.push('2소서/20패캐/+3핵심 완성');}
if(id==='wand'){s+=addCap(val('classskill'),2,22)+addCap(val('skilltab'),2,8)+addCap(val('fcr'),20,18)+addCap(val('main'),3,26)+addCap(val('support'),3,14)+addCap(val('sockets'),2,7);if(String(val('ctype')).includes('셉터'))s+=addCap(val('ed'),450,8)+addCap(val('ias'),40,6);if(val('classskill')>=2&&val('main')>=3)st.push('2직업/+3핵심 스태프모드');}
if(id==='caster'){s+=addCap(val('classskill'),2,22)+addCap(val('skilltab'),2,8)+addCap(val('fcr'),20,18)+addCap(val('main'),3,24)+addCap(val('support'),3,12)+addCap(val('sockets'),2,8)+addCap(val('mana'),90,6);}
const chn=String(val('charge_skill_name')||'').trim(), chlv=val('charge_skill_level'), chc=val('charge_count');if(chn){st.push(`충전 기술: ${chn}${chlv?` Lv${chlv}`:''}${chc?` · 최대 ${chc}회`:''}`);}const pnm=String(val('proc_skill_name')||'').trim(), plv=val('proc_skill_level'), pch=val('proc_chance'), ptr=String(val('proc_trigger')||'');if(pnm){st.push(`발동 기술: ${pnm}${plv?` Lv${plv}`:''}${pch?` · ${pch}%`:''}${ptr&&ptr!=='없음/선택'?` · ${ptr}`:''}`);} const craftAdj=craftSpecialScore(id,st);const quality=Math.min(Math.round(s+craftAdj),100),adj=profileAdjust(id,st),fit=buildFitLabel(adj),mc=marketConfidence(warn,quality),g=grade(quality);$('resultBox').style.display='block';$('resultGrade').textContent=g[0];$('resultScore').textContent='아이템 품질 '+quality+' / 100 · 빌드 적합도 '+fit+' · 시장 신뢰도 '+mc[0];$('resultSummary').innerHTML=`${esc(g[1])}<br><b>생성 검증:</b> ${warn.length?'재확인 항목 있음':'1차 통과'} · <b>시장 판단:</b> ${esc(mc[1])}<br>${profileParts().length?'선택: <b>'+profileParts().map(esc).join(' · ')+'</b><br>':''}부위: <b>${esc((DB.categories.find(x=>x.id===id)||{}).title||id)}</b>${baseInfo()?'<br>'+baseInfo():''}${frameInfo()?'<br>'+frameInfo():''}<br>${esc(reqLevelCheck([]))}${affixStructure([])?'<br>'+esc(affixStructure([])):''}${craftInfo()?'<br>'+esc('크래프트 고정옵: '+craftInfo()):''}${itemType()!=='레어'?'<br>'+esc(craftIlvlInfo()):''}${rollBreakdown()?'<br><b>주요 롤:</b> '+esc(rollBreakdown()):''}`;const ex=expertNarrative(id,quality,st,warn);$('resultStrength').innerHTML=[...st,...ex.good].map(x=>'◆ '+esc(x)).join('<br>');$('resultWeak').innerHTML=ex.bad.map(x=>'◆ '+esc(x)).join('<br>');$('resultExpert').innerHTML=professionalVerdict(id,quality,ex)+(ex.note?'<br><br><span style="color:#8fa0b5">'+esc(ex.note)+'</span>':'');$('resultWarn').innerHTML=(warn.length?warn.map(x=>'주의 · '+esc(x)).join('<br>'):'주의 · 자동 감정은 1차 선별용입니다.')+'<br>직업/빌드 가중치는 생성 가능 여부를 바꾸지 않습니다. 최종 가격은 베이스·요구레벨·PvM/PvP·래더/스탠 실거래를 교차검증하세요.'}
function resetInputs(){for(const k of ['reqlevel','craft_clvl','craft_ilvl']){const e=$('in_'+k);if(e)e.value=''};[...(INPUTS[active]||[]),...dynamicSkillFields(),...craftExtraFields()].forEach(f=>{const e=$('in_'+f[1]);if(!e)return;if(e.type==='checkbox')e.checked=false;else if(e.tagName==='SELECT')e.selectedIndex=0;else e.value=''});$('resultBox').style.display='none'}
function renderTabs(filter=''){const t=$('tabs');t.innerHTML='';const f=filter.trim().toLowerCase();let shown=DB.categories.filter(c=>!f||JSON.stringify(c).toLowerCase().includes(f));if(!shown.length){t.innerHTML='<span class="muted">검색 결과 없음</span>';return}if(!shown.some(c=>c.id===active))active=shown[0].id;shown.forEach(c=>t.insertAdjacentHTML('beforeend',`<button class="tab ${c.id===active?'active':''}" data-id="${c.id}">${c.short}</button>`));t.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{active=b.dataset.id;renderTabs($('q').value);render();renderProfile();renderInputs()})}
function render(){const c=DB.categories.find(x=>x.id===active)||DB.categories[0];$('title').textContent=c.title;$('intro').textContent=c.intro;$('idx').textContent=(DB.categories.indexOf(c)+1)+' / '+DB.categories.length;$('pills').innerHTML=`<span>${esc(c.badge)}</span><span>${esc(c.market)}</span><span>${(PROFILE_FIELDS[active]||[]).includes('build')?'직업/빌드 가중치':'옵션/용도 기준'}</span>`;$('keys').innerHTML=c.keylines.map(x=>`<div class="line">◆ ${esc(x)}</div>`).join('');$('tiers').innerHTML=c.tiers.map(x=>`<div class="tier"><strong>${esc(x[0])}</strong><span>${esc(x[1])}</span></div>`).join('');$('pitfalls').innerHTML=c.pitfalls.map(x=>`<div class="bad">${esc(x)}</div>`).join('');$('examples').innerHTML=c.examples.map(x=>`<div class="ex">${esc(x)}</div>`).join('')}
$('audit').innerHTML=DB.audit.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.fact)}</td><td>${esc(x.source)}</td></tr>`).join('');$('q').addEventListener('input',e=>{renderTabs(e.target.value);render();renderProfile();renderInputs()});$('clear').onclick=()=>{$('q').value='';active=DB.categories[0].id;renderTabs();render();renderProfile();renderInputs()};$('runAppraise').onclick=assess;$('resetAppraise').onclick=resetInputs;renderTabs();render();renderProfile();renderInputs();
