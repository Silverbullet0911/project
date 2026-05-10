import { NextRequest, NextResponse } from "next/server";
import { getSession, getMessages } from "@/lib/db";

export async function GET(
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

  const messages = await getMessages(sessionId);

  return NextResponse.json({
    id: session.id,
    status: session.status,
    created_at: session.created_at,
    material_texts: JSON.parse(session.material_texts || "{}"),
    attack_plan: session.attack_plan ? JSON.parse(session.attack_plan) : null,
    debrief_report: session.debrief_report ? JSON.parse(session.debrief_report) : null,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      topic: m.topic,
      created_at: m.created_at,
    })),
  });
}
