"use client";

import { useLearner } from "@/lib/learner-store";

/** Compatibility hook for the immersive desktop; the learner provider owns auth. */
export function useAuth() {
  const { ready, user, signOut } = useLearner();
  return { ready, user, signOut };
}
