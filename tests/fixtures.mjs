import fs from 'node:fs';
import {tradeDraft} from '../public/archive/trade-draft.js';
import {marketIdentity,searchProjection} from '../public/archive/market-identity.js';
import {connectTraderie,searchContract} from '../public/archive/traderie-connect.js';
export const data=JSON.parse(fs.readFileSync(new URL('../public/archive/unified-data.json',import.meta.url)));
export const map=JSON.parse(fs.readFileSync(new URL('../public/archive/traderie-map.json',import.meta.url)));
export const catalog=JSON.parse(fs.readFileSync(new URL('../public/archive/traderie-catalog.json',import.meta.url)));
export const now=Date.parse('2026-09-21T06:00:00Z');
export const market={platform:'PC',ladder:'Ladder',mode:'Softcore',region:'Asia',gameVersion:'reign of the warlock'};
export const settings={start:'5',days:7,autoWiden:true,completed:false};
export function unique(name,values={},baseCode,quality='unique'){
 const record=data.records.find(r=>r.en===name&&r.kind===(quality==='set'?'세트':'유니크'));
 if(!record)throw Error('No fixture: '+name);
 const result={id:record.id,rows:record.mods.map(mod=>({mod,value:values[mod.code]??Number(mod.min),assessment:{status:'확인'}}))};
 let draft=tradeDraft({result,data,ledger:[],quality,baseCode});
 draft=searchProjection(draft,data);
 const info=marketIdentity(draft,data,baseCode);
 return {...connectTraderie(draft,map,catalog),market:{...market},identity:{...info.identity,ethereal:false}};
}
export const belt=()=>unique('Arachnid Mesh',{'ac%':98});
export function listing(id=1,extra={}){return {id:String(id),itemId:'3527553014',quality:'unique',completed:false,active:true,postedAt:'2026-09-21T04:00:00Z',market:{...market},identity:{ethereal:false,unidentified:false},values:{prop_425:98},priceText:'(Ist Rune 1)',priceComplete:true,priceKind:'asking',quantity:1,stock:false,priceBasis:'single-item',sellerKey:'seller-'+id,...extra};}
export function raw(id=1,extra={}){return {id,item:{id:'3527553014',name:'Arachnid Mesh'},quality:'unique',completed:false,active:true,quantity:1,stock:false,user_id:'seller-'+id,ethereal:false,unidentified:false,created_at:'2026-09-21T04:00:00Z',platform:'PC',ladder:true,hardcore:false,region:'Asia',game_version:market.gameVersion,properties:[{property_id:425,property:'Enhanced Defense',number:98}],prices:[{quantity:1,name:'Ist Rune'}],...extra};}
export function request({draft=belt(),stage='5',page=0,completed=false,...init}={}){return new Request('https://audit.invalid/api/public/market-search?'+new URLSearchParams({q:JSON.stringify(searchContract(draft,stage)),page:String(page),completed:String(completed)}),init);}
export function envelope(url,listings=[],extra={}){const u=new URL(url,'https://audit.invalid');return Response.json({ok:true,schema:2,contract:JSON.parse(u.searchParams.get('q')),listings,exhausted:true,...extra});}
