import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const email = 'test@banderoli.dev';
const passwordHash = await bcrypt.hash('banderoli123', 10);
const user = await prisma.user.upsert({
  where: { email },
  update: { passwordHash },
  create: { email, name: 'Алия М.', passwordHash },
});

let recipient = await prisma.recipientProfile.findFirst({ where: { userId: user.id } });
if (!recipient) {
  recipient = await prisma.recipientProfile.create({
    data: { userId: user.id, name: 'Алия М.', isDefault: true },
  });
}

await prisma.parcel.deleteMany({ where: { recipientProfileId: recipient.id } });
await prisma.parcel.createMany({
  data: [
    {
      recipientProfileId: recipient.id,
      trackingNumber: '9400111899223',
      carrier: 'USPS',
      description: 'Nike Air Max 270 · ASOS',
      declaredValueUsd: 44,
      declaredValueGel: 119,
      weightKg: 1.2,
      quantity: 1,
      status: 'IN_CUSTOMS',
      estimatedArrival: new Date('2026-06-23'),
    },
    {
      recipientProfileId: recipient.id,
      trackingNumber: '7749003311',
      carrier: 'FedEx',
      description: 'Косметика Fenty Beauty · Sephora',
      declaredValueUsd: 33,
      declaredValueGel: 88,
      weightKg: 0.6,
      quantity: 1,
      status: 'IN_TRANSIT',
      estimatedArrival: new Date('2026-06-23'),
    },
    {
      recipientProfileId: recipient.id,
      trackingNumber: '1234556677',
      carrier: 'DHL',
      description: 'Книги × 3 · Book Depository',
      declaredValueUsd: 34,
      declaredValueGel: 92,
      weightKg: 1.4,
      quantity: 3,
      status: 'IN_TRANSIT',
      estimatedArrival: new Date('2026-06-26'),
    },
  ],
});

console.log('seeded user', user.id, 'recipient', recipient.id);
await prisma.$disconnect();
