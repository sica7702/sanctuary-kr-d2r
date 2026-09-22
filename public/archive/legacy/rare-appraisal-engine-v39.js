/* Sanctuary KR · Rare Appraisal Engine v39
 * DB-driven rare item valuation for image appraisal.
 * Uses window.SKR_RARE_DATA as the authoritative valuation reference layer.
 */
(function(){
'use strict';
const CLASS_SKILLS=['원소술사 기술 레벨','성기사 기술 레벨','강령술사 기술 레벨','야만용사 기술 레벨','드루이드 기술 레벨','암살자 기술 레벨','아마존 기술 레벨','악마술사 기술 레벨'];
const CAT_MAP={반지:'반지',목걸이:'목걸이',써클릿:'써클릿',장갑:'장갑',부츠:'신발',벨트:'벨트',갑옷:'갑옷',방패:'방패',무기:'무기',활:'활',자벨린:'자벨린',클러:'클러',오브:'오브',완드:'완드',셉터:'셉터','직업 전용':'직업전용'};
const RES=['화염 저항','냉기 저항','번개 저항','독 저항'];
const defs={
 '시전 속도 증가':{unit:'%',caps:{반지:10,목걸이:10,써클릿:20,오브:20,완드:20,셉터:20,방패:20},aliases:['시전 속도','패캐','fcr','faster cast'],weight:12},
 '공격 속도 증가':{unit:'%',caps:{장갑:20,무기:40,활:40,자벨린:40,클러:40,셉터:40},aliases:['공격 속도','공속','ias','attack speed'],weight:10},
 '달리기/걷기 속도 증가':{unit:'%',caps:{써클릿:30,부츠:30},aliases:['달리기','걷기','달려','frw','run walk'],weight:10},
 '타격 회복 속도 증가':{unit:'%',caps:{써클릿:20,부츠:10,벨트:24,갑옷:24},aliases:['타격 회복','패힛','fhr','hit recovery'],weight:8},
 '힘':{caps:{반지:20,목걸이:30,써클릿:30,장갑:15,부츠:10,벨트:30,갑옷:20,방패:20},aliases:['힘','strength'],weight:8},
 '민첩':{caps:{반지:15,목걸이:20,써클릿:20,장갑:15,부츠:9,방패:20},aliases:['민첩','dexterity'],weight:8},
 '생명력':{caps:{반지:40,목걸이:60,써클릿:60,벨트:60,갑옷:60,방패:40},aliases:['생명력','라이프','life'],weight:8},
 '마나':{caps:{반지:90,목걸이:90,써클릿:90,벨트:20,오브:90,완드:90,셉터:90},aliases:['마나','mana'],weight:7},
 '마나 재생':{unit:'%',caps:{반지:10,목걸이:10,써클릿:10},aliases:['마나 재생','마쟁','regenerate mana'],weight:4},
 '피해 감소':{caps:{반지:2,목걸이:4,써클릿:4,벨트:4,갑옷:4,방패:4},aliases:['피해 감소','피해감소','damage reduced by'],weight:3},
 '명중률':{caps:{반지:120,무기:999,활:999,자벨린:999,클러:999,셉터:999},aliases:['명중률','어레','attack rating'],weight:8},
 '최소 피해':{caps:{반지:9,목걸이:9,써클릿:9,무기:20,활:20,자벨린:20,클러:20},aliases:['최소 피해','민뎀','minimum damage'],weight:6},
 '최대 피해':{caps:{반지:4,목걸이:4,써클릿:8,무기:20,활:20,자벨린:20,클러:20},aliases:['최대 피해','맥뎀','maximum damage'],weight:6},
 '피해 증가':{unit:'%',caps:{무기:450,활:450,자벨린:450,클러:450,셉터:450},aliases:['피해 증가','증뎀','enhanced damage','ed'],weight:13},
 '모든 저항':{unit:'%',caps:{반지:11,목걸이:20,써클릿:20,방패:20},aliases:['모든 저항','올레','all resist'],weight:10},
 '화염 저항':{unit:'%',caps:{반지:30,목걸이:40,써클릿:40,장갑:30,부츠:40,벨트:30,갑옷:30,방패:30},aliases:['화염 저항','파레','fire resist'],weight:6},
 '냉기 저항':{unit:'%',caps:{반지:30,목걸이:40,써클릿:40,장갑:30,부츠:40,벨트:30,갑옷:30,방패:30},aliases:['냉기 저항','콜레','cold resist'],weight:5},
 '번개 저항':{unit:'%',caps:{반지:30,목걸이:40,써클릿:40,장갑:30,부츠:40,벨트:30,갑옷:30,방패:30},aliases:['번개 저항','라레','lightning resist'],weight:7},
 '독 저항':{unit:'%',caps:{반지:30,목걸이:40,써클릿:40,장갑:30,부츠:40,벨트:30,갑옷:30,방패:30},aliases:['독 저항','포레','poison resist'],weight:4},
 '적중당 생명력 훔침':{unit:'%',caps:{반지:8,목걸이:8,써클릿:8,장갑:3},aliases:['적중당 생명력','생명력 훔침','라흡','life stolen','life leech'],weight:6},
 '적중당 마나 훔침':{unit:'%',caps:{반지:6,목걸이:8,써클릿:8,장갑:3},aliases:['적중당 마나','마나 훔침','마흡','mana stolen','mana leech'],weight:6},
 '마법 아이템 발견 확률':{unit:'%',caps:{반지:15,목걸이:35,써클릿:35,장갑:25,부츠:25},aliases:['마법 아이템','매찬','magic find'],weight:4},
 '골드 획득량':{unit:'%',caps:{반지:40,목걸이:80,장갑:80,부츠:80,벨트:80},aliases:['골드 획득','삥','extra gold'],weight:4},
 '생명력 회복':{caps:{반지:9,목걸이:10,써클릿:10,부츠:5,벨트:5},aliases:['생명력 회복','리플','replenish life'],weight:5},
 '소켓':{caps:{써클릿:2,무기:2,활:2,클러:2,갑옷:2,방패:2,오브:2,완드:2,셉터:2},aliases:['소켓','socket'],weight:14},
 '에테리얼':{caps:{무기:1,활:1,자벨린:1,클러:1,갑옷:1},aliases:['에테리얼','에테','ethereal'],weight:10},
 '내구도 자동 회복':{caps:{무기:1,활:1,클러:1,갑옷:1},aliases:['내구도 회복','내회','self repair','repair durability'],weight:12},
 '수량 자동 회복':{caps:{자벨린:1},aliases:['수량 회복','수량 자동','replenish quantity'],weight:12},
 '피해 증폭 발동':{unit:'%',caps:{무기:5,활:5,자벨린:5,클러:5,셉터:5},aliases:['피해 증폭','앰플','amplify damage'],weight:13},
 '투창과 창 기술 레벨':{caps:{장갑:2,자벨린:4},aliases:['투창과 창','투창','javelin and spear'],weight:12},
 '활과 쇠뇌 기술 레벨':{caps:{장갑:2,활:2},aliases:['활과 쇠뇌','활 스킬','bow and crossbow'],weight:10},
 '무술 기술 레벨':{caps:{장갑:2,클러:2},aliases:['무술 기술','무술','martial arts'],weight:10},
};
CLASS_SKILLS.forEach(n=>defs[n]={caps:{목걸이:2,써클릿:2,직업전용:2,오브:2,완드:2,셉터:2,클러:2,방패:2},aliases:[n.replace(' 기술 레벨',''),'기술 레벨'],weight:14});
const slotOptions={
 반지:['시전 속도 증가','명중률','최소 피해','최대 피해','힘','민첩','생명력','마나','모든 저항',...RES,'적중당 생명력 훔침','적중당 마나 훔침','생명력 회복','피해 감소','마법 아이템 발견 확률','골드 획득량'],
 목걸이:[...CLASS_SKILLS,'시전 속도 증가','힘','민첩','생명력','마나','마나 재생','모든 저항',...RES,'적중당 생명력 훔침','적중당 마나 훔침','생명력 회복','피해 감소','마법 아이템 발견 확률','골드 획득량'],
 써클릿:[...CLASS_SKILLS,'시전 속도 증가','달리기/걷기 속도 증가','타격 회복 속도 증가','힘','민첩','생명력','마나','모든 저항',...RES,'적중당 생명력 훔침','적중당 마나 훔침','생명력 회복','소켓'],
 장갑:['공격 속도 증가','투창과 창 기술 레벨','활과 쇠뇌 기술 레벨','무술 기술 레벨','힘','민첩',...RES,'적중당 생명력 훔침','적중당 마나 훔침','마법 아이템 발견 확률','골드 획득량'],
 부츠:['달리기/걷기 속도 증가','타격 회복 속도 증가','민첩',...RES,'마법 아이템 발견 확률','골드 획득량','생명력 회복'],
 벨트:['타격 회복 속도 증가','힘','생명력','마나',...RES,'생명력 회복','골드 획득량'],
 갑옷:['타격 회복 속도 증가','힘','생명력',...RES,'소켓','에테리얼','내구도 자동 회복'],
 방패:[...CLASS_SKILLS,'시전 속도 증가','힘','민첩','생명력','모든 저항',...RES,'소켓'],
 무기:['공격 속도 증가','피해 증가','명중률','최소 피해','최대 피해','소켓','에테리얼','내구도 자동 회복','피해 증폭 발동'],
 활:['공격 속도 증가','피해 증가','명중률','최소 피해','최대 피해','활과 쇠뇌 기술 레벨','소켓','피해 증폭 발동'],
 자벨린:['공격 속도 증가','피해 증가','명중률','투창과 창 기술 레벨','에테리얼','수량 자동 회복','피해 증폭 발동'],
 클러:['공격 속도 증가','피해 증가','명중률','무술 기술 레벨','암살자 기술 레벨','소켓','에테리얼','내구도 자동 회복','피해 증폭 발동'],
 오브:['원소술사 기술 레벨','시전 속도 증가','마나','소켓'],
 완드:['강령술사 기술 레벨','시전 속도 증가','마나','소켓'],
 셉터:['성기사 기술 레벨','시전 속도 증가','공격 속도 증가','피해 증가','소켓','피해 증폭 발동'],
 '직업 전용':[...CLASS_SKILLS,'시전 속도 증가','공격 속도 증가','달리기/걷기 속도 증가','피해 증가','힘','민첩','생명력','마나','모든 저항',...RES,'소켓']
};
const highValueProfiles={
 반지:[
  {id:'rare-ring-fcr-caster',name:'패캐링 · 캐스터/PvP',must:[['시전 속도 증가',10]],premium:[['힘',15],['민첩',10],['생명력',30],['마나',60],['모든 저항',8],['번개 저항',20],['화염 저항',20]],use:'캐스터/PvP 패캐 브레이크포인트',miss:'10패캐를 출발점으로 고스탯·고마나·고저항 중 3축 이상이 붙어야 고가군으로 올라갑니다.'},
  {id:'rare-ring-dual-leech',name:'듀얼링 · 밀리/PvM',must:[['적중당 생명력 훔침',1],['적중당 마나 훔침',1]],premium:[['명중률',80],['힘',15],['민첩',10],['최소 피해',5],['화염 저항',20],['번개 저항',20]],use:'물리 딜러·삥바바·밀리 세팅',miss:'듀얼흡 자체보다 명중/스탯/피해/저항이 함께 붙어야 거래 프리미엄이 생깁니다.'},
  {id:'rare-ring-melee-ar',name:'전투링 · 어레/민맥 PvP',must:[['명중률',80]],premium:[['최소 피해',5],['최대 피해',3],['힘',15],['민첩',10],['생명력',30],['생명력 회복',5]],use:'질딘·바바 등 밀리 PvP',miss:'고어레만으로는 부족하고 피해축 + 스탯/생존축이 같이 완성되어야 합니다.'},
  {id:'rare-ring-es-mana',name:'에쉴 고마나 패캐링',must:[['시전 속도 증가',10],['마나',60]],premium:[['힘',15],['민첩',10],['모든 저항',8],['생명력 회복',5]],use:'에너지 실드 소서 PvP',miss:'80~90 마나 상급롤과 패캐, 스탯/저항이 겹칠수록 희소도가 급상승합니다.'}
 ],
 목걸이:[
  {id:'crafted-amu-fcr',name:'캐스터 크래프트 15~20패캐 목걸이',must:[['시전 속도 증가',15]],premium:[['CLASS',2],['힘',20],['생명력',40],['마나',50],['모든 저항',15]],use:'캐스터 크래프트 고패캐 세팅',miss:'15~20패캐는 일반 레어가 아니라 캐스터 크래프트 영역입니다. +2 직업스킬과 스탯/생명/마나/저항이 겹쳐야 고가군으로 올라갑니다.'},
  {id:'rare-amu-2skill-fcr',name:'2스킬 10패캐 목걸이',must:[['CLASS',2],['시전 속도 증가',10]],premium:[['힘',20],['민첩',15],['생명력',40],['마나',60],['모든 저항',15]],use:'캐스터/PvP 2스킬·패캐 세팅',miss:'레어 목걸이는 2직업/10패캐가 고가 캐스터형의 핵심 출발점입니다. 둘 중 하나가 없으면 상위 거래군 진입이 크게 어려워집니다.'},
  {id:'rare-amu-stat-res',name:'2스킬 고스탯·고저항 목걸이',must:[['CLASS',2]],premium:[['힘',20],['민첩',15],['생명력',40],['마나',60],['모든 저항',15],['화염 저항',30],['번개 저항',30]],use:'밀리/PvP 및 패캐 비의존 세팅',miss:'패캐가 없다면 마라/하이로드 같은 대체재를 이길 만큼 스탯·저항·생존 옵션이 강해야 합니다.'},
  {id:'rare-amu-gf',name:'삥/흡수 목걸이',must:[['골드 획득량',30]],premium:[['야만용사 기술 레벨',2],['시전 속도 증가',10],['적중당 마나 훔침',4],['화염 저항',20],['번개 저항',20]],use:'삥바바 실사용',miss:'삥 수치만 높으면 대체재가 많습니다. 바바 스킬/패캐/마흡/저항이 같이 붙어야 실거래성이 올라갑니다.'}
 ],
 써클릿:[
  {id:'rare-circ-2202',name:'2스킬 20패캐 2솟 · 광패뚜',must:[['CLASS',2],['시전 속도 증가',20],['소켓',2]],premium:[['힘',20],['민첩',15],['생명력',40],['마나',60],['모든 저항',15],['화염 저항',30],['번개 저항',30]],use:'캐스터/PvP 최상위 써클릿',miss:'2스킬/20패캐 골격 위에서 2소켓이 가격 천장을 크게 좌우합니다. 2솟 부재는 가장 큰 결손 중 하나입니다.'},
  {id:'rare-circ-frw',name:'2스킬 30달려 2솟 · 기동형',must:[['CLASS',2],['달리기/걷기 속도 증가',30],['소켓',2]],premium:[['시전 속도 증가',20],['민첩',15],['생명력',40],['모든 저항',15]],use:'아마존/기동 PvP',miss:'30달려형도 2소켓과 직업 스킬이 핵심입니다. 쌍패(20패캐+30달려)까지 붙으면 별도 상위군입니다.'},
  {id:'rare-circ-dual-speed',name:'쌍패 써클릿',must:[['시전 속도 증가',20],['달리기/걷기 속도 증가',30]],premium:[['CLASS',2],['소켓',2],['민첩',15],['생명력',40],['모든 저항',15]],use:'PvP 기동/패캐 동시 세팅',miss:'쌍패만으로 끝이 아니라 +2 직업스킬/2소켓/스탯이 붙어야 최상위권입니다.'}
 ],
 장갑:[
  {id:'rare-glove-java',name:'2투창 20공속 장갑',must:[['투창과 창 기술 레벨',2],['공격 속도 증가',20]],premium:[['적중당 마나 훔침',2],['힘',10],['민첩',10],['번개 저항',20],['화염 저항',20]],use:'자벨마',miss:'2투창/20공속이 출발선이며 마흡·스탯·저항이 붙을수록 고급 실사용군으로 올라갑니다.'},
  {id:'rare-glove-bow',name:'2활 20공속 장갑',must:[['활과 쇠뇌 기술 레벨',2],['공격 속도 증가',20]],premium:[['힘',10],['민첩',10],['적중당 마나 훔침',2],['마법 아이템 발견 확률',15]],use:'활아마',miss:'2활/20공속 외에 스탯·마흡·매찬/저항이 실제 차별화 요소입니다.'},
  {id:'rare-glove-martial',name:'2무술 20공속 장갑',must:[['무술 기술 레벨',2],['공격 속도 증가',20]],premium:[['힘',10],['민첩',10],['화염 저항',20],['번개 저항',20]],use:'무술씬',miss:'2무술/20공속 골격이 없으면 해당 고가군과 거리가 큽니다.'}
 ],
 부츠:[
  {id:'rare-boots-trires',name:'30달려 삼레부츠',must:[['달리기/걷기 속도 증가',30]],premium:[['RESCOUNT',3],['화염 저항',30],['번개 저항',30],['냉기 저항',30]],use:'범용/PvP',miss:'30달려 + 3레지 조합이 핵심입니다. 특히 파레/라레 고롤이 거래 선호도가 높습니다.'},
  {id:'rare-boots-dual-speed',name:'30달려 10패힛 쌍패부츠',must:[['달리기/걷기 속도 증가',30],['타격 회복 속도 증가',10]],premium:[['화염 저항',30],['번개 저항',30],['냉기 저항',30],['마법 아이템 발견 확률',20]],use:'PvP/범용',miss:'쌍패 이후 레지/매찬/삥이 얼마나 강한지가 등급을 가릅니다.'},
  {id:'rare-boots-gf-mf',name:'삥·매찬 하이브리드 부츠',must:[['골드 획득량',60]],premium:[['마법 아이템 발견 확률',20],['달리기/걷기 속도 증가',30],['화염 저항',30],['번개 저항',30]],use:'삥바바/PvM',miss:'고삥만으로는 부족하고 달려·레지·매찬이 같이 붙을수록 거래성이 커집니다.'}
 ],
 벨트:[
  {id:'rare-belt-fhr',name:'24패힛 고스탯 레지벨트',must:[['타격 회복 속도 증가',24]],premium:[['힘',20],['생명력',40],['화염 저항',20],['번개 저항',20]],use:'PvP/범용',miss:'24패힛 이후 힘·생명·저항이 얼마나 밀집했는지가 핵심입니다.'},
  {id:'rare-belt-gf-deep',name:'고삥 실전 벨트',must:[['골드 획득량',50]],premium:[['타격 회복 속도 증가',24],['힘',20],['생명력',40],['화염 저항',20]],use:'삥바바',miss:'삥만 높으면 저가형입니다. 24패힛/힘/생명/저항이 붙어야 고급군입니다.'}
 ],
 갑옷:[{id:'rare-armor-ethrep',name:'에테내회 고방상 갑옷',must:[['에테리얼',1],['내구도 자동 회복',1]],premium:[['소켓',2],['타격 회복 속도 증가',24],['생명력',40]],use:'PvP 방어형/컬렉터',miss:'에테+내회가 핵심이며 고방상/2솟/패힛/생명이 추가되어야 최상위권입니다.'}],
 무기:[{id:'rare-weapon-fools-quicklolo',name:'풀스/극증 퀵로로 계열',must:[['공격 속도 증가',30],['피해 증가',250]],premium:[['에테리얼',1],['내구도 자동 회복',1],['소켓',2],['명중률',100],['피해 증폭 발동',5]],use:'밀리 PvP/트로피',miss:'고ED·공속만으로는 부족합니다. 에테+내회, 2솟, Fool’s/앰플 등 희귀축과 베이스 프레임을 함께 봐야 합니다.'}],
 활:[{id:'rare-bow-amp-ias-ed',name:'앰플 고증뎀 레어활',must:[['피해 증폭 발동',5],['피해 증가',300]],premium:[['공격 속도 증가',20],['소켓',2],['활과 쇠뇌 기술 레벨',2]],use:'물리 활아마/PvP',miss:'앰플 단독은 고가가 아닙니다. 고ED·필요 공속·2솟·선호 베이스가 함께 맞아야 합니다.'}],
 자벨린:[{id:'rare-jav-ethrep',name:'4/40·에테 수량회복 자벨린',must:[['투창과 창 기술 레벨',2],['공격 속도 증가',40]],premium:[['에테리얼',1],['수량 자동 회복',1],['피해 증가',200],['명중률',100]],use:'자벨마/잽마 PvP',miss:'스킬형과 물리 잽마형의 평가축이 다릅니다. 4/40 또는 풀스·ED·에테·수량회복 조합을 구분해야 합니다.'}],
 클러:[{id:'rare-claw-trap',name:'트랩/WW 하이브리드 클러',must:[['암살자 기술 레벨',2]],premium:[['공격 속도 증가',30],['소켓',2],['피해 증가',250],['에테리얼',1],['내구도 자동 회복',1]],use:'트랩씬/WW씬 PvP',miss:'클러는 스태프모드(+LS 등)와 베이스 WSM이 핵심이라 이미지 OCR로 스킬명을 정확히 읽는 것이 중요합니다.'}],
 오브:[{id:'rare-orb-sorc',name:'2소서/20패캐 스태프모드 오브',must:[['원소술사 기술 레벨',2],['시전 속도 증가',20]],premium:[['마나',60],['소켓',2]],use:'소서 캐스터/ES',miss:'실제 핵심 공격스킬 +3과 보조 스킬/마스터리 조합이 가격을 결정합니다. 스태프모드 미입력 시 평가는 보수적으로 처리됩니다.'}],
 완드:[{id:'rare-wand-nec',name:'2네크/20패캐 스태프모드 완드',must:[['강령술사 기술 레벨',2],['시전 속도 증가',20]],premium:[['마나',60],['소켓',2]],use:'본넥/독넥 PvP',miss:'뼈창/뼈영혼/맹독확산 같은 실제 스태프모드가 고가 여부를 가릅니다.'}],
 셉터:[{id:'rare-scepter-pala',name:'팔라 레어셉터',must:[['성기사 기술 레벨',2]],premium:[['공격 속도 증가',30],['피해 증가',250],['시전 속도 증가',20],['소켓',2]],use:'팔라 캐스터/밀리 특수형',miss:'캐스터 셉터와 물리 셉터를 분리해야 하며 실제 전투스킬 스태프모드가 핵심입니다.'}]
};
function cap(name,slot){const d=defs[name];if(!d)return null;return d.caps?.[slot]??Math.max(...Object.values(d.caps||{x:0}));}
function classSkillValue(map){let best=0,name='';for(const n of CLASS_SKILLS){const v=map.get(n)||0;if(v>best){best=v;name=n}}return {value:best,name};}
function getVal(map,name){if(name==='CLASS')return classSkillValue(map).value;if(name==='RESCOUNT')return RES.filter(r=>(map.get(r)||0)>0).length;return map.get(name)||0;}
function ratioFor(map,name,slot){const v=getVal(map,name), c=name==='CLASS'?2:(name==='RESCOUNT'?3:cap(name,slot)); return c?Math.min(1,v/c):0;}
function profileScore(profile,map,slot){let mustPts=0,mustMax=0,premPts=0,premMax=0,missing=[],matched=[];
 for(const [n,t] of profile.must||[]){mustMax+=22;const v=getVal(map,n);if(v>=t){mustPts+=22;matched.push(`${n==='CLASS'?(classSkillValue(map).name||'직업 스킬'):n} ${v}`)}else{mustPts+=Math.min(10,22*(v/(t||1)));missing.push(`${n==='CLASS'?'직업 기술 +2':n+' '+t}${defs[n]?.unit||''}`)}}
 for(const [n,t] of profile.premium||[]){premMax+=8;const v=getVal(map,n);if(v>=t){premPts+=8;matched.push(`${n==='RESCOUNT'?'레지 '+v+'종':n} ${v}`)}else if(v>0)premPts+=4*Math.min(1,v/t)}
 const raw=(mustMax?mustPts/mustMax*65:35)+(premMax?premPts/premMax*35:0);return {score:Math.round(raw),missing,matched};}
function itemQualityScore(items,slot){let total=0,weights=0;for(const it of items){const d=defs[it.name];if(!d)continue;const c=cap(it.name,slot)||Math.max(it.value,1);const r=Math.min(1,it.value/c);const w=d.weight||5;total+=r*w;weights+=w}return weights?Math.round(total/weights*100):0;}
function marketBand(score,profileScore,grade){if(grade==='S++'||score>=93&&profileScore>=90)return '트로피 / 최상위 고가 후보';if(score>=84&&profileScore>=78)return '고가 거래 후보';if(score>=72)return '중상급 실사용 · 거래권';if(score>=58)return '조건부 거래 / 실사용';return '득환 제외 가능성 높음';}
function grade(score){return score>=94?'S++':score>=88?'S+':score>=80?'S':score>=72?'A+':score>=64?'A':score>=54?'B':'C';}
function dbRecords(slot){const cat=CAT_MAP[slot]||slot;return (window.SKR_RARE_DATA||[]).filter(x=>x.cat===cat);}
function evaluate({slot,items,realm='래더',socketState=null,rarity='레어'}){
 const normalized=(items||[]).filter(x=>x&&x.name&&Number.isFinite(+x.value)).map(x=>({...x,value:+x.value}));
 const map=new Map();for(const x of normalized){map.set(x.name,Math.max(map.get(x.name)||0,x.value))} if(socketState!=null&&slot==='써클릿')map.set('소켓',+socketState);
 const profiles=highValueProfiles[slot]||[];let best=null;for(const p of profiles){const e=profileScore(p,map,slot);if(!best||e.score>best.fit)best={profile:p,fit:e.score,...e}}
 const quality=itemQualityScore(normalized,slot);
 const coreFit=best?best.fit:Math.min(70,quality);
 let synergy=0; const names=new Set(normalized.map(x=>x.name));
 if(names.has('시전 속도 증가')&&CLASS_SKILLS.some(x=>names.has(x)))synergy+=8;
 if(names.has('적중당 생명력 훔침')&&names.has('적중당 마나 훔침'))synergy+=8;
 if(names.has('달리기/걷기 속도 증가')&&RES.filter(x=>names.has(x)).length>=2)synergy+=6;
 if(slot==='써클릿'&&(map.get('소켓')||0)===2)synergy+=10;
 if(names.has('에테리얼')&&(names.has('내구도 자동 회복')||names.has('수량 자동 회복')))synergy+=10;
 let score=Math.round(quality*.38+coreFit*.52+Math.min(10,synergy)); score=Math.max(0,Math.min(99,score));
 const g=grade(score); const records=dbRecords(slot); const rec=best?records.find(x=>x.id===best.profile.id):records.sort((a,b)=>String(b.grade).localeCompare(String(a.grade)))[0];
 const strong=normalized.filter(x=>ratioFor(map,x.name,slot)>=.72).sort((a,b)=>ratioFor(map,b.name,slot)-ratioFor(map,a.name,slot));
 const why=[];if(best){why.push(`레어 득환 DB의 「${best.profile.name}」 기준과 ${best.fit}% 일치합니다.`)} if(strong.length)why.push(`상급 롤: ${strong.slice(0,4).map(x=>`${x.name} ${x.value}${defs[x.name]?.unit||''}`).join(' · ')}`);if(synergy)why.push('핵심 옵션이 같은 빌드 방향으로 겹쳐 조합 시너지가 있습니다.');
 const miss=[];if(best?.missing?.length)miss.push(`상위 고가군 대비 핵심 결손: ${best.missing.slice(0,3).join(' · ')}`);if(slot==='써클릿'){const s=map.get('소켓');if(s===undefined)miss.unshift('소켓 정보 미확인: 써클릿은 2소켓 여부가 가격 천장을 크게 좌우하므로 반드시 확인해야 합니다.');else if(s<2)miss.unshift(`${s||0}소켓: 2소켓 상위군 대비 가장 큰 가치 손실 요소입니다.`)} if(best?.profile?.miss)miss.push(best.profile.miss);
 const use=best?.profile?.use||rec?.market||'부위별 실사용 빌드와 거래 수요를 추가 확인해야 합니다.';
 const market=marketBand(score,coreFit,g);
 const evidence={record:rec||null,records:records.slice(0,5),realm,marketNote:rec?.market||'',sources:rec?.sources||[]};
 const compare=best?{title:best.profile.name,fit:best.fit,matched:best.matched.slice(0,6),missing:best.missing.slice(0,6),tierText:rec?.tiers?.[0]||'',market:rec?.market||''}:null;
 return {score,grade:g,quality,coreFit,market,why:why.join(' '),use,miss:miss.join(' '),tags:[g,market,...(strong.slice(0,3).map(x=>x.name))],compare,evidence};
}
window.SKR_RARE_ENGINE={defs,slotOptions,CLASS_SKILLS,cap,evaluate,dbRecords};
})();
