import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const slugs = (await readdir(new URL('../app/dynamodb/', import.meta.url), {withFileTypes:true})).filter(x=>x.isDirectory()).map(x=>x.name);
for (const path of ['', ...slugs.map(x=>'/'+x)]) {
  const response = await fetch(origin+'/dynamodb'+path, {redirect:'manual'});
  assert.equal(response.status,200,path);
  const html=await response.text();
  assert.ok(html.includes('https://serverlesscreed.com/dynamodb'+path), 'Canonical missing: '+path);
  assert.ok(!/href="\/quests/.test(html),'Old lesson URL: '+path);
  if (/^\/quest-(?:[2-9]|1[0-5]|expressions)$/.test(path)) assert.ok(html.includes('aria-label="Lesson animation"'),'Lesson animation missing: '+path);
  if (path==='/quest-3') assert.ok(html.includes('Quick Quiz'),'Quest 3 quiz missing');
  assert.ok(!html.includes('FirstGenPokemon'),'Old table name on '+path);
  assert.ok(!/ Get - to fetch/.test(html),'Quiz should say GetItem: '+path);
  if (path==='/quest-1' && !process.env.NEXT_PUBLIC_EXPERIMENT_QUEST1_SCENE) assert.ok(html.includes('aria-label="Partition key"'),'Partition lab missing on Quest 1');
}
assert.equal(slugs.length,17);
async function post(endpoint, body, status=200) {
  const response=await fetch(origin+'/api/dynamodb/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal(response.status,status,endpoint);
  return response.json();
}
assert.equal((await post('emulate-scan',{code:'new ScanCommand({TableName:"Pokemon"})'})).emulated,true);
assert.equal((await post('emulate-get-item',{code:'new GetCommand({TableName:"Pokemon",Key:{Name:"Bulbasaur"}})'})).found,true);
await post('emulate-get-item',{code:'new GetCommand({TableName:"Wrong"})'},400);
assert.equal((await post('simulate-quest',{questId:'quest-9',code:'const x = ;'})).success,false);
const exercises=await readFile(new URL('../lib/dynamodb/johto-exercises.tsx',import.meta.url),'utf8');
const matches=[...exercises.matchAll(/const quest(\d+|Expressions)Solution = `([\s\S]*?)`/g)];
for(const [,id,code] of matches) {
 const questId = id === "Expressions" ? "quest-expressions" : "quest-"+id;
 const result=await post('simulate-quest',{questId,code});
 assert.equal(result.success,true,questId+': '+result.message);
}
assert.ok(matches.length>=8,'Advanced exercises found');
for (const id of [5, 6, 7, 8]) {
  const source=await readFile(new URL(`../components/dynamodb/quest-${id}-page.tsx`,import.meta.url),'utf8');
  const code=source.match(/const solutionCode = `([\s\S]*?)`/)[1];
  assert.equal((await post('simulate-quest',{questId:'quest-'+id,code})).success,true,'Beginner solution '+id);
  if (id !== 7) {
    const invalid=code.replaceAll(id === 6 ? '#level' : '#name',id === 6 ? 'Level' : 'Name');
    assert.equal((await post('simulate-quest',{questId:'quest-'+id,code:invalid})).success,false,'Reserved word '+id);
  }
}
const production=matches.find(([,id])=>id==='16')[2];
assert.equal((await post('simulate-quest',{questId:'quest-16',code:production.replace('"MREC"','"MRSC"')})).success,false,'MRSC incompatible with lab TTL/transactions');

// Trace contract (lib/dynamodb/trace.ts): every simulator/emulator response carries a replayable trace.
const TRACE_TYPES=new Set(['request','hash','condition','read','write','capacity','page','retry','rollback','expire','response']);
const assertTrace=(r,label)=>{assert.ok(Array.isArray(r.trace)&&r.trace.length>0,'trace missing: '+label);for(const e of r.trace)assert.ok(TRACE_TYPES.has(e.t),'unknown event '+e.t+' in '+label);assert.equal(r.trace.at(-1).t==='response'||r.trace.some(e=>e.t==='response'),true,'no response event: '+label);};
assertTrace(await post('emulate-scan',{code:'new ScanCommand({TableName:"Pokemon"})'}),'emulate-scan');
const getTraced=await post('emulate-get-item',{code:'new GetCommand({TableName:"Pokemon",Key:{Name:"Bulbasaur"}})'});
assertTrace(getTraced,'emulate-get-item');assert.ok(getTraced.counterfactual?.length,'GetItem counterfactual (Scan) missing');
for(const [,id,code] of matches){const questId=id==='Expressions'?'quest-expressions':'quest-'+id;const r=await post('simulate-quest',{questId,code});assertTrace(r,questId);assert.equal(r.failure,undefined,questId+' success should have no failure');}
const syntax=await post('simulate-quest',{questId:'quest-9',code:'const x = ;'});assertTrace(syntax,'syntax');assert.equal(syntax.failure,'syntax');
const expectFailure=async(questId,code,failure)=>{const r=await post('simulate-quest',{questId,code});assert.equal(r.success,false,questId);assertTrace(r,questId+' '+failure);assert.equal(r.failure,failure,questId+': expected '+failure+', got '+r.failure+' ('+r.message+')');};
const q5=(await readFile(new URL('../components/dynamodb/quest-5-page.tsx',import.meta.url),'utf8')).match(/const solutionCode = `([\s\S]*?)`/)[1];
await expectFailure('quest-5',q5.replace(/ConditionExpression[^\n]*\n/,''),'overwrite');
await expectFailure('quest-5',q5.replaceAll('#name','Name'),'reservedWord');
const q9=matches.find(([,id])=>id==='9')[2];
await expectFailure('quest-9',q9.replace(/IndexName[^\n]*\n/,''),'wrongIndex');
const q10=matches.find(([,id])=>id==='10')[2];
await expectFailure('quest-10',q10.replace(/ScanIndexForward\s*:\s*false/,'ScanIndexForward: true'),'wrongOrder');
const q13=matches.find(([,id])=>id==='13')[2];
await expectFailure('quest-13',q13.replaceAll('UnprocessedKeys','Leftovers'),'unprocessedKeys');
const q14=matches.find(([,id])=>id==='14')[2];
await expectFailure('quest-14',q14.replace(/ExclusiveStartKey/g,'StartKey'),'repeatPage');
// Audit regressions: an increment of 10 is not 1; Johto sample data uses stored (lowercase) types.
const q7=(await readFile(new URL('../components/dynamodb/quest-7-page.tsx',import.meta.url),'utf8')).match(/const solutionCode = `([\s\S]*?)`/)[1];
assert.equal((await post('simulate-quest',{questId:'quest-7',code:q7.replace(/(:\w+["']?\s*:\s*)1\b/,'$110')})).success,false,'quest-7 must reject an increment of 10');
const q9ok=await post('simulate-quest',{questId:'quest-9',code:matches.find(([,id])=>id==='9')[2]});
assert.ok(q9ok.data.items.every(i=>i.Type1==='water'),'Quest 9 items should match the queried (lowercase) type');
const board=await post('simulate-quest',{questId:'quest-16',code:production});
assert.equal(board.checks?.length,10,'Quest 16 board checks');assert.ok(board.checks.every(c=>c.pass),'all board checks pass for the solution');
const partialBoard=await post('simulate-quest',{questId:'quest-16',code:production.replace('"KMS"','"AWS_OWNED"')});
assert.equal(partialBoard.checks.find(c=>c.id==='kms').pass,false,'KMS piece stays dark');
const scan=await post('scan-code',{code:'new ScanCommand({TableName:"Pokemon"})'});
assert.ok(!scan.error);

// Certificates (lib/certificates): stamps from passing routes, server-graded checks, issue, idempotency, delete.
const learnerId=crypto.randomUUID(), otherLearner=crypto.randomUUID();
const ansFor={'quest-1':1,'quest-2':1,'quest-3':1,'quest-4':1,'quest-5':2,'quest-6':2,'quest-7':1,'quest-8':2};
const wrong=await post('check-answer',{quest:'quest-1',option:0,learnerId});
assert.equal(wrong.correct,false);assert.equal(wrong.stamp,undefined,'no stamp for a wrong answer');
await post('check-answer',{quest:'nope',option:0},400);
const stamps=[];
for(const [quest,option] of Object.entries(ansFor)){const r=await post('check-answer',{quest,option,learnerId});assert.equal(r.correct,true,quest+' check');assert.ok(r.stamp,quest+' check stamp');stamps.push(r.stamp);}
stamps.push((await post('emulate-scan',{code:'new ScanCommand({TableName:"Pokemon"})',learnerId})).stamp);
stamps.push((await post('emulate-get-item',{code:'new GetCommand({TableName:"Pokemon",Key:{Name:"Bulbasaur"}})',learnerId})).stamp);
for (const id of [5,6,7,8]) {
  const code=(await readFile(new URL(`../components/dynamodb/quest-${id}-page.tsx`,import.meta.url),'utf8')).match(/const solutionCode = `([\s\S]*?)`/)[1];
  stamps.push((await post('simulate-quest',{questId:'quest-'+id,code,learnerId})).stamp);
}
assert.ok(stamps.every(Boolean),'every passing route returns a stamp');
assert.equal((await post('simulate-quest',{questId:'quest-5',code:q5.replace(/ConditionExpression[^\n]*\n/,''),learnerId})).stamp,undefined,'no stamp for a failing run');
async function cert(body,status){const r=await fetch(origin+'/api/certificates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,status,JSON.stringify(body).slice(0,80));return r.json();}
const forged=stamps.map(t=>t.replace(/\.[^.]+$/,'.AAAA'));
assert.ok((await cert({tier:'foundations',name:'Test Learner',learnerId,stamps:forged},400)).missing.length===14,'forged stamps rejected');
await cert({tier:'foundations',name:'Test Learner',learnerId:otherLearner,stamps},400);
await cert({tier:'advanced',name:'Test Learner',learnerId,stamps},400);
assert.equal((await cert({tier:'foundations',name:'AWS',learnerId,stamps},400)).field,'name');
const issued=await cert({tier:'foundations',name:'Test Learner',learnerId,stamps,public:false},201);
assert.match(issued.id,/^SC-[A-Z2-9]{4}-[A-Z2-9]{4}$/);assert.ok(issued.manageKey);
const again=await cert({tier:'foundations',name:'Someone Else',learnerId,stamps},200);
assert.equal(again.id,issued.id,'claiming twice returns the same certificate');assert.equal(again.manageKey,undefined);
const page=await fetch(origin+'/c/'+issued.id);assert.equal(page.status,200);const pageHtml=await page.text();
assert.ok(pageHtml.includes('Test Learner')&&pageHtml.includes('noindex'),'private certificate page renders, noindex');
assert.ok(!/Pok[eé]mon/.test(pageHtml.match(/<main[\s\S]*<\/main>/)?.[0]??''),'no Pokémon names on the certificate page');
const og=await fetch(origin+'/c/'+issued.id+'/opengraph-image');assert.equal(og.status,200);assert.equal(og.headers.get('content-type'),'image/png');
assert.equal((await fetch(origin+'/api/certificates/'+issued.id,{method:'DELETE',headers:{'x-manage-key':'wrong'}})).status,404);
assert.equal((await fetch(origin+'/api/certificates/'+issued.id,{method:'DELETE',headers:{'x-manage-key':issued.manageKey}})).status,200);
assert.equal((await fetch(origin+'/c/'+issued.id)).status,404,'deleted certificate is gone');
console.log(`PASS: certificates (stamps, forgery, idempotency, OG, delete); trace contract on all routes + 7 failure types; lesson animations on 15 quests; Quest 16 board; 18 public pages, canonicals, Scan/GetItem, invalid input, and ${matches.length} advanced solutions, 4 beginner solutions, and alias/consistency regressions.`);
