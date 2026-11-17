import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const ALLOWED_TYPES: Record<string, string[]> = {
  logo: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"],
  favicon: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/x-icon", "image/vnd.microsoft.icon", "image/svg+xml"],
  applicationLogo: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"],
  profilePhoto: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"],
};

export async function saveUploadedFile(
  file: File,
  type: keyof typeof ALLOWED_TYPES
): Promise<string> {
  if (!ALLOWED_TYPES[type]) {
    throw new Error("Invalid upload type");
  }

  if (!ALLOWED_TYPES[type].includes(file.type)) {
    throw new Error("Invalid file type. Please upload an image file.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size must be less than 2MB");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = path.extname(file.name) || ".png";
  const safeName = `${type}-${Date.now()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", type);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, safeName), buffer);

  return `/uploads/${type}/${safeName}`;
}
