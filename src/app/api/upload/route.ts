export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import { toAbsoluteUrl } from "@/lib/app-url";
import { saveUploadedFile } from "@/lib/upload";

export async function POST(request: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file || !type) {
      return apiFail("File and type are required", 400);
    }

    if (!["logo", "favicon", "applicationLogo", "profilePhoto"].includes(type)) {
      return apiFail("Invalid upload type", 400);
    }

    const url = await saveUploadedFile(
      file,
      type as "logo" | "favicon" | "applicationLogo" | "profilePhoto"
    );

    return apiOk({ url: toAbsoluteUrl(url) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return apiFail(message, 400);
  }
}
