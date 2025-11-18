const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const defaultOutlet = await prisma.outlet.upsert({
    where: { outletCode: 'OUTLET001' },
    update: {
      name: 'Main Street Location',
      address: '123 Main St, City',
      timezone: 'America/New_York',
      closingTime: '23:00',
    },
    create: {
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
    skipDuplicates: true,
  });

  const adminPin = await bcrypt.hash('1111', 10);
  const userPin = await bcrypt.hash('1234', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'testadmin' },
    update: { pinHash: adminPin, role: 'admin', outletId: defaultOutlet.id, name: 'Test Admin' },
    create: { username: 'testadmin', pinHash: adminPin, role: 'admin', outletId: defaultOutlet.id, name: 'Test Admin' },
  });
  const user = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: { pinHash: userPin, role: 'user', outletId: defaultOutlet.id, name: 'Test User' },
    create: { username: 'testuser', pinHash: userPin, role: 'user', outletId: defaultOutlet.id, name: 'Test User' },
  });

  console.log('Seeding completed successfully:', { outletId: defaultOutlet.id, adminId: admin.id, userId: user.id });

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

  // Seed one month of dummy WasteEntry data for CSV export testing
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0);
  const startNextMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1, 0, 0, 0, 0);
  const monthExisting = await prisma.wasteEntry.count({
    where: { recordedAt: { gte: startOfMonth, lt: startNextMonth } },
  });
  if (monthExisting === 0) {
    const items = await prisma.wasteItem.findMany({ select: { id: true, unit: true } });
    const days = Math.round((startNextMonth.getTime() - startOfMonth.getTime()) / 86_400_000);
    const data = [];
    for (let d = 0; d < days; d++) {
      const dayDate = new Date(startOfMonth.getTime() + d * 86_400_000);
      for (const it of items) {
        const qty = Math.floor(Math.random() * 6); // 0..5
        if (qty > 0) {
          data.push({
            outletId: defaultOutlet.id,
            itemId: it.id,
            quantity: qty,
            unit: it.unit,
            recordedAt: dayDate,
          });
        }
      }
    }
    if (data.length > 0) {
      await prisma.wasteEntry.createMany({ data });
      console.log(`Seeded ${data.length} WasteEntry rows for current month`);
    }
  } else {
    console.log('Monthly WasteEntry data already exists, skipping');
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