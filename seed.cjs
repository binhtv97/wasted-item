const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const defaultOutlet = await prisma.outlet.create({
    data: {
      outletCode: 'OUTLET001',
      name: 'Main Street Location',
      address: '123 Main St, City',
      timezone: 'America/New_York',
      closingTime: '23:00',
    },
  });

  await prisma.wasteItem.createMany({
    data: [
      { itemCode: 'BREAD', label: 'Bread Rolls', unit: 'pieces', icon: '🍞', color: '#D2691E', displayOrder: 1 },
      { itemCode: 'MEAT', label: 'Meat Patties', unit: 'pieces', icon: '🥩', color: '#8B4513', displayOrder: 2 },
      { itemCode: 'VEGETABLES', label: 'Fresh Vegetables', unit: 'kg', icon: '🥬', color: '#228B22', displayOrder: 3 },
      { itemCode: 'FRIES', label: 'French Fries', unit: 'kg', icon: '🍟', color: '#FFD700', displayOrder: 4 },
      { itemCode: 'BEVERAGES', label: 'Beverages', unit: 'liters', icon: '🥤', color: '#4169E1', displayOrder: 5 },
      { itemCode: 'PACKAGING', label: 'Packaging Materials', unit: 'pieces', icon: '📦', color: '#696969', displayOrder: 6 },
    ],
  });

  await prisma.wasteReason.createMany({
    data: [
      { reasonCode: 'EXPIRED', description: 'Product expired', displayOrder: 1 },
      { reasonCode: 'DAMAGED', description: 'Product damaged', displayOrder: 2 },
      { reasonCode: 'OVERPRODUCTION', description: 'Overproduction', displayOrder: 3 },
      { reasonCode: 'TEMPERATURE', description: 'Temperature control issue', displayOrder: 4 },
      { reasonCode: 'QUALITY', description: 'Quality issue', displayOrder: 5 },
      { reasonCode: 'OTHER', description: 'Other reason', displayOrder: 6 },
    ],
  });

  const pinHash = await bcrypt.hash('1234', 10);
  const testUser = await prisma.user.create({
    data: {
      email: 'test@example.com',
      username: 'testuser',
      pinHash,
      name: 'Test User',
      outletId: defaultOutlet.id,
      role: 'manager',
    },
  });

  console.log('Seeding completed successfully:', { outletId: defaultOutlet.id, userId: testUser.id });

  const existingSetting = await prisma.reportSetting.findFirst();
  if (!existingSetting) {
    await prisma.reportSetting.create({
      data: { timezone: 'UTC', utcOffsetMinutes: 0, cutOffHour: 6 },
    });
  }

  const existingRecipients = await prisma.reportRecipient.count();
  if (existingRecipients === 0) {
    await prisma.reportRecipient.createMany({
      data: [
        { email: 'manager@test.com', reportType: 'DAILY', sendTimeMin: 8 * 60, isActive: true },
        { email: 'ops@test.com', reportType: 'WEEKLY', sendTimeMin: 9 * 60, isActive: true },
        { email: 'owner@test.com', reportType: 'MONTHLY', sendTimeMin: 10 * 60, isActive: true },
      ],
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });