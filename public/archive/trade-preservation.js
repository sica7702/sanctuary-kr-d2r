// Local transport audit. Only a real form readback can verify end-to-end retention.
export function preservationReport(draft, delivered=[]){
 const rows=draft.options.map((o,index)=>{
  const blank=o.value===''||o.value==null;
  const sent=delivered.find(d=>d.index===index);
  return {index,code:o.code,param:o.param??'',name:o.name||o.code,value:o.value,
   state:blank?'unread':sent?'encoded':'not-encoded',
   property:sent?.property??null,encodedValue:sent?.value??null,
   formVerified:false};
 });
 return {rows,observed:rows.filter(r=>r.state!=='unread').length,
  encoded:rows.filter(r=>r.state==='encoded').length,
  notEncoded:rows.filter(r=>r.state==='not-encoded'),
  originalLines:[...(draft.rawLines||[])],formVerified:false,complete:false};
}
