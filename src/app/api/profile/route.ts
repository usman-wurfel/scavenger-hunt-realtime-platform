export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import { createToken, COOKIE_NAME, getAuthCookieOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withAbsoluteProfilePhoto } from "@/lib/serialize-urls";
import { saveUploadedFile } from "@/lib/upload";

async function parseProfileUpdateBody(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const name = formData.get("name")?.toString();
    const photo = formData.get("profilePhoto");

    let profilePhoto: string | null | undefined;

    if (photo instanceof File && photo.size > 0) {
      profilePhoto = await saveUploadedFile(photo, "profilePhoto");
    } else if (typeof photo === "string" && photo.trim()) {
      profilePhoto = photo.trim();
    }

    return { name, profilePhoto };
  }

  const body = await request.json();
  return {
    name: body.name as string | undefined,
    profilePhoto: body.profilePhoto as string | null | undefined,
  };
}

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const admin = await prisma.admin.findUnique({
    where: { id: session!.adminId },
    select: { id: true, name: true, email: true, profilePhoto: true, createdAt: true, updatedAt: true },
  });

  if (!admin) {
    return apiFail("Admin not found", 404);
  }

  return apiOk({ admin: withAbsoluteProfilePhoto(admin) });
}

export async function PUT(request: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  try {
    const { name, profilePhoto } = await parseProfileUpdateBody(request);

    if (!name?.trim()) {
      return apiFail("Name is required", 400);
    }

    const admin = await prisma.admin.update({
      where: { id: session!.adminId },
      data: {
        name: name.trim(),
        ...(profilePhoto !== undefined ? { profilePhoto: profilePhoto || null } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        profilePhoto: true,
        tokenVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const token = await createToken({
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
      tokenVersion: admin.tokenVersion,
    });

    const response = apiOk({ token, admin: withAbsoluteProfilePhoto(admin) });

    response.cookies.set(COOKIE_NAME, token, getAuthCookieOptions());

    return response;
  } catch {
    return apiFail("Failed to update profile", 500);
  }
}
