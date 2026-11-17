export { dynamic } from "@/lib/api-route";

import { apiFail, apiOk } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { generateResetToken, getResetTokenExpiry } from "@/lib/tokens";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return apiFail("Email is required", 400);
    }

    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!admin) {
      return apiOk({
        message: "If the email is registered, a reset link has been sent",
      });
    }

    const resetToken = generateResetToken();
    const resetTokenExpiry = getResetTokenExpiry();

    await prisma.admin.update({
      where: { id: admin.id },
      data: { resetToken, resetTokenExpiry },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

    if (process.env.NODE_ENV === "development") {
      return apiOk({
        message: "Reset link generated successfully",
        resetUrl,
      });
    }

    return apiOk({
      message: "If the email is registered, a reset link has been sent",
    });
  } catch {
    return apiFail("Server error. Please try again.", 500);
  }
}
