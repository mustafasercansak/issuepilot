import test from 'node:test';
import assert from 'node:assert/strict';
import { generateInventory, defaultModel } from '../dist/gemini.js';
import { normalizeInventoryLinks, validateInventoryDocument } from '../dist/inventory-document.js';
const context = { sources: ['README.md','package.json','src/cli.ts'].map(path=>({path,content:'example'})), omitted:[] };
const markdown = '# Repository inventory\n\n' +
  '- Project: [README](../README.md).\n' +
  '- Runtime: [manifest](../package.json).\n' +
  '- Entry point: [CLI](../src/cli.ts).\n' +
  'This is static source analysis. Commands were not executed. Details require human review; source links do not prove semantic correctness.\n';
test('Gemini request uses fixed endpoint, header key and bounded output', async()=>{
  const result=await generateInventory('prompt','fake-key',defaultModel,async(url,options)=>{
    assert.match(url,/generativelanguage\.googleapis\.com/);
    assert.equal(options.headers['x-goog-api-key'],'fake-key');
    assert.equal(JSON.parse(options.body).generationConfig.maxOutputTokens,8192);
    return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:markdown}]}}]});
  });
  assert.equal(result,markdown.trim());
  validateInventoryDocument(result,context);
});
test('quota, truncation, empty and blocked replies fail without retry',async()=>{
  let calls=0;
  await assert.rejects(generateInventory('prompt','key',defaultModel,async()=>{calls++;return new Response('',{status:429});}),/quota/);
  assert.equal(calls,1);
  for(const data of [{candidates:[]},{candidates:[{finishReason:'MAX_TOKENS'}]},{candidates:[{finishReason:'STOP',content:{parts:[]}}]}])
    await assert.rejects(generateInventory('prompt','key',defaultModel,async()=>Response.json(data)));
});
test('document rejects unknown links, external images, HTML and ungrounded output',()=>{
  assert.throws(()=>validateInventoryDocument(markdown.replace('../README.md','../unknown.md'),context));
  assert.throws(()=>validateInventoryDocument(markdown+'![image](https://example.com)',context));
  assert.throws(()=>validateInventoryDocument(markdown+'<script>alert(1)</script>',context));
  assert.throws(()=>validateInventoryDocument('# Invented\n'+'x'.repeat(300),context));
});

test('normalizes only known repository-root references and permits internal anchors',()=>{
  const unnormalized = markdown.replace('../README.md','README.md').replace('../src/cli.ts','./src/cli.ts#entry');
  const normalized = normalizeInventoryLinks(unnormalized,context);
  assert.match(normalized,/\(\.\.\/README\.md\)/);
  assert.match(normalized,/\(\.\.\/src\/cli\.ts#entry\)/);
  validateInventoryDocument(normalized+'\n[Top](#repository-inventory)',context);
  assert.throws(()=>validateInventoryDocument(normalizeInventoryLinks(markdown.replace('../README.md','unknown.md'),context),context));
});
