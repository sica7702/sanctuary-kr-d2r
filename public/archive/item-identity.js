const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z가-힣0-9]/g,'');
export function setCandidates(lines,records){
 const sets=records.filter(r=>r.kind==='세트'), found=[];
 const passes=new Set(lines.map(l=>l.pass||''));
 for(const pass of passes){
  for(const l of lines.filter(l=>(l.pass||'')===pass)){
   const t=normalize(l.text), hit=sets.filter(r=>[r.name,r.en].some(n=>(t===normalize(n)||normalize(n).length>3&&t.includes(normalize(n)))));
   if(hit.length){const longest=Math.max(...hit.flatMap(r=>[r.name,r.en].filter(n=>t.includes(normalize(n))).map(n=>normalize(n).length)));found.push(...hit.filter(r=>[r.name,r.en].some(n=>t.includes(normalize(n))&&normalize(n).length===longest)));break;}
  }
 }
 return [...new Map(found.map(r=>[r.id,r])).values()];
}
export function isReferenceLine(text,records){
 const t=normalize(text);
 return records.some(r=>r.kind==='세트'&&[r.name,r.en].some(n=>{const key=normalize(n);return t===key||key.length>3&&t.includes(key)||key.length>=7&&t.includes(key.slice(1));}));
}
export function baseCandidates(lines,data){
 const baseNorm=s=>normalize(String(s||'').normalize('NFKC').replace(/실드/g,'쉴드'));
 const raw=lines.map(l=>baseNorm(l.text));
 const matches=data.bases.map(b=>({base:b,names:[b.name,data.records.find(r=>r.id==='base:'+b.code)?.name,data.records.find(r=>r.id==='base:'+b.code)?.en].filter(n=>n&&baseNorm(n).length>1&&baseNorm(n)!==baseNorm(b.code))}))
 .flatMap(({base,names})=>names.filter(n=>raw.some(l=>l.includes(baseNorm(n)))).map(n=>({base,length:baseNorm(n).length})));
 // Only combine the first header reading with a dedicated name-line retry.
 // Every word must be observed; no fuzzy replacement or internal-code matching.
 if(!matches.length){
  const retry=lines.filter(l=>l.pass==='명칭 한 줄 보완').map(l=>baseNorm(l.text));
  const original=lines.filter(l=>l.pass==='원본'&&l.i===0).map(l=>baseNorm(l.text));
  if(retry.length&&original.length)for(const base of data.bases){
   const label=data.records.find(r=>r.id==='base:'+base.code)?.name||'';
   const parts=label.split(/\s+/).filter(Boolean).map(baseNorm);
   if(parts.length>=2&&parts[0].length>=3&&retry.some(t=>t.startsWith(parts[0]))&&parts.slice(1).every(p=>original.some(t=>t.includes(p))))matches.push({base,length:parts.join('').length});
  }
 }
 const longest=Math.max(0,...matches.map(m=>m.length));
 return [...new Map(matches.filter(m=>m.length===longest).map(m=>[m.base.code,m.base])).values()];
}
export function itemFlags(lines){
 const text=lines.map(l=>l.text).join('\n');
 const socket=text.match(/(?:홈\s*있음|소켓|Sockets?)\s*[:：(\[]*\s*(\d+)/i);
 return {ethereal:/무형|수리\s*불가|Ethereal/i.test(text),superior:/고급|Superior/i.test(text),sockets:socket?+socket[1]:null};
}
