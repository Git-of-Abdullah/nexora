import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

const SUPPORTED_REPORT_TYPES = new Set(['pl', 'balance-sheet', 'trial-balance', 'cash-flow']);

function toMoney(value) {
  return Number.parseFloat(Number(value ?? 0).toFixed(2));
}

function parseDateParam(rawValue, fieldName, endOfDay = false) {
  if (!rawValue) return { ok: true, value: null };
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: `Invalid ${fieldName} date` };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    if (endOfDay) {
      parsed.setUTCHours(23, 59, 59, 999);
    } else {
      parsed.setUTCHours(0, 0, 0, 0);
    }
  }
  return { ok: true, value: parsed };
}

function isCashLikeAccount(account) {
  if (!account || account.type !== 'Asset') return false;
  const haystack = `${account.code} ${account.name}`.toLowerCase();
  return haystack.includes('cash') || haystack.includes('bank');
}

function buildDateFilter(fromDate, toDate) {
  if (!fromDate && !toDate) return undefined;
  return {
    ...(fromDate ? { gte: fromDate } : {}),
    ...(toDate ? { lte: toDate } : {}),
  };
}

function aggregateByAccount(journalLines) {
  const map = new Map();

  for (const line of journalLines) {
    const key = line.accountId;
    const debit = toMoney(line.debit);
    const credit = toMoney(line.credit);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        accountId: line.accountId,
        code: line.account.code,
        name: line.account.name,
        type: line.account.type,
        totalDebit: debit,
        totalCredit: credit,
      });
    } else {
      existing.totalDebit = toMoney(existing.totalDebit + debit);
      existing.totalCredit = toMoney(existing.totalCredit + credit);
    }
  }

  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function buildProfitAndLoss(accountTotals) {
  const revenues = accountTotals
    .filter((item) => item.type === 'Revenue')
    .map((item) => ({
      ...item,
      amount: toMoney(item.totalCredit - item.totalDebit),
    }));

  const expenses = accountTotals
    .filter((item) => item.type === 'Expense')
    .map((item) => ({
      ...item,
      amount: toMoney(item.totalDebit - item.totalCredit),
    }));

  const totalRevenue = toMoney(revenues.reduce((sum, item) => sum + item.amount, 0));
  const totalExpense = toMoney(expenses.reduce((sum, item) => sum + item.amount, 0));
  const netProfitLoss = toMoney(totalRevenue - totalExpense);

  return {
    reportType: 'Profit and Loss',
    data: {
      revenues,
      expenses,
      summary: { totalRevenue, totalExpense, netProfitLoss },
    },
  };
}

function buildBalanceSheet(accountTotals, pnlSummary) {
  const assets = accountTotals
    .filter((item) => item.type === 'Asset')
    .map((item) => ({
      ...item,
      amount: toMoney(item.totalDebit - item.totalCredit),
    }));

  const liabilities = accountTotals
    .filter((item) => item.type === 'Liability')
    .map((item) => ({
      ...item,
      amount: toMoney(item.totalCredit - item.totalDebit),
    }));

  const equity = accountTotals
    .filter((item) => item.type === 'Equity')
    .map((item) => ({
      ...item,
      amount: toMoney(item.totalCredit - item.totalDebit),
    }));

  const totalAssets = toMoney(assets.reduce((sum, item) => sum + item.amount, 0));
  const totalLiabilities = toMoney(liabilities.reduce((sum, item) => sum + item.amount, 0));
  const baseEquity = toMoney(equity.reduce((sum, item) => sum + item.amount, 0));
  const retainedEarnings = toMoney(pnlSummary.netProfitLoss);
  const totalEquity = toMoney(baseEquity + retainedEarnings);
  const liabilitiesAndEquity = toMoney(totalLiabilities + totalEquity);
  const balanceGap = toMoney(totalAssets - liabilitiesAndEquity);

  return {
    reportType: 'Balance Sheet',
    data: {
      assets,
      liabilities,
      equity,
      summary: {
        totalAssets,
        totalLiabilities,
        baseEquity,
        retainedEarnings,
        totalEquity,
        liabilitiesAndEquity,
        balanceGap,
        isBalanced: Math.abs(balanceGap) < 0.01,
      },
    },
  };
}

function buildTrialBalance(accountTotals) {
  const accounts = accountTotals.map((item) => {
    const net = toMoney(item.totalDebit - item.totalCredit);
    return {
      ...item,
      netDebit: net > 0 ? net : 0,
      netCredit: net < 0 ? toMoney(Math.abs(net)) : 0,
    };
  });

  const totalDebits = toMoney(accounts.reduce((sum, item) => sum + item.totalDebit, 0));
  const totalCredits = toMoney(accounts.reduce((sum, item) => sum + item.totalCredit, 0));
  const difference = toMoney(totalDebits - totalCredits);

  return {
    reportType: 'Trial Balance',
    data: {
      accounts,
      summary: {
        totalDebits,
        totalCredits,
        difference,
        isBalanced: Math.abs(difference) < 0.01,
      },
    },
  };
}

function buildCashFlow(journalLines, openingCashBalance) {
  const journalMap = new Map();

  for (const line of journalLines) {
    const journal = line.journal;
    const existing = journalMap.get(journal.id);
    if (!existing) {
      journalMap.set(journal.id, {
        journalId: journal.id,
        date: journal.date,
        reference: journal.reference,
        description: journal.description,
        lines: [line],
      });
    } else {
      existing.lines.push(line);
    }
  }

  const activities = [];
  let operatingNet = 0;
  let investingNet = 0;
  let financingNet = 0;

  for (const entry of [...journalMap.values()]) {
    const cashLines = entry.lines.filter((line) => isCashLikeAccount(line.account));
    if (!cashLines.length) continue;

    const cashAmount = toMoney(
      cashLines.reduce((sum, line) => sum + toMoney(line.debit) - toMoney(line.credit), 0)
    );
    if (Math.abs(cashAmount) < 0.01) continue;

    const counterpartTypes = new Set(
      entry.lines.filter((line) => !isCashLikeAccount(line.account)).map((line) => line.account.type)
    );

    let category = 'operating';
    if (counterpartTypes.has('Revenue') || counterpartTypes.has('Expense')) {
      category = 'operating';
    } else if (counterpartTypes.has('Liability') || counterpartTypes.has('Equity')) {
      category = 'financing';
    } else if (counterpartTypes.has('Asset')) {
      category = 'investing';
    }

    if (category === 'operating') operatingNet = toMoney(operatingNet + cashAmount);
    if (category === 'investing') investingNet = toMoney(investingNet + cashAmount);
    if (category === 'financing') financingNet = toMoney(financingNet + cashAmount);

    activities.push({
      journalId: entry.journalId,
      date: entry.date,
      reference: entry.reference,
      description: entry.description,
      category,
      amount: cashAmount,
      cashIn: cashAmount > 0 ? cashAmount : 0,
      cashOut: cashAmount < 0 ? toMoney(Math.abs(cashAmount)) : 0,
    });
  }

  activities.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const netCashChange = toMoney(operatingNet + investingNet + financingNet);

  return {
    reportType: 'Cash Flow',
    data: {
      activities,
      summary: {
        openingCashBalance,
        closingCashBalance:
          openingCashBalance === null ? null : toMoney(openingCashBalance + netCashChange),
        operatingNet,
        investingNet,
        financingNet,
        netCashChange,
      },
    },
  };
}

export const GET = requireAuth(async (request, { params }) => {
  const type = (await params).type;
  if (!SUPPORTED_REPORT_TYPES.has(type)) {
    return NextResponse.json(
      { error: 'Invalid report type', supported: [...SUPPORTED_REPORT_TYPES] },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  const parsedFrom = parseDateParam(fromParam, 'from');
  if (!parsedFrom.ok) {
    return NextResponse.json({ error: parsedFrom.error }, { status: 400 });
  }

  const parsedTo = parseDateParam(toParam, 'to', true);
  if (!parsedTo.ok) {
    return NextResponse.json({ error: parsedTo.error }, { status: 400 });
  }

  const fromDate = parsedFrom.value;
  const toDate = parsedTo.value;
  if (fromDate && toDate && fromDate > toDate) {
    return NextResponse.json({ error: 'from date cannot be after to date' }, { status: 400 });
  }

  const dateFilter = buildDateFilter(fromDate, toDate);
  const journalLines = await prisma.journalLine.findMany({
    where: {
      ...(dateFilter ? { journal: { date: dateFilter } } : {}),
    },
    include: {
      account: { select: { id: true, code: true, name: true, type: true } },
      journal: { select: { id: true, date: true, reference: true, description: true } },
    },
    orderBy: [{ journalId: 'asc' }, { id: 'asc' }],
  });

  const accountTotals = aggregateByAccount(journalLines);
  const profitAndLoss = buildProfitAndLoss(accountTotals);

  let report;
  if (type === 'pl') {
    report = profitAndLoss;
  } else if (type === 'balance-sheet') {
    report = buildBalanceSheet(accountTotals, profitAndLoss.data.summary);
  } else if (type === 'trial-balance') {
    report = buildTrialBalance(accountTotals);
  } else {
    let openingCashBalance = null;
    if (fromDate) {
      const assetAccounts = await prisma.chartOfAccount.findMany({
        where: { type: 'Asset' },
        select: { id: true, code: true, name: true, type: true },
      });
      const cashAccountIds = assetAccounts.filter(isCashLikeAccount).map((item) => item.id);
      if (cashAccountIds.length) {
        const openingAgg = await prisma.journalLine.aggregate({
          _sum: { debit: true, credit: true },
          where: {
            accountId: { in: cashAccountIds },
            journal: { date: { lt: fromDate } },
          },
        });
        openingCashBalance = toMoney(
          toMoney(openingAgg._sum.debit) - toMoney(openingAgg._sum.credit)
        );
      } else {
        openingCashBalance = 0;
      }
    }
    report = buildCashFlow(journalLines, openingCashBalance);
  }

  return NextResponse.json({
    ...report,
    period: {
      from: fromParam || null,
      to: toParam || null,
    },
    generatedAt: new Date().toISOString(),
  });
}, 'super_admin', 'accounting_manager', 'accountant');
