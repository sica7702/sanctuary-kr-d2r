/* Sanctuary KR · Rare Appraisal Engine v40
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
 '적에게서 얻는 금화 증가':{unit:'%',caps:{반지:60,목걸이:120,장갑:120,부츠:120,벨트:120},aliases:['골드 획득','적에게서 얻는 금화 증가','삥','금화','적에게서 얻는 금화','extra gold','extra gold from monsters'],weight:4},
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


// v45 exact charged-skill catalog (Arreat Summit + current D2Runewizard/RotW cross-check).
const CHARGED_SKILLS=[
 ['내면의 시야','Inner Sight'],['마법 화살','Magic Arrow'],['불꽃 화살','Fire Arrow'],['냉기 화살','Cold Arrow'],['다발 사격','Multiple Shot'],['폭발 화살','Exploding Arrow'],['얼음 화살','Ice Arrow'],['빙결 화살','Freezing Arrow'],['전기의 일격','Power Strike'],['전류의 일격','Charged Strike'],['번개의 일격','Lightning Strike'],
 ['얼음살','Ice Bolt'],['얼음 작렬','Ice Blast'],['서릿발','Frost Nova'],['빙하 가시','Glacial Spike'],['눈보라','Blizzard'],['얼음 보주','Frozen Orb'],['번개 줄기','Charged Bolt'],['염력','Telekinesis'],['번개 파장','Nova'],['번개','Lightning'],['연쇄 번개','Chain Lightning'],['순간이동','Teleport'],['화염탄','Fire Bolt'],['화염구','Fire Ball'],['마법부여','Enchant'],['운석 낙하','Meteor'],
 ['이빨','Teeth'],['맹독 단도','Poison Dagger'],['뼈 창','Bone Spear'],['맹독 확산','Poison Nova'],['뼈 영혼','Bone Spirit'],['시야 흐리기','Dim Vision'],['약화','Weaken'],['공포','Terror'],['혼란','Confuse'],['생명력 추출','Life Tap'],['유혹','Attract'],['저항 감소','Lower Resist'],
 ['희생','Sacrifice'],['신성한 빛줄기','Holy Bolt'],['열의','Zeal'],['복수','Vengeance'],['축복받은 망치','Blessed Hammer'],['강타','Bash'],['기절','Stun'],['집중','Concentrate'],['섬뜩한 호신부','Grim Ward'],['화염폭풍','Firestorm'],['균열','Fissure'],['돌개바람','Twister'],['화산','Volcano'],['회오리바람','Tornado'],
 ['인장: 무기력','Sigil Lethargy'],['독기 탄환','Miasma Bolt'],['종말','Apocalypse']
];
const CHARGE_CAPS={반지:99,목걸이:99,써클릿:99,장갑:99,부츠:99,벨트:99,갑옷:99,방패:99,무기:99,활:99,자벨린:99,클러:99,오브:99,완드:99,셉터:99,직업전용:99};
for(const [ko,en] of CHARGED_SKILLS){const n=`충전 기술 · ${ko}`; if(!defs[n]) defs[n]={caps:{...CHARGE_CAPS},aliases:[ko,en,`레벨 ${ko}`,'충전','인장'],weight:2};}
CLASS_SKILLS.forEach(n=>defs[n]={caps:{목걸이:2,써클릿:2,직업전용:2,오브:2,완드:2,셉터:2,클러:2,방패:2},aliases:[n.replace(' 기술 레벨',''),'기술 레벨'],weight:14});
/* v43 comprehensive manual-affix catalog.
 * Goal: no recognized/manual rare or crafted modifier is blocked just because the valuation engine
 * does not yet assign it a premium weight. Unknown/very base-specific caps intentionally stay null
 * rather than inventing a false maximum; the manual editor still accepts the observed value.
 */
Object.assign(defs,{
 '피해 감소':{caps:{반지:2,목걸이:4,써클릿:4,장갑:4,부츠:4,벨트:4,갑옷:4,방패:4},aliases:['피해 감소','피해감소','damage reduced by','dr'],weight:3},
 '방어력 증가':{unit:'%',caps:{써클릿:200,장갑:200,부츠:200,벨트:200,갑옷:200,방패:200},aliases:['방어력 증가','증방','enhanced defense','ed defense'],weight:4},
 '방어력':{caps:{써클릿:200,장갑:200,부츠:200,벨트:200,갑옷:300,방패:300},aliases:['방어력','defense'],weight:3},
 '원거리 공격 방어력':{caps:{써클릿:200,갑옷:200,방패:200},aliases:['원거리 공격 방어력','미사일 방어','defense vs missile'],weight:2},
 '근접 공격 방어력':{caps:{써클릿:200,갑옷:200,방패:200},aliases:['근접 공격 방어력','근접 방어','defense vs melee'],weight:2},
 '막기 속도 증가':{unit:'%',caps:{방패:30},aliases:['막기 속도','블럭 속도','패블럭','faster block rate','fbr'],weight:7},
 '막기 확률 증가':{unit:'%',caps:{방패:20},aliases:['막기 확률','블럭 확률','increased chance of blocking'],weight:7},
 '요구 능력치 감소':{unit:'%',caps:{써클릿:30,갑옷:30,방패:30,무기:30,활:30,자벨린:30,클러:30,오브:30,완드:30,셉터:30,직업전용:30},aliases:['착용 조건','요구치 감소','요구 능력치','requirements'],weight:4},
 '내구도 증가':{unit:'%',caps:{갑옷:100,방패:100,무기:100,활:100,클러:100},aliases:['내구도 증가','increase maximum durability','durability'],weight:1},
 '마법 피해 감소':{caps:{반지:3,목걸이:3,써클릿:3,장갑:3,부츠:3,벨트:3,갑옷:15,방패:3},aliases:['마법 피해 감소','마뎀 감소','magic damage reduced','mdr'],weight:4},
 '피해 감소 %':{unit:'%',caps:{반지:10,목걸이:10,써클릿:10,장갑:10,부츠:10,벨트:10,갑옷:10,방패:10},aliases:['피해 감소 %','물리 피해 감소','damage reduced by %','dr%'],weight:5},
 '중독 지속시간 감소':{unit:'%',caps:{반지:25,목걸이:25,써클릿:25,장갑:25,부츠:25,벨트:25,갑옷:25,방패:25},aliases:['중독 지속시간 감소','중감','poison length reduced'],weight:4},
 '빙결 지속시간 절반':{caps:{반지:1,목걸이:1,써클릿:1,장갑:1,부츠:1,벨트:1,갑옷:1,방패:1},aliases:['빙결 지속시간 절반','빙감','half freeze duration'],weight:3},
 '마력':{caps:{반지:15,목걸이:20,써클릿:20,장갑:15,부츠:10,벨트:20,갑옷:20,방패:20,오브:20,완드:20,셉터:20,직업전용:20},aliases:['마력','에너지','energy'],weight:4},
 '활력':{caps:{반지:20,목걸이:30,써클릿:30,장갑:20,부츠:15,벨트:30,갑옷:30,방패:30,직업전용:30},aliases:['활력','vitality'],weight:5},
 '모든 능력치':{caps:{반지:15,목걸이:20,써클릿:20,장갑:15,부츠:10,벨트:20,갑옷:20,방패:20},aliases:['모든 능력치','모든 능력','올스탯','all attributes','all stats'],weight:7},
 '최대 지구력':{caps:{반지:20,목걸이:20,써클릿:30,장갑:30,부츠:30,벨트:30,갑옷:30},aliases:['최대 지구력','최대 스태미나','maximum stamina'],weight:1},
 '지구력 회복 속도':{unit:'%',caps:{부츠:50,벨트:50,갑옷:50},aliases:['지구력 회복','스태미나 회복','heal stamina'],weight:1},
 '시야':{caps:{반지:5,목걸이:5,써클릿:5,무기:5},aliases:['시야','빛 반경','light radius'],weight:1},
 '공격자가 받는 피해':{caps:{반지:9,목걸이:9,써클릿:9,갑옷:20,방패:20},aliases:['공격자가 받는 피해','가시 피해','attacker takes damage'],weight:2},
 '적 처치 시 생명력':{caps:{반지:5,목걸이:5,써클릿:5,무기:5,오브:5,완드:5,셉터:5},aliases:['적 처치 시 생명력','라이프 이치 킬','life after each kill','laek'],weight:4},
 '적 처치 시 마나':{caps:{반지:5,목걸이:5,써클릿:5,무기:5,오브:5,완드:5,셉터:5},aliases:['적 처치 시 마나','마나 이치 킬','mana after each kill','maek'],weight:4},
 '악마에게 주는 피해':{unit:'%',caps:{무기:300,활:300,자벨린:300,클러:300,셉터:300},aliases:['악마에게 주는 피해','damage to demons'],weight:3},
 '악마에 대한 명중률':{caps:{무기:300,활:300,자벨린:300,클러:300,셉터:300},aliases:['악마에 대한 명중률','attack rating against demons'],weight:2},
 '언데드에게 주는 피해':{unit:'%',caps:{무기:300,활:300,자벨린:300,클러:300,셉터:300},aliases:['언데드에게 주는 피해','damage to undead'],weight:3},
 '언데드에 대한 명중률':{caps:{무기:300,활:300,자벨린:300,클러:300,셉터:300},aliases:['언데드에 대한 명중률','attack rating against undead'],weight:2},
 '화염 피해 최소':{caps:{반지:100,목걸이:100,무기:500,활:500,자벨린:500,클러:500},aliases:['화염 피해 최소','adds fire damage min'],weight:3},
 '화염 피해 최대':{caps:{반지:100,목걸이:100,무기:500,활:500,자벨린:500,클러:500},aliases:['화염 피해 최대','adds fire damage max'],weight:3},
 '냉기 피해 최소':{caps:{반지:100,목걸이:100,무기:500,활:500,자벨린:500,클러:500},aliases:['냉기 피해 최소','adds cold damage min'],weight:3},
 '냉기 피해 최대':{caps:{반지:100,목걸이:100,무기:500,활:500,자벨린:500,클러:500},aliases:['냉기 피해 최대','adds cold damage max'],weight:3},
 '번개 피해 최소':{caps:{반지:100,목걸이:100,무기:500,활:500,자벨린:500,클러:500},aliases:['번개 피해 최소','adds lightning damage min'],weight:3},
 '번개 피해 최대':{caps:{반지:100,목걸이:100,무기:500,활:500,자벨린:500,클러:500},aliases:['번개 피해 최대','adds lightning damage max'],weight:3},
 '독 피해':{caps:{반지:500,목걸이:500,무기:1000,활:1000,자벨린:1000,클러:1000},aliases:['독 피해','poison damage'],weight:3},
 '치명적 공격':{unit:'%',caps:{무기:20,활:20,자벨린:20,클러:20,장갑:10,벨트:10},aliases:['치명적 공격','deadly strike','ds'],weight:7},
 '강타 확률':{unit:'%',caps:{무기:20,장갑:10,벨트:10},aliases:['강타 확률','강타','crushing blow','cb'],weight:7},
 '상처 악화':{unit:'%',caps:{무기:20,장갑:10,벨트:10},aliases:['상처 악화','open wounds','ow'],weight:6},
 '밀쳐내기':{caps:{무기:1,활:1,장갑:1},aliases:['밀쳐내기','넉백','knockback'],weight:4},
 '괴물 회복 저지':{caps:{무기:1,활:1,자벨린:1,클러:1},aliases:['괴물 회복 저지','몬스터 회복 저지','prevent monster heal','pmh'],weight:4},
 '대상 방어력 감소':{unit:'%',caps:{무기:25,활:25,자벨린:25,클러:25},aliases:['대상 방어력 감소','target defense','- target defense'],weight:5},
 '대상 방어력 무시':{caps:{무기:1,활:1,자벨린:1,클러:1},aliases:['대상 방어력 무시','ignore target defense','itd'],weight:6},
 '레벨당 최대 피해':{caps:{반지:1,무기:1,활:1,자벨린:1,클러:1},aliases:['레벨당 최대 피해','max damage per level','fools max'],weight:10},
 '레벨당 명중률':{caps:{반지:1,무기:1,활:1,자벨린:1,클러:1},aliases:['레벨당 명중률','attack rating per level','fools ar'],weight:10},
 '레벨당 생명력':{caps:{갑옷:1,써클릿:1},aliases:['레벨당 생명력','life per level'],weight:3},
 '레벨당 마나':{caps:{오브:1,완드:1,셉터:1,목걸이:1},aliases:['레벨당 마나','mana per level'],weight:3},
 '시전 시 기술 발동':{caps:{무기:100,활:100,자벨린:100,클러:100,오브:100,완드:100,셉터:100},aliases:['시전 시 기술 발동','chance to cast when struck','ctc'],weight:3},
 '타격 시 기술 발동':{caps:{무기:100,활:100,자벨린:100,클러:100,셉터:100},aliases:['타격 시 기술 발동','chance to cast on striking','ctc on striking'],weight:5},
 '피격 시 기술 발동':{caps:{써클릿:100,갑옷:100,방패:100,무기:100},aliases:['피격 시 기술 발동','chance to cast when struck','ctc when struck'],weight:3},
 '개별 기술 레벨 (스태프모드)':{caps:{오브:3,완드:3,셉터:3,클러:3,직업전용:3,방패:3},aliases:['개별 기술','스태프모드','staffmod','staff mod'],weight:13},
 '공격 오라 기술 레벨':{caps:{목걸이:2,써클릿:2,셉터:2},aliases:['공격 오라','offensive auras'],weight:10},
 '방어 오라 기술 레벨':{caps:{목걸이:2,써클릿:2,셉터:2},aliases:['방어 오라','defensive auras'],weight:8},
 '전투 기술 레벨 (성기사)':{caps:{목걸이:2,써클릿:2,셉터:2},aliases:['성기사 전투 기술','paladin combat skills'],weight:11},
 '번개 기술 레벨':{caps:{목걸이:2,써클릿:2,오브:2},aliases:['번개 기술','lightning skills'],weight:10},
 '화염 기술 레벨':{caps:{목걸이:2,써클릿:2,오브:2},aliases:['화염 기술','fire skills'],weight:10},
 '냉기 기술 레벨':{caps:{목걸이:2,써클릿:2,오브:2},aliases:['냉기 기술','cold skills'],weight:10},
 '소환 기술 레벨':{caps:{목걸이:2,써클릿:2,완드:2,직업전용:2},aliases:['소환 기술','summoning skills'],weight:9},
 '뼈와 독 기술 레벨':{caps:{목걸이:2,써클릿:2,완드:2},aliases:['뼈와 독','poison and bone skills'],weight:10},
 '저주 기술 레벨':{caps:{목걸이:2,써클릿:2,완드:2},aliases:['저주 기술','curses'],weight:8},
 '함성 기술 레벨':{caps:{목걸이:2,써클릿:2,직업전용:2},aliases:['함성 기술','warcries'],weight:9},
 '전투 숙련 기술 레벨':{caps:{목걸이:2,써클릿:2,직업전용:2},aliases:['전투 숙련','combat masteries'],weight:8},
 '야만용사 전투 기술 레벨':{caps:{목걸이:2,써클릿:2,직업전용:2},aliases:['야만용사 전투 기술','barbarian combat skills'],weight:9},
 '원소 기술 레벨':{caps:{목걸이:2,써클릿:2,직업전용:2},aliases:['원소 기술','elemental skills'],weight:10},
 '변신 기술 레벨':{caps:{목걸이:2,써클릿:2,직업전용:2},aliases:['변신 기술','shape shifting skills'],weight:9},
 '덫 기술 레벨':{caps:{목걸이:2,써클릿:2,클러:2},aliases:['덫 기술','트랩 기술','traps'],weight:11},
 '그림자 단련 기술 레벨':{caps:{목걸이:2,써클릿:2,클러:2},aliases:['그림자 단련','shadow disciplines'],weight:9},
 '패시브와 마법 기술 레벨':{caps:{목걸이:2,써클릿:2,장갑:2},aliases:['패시브와 마법','패시브 마법','passive and magic skills'],weight:8},
 '전투 기술 레벨 (야만용사)':{caps:{목걸이:2,써클릿:2,직업전용:2},aliases:['야만용사 전투 기술','전투 기술 (야만용사)','barbarian combat skills'],weight:9},
 '혼돈 기술 레벨':{caps:{목걸이:2,써클릿:2,직업전용:2},aliases:['혼돈 기술','혼돈','chaos skills'],weight:10},
 '기괴 기술 레벨':{caps:{목걸이:2,써클릿:2,직업전용:2},aliases:['기괴 기술','기괴','grotesque skills'],weight:10},
 '악마 기술 레벨':{caps:{목걸이:2,써클릿:2,직업전용:2},aliases:['악마 기술','악마 계열','demon skills'],weight:10},
 '받는 피해의 %만큼 마나 회복':{unit:'%',caps:{목걸이:12,방패:12,오브:12,직업전용:12},aliases:['받은 피해의','받는 피해의','마나로 회복','만큼 마나 회복','피해의 일부를 마나','damage taken goes to mana','dtgtm','vulpine'],weight:4},
 '최대 마나 증가':{unit:'%',caps:{반지:10,목걸이:10,써클릿:10,오브:10,완드:10,셉터:10},aliases:['최대 마나 증가','최대 마나','increase maximum mana'],weight:5},
 '최대 생명력 증가':{unit:'%',caps:{반지:10,목걸이:10,써클릿:10,갑옷:10},aliases:['최대 생명력 증가','최대 생명력','increase maximum life'],weight:5},
 '결빙되지 않음':{caps:{반지:1,목걸이:1,써클릿:1,장갑:1,부츠:1,벨트:1,갑옷:1,방패:1},aliases:['결빙되지 않음','빙결되지 않음','cannot be frozen','cbf'],weight:8},
 '대상 감속':{unit:'%',caps:{무기:25,활:25,자벨린:25,클러:25,장갑:10},aliases:['대상 감속','대상을 감속','slow target','slows target'],weight:4},
 '몬스터 도주':{unit:'%',caps:{무기:100,활:100,자벨린:100,클러:100},aliases:['몬스터가 달아남','괴물 도주','hit causes monster to flee','monster flee'],weight:2},
 '대상 빙결':{caps:{무기:3,활:3,자벨린:3,클러:3},aliases:['대상 빙결','목표물 빙결','freezes target'],weight:4},
 '공격자가 받는 번개 피해':{caps:{반지:15,목걸이:15,써클릿:15,갑옷:30,방패:30},aliases:['공격자가 받는 번개 피해','attacker takes lightning damage'],weight:2},
 '명중 시 시야 감소':{caps:{무기:3,활:3,자벨린:3,클러:3},aliases:['명중 시 시야 감소','대상 시야 감소','blind target','- light radius'],weight:2},
 '독 지속시간':{caps:{반지:6,목걸이:6,무기:10,활:10,자벨린:10,클러:10},aliases:['독 지속시간','poison duration'],weight:1},
 '충전 기술':{caps:{반지:99,목걸이:99,써클릿:99,무기:99,활:99,자벨린:99,클러:99,오브:99,완드:99,셉터:99,직업전용:99},aliases:['충전 기술','충전','회 충전','charges','인장'],weight:2}
});

const STAFFMOD_SKILLS=window.SKR_STAFFMOD_SKILLS||[];
for(const sk of STAFFMOD_SKILLS){
 const caps={}; for(const slot of sk.slots||[])caps[slot]=3;
 defs[sk.key]={caps,aliases:[sk.ko,sk.en,...(sk.aliases||[])],weight:10+(sk.tier||3)};
}
const slotOptions={
 반지:['시전 속도 증가','명중률','최소 피해','최대 피해','힘','민첩','생명력','마나','모든 저항',...RES,'적중당 생명력 훔침','적중당 마나 훔침','생명력 회복','마법 아이템 발견 확률','적에게서 얻는 금화 증가'],
 목걸이:[...CLASS_SKILLS,'시전 속도 증가','명중률','최소 피해','최대 피해','힘','민첩','생명력','마나','마나 재생','모든 저항',...RES,'적중당 생명력 훔침','적중당 마나 훔침','생명력 회복','마법 아이템 발견 확률','적에게서 얻는 금화 증가'],
 써클릿:[...CLASS_SKILLS,'시전 속도 증가','달리기/걷기 속도 증가','타격 회복 속도 증가','명중률','최소 피해','최대 피해','힘','민첩','생명력','마나','모든 저항',...RES,'적중당 생명력 훔침','적중당 마나 훔침','생명력 회복','마법 아이템 발견 확률','소켓'],
 장갑:['공격 속도 증가','투창과 창 기술 레벨','활과 쇠뇌 기술 레벨','무술 기술 레벨','힘','민첩',...RES,'적중당 생명력 훔침','적중당 마나 훔침','마법 아이템 발견 확률','적에게서 얻는 금화 증가'],
 부츠:['달리기/걷기 속도 증가','타격 회복 속도 증가','민첩',...RES,'마법 아이템 발견 확률','적에게서 얻는 금화 증가','생명력 회복'],
 벨트:['타격 회복 속도 증가','힘','생명력','마나',...RES,'생명력 회복','적에게서 얻는 금화 증가'],
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
// v43: manual fallback is intentionally broader than OCR/valuation profiles.
// Every catalogued modifier remains searchable even when it is not a recommended affix for the selected slot.
const broad={
 방어:['방어력 증가','방어력','원거리 공격 방어력','근접 공격 방어력','막기 속도 증가','막기 확률 증가','요구 능력치 감소','내구도 증가','피해 감소','피해 감소 %','마법 피해 감소','중독 지속시간 감소','빙결 지속시간 절반','공격자가 받는 피해','공격자가 받는 번개 피해','결빙되지 않음'],
 자원:['마력','활력','모든 능력치','최대 지구력','지구력 회복 속도','시야','적 처치 시 생명력','적 처치 시 마나','받는 피해의 %만큼 마나 회복','최대 마나 증가','최대 생명력 증가'],
 공격:['악마에게 주는 피해','악마에 대한 명중률','언데드에게 주는 피해','언데드에 대한 명중률','화염 피해 최소','화염 피해 최대','냉기 피해 최소','냉기 피해 최대','번개 피해 최소','번개 피해 최대','독 피해','치명적 공격','강타 확률','상처 악화','밀쳐내기','괴물 회복 저지','대상 방어력 감소','대상 방어력 무시','레벨당 최대 피해','레벨당 명중률','타격 시 기술 발동','피격 시 기술 발동','시전 시 기술 발동','충전 기술','대상 감속','몬스터 도주','대상 빙결','명중 시 시야 감소'],
 스킬:['개별 기술 레벨 (스태프모드)','공격 오라 기술 레벨','방어 오라 기술 레벨','전투 기술 레벨 (성기사)','번개 기술 레벨','화염 기술 레벨','냉기 기술 레벨','소환 기술 레벨','뼈와 독 기술 레벨','저주 기술 레벨','함성 기술 레벨','전투 숙련 기술 레벨','야만용사 전투 기술 레벨','원소 기술 레벨','변신 기술 레벨','덫 기술 레벨','그림자 단련 기술 레벨','패시브와 마법 기술 레벨','전투 기술 레벨 (야만용사)','혼돈 기술 레벨','기괴 기술 레벨','악마 기술 레벨']
};
const addUnique=(slot,arr)=>{slotOptions[slot]=[...new Set([...(slotOptions[slot]||[]),...arr])];};
['반지','목걸이','써클릿','장갑','부츠','벨트','갑옷','방패','무기','활','자벨린','클러','오브','완드','셉터','직업 전용'].forEach(slot=>addUnique(slot,[...broad.방어,...broad.자원,...broad.공격,...broad.스킬]));
for(const sk of STAFFMOD_SKILLS)for(const slot of sk.slots||[])addUnique(slot,[sk.key]);
const highValueProfiles={
 반지:[
  {id:'rare-ring-fcr-caster',name:'패캐링 · 캐스터/PvP',must:[['시전 속도 증가',10]],premium:[['힘',15],['민첩',10],['생명력',30],['마나',60],['모든 저항',8],['번개 저항',20],['화염 저항',20]],use:'캐스터/PvP 패캐 브레이크포인트',miss:'10패캐를 출발점으로 고스탯·고마나·고저항 중 3축 이상이 붙어야 고가군으로 올라갑니다.'},
  {id:'rare-ring-dual-leech',name:'듀얼링 · 밀리/PvM',must:[['적중당 생명력 훔침',1],['적중당 마나 훔침',1]],premium:[['명중률',80],['힘',15],['민첩',10],['최소 피해',5],['화염 저항',20],['번개 저항',20]],use:'물리 딜러·삥바바·밀리 세팅',miss:'듀얼흡 자체보다 명중/스탯/피해/저항이 함께 붙어야 거래 프리미엄이 생깁니다.'},
  {id:'rare-ring-melee-ar',name:'전투링 · 어레/민맥 PvP',must:[['명중률',80]],premium:[['최소 피해',5],['최대 피해',3],['힘',15],['민첩',10],['생명력',30],['생명력 회복',5]],use:'질딘·바바 등 밀리 PvP',miss:'고어레만으로는 부족하고 피해축 + 스탯/생존축이 같이 완성되어야 합니다.'},
  {id:'rare-ring-es-mana',name:'에쉴 고마나 패캐링',must:[['시전 속도 증가',10],['마나',60]],premium:[['힘',15],['민첩',10],['모든 저항',8],['생명력 회복',5]],use:'에너지 실드 소서 PvP',miss:'80~90 마나 상급롤과 패캐, 스탯/저항이 겹칠수록 희소도가 급상승합니다.'}
 ],
 목걸이:[
  {id:'rare-amu-2skill-fcr',name:'2스킬 10패캐 목걸이',must:[['CLASS',2],['시전 속도 증가',10]],premium:[['힘',20],['민첩',15],['생명력',40],['마나',60],['모든 저항',15]],use:'캐스터/PvP 2스킬·패캐 세팅',miss:'레어 목걸이는 2직업/10패캐가 고가 캐스터형의 핵심 출발점입니다. 둘 중 하나가 없으면 상위 거래군 진입이 크게 어려워집니다.'},
  {id:'rare-amu-stat-res',name:'2스킬 고스탯·고저항 목걸이',must:[['CLASS',2]],premium:[['힘',20],['민첩',15],['생명력',40],['마나',60],['모든 저항',15],['화염 저항',30],['번개 저항',30]],use:'밀리/PvP 및 패캐 비의존 세팅',miss:'패캐가 없다면 마라/하이로드 같은 대체재를 이길 만큼 스탯·저항·생존 옵션이 강해야 합니다.'},
  {id:'rare-amu-gf',name:'삥/흡수 목걸이',must:[['적에게서 얻는 금화 증가',30]],premium:[['야만용사 기술 레벨',2],['시전 속도 증가',10],['적중당 마나 훔침',4],['화염 저항',20],['번개 저항',20]],use:'삥바바 실사용',miss:'삥 수치만 높으면 대체재가 많습니다. 바바 스킬/패캐/마흡/저항이 같이 붙어야 실거래성이 올라갑니다.'}
 ],
 써클릿:[
  {id:'rare-circ-2202',name:'2스킬 20패캐 2솟 · 광패뚜',must:[['CLASS',2],['시전 속도 증가',20],['소켓',2]],premium:[['힘',20],['민첩',15],['생명력',40],['마나',60],['모든 저항',15],['화염 저항',30],['번개 저항',30]],use:'캐스터/PvP 최상위 써클릿',miss:'2스킬/20패캐 골격 위에서 2소켓이 가격 천장을 크게 좌우합니다. 2솟 부재는 가장 큰 결손 중 하나입니다.'},
  {id:'rare-circ-frw',name:'2스킬 30달려 2솟 · 기동형',must:[['CLASS',2],['달리기/걷기 속도 증가',30],['소켓',2]],premium:[['시전 속도 증가',20],['민첩',15],['생명력',40],['모든 저항',15]],use:'아마존/기동 PvP',miss:'30달려형도 2소켓과 직업 스킬이 핵심입니다. 쌍패(20패캐+30달려)까지 붙으면 별도 상위군입니다.'},
  {id:'rare-circ-dual-speed',name:'쌍패 써클릿',must:[['시전 속도 증가',20],['달리기/걷기 속도 증가',30]],premium:[['CLASS',2],['소켓',2],['민첩',15],['생명력',40],['모든 저항',15]],use:'PvP 기동/패캐 동시 세팅',miss:'쌍패만으로 끝이 아니라 +2 직업스킬/2소켓/스탯이 붙어야 최상위권입니다.'},
  {id:'rare-circ-amazon-physical',name:'아마존 2스킬 30달려 2솟 · 물리/PvP',must:[['아마존 기술 레벨',2],['달리기/걷기 속도 증가',30],['소켓',2]],premium:[['명중률',100],['최대 피해',7],['민첩',15],['힘',20],['생명력',40]],use:'물리 활마·텔레아마·PvP 아마존',miss:'이 계열은 20패캐보다 30달려/2솟/명중·피해축이 더 중요할 수 있습니다. 2솟과 고AR·맥뎀·민첩이 함께 붙을수록 상위 거래군에 가까워집니다.'}
 ],
 장갑:[
  {id:'rare-glove-java',name:'2투창 20공속 장갑',must:[['투창과 창 기술 레벨',2],['공격 속도 증가',20]],premium:[['적중당 마나 훔침',2],['힘',10],['민첩',10],['번개 저항',20],['화염 저항',20]],use:'자벨마',miss:'2투창/20공속이 출발선이며 마흡·스탯·저항이 붙을수록 고급 실사용군으로 올라갑니다.'},
  {id:'rare-glove-bow',name:'2활 20공속 장갑',must:[['활과 쇠뇌 기술 레벨',2],['공격 속도 증가',20]],premium:[['힘',10],['민첩',10],['적중당 마나 훔침',2],['마법 아이템 발견 확률',15]],use:'활아마',miss:'2활/20공속 외에 스탯·마흡·매찬/저항이 실제 차별화 요소입니다.'},
  {id:'rare-glove-martial',name:'2무술 20공속 장갑',must:[['무술 기술 레벨',2],['공격 속도 증가',20]],premium:[['힘',10],['민첩',10],['화염 저항',20],['번개 저항',20]],use:'무술씬',miss:'2무술/20공속 골격이 없으면 해당 고가군과 거리가 큽니다.'}
 ],
 부츠:[
  {id:'rare-boots-trires',name:'30달려 삼레부츠',must:[['달리기/걷기 속도 증가',30]],premium:[['RESCOUNT',3],['화염 저항',30],['번개 저항',30],['냉기 저항',30]],use:'범용/PvP',miss:'30달려 + 3레지 조합이 핵심입니다. 특히 파레/라레 고롤이 거래 선호도가 높습니다.'},
  {id:'rare-boots-dual-speed',name:'30달려 10패힛 쌍패부츠',must:[['달리기/걷기 속도 증가',30],['타격 회복 속도 증가',10]],premium:[['화염 저항',30],['번개 저항',30],['냉기 저항',30],['마법 아이템 발견 확률',20]],use:'PvP/범용',miss:'쌍패 이후 레지/매찬/삥이 얼마나 강한지가 등급을 가릅니다.'},
  {id:'rare-boots-gf-mf',name:'삥·매찬 하이브리드 부츠',must:[['적에게서 얻는 금화 증가',60]],premium:[['마법 아이템 발견 확률',20],['달리기/걷기 속도 증가',30],['화염 저항',30],['번개 저항',30]],use:'삥바바/PvM',miss:'고삥만으로는 부족하고 달려·레지·매찬이 같이 붙을수록 거래성이 커집니다.'}
 ],
 벨트:[
  {id:'rare-belt-fhr',name:'24패힛 고스탯 레지벨트',must:[['타격 회복 속도 증가',24]],premium:[['힘',20],['생명력',40],['화염 저항',20],['번개 저항',20]],use:'PvP/범용',miss:'24패힛 이후 힘·생명·저항이 얼마나 밀집했는지가 핵심입니다.'},
  {id:'rare-belt-gf-deep',name:'고삥 실전 벨트',must:[['적에게서 얻는 금화 증가',50]],premium:[['타격 회복 속도 증가',24],['힘',20],['생명력',40],['화염 저항',20]],use:'삥바바',miss:'삥만 높으면 저가형입니다. 24패힛/힘/생명/저항이 붙어야 고급군입니다.'}
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
function cap(name,slot){if(String(name).startsWith('충전 기술 · '))return 99;const d=defs[name];if(!d)return null;return d.caps?.[slot]??Math.max(...Object.values(d.caps||{x:0}));}
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
function decomposeDisplayedResists(items,slot){
 const arr=(items||[]).map(x=>({...x}));const rs=RES.map(n=>arr.find(x=>x.name===n)).filter(Boolean);const allCap=cap('모든 저항',slot)||0;
 if(rs.length!==4||!allCap)return {items:arr,inferred:null};
 const base=Math.min(...rs.map(x=>+x.value||0));if(base<=0||base>allCap)return {items:arr,inferred:null};
 // D2 displays All Resist + single-element resist as one summed line. Convert back to affix contributions for valuation.
 const out=arr.filter(x=>!RES.includes(x.name));out.push({name:'모든 저항',value:base,_inferred:true});
 for(const r of rs){const extra=(+r.value||0)-base;if(extra>0)out.push({name:r.name,value:extra,_inferred:true})}
 return {items:out,inferred:{allres:base,extras:Object.fromEntries(rs.map(r=>[r.name,Math.max(0,(+r.value||0)-base)]))}};
}
function evaluate({slot,items,realm='래더',socketState=null,rarity='레어'}){
 const observed=(items||[]).filter(x=>x&&x.name&&Number.isFinite(+x.value)&&+x.value>0).map(x=>({...x,value:+x.value}));
 const dec=decomposeDisplayedResists(observed,slot);const normalized=dec.items;
 const map=new Map();for(const x of normalized){map.set(x.name,Math.max(map.get(x.name)||0,x.value))}
 if(socketState!=null&&slot==='써클릿')map.set('소켓',+socketState);
 const profiles=highValueProfiles[slot]||[];let best=null;for(const p of profiles){const e=profileScore(p,map,slot);if(!best||e.score>best.fit)best={profile:p,fit:e.score,...e}}
 const quality=itemQualityScore(normalized,slot); const coreFit=best?best.fit:Math.min(70,quality);
 const names=new Set(normalized.map(x=>x.name)); let synergy=0;
 if(names.has('시전 속도 증가')&&CLASS_SKILLS.some(x=>names.has(x)))synergy+=8;
 if(names.has('적중당 생명력 훔침')&&names.has('적중당 마나 훔침'))synergy+=8;
 if(names.has('달리기/걷기 속도 증가')&&RES.filter(x=>names.has(x)).length>=2)synergy+=6;
 if(slot==='써클릿'&&(map.get('소켓')||0)===2)synergy+=10;
 if(names.has('에테리얼')&&(names.has('내구도 자동 회복')||names.has('수량 자동 회복')))synergy+=10;
 const buildDemand=(window.SKR_BUILD_DEMAND&&window.SKR_BUILD_DEMAND.evaluate)?window.SKR_BUILD_DEMAND.evaluate(slot,normalized):{score:0,label:'D',best:null,top:[]};
 // Generic market archetype and niche build demand are separate axes. A strong niche fit may lift a usable rare,
 // but cannot by itself turn low-roll junk into a trophy item.
 let score=Math.round(quality*.28+coreFit*.42+buildDemand.score*.20+Math.min(10,synergy));
 if(buildDemand.score>=78&&quality>=45)score=Math.max(score,Math.min(86,Math.round(58+buildDemand.score*.28)));
 score=Math.max(0,Math.min(99,score));
 const g=grade(score), records=dbRecords(slot); const rec=best?records.find(x=>x.id===best.profile.id):records.sort((a,b)=>String(b.grade).localeCompare(String(a.grade)))[0];
 const strong=normalized.filter(x=>ratioFor(map,x.name,slot)>=.70).sort((a,b)=>ratioFor(map,b.name,slot)-ratioFor(map,a.name,slot));
 const strengths=[], weaknesses=[], notes=[];
 const cls=classSkillValue(map); const s=map.get('소켓'); const fcr=map.get('시전 속도 증가')||0, frw=map.get('달리기/걷기 속도 증가')||0;
 const ar=map.get('명중률')||0, maxd=map.get('최대 피해')||0, mind=map.get('최소 피해')||0, str=map.get('힘')||0, dex=map.get('민첩')||0;
 const life=map.get('생명력')||0, mana=map.get('마나')||0, allres=map.get('모든 저항')||0;
 const ll=map.get('적중당 생명력 훔침')||0, ml=map.get('적중당 마나 훔침')||0;
 if(cls.value>=2)strengths.push(`${cls.name} +${cls.value}: 해당 직업 레어 헤드/아뮬의 핵심 골격`);
 if(fcr>=20&&slot==='써클릿')strengths.push('20패캐: 캐스터/PvP 써클릿의 상위 핵심축'); else if(fcr>=10&&['반지','목걸이'].includes(slot))strengths.push(`${fcr}패캐: 브레이크포인트 세팅의 핵심 옵션`);
 if(frw>=30)strengths.push('30달려: 기동형 PvP/아마존 계열의 핵심 프리미엄');
 if(s===2)strengths.push('2소켓: 주얼/룬 커스터마이징으로 가격 천장을 크게 올리는 핵심 옵션');
 if(ar>=100)strengths.push(`명중률 ${ar}: 물리/PvP 계열에서 강한 명중축`);
 if(maxd>=7||mind>=7)strengths.push(`피해 옵션 ${mind?`민뎀 ${mind}`:''}${mind&&maxd?' · ':''}${maxd?`맥뎀 ${maxd}`:''}: 물리 빌드에서 실딜 가치가 있는 상급축`);
 if(str>=20||dex>=15)strengths.push(`고스탯: ${str?`힘 ${str}`:''}${str&&dex?' · ':''}${dex?`민첩 ${dex}`:''}`);
 if(ll&&ml)strengths.push(`듀얼흡 ${ll}/${ml}: 물리 PvM 실사용 시너지`); else if(ml>=4)strengths.push(`마흡 ${ml}%: 물리/하이브리드 지속 전투에 유효`);
 if(allres>=15)strengths.push(`올레 ${allres}: 범용 생존축으로 고가 조합에 잘 붙는 옵션`); else if(dec.inferred?.allres)strengths.push(`저항 조합: 표시 저항에서 올레 ${dec.inferred.allres} 기반을 역추론`);
 if(mana>=60&&fcr)strengths.push(`고마나 ${mana}+패캐: 캐스터/ES 계열에서 유효한 조합`);
 if(slot==='써클릿'){
   if(s===undefined)weaknesses.push('소켓 정보 미확인: 써클릿은 소켓 유무, 특히 2솟 여부가 최우선 검증 항목입니다.');
   else if(s<2)weaknesses.push(`${s||0}소켓: 2솟 상위군과 비교하면 가장 큰 가격 천장 손실 요소입니다.`);
   const physicalAmazon=cls.name==='아마존 기술 레벨'&&cls.value>=2&&frw>=30;
   if(physicalAmazon){
     notes.push('아마존 30달려형으로 분류: 캐스터 2/20 기준이 아니라 2스킬·30달려·2솟·AR/맥뎀·민첩 축으로 평가합니다.');
     if(ar<100)weaknesses.push('아마존 물리/PvP형 기준 명중률이 약합니다. 100+급 AR이 붙으면 실전/거래 프리미엄이 크게 올라갑니다.');
     if(maxd<7&&mind<7)weaknesses.push('물리 아마존형에서 민/맥뎀 등 직접 딜 기여 옵션이 부족합니다.');
   } else if(cls.value>=2&&fcr<20) weaknesses.push('캐스터형 써클릿이라면 20패캐 부재가 큰 결손입니다. 다만 30달려/물리형이면 별도 기준으로 봐야 합니다.');
 }
 if(slot==='목걸이'){
   if(cls.value<2&&rarity==='레어')weaknesses.push('레어 목걸이 고가 캐스터군 기준 +2 직업 스킬이 없습니다. 패캐 단독은 대체재를 이기기 어렵습니다.');
   if(cls.value>=2&&fcr<10)weaknesses.push('캐스터형 레어 아뮬이라면 10패캐 부재로 상위 2/10 거래군과 거리가 생깁니다.');
   if(!allres&&RES.filter(r=>(map.get(r)||0)>=25).length===0)weaknesses.push('고저항 축이 약해 마라/크랩아뮬 같은 강한 경쟁템 대비 우위가 제한됩니다.');
 }
 if(slot==='반지'){
   if(!fcr&&!ar&&!ll&&!ml)weaknesses.push('패캐·고어레·흡수 중 뚜렷한 정체성 축이 없어 거래 목적이 모호합니다.');
   if(fcr>=10 && str<15 && mana<50 && allres<8 && RES.filter(r=>(map.get(r)||0)>=20).length<1)weaknesses.push('10패캐는 좋지만 스탯·고마나·저항 보조축이 부족해 고가 패캐링군과 차이가 큽니다.');
 }
 if(slot==='장갑'&&map.get('공격 속도 증가')<20)weaknesses.push('레어 장갑은 대부분의 고가 실사용군에서 20공속이 사실상 출발선입니다.');
 if(slot==='부츠'){
   if(frw<30)weaknesses.push('30달려 부재로 범용/PvP 상위 부츠군에서 크게 밀립니다.');
   const rc=RES.filter(r=>(map.get(r)||0)>=25).length;if(rc<2)weaknesses.push('25+급 유효 레지가 2줄 미만이라 삼레/쌍레 상위 거래군과 거리가 있습니다.');
 }
 if(best?.missing?.length)weaknesses.push(`가장 가까운 상위 패턴에서 부족한 핵심축: ${best.missing.slice(0,4).join(' · ')}`);
 if(best?.profile?.premium?.length){const pg=best.profile.premium.filter(([n,t])=>getVal(map,n)<t).slice(0,3).map(([n,t])=>`${n==='RESCOUNT'?'유효 레지 3종':n+' '+t+(defs[n]?.unit||'')}`);if(pg.length)weaknesses.push(`필수 결손은 아니지만 상위 완성형에서 가격을 더 올리는 보완축: ${pg.join(' · ')}`)}
 if(best?.profile?.miss)notes.push(best.profile.miss);
 if(!strengths.length&&strong.length)strengths.push(`상급 롤: ${strong.slice(0,4).map(x=>`${x.name} ${x.value}${defs[x.name]?.unit||''}`).join(' · ')}`);
 if(!weaknesses.length)weaknesses.push('명확한 치명적 결손은 적습니다. 최종 가치는 베이스와 실제 빌드 수요, 최근 체결 표본으로 확인해야 합니다.');
 if(buildDemand.best&&buildDemand.best.score>=55){
   strengths.push(`빌드 수요: ${buildDemand.best.name} 적합도 ${buildDemand.best.score}% (${buildDemand.label})`);
   if(buildDemand.best.notes)notes.push(buildDemand.best.notes);
 }
 const buildUses=(buildDemand.top||[]).filter(x=>x.score>=45).map(x=>`${x.name} ${x.score}%`).join(' · ');
 const use=buildUses||best?.profile?.use||rec?.market||'부위별 실사용 빌드와 거래 수요를 추가 확인해야 합니다.';
 const market=marketBand(score,Math.max(coreFit,buildDemand.score),g);
 const verdict=`${best?`가장 가까운 고가형은 「${best.profile.name}」이며 일치도 ${best.fit}%입니다. `:''}${buildDemand.best&&buildDemand.best.score>=55?`특정 빌드 수요는 「${buildDemand.best.name}」 ${buildDemand.best.score}%로 평가됩니다. `:''}${notes[0]||''}`.trim();
 const evidence={record:rec||null,records:records.slice(0,5),realm,marketNote:rec?.market||'',sources:rec?.sources||[]};
 const compare=best?{title:best.profile.name,fit:best.fit,matched:best.matched.slice(0,8),missing:best.missing.slice(0,8),tierText:rec?.tiers?.[0]||'',market:rec?.market||''}:null;
 return {score,grade:g,quality,coreFit,buildDemand,market,why:strengths.join(' '),use,miss:weaknesses.join(' '),verdict,strengths,weaknesses,notes,resistInference:dec.inferred,tags:[g,market,...(buildDemand.best&&buildDemand.best.score>=55?[buildDemand.best.name]:[]),...(strong.slice(0,3).map(x=>x.name))],compare,evidence};
}
window.SKR_RARE_ENGINE={defs,slotOptions,CLASS_SKILLS,CHARGED_SKILLS,cap,evaluate,dbRecords};
})();
