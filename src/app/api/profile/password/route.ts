export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  try {
    const { currentPassword, newPassword, confirmPassword } = await request.json();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return apiFail("All password fields are required", 400);
    }

    if (newPassword !== confirmPassword) {
      return apiFail("New passwords do not match", 400);
    }

    if (newPassword.length < 6) {
      return apiFail("New password must be at least 6 characters", 400);
    }

    const admin = await prisma.admin.findUnique({
      where: { id: session!.adminId },
    });

    if (!admin) {
      return apiFail("Admin not found", 404);
    }

    const isValid = await verifyPassword(currentPassword, admin.password);
    if (!isValid) {
      return apiFail("Current password is incorrect", 400);
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashedPassword },
    });

    return apiOk({ message: "Password updated successfully" });
  } catch {
    return apiFail("Failed to update password", 500);
  }
}
