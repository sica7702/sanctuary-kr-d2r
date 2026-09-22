import engine from './ai-baseline-generated.mjs';
const names={fcr:'시전 속도 증가',frw:'달리기/걷기 속도 증가',fhr:'타격 회복 속도 증가',ias:'공격 속도 증가',str:'힘',dex:'민첩',life:'생명력',mana:'마나',allres:'모든 저항',fire:'화염 저항',light:'번개 저항',cold:'냉기 저항',poison:'독 저항',ar:'명중률',ll:'적중당 생명력 훔침',ml:'적중당 마나 훔침',mf:'마법 아이템 발견 확률',gf:'적에게서 얻는 금화 증가',sockets:'소켓',ed:'피해 증가',edef:'방어력 증가',rep:'생명력 회복',dr:'피해 감소',mdr:'마법 피해 감소',mindmg:'최소 피해',maxdmg:'최대 피해'};
const slots={ring:'반지',amulet:'목걸이',circlet:'써클릿',gloves:'장갑',boots:'부츠',belt:'벨트',claw:'클러',jav:'자벨린',bow:'활',orb:'오브',wand:'완드',armor:'갑옷',shield:'방패'};
const cls={소서리스:'원소술사',팔라딘:'성기사',네크로맨서:'강령술사',어쌔신:'암살자'};
export function existingValueTier(context){
 if(!slots[context.slot])return null;
 const items=[];
 for(const [k,v] of Object.entries(context.values)){
  const name=k==='classskill'?(cls[context.profile.char]||context.profile.char)+' 기술 레벨':names[k];
  if(!name||!engine.defs[name])return null;
  items.push({name,value:['fire','light','cold','poison'].includes(k)?v+(context.values.allres||0):v});
 }
 const r=engine.evaluate({slot:slots[context.slot],items,rarity:context.item_type,realm:context.profile.realm==='ladder'?'래더':'스탠'});
 return Number.isFinite(r.score)?r.score>=85?3:r.score>=70?2:r.score>=50?1:0:null;
}
