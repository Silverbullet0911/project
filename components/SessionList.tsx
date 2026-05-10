"use client";

"use client";

import { useState } from "react";
import Link from "next/link";
import type { SessionListItem } from "@/types";

const MATERIAL_LABELS: Record<string, string> = {
  resume: "简历",
  notification: "通知",
  past_exams: "真题",
  statement: "个人陈述",
  transcript: "成绩单",
};

interface Props {
  sessions: SessionListItem[];
  onDelete: (id: number) => Promise<void>;
}

export default function SessionList({ sessions, onDelete }: Props) {
  const [deleting, setDeleting] = useState<number | null>(null);

  if (sessions.length === 0) {
    return (
      <p className="text-center text-text-muted py-12">暂无面试记录</p>
    );
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("确定要删除这条面试记录吗？")) return;
    setDeleting(id);
    try {
      await onDelete(id);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <Link
          key={session.id}
          href={session.status === "completed" ? `/sessions/${session.id}` : `/interview/${session.id}`}
          className="block border border-border bg-surface rounded-xl p-4 hover:border-accent hover:shadow-sm transition-all duration-150 group relative"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary">面试 #{session.id}</p>
              <p className="text-xs text-text-muted mt-1">
                {new Date(session.created_at).toLocaleString("zh-CN")}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                上传：{session.materials_uploaded.map((m) => MATERIAL_LABELS[m] || m).join("、")}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className={`text-xs px-2 py-1 rounded-full ${
                session.status === "completed" ? "bg-success-light text-success" :
                session.status === "active" ? "bg-accent-light text-accent" :
                "bg-muted text-text-secondary"
              }`}>
                {session.status === "completed" ? "已完成" :
                 session.status === "active" ? "进行中" : "准备中"}
              </span>
              <button
                onClick={(e) => handleDelete(e, session.id)}
                disabled={deleting === session.id}
                className="text-text-muted hover:text-destructive opacity-0 group-hover:opacity-100 transition-all duration-150 p-1"
                title="删除"
              >
                {deleting === session.id ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
