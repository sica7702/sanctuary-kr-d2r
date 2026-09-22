export const difficulties=['normal','nightmare','hell'];
export const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9가-힣]/g,'');
export function cleanState(value,ids){const empty={normal:[],nightmare:[],hell:[]};if(!value||value.version!==1)return empty;for(const d of difficulties)empty[d]=Array.isArray(value.done?.[d])?[...new Set(value.done[d].filter(id=>typeof id==='string'&&ids.has(id)))]:[];return empty;}
export function nextQuest(act,done){return act.quests.find(q=>q.kind!=='선택'&&!done.includes(q.id))||null;}
