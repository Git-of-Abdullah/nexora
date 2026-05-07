'use client';

import { useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { BarChart3, TrendingUp, Scale, List, Activity, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';

function fmtMoney(n) { return '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtK(v)     { return '$' + (Number(v) / 1000).toFixed(0) + 'k'; }
function clsAmt(n)   { return Number(n) >= 0 ? 'text-success' : 'text-danger'; }

const REPORT_TYPES = [
  { key:'pl',            label:'Profit & Loss',    icon:TrendingUp, color:'var(--success)' },
  { key:'balance-sheet', label:'Balance Sheet',    icon:Scale,      color:'var(--accent)'  },
  { key:'trial-balance', label:'Trial Balance',    icon:List,       color:'#7C3AED'        },
  { key:'cash-flow',     label:'Cash Flow',        icon:Activity,   color:'var(--warning)' },
];

/* ─── Section table ─── */
function ReportSection({ title, rows, total, totalLabel }) {
  if (!rows?.length) return null;
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', padding:'8px 0', marginBottom:4 }}>{title}</div>
      <table className="table" style={{ fontSize:'0.8125rem' }}>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>{row.code && <span className="td-mono" style={{ marginRight:8, color:'var(--text-muted)' }}>{row.code}</span>}{row.name}</td>
              <td style={{ textAlign:'right', fontWeight:500 }}>{fmtMoney(row.amount ?? row.netDebit ?? row.totalDebit ?? 0)}</td>
            </tr>
          ))}
        </tbody>
        {total !== undefined && (
          <tfoot>
            <tr style={{ background:'var(--bg)', borderTop:'2px solid var(--border)' }}>
              <td style={{ fontWeight:700 }}>{totalLabel || 'Total'}</td>
              <td style={{ textAlign:'right', fontWeight:800 }}>{fmtMoney(total)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

/* ─── P&L Report ─── */
function PLReport({ data }) {
  const { revenues, expenses, summary } = data;
  const isProfit = Number(summary.netProfitLoss) >= 0;
  const chartData = [
    { name:'Revenue',  value:Number(summary.totalRevenue), fill:'var(--success)' },
    { name:'Expenses', value:Number(summary.totalExpense), fill:'var(--danger)'  },
  ];
  return (
    <>
      <div style={{ height:200, marginBottom:24 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={60}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize:12, fill:'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtK} tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={v => [fmtMoney(v), '']} contentStyle={{ borderRadius:8, border:'1px solid var(--border)', fontSize:'0.8rem' }} />
            <Bar dataKey="value" radius={[6,6,0,0]}>{chartData.map((e,i) => <Cell key={i} fill={e.fill}/>)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ReportSection title="Revenue"  rows={revenues} total={summary.totalRevenue} totalLabel="Total Revenue"  />
      <ReportSection title="Expenses" rows={expenses} total={summary.totalExpense} totalLabel="Total Expenses" />
      <div style={{ padding:'14px 16px', background:isProfit?'var(--success-bg)':'var(--danger-bg)', borderRadius:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontWeight:700, display:'flex', alignItems:'center', gap:6, color:isProfit?'var(--success)':'var(--danger)' }}>
          {isProfit ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}
          Net {isProfit ? 'Profit' : 'Loss'}
        </span>
        <span style={{ fontWeight:800, fontSize:'1.1rem', color:isProfit?'var(--success)':'var(--danger)' }}>{fmtMoney(summary.netProfitLoss)}</span>
      </div>
    </>
  );
}

/* ─── Balance Sheet Report ─── */
const PIE_COLORS = ['#2E75B6','#DC2626','#1E6B3C'];
function BSReport({ data }) {
  const { assets, liabilities, equity, summary } = data;
  const pieData = [
    { name:'Assets',      value:Number(summary.totalAssets)      },
    { name:'Liabilities', value:Number(summary.totalLiabilities) },
    { name:'Equity',      value:Number(summary.totalEquity)      },
  ].filter(d => d.value > 0);
  return (
    <>
      {pieData.length > 0 && (
        <div style={{ display:'flex', gap:24, alignItems:'center', marginBottom:24 }}>
          <div style={{ height:200, width:200, flexShrink:0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                  {pieData.map((e,i) => <Cell key={i} fill={PIE_COLORS[i]}/>)}
                </Pie>
                <Tooltip formatter={v => [fmtMoney(v), '']} contentStyle={{ borderRadius:8, border:'1px solid var(--border)', fontSize:'0.8rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {pieData.map((d,i) => (
              <div key={d.name} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:12, height:12, borderRadius:3, background:PIE_COLORS[i], flexShrink:0 }} />
                <span style={{ fontSize:'0.8125rem', color:'var(--text-secondary)' }}>{d.name}:</span>
                <strong style={{ fontSize:'0.875rem' }}>{fmtMoney(d.value)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
      <ReportSection title="Assets"      rows={assets}      total={summary.totalAssets}      totalLabel="Total Assets"      />
      <ReportSection title="Liabilities" rows={liabilities} total={summary.totalLiabilities} totalLabel="Total Liabilities" />
      <ReportSection title="Equity"      rows={equity}      total={summary.totalEquity}       totalLabel="Total Equity"      />
      <div style={{ padding:'10px 16px', background:summary.isBalanced?'var(--success-bg)':'var(--danger-bg)', borderRadius:8, fontSize:'0.8125rem', fontWeight:600, color:summary.isBalanced?'var(--success)':'var(--danger)', display:'flex', alignItems:'center', gap:6 }}>
        {summary.isBalanced ? <CheckCircle2 size={14}/> : <AlertTriangle size={14}/>}
        {summary.isBalanced ? 'Balance Sheet is balanced' : `Gap: ${fmtMoney(summary.balanceGap)}`}
      </div>
    </>
  );
}

/* ─── Trial Balance Report ─── */
function TBReport({ data }) {
  const { accounts, summary } = data;
  const chartData = accounts.slice(0, 8).map(a => ({
    name: a.name.length > 12 ? a.name.slice(0,12)+'…' : a.name,
    Debit:  Number(a.netDebit  || 0),
    Credit: Number(a.netCredit || 0),
  }));
  return (
    <>
      {chartData.length > 0 && (
        <div style={{ height:200, marginBottom:24 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => [fmtMoney(v), '']} contentStyle={{ borderRadius:8, border:'1px solid var(--border)', fontSize:'0.8rem' }} />
              <Legend wrapperStyle={{ fontSize:11 }} />
              <Bar dataKey="Debit"  fill="#2E75B6" radius={[3,3,0,0]} />
              <Bar dataKey="Credit" fill="#1E6B3C" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="table-wrap" style={{ marginBottom:12 }}>
        <table className="table">
          <thead><tr><th>Code</th><th>Account</th><th>Type</th><th style={{ textAlign:'right' }}>Debit</th><th style={{ textAlign:'right' }}>Credit</th></tr></thead>
          <tbody>
            {accounts.map((a,i) => (
              <tr key={i}>
                <td className="td-mono">{a.code}</td>
                <td>{a.name}</td>
                <td className="td-muted">{a.type}</td>
                <td style={{ textAlign:'right' }} className="td-mono">{a.netDebit  > 0 ? fmtMoney(a.netDebit)  : '—'}</td>
                <td style={{ textAlign:'right' }} className="td-mono">{a.netCredit > 0 ? fmtMoney(a.netCredit) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background:'var(--bg)', borderTop:'2px solid var(--border)', fontWeight:700 }}>
              <td colSpan={3}>Total</td>
              <td style={{ textAlign:'right' }}>{fmtMoney(summary.totalDebits)}</td>
              <td style={{ textAlign:'right' }}>{fmtMoney(summary.totalCredits)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div style={{ padding:'10px 16px', background:summary.isBalanced?'var(--success-bg)':'var(--danger-bg)', borderRadius:8, fontSize:'0.8125rem', fontWeight:600, color:summary.isBalanced?'var(--success)':'var(--danger)', display:'flex', alignItems:'center', gap:6 }}>
        {summary.isBalanced ? <CheckCircle2 size={14}/> : <AlertTriangle size={14}/>}
        {summary.isBalanced ? 'Trial Balance is balanced' : `Difference: ${fmtMoney(summary.difference)}`}
      </div>
    </>
  );
}

/* ─── Cash Flow Report ─── */
const CF_COLORS = { operating:'#2E75B6', investing:'#7C3AED', financing:'#1E6B3C' };
function CFReport({ data }) {
  const { activities, summary } = data;
  const categories = ['operating','investing','financing'];
  const chartData  = categories.map(cat => ({
    name:  cat.charAt(0).toUpperCase() + cat.slice(1),
    value: Math.abs(Number(summary[`${cat}Net`] || 0)),
    fill:  CF_COLORS[cat],
  })).filter(d => d.value > 0);
  return (
    <>
      {chartData.length > 0 && (
        <div style={{ height:200, marginBottom:24 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={56}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize:12, fill:'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => [fmtMoney(v), '']} contentStyle={{ borderRadius:8, border:'1px solid var(--border)', fontSize:'0.8rem' }} />
              <Bar dataKey="value" radius={[6,6,0,0]}>{chartData.map((e,i) => <Cell key={i} fill={e.fill}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {categories.map(cat => {
        const rows = activities.filter(a => a.category === cat);
        const net  = summary[`${cat}Net`];
        return (
          <div key={cat} style={{ marginBottom:20 }}>
            <div style={{ fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', padding:'8px 0' }}>
              {cat.charAt(0).toUpperCase()+cat.slice(1)} Activities
            </div>
            {rows.length === 0 ? (
              <p style={{ fontSize:'0.8125rem', color:'var(--text-muted)', padding:'8px 0' }}>No {cat} activities</p>
            ) : (
              <table className="table" style={{ fontSize:'0.8125rem' }}>
                <tbody>
                  {rows.map((a,i) => (
                    <tr key={i}>
                      <td>{a.description || a.reference}</td>
                      <td className="td-muted">{new Date(a.date).toLocaleDateString()}</td>
                      <td style={{ textAlign:'right', fontWeight:600 }} className={clsAmt(a.amount)}>{fmtMoney(Math.abs(a.amount))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background:'var(--bg)', fontWeight:700, borderTop:'2px solid var(--border)' }}>
                    <td colSpan={2}>Net {cat.charAt(0).toUpperCase()+cat.slice(1)}</td>
                    <td style={{ textAlign:'right' }} className={clsAmt(net)}>{fmtMoney(net)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        );
      })}
      <div style={{ padding:'14px 16px', background:'var(--bg)', borderRadius:8, display:'flex', justifyContent:'space-between', fontWeight:700, border:'1px solid var(--border)' }}>
        <span>Net Cash Change</span>
        <span className={clsAmt(summary.netCashChange)}>{fmtMoney(summary.netCashChange)}</span>
      </div>
    </>
  );
}

/* ─── Page ─── */
export default function ReportsPage() {
  const [reportType, setReportType] = useState('pl');
  const [from,   setFrom]   = useState('');
  const [to,     setTo]     = useState('');
  const [report, setReport] = useState(null);
  const [loading,setLoading]= useState(false);
  const [error,  setError]  = useState('');

  async function loadReport() {
    setError(''); setLoading(true); setReport(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to)   params.set('to',   to);
      const data = await api.get(`/accounting/reports/${reportType}?${params}`);
      setReport(data);
    } catch (err) { setError(err?.error || 'Failed to generate report.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="page-wrapper">
      <Topbar title="Financial Reports" subtitle="P&L, Balance Sheet, Trial Balance, Cash Flow" />
      <main className="page-main">

        {/* Report type selector */}
        <div className="card" style={{ marginBottom:20 }}>
          <div className="card-pad">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
              {REPORT_TYPES.map(({ key, label, icon:Icon, color }) => (
                <button key={key} onClick={() => { setReportType(key); setReport(null); setError(''); }}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'14px 10px', borderRadius:10, cursor:'pointer', border:`2px solid ${reportType===key?color:'var(--border)'}`, background:reportType===key?`${color}14`:'none', transition:'all 0.15s' }}>
                  <div style={{ width:38, height:38, borderRadius:8, background:reportType===key?`${color}22`:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <span style={{ fontSize:'0.8rem', fontWeight:600, color:reportType===key?color:'var(--text-secondary)' }}>{label}</span>
                </button>
              ))}
            </div>

            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <label style={{ fontSize:'0.8125rem', color:'var(--text-secondary)', fontWeight:500 }}>From</label>
                <input type="date" className="form-input" style={{ width:'auto' }} value={from} onChange={e => setFrom(e.target.value)} />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <label style={{ fontSize:'0.8125rem', color:'var(--text-secondary)', fontWeight:500 }}>To</label>
                <input type="date" className="form-input" style={{ width:'auto' }} value={to} onChange={e => setTo(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={loadReport} disabled={loading}>
                <BarChart3 size={14}/> {loading ? 'Generating…' : 'Generate Report'}
              </button>
              {report && <button className="btn btn-ghost btn-sm" onClick={() => { setReport(null); setError(''); }}><RefreshCw size={13}/> Clear</button>}
            </div>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom:16, display:'flex', alignItems:'center', gap:8 }}><AlertTriangle size={15}/> {error}</div>}

        {loading && (
          <div className="card">
            <div className="card-pad" style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {Array.from({ length:8 }).map((_,i) => <div key={i} className="skeleton" style={{ height:16, borderRadius:4, width:`${55+Math.random()*35}%` }} />)}
            </div>
          </div>
        )}

        {report && !loading && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">{report.reportType}</div>
                <div className="card-subtitle">
                  Period: {report.period?.from || 'All time'} → {report.period?.to || 'Now'} &nbsp;·&nbsp;
                  Generated: {new Date(report.generatedAt).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="card-pad">
              {reportType === 'pl'            && <PLReport data={report.data} />}
              {reportType === 'balance-sheet' && <BSReport data={report.data} />}
              {reportType === 'trial-balance' && <TBReport data={report.data} />}
              {reportType === 'cash-flow'     && <CFReport data={report.data} />}
            </div>
          </div>
        )}

        {!report && !loading && !error && (
          <div className="card">
            <div style={{ padding:'48px 24px', textAlign:'center' }}>
              <BarChart3 size={40} style={{ color:'var(--text-muted)', opacity:0.35, margin:'0 auto 12px' }} />
              <p style={{ fontSize:'0.9375rem', fontWeight:600, color:'var(--text-secondary)' }}>Select a report type and click Generate</p>
              <p style={{ fontSize:'0.8125rem', color:'var(--text-muted)', marginTop:4 }}>Leave date range empty to include all data</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
