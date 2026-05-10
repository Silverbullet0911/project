import { NextRequest, NextResponse } from "next/server";
import { getSession, getMessages, completeSession } from "@/lib/db";
import { claudeComplete } from "@/lib/claude";
import { buildDebriefPrompt } from "@/lib/prompts";
import type { AttackPlan } from "@/types";

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
        4096
      );
      debriefJson = debriefJson.replace(/^```json\s*/, "").replace(/```$/, "").trim();
      const debrief = JSON.parse(debriefJson);
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
