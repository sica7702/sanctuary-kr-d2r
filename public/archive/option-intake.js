/* Interpret a complete tooltip line before broad OCR keyword fallbacks. */
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9가-힣]/g,'');
export function runewordCandidates(lines,records){
 const bases=new Map(records.filter(r=>r.kind==='재료').map(r=>[r.code,r]));
 const readings=lines.map(l=>norm(l.text)).filter(Boolean);
 return records.filter(r=>{
  if(r.kind!=='룬워드')return false;
  if(readings.some(t=>t===norm(r.name)||t===norm(r.en)))return true;
  const codes=Array.from({length:6},(_,i)=>r.raw?.['Rune'+(i+1)]).filter(Boolean);
  if(codes.length<3)return false;
  const english=codes.map(code=>bases.get(code)?.en?.replace(/\s+Rune$/i,'')).join('');
  const ko=(r.aliases||[]).filter(a=>/^[가-힣]{1,3}$/.test(a)).slice(-codes.length).join('');
  return [english,ko].some(signature=>norm(signature).length>=codes.length&&readings.some(t=>t===norm(signature)));
 });
}
export function parseContextEffect(text,data){
 const raw=String(text||'').trim().replace(/\s+/g,' ');
 const proc=/^(?:타격|공격|피격)\s*시|^when\s+(?:struck|hit|attacking)/i;
 if(proc.test(raw)&&/(?:확률|시전|발동|chance|cast)/i.test(raw)){
  const code=/^피격|struck/i.test(raw)?'gethit-skill':'hit-skill';
  const chance=raw.match(/(\d{1,2})\s*%/),level=raw.match(/(?:레벨|level)\s*(\d{1,2})|(\d{1,2})\s*레벨/i);
  if(!chance||!level)return null;
  const rank=+(level[1]||level[2]);
  const mods=data.records.flatMap(r=>r.mods||[]).filter(m=>m.code===code&&norm(raw).includes(norm(m.label.split('·').at(-1)))&&+chance[1]===+m.min&&rank===+m.max);
  const unique=[...new Map(mods.map(m=>[m.code+'|'+m.param,m])).values()];
  if(unique.length!==1){
   const catalog=data.catalog.filter(c=>c.code===code&&norm(raw).includes(norm(c.label.split('·').at(-1))));
   if(catalog.length!==1)return null;
   const c=catalog[0];
   return {name:c.label,code:c.code,param:c.param,catalogId:c.id,value:rank,procChance:+chance[1],rangeUnverified:true};
  }
  const mod=unique[0];
  const existing=data.catalog.find(c=>c.code===mod.code&&c.param===mod.param);
  return {name:mod.label,code:mod.code,param:mod.param,catalogId:existing?.id||'observed:'+mod.code+'|'+mod.param,value:rank,procChance:+chance[1],observedCatalog:existing?null:{id:'observed:'+mod.code+'|'+mod.param,code:mod.code,param:mod.param,label:mod.label,source:'record-tooltip'}};
 }
 // An incomplete proc line is never a charged skill or a numeric stat.
 if(/(?:타격|공격|피격).{0,20}(?:확률|시전|발동)|when\s+(?:struck|hit)/i.test(raw))return null;
 const ac=raw.match(/^방어력\s*\+?\s*(\d{1,3})\s*%\s*(?:증가|강화)?$|^방어력\s*(?:증가|강화)\s*\+?\s*(\d{1,3})\s*%?$/);
 if(ac){const c=data.catalog.find(c=>c.code==='ac%'&&!c.param);return c?{name:c.label,code:c.code,param:c.param,catalogId:c.id,value:+(ac[1]||ac[2])}:null;}
 const dr=raw.match(/^피해\s*감소\s*\+?\s*(\d{1,2})$|^피해\s*\+?\s*(\d{1,2})\s*감소$/);
 if(dr){const c=data.catalog.find(c=>c.code==='red-dmg'&&!c.param);return c?{name:c.label,code:c.code,param:c.param,catalogId:c.id,value:+(dr[1]||dr[2])}:null;}
 return undefined;
}
