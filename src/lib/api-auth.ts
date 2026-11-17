import { apiFail } from "@/lib/api-response";
import { getSession } from "./session";

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    return {
      session: null,
      error: apiFail("Unauthorized", 401),
    };
  }
  return { session, error: null };
}
