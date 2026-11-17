/** Admin panel fetch — cookies bhejta hai; 401 par sign-in redirect. */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, {
    credentials: "same-origin",
    ...init,
  });

  if (
    res.status === 401 &&
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/auth/")
  ) {
    const next = encodeURIComponent(
      `${window.location.pathname}${window.location.search}`,
    );
    window.location.href = `/auth/sign-in?next=${next}`;
  }

  return res;
}
