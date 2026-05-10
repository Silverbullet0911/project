export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession, getMessages, completeSession } from "@/lib/db";
import { claudeComplete } from "@/lib/claude";
import { buildDebriefPrompt } from "@/lib/prompts";
import type { AttackPlan } from "@/types";

function extractJson(raw: string): string {
  let s = raw
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const firstBrace = s.indexOf("{");
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }
  return s;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = parseInt(params.id, 10);
  if (isNaN(sessionId)) {
    return NextResponse.json({ error: "无效的会话ID" }, { status: 400 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }

  if (session.status === "completed") {
    return NextResponse.json({ error: "面试已结束" }, { status: 400 });
  }

  if (session.status !== "active") {
    return NextResponse.json({ error: "面试尚未开始" }, { status: 400 });
  }

  try {
    const messages = await getMessages(sessionId);
    const attackPlan: AttackPlan = JSON.parse(session.attack_plan || "{}");
    const debriefPrompt = buildDebriefPrompt(attackPlan, messages);

    let debriefJson: string;
    try {
      debriefJson = await claudeComplete(
        "你只返回 JSON，不包含任何其他文字、解释、代码块标记。",
        [{ role: "user", content: debriefPrompt }],
        8192
      );
      debriefJson = extractJson(debriefJson);
      let debrief;
      try {
        debrief = JSON.parse(debriefJson);
      } catch {
        // 一次修复重试
        const repairPrompt = `以下 JSON 有语法错误，请修复后重新输出正确 JSON（不要包含其他文字）：\n\`\`\`\n${debriefJson}\n\`\`\``;
        debriefJson = await claudeComplete(
          "你只返回修复后的 JSON，不包含任何其他文字。",
          [{ role: "user", content: repairPrompt }],
          8192
        );
        debriefJson = extractJson(debriefJson);
        debrief = JSON.parse(debriefJson);
      }
      await completeSession(sessionId, debrief);
    } catch (e: any) {
      return NextResponse.json(
        { error: `生成复盘报告失败: ${e.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
