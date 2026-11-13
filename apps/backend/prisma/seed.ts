import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const categories = [
  ['Grocery', 'grocery', 'basket', 'Daily essentials, produce and household supplies.'],
  ['Fashion', 'fashion', 'shirt', 'Clothing, footwear and accessories.'],
  ['Electronics', 'electronics', 'devices', 'Consumer electronics and accessories.'],
  ['Food', 'food', 'restaurant', 'Restaurants, cafes and local food.'],
  ['Hotels', 'hotels', 'hotel', 'Hotels, resorts and stays.'],
  ['Travel', 'travel', 'car', 'Local transport and travel services.'],
  ['Salon & Spa', 'salon-spa', 'spa', 'Salon, spa and personal care services.'],
  ['Tourism', 'tourism', 'beach', 'Places, tours and local experiences.'],
  ['Events', 'events', 'ticket', 'Local events, activities and tickets.'],
  ['Home services', 'home-services', 'tools', 'Home maintenance and repair services.'],
  ['Healthcare', 'healthcare', 'health', 'Clinics, pharmacies and wellness services.'],
  ['Property', 'property', 'home', 'Residential and commercial property listings.'],
  ['Buy & Sell', 'buy-sell', 'swap', 'Pre-owned goods sold by local community members.'],
] as const;

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development seed data cannot be run in production');
  }

  for (const [name, slug, icon, description] of categories) {
    await prisma.category.upsert({
      where: { slug },
      update: { name, icon, description, isActive: true },
      create: { name, slug, icon, description },
    });
  }
  console.log(`Seeded ${categories.length} development categories.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());