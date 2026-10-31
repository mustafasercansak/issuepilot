export const defaultReviewModel = 'mistral-small-latest';

export async function generateWithMistral(prompt: string, apiKey: string, model = defaultReviewModel,
  request: typeof fetch = fetch): Promise<string> {
  if (!apiKey) throw new Error('MISTRAL_API_KEY is missing');
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(model)) throw new Error('Invalid Mistral model');
  const response = await request('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(120_000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, max_tokens: 2048, temperature: 0,
      messages: [{ role: 'user', content: prompt }] }),
  });
  if (!response.ok) throw new Error(response.status === 429
    ? 'Mistral quota exceeded; no fallback or automatic retry was used'
    : `Mistral HTTP ${response.status}`);
  const data = await response.json() as { choices?: { finish_reason?: string; message?: { content?: unknown } }[] };
  const choice = data.choices?.[0];
  if (choice?.finish_reason !== 'stop') throw new Error('Mistral did not return a complete answer');
  const text = typeof choice.message?.content === 'string' ? choice.message.content.trim() : '';
  if (!text) throw new Error('Mistral returned no text');
  return text;
}
