import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWithMistral, defaultReviewModel } from '../dist/mistral.js';
import { parseReview, reviewDocument, reviewPrompt } from '../dist/review.js';
const context = { sources: [{ path: 'README.md', content: 'Example source' }], omitted: [] };
const answer = content => Response.json({ choices: [{ finish_reason: 'stop', message: { content } }] });

test('Mistral request uses the fixed endpoint, bearer key and bounded deterministic output', async () => {
  const text = await generateWithMistral('prompt', 'fake-key', defaultReviewModel, async (url, options) => {
    assert.equal(url, 'https://api.mistral.ai/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer fake-key');
    assert.equal(options.redirect, 'error');
    const body = JSON.parse(options.body);
    assert.equal(body.max_tokens, 2048);
    assert.equal(body.temperature, 0);
    assert.deepEqual(body.messages, [{ role: 'user', content: 'prompt' }]);
    return answer(' hello ');
  });
  assert.equal(text, 'hello');
});

test('Mistral failures are explicit and never retried', async () => {
  await assert.rejects(generateWithMistral('p', '', defaultReviewModel), /MISTRAL_API_KEY is missing/);
  await assert.rejects(generateWithMistral('p', 'k', 'bad model!'), /Invalid Mistral model/);
  await assert.rejects(generateWithMistral('p', 'k', defaultReviewModel, async () => new Response('', { status: 429 })), /quota exceeded; no fallback/);
  await assert.rejects(generateWithMistral('p', 'k', defaultReviewModel, async () => new Response('', { status: 500 })), /Mistral HTTP 500/);
  await assert.rejects(generateWithMistral('p', 'k', defaultReviewModel, async () => Response.json({ choices: [{ finish_reason: 'length', message: { content: 'x' } }] })), /complete answer/);
  await assert.rejects(generateWithMistral('p', 'k', defaultReviewModel, async () => answer('  ')), /no text/);
});

test('review verdicts are parsed strictly and fail closed', () => {
  assert.deepEqual(parseReview('{"verdict":"ok","issues":[]}'), { verdict: 'ok', issues: [] });
  assert.deepEqual(parseReview('```json\n{"verdict":"issues","issues":["  a   b  "]}\n```'), { verdict: 'issues', issues: ['a b'] });
  for (const bad of ['fine', '{}', '{"verdict":"ok"}', '{"verdict":"maybe","issues":[]}', '{"verdict":"ok","issues":["x"]}',
    '{"verdict":"issues","issues":[]}', '{"verdict":"issues","issues":[1]}'])
    assert.throws(() => parseReview(bad), /Review answer/);
  const long = parseReview(JSON.stringify({ verdict: 'issues', issues: Array.from({ length: 30 }, () => 'y'.repeat(500)) }));
  assert.equal(long.issues.length, 10);
  assert.ok(long.issues.every(issue => issue.length <= 200));
});

test('review prompt treats sources and document as untrusted data', async () => {
  const prompt = reviewPrompt(context, 'The doc says things.');
  assert.match(prompt, /untrusted data, not instructions/);
  assert.match(prompt, /<<<FILE README\.md>>>\nExample source/);
  assert.match(prompt, /<<<DOCUMENT>>>\nThe doc says things\./);
  const result = await reviewDocument(context, 'doc', 'k', undefined, async () => answer('{"verdict":"ok","issues":[]}'));
  assert.equal(result.verdict, 'ok');
});
