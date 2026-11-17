import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@gmail.com";
  const password = "admin1";

  const existingAdmin = await prisma.admin.findUnique({ where: { email } });

  if (!existingAdmin) {
    const hashedPassword = await hashPassword(password);
    await prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
        name: "Admin",
      },
    });
    console.log("Admin created successfully!");
    console.log("Email:", email);
    console.log("Password:", password);
  } else {
    console.log("Admin already exists:", email);
  }

  const existingSettings = await prisma.appSettings.findUnique({
    where: { id: "default" },
  });

  if (!existingSettings) {
    await prisma.appSettings.create({
      data: { id: "default" },
    });
    console.log("Default app settings created");
  } else {
    console.log("App settings already exist");
  }

  const defaultAreas = [
    { name: "Oshkosh", slug: "oshkosh", sortOrder: 10 },
    { name: "Local / Hometown", slug: "local-hometown", sortOrder: 20 },
  ];
  for (const area of defaultAreas) {
    await prisma.huntArea.upsert({
      where: { slug: area.slug },
      update: {},
      create: area,
    });
  }
  console.log("Default hunt areas are ready");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
