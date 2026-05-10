import { NextRequest, NextResponse } from "next/server";
import { parseUploadedFiles } from "@/lib/pdf";
import { createSession, updateSessionAttackPlan } from "@/lib/db";
import { claudeComplete } from "@/lib/claude";
import { buildAttackPlanPrompt } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const fileFields = ["resume", "notification", "past_exams", "statement", "transcript"];
    const files: { field: string; file: File }[] = [];

    for (const field of fileFields) {
      const file = formData.get(field);
      if (file && file instanceof File) {
        files.push({ field, file });
      }
    }

    if (!files.some((f) => f.field === "resume")) {
      return NextResponse.json({ error: "简历为必选项" }, { status: 400 });
    }

    let materialTexts: Record<string, string>;
    try {
      materialTexts = await parseUploadedFiles(files);
    } catch (e: any) {
      return NextResponse.json({ error: `文件解析失败: ${e.message}` }, { status: 400 });
    }

    if (!materialTexts.resume || materialTexts.resume.trim().length < 50) {
      return NextResponse.json({ error: "简历内容过短，无法生成有效的面试" }, { status: 400 });
    }

    const sessionId = await createSession(materialTexts);

    const systemPrompt = buildAttackPlanPrompt(materialTexts);
    let attackPlanJson: string;
    try {
      attackPlanJson = await claudeComplete(
        "你只返回 JSON，不包含任何其他文字、解释、代码块标记。",
        [{ role: "user", content: systemPrompt }],
        4096
      );
      attackPlanJson = attackPlanJson.replace(/^```json\s*/, "").replace(/```$/, "").trim();
      const attackPlan = JSON.parse(attackPlanJson);
      await updateSessionAttackPlan(sessionId, attackPlan);
    } catch (e: any) {
      return NextResponse.json(
        { error: `生成攻击计划失败: ${e.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessionId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
