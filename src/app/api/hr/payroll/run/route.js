import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

const TAX_RATE = 0.1; // 10% flat tax deduction

function toMoney(value) {
  return Number.parseFloat(Number(value ?? 0).toFixed(2));
}

function parseMonthYear(valueMonth, valueYear) {
  const month = Number.parseInt(valueMonth, 10);
  const year = Number.parseInt(valueYear, 10);
  if (Number.isNaN(month) || month < 1 || month > 12) return { ok: false, error: 'month must be between 1 and 12' };
  if (Number.isNaN(year) || year < 2000 || year > 2100) return { ok: false, error: 'year must be between 2000 and 2100' };
  return { ok: true, month, year };
}

async function ensureJournalAccount(tx, { code, name, type }) {
  const existing = await tx.chartOfAccount.findUnique({ where: { code } });
  if (existing) {
    if (existing.type !== type) {
      throw new Error(`Account ${code} has type ${existing.type}, expected ${type}`);
    }
    return existing;
  }
  return tx.chartOfAccount.create({ data: { code, name, type } });
}

export const POST = requireAuth(async (request, context, user) => {
  const body = await request.json();
  const { month, year } = body;
  const postToJournal = body.postToJournal !== false;

  if (month === undefined || year === undefined) {
    return NextResponse.json({ error: 'month and year are required' }, { status: 400 });
  }

  const parsedPeriod = parseMonthYear(month, year);
  if (!parsedPeriod.ok) {
    return NextResponse.json({ error: parsedPeriod.error }, { status: 400 });
  }
  const periodMonth = parsedPeriod.month;
  const periodYear = parsedPeriod.year;

  const employees = await prisma.employee.findMany({
    where: { status: 'Active' },
    select: { id: true, salary: true },
  });

  const payrolls = await prisma.$transaction(
    employees.map((emp) => {
      const baseSalary = Number(emp.salary);
      const deductions = toMoney(baseSalary * TAX_RATE);
      const netPay = toMoney(baseSalary - deductions);

      return prisma.payroll.upsert({
        where: { employeeId_month_year: { employeeId: emp.id, month: periodMonth, year: periodYear } },
        update: { baseSalary, deductions, netPay },
        create: { employeeId: emp.id, month: periodMonth, year: periodYear, baseSalary, deductions, netPay },
      });
    })
  );

  const totals = payrolls.reduce(
    (acc, item) => {
      acc.baseSalary = toMoney(acc.baseSalary + Number(item.baseSalary));
      acc.deductions = toMoney(acc.deductions + Number(item.deductions));
      acc.netPay = toMoney(acc.netPay + Number(item.netPay));
      return acc;
    },
    { baseSalary: 0, deductions: 0, netPay: 0 }
  );

  let journal = null;
  if (postToJournal && payrolls.length > 0 && totals.baseSalary > 0) {
    const monthLabel = String(periodMonth).padStart(2, '0');
    const reference = `PAYROLL-${periodYear}-${monthLabel}`;
    const periodDate = new Date(`${periodYear}-${monthLabel}-28`);

    journal = await prisma.$transaction(async (tx) => {
      const payrollExpenseAccount = await ensureJournalAccount(tx, {
        code: '5000',
        name: 'Payroll Expense',
        type: 'Expense',
      });
      const payrollDeductionsAccount = await ensureJournalAccount(tx, {
        code: '2105',
        name: 'Payroll Deductions Payable',
        type: 'Liability',
      });
      const cashAccount = await ensureJournalAccount(tx, {
        code: '1000',
        name: 'Cash and Bank',
        type: 'Asset',
      });

      const lines = [
        { accountId: payrollExpenseAccount.id, debit: totals.baseSalary, credit: 0 },
        { accountId: cashAccount.id, debit: 0, credit: totals.netPay },
      ];

      if (totals.deductions > 0) {
        lines.push({ accountId: payrollDeductionsAccount.id, debit: 0, credit: totals.deductions });
      }

      const existing = await tx.journalEntry.findFirst({
        where: { reference },
        select: { id: true },
      });

      if (existing) {
        await tx.journalLine.deleteMany({ where: { journalId: existing.id } });
        return tx.journalEntry.update({
          where: { id: existing.id },
          data: {
            date: periodDate,
            description: `Payroll posting for ${periodYear}-${monthLabel}`,
            createdBy: user.id,
            lines: {
              create: lines,
            },
          },
          include: {
            lines: {
              include: { account: { select: { id: true, code: true, name: true, type: true } } },
              orderBy: { id: 'asc' },
            },
          },
        });
      }

      return tx.journalEntry.create({
        data: {
          date: periodDate,
          reference,
          description: `Payroll posting for ${periodYear}-${monthLabel}`,
          createdBy: user.id,
          lines: {
            create: lines,
          },
        },
        include: {
          lines: {
            include: { account: { select: { id: true, code: true, name: true, type: true } } },
            orderBy: { id: 'asc' },
          },
        },
      });
    });
  }

  return NextResponse.json({
    message: 'Payroll run complete',
    records: payrolls.length,
    totals,
    journalPosted: Boolean(journal),
    journalId: journal?.id ?? null,
  });
}, 'super_admin', 'hr_manager');
