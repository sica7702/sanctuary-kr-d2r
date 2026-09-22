// A projection for market comparison only; does not change item recognition.
export function marketIdentity(draft,data,baseCode){
 const record=data.records.find(r=>r.id===draft.itemId),original=data.bases.find(b=>b.code===(record?.code||record?.raw?.code));
 let base=data.bases.find(b=>b.code===baseCode);
 const family=b=>[b?.normcode,b?.ubercode,b?.ultracode].filter(Boolean);
 const unique=['unique','set'].includes(draft.quality),upgradable=unique&&family(original).length>=2&&original.code!==original.ultracode;
 // Reject a stale base selection from an earlier screenshot.
 if(unique&&base&&original&&base.code!==original.code&&!family(original).includes(base.code))base=null;
 const tier=b=>!b?null:b.code===b.ultracode?'Elite':b.code===b.ubercode?'Exceptional':b.code===b.normcode?'Normal':null;
 const socketOption=draft.options.find(o=>o.code==='sock'&&o.value!==''&&o.value!=null);
 const sockets=socketOption?Number(socketOption.value):draft.flags?.sockets??null;
 return {baseCode:base?.code||null,baseName:base?data.records.find(r=>r.id==='base:'+base.code)?.name||base.name:'',upgradable,originalTier:tier(original),
  identity:{ethereal:draft.flags?.ethereal===true?true:null,unidentified:false,
   tier:upgradable?tier(base):null,upgraded:upgradable&&base&&original?base.code!==original.code:null,
   sockets:Number.isInteger(sockets)&&sockets>=0&&sockets<=6?sockets:null}};
}
export function searchProjection(draft,data){
 const unique=['unique','set'].includes(draft.quality),record=data.records.find(r=>r.id===draft.itemId);
 return {...draft,options:draft.options.map(o=>{
  const mod=unique&&o.origin!=='observed-extra'&&record?.mods?.find(m=>m.code===o.code&&String(m.param??'')===String(o.param??''));
  const fixedSkill=mod&&mod.min===mod.max&&/skill$/.test(mod.code)&&!/-skill$/.test(mod.code)&&(o.value===''||o.value==null||Number(o.value)===Number(mod.min));
  const innateDamage=mod&&/^dmg-(fire|cold|ltng|pois|mag|elem)$/.test(mod.code);
  // OCR may also preserve a fixed damage line as separate minimum/maximum components.
  // These are not extra rolls when they exactly match this item's intrinsic endpoints.
  const endpoint=/^(fire|cold|ltng|mag|pois)-(min|max)$/.exec(o.code||'');
  const damage=unique&&endpoint&&record?.mods?.find(m=>m.code==='dmg-'+endpoint[1]);
  const innateEndpoint=damage&&o.value!==''&&o.value!=null&&Number(o.value)===Number(damage[endpoint[2]]);
  return {...o,searchFixed:!!(o.searchFixed||fixedSkill||innateDamage||innateEndpoint)};
 })};
}
