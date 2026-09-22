import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reviewedValueSample,trainReviewedValuePatterns,inferReviewedValue,
  VALUE_TIER_TAGS,LEARNED_AFFIX_KEYS
} from '../review-value-learning.mjs';

function candidate(index,{tag='value_high',status='approved',affixes={fcr:10,life:40},
  source='traderie',actor='worker-session',eligible=1,integrity=true,
  parser=true,price=true,hash=true,listingId=String(index),
  reviewedAt=`2026-09-${String(index).padStart(2,'0')} 12:00:00`,
  reason='approved_market_feedback',otherTags=[]}={}){
  return {
    id:index,status,source_type:'market_observation',reviewer_email:actor,
    review_reason_type:reason,learning_eligible:eligible,reviewed_at:reviewedAt,
    reviewer_tags_json:JSON.stringify([tag,...otherTags]),
    evidence_json:JSON.stringify([{source,slot:'ring',item_type:'레어',listing_id:listingId,
      affixes,integrity:{complete:integrity},parser_quality:{complete:parser,property_coverage:1},
      price_structure:{complete:price,amount:1,currency:'Ist Rune'},
      source_snapshot:{id:listingId,platform:'PC',ladder:true,hardcore:false,game_version:'D2R',region:'Asia'},
      source_snapshot_hash:hash?'a'.repeat(64):null}]),
    proposal_json:JSON.stringify({slot:'ring',item_type:'레어'})
  };
}

const seven=()=>Array.from({length:7},(_,index)=>candidate(index+1));

test('explicit verified human labels train a time-split pattern and both consumers can infer the exact item',()=>{
  const result=trainReviewedValuePatterns(seven());
  assert.equal(result.patterns.length,1);
  assert.equal(result.diagnostics.independent,7);
  const pattern=result.patterns[0];
  assert.equal(pattern.learning_meta.source,'reviewed_value');
  assert.equal(pattern.effects.learned_value_tier,2);
  assert.equal(pattern.learning_meta.train_count,5);
  assert.equal(pattern.learning_meta.holdout_count,2);
  assert.equal(pattern.learning_meta.holdout_accuracy,1);
  assert.deepEqual(pattern.learning_meta.affix_keys,['fcr','life']);
  assert.deepEqual(pattern.learning_meta.affix_ranges,{fcr:{gte:10,lte:10},life:{gte:40,lte:40}});
  assert.deepEqual(pattern.conditions,{fcr:{gte:10,lte:10},life:{gte:40,lte:40}});
  assert.equal(pattern.priority,0);
  assert.equal(Object.hasOwn(pattern.effects,'score_delta'),false);
  assert.deepEqual(pattern.learning_meta.allowed_affix_keys,LEARNED_AFFIX_KEYS);
  assert.match(pattern.rule_key,/^review_value:[a-f0-9]{16}$/);
  const inferred=inferReviewedValue(result.patterns,{slot:'반지',item_type:'레어',values:{fcr:10,life:40,reqlevel:66}});
  assert.equal(inferred.status,'learned');
  assert.equal(inferred.value_tier,2);
  assert.equal(inferReviewedValue(result.patterns,{slot:'ring',item_type:'레어',values:{fcr:10,life:41}}).status,'abstain');
  assert.equal(inferReviewedValue(result.patterns,{slot:'ring',item_type:'레어',values:{fcr:10,life:40,str:1}}).status,'abstain');
  assert.equal(inferReviewedValue(result.patterns,{slot:'ring',item_type:'레어',values:{fcr:10,life:40,unknown_stat:9}}).status,'abstain');
});

test('all four explicit value labels have a stable tier mapping',()=>{
  assert.deepEqual(VALUE_TIER_TAGS,{value_low:0,value_trade:1,value_high:2,value_trophy:3});
  for(const [tag,tier] of Object.entries(VALUE_TIER_TAGS)){
    const {sample}=reviewedValueSample(candidate(1,{tag}));
    assert.equal(sample.value_tier,tier);
  }
});

test('unique, set, and base reviews do not train a model unused by either appraiser',()=>{
  for(const itemType of ['유니크','세트','베이스']){
    const row=candidate(1);
    row.proposal_json=JSON.stringify({slot:'ring',item_type:itemType});
    assert.equal(reviewedValueSample(row).reason,'unsupported_item_type');
  }
});

test('small, inconsistent, or holdout-failing groups abstain',()=>{
  assert.equal(trainReviewedValuePatterns(seven().slice(0,6)).patterns.length,0);
  const holdoutFailure=seven();
  holdoutFailure[6]=candidate(7,{tag:'value_low'});
  const failed=trainReviewedValuePatterns(holdoutFailure);
  assert.equal(failed.patterns.length,0);
  assert.equal(failed.diagnostics.group_abstentions.holdout_label_failed,1);
  const trainingDisagreement=seven();
  trainingDisagreement[0]=candidate(1,{tag:'value_low'});
  trainingDisagreement[1]=candidate(2,{tag:'value_trade'});
  assert.equal(trainReviewedValuePatterns(trainingDisagreement).patterns.length,0);
});

test('duplicate listings do not inflate support; contradictory re-reviews are discarded',()=>{
  const rows=seven().slice(0,6);
  rows.push(candidate(7,{listingId:'6'}));
  const duplicate=trainReviewedValuePatterns(rows);
  assert.equal(duplicate.diagnostics.independent,6);
  assert.equal(duplicate.patterns.length,0);
  rows.push(candidate(8,{listingId:'6',tag:'value_low'}));
  const conflicting=trainReviewedValuePatterns(rows);
  assert.equal(conflicting.diagnostics.independent,5);
  assert.equal(conflicting.diagnostics.rejected_reasons.conflicting_listing,1);
  assert.equal(conflicting.patterns.length,0);
});

test('automatic reviews, incomplete snapshots, and missing/conflicting labels are never training data',()=>{
  const bad=[
    candidate(1,{actor:'auto-policy'}),
    candidate(2,{reason:'auto_validated_review'}),
    candidate(3,{eligible:0}),
    candidate(4,{integrity:false}),
    candidate(5,{parser:false}),
    candidate(6,{price:false}),
    candidate(7,{hash:false}),
    candidate(8,{source:'playnote'}),
    candidate(9,{otherTags:['value_trophy']}),
    candidate(10,{tag:'synergy_good'}),
    candidate(11,{affixes:{fcr:10,unknown_affix:2}}),
    candidate(12,{reason:'manual_review_only'}),
    candidate(13,{affixes:{fcr:10,sockets:0}}),
    {...candidate(14),source_type:'manual'}
  ];
  const result=trainReviewedValuePatterns(bad);
  assert.equal(result.patterns.length,0);
  assert.equal(result.diagnostics.accepted,0);
  assert.equal(result.diagnostics.rejected_reasons.not_human,3);
  assert.equal(result.diagnostics.rejected_reasons.incomplete_source,3);
  assert.equal(result.diagnostics.rejected_reasons.missing_snapshot,1);
  assert.equal(result.diagnostics.rejected_reasons.unverified_source,1);
  assert.equal(result.diagnostics.rejected_reasons.conflicting_value_tags,1);
  assert.equal(result.diagnostics.rejected_reasons.no_value_tag,1);
  assert.equal(result.diagnostics.rejected_reasons.unsupported_affixes,1);
  assert.equal(result.diagnostics.rejected_reasons.explicit_socket_absence_unsupported,1);
  assert.equal(result.diagnostics.rejected_reasons.not_market_review,1);
});

test('varying rolls within a learned key family work; unseen rolls and extra keys abstain',()=>{
  const rolls=[[10,40],[12,45],[11,42],[13,47],[14,50],[12,44],[13,46]];
  const rows=rolls.map(([fcr,life],index)=>candidate(index+1,{affixes:{fcr,life}}));
  const result=trainReviewedValuePatterns(rows);
  assert.equal(result.patterns.length,1);
  const pattern=result.patterns[0];
  assert.deepEqual(pattern.conditions,{fcr:{gte:10,lte:14},life:{gte:40,lte:50}});
  assert.equal(pattern.learning_meta.holdout_accuracy,1);
  const infer=values=>inferReviewedValue(result.patterns,{slot:'ring',item_type:'레어',values});
  assert.equal(infer({fcr:11,life:43}).status,'learned');
  assert.equal(infer({fcr:11,life:43,str:0}).status,'learned');
  assert.equal(infer({fcr:9,life:43}).status,'abstain');
  assert.equal(infer({fcr:11,life:51}).status,'abstain');
  assert.equal(infer({fcr:11,life:43,str:1}).status,'abstain');
  assert.equal(inferReviewedValue(result.patterns,{slot:'amulet',item_type:'레어',values:{fcr:11,life:43}}).status,'abstain');
  assert.equal(inferReviewedValue(result.patterns,{slot:'ring',item_type:'매직',values:{fcr:11,life:43}}).status,'abstain');
});

test('a holdout label or roll outside training ranges prevents promotion',()=>{
  const rolls=[[10,40],[12,45],[11,42],[13,47],[14,50],[12,44],[20,46]];
  const rows=rolls.map(([fcr,life],index)=>candidate(index+1,{affixes:{fcr,life}}));
  const result=trainReviewedValuePatterns(rows);
  assert.equal(result.patterns.length,0);
  assert.equal(result.diagnostics.group_abstentions.holdout_outside_train_range,1);
  assert.match(result.diagnostics.policy.warning,/abstain/);
});

test('class skill is retained only with an exact class profile',()=>{
  const rolls=[[1,40],[2,45],[2,42],[1,47],[2,50],[1,44],[2,46]];
  const rows=rolls.map(([classskill,life],index)=>candidate(index+1,{affixes:{sorc_skills:classskill,life}}));
  const result=trainReviewedValuePatterns(rows);
  assert.equal(result.patterns.length,1);
  assert.deepEqual(result.patterns[0].learning_meta.affix_keys,['classskill','life']);
  assert.deepEqual(result.patterns[0].profile,{char:{eq:'소서리스'}});
  assert.equal(inferReviewedValue(result.patterns,{slot:'ring',item_type:'레어',values:{classskill:2,life:43},profile:{char:'소서리스'}}).status,'learned');
  assert.equal(inferReviewedValue(result.patterns,{slot:'ring',item_type:'레어',values:{classskill:2,life:43},profile:{char:'아마존'}}).status,'abstain');
});
