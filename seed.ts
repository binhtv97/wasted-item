import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create a test user with username + PIN
  const testUser = await prisma.user.create({
    data: {
      email: "test@example.com",
      username: "testuser",
      pinHash: await bcrypt.hash("1234", 10),
      name: "Test User",
    },
  });

  console.log("Created test user:", testUser);

  console.log("Seeding completed for user:", testUser.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
