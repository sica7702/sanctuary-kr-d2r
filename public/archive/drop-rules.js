// SetItems.txt leaves this game-specific area restriction implicit.
// Blizzard: https://classic.battle.net/diablo2exp/items/sets/sets4.shtml#cowkingsleathers
export const cowSetSource='https://classic.battle.net/diablo2exp/items/sets/sets4.shtml#cowkingsleathers';
export const isCowSet=r=>r?.kind==='세트'&&r.raw?.set==="Cow King's Leathers";
export function dropLocationAllowed(item,context={}){return !isCowSet(item)||String(context.regionId)==='region:39';}
