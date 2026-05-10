import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY || "",
});

const MODEL = "deepseek-v4-pro";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function claudeComplete(
  systemPrompt: string,
  messages: ChatMessage[],
  maxTokens: number = 4096
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    max_tokens: maxTokens,
    reasoning_effort: "high",
    stream: false,
  });

  return completion.choices[0].message.content || "";
}

export async function* claudeStream(
  systemPrompt: string,
  messages: ChatMessage[],
  maxTokens: number = 2048
): AsyncGenerator<string> {
  const stream = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    max_tokens: maxTokens,
    reasoning_effort: "high",
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
