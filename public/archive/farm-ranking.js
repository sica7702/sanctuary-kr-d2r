// Rank the strongest supported single-monster opportunity in each region/difficulty.
export async function rankRegions({regions,contexts,probability,settings,isCurrent=()=>true,yieldTask=()=>new Promise(r=>setTimeout(r,0))}){
 const rows=[],cache=new Map();let excluded=0,checked=0;
 for(const region of regions){
  for(const difficulty of ['', 'N','H']){
   let best=null;
   for(const type of ['normal','champ','unique']){
    for(const monster of contexts(region.raw,{...settings,difficulty,type})){
     if(!isCurrent())return null;
     if(!monster.tc||!monster.mlvl)continue;
     const key=[region.id,monster.tc,monster.mlvl,type].join('|');
     let result=cache.get(key);
     if(!result){try{const p=probability(monster,type);result={p};if(!Number.isFinite(p)||p<0||p>1)throw Error('invalid probability');}catch{result={error:true};}cache.set(key,result);}
     if(result.error){excluded++;continue;}
     if(result.p>0&&(!best||result.p>best.p))best={regionId:region.id,regionName:region.name,difficulty,type,...monster,p:result.p};
    }
   }
   if(best)rows.push(best);
  }
  checked++;
  if(checked%2===0){await yieldTask();if(!isCurrent())return null;}
 }
 return {rows:rows.sort((a,b)=>b.p-a.p||a.regionName.localeCompare(b.regionName,'ko')),excluded,checked};
}
export function disputedDrop(item,type,players){return (item.en==='Harlequin Crest'&&type!=='normal')||(item.en==="Griffon's Eye"&&type==='normal'&&players>1);}
