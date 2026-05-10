import type { AttackPlan } from "@/types";
import { getPastWeaknessCoverage } from "./db";

export function buildAttackPlanPrompt(materialTexts: Record<string, string>): string {
  const sections: string[] = [];

  if (materialTexts.resume) {
    sections.push(`## 学生简历\n${materialTexts.resume}`);
  }
  if (materialTexts.notification) {
    sections.push(`## 面试通知\n${materialTexts.notification}`);
  }
  if (materialTexts.past_exams) {
    sections.push(`## 往年真题\n${materialTexts.past_exams}`);
  }
  if (materialTexts.statement) {
    sections.push(`## 个人陈述\n${materialTexts.statement}`);
  }
  if (materialTexts.transcript) {
    sections.push(`## 成绩单\n${materialTexts.transcript}`);
  }

  return `你是一位经验丰富的保研复试面试教授。请根据以下学生材料生成面试攻击计划。

${sections.join("\n\n")}

请返回 JSON 格式（不要包含其他文字）：
{
  "attack_points": [
    {
      "id": 1,
      "severity": "critical|major|minor",
      "source": "resume|transcript|statement|notification",
      "weakness": "薄弱点具体描述",
      "strategy": "追问策略，包括具体追问角度和追问链",
      "covered": false
    }
  ],
  "required_topics": [
    {
      "description": "面试通知中要求的必考话题",
      "category": "分类标签"
    }
  ],
  "school_style": "从往年真题中总结的该院校提问风格（一句话描述）"
}

要求：
- attack_points 按 severity 从高到低排列，最多8个
- 每个攻击点必须有具体的 strategy，不能写"根据回答调整"
- 关注：简历中模糊的描述、成绩单异常点、个人陈述与简历的矛盾、面试通知中的必考项
- required_topics 从面试通知中提取，不凭空添加`;
}

export async function buildInterviewSystemPrompt(
  attackPlan: AttackPlan,
  materialTexts: Record<string, string>
): Promise<string> {
  const pastWeaknesses = await getPastWeaknessCoverage();
  const pastSection = pastWeaknesses.length > 0
    ? `\n## 用户此前面试中已充分训练过的薄弱点（避免重复追问）\n${pastWeaknesses.map((w) => `- ${w}`).join("\n")}`
    : "";

  const topics = attackPlan.required_topics.map((t) => `- [${t.category}] ${t.description}`).join("\n");
  const points = attackPlan.attack_points.map(
    (p) => `- [${p.severity}] ${p.weakness}（来源：${p.source}）→ 策略：${p.strategy} | ${p.covered ? "已覆盖" : "未覆盖"}`
  ).join("\n");

  return `你是一位保研复试面试教授，正在对一名学生进行模拟面试。

## 面试通知要求
${topics || "无特定通知要求，按标准保研面试流程进行"}

## 往年真题中学习的风格
${attackPlan.school_style || "标准学术严谨风格"}

## 攻击路线图（内部使用，绝不透露给学生）
${points}
${pastSection}

## 面试流程
1. 请学生先做自我介绍。介绍完毕后立即追问其中暴露的模糊点、夸大表述。
2. 按攻击路线图逐一追问，从 severity=critical 开始。每个话题追问3-5轮后自然过渡。

## 行为规则
- 使用中文进行面试
- 主动推进节奏，制造适度的压迫感
- 不要一次问多个问题，每次只问一个
- 当学生表示想跳过当前话题时（"问点别的吧""这段经历差不多了""下一个话题"），立刻结束当前话题，自然过渡到下一个
- 当前话题追问3-5轮且学生回答充分后，自然过渡
- 当所有攻击点都覆盖完毕，告诉学生面试可以结束了
- 绝对不要告诉学生你在按照攻击列表提问
- 如果学生回答中出现新的模糊点，现场追问，不限于预设攻击点`;
}

export function buildDebriefPrompt(
  attackPlan: AttackPlan,
  messages: { role: string; content: string }[]
): string {
  const conversationText = messages
    .map((m) => `[${m.role === "assistant" ? "面试官" : "学生"}] ${m.content}`)
    .join("\n");

  return `你是一位保研复试面试教授，请根据以下面试对话生成结构化复盘报告。

## 攻击路线图（面试前制定）
${JSON.stringify(attackPlan.attack_points, null, 2)}

## 面试对话记录
${conversationText}

请返回 JSON 格式（不要包含其他文字）：
{
  "attack_roadmap": [...],
  "point_scores": [
    {
      "attack_point_id": 1,
      "weakness": "薄弱点描述",
      "score": 3,
      "user_performance": "学生在此攻击点下的实际表现分析（2-3句话，指出哪里答得好、哪里回避了）",
      "improvement": ["具体可执行的改进建议1", "建议2"]
    }
  ],
  "overall_assessment": "整体评价，80-120字，客观指出强项和短板",
  "topic_coverage": ["已覆盖的话题名"],
  "skipped_topics": ["用户跳过的话题名"],
  "generated_at": "${new Date().toISOString()}"
}

要求：
- score 为1-5分（1=完全无法回答, 2=回避核心问题, 3=勉强及格, 4=回答较好有小缺陷, 5=回答出色）
- user_performance 必须引用对话中的具体内容作为证据
- improvement 每条建议都必须是可执行的，不能写"多加练习"这类空话
- 用户跳过的攻击点不在 point_scores 中评分，但应在 skipped_topics 中列出`;
}
