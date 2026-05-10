const DEEPSEEK_BASE = "https://api.deepseek.com";
const API_KEY = process.env.DEEPSEEK_API_KEY || "";

interface ChatMessage {
  role: string;
  content: string;
}

export async function claudeComplete(
  systemPrompt: string,
  messages: ChatMessage[],
  maxTokens: number = 4096
): Promise<string> {
  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-pro",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `DeepSeek API error: ${res.status}`);
  }
  return data.choices[0].message.content;
}

export async function* claudeStream(
  systemPrompt: string,
  messages: ChatMessage[],
  maxTokens: number = 2048
): AsyncGenerator<string> {
  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-pro",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error?.message || `DeepSeek API error: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const jsonStr = trimmed.slice(6);
      if (jsonStr === "[DONE]") return;
      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {}
    }
  }
}
