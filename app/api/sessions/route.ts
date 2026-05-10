export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { parseUploadedFiles } from "@/lib/pdf";
import { createSession, updateSessionAttackPlan } from "@/lib/db";
import { claudeComplete } from "@/lib/claude";
import { buildAttackPlanPrompt } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const fieldKeys = ["resume", "notification", "past_exams", "statement", "transcript"];
    const materialTexts: Record<string, string> = {};

    for (const field of fieldKeys) {
      const values = formData.getAll(field);
      let text = "";

      for (const val of values) {
        if (typeof val === "string" && val.trim()) {
          text = text ? text + "\n" + val.trim() : val.trim();
        }
      }

      // 解析该字段的 PDF 文件
      const fileValues = values.filter((v) => v instanceof File);
      if (fileValues.length > 0) {
        try {
          const parsed = await parseUploadedFiles(
            fileValues.map((f) => ({ field, file: f as File }))
          );
          if (parsed[field]) {
            text = text ? text + "\n" + parsed[field] : parsed[field];
          }
        } catch (e: any) {
          return NextResponse.json({ error: `文件解析失败(${field}): ${e.message}` }, { status: 400 });
        }
      }

      if (text) materialTexts[field] = text;
    }

    if (!materialTexts.resume || materialTexts.resume.trim().length < 20) {
      return NextResponse.json({ error: "简历为必选项，内容不能过短" }, { status: 400 });
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
