// scripts/audit/audit-layers.mjs
import Decimal from 'decimal.js';
import { exactMatch, isDust } from './compare.mjs';

Decimal.set({ precision: 40 });

// ─── Shared helpers ───

function resolveDistDate(epochDate, dbDistDates) {
  if (dbDistDates.has(epochDate)) return epochDate;
  const d = new Date(epochDate + 'T00:00:00Z');
  if (d.getUTCDate() === 1) {
    const prevMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0));
    const candidate = prevMonth.toISOString().split('T')[0];
    if (dbDistDates.has(candidate)) return candidate;
  }
  return null;
}

// ─── Layer 1: Transactions ───

export function auditTransactions(excelTxns, dbTxns, nameMap, nameResolver) {
  const results = [];
  const dbByInvestor = new Map();
  for (const t of dbTxns) {
    const investorName = nameMap.get(t.investor_id) || t.investor_id;
    const type = Number(t.amount) >= 0 ? 'DEPOSIT' : 'WITHDRAWAL';
    const key = `${investorName}|${type}`;
    if (!dbByInvestor.has(key)) dbByInvestor.set(key, []);
    dbByInvestor.get(key).push({ ...t, _used: false });
  }

  for (const exTxn of excelTxns) {
    const dbName = nameResolver(exTxn.investor);
    if (!dbName) {
      if (/indigo|fees/i.test(exTxn.investor)) {
        results.push({ ok: true, label: `${exTxn.date} ${exTxn.investor} (internal)`, note: 'SKIP' });
        continue;
      }
      results.push({ ok: false, label: `${exTxn.date} ${exTxn.investor}`, note: `MISSING_INVESTOR: "${exTxn.investor}"` });
      continue;
    }
    const type = exTxn.amount >= 0 ? 'DEPOSIT' : 'WITHDRAWAL';
    const key = `${dbName}|${type}`;
    const candidates = dbByInvestor.get(key) || [];
    const exAmt = new Decimal(exTxn.amount).abs();

    let matched = false;
    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i]._used) continue;
      const dbAmt = new Decimal(candidates[i].amount).abs();
      const diff = exAmt.minus(dbAmt).abs();
      const closeDate = Math.abs(
        new Date(candidates[i].tx_date).getTime() - new Date(exTxn.date).getTime()
      ) <= 45 * 86400000;

      if (closeDate && diff.lt('0.05')) {
        candidates[i]._used = true;
        const exact = diff.lt('0.0001');
        results.push({
          ok: exact,
          label: `${exTxn.date} ${exTxn.investor} ${type} ${exTxn.amount}`,
          excel: exAmt.toFixed(),
          db: dbAmt.toFixed(),
          diff: exact ? null : diff.toFixed(),
        });
        matched = true;
        break;
      }
    }
    if (!matched) {
      results.push({
        ok: false,
        label: `${exTxn.date} ${exTxn.investor} ${type} ${exTxn.amount}`,
        note: `NOT_IN_DB`,
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  return { layer: 'Layer 1: Transactions', total: results.length, passed, failed: results.length - passed, results };
}

// ─── Layer 2: Distribution Amounts ───
// Compare the absolute gross yield amounts between DB and Excel.
// Excel gross = AUM Before × Gross%. DB gross = gross_yield_amount.

export function auditDistributions(excelFundLevel, dbDistributions) {
  const results = [];
  const dbByDate = new Map();
  for (const d of dbDistributions) dbByDate.set(d.effective_date, d);
  const dbDistDates = new Set(dbDistributions.map((d) => d.effective_date));

  for (const ep of excelFundLevel) {
    const resolvedDate = resolveDistDate(ep.date, dbDistDates);
    const db = resolvedDate ? dbByDate.get(resolvedDate) : null;

    if (!db) {
      if (ep.grossPerf === null || ep.grossPerf === 0) {
        results.push({ ok: true, label: `${ep.date} (no yield)`, note: 'SKIP' });
      } else {
        results.push({ ok: false, label: `${ep.date}`, note: `NO_DISTRIBUTION: Excel gross%=${ep.grossPerf}` });
      }
      continue;
    }

    const dateLabel = ep.date === resolvedDate ? ep.date : `${ep.date}→${resolvedDate}`;

    // Compare GROSS YIELD AMOUNT
    if (ep.grossPerf !== null && ep.aumBefore !== null && ep.aumBefore > 0) {
      const excelGrossAmt = new Decimal(ep.aumBefore).times(new Decimal(ep.grossPerf));
      const dbGross = new Decimal(db.gross_yield_amount);
      const diff = excelGrossAmt.minus(dbGross).abs();
      const match = diff.lt('0.001'); // within 0.001 BTC
      results.push({
        ok: match,
        label: `${dateLabel} gross amount`,
        excel: excelGrossAmt.toFixed(10),
        db: dbGross.toFixed(10),
        diff: match ? null : diff.toFixed(10),
      });
    }

    // Compare NET YIELD AMOUNT
    if (ep.netPerf !== null && ep.aumBefore !== null && ep.aumBefore > 0) {
      const excelNetAmt = new Decimal(ep.aumBefore).times(new Decimal(ep.netPerf));
      const dbNet = new Decimal(db.total_net_amount);
      const diff = excelNetAmt.minus(dbNet).abs();
      const match = diff.lt('0.001');
      results.push({
        ok: match,
        label: `${dateLabel} net amount`,
        excel: excelNetAmt.toFixed(10),
        db: dbNet.toFixed(10),
        diff: match ? null : diff.toFixed(10),
      });
    }

    // Compare FEE+IB AMOUNT (Excel netPerf is after both fees AND IB)
    if (ep.grossPerf !== null && ep.netPerf !== null && ep.aumBefore !== null && ep.aumBefore > 0) {
      const excelFee = new Decimal(ep.aumBefore).times(new Decimal(ep.grossPerf).minus(new Decimal(ep.netPerf)));
      const dbFee = new Decimal(db.total_fee_amount).plus(new Decimal(db.total_ib_amount || 0));
      const diff = excelFee.minus(dbFee).abs();
      const match = diff.lt('0.001');
      results.push({
        ok: match,
        label: `${dateLabel} fee amount`,
        excel: excelFee.toFixed(10),
        db: dbFee.toFixed(10),
        diff: match ? null : diff.toFixed(10),
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  return { layer: 'Layer 2: Distribution Amounts', total: results.length, passed, failed: results.length - passed, results };
}

// ─── Layer 3: Per-investor balances (THE KEY LAYER) ───

export function auditBalances(excelInvestors, excelEpochs, dbTransactions, dbAllocations, dbDistributions, nameMap, nameResolver, dbDustTxns = []) {
  const results = [];
  const dbDistDates = new Set(dbDistributions.map((d) => d.effective_date));

  for (const inv of excelInvestors) {
    const dbName = nameResolver(inv.name);
    if (!dbName) {
      const hasBalance = inv.balances.some((b) => b !== null && b !== 0);
      if (hasBalance) {
        results.push({ ok: false, label: `${inv.name}`, note: `MISSING_INVESTOR` });
      }
      continue;
    }

    const investorId = [...nameMap.entries()].find(([, n]) => n === dbName)?.[0];
    if (!investorId) {
      results.push({ ok: false, label: `${inv.name}`, note: `MISSING_INVESTOR_ID` });
      continue;
    }

    // Build event timeline: deposits/withdrawals + dust + yield (net_amount only)
    const events = [];
    for (const t of dbTransactions.filter((t) => t.investor_id === investorId)) {
      events.push({ date: t.tx_date, amount: new Decimal(t.amount) });
    }
    for (const t of dbDustTxns.filter((t) => t.investor_id === investorId)) {
      events.push({ date: t.tx_date, amount: new Decimal(t.amount) });
    }
    for (const a of dbAllocations.filter((a) => a.investor_id === investorId)) {
      const dist = dbDistributions.find((d) => d.id === a.distribution_id);
      if (!dist) continue;
      events.push({ date: dist.effective_date, amount: new Decimal(a.net_amount || 0) });
    }
    events.sort((a, b) => a.date.localeCompare(b.date));

    let runningBalance = new Decimal(0);
    let eventIdx = 0;

    for (let i = 0; i < excelEpochs.length; i++) {
      const epochDate = excelEpochs[i].date;
      const resolvedDate = resolveDistDate(epochDate, dbDistDates) || epochDate;
      const cutoffDate = resolvedDate > epochDate ? resolvedDate : epochDate;

      while (eventIdx < events.length && events[eventIdx].date <= cutoffDate) {
        runningBalance = runningBalance.plus(events[eventIdx].amount);
        eventIdx++;
      }

      const excelBal = inv.balances[i];
      if (excelBal === null || excelBal === undefined) continue;

      if (excelBal === 0 && isDust(runningBalance.toNumber())) {
        results.push({ ok: true, label: `${epochDate} ${inv.name}: 0` });
        continue;
      }

      const excelDec = new Decimal(excelBal);
      const diff = excelDec.minus(runningBalance).abs();
      const match = diff.lt('0.0001');
      results.push({
        ok: match,
        label: `${epochDate} ${inv.name}`,
        excel: excelDec.toFixed(10),
        db: runningBalance.toFixed(10),
        diff: match ? null : diff.toFixed(10),
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  return { layer: 'Layer 3: Investor Balances', total: results.length, passed, failed: results.length - passed, results };
}

// ─── Layer 4: Allocation Internal Consistency ───

export function auditAllocations(excelInvestors, excelEpochs, excelFundLevel, dbAllocations, dbDistributions, nameMap, nameResolver) {
  const results = [];
  const dbDistDates = new Set(dbDistributions.map((d) => d.effective_date));
  const distByDate = new Map();
  for (const d of dbDistributions) distByDate.set(d.effective_date, d);

  for (const inv of excelInvestors) {
    const dbName = nameResolver(inv.name);
    if (!dbName) continue;
    const investorId = [...nameMap.entries()].find(([, n]) => n === dbName)?.[0];
    if (!investorId) continue;

    const allocsForInvestor = dbAllocations.filter((a) => a.investor_id === investorId);

    for (let i = 0; i < excelEpochs.length; i++) {
      const epochDate = excelEpochs[i].date;
      const resolvedDate = resolveDistDate(epochDate, dbDistDates);
      if (!resolvedDate) continue;
      const dist = distByDate.get(resolvedDate);
      if (!dist) continue;

      const alloc = allocsForInvestor.find((a) => a.distribution_id === dist.id);
      if (!alloc) continue;

      const dbGross = new Decimal(alloc.gross_amount || 0);
      const dbFee = new Decimal(alloc.fee_amount || 0);
      const dbNet = new Decimal(alloc.net_amount || 0);
      const dbIb = new Decimal(alloc.ib_amount || 0);

      // net = gross - fee - ib
      const expectedNet = dbGross.minus(dbFee).minus(dbIb);
      const diff = dbNet.minus(expectedNet).abs();
      const match = diff.lt('0.000000001');
      results.push({
        ok: match,
        label: `${epochDate} ${inv.name} net=gross-fees-ib`,
        excel: expectedNet.toFixed(18),
        db: dbNet.toFixed(18),
        diff: match ? null : diff.toFixed(),
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  return { layer: 'Layer 4: Allocation Consistency', total: results.length, passed, failed: results.length - passed, results };
}

// ─── Layer 5: Ownership Shares (Excel internal consistency) ───

export function auditShares(excelShareInvestors, excelEpochs, excelFundLevel, excelBalanceInvestors, excelIndigoFeeBalances) {
  const results = [];

  for (const inv of excelShareInvestors) {
    for (let i = 0; i < excelEpochs.length; i++) {
      const excelShare = inv.shares[i];
      if (excelShare === null || excelShare === 0) continue;

      const aumAfter = excelFundLevel[i]?.aumAfter;
      if (!aumAfter || aumAfter === 0) continue;

      let investorBalance = null;
      if (inv.name === 'Indigo Fees') {
        investorBalance = excelIndigoFeeBalances[i];
      } else {
        const balInv = excelBalanceInvestors.find((b) => b.name === inv.name);
        if (balInv) investorBalance = balInv.balances[i];
      }
      if (investorBalance === null || investorBalance === undefined) continue;

      const computedShare = new Decimal(investorBalance).div(new Decimal(aumAfter));
      const excelDec = new Decimal(excelShare);
      const diff = excelDec.minus(computedShare).abs();
      const match = diff.lt('0.0001');
      results.push({
        ok: match,
        label: `${excelEpochs[i].date} ${inv.name}`,
        excel: excelDec.toFixed(10),
        db: computedShare.toFixed(10),
        diff: match ? null : diff.toFixed(10),
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  return { layer: 'Layer 5: Ownership Shares', total: results.length, passed, failed: results.length - passed, results };
}

// ─── Layer 6: Cumulative Indigo Fees ───

export function auditCumulativeFees(excelFeeBalances, excelEpochs, dbAllocations, dbDistributions, dbTransactions, nameMap, dbDustTxns = [], dbFeeCreditTxns = []) {
  const results = [];
  const dbDistDates = new Set(dbDistributions.map((d) => d.effective_date));

  const feesIds = [...nameMap.entries()]
    .filter(([, n]) => n.includes('Indigo') && n.includes('Fees'))
    .map(([id]) => id);
  if (feesIds.length === 0) {
    results.push({ ok: false, label: 'Indigo Fees', note: 'MISSING' });
    return { layer: 'Layer 6: Cumulative Indigo Fees', total: 1, passed: 0, failed: 1, results };
  }

  const events = [];
  for (const t of dbTransactions.filter((t) => feesIds.includes(t.investor_id))) {
    events.push({ date: t.tx_date, amount: new Decimal(t.amount) });
  }
  for (const t of dbFeeCreditTxns.filter((t) => feesIds.includes(t.investor_id))) {
    events.push({ date: t.tx_date, amount: new Decimal(t.amount) });
  }
  for (const t of dbDustTxns.filter((t) => feesIds.includes(t.investor_id))) {
    events.push({ date: t.tx_date, amount: new Decimal(t.amount) });
  }
  for (const a of dbAllocations.filter((a) => feesIds.includes(a.investor_id))) {
    const dist = dbDistributions.find((d) => d.id === a.distribution_id);
    if (!dist) continue;
    events.push({ date: dist.effective_date, amount: new Decimal(a.net_amount || 0) });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));

  let balance = new Decimal(0);
  let eventIdx = 0;

  for (let i = 0; i < excelEpochs.length; i++) {
    const epochDate = excelEpochs[i].date;
    const resolvedDate = resolveDistDate(epochDate, dbDistDates) || epochDate;
    const cutoffDate = resolvedDate > epochDate ? resolvedDate : epochDate;

    while (eventIdx < events.length && events[eventIdx].date <= cutoffDate) {
      balance = balance.plus(events[eventIdx].amount);
      eventIdx++;
    }

    const excelBal = excelFeeBalances[i];
    if (excelBal === null || excelBal === undefined) continue;

    const excelDec = new Decimal(excelBal);
    const diff = excelDec.minus(balance).abs();
    const match = diff.lt('0.0001');
    results.push({
      ok: match,
      label: `${epochDate} Indigo Fees`,
      excel: excelDec.toFixed(10),
      db: balance.toFixed(10),
      diff: match ? null : diff.toFixed(10),
    });
  }

  const passed = results.filter((r) => r.ok).length;
  return { layer: 'Layer 6: Cumulative Indigo Fees', total: results.length, passed, failed: results.length - passed, results };
}

// ─── Layer 7: Fee percentages ───

export function auditFeePercents(excelInvestors, dbAllocations, nameMap, nameResolver, dbIBAllocations = []) {
  const results = [];

  for (const inv of excelInvestors) {
    const dbName = nameResolver(inv.name);
    if (!dbName) continue;
    const investorId = [...nameMap.entries()].find(([, n]) => n === dbName)?.[0];
    if (!investorId) continue;

    const allocs = dbAllocations.filter((a) => a.investor_id === investorId);
    if (allocs.length === 0) {
      if (inv.feePct !== null && inv.feePct !== 0) {
        results.push({ ok: false, label: `${inv.name} fee%`, note: `NO_ALLOCATIONS` });
      }
      continue;
    }

    const dbFeePct = Number(allocs[0].fee_pct || 0);
    const excelFeePct = (inv.feePct || 0) * 100;
    const match = Math.abs(dbFeePct - excelFeePct) < 0.001;
    results.push({
      ok: match,
      label: `${inv.name} fee%`,
      excel: `${excelFeePct}%`,
      db: `${dbFeePct}%`,
      diff: match ? null : `${Math.abs(dbFeePct - excelFeePct)}%`,
    });

    if (inv.ibPct !== null && inv.ibPct > 0) {
      const excelIbPct = inv.ibPct * 100;
      const ibAlloc = dbIBAllocations.find((ib) => ib.source_investor_id === investorId);
      const dbIbPct = ibAlloc ? Number(ibAlloc.ib_percentage || 0) : 0;
      const ibMatch = Math.abs(dbIbPct - excelIbPct) < 0.001;
      results.push({
        ok: ibMatch,
        label: `${inv.name} IB%`,
        excel: `${excelIbPct}%`,
        db: `${dbIbPct}%`,
        diff: ibMatch ? null : `${Math.abs(dbIbPct - excelIbPct)}%`,
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  return { layer: 'Layer 7: Fee Percentages', total: results.length, passed, failed: results.length - passed, results };
}
