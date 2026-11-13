import { NextResponse } from "next/server";
import { classQuotaSchema, updateClassQuotas } from "@/lib/classes";
import { apiError, HttpError, requireAccount } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ classId: string }> },
) {
  try {
    const { classId } = await params;
    const { db, user } = await requireAccount(true);
    const body = await request.json().catch(() => null);
    const parsed = classQuotaSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid quota limits.");
    }
    const quotas = await updateClassQuotas(db, user.id, classId, parsed.data);
    return NextResponse.json({ ok: true, quotas });
  } catch (error) {
    return apiError(error);
  }
}
