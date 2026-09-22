// Parse unambiguous tooltip effects before the generic skill-name fallback.
export function parseUniqueLine(text,catalog,record){
 const t=String(text).trim(),n=t.match(/([+−-]?\s*\d+)\s*%?\s*$/);const value=n?Number(n[1].replace(/\s/g,'').replace('−','-')):null;
 const effect=(code,v)=>{const c=catalog.find(c=>c.code===code&&!c.param)||catalog.find(c=>c.code===code&&c.param==='0');return c?{name:c.label,code:c.code,param:c.param,catalogId:c.id,value:v}:null;};
 if(/\d+\s*[~～]\s*\d+/.test(t)&&/(?:매찬|골드|달려|타회|모능|번피|번저|피감|마피감)/.test(t))return null;
 if(/(?:중\s*1|중\s*하나)/.test(t)&&/\d+\s*[~～]\s*\d+/.test(t))return null;
 const damage=t.match(/^피해\s*(?:증가\s*)?\+?\s*(\d+)\s*%\s*(?:증가)?\s*$/);if(damage)return effect('dmg%',+damage[1]);
 const tree=t.match(/^(혼돈|온돈)\s*기술(?:\s*레벨)?\s*\+\s*(\d+)/);if(tree){const c=catalog.find(c=>c.code==='skilltab'&&String(c.param)==='23');return c?{name:c.label,code:c.code,param:c.param,catalogId:c.id,value:+tree[2]}:null;}
 const percentPool=t.match(/^(?:최대\s*)?(마나|생명력)\s*(?:증가\s*)?\+?\s*(\d+)\s*%\s*(?:증가)?\s*$/);if(percentPool)return effect(percentPool[1]==='마나'?'mana%':'hp%',+percentPool[2]);
 const ease=t.match(/^(?:착용\s*조건|요구\s*(?:능력치|조건))\s*([−-]\s*\d+)\s*%/);if(ease)return effect('ease',Number(ease[1].replace(/\s/g,'').replace('−','-')));
 const sunder=t.match(/^(?:괴물의?\s*)?(화염|냉기|번개|독|물리|마법)\s*면역(?:이|을)?\s*파괴/);if(sunder)return effect('pierce-immunity-'+({'화염':'fire','냉기':'cold','번개':'light','독':'poison','물리':'damage','마법':'magic'})[sunder[1]],1);
 const elem={'화염':'fire','냉기':'cold','번개':'ltng','독':'pois','마법':'mag'};
 const resist=t.match(/^(화염|냉기|번개|독|마법)\s*저항\s*([+−-]?\s*\d+)\s*%?\s*$/);if(resist)return effect('res-'+elem[resist[1]],Number(resist[2].replace(/\s/g,'').replace('−','-')));
 const stats=t.match(/^모든\s*능력치\s*\+\s*(\d+)\s*$/);if(stats)return ['str','dex','vit','enr'].map(c=>effect(c,+stats[1])).filter(Boolean);
 const scaled=t.match(/^(생명력|마나)\s*\+\s*(\d+)\s*\(캐릭터\s*레벨에?\s*비례\)/);if(scaled){const code=(scaled[1]==='생명력'?'hp':'mana')+'/lvl',m=record?.mods.find(m=>m.code===code),c=m&&catalog.find(c=>c.code===code&&c.param===m.param);return c?{name:c.label,code:c.code,param:c.param,catalogId:c.id,value:+scaled[2],rangeUnverified:true}:null;}
 const reduction=t.match(/^(?:받는\s*물리\s*)?피해\s*(\d+)%\s*감소/);if(reduction)return effect('red-dmg%',+reduction[1]);
 const pierce=t.match(/^적(?:의)?\s*(화염|냉기|번개|독|마법)\s*저항/);
 if(pierce){
  // Tooltip skins can omit 의 or put 감소 after the number. Match the entire
  // remainder so a reference roll range such as -3~7% is never read as 7%.
  const amount=t.slice(pierce[0].length).match(/^\s*(?:감소\s*)?([+−-]?\s*\d+)\s*%?\s*(?:감소)?\s*$/);
  return amount?effect('pierce-'+elem[pierce[1]],Math.abs(Number(amount[1].replace(/\s/g,'').replace('−','-')))):null;
 }
 const extra=t.match(/^(화염|냉기|번개|독|마법)\s*기술\s*피해/);
 if(extra)return value!==null?effect('extra-'+elem[extra[1]],value):null;
 // Never let malformed damage/resistance lines fall through to skill-level matching.
 if(/기술\s*피해|저항.*[-−]\s*\d/.test(t))return null;
 if(/^모든\s*기술(?:\s*레벨)?\s*\+\s*\d+\s*$/.test(t))return effect('allskills',value);
 if(/^화염\s*기술(?:\s*레벨)?\s*\+\s*\d+\s*$/.test(t))return effect('fireskill',value);
 return undefined;
}
