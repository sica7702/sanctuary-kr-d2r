// Weak bootstrap labels are never validation truth. Use the same unchanged
// engine projection as the server's baseline comparison.
import {existingValueTier} from '../ai-baseline.mjs';
let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>20000000)throw Error('dataset_too_large')}
const data=JSON.parse(input);
for(const sample of data.train){
 if(sample.labels.value!==null)continue;
 const value=existingValueTier(sample.context);
 if(value!==null){sample.weak_value=value;sample.weak_source='existing_engine_bootstrap_not_human_truth'}
}
process.stdout.write(JSON.stringify(data));
