import { apiError, HttpError, requireAccount } from "@/lib/supabase/server";

/**
 * Self-service instructor activation for verified accounts.
 * Role changes happen only inside the activate_instructor() SECURITY DEFINER RPC.
 */
export async function POST() {
  try {
    const { db, user } = await requireAccount();
    if (!user.email_confirmed_at) {
      throw new HttpError(403, "Confirm your email before activating Teaching Studio.");
    }

    const { data, error } = await db.rpc("activate_instructor");
    if (error) {
      const message = error.message ?? "";
      if (/confirm your email/i.test(message)) {
        throw new HttpError(403, "Confirm your email before activating Teaching Studio.");
      }
      if (/sign in required/i.test(message)) {
        throw new HttpError(401, "Sign in to continue.");
      }
      throw error;
    }

    const role = typeof data === "string" ? data : "instructor";
    if (role === "admin") {
      return Response.json({ role: "admin", isTeacher: true });
    }
    if (role !== "instructor") {
      throw new HttpError(500, "Instructor activation did not complete.");
    }
    return Response.json({ role: "instructor", isTeacher: true });
  } catch (e) {
    return apiError(e);
  }
}
