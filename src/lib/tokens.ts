import { randomBytes } from "crypto";

export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

export function getResetTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1);
  return expiry;
}
