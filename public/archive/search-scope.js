export function inScope(record, scope='') {
  if(scope==='magic'||scope==='rare') return record.kind==='옵션 조합' && record.id.startsWith('reference:'+scope+'-');
  return !scope || record.kind===scope;
}
export function scopedRecords(records, scope=''){return records.filter(r=>inScope(r,scope));}
export const scopeNames={'':'전체 자료',magic:'매직',rare:'레어','재료':'베이스 재료','유니크':'유니크','세트':'세트','룬워드':'룬워드'};
