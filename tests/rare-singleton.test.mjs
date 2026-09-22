import test from 'node:test';
import assert from 'node:assert/strict';
import {rareEquipmentSingleQuantity} from '../rare-singleton.mjs';
import {snapshotListing} from '../traderie-integrity.mjs';
import {traderieApiObservation} from '../worker.js';
import {normalizeMarketListing} from '../market-search-api.mjs';
import {pricedSample} from '../public/archive/market-contract.js';

const ring=()=>({id:123,item:{name:'Rare Ring',rarity:'rare'},platform:'PC',game_version:'rotw',ladder:true,hardcore:false,
  prices:[{group:0,name:'Jah Rune',quantity:2}],properties:[{property:'10% Faster Cast Rate',type:'number',number:10}]});

test('a missing item count on one rare ring is an explicit inference, never a raw source rewrite',()=>{
  const source=ring(),before=structuredClone(source);
  assert.deepEqual(rareEquipmentSingleQuantity(source,'ring'),{single:true,basis:'implicit_single_nonstackable_rare',effective_quantity:1});
  const observation=traderieApiObservation(source,'seller');
  assert(observation);
  assert.equal(observation.integrity.complete,true);
  assert.equal(observation.integrity.quantity_basis,'implicit_single_nonstackable_rare');
  assert.equal(observation.integrity.effective_item_quantity,1);
  assert.equal(observation.source_snapshot.quantity,undefined);
  assert.equal(observation.price_amount,2);
  assert.equal(observation.price_currency,'Jah Rune');
  assert.deepEqual(source,before);
});

test('the live Traderie shape marks rarity in properties while item.type stays misc or base',()=>{
  const source=ring();source.item={id:2390453209,name:'Ring',slug:'ring',type:'misc'};
  source.properties.push({property:'Rarity',string:'rare'});
  const observation=traderieApiObservation(source,'seller');
  assert(observation);
  assert.equal(observation.integrity.complete,true);
  assert.equal(observation.integrity.quantity_basis,'implicit_single_nonstackable_rare');
  assert.equal(observation.source_snapshot.quantity,undefined);
  const market=normalizeMarketListing(source);
  assert.equal(market.quantityBasis,'implicit_single_nonstackable_rare');
  assert.equal(pricedSample(market),true);
});

test('explicit one remains explicit; multiple, malformed and empty item counts are not inferred',()=>{
  assert.equal(rareEquipmentSingleQuantity({...ring(),quantity:1},'ring').basis,'explicit_single');
  for(const quantity of [0,2,-1,'',false,'unknown'])
    assert.equal(rareEquipmentSingleQuantity({...ring(),quantity},'ring').single,false,String(quantity));
});

test('only unambiguous rare equipment, never materials, other rarities or a conflicting identity',()=>{
  for(const raw of [
    {...ring(),item:{name:'Jah Rune',rarity:'rare'}},
    {...ring(),item:{name:'Rare Ring',rarity:'magic'}},
    {...ring(),item:{name:'Rare Ring',rarity:'rare',quality:'unique'}},
    {...ring(),item:{name:'Jah Rune',rarity:'rare',category:'Ring'}},
    {...ring(),name:'Rare Ring',item:{name:'Jah Rune',rarity:'rare'}},
    {...ring(),item:{name:'Rare Ring',rarity:'rare',category:'Amulet'}},
    {...ring(),item:{name:'Rare Ring',rarity:'rare'},properties:[...ring().properties,{property:'Rarity',string:'unique'}]},
  ])assert.equal(rareEquipmentSingleQuantity(raw,'ring').single,false);
  assert.equal(rareEquipmentSingleQuantity(ring(),'other').single,false);
});

test('stock, bundle, lot and inventory signals remain outside the singleton path',()=>{
  for(const change of [
    {stock:true},{stock:2},{stock:'2'},{stock_listing:true},{is_stock_listing:'yes'},{bundle:1},{amount:2},{item_count:2},
    {quantity:1,item:{name:'Rare Ring',rarity:'rare',quantity:2}},
    {listing_type:'bundle'},{description:'pack of three rings'},{inventory:[{},{}]},
    {properties:[...ring().properties,{property:'Stock Listing',string:'true'}]},
    {properties:[...ring().properties,{property:'Stock Listing',number:2}]},
    {properties:[...ring().properties,{property:'Quantity',number:2}]},
  ])assert.equal(rareEquipmentSingleQuantity({...ring(),...change},'ring').single,false,JSON.stringify(change));
  const snap=snapshotListing({...ring(),stock_listing:true,description:'bundle',quantity:undefined});
  assert.equal(snap.stock_listing,true);
  assert.equal(snap.description,'bundle');
  assert.equal(snap.quantity,undefined);
});
