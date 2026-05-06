import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

const TAX_RATE = 0.1; // 10% flat tax deduction

export const POST = requireAuth(async (request) => {
  const body = await request.json();
  const { month, year } = body;

  if (!month || !year) {
    return NextResponse.json({ error: 'month and year are required' }, { status: 400 });
  }

  const employees = await prisma.employee.findMany({
    where: { status: 'Active' },
    include: {
      attendance: {
        where: { date: { gte: new Date(`${year}-${String(month).padStart(2, '0')}-01`) } },
      },
    },
  });

  const payrolls = await prisma.$transaction(
    employees.map((emp) => {
      const baseSalary = Number(emp.salary);
      const deductions = parseFloat((baseSalary * TAX_RATE).toFixed(2));
      const netPay = parseFloat((baseSalary - deductions).toFixed(2));

      return prisma.payroll.upsert({
        where: { employeeId_month_year: { employeeId: emp.id, month: parseInt(month), year: parseInt(year) } },
        update: { baseSalary, deductions, netPay },
        create: { employeeId: emp.id, month: parseInt(month), year: parseInt(year), baseSalary, deductions, netPay },
      });
    })
  );

  return NextResponse.json({ message: `Payroll run complete`, records: payrolls.length });
}, 'super_admin', 'hr_manager');
