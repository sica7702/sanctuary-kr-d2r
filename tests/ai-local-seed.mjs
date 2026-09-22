// Local workerd/D1 smoke setup only. Does not connect to a remote database.
import fs from 'node:fs';
import {digest} from '../ai-contract.mjs';
const destination=process.argv[2];if(!destination)throw new Error('output_required');
const schema=`CREATE TABLE IF NOT EXISTS review_candidates(id INTEGER PRIMARY KEY,status TEXT,source_type TEXT,source_url TEXT,evidence_json TEXT,proposal_json TEXT,reviewer_tags_json TEXT,reviewer_email TEXT,learning_eligible INTEGER,reviewed_at TEXT);
${fs.readFileSync(new URL('../migrations/0136_neural_learning.sql',import.meta.url),'utf8')}
INSERT OR REPLACE INTO ai_settings VALUES('trainer_token_hash','${await digest('c'.repeat(64))}');
`;
fs.writeFileSync(destination,schema);
