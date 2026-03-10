import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create a sample device
  const device = await prisma.device.upsert({
    where: { id: "device-sample-01" },
    update: {},
    create: {
      id: "device-sample-01",
      name: "My Laptop",
      hostname: "localhost",
      status: "OFFLINE",
    },
  });

  // Create a sample project
  const project = await prisma.project.upsert({
    where: {
      deviceId_path: {
        deviceId: device.id,
        path: "/home/user/my-project",
      },
    },
    update: {},
    create: {
      name: "My Project",
      path: "/home/user/my-project",
      description: "A sample project",
      deviceId: device.id,
    },
  });

  // Create sample tasks
  await prisma.task.createMany({
    skipDuplicates: true,
    data: [
      {
        projectId: project.id,
        title: "Refactor authentication module",
        description:
          "Refactor the JWT authentication to use the new middleware pattern. Extract token validation into a separate utility.",
        status: "DONE",
        position: 0,
      },
      {
        projectId: project.id,
        title: "Add unit tests for API endpoints",
        description:
          "Write comprehensive unit tests for all REST API endpoints. Include edge cases and error scenarios.",
        status: "PENDING",
        position: 1,
      },
      {
        projectId: project.id,
        title: "Optimize database queries",
        description:
          "Profile and optimize slow database queries. Add indexes where needed.",
        status: "PENDING",
        position: 2,
      },
    ],
  });

  console.log("Seed complete.");
  console.log(`  Device: ${device.name} (${device.id})`);
  console.log(`  Project: ${project.name} (${project.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
