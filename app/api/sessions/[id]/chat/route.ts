export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getSession, insertMessage, getMessages, updateSessionAttackPlan } from "@/lib/db";
import { claudeStream } from "@/lib/claude";
import { buildInterviewSystemPrompt } from "@/lib/prompts";
import type { AttackPlan } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = parseInt(params.id, 10);
  if (isNaN(sessionId)) {
    return new Response(JSON.stringify({ error: "无效的会话ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: "会话不存在" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (session.status !== "active") {
    return new Response(JSON.stringify({ error: "面试未开始或已结束" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { content: userMessage } = await request.json();
  if (!userMessage || typeof userMessage !== "string" || userMessage.trim().length === 0) {
    return new Response(JSON.stringify({ error: "消息不能为空" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  await insertMessage(sessionId, "user", userMessage.trim());

  const historyMessages = await getMessages(sessionId);
  const attackPlan: AttackPlan = JSON.parse(session.attack_plan || "{}");
  const materialTexts = JSON.parse(session.material_texts || "{}");

  const systemPrompt = await buildInterviewSystemPrompt(attackPlan, materialTexts);

  const claudeMessages = historyMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = "";

      try {
        const generator = claudeStream(systemPrompt, claudeMessages);

        for await (const chunk of generator) {
          fullResponse += chunk;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ delta: chunk })}\n\n`)
          );
        }

        await insertMessage(sessionId, "assistant", fullResponse);

        if (attackPlan.attack_points) {
          const allUncovered = attackPlan.attack_points.filter((p) => !p.covered);
          if (allUncovered.length <= 1) {
            for (const p of allUncovered) p.covered = true;
            await updateSessionAttackPlan(sessionId, attackPlan);
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (e: any) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: e.message })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
