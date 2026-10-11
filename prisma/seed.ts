import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DEFAULT_CATEGORIES = [
  { name: 'Electrical', description: 'Power supply, wiring, switches, sockets, and lighting fixtures', icon: 'Zap' },
  { name: 'Plumbing', description: 'Water supply, pipe leaks, drainage, washrooms, and taps', icon: 'Droplets' },
  { name: 'AC & Cooling', description: 'Air conditioners, ventilation ducts, and cooling units', icon: 'Wind' },
  { name: 'Wi-Fi / Network', description: 'Campus Wi-Fi connectivity, LAN ports, and network equipment', icon: 'Wifi' },
  { name: 'Furniture', description: 'Desks, benches, chairs, whiteboards, and classroom furniture', icon: 'Armchair' },
  { name: 'Cleanliness', description: 'Sanitation, trash collection, corridor cleaning, and hygiene', icon: 'Sparkles' },
  { name: 'Laboratory', description: 'Lab computers, instruments, chemical storage, and safety hoods', icon: 'FlaskConical' },
  { name: 'Safety', description: 'Fire extinguishers, emergency exits, handrails, and lighting', icon: 'ShieldAlert' },
  { name: 'Infrastructure', description: 'Civil repairs, doors, windows, paint, and pathways', icon: 'Building' },
  { name: 'Other', description: 'General campus maintenance and miscellaneous requests', icon: 'HelpCircle' },
];

export const DEFAULT_SERVICES = [
  { name: 'Classroom & Bench Repair', category: 'Furniture', description: 'Fixing loose benches, broken desks, and lecture hall seating', slaHours: 48 },
  { name: 'Electrical Wiring & Power Outlets', category: 'Electrical', description: 'Repairing short circuits, sparking outlets, and broken switches', slaHours: 24 },
  { name: 'Air Conditioning Maintenance', category: 'AC & Cooling', description: 'HVAC repair, cooling coil cleaning, and thermostat fixes', slaHours: 48 },
  { name: 'Washroom & Pipeline Plumbing', category: 'Plumbing', description: 'Fixing leaking faucets, blocked drains, and low water pressure', slaHours: 24 },
  { name: 'Campus Wi-Fi & LAN Diagnostics', category: 'Wi-Fi / Network', description: 'Restoring router coverage, resolving captive portal drops, and repairing LAN sockets', slaHours: 24 },
  { name: 'Janitorial & Floor Sanitation', category: 'Cleanliness', description: 'Disinfection, floor spill cleanup, and waste bin servicing', slaHours: 12 },
  { name: 'Lab Hardware & Equipment Care', category: 'Laboratory', description: 'Servicing laboratory power strips, oscilloscopes, and bench equipment', slaHours: 48 },
  { name: 'Door, Window & Lock Repair', category: 'Infrastructure', description: 'Repairing broken door hinges, glass panes, and latch locks', slaHours: 48 },
  { name: 'Emergency Safety & Lighting', category: 'Safety', description: 'Inspection and repair of pathway lighting and emergency alarms', slaHours: 12 },
];

export async function seedCampusServices(dbClient: PrismaClient = prisma) {
  console.log('[CampusFix Seed] Initializing campus categories and services...');

  const categoryMap = new Map<string, string>();

  for (const cat of DEFAULT_CATEGORIES) {
    const record = await dbClient.category.upsert({
      where: { name: cat.name },
      update: { description: cat.description, icon: cat.icon, isActive: true },
      create: { name: cat.name, description: cat.description, icon: cat.icon, isActive: true },
    });
    categoryMap.set(record.name, record.id);
  }

  for (const svc of DEFAULT_SERVICES) {
    const categoryId = categoryMap.get(svc.category) || null;
    await dbClient.service.upsert({
      where: { name: svc.name },
      update: {
        description: svc.description,
        categoryId,
        slaHours: svc.slaHours,
        isActive: true,
      },
      create: {
        name: svc.name,
        description: svc.description,
        categoryId,
        slaHours: svc.slaHours,
        isActive: true,
      },
    });
  }

  console.log(`[CampusFix Seed] Successfully seeded ${DEFAULT_CATEGORIES.length} categories and ${DEFAULT_SERVICES.length} campus services.`);
  return { categoriesCount: DEFAULT_CATEGORIES.length, servicesCount: DEFAULT_SERVICES.length };
}

if (process.argv[1]?.includes('seed')) {
  seedCampusServices()
    .catch((e) => {
      console.error('[CampusFix Seed] Error seeding data:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
