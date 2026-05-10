import { NextResponse } from "next/server";
import { listSessions } from "@/lib/db";
import type { SessionListItem } from "@/types";

export async function GET() {
  const sessions = await listSessions();
  const items: SessionListItem[] = sessions.map((s) => {
    const materials = JSON.parse(s.material_texts || "{}");
    return {
      id: s.id,
      status: s.status as SessionListItem["status"],
      created_at: s.created_at,
      materials_uploaded: Object.keys(materials).filter((k) => materials[k]),
    };
  });

  return NextResponse.json(items);
}
