export function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("Missing OPENAI_API_KEY");
  }
  return key;
}

export async function openAIJson<T>(
  path: string,
  init: RequestInit,
  fallbackMessage = "OpenAI request failed"
): Promise<T> {
  const response = await fetch(`https://api.openai.com/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getOpenAIKey()}`,
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`${fallbackMessage}: ${response.status} ${details}`);
  }

  return response.json() as Promise<T>;
}
