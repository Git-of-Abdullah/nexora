const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const USERS = [
  { name: 'Nexora Admin',          email: 'admin@nexora.com',            password: 'Admin@123',   role: 'super_admin' },
  { name: 'HR Manager',            email: 'hr.manager@nexora.com',       password: 'HRManager@123', role: 'hr_manager' },
  { name: 'HR Staff',              email: 'hr.staff@nexora.com',         password: 'HRStaff@123', role: 'hr_staff' },
  { name: 'Manufacturing Manager', email: 'mfg.manager@nexora.com',      password: 'MfgManager@123', role: 'manufacturing_manager' },
  { name: 'Manufacturing Staff',   email: 'mfg.staff@nexora.com',        password: 'MfgStaff@123', role: 'manufacturing_staff' },
  { name: 'Accountant',            email: 'accountant@nexora.com',       password: 'Accountant@123', role: 'accountant' },
  { name: 'Marketing Manager',     email: 'mkt.manager@nexora.com',      password: 'MktManager@123', role: 'marketing_manager' },
  { name: 'Marketing Staff',       email: 'mkt.staff@nexora.com',        password: 'MktStaff@123', role: 'marketing_staff' },
  { name: 'General Employee',      email: 'employee@nexora.com',         password: 'Employee@123', role: 'general_employee' },
];

async function main() {
  console.log('\n🔐 Creating / updating users...\n');

  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    const user = await prisma.user.upsert({
      where:  { email: u.email },
      update: { name: u.name, role: u.role, passwordHash, isActive: true },
      create: { name: u.name, email: u.email, role: u.role, passwordHash, isActive: true },
    });
    console.log(`  ✓  [${u.role.padEnd(22)}]  ${u.email.padEnd(35)}  pw: ${u.password}`);
  }

  console.log('\n✅ All users seeded successfully!\n');
}

main()
  .catch(e => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
