"use client";

let userId = "";

export function getUserId(): string {
  if (userId) return userId;
  if (typeof window !== "undefined") {
    userId = localStorage.getItem("interview_user_id") || "";
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem("interview_user_id", userId);
    }
  }
  return userId || "default";
}
