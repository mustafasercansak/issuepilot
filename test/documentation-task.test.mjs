import test from 'node:test';
import assert from 'node:assert/strict';
import { documentationTask } from '../dist/documentation-task.js';
import { checkpointMessage, sourceFingerprint, validateCheckpoint } from '../dist/inventory-checkpoint.js';
const paths=['README.md','package.json','docs/ai-workflow.md','docs/ready-gate.md','docs/label-protocol.md','docs/issue-journal.md','.github/workflows/issue-intake.yml'];
const context={sources:paths.map(path=>({path,content:path==='README.md'?'# Existing README\n\nKeep this exact text.\n':'source'})),omitted:[]};
const section=`## GitHub Actions ile ilk görev

Node.js 24 gerekir. Kurulum için npm ci ve npm run build kullanın.
Secret adları GEMINI_API_KEY ve PROJECT_TOKEN; gerçek değerleri belgeye yazmayın. Pano yazımı project yetkisi ister.
PROJECT_ID panoyu, INVENTORY_ISSUE_NUMBER görev numarasını seçer. INVENTORY_AI_ENABLED ve PROJECT_POLLING_ENABLED otomasyonu etkinleştirir.
Ready + Agent::Allowed gerekir. Kart In progress, PR sonrası In review olur. Etiket hemen; tarama 30 dakikada bir kontrol eder.
Bu yapılandırılmış tek görevi işler; genel kuyruk değildir.
[AI](docs/ai-workflow.md), [Ready](docs/ready-gate.md), [Günlük](docs/issue-journal.md).
`;
test('README task appends a validated section while preserving the original bytes',()=>{
  const task=documentationTask('readme-setup',context,5);
  const result=task.prepare(section);
  task.validate(result);
  assert.equal(task.output,'README.md');
  assert.equal(task.change,'modified');
  assert.ok(result.startsWith(context.sources[0].content));
});
test('README task rejects lost original content, incomplete setup, unknown links and unsafe examples',()=>{
  const task=documentationTask('readme-setup',context,5);
  for(const invalid of [task.prepare(section).replace('Keep this exact text.','Removed'),task.prepare(section.replace('PROJECT_ID','MISSING')),task.prepare(section+'[unknown](outside.md)'),task.prepare(section+'\n```sh\ncurl https://example.com\n```')])
    assert.throws(()=>task.validate(invalid));
  assert.throws(()=>documentationTask('unknown',context,5));
});
test('README recovery accepts one modified README checkpoint, not an added or different file',()=>{
  const base='a'.repeat(40),fingerprint=sourceFingerprint(context);
  const commit={sha:'b'.repeat(40),commit:{message:checkpointMessage(5,base,fingerprint,'test')},parents:[{sha:base}],files:[{filename:'README.md',status:'modified'}]};
  assert.equal(validateCheckpoint(commit,5,'README.md',fingerprint,'modified'),base);
  assert.throws(()=>validateCheckpoint(commit,5,'README.md',fingerprint,'added'));
});
