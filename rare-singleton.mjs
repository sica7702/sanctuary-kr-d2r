// A non-stackable rare equipment listing represents one rolled item even when
// Traderie omits listing.quantity. Never write an inferred value into the raw
// source snapshot; keep the inference basis beside the integrity result.
export const RARE_SINGLE_SLOTS=Object.freeze([
  'ring','amulet','circlet','gloves','boots','belt','claw','jav','bow','crossbow','orb','wand'
]);
const slotNames={
  ring:/\b(ring)\b|반지|링/i,amulet:/\b(amulet)\b|목걸이|아뮬/i,
  circlet:/\b(circlet|coronet|tiara|diadem)\b|써클|서클|코로니트|코로넷|티아라|다이어뎀/i,
  gloves:/\b(gloves?|gauntlets?)\b|장갑|글러브|건틀릿/i,
  boots:/\b(boots?|greaves?)\b|부츠|신발|그리브/i,
  belt:/\b(belt|sash)\b|벨트|새시|코일/i,
  claw:/\b(claws?|talons?|katar)\b|클러|탤런|카타르/i,
  jav:/\b(javelin)\b|재벌|자벨/i,
  bow:/\b(bow)\b|보우|(?:^|\s)활(?:$|\s)/i,
  crossbow:/\b(crossbow)\b|석궁|크로스보우/i,
  orb:/\b(orb)\b|오브/i,wand:/\b(wand)\b|완드|원드/i
};
const nonRare=/\b(?:unique|set|magic|crafted?|normal|superior|runeword)\b/i;
const materialIdentity=/\b(?:rune|gem|essence|token|key|material|consumable)\b|룬|보석|정수|토큰|재료|소모품/i;
const bulkText=/\b(?:bundle|bulk|stock listing|pack of|lot of|multiple items?|multi[- ]?item)\b|묶음|일괄|대량/i;
const trueLike=value=>value===true||value===1||typeof value==='string'&&/^(?:true|yes|stock|bulk|bundle|lot)$/i.test(value.trim());
const integer=value=>{
  if(value===null||value===undefined)return null;
  if(typeof value==='boolean'||String(value).trim()==='')return NaN;
  const n=Number(value);return Number.isSafeInteger(n)&&n>0?n:NaN;
};
function rarityIsUnambiguousRare(listing){
  const fields=[listing?.rarity,listing?.quality,listing?.item?.rarity,listing?.item?.quality,
    listing?.variant?.rarity,listing?.variant?.quality];
  for(const p of Array.isArray(listing?.properties)?listing.properties:[]){
    if(/^(?:rarity|quality)$/i.test(String(p?.property||p?.name||'').trim()))
      fields.push(p?.string??p?.value??p?.number);
  }
  const words=fields.filter(x=>x!==null&&x!==undefined&&String(x).trim()).map(String);
  return words.some(x=>/\brare\b/i.test(x))&&!words.some(x=>nonRare.test(x));
}
function contradictorySaleSignals(listing){
  for(const owner of [listing,listing?.item]){
    if(!owner||typeof owner!=='object')continue;
    for(const key of ['stock','is_stock','stock_listing','is_stock_listing','bulk','is_bulk','bundle','is_bundle','lot','is_lot','stackable','is_stackable'])
      if(trueLike(owner[key])||owner[key]!==null&&owner[key]!==undefined&&Number.isFinite(Number(owner[key]))&&Number(owner[key])>0)return key;
    for(const key of ['amount','count','item_count','stock_count','stack_size','available_quantity']){
      if(owner[key]!==undefined&&owner[key]!==null&&integer(owner[key])!==1)return key;
    }
    if(Array.isArray(owner.inventory)&&owner.inventory.length>1)return 'inventory';
    if(bulkText.test(String(owner.listing_type||'')))return 'listing_type';
  }
  if(bulkText.test(String(listing?.title||''))||bulkText.test(String(listing?.description||'')))return 'bundle_text';
  for(const p of Array.isArray(listing?.properties)?listing.properties:[]){
    if(/^Quantity$/i.test(String(p?.property||p?.name||'').trim())){
      const q=integer(p?.number??p?.value??p?.string);
      if(q!==1)return 'quantity_property';
    }
    const signal=p?.number??p?.value??p?.string;
    if(/^(?:Stock Listing|Bulk|Bundle|Lot|Stackable)$/i.test(String(p?.property||p?.name||'').trim())&&
      (trueLike(signal)||signal!==null&&signal!==undefined&&Number.isFinite(Number(signal))&&Number(signal)>0))
      return 'property_bulk_signal';
  }
  return null;
}
export function rareEquipmentSingleQuantity(listing,slot){
  if(!listing||!RARE_SINGLE_SLOTS.includes(slot))return {single:false,reason:'unsupported_slot'};
  if(!rarityIsUnambiguousRare(listing))return {single:false,reason:'rarity_unconfirmed'};
  const identityFields=[listing?.item?.name,listing?.name,listing?.item?.type,listing?.item?.category,
    listing?.item?.base,listing?.base].filter(Boolean).map(String);
  if(!identityFields.some(value=>slotNames[slot].test(value))||identityFields.some(value=>materialIdentity.test(value)))
    return {single:false,reason:'base_slot_mismatch'};
  if(identityFields.some(value=>Object.entries(slotNames).some(([other,pattern])=>other!==slot&&pattern.test(value))))
    return {single:false,reason:'conflicting_slot_identity'};
  const contradiction=contradictorySaleSignals(listing);
  if(contradiction)return {single:false,reason:'multiple_or_bulk_signal',signal:contradiction};
  const nested=integer(listing?.item?.quantity);
  if(nested!==null&&nested!==1)return {single:false,reason:'item_quantity_not_single'};
  const raw=integer(listing.quantity);
  if(raw===1)return {single:true,basis:'explicit_single',effective_quantity:1};
  if(raw!==null)return {single:false,reason:'quantity_not_single'};
  return {single:true,basis:'implicit_single_nonstackable_rare',effective_quantity:1};
}
