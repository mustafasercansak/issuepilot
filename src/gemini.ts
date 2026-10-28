export const defaultModel = 'gemini-3.1-flash-lite';

export async function generateInventory(prompt: string, apiKey: string, model = defaultModel,
  request: typeof fetch = fetch): Promise<string> {
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
  if (!/^gemini-[a-zA-Z0-9.-]+$/.test(model)) throw new Error('Invalid Gemini model');
  const response = await request(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(120_000),
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192 } }),
  });
  if (!response.ok) throw new Error(response.status === 429
    ? 'Gemini quota exceeded; no fallback or automatic retry was used'
    : `Gemini HTTP ${response.status}`);
  const data = await response.json() as {
    candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  const candidate = data.candidates?.[0];
  if (candidate?.finishReason !== 'STOP') throw new Error('Gemini did not return a complete answer');
  const markdown = candidate.content?.parts?.filter(part => !part.thought).map(part => part.text ?? '').join('').trim();
  if (!markdown) throw new Error('Gemini returned no text');
  return markdown;
}
