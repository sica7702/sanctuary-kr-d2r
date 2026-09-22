import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sourceHashes} from '../ai-baseline-generated.mjs';
import {digest} from '../ai-contract.mjs';
import {existingValueTier} from '../ai-baseline.mjs';
import {sampleFixture} from './ai-fixtures.mjs';
test('server baseline packages unchanged source engines and skips unsupported options',async()=>{
 for(const [name,hash] of Object.entries(sourceHashes))assert.equal(await digest(fs.readFileSync(new URL('../public/archive/'+name,import.meta.url),'utf8')),hash);
 const context=sampleFixture(1).context;assert(Number.isInteger(existingValueTier(context)));
 assert.equal(existingValueTier({...context,values:{unknown_skill:3}}),null);
});
