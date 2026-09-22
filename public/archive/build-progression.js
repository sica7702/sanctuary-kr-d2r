/* Guide-only editorial layer. Never writes to appraisal, item DBs, or market contracts. */
(function(root){
'use strict';
const reviewedAt='2026-09-21', patch='3.3 · 시즌 15';
const patchUrl='https://news.blizzard.com/en-us/article/24296140/diablo-ii-resurrected-ladder-season-15-now-live';
const patch32='https://news.blizzard.com/en-us/article/24261478/diablo-ii-resurrected-ladder-season-14-has-concluded';
const D={};
// BUILD_PROFILES
const slots=['weapon','offhand','helm','armor','gloves','belt','boots','amulet','ring1','ring2'];
const labels={weapon:'무기',offhand:'보조 장비',helm:'투구',armor:'갑옷',gloves:'장갑',belt:'허리띠',boots:'신발',amulet:'목걸이',ring1:'반지 1',ring2:'반지 2'};
const stages=[
 {id:'starter',name:'스타터',caption:'맨땅 · 일반 난이도',level:30,quests:4},
 {id:'growth',name:'지옥 진입',caption:'저예산 · 생존 기반',level:65,quests:8},
 {id:'core',name:'핵심 세팅',caption:'빌드 전환 · 주력 완성',level:80,quests:12},
 {id:'endgame',name:'엔드 세팅',caption:'목적별 고급 구성',level:90,quests:12}
];
const classSlugs={ama:'amazon',ass:'assassin',bar:'barbarian',dru:'druid',nec:'necromancer',pal:'paladin',sor:'sorceress',war:'warlock'};
const physical=new Set(['physical','magic-attack']);
const roleBySlot={
 weapon:'주력 기술이 사용하는 무기 종류와 실제 피해를 먼저 확인합니다.',
 offhand:'주무기와 함께 착용할 수 있는 보조 장비입니다. 양손 무기에는 일반 방패를 더하지 않습니다.',
 helm:'기술·저항을 먼저 확보하고, 후반에 피해 보완용 고유 효과를 선택합니다.',
 armor:'지옥 저항과 생존을 확보한 뒤 이동 또는 피해 장비로 교체합니다.',
 gloves:'공격·덫 설치는 공격 속도, 주문은 시전 속도를 구분합니다.',
 belt:'회복 물약 칸을 확보하고 관통·속도 등 이 빌드에 필요한 기능을 보완합니다.',
 boots:'달리기·저항·생명력을 우선합니다. 발차기 빌드는 신발의 기본 피해도 확인합니다.',
 amulet:'주력 기술과 속도 목표를 맞춘 뒤 저항·능력치를 보완합니다.',
 ring1:'저항·자원 회복을 보완합니다. 빙결 방지가 필요한 공격형은 이를 먼저 확보합니다.',
 ring2:'다른 부위에서 부족한 시전 속도·흡수·저항을 채웁니다.'
};
const itemNotes={
 '잠행':'탈 → 에드, 2홈 갑옷. 요구 레벨 17 이후 육성 목표입니다.',
 '전승':'오르트 → 솔, 2홈 투구. 요구 레벨 27 이후 목표입니다.',
 '영혼':'탈 → 주울 → 오르트 → 앰, 4홈 검/방패. 검과 모너크는 요구 힘이 크게 다릅니다. 모너크 힘 156을 무조건 선투자하지 마세요.',
 '영혼 (성기사 방패)':'4홈 성기사 전용 방패. 고유 모든 저항과 실제 요구 힘을 확인합니다.',
 '고대인의 서약':'랄 → 오르트 → 탈, 3홈 방패. 요구 레벨 21 이후 저항 보완용입니다.',
 '각운':'샤엘 → 에드, 2홈 방패. 빙결 방지·저항을 확보하는 저예산 대안입니다.',
 '통찰':'랄 → 티르 → 탈 → 솔. 4홈 미늘창/활 등 허용 베이스를 확인하세요. 창과 미늘창을 혼동하지 마세요.',
 '무한':'베르 → 말 → 베르 → 이스트. 4홈 창/미늘창 등 허용 베이스. 본체용과 용병용의 힘·민첩·무형 조건이 다릅니다.',
 '모자이크':'말 → 굴 → 앰, 3홈 손톱 두 자루가 이 구성의 전제입니다. 한 자루만으로 동일한 충전 유지 세팅이 되지 않습니다.',
 '꿈':'이오 → 자 → 풀, 3홈 투구/방패. 드림형은 두 부위 모두 준비하는 전환 경로입니다.',
 '수수께끼':'자 → 아이드 → 베르. 순간이동 편의 장비이며 대부분의 빌드에서 시작 필수품은 아닙니다.',
 '배신':'샤엘 → 주울 → 렘. 공격 속도·흐리기 발동이 핵심. 흐리기가 항상 발동해 있다고 계산하지 마세요.',
 '슬픔':'에드 → 티르 → 로 → 말 → 랄. 페이즈 블레이드라면 민첩 136 요구를 확인하세요.',
 '순백':'돌 → 이오, 2홈 원드. 뼈 창 등 필요한 고유 기술 보너스가 있는 재료를 먼저 확인합니다.',
 '악마의 기계':'폭발 화살과 관통을 활용하는 쇠뇌입니다. 쇠뇌용 화살을 사용합니다.',
 '치료':'정화 지원용 투구. 이 구성에서는 자체 생명력 훔침이 있다고 가정하지 않습니다. 게임 버전·래더의 현행 옵션을 확인합니다.',
 '안다리엘의 두개골':'요구 레벨 83. 생명력 훔침·공속을 제공하지만 화염 저항 감소를 랄 룬 등으로 보완해야 합니다.',
 '긍지':'집중 오라 지원용. 자체 무기 피해와 생명력 훔침이 해결되었다고 보지 마세요. 빙결·시체 손실도 확인합니다.',
 '사신의 종소리':'노화 발동으로 물리 피해를 돕습니다. 생명력 추출·피해 증폭·저항 감소와 서로 덮어쓸 수 있습니다.',
 '거미 그물띠':'요구 레벨 80. 저레벨 단계의 필수 벨트가 아닙니다.',
 '불사조':'속죄로 자원을 회복하지만 시체를 소비합니다. 시체 폭발·아이템 발견과 함께 쓸 때 주의합니다.'
};
function profile(id,source,entry,gate,budget,core,upgrade,focus,options={}){
 D[id]={source,entry,gate,budget,core,upgrade,focus,...options};
}
// Amazon / Assassin: each profile has its own transition and equipment path.
profile('javazon','lightning-fury-charged-strike-amazon-javazon-build','전기의 일격 → 전류의 일격으로 진행하고, 30레벨부터 번개의 격노를 추가합니다.','번개의 격노·관통을 확보하고 투창 수량과 마나 회복을 감당할 때 본격 전환합니다.',['투창 기술 보너스 투창','각운','연기','전승'],{weapon:'거인의 복수',offhand:'영혼',gloves:'투창 2기술·공속 20% 레어 장갑',belt:'서슬꼬리',ring1:'칠흑 서리'},['거인의 복수·관통 기반부터 확보','그리폰·무한은 주력 기술과 생존을 갖춘 뒤'], '투창 관통과 공속을 우선합니다. 순간이동 패캐와 투창 공속은 다른 목표입니다.');
profile('physical-bowazon','multiple-shot-guided-arrow-amazon-physical-bowazon-build','맨땅은 투창 육성 후 물리 활로 재분배하는 경로를 제공합니다.','활 기본 피해·명중률·마나 훔침을 갖춘 뒤 물리 활로 바꿉니다. 낮은 피해 활에 공속만 늘리지 마세요.',['조화','화살','배신','전승'],{weapon:'바람살',offhand:'화살',armor:'배신',gloves:'안수',belt:'서슬꼬리',ring1:'칠흑 서리'},['조화로 시작해 바람살 또는 신뢰로 무기 강화','신뢰를 본체가 들지 용병이 들지 먼저 결정'], '바람살+1막 신뢰와 본체 신뢰+2막 용병은 별도 구성입니다. 광신 레벨·활 베이스별 공속을 확인합니다.',{gated:true,mercAlternative:'바람살 본체라면 1막 냉기 용병 + 신뢰 활 + 배신/인내 + 흡수 투구를 비교합니다. 본체가 신뢰를 들면 2막 위세·긍지 구성을 사용할 수 있습니다. 두 구성을 합산하지 마세요.'});
profile('frost-bowazon','freezing-arrow-frostmaiden-amazon-build','초반 투창으로 진행하거나 냉기 화살을 육성하고, 빙결 화살이 열리는 30레벨을 준비합니다.','빙결 화살과 냉기 화살 시너지, 마나 회복을 확보하고 냉기 면역을 피할 지역을 정합니다.',['선율','화살','연기','전승'],{weapon:'선율',offhand:'화살',gloves:'활 2기술·공속 20% 레어 장갑',belt:'서슬꼬리',armor:'배신',ring1:'칠흑 서리'},['활 기술 보너스와 관통을 먼저 확보','얼음 → 냉기 피해 투구, 무한은 고급 선택'], '기술 피해와 관통이 중요합니다. 냉기 면역에는 물리 보조 공격·용병 또는 다른 사냥터를 준비합니다.');
profile('lightning-spearzon','elemental-spearzon-amazon-build','무한 창을 들기 전까지 투창 전류의 일격·번개의 격노로 자원을 모읍니다.','본체용 무한 창과 해당 베이스의 힘·민첩, 근접 생존을 준비한 다음 재분배합니다.',['거인의 복수','각운','연기','전승'],{weapon:'무한',offhand:'양손 창 사용',armor:'배신',gloves:'투창 2기술·공속 20% 레어 장갑',ring1:'칠흑 서리'},['본체용 창 베이스·무한을 가장 먼저 확정','그리폰·이동 갑옷보다 근접 저항과 공속을 우선'], '본체가 무한을 들므로 용병에게 무한을 다시 요구하지 않습니다. 일반 방패는 함께 착용할 수 없습니다.',{gated:true,end:{amulet:'대군주의 진노',belt:'귀 꿰미'},merc:{weapon:'통찰'}});
profile('plague-javazon','lightning-fury-charged-strike-amazon-javazon-build','투창으로 육성하고 역병 투창이 열린 뒤 독 계열로 재분배합니다.','역병 투창·맹독 투창 시너지를 확보하고 독 면역에 쓸 번개 보조 공격 또는 용병을 준비합니다.',['투창 기술 보너스 투창','각운','연기','전승'],{weapon:'거인의 복수',offhand:'영혼',gloves:'투창 2기술·공속 20% 레어 장갑',ring1:'칠흑 서리'},['독 투창 기술을 먼저 완성','수수께끼보다 독 면역 대응과 마나 회복 우선'], '독은 지속 피해입니다. 같은 대상에게 계속 던지는 것보다 범위를 깔고 이동합니다. 선고는 독 저항을 낮추지 않습니다.',{variant:true});
profile('fend-amazon','physical-spearzon-amazon-build','투창으로 안정적으로 진행하고 피해 높은 창을 확보한 뒤 난격으로 전환합니다.','창 피해·명중률·흡수·빙결 방지를 갖춰야 근접 다수전을 감당할 수 있습니다.',['명예 (창)','양손 창 사용','배신','기욤의 얼굴'],{weapon:'순종 (허용 창 베이스)',offhand:'양손 창 사용',armor:'배신',helm:'기욤의 얼굴',gloves:'안수',ring1:'칠흑 서리',belt:'귀 꿰미'},['명예/순종 창으로 기본 피해 확보','죽어가는 자의 숨결은 마지막 무기 투자'], '양손 창의 피해·공속과 생존을 함께 봅니다. 방패 막기 75%를 이 세팅에 적용하지 않습니다.',{gated:true});
profile('lightning-trapsin','lightning-death-sentry-assassin-trapsin-build','화염 작렬·불의 파동으로 육성한 뒤 번개 파수기와 죽음 파수기로 전환합니다.','번개 파수기 시너지와 첫 시체를 만드는 수단을 확보합니다. 면역은 화염 작렬·시체 폭발로 보완합니다.',['영혼','각운','연기','전승'],{weapon:'초승달',offhand:'영혼',armor:'배신',helm:'전승'},['번개 파수기 기술과 덫 설치 속도 확보','그리폰·무한·수수께끼를 용도별로 순차 교체'], '덫 설치는 공격 속도입니다. 패캐는 순간이동 등에 적용되며 덫 설치를 빠르게 하지 않습니다.');
profile('mosaic-assassin','mosaic-phoenix-strike-assassin-build','화염 덫 → 번개 덫으로 재료를 모읍니다. 모자이크 한 자루만으로 목표 운용을 시작하지 않습니다.','모자이크 두 자루, 충전·마무리 기술, 필요한 저항을 준비한 뒤 무술로 재분배합니다.',['영혼','각운','연기','전승'],{weapon:'모자이크',offhand:'모자이크',armor:'배신',gloves:'무술 2기술·공속 20% 레어 장갑',ring1:'칠흑 서리',boots:'선혈 기수'},['쌍 모자이크를 최우선 확보','수수께끼는 충전 유지 동선을 개선하는 다음 투자'], '충전 수와 마무리 기술을 먼저 익힙니다. 멀리 이동하거나 긴 대기 후에는 충전을 다시 확인합니다.',{gated:true});
profile('kicksin','dragon-talon-assassin-kicksin-build','화염 덫으로 진행한 뒤 용의 발톱·죽음 파수기를 준비합니다.','신발의 발차기 피해, 강타, 빙결 방지와 보스전 회복 수단을 갖추고 전환합니다.',['검은색','각운','배신','기욤의 얼굴'],{weapon:'검은색',offhand:'폭풍막이',helm:'기욤의 얼굴',armor:'배신',boots:'선혈 기수 (업그레이드)',gloves:'드라쿨의 손아귀',ring1:'칠흑 서리'},['무기보다 먼저 신발 베이스·강타 확인','폭풍채찍과 고급 갑옷은 생존 확보 후'], '업그레이드 신발은 힘 요구가 증가합니다. 우버전 생명력 추출을 다른 저주로 지우지 않도록 구성합니다.',{gated:true,merc:{weapon:'통찰'}});
profile('blade-fury','blade-fury-assassin-bladesin-build','화염 덫으로 육성한 뒤 칼날 기술 세트로 재분배합니다.','칼날 격노·파수기·방패 시너지와 명중률을 확보합니다. 원거리에서도 명중률 부족을 해결해야 합니다.',['명예 (한손 무기)','각운','배신','기욤의 얼굴'],{weapon:'죽음',offhand:'각운',armor:'배신',helm:'기욤의 얼굴',gloves:'안수',ring1:'칠흑 서리',amulet:'천사의 날개',ring2:'천사의 후광'},['칼날용 한손 무기 피해·명중률 먼저','불사조·인내는 후반 피해 투자'], '죽음은 허용 한손 도끼/검 베이스로 구성합니다. 칼날 격노 속도를 일반 근접 공속표와 혼동하지 마세요.',{gated:true});
profile('fire-trapsin','lightning-death-sentry-assassin-trapsin-build','화염 작렬·불의 파동으로 진행하고 지옥 화염 면역 대응을 준비합니다.','화염 덫 시너지와 죽음 파수기를 갖추고, 첫 시체를 용병이 만들 수 있어야 합니다.',['영혼','각운','연기','전승'],{weapon:'참나무의 심장',offhand:'영혼',helm:'꺼져가는 불길',armor:'배신'},['화염 기술·덫 설치 속도 우선','화염 파괴 부적 사용 시 낮아진 본체 화염 저항 보완'], '순수 화염만으로 모든 지역을 강행하지 않습니다. 죽음 파수기·용병과 지역 선택으로 면역을 처리합니다.',{variant:true});
profile('chaos-assassin','whirlwind-assassin-whirlwindsin-build','덫으로 육성하며 혼돈 재료를 모읍니다. 소용돌이는 장비로 얻는 기술입니다.','혼돈 손톱을 실제 착용한 뒤 손톱 숙련·명중률·흡수 조건을 맞춰 전환합니다.',['영혼','각운','연기','전승'],{weapon:'혼돈',offhand:'바르툭의 목 따개',armor:'배신',helm:'기욤의 얼굴',gloves:'안수',ring1:'칠흑 서리'},['혼돈 한 자루가 전환의 출발점','반대 손톱 → 생존 → 이동 장비 순서'], 'PvM 성장 예시입니다. PvP 전용 장비·규칙과 동일한 완성 세팅이라고 보지 마세요.',{gated:true});
profile('whirlwind-barbarian','whirlwind-barbarian-build','이중 타격·광분으로 육성하면서 검 두 자루를 강화합니다.','소용돌이가 열리는 30레벨만 보고 바꾸지 말고 무기 피해·흡수·명중률을 먼저 확보합니다.',['서약 (검)','명예 (검)','배신','아리앗의 얼굴'],{weapon:'슬픔',offhand:'서약 (검)',armor:'배신',helm:'아리앗의 얼굴',gloves:'안수',belt:'귀 꿰미',ring1:'칠흑 서리'},['서약급 무기로 사냥 기반 확보','슬픔 한 자루 → 두 번째 무기 → 고급 갑옷'], '무기 베이스와 장비 공속을 함께 계산합니다. 검에서 도끼로 바꾸면 숙련도도 바꿔야 합니다.',{gated:true});
profile('frenzy-barbarian','frenzy-barbarian-build','6레벨 이중 타격으로 시작하고 24레벨 광분을 추가합니다.','두 무기의 피해·명중률과 생명력·마나 훔침을 확보하면 같은 계열로 계속 성장할 수 있습니다.',['명예 (검)','강철 (검)','배신','전승'],{weapon:'서약 (검)',offhand:'집행자',armor:'배신',helm:'아리앗의 얼굴',gloves:'안수',belt:'귀 꿰미',ring1:'칠흑 서리'},['약한 쪽 무기부터 피해 보강','집행자 노화 → 슬픔 → 인내 순으로 목표 설정'], '집행자의 노화와 타격 피해가 다른 역할입니다. 시체 파밍 시 냉기 피해·시체 활용 방해 옵션도 확인합니다.');
profile('singer-barbarian','war-cry-barbarian-singer-build','근접으로 30레벨까지 진행한 후 전장의 함성 중심으로 재분배합니다.','전장의 함성, 쌍 영혼 또는 시전 장비와 통찰 용병을 준비합니다.',['영혼','영혼','잠행','전승'],{weapon:'영혼',offhand:'영혼',armor:'독사마술사의 가죽',helm:'할리퀸 관모',gloves:'마수'},['마나 공급과 시전 속도를 먼저 확보','함성 기술 장비 → 참나무의 심장 → 수수께끼'], '함성은 물리 주문입니다. 무기 자체 피해보다 기술·패캐가 중요하며 보스는 용병의 공격을 함께 활용합니다.',{gated:true});
profile('berserk-horker','berserk-barbarian-build','광분·이중 타격으로 진행 후 단일 정예를 잡는 광폭화로 전환합니다.','피해 높은 무기와 명중률, 아이템 발견을 확보합니다. 생명력 훔침만으로 광폭화 생존을 해결하지 마세요.',['서약 (검)','각운','연기','전승'],{weapon:'슬픔',offhand:'알리바바의 칼날',armor:'배신',helm:'할리퀸 관모',gloves:'행운의 장갑',belt:'트래그울의 끈',ring1:'나겔링',ring2:'패캐 10% 레어 반지'},['처치 속도를 확보한 다음 매찬을 늘림','수수께끼 → 시전 속도 → 보조 매찬 무기'], '아이템 발견은 남은 시체가 필요합니다. 빙결·시체 소멸과 신성한 빙결 용병을 피하는 구성을 우선합니다.',{gated:true,end:{belt:'트래그울의 끈'},extra:'칠흑 서리의 냉기 피해 대신 트래그울의 끈으로 빙결 방지를 확보하는 예시입니다. 다른 벨트로 바꾸면 빙결 방지 수단도 다시 준비하세요.',merc:{aura:'위세',weapon:'통찰'}});
profile('throw-barbarian','throw-barbarian-build','이중 타격으로 육성하거나 피해 높은 투척 무기를 찾으면 이중 투척으로 진행합니다.','투척 무기 두 자루, 투척 숙련과 수량 관리, 흡수·명중률을 확보한 뒤 전환합니다.',['피해 높은 투척 무기','피해 높은 투척 무기','배신','전승'],{weapon:'난도질 도끼',offhand:'전쟁표창',armor:'배신',helm:'아리앗의 얼굴',gloves:'안수',belt:'서슬꼬리',ring1:'칠흑 서리'},['두 투척 무기 피해와 수량 확보','난도질 도끼·전쟁표창 → 인내 → 용병 오라'], '피해 증폭을 활용하는 구성입니다. 용병의 노화가 이를 덮지 않도록 선택합니다.',{gated:true,mercAlternative:'고급 대안은 1막 신뢰 활 용병입니다. 신뢰+배신/인내+흡수 투구로 광신을 받되 실제 공속 구간을 다시 확인합니다. 2막 위세+긍지와 동시 적용되는 구성이 아닙니다.'});
profile('leap-attack','barbarian-class-and-builds','검 이중 타격으로 육성한 뒤 도약 공격과 도약 시너지를 확보합니다.','피해 높은 양손 검과 착지 후 안전을 확보하고 재분배합니다.',['명예 (양손 검)','양손 검 사용','배신','전승'],{weapon:'서약 (양손 검)',offhand:'양손 검 사용',armor:'배신',helm:'아리앗의 얼굴',gloves:'안수',ring1:'칠흑 서리',belt:'귀 꿰미'},['양손 검 기본 피해부터 확보','죽어가는 자의 숨결보다 명중률·생존 먼저'], '착지 지점과 다음 도약 경로를 미리 봅니다. 이 페이지의 숙련은 검 기준이며 다른 무기는 재분배가 필요합니다.',{gated:true,variant:true});
profile('wind-druid','wind-druid-build','화염폭풍·균열로 육성하고 회오리바람·허리케인이 열리면 원소 계열을 재분배합니다.','회오리바람 주력과 허리케인·회오리 갑옷 시너지, 마나 회복을 확보합니다.',['영혼','각운','잠행','전승'],{weapon:'영혼',offhand:'영혼',armor:'독사마술사의 가죽',helm:'드루이드 2기술·회오리바람 보너스 투구',gloves:'트래그울의 발톱'},['시전 속도와 주력 기술 투구','수수께끼로 위치 제어 → 참나무의 심장'], '회오리바람은 물리, 허리케인은 냉기입니다. 무한 하나로 회오리바람 피해가 직접 늘어난다고 보지 마세요.');
profile('fury-druid','fury-druid-build','균열로 육성하고 근접 무기를 준비한 뒤 늑대 분노로 바꿉니다.','분노가 열리는 30레벨 이후에도 무기 피해·공속·흡수·명중률이 전환의 기준입니다.',['립크래커','양손 지팡이 사용','배신','잘랄의 갈기'],{weapon:'립크래커 (업그레이드)',offhand:'양손 지팡이 사용',armor:'배신',helm:'잘랄의 갈기',gloves:'안수',belt:'귀 꿰미',ring1:'칠흑 서리',boots:'선혈 기수'},['립크래커 또는 적절한 양손 무기 확보','최종 죽음 베이스와 늑대 공속을 확정한 뒤 제작'], '일반 형태 패캐표는 분노 공격에 적용하지 않습니다. 변신 전용 공속과 생명력을 우선합니다.',{gated:true,extra:'탈태는 고급 대안입니다. 3.3 변경판의 래더·게임 버전과 실제 옵션을 확인한 뒤 잘랄을 교체하세요.'});
profile('fire-druid','fire-druid-build','화염폭풍 → 균열로 진행하며 화산·아마겟돈을 추가합니다.','화염 주력과 물리 피해가 있는 기술을 함께 사용하고 화염 면역이 적은 지역에서 기반을 만듭니다.',['영혼','각운','연기','전승'],{weapon:'영혼',offhand:'영혼',armor:'독사마술사의 가죽',helm:'꺼져가는 불길',gloves:'마수'},['화염 기술·저항을 우선 확보','불사조는 자원 회복, 무한은 저항 보조로 구분'], '꺼져가는 불길·무한·불사조를 한꺼번에 필수로 요구하지 않습니다. 본체 저항과 시전 목표를 유지하며 교체합니다.');
profile('summon-druid','summoner-druid-build','화염 육성 후 소환으로 바꾸거나, 늑대·큰곰을 차례로 확보하며 진행할 수 있습니다.','소환 계열 시너지와 소환수 재배치, 용병 피해를 확보합니다.',['영혼','각운','연기','전승'],{weapon:'참나무의 심장',offhand:'영혼',armor:'독사마술사의 가죽',helm:'잘랄의 갈기',gloves:'트래그울의 발톱'},['소환 기술을 먼저 확보','이동이 답답하면 수수께끼, 물리 지원은 야수 대안'], '사신의 종소리의 노화로 소환수 물리 피해를 보완하는 예시입니다. 긍지는 별도 대안이며 오라를 모두 합산하지 않습니다.');
profile('rabies-druid','druid-class-and-builds','화염으로 육성한 뒤 광견병과 맹독 덩굴 시너지로 재분배합니다.','독 피해 지속시간·전염 경로와 독 면역 대응을 먼저 익힙니다.',['역병 유발자','각운','연기','잘랄의 갈기'],{weapon:'역병 유발자',offhand:'폭풍막이',armor:'연기',helm:'잘랄의 갈기',gloves:'트래그울의 발톱',ring1:'칠흑 서리'},['광견병 기술·독 피해 보강','찔레보다 독 면역 대응·접근 생존을 먼저 확인'], '취향형 PvM 변형입니다. 독이 퍼지는 동안 이동하고, 보스·독 면역에 대한 속도 한계를 감안합니다.',{variant:true,gated:true});
profile('shockwave-druid','summoner-druid-build','육성 후 소환 기술과 곰 변신·충격파 지원을 준비합니다.','소환수가 피해를 담당하고 본체는 충격파로 제어하는 구조를 갖춥니다.',['영혼','각운','연기','잘랄의 갈기'],{weapon:'참나무의 심장',offhand:'영혼',armor:'독사마술사의 가죽',helm:'잘랄의 갈기',gloves:'트래그울의 발톱'},['소환수 피해와 용병 유지 우선','충격파 운용 안정 → 이동·기술 장비'], '충격파를 과거 버그 기반 주력 딜링으로 안내하지 않습니다. 변신 상태에서는 순간이동 등 사용 가능 행동을 따로 확인합니다.',{variant:true,gated:true});
profile('summon-necromancer','summoner-necromancer-build','해골 되살리기·해골 숙련을 먼저 투자하고 첫 시체부터 시체 폭발을 연결합니다.','해골과 용병이 첫 적을 잡을 수 있으면 시체 폭발 범위를 늘립니다. 수수께끼 없이도 시작할 수 있습니다.',['해골 기술 보너스 원드','해골 기술 보너스 네크로맨서 전용 방패','연기','전승'],{weapon:'레오릭 왕의 팔',offhand:'호문쿨루스',armor:'독사마술사의 가죽',helm:'할리퀸 관모',gloves:'트래그울의 발톱'},['해골·용병의 첫 처치 능력 확보','수수께끼로 집결 → 시전 속도·무한 선택'], '시체 폭발은 물리·화염 부분을 구분합니다. 본체 저주와 용병 장비의 저주, 시체 손실을 함께 점검합니다.',{merc:{aura:'위세',weapon:'무한'}});
profile('poison-necromancer','poison-necromancer-build','해골·시체 폭발로 자원을 모은 뒤 맹독 확산으로 재분배합니다.','독 3기술과 저항 감소 저주를 준비합니다. 죽음의 거미줄이 없으면 소환·시체 폭발을 유지하는 것도 방법입니다.',['독 기술 보너스 원드','트래그울의 날개','연기','전승'],{weapon:'독 기술 보너스 원드',offhand:'트래그울의 날개',gloves:'트래그울의 발톱',belt:'트래그울의 끈',armor:'독사마술사의 가죽'},['트래그울 3부위 등 저예산 독 기반 확보','죽음의 거미줄 → 이동 장비 → 속도·독 피해 보강'], '저항 감소 후 맹독 확산, 첫 시체에서 시체 폭발을 사용합니다. 무한 선고는 독 저항을 낮추지 않습니다.',{gated:true,merc:{aura:'위세',weapon:'통찰'}});
profile('bone-necromancer','bone-necromancer-build','해골 육성 또는 이빨로 진행한 뒤 뼈 창 중심으로 재분배합니다.','뼈 창과 시너지, 시전 속도·마나 회복을 확보합니다. 뼈 갑옷과 감옥도 활용합니다.',['순백','각운','잠행','전승'],{weapon:'순백',offhand:'영혼',armor:'독사마술사의 가죽',helm:'강령술사 2기술 레어 투구',gloves:'트래그울의 발톱'},['좋은 고유 기술 원드에 순백 제작','75 패캐 기반 → 125 패캐 선택 → 이동 장비'], '마법 면역은 시체 폭발·용병 또는 우회로 처리합니다. 선고를 마법 저항 감소 수단으로 안내하지 않습니다.');
profile('corpse-explosion','summoner-necromancer-build','해골과 용병으로 첫 시체를 만든 뒤 시체 폭발을 연결합니다.','마나 공급·시체 폭발 범위와 첫 처치 속도가 갖춰지면 파밍형으로 확장합니다.',['해골 기술 보너스 원드','각운','연기','전승'],{weapon:'영혼',offhand:'호문쿨루스',armor:'독사마술사의 가죽',helm:'할리퀸 관모',gloves:'트래그울의 발톱'},['피해 증폭과 첫 처치 용병 확보','수수께끼로 집결 → 75/125 패캐 목표 선택'], '소환 강령술사의 시체 폭발 비중을 높인 변형입니다. 속죄·빙결 등 시체 소비 수단을 무심코 추가하지 마세요.',{variant:true,merc:{aura:'위세',weapon:'무한'}});
profile('hammerdin','blessed-hammer-paladin-hammerdin-build','신성한 불꽃·열의로 진행하고 18레벨 이후 망치·집중을 준비합니다.','축복받은 망치와 집중 오라, 원기·축복받은 조준 시너지를 갖춘 뒤 재분배합니다.',['영혼','영혼 (성기사 방패)','잠행','전승'],{weapon:'영혼',offhand:'영혼 (성기사 방패)',armor:'독사마술사의 가죽',helm:'할리퀸 관모',gloves:'트래그울의 발톱'},['쌍 영혼·75 패캐로 기반 확보','125 패캐를 유지할 부위 구성 → 수수께끼'], '집중을 켜고 망치 궤도에 적을 둡니다. 시너지는 직접 투자 포인트 기준이며 장비 스킬을 같은 방식으로 더하지 않습니다.');
profile('foh-paladin','fist-of-the-heavens-foh-paladin-build','신성한 불꽃으로 육성하고 30레벨 천상의 주먹과 신성한 빛줄기를 준비합니다.','악마·언데드 중심의 사냥터를 정하고 천상의 주먹·신성한 빛줄기를 우선 완성합니다.',['영혼','영혼 (성기사 방패)','잠행','전승'],{weapon:'영혼',offhand:'영혼 (성기사 방패)',armor:'독사마술사의 가죽',helm:'할리퀸 관모',gloves:'트래그울의 발톱'},['신성한 빛줄기 피해와 마나 공급','이동·패캐 → 주력 기술 장비'], '빛줄기가 효과적인 적 유형과 번개 단일타를 구분합니다. 동물형이 많은 곳에는 다른 빌드나 보조 공격이 필요합니다.');
profile('smiter','smiter-paladin-build','신성한 불꽃·열의 또는 망치로 육성합니다. 강타만으로 전 구간을 진행하는 경로는 아닙니다.','강타·광신·신성한 방패, 강타 확률, 상처 악화, 생명력 추출과 충분한 저항을 모두 준비합니다.',['검은색','각운','연기','기욤의 얼굴'],{weapon:'검은색',offhand:'자카룸의 전령',armor:'연기',helm:'기욤의 얼굴',gloves:'드라쿨의 손아귀',boots:'고블린 발가락',belt:'천둥신의 박력',ring1:'칠흑 서리',ring2:'왜성'},['강타·생명력 추출·상처 악화부터 확인','슬픔은 처치 속도 투자, 추방은 고급 대안'], '우버 메피스토의 선고 아래 실제 저항을 확인합니다. 일반 생명력 훔침만으로 강타의 회복을 해결하지 마세요. 용병 생존을 전제로 계산하지 않습니다.',{gated:true,merc:{weapon:'통찰'}});
profile('zealot','zealot-paladin-build','신성한 불꽃·열의로 진행하다 광신형으로 재분배합니다.','광신과 열의, 무기 피해·명중률·흡수·빙결 방지가 전환 조건입니다.',['명예 (한손 검)','각운','배신','기욤의 얼굴'],{weapon:'서약 (한손 검)',offhand:'자카룸의 전령',armor:'배신',helm:'기욤의 얼굴',gloves:'안수',belt:'귀 꿰미',ring1:'칠흑 서리'},['무기 기본 피해 → 슬픔','대군주·선혈 기수 → 인내 순서'], '열의 공속은 광신과 무기 베이스를 포함해 계산합니다. 노화와 생명력 추출 중 어떤 저주를 유지할지 선택합니다.');
profile('tesladin','dream-zealot-paladin-build','신성한 불꽃 이후 망치 또는 일반 열의로 고급 룬을 모읍니다.','꿈 투구·꿈 방패를 모두 준비하고 본체 선고와 번개 저항·구원 시너지로 재분배합니다.',['영혼','영혼 (성기사 방패)','연기','전승'],{weapon:'초승달',offhand:'꿈',helm:'꿈',armor:'배신',gloves:'안수',belt:'귀 꿰미',ring1:'칠흑 서리'},['쌍 꿈이 가장 먼저','본체 선고 레벨과 명중·공속 → 슬픔·인내'], '장비 신성한 충격과 본체가 켜는 선고를 구분합니다. 꿈 한 부위만 있는 상태를 완성 드림형으로 계산하지 않습니다.',{gated:true,merc:{aura:'위세'},mercAlternative:'본체 선고를 유지하면서 공속을 보완하려면 1막 신뢰 활 용병을 선택할 수 있습니다. 기본 2막 위세·사신의 종소리와는 별도 조합입니다.'});
profile('avenger','avenger-paladin-build','신성한 불꽃·열의로 육성하고 피해 높은 한손 무기를 준비합니다.','복수·원소 저항 시너지·선고, 실제 무기 피해와 마나 흡수를 함께 갖춥니다.',['명예 (한손 무기)','각운','연기','전승'],{weapon:'서약 (한손 무기)',offhand:'자카룸의 전령',armor:'배신',helm:'기욤의 얼굴',gloves:'드라쿨의 손아귀',belt:'귀 꿰미',ring1:'칠흑 서리'},['원소 전환에 사용하는 무기 기본 피해','명중·마나 회복 → 죽어가는 자의 숨결'], '슬픔의 추가 피해를 복수의 원소 전환용 무기 피해와 동일하게 취급하지 않습니다. 저주 충돌 없이 회복을 유지합니다.',{gated:true,merc:{weapon:'통찰'}});
profile('holy-freeze-zealot','holy-freeze-zealot-paladin-freezadin-build','신성한 불꽃으로 시작해 18레벨 이후 신성한 빙결 열의로 재분배할 수 있습니다.','초기에는 직접 신성한 빙결을 켭니다. 파멸을 들 때는 장비 오라와 본체 오라·시너지를 다시 정합니다.',['명예 (한손 무기)','각운','배신','전승'],{weapon:'파멸',offhand:'자카룸의 전령',armor:'배신',helm:'기욤의 얼굴',gloves:'안수',ring1:'칠흑 서리',belt:'귀 꿰미'},['초기 자력 신성한 빙결은 저예산 경로','파멸 구비 후 광신 운용으로 재분배 → 인내'], '같은 신성한 빙결 오라를 본체·장비·용병에서 중복 합산하지 않습니다. 파멸 단계는 본체 광신형 예시입니다.',{merc:{aura:'위세'},growthPlan:{priority:[['Holy Freeze',20],['Resist Cold',20],['Zeal',20],['Salvation',20]],support:['Holy Shield']},priority:[['Resist Cold',20],['Salvation',20],['Fanaticism',20],['Sacrifice',20],['Zeal',20]]});
profile('blizzard-sorceress','blizzard-sorceress-build','화염구로 육성하다 눈보라가 열리는 24레벨 이후 냉기로 재분배합니다.','눈보라와 시너지, 순간이동·마나 회복을 확보한 뒤 냉기 면역이 적은 지역을 반복 사냥합니다.',['영혼','각운','잠행','전승'],{weapon:'오큘러스',offhand:'영혼',armor:'독사마술사의 가죽',helm:'할리퀸 관모',gloves:'트래그울의 발톱'},['63 패캐 기반 → 105 패캐 선택','죽음의 깊이·밤날개는 후반 냉기 피해 투자'], '냉기 숙련은 장비 포함 레벨과 상대 저항을 함께 확인합니다. 파괴 부적의 저항 불이익을 생존 장비로 보완합니다.');
profile('lightning-sorceress','lightning-sorceress-build','화염구 또는 냉기로 자원을 확보한 뒤 번개·연쇄 번개로 재분배합니다.','번개 시너지와 번개 면역 대응, 마나 회복을 준비합니다. 무한을 못 구하면 면역이 적은 지역부터 시작합니다.',['영혼','각운','잠행','전승'],{weapon:'초승달',offhand:'영혼',armor:'독사마술사의 가죽',helm:'전승',gloves:'마수',amulet:'패캐·원소술사 기술 목걸이'},['초승달 교체 때 빠지는 패캐를 보완','117 패캐 목표 → 그리폰·무한'], '번개·연쇄 번개는 일반 주문 105가 아닌 117 패캐 구간을 따로 확인합니다.',{gated:true,end:{amulet:'원소술사 2기술·패캐 20% 목걸이'}});
profile('nova-sorceress','nova-sorceress-build','초기에는 화염·냉기 주문으로 육성합니다. 값싼 장비로 곧바로 자가 무한 세팅을 흉내내지 않습니다.','본체 무한, 105 패캐, 염력 투자와 에너지 보호막, 마나 회복·독 대응을 확보한 뒤 전환합니다.',['영혼','각운','잠행','전승'],{weapon:'무한',offhand:'양손 미늘창 사용',armor:'독사마술사의 가죽',helm:'그리폰의 눈',gloves:'마수',belt:'거미 그물띠',amulet:'패캐 10% 목걸이',ring1:'마나·저항 반지',ring2:'마나·저항 반지'},['본체 무한과 실제 합산 105 패캐가 전환 조건','마나·에너지 보호막 안정 → 요르단·고급 부적'], '무한+그리폰25+독사30+마수20+거미20+목걸이10 = 105 패캐 예시입니다. 방패는 함께 착용하지 않습니다.',{gated:true,end:{amulet:'원소술사 2기술·패캐 10% 이상 목걸이'},merc:{aura:'기도',weapon:'통찰'}});
profile('fireball-meteor','fireball-sorceress-build','화염탄·화염구를 이어 육성하고 18레벨부터 순간이동을 확보합니다.','화염구·운석 시너지와 마나 회복을 준비합니다. 지옥 화염 면역은 우회·용병 또는 이중 원소로 대응합니다.',['영혼','각운','잠행','전승'],{weapon:'영혼',offhand:'영혼',armor:'독사마술사의 가죽',helm:'꺼져가는 불길',gloves:'마수'},['화염 기술·105 패캐를 우선','에슈타·무한은 저항 대응과 피해를 위한 고급 투자'], '운석 대기 시간 동안 화염구를 사용합니다. 피해 표시만 높이려고 저항·시전 속도를 잃지 마세요.');
profile('hydra-orb','hydra-orb-sorceress-build','화염구로 진행하다 30레벨부터 히드라·얼음 보주 이중 원소를 준비합니다.','두 주력과 화염 숙련·냉기 숙련, 통찰 또는 마나 회복을 확보합니다.',['영혼','각운','잠행','전승'],{weapon:'오큘러스',offhand:'영혼',armor:'독사마술사의 가죽',helm:'할리퀸 관모',gloves:'마수'},['두 원소 기술의 균형과 63/105 패캐','탈 라샤 세트는 개별 부위 혼합과 별도 대안으로 비교'], '히드라를 깔고 얼음 보주가 터지는 거리를 맞춥니다. 단일 원소 엔드 빌드보다 각 원소의 최대 피해가 낮은 절충형입니다.');
profile('enchant-bow','enchantress-sorceress-build','화염구로 육성하며 악마의 기계와 마법부여 보조 장비를 준비합니다.','악마의 기계·서슬꼬리, 마법부여·온기·화염 숙련을 갖추고 전환합니다.',['악마의 기계','쇠뇌용 화살','잠행','전승'],{weapon:'악마의 기계',offhand:'쇠뇌용 화살',armor:'독사마술사의 가죽',helm:'꺼져가는 불길',gloves:'마수',belt:'서슬꼬리',ring1:'칠흑 서리'},['악마의 기계·관통 조합이 우선','마법부여 사전 시전 장비 → 화염 면역 대응'], '마법부여 가이드의 쇠뇌 PvM 변형입니다. 버프용 장비와 실제 사냥 장비는 구분하고, 쇠뇌를 들면 방패는 착용하지 않습니다.',{gated:true,variant:true});
profile('frozen-orb','blizzard-sorceress-build','화염구로 진행하고 30레벨 이후 얼음 보주로 재분배합니다.','얼음 보주·얼음살과 냉기 숙련, 마나 회복을 갖추고 냉기 면역 대응을 준비합니다.',['영혼','각운','잠행','전승'],{weapon:'오큘러스',offhand:'영혼',armor:'독사마술사의 가죽',helm:'할리퀸 관모',gloves:'트래그울의 발톱'},['보주 폭발 거리와 시너지 확보','죽음의 깊이·밤날개는 고급 피해 선택'], '냉기 가이드에서 분리한 순수 보주 변형입니다. 냉기 면역을 자주 만나면 히드라·보주 경로를 비교하세요.',{variant:true});
profile('bear-sorceress','bear-sorceress-build','주문형으로 육성하며 야수·꿈 두 부위를 모읍니다. 처음부터 곰 공격으로 시작하는 빌드가 아닙니다.','야수 변신, 꿈 투구·방패, 마법부여·번개 숙련과 근접 생존을 갖춰야 합니다.',['영혼','각운','잠행','전승'],{weapon:'야수',offhand:'꿈',helm:'꿈',armor:'배신',gloves:'안수',belt:'귀 꿰미',ring1:'칠흑 서리'},['야수·쌍 꿈을 갖춘 뒤 재분배','근접 공속·생존 → 명예의 굴레·무한 용병'], '곰 변신 중에는 주문형과 같은 조작·순간이동 운용을 전제하지 않습니다. 사전 버프 후 근접으로 싸우는 고비용 취향형입니다.',{gated:true});
profile('bow-warlock','echoing-strike-warlock-build','마법 피해 주문으로 육성하고 활·명중률 장비가 준비되면 거울 칼날로 바꿉니다.','거울 칼날과 활 피해·명중률, 공속·마나 공급을 갖춘 뒤 전환합니다.',['조화','화살','배신','전승'],{weapon:'안개',offhand:'화살',armor:'배신',helm:'악마술사 2기술 레어 투구',gloves:'공속 20% 레어 장갑',ring1:'칠흑 서리'},['활 기본 피해와 명중률 먼저','안개·공속 → 용병 지원, 용 갑옷은 필수 아님'], '메아리/거울 칼날 계열을 바탕으로 정리한 활 변형입니다. 신규 패치 실측 최적 세팅으로 단정하지 않습니다.',{gated:true,variant:true,end:{armor:'인내',amulet:'대군주의 진노',ring2:'생명력·마나 훔침 레어 반지'},extra:'3.2 이후 거울 칼날 투사체 관련 수정과 명중률 표시를 반영해 실제 적중 여부를 확인하세요.'});
profile('echoing-warlock','echoing-strike-warlock-build','독기 볼트·독기 사슬로 육성하며 사용할 무기의 피해와 요구 능력치를 준비합니다.','메아리치는 타격·시너지와 명중률을 확보합니다. 양손 무기와 함께 쓰는 보조는 마법서여야 합니다.',['통찰','악마술사 기술 마법서','연기','전승'],{weapon:'통찰',offhand:'악마술사 기술 마법서',armor:'배신',helm:'기욤의 얼굴',gloves:'안수',amulet:'천사의 날개',ring2:'천사의 후광'},['고피해 무기와 명중률을 먼저','수수께끼·고급 마법서 → 최종 무기 비교'], '3.2 이후 항상 명중하던 동작을 가정하지 않습니다. 명중률과 기술별 적용 옵션을 확인하며 슬픔 추가 피해를 그대로 합산하지 않습니다.',{gated:true,end:{weapon:'아리옥의 바늘',offhand:'아르스 둘메피스토스'},extra:'엔드 예시는 아리옥의 바늘+마법서 경로입니다. 과거 출시 직후의 버그 기반 피해 수치를 인용하지 않습니다.'});
profile('fire-warlock','fire-warlock-build','독기 볼트·사슬 육성 경로를 사용하고, 화염 계열로 전환할 때 포인트를 다시 배분합니다.','화염 파동·종말과 소모 지원을 갖추고 화염 면역 대응을 준비합니다.',['영혼','악마술사 기술 마법서','잠행','전승'],{weapon:'참나무의 심장',offhand:'악마술사 기술 마법서',armor:'독사마술사의 가죽',helm:'꺼져가는 불길',gloves:'마수'},['기술·시전 속도·자원 회복','화염 저항 보조와 고급 무기는 마지막 비교'], '화염 계열은 소환 악마·소모 지원과 함께 운용합니다. 과거 3.2 PTR 수치를 현재 라이브 수치로 사용하지 않습니다.',{end:{weapon:'망 송의 가르침',offhand:'아르스 알디아볼로스'},merc:{weapon:'무한'}});
profile('abyss-warlock','magic-warlock-build','독기 볼트에서 독기 사슬·심연으로 이어지는 마법 피해 육성입니다.','주력 마법 3기술과 마나 공급을 갖춥니다. 강화된 엔트로피는 장비 포함 레벨을 보고 조절합니다.',['영혼','악마술사 기술 마법서','잠행','전승'],{weapon:'공허',offhand:'악마술사 기술 마법서',armor:'독사마술사의 가죽',helm:'악마술사 2기술 레어 투구',gloves:'트래그울의 발톱'},['주력 기술·마나 회복을 먼저','공허의 고유 기술 재료 → 마법서·이동 장비'], '강화된 엔트로피는 장비 포함 20 목표를 참고하며 20포인트 직접 투자를 자동 권장하지 않습니다. 아래는 우선 1포인트 예시입니다.',{priority:[['Miasma Bolt',20],['Miasma Chains',20],['Abyss',20],['Enhanced Entropy',1],['Consume',20],['Demonic Mastery',10]]});
profile('summon-warlock','demon-warlock-build','마법 계열로 육성하고 소환·속박에 필요한 포인트를 준비합니다.','물리 소환수 중심인지 화염 소환수 중심인지 먼저 정합니다. 속박 대상 등급에 필요한 직접 투자를 확인합니다.',['영혼','악마술사 기술 마법서','연기','전승'],{weapon:'참나무의 심장',offhand:'악마술사 기술 마법서',armor:'독사마술사의 가죽',helm:'악마술사 2기술 레어 투구',gloves:'트래그울의 발톱'},['악마 숙련의 직접 투자·소환수 수부터 확인','물리 염소인간형의 야수와 마법형 장비를 구분'], '3.2 이후 속박 선고 오라를 전제로 무한을 생략하는 설명을 사용하지 않습니다. 기본은 물리 소환수 중심 예시입니다.',{gated:true,end:{weapon:'야수',offhand:'악마술사 기술 마법서'},merc:{weapon:'사신의 종소리',aura:'위세'}});
profile('blood-boil-warlock','blood-boil-warlock-build','마법 주문으로 육성한 뒤 끓는 피·소환 지원으로 재분배합니다.','끓는 피와 소환수 유지·소모, 근접 범위에서 버틸 생존을 확보합니다.',['영혼','악마술사 기술 마법서','연기','전승'],{weapon:'참나무의 심장',offhand:'악마술사 기술 마법서',armor:'독사마술사의 가죽',helm:'꺼져가는 불길',gloves:'마수'},['소환수 유지·화염 기술·저항 우선','무한 용병 → 고급 지팡이·마법서'], '가까운 범위의 지속 화염 운용입니다. 위세는 물리 소환수 보조이며 끓는 피 화염 피해를 직접 올리는 오라가 아닙니다.',{gated:true,end:{weapon:'망 송의 가르침',offhand:'아르스 토르바알로스',helm:'꺼져가는 불길',gloves:'마수'},merc:{weapon:'무한',aura:'위세'}});
profile('cleave-warlock','cleave-warlock-build','마법 계열로 육성한 뒤 피해 높은 근접 무기를 준비합니다.','가르기와 명중률·공속·흡수·저항을 갖추고 근접 운용으로 재분배합니다.',['통찰','악마술사 기술 마법서','배신','전승'],{weapon:'서약 (양손 검)',offhand:'악마술사 기술 마법서',armor:'배신',helm:'기욤의 얼굴',gloves:'안수',belt:'귀 꿰미',ring1:'칠흑 서리'},['무기 기본 피해·명중률·흡수 확보','죽어가는 자의 숨결과 이동/피해 갑옷을 용도별 선택'], '양손 무기를 한 손에 드는 특례는 마법서와의 조합입니다. 일반 영혼·불사조 방패를 같이 추천하지 않습니다.',{gated:true,merc:{aura:'위세'}});
// PROFILE_DATA
function mergeGear(base,overrides={}){
 const map=Object.fromEntries(base.map(g=>[g.slot,{...g}]));
 for(const [slot,name]of Object.entries(overrides))map[slot]={...map[slot],slot,name};
 return slots.map(slot=>({...map[slot],slot,role:roleBySlot[slot]}));
}
function mercenary(b,p,stage){
 const n=stages.findIndex(s=>s.id===stage),corpse=['berserk-horker','corpse-explosion','summon-necromancer','poison-necromancer'].includes(b.id);
 const starter={act:2,name:'사막 용병',aura:'기도',weapon:'착용 가능한 피해 높은 미늘창',helm:'저항·생명력 투구',armor:'저항·방어 갑옷',
  purpose:'일반 난이도에서는 앞에서 버티는 역할. 레벨·저항이 낮으면 고가 장비보다 본체 생존에 먼저 투자합니다.',
  next:'통찰을 만들 수 있는 4홈 미늘창과 솔 룬을 모으세요. 현재 레벨·힘·민첩으로 착용 가능한지 먼저 확인합니다.'};
 if(n===0)return starter;
 let m={...starter,aura:physical.has(b.type)||corpse||b.type==='summon'?'위세':'신성한 빙결',weapon:'통찰',helm:'탈 라샤의 호라드림 관모',armor:'배신',purpose:'명상으로 마나 부담을 낮추고, 생명력 훔침으로 전열을 유지하는 저예산 구성.',next:'생명력 훔침 → 저항 → 무기 피해·공속 순으로 보강합니다. 관모를 못 쓰는 레벨이면 생명력 훔침 투구로 대체합니다.'};
 if(n>=2){
  m={...m,...b.merc,...(p.merc||{}),name:'사막 용병'};
  m.purpose=({무한:'선고로 화염·냉기·번개 저항을 보조합니다. 독·마법 저항을 낮추는 장비는 아닙니다.',통찰:'본체가 지속적으로 기술을 쓰도록 명상으로 마나를 지원합니다.',긍지:'위세와 집중으로 본체·소환수의 물리 피해를 보조합니다.', '사신의 종소리':'공격 시 노화로 물리 저항과 적의 공격 부담을 낮춥니다.'})[m.weapon]||m.purpose;
  if(n===2){m.helm='탈 라샤의 호라드림 관모';m.armor='배신';if(m.weapon==='무한'){m.weapon='통찰';m.purpose='고급 용병 무기 전 단계입니다. 통찰로 마나를 지원하면서 무한의 재료를 모읍니다.';}}
  if(corpse){m.aura='위세';m.purpose+=' 시체를 남기는 운용이 중요하므로 신성한 빙결을 기본 추천하지 않습니다.';}
 }
 if(['nova-sorceress'].includes(b.id)){
  m.aura='기도';m.weapon='통찰';m.purpose='에너지 보호막 운용을 위한 마나 회복. 기도와 명상, 정화 지원을 함께 검토하는 회복형입니다.';
  if(n===3){m.helm='치료';m.armor='명예의 굴레';m.next='치료를 쓰면 투구의 흡수를 잃습니다. 갑옷 등 다른 부위의 생명력 훔침을 확보하고 교체하세요.';}
 }
 if(b.id==='smiter'&&n>=2){m.purpose='우버전은 용병이 죽어도 완성되는 본체를 기준으로 준비합니다. 아래 장비는 일반 사냥용 선택 사항입니다.';m.weapon='통찰';}
 if(['kicksin','avenger'].includes(b.id)&&n>=2){m.weapon='통찰';m.purpose='생명력 추출 유지가 중요한 구성. 이를 지워 버리는 노화 발동 무기는 기본 추천에서 제외합니다.';}
 if(b.id==='blood-boil-warlock'&&n===3)m.weapon='무한';
 m.base='2막 용병: 4홈 미늘창 통찰 / 4홈 미늘창·허용 창 무한. 아마존 전용 창은 용병이 착용하지 못합니다.';
 m.survival='생명력 훔침은 실제 물리 공격이 적중해야 회복됩니다. 강한 독·원소 공격, 흡수 불가 대상에는 물약과 재배치가 필요합니다.';
 m.alternative=p.mercAlternative||(m.weapon==='무한'?'무한을 구하기 전에는 통찰을 유지하고 면역이 적은 사냥터를 고르세요. 무한으로 바꿀 때 본체의 마나 회복 수단을 따로 준비합니다.':m.weapon==='사신의 종소리'?'마나가 모자라면 통찰 유지도 가능합니다. 저주를 직접 쓰는 빌드는 노화가 다른 저주를 덮는지 먼저 확인합니다.':m.weapon==='긍지'?'용병 자체의 처치·생존이 약하면 사신의 종소리 또는 피해 높은 통찰을 비교합니다. 집중 오라만으로 생존이 해결되지는 않습니다.':'용병이 자주 죽는다면 고가 룬워드보다 레벨·저항·흡수·공속을 먼저 보완합니다.');
 return m;
}
const bridgePaths={
 ama:{name:'번개 투창 육성',weapon:'투창 기술 보너스 투창',offhand:'각운',priority:[['Charged Strike',20],['Lightning Fury',20],['Lightning Strike',20]],support:['Pierce']},
 ass:{name:'번개 덫 육성',weapon:'영혼',offhand:'각운',priority:[['Lightning Sentry',20],['Charged Bolt Sentry',20],['Shock Field',20],['Fire Trauma',20]],support:['Death Sentry','Fade']},
 bar:{name:'광분 육성',weapon:'명예 (검)',offhand:'강철 (검)',priority:[['Frenzy',20],['Blade Mastery',20],['Battle Orders',20],['Double Swing',20]],support:['Natural Resistance']},
 dru:{name:'화염 원소 육성',weapon:'영혼',offhand:'각운',priority:[['Eruption',20],['Firestorm',20],['Volcano',20]],support:['Oak Sage','Summon Grizzly']},
 nec:{name:'소환·시체 폭발 육성',weapon:'해골 기술 보너스 원드',offhand:'각운',priority:[['Raise Skeleton',20],['Skeleton Mastery',20],['Corpse Explosion',20]],support:['Amplify Damage','Clay Golem','Summon Resist']},
 pal:{name:'축복받은 망치 육성',weapon:'영혼',offhand:'영혼 (성기사 방패)',priority:[['Blessed Hammer',20],['Vigor',20],['Blessed Aim',20],['Concentration',20]],support:['Holy Shield']},
 sor:{name:'눈보라 육성',weapon:'영혼',offhand:'각운',priority:[['Blizzard',20],['Ice Blast',20],['Glacial Spike',20],['Ice Bolt',20]],support:['Teleport','Static Field','Cold Mastery','Warmth']},
 war:{name:'독기 사슬·심연 육성',weapon:'영혼',offhand:'악마술사 기술 마법서',priority:[['Miasma Chains',20],['Miasma Bolt',20],['Abyss',20]],support:['Levitate','Enhanced Entropy']}
};
function prepare(original){
 const b=JSON.parse(JSON.stringify(original)),p=D[b.id];if(!p)throw Error('진행 가이드 없음: '+b.id);
 b.gear=mergeGear(b.gear,p.end||{});
 if(p.priority)b.priority=p.priority;
 if(p.support)b.support=p.support;
 if(p.merc)b.merc={...b.merc,...p.merc};
 const isAttack=physical.has(b.type)||b.class==='ama'||['mosaic-assassin','enchant-bow','bear-sorceress','bow-warlock','avenger','holy-freeze-zealot','tesladin','cleave-warlock'].includes(b.id);
 const budgetBase=mergeGear(b.early.gear,{
  weapon:p.budget[0],offhand:p.budget[1],armor:p.budget[2],helm:p.budget[3],
  gloves:isAttack?'공격 속도·저항 장갑':'마수',belt:isAttack?'생명력·저항 4줄 벨트':'마나·저항 4줄 벨트',
  boots:'달리기·저항 신발',amulet:'주력 기술·저항 목걸이',ring1:isAttack?'마나 훔침·저항 반지':'패캐 10% 레어 반지',ring2:isAttack?'생명력 훔침·저항 반지':'패캐 10% 레어 반지'
 });
 const core=mergeGear(budgetBase,p.core);
 const earlyGear=mergeGear(b.early.gear);
 const out=stages.map((s,i)=>{
  const bridge=i===1&&p.gated;
  const route=bridgePaths[b.class];
  const gear=i===0?earlyGear:i===1?(bridge?mergeGear(earlyGear,{weapon:route.weapon,offhand:route.offhand,armor:'연기',helm:'전승'}):budgetBase):i===2?core:b.gear;
  const plan=i===0?b.early:bridge?route:i===1&&p.growthPlan?p.growthPlan:{priority:b.priority,support:b.support};
  const goals=i===0?[p.entry,'잠행(17레벨)·고대인의 서약(21레벨)·전승(27레벨)은 순서대로 갖출 목표입니다. 모든 부위를 시작부터 착용하는 목록이 아닙니다.','퀘스트 보상과 주운 저항 장비를 활용하세요. 고급 룬을 초반 장비에 먼저 쓰지 마세요.']:
   i===1?[bridge?'아직 목표 빌드로 재분배하지 않습니다. 스타터 경로로 자원을 모읍니다.':p.gate,'지옥에서는 화염·번개 저항과 생명력을 먼저 점검합니다. 파괴 부적은 입장 필수품이 아닙니다.',p.focus]:
   i===2?[p.gate,...p.upgrade]:['아래는 한 가지 목적에 맞춘 고급 구성 예시입니다. 모든 슬롯이 유일한 정답은 아닙니다.',p.focus,'부적·교체 무기까지 포함해 속도·저항·요구 능력치를 재점검합니다. 완벽한 변동 옵션은 마지막 투자입니다.'];
  return {...s,gear,plan,goals,upgrade:i===0?['주운 무기·주력 기술로 진행 기반 마련','잠행 → 부족한 저항 부위 → 전승 순서']:i===1?[bridge?route.name+' 경로로 재료 마련':'저예산 주력 무기·저항부터 확보','마나 회복·속도와 전환 조건 확인']:p.upgrade,focus:i===0?p.entry:bridge?route.name+'를 유지하며 목표 장비를 모읍니다. 아래 핵심 세팅의 필수 장비가 준비된 뒤 재분배하세요.':p.focus,aura:i===0||bridge?'':b.id==='holy-freeze-zealot'&&i===1?'이 단계에서는 신성한 빙결을 직접 켭니다. 파멸을 들기 전이므로 광신·장비 오라 설명을 적용하지 않습니다.':b.aura,rotation:b.id==='holy-freeze-zealot'&&i===1?['신성한 빙결을 직접 켜고 신성한 방패를 유지합니다.','열의로 공격하며 냉기 면역은 물리 피해와 용병으로 보완합니다.','파멸을 구하기 전에는 광신형으로 재분배하지 않습니다.']:b.rotation,merc:mercenary(b,p,s.id),isLeveling:i===0||bridge,route:i===0?'육성 경로':bridge?route.name:b.name,gate:i===0?'다음 단계: 악몽에서 저항·마나 회복을 확보하고 주력 기술을 완성합니다.':i===1?p.gate:i===2?'핵심 장비로 목표 지역을 안정적으로 반복 사냥한 뒤 고급 부위에 투자합니다.':'캐릭터 완성 후에도 생존·사냥터·속도 목표에 맞춰 대안을 선택하세요.'};
 });
 return {build:b,profile:p,stages:out,reviewedAt,patch,patchUrl,patch32,sourceUrl:'https://www.icy-veins.com/d2/'+p.source,levelingUrl:'https://www.icy-veins.com/d2/'+classSlugs[b.class]+'-fastest-leveling-build'};
}
root.SKRBuildProgress={prepare,profiles:D,stages,labels,itemNotes,reviewedAt,patch,patchUrl,patch32};
})(typeof window==='undefined'?globalThis:window);
