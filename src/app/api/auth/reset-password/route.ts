export { dynamic } from "@/lib/api-route";

import { apiFail, apiOk } from "@/lib/api-response";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { token, password, confirmPassword } = await request.json();

    if (!token || !password || !confirmPassword) {
      return apiFail("All fields are required", 400);
    }

    if (password !== confirmPassword) {
      return apiFail("Passwords do not match", 400);
    }

    if (password.length < 6) {
      return apiFail("Password must be at least 6 characters", 400);
    }

    const admin = await prisma.admin.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!admin) {
      return apiFail("Invalid or expired reset link", 400);
    }

    const hashedPassword = await hashPassword(password);

    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return apiOk({ message: "Password updated successfully" });
  } catch {
    return apiFail("Server error. Please try again.", 500);
  }
}
