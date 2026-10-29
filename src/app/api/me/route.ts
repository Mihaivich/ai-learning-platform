import { requireAccount, apiError, HttpError } from "@/lib/supabase/server";

export type AccountPayload = {
  id: string;
  email: string | null;
  emailVerified: boolean;
  role: string;
  isTeacher: boolean;
  onboardingCompleted: boolean;
  intendedWorkspace: "learn" | "teach" | null;
  /** Teach was intended but instructor activation has not succeeded yet. */
  needsInstructorActivation: boolean;
};

async function loadAccount() {
  const { db, user, isTeacher } = await requireAccount();
  const { data: profile, error } = await db
    .from("profiles")
    .select("role, onboarding_completed_at, intended_workspace")
    .eq("id", user.id)
    .single();
  if (error || !profile) throw new HttpError(403, "Your profile is unavailable.");

  const intended =
    profile.intended_workspace === "learn" || profile.intended_workspace === "teach"
      ? profile.intended_workspace
      : null;

  const payload: AccountPayload = {
    id: user.id,
    email: user.email ?? null,
    emailVerified: !!user.email_confirmed_at,
    role: profile.role,
    isTeacher,
    onboardingCompleted: !!profile.onboarding_completed_at,
    intendedWorkspace: intended,
    needsInstructorActivation: intended === "teach" && !isTeacher,
  };
  return payload;
}

export async function GET() {
  try {
    return Response.json(await loadAccount());
  } catch (e) {
    return apiError(e);
  }
}

/**
 * Complete first-time workspace intention.
 * Teach activation must succeed before onboarding is marked complete, so a
 * failed activate_instructor() call cannot leave a half-finished profile.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      intention?: unknown;
      displayName?: unknown;
    } | null;
    const intention = body?.intention;
    if (intention !== "learn" && intention !== "teach") {
      throw new HttpError(400, "Choose whether you are here to learn or to teach.");
    }

    const { db, user } = await requireAccount();
    const displayName =
      typeof body?.displayName === "string" ? body.displayName.trim().slice(0, 40) : "";

    if (displayName) {
      const { error: nameError } = await db
        .from("profiles")
        .update({
          display_name: displayName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (nameError) throw nameError;
    }

    if (intention === "teach") {
      // activate_instructor() sets role, intended_workspace and
      // onboarding_completed_at in one SECURITY DEFINER update on success.
      const { error: activateError } = await db.rpc("activate_instructor");
      if (activateError) {
        const message = activateError.message ?? "";
        if (/confirm your email/i.test(message)) {
          throw new HttpError(403, "Confirm your email before activating Teaching Studio.");
        }
        throw activateError;
      }
      return Response.json(await loadAccount());
    }

    const { error } = await db
      .from("profiles")
      .update({
        intended_workspace: "learn",
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (error) throw error;

    return Response.json(await loadAccount());
  } catch (e) {
    return apiError(e);
  }
}
