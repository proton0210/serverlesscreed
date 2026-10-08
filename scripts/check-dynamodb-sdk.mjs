import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const root = fileURLToPath(new URL('..', import.meta.url));
const sources = ['lib/dynamodb/quest-content.tsx','lib/dynamodb/johto-exercises.tsx',...(await readdir(path.join(root,'components/dynamodb'))).filter(x=>/^quest-\d+-page\.tsx$/.test(x)).map(x=>'components/dynamodb/'+x)];
const dir=await mkdtemp(path.join(root,'.sdk-check-'));
try {
  const files=[];
  for(const source of sources) {
    const tree=ts.createSourceFile(source,await readFile(path.join(root,source),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    function visit(node) {
      // Full SDK snippets only; incomplete exercise inputs are expected to fail type checks.
      if(ts.isNoSubstitutionTemplateLiteral(node) && node.text.includes('import { DynamoDBClient }')) {
        const parent=node.parent;
        const name=parent.name?.getText(tree) ?? '';
        if(/problem/i.test(name)) return;
        const code=node.text.replace(/\/\/ @ts-nocheck\s*/g,'');
        assert.ok(code.includes('DynamoDBDocumentClient.from(client)'), source+' missing document client');
        assert.ok(!code.includes('await client.send('), source+' uses low-level client');
        files.push({name:`${files.length}.js`,source,code:ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText});
      }
      ts.forEachChild(node,visit);
    }
    visit(tree);
  }
  assert.ok(files.length>=20,'Full SDK examples extracted');
  for(const file of files) await writeFile(path.join(dir,file.name),file.code);
  const program=ts.createProgram(files.map(f=>path.join(dir,f.name)),{noEmit:true,allowJs:true,checkJs:true,skipLibCheck:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler});
  const errors=ts.getPreEmitDiagnostics(program);
  if(errors.length) {
    for(const error of errors) console.error(error.file?.fileName,ts.flattenDiagnosticMessageText(error.messageText,'\n'));
    throw new Error('SDK example type checks failed');
  }
  // Exercise real SDK marshalling with an in-memory transport. No AWS/network calls.
  const requests=[];
  const client=new DynamoDBClient({region:'us-east-1',credentials:{accessKeyId:'TEST_ONLY',secretAccessKey:'TEST_ONLY'},requestHandler:{async handle(request) {
    requests.push(JSON.parse(Buffer.from(request.body).toString()));
    return {response:{statusCode:200,headers:{'content-type':'application/x-amz-json-1.0'},body:Buffer.from(JSON.stringify(request.headers['x-amz-target'].endsWith('GetItem')?{Item:{Name:{S:'Mew'},Level:{N:'5'}}}:{}))}};
  }}});
  const docClient=DynamoDBDocumentClient.from(client);
  const result=await docClient.send(new GetCommand({TableName:'Pokemon',Key:{Name:'Mew'}}));
  assert.deepEqual(requests[0].Key,{Name:{S:'Mew'}});
  assert.deepEqual(result.Item,{Name:'Mew',Level:5});
  await docClient.send(new PutCommand({TableName:'Pokemon',Item:{Name:'Mew',Level:5}}));
  assert.deepEqual(requests[1].Item,{Name:{S:'Mew'},Level:{N:'5'}});
  client.destroy();
  console.log(`PASS: ${files.length} SDK examples type-check; real SDK marshalling/unmarshalling passes without AWS.`);
} finally { await rm(dir,{recursive:true,force:true}); }
