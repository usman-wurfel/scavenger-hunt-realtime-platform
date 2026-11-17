/**
 * Docker production mein scheduled hunt start `scavenger_hunt_worker`
 * (scripts/hunt-start-worker.ts) handle karta hai.
 * Is file mein queue/firebase imports nahi hain — Next.js build
 * unko webpack graph mein na laaye.
 */
export async function register() {
  // no-op: hunt scheduling runs in the dedicated worker container
}
