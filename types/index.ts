// 面试状态
export type SessionStatus = "preparing" | "active" | "completed";

// 消息角色
export type MessageRole = "user" | "assistant";

// 攻击点严重程度
export type Severity = "critical" | "major" | "minor";

// AI 攻击计划中的单个攻击点
export interface AttackPoint {
  id: number;
  severity: Severity;
  source: string;
  weakness: string;
  strategy: string;
  covered: boolean;
}

// 面试通知中提取的必考话题
export interface RequiredTopic {
  description: string;
  category: string;
}

// 攻击计划
export interface AttackPlan {
  attack_points: AttackPoint[];
  required_topics: RequiredTopic[];
  school_style: string;
}

// 复盘报告中的逐点评分
export interface PointScore {
  attack_point_id: number;
  weakness: string;
  score: number;
  user_performance: string;
  improvement: string[];
}

// 整体复盘报告
export interface DebriefReport {
  attack_roadmap: AttackPoint[];
  point_scores: PointScore[];
  overall_assessment: string;
  topic_coverage: string[];
  skipped_topics: string[];
  generated_at: string;
}

// 数据库中的会话记录
export interface Session {
  id: number;
  status: SessionStatus;
  created_at: string;
  material_texts: string;
  attack_plan: string | null;
  debrief_report: string | null;
}

// 数据库中的消息记录
export interface Message {
  id: number;
  session_id: number;
  role: MessageRole;
  content: string;
  topic: string | null;
  created_at: string;
}

// API 响应：会话列表项
export interface SessionListItem {
  id: number;
  status: SessionStatus;
  created_at: string;
  materials_uploaded: string[];
}
