import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "保研模拟面试官",
  description: "AI 驱动的保研复试模拟面试",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
