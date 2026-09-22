import {dropLocationAllowed} from './drop-rules.js';
// One kill, no prior unique generation in this game. Base mode means any quality.
export function dropProbability(D,engine,start,target,mlvl,mf,players,sets=[],context={}){
if(!dropLocationAllowed(target,context))return {p:0,paths:0,mode:"set",reason:"카우방 전용 드랍"};
if(target.kind==='유니크')return D.tcUniqueProb(engine,start,{...target.raw,en:target.en},mlvl,mf,players);
const mode=target.kind==='세트'?'set':'base',code=target.code,cache=new Map(),active=new Set();let paths=0;
if(mode==='set'&&(target.raw.DropConditionCalc||target.raw.firstLadderSeason||target.raw.lastLadderSeason))throw Error('시즌·전용 드랍 조건 확인 필요');
function quality(base,q){if(mode==='base')return 1;if(mlvl<Number(target.raw.lvl||0))return 0;const rr=D.itemRatioRow(engine,base);if(!rr)throw Error('품질 계산용 원본 행 없음');
 const uniqueRoll=D.uniqueQualityProb(engine,{code,index:'__quality_roll__',lvl:0,rarity:1,spawnable:1},base,mlvl,mf,q.unique).qroll;
 let chance=(Number(rr.Set)-Math.trunc((mlvl-Number(base.level||0))/Math.max(1,Number(rr.SetDivisor)||1)))*128;
 const effective=mf<=10?Math.floor(mf):Math.floor(mf*500/(mf+500));chance=Math.floor(chance*100/(100+effective));chance=Math.max(chance,Number(rr.SetMin)||0);chance-=Math.floor(chance*q.set/1024);chance=Math.max(128,chance);
 const eligible=sets.filter(r=>r.code===code&&dropLocationAllowed(r,context)&&r.raw.disabled!=='1'&&r.raw.spawnable!=='0'&&Number(r.raw.lvl||0)<=mlvl);const total=eligible.reduce((s,r)=>s+Number(r.raw.rarity||0),0);
 return (1-uniqueRoll)*Math.min(1,128/chance)*(total?Number(target.raw.rarity||0)/total:0);
}
function walk(name,q,budget){if(!budget)return [1];const key=[name,q.unique,q.set,budget].join('|');if(cache.has(key))return cache.get(key);if(active.has(key))throw Error('드랍 경로 순환');active.add(key);let result=Array(budget+1).fill(0);const members=D.runtimeTcMembers(engine,name),row=engine.tcdb[name];
 if(members){const total=members.reduce((s,x)=>s+x.weight,0);if(!total)throw Error('비어 있는 장비 드랍 목록');const hit=members.find(x=>x.ref===code);const p=hit?hit.weight/total*quality(hit.row,q):0;if(p)paths++;result[1]=1-p;
 }else if(!row){const base=engine.baseDb[name],unique=engine.uniR.find(x=>x.index===name),set=sets.find(x=>x.en===name);if(!base&&!unique&&!set)throw Error('드랍 말단 자료 없음: '+name);let p=0;if(base&&name===code)p=quality(base,q);else if(mode==='base'&&(unique?.code===code||set?.code===code))p=1;else if(mode==='set'&&set?.id===target.id)p=1;if(p)paths++;result[1]=1-p;
 }else{const qualityFactor={unique:Math.max(q.unique,Number(row.Unique)||0),set:Math.max(q.set,Number(row.Set)||0)};const entries=[];for(let i=1;i<=10;i++){const weight=+row['Prob'+i],parts=String(row['Item'+i]||'').replace(/^"|"$/g,'').split(',').map(x=>x.trim()),ref=parts.shift();if(weight>0&&ref)entries.push({weight,ref,mods:Object.fromEntries(parts.map(p=>p.split('=')))});}const nd=D.effectiveNoDrop(row,players),total=nd+entries.reduce((s,x)=>s+x.weight,0);if(!total||!entries.length)throw Error('비어 있는 드랍 목록');const picks=Number(row.Picks)||1,sequence=[];if(picks<0){let left=-picks;for(const e of entries)for(let i=0;i<e.weight&&left>0;i++,left--)sequence.push(e);}else for(let i=0;i<picks;i++)sequence.push(null);if(sequence.length>100)throw Error('지원 범위를 넘는 드랍 횟수');result[0]=1;
 for(const forced of sequence){const next=Array(budget+1).fill(0);for(let count=0;count<=budget;count++){const p=result[count];if(!p)continue;if(count===budget){next[count]+=p;continue;}if(!forced)next[count]+=p*nd/total;for(const e of forced?[forced]:entries){const qq={unique:Math.max(qualityFactor.unique,Number(e.mods.cu)||0),set:Math.max(qualityFactor.set,Number(e.mods.cs)||0)},child=walk(e.ref,qq,budget-count),weight=forced?1:e.weight/total;for(let n=0;n<child.length;n++)next[count+n]+=p*weight*child[n];}}result=next;}}
 active.delete(key);cache.set(key,result);return result;}
const distribution=walk(D.upgradeTc(start,mlvl,engine.tcdb),{unique:0,set:0},6);return {p:paths?Math.max(0,Math.min(1,1-distribution.reduce((a,b)=>a+b,0))):0,paths,mode};
}
