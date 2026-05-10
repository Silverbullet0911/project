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
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">保研模拟面试官</h1>
          <p className="mt-2 text-gray-500">AI 驱动的拷问式面试，找出你简历中的每一个薄弱点</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">开始新面试</h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}
          <FileUpload onUpload={handleUpload} uploading={uploading} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">面试历史</h2>
          <SessionList sessions={sessions} />
        </div>
      </div>
    </main>
  );
}
