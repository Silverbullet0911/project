"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import FileUpload from "@/components/FileUpload";
import SessionList from "@/components/SessionList";
import type { SessionListItem } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<SessionListItem[]>([]);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then(setSessions)
      .catch(() => {});
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("删除失败");
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleUpload = useCallback(async (texts: Record<string, string>, files: Record<string, File>) => {
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      for (const [key, text] of Object.entries(texts)) {
        formData.append(key, text);
      }
      for (const [key, file] of Object.entries(files)) {
        formData.append(key, file);
      }

      const res = await fetch("/api/sessions", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "创建会话失败");

      router.push(`/interview/${data.sessionId}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-text-primary">保研模拟面试官</h1>
          <p className="mt-2 text-text-muted">AI 驱动的拷问式面试，找出你简历中的每一个薄弱点</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-text-primary">开始新面试</h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive-light text-destructive text-sm">{error}</div>
          )}
          <FileUpload onUpload={handleUpload} uploading={uploading} />
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-border p-6">
          <h2 className="text-lg font-semibold mb-4 text-text-primary">面试历史</h2>
          <SessionList sessions={sessions} onDelete={handleDelete} />
        </div>
      </div>
    </main>
  );
}
