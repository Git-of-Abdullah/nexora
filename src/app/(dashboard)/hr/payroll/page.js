'use client';
import { useEffect, useState, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Play, RefreshCw, DollarSign, Users, TrendingDown, Lock } from 'lucide-react';

function fmtMoney(n){return'$'+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}
const MONTH_NAMES=['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAN_VIEW_ALL=['super_admin','hr_manager','accountant'];
const CAN_RUN=['super_admin','hr_manager'];

export default function PayrollPage(){
  const {user}=useAuth();
  const role=user?.role;
  const canViewAll=CAN_VIEW_ALL.includes(role);
  const canRun=CAN_RUN.includes(role);
  const isEmployee=!canViewAll;

  const [records,setRecords]=useState([]);
  const [myEmp,setMyEmp]=useState(null);
  const [loading,setLoading]=useState(true);
  const [forbidden,setForbidden]=useState(false);

  const now=new Date();
  const [filterMonth,setFMonth]=useState(String(now.getMonth()+1));
  const [filterYear,setFYear]=useState(String(now.getFullYear()));

  const [runOpen,setRunOpen]=useState(false);
  const [runMonth,setRunMonth]=useState(String(now.getMonth()+1));
  const [runYear,setRunYear]=useState(String(now.getFullYear()));
  const [postJournal,setPostJournal]=useState(true);
  const [running,setRunning]=useState(false);
  const [runResult,setRunResult]=useState(null);
  const [runError,setRunError]=useState('');

  const load=useCallback(async()=>{
    setLoading(true);setForbidden(false);
    try{
      const params=new URLSearchParams();
      if(filterMonth)params.set('month',filterMonth);
      if(filterYear)params.set('year',filterYear);

      if(canViewAll){
        const data=await api.get(`/hr/payroll?${params}`);
        setRecords(data);
      } else {
        // Employee: resolve own employee record then filter payroll
        let emp=myEmp;
        if(!emp){
          try{emp=await api.get('/hr/me');setMyEmp(emp);}catch{setForbidden(true);setLoading(false);return;}
        }
        if(emp){
          params.set('employeeId',emp.id);
          try{const data=await api.get(`/hr/payroll?${params}`);setRecords(data);}
          catch{setRecords([]);}
        }
      }
    }catch(err){
      if(err?.status===403)setForbidden(true);
      setRecords([]);
    }finally{setLoading(false);}
  },[filterMonth,filterYear,canViewAll,myEmp]);

  useEffect(()=>{load();},[load]);

  const totals=records.reduce((acc,r)=>({
    base:acc.base+Number(r.baseSalary||0),
    deductions:acc.deductions+Number(r.deductions||0),
    net:acc.net+Number(r.netPay||0),
  }),{base:0,deductions:0,net:0});

  async function handleRun(){
    setRunError('');setRunning(true);setRunResult(null);
    try{
      const result=await api.post('/hr/payroll/run',{
        month:parseInt(runMonth,10),
        year:parseInt(runYear,10),
        postToJournal:postJournal,
      });
      setRunResult(result);
      if(filterMonth===runMonth&&filterYear===runYear)load();
    }catch(err){setRunError(err?.error||'Payroll run failed.');}
    finally{setRunning(false);}
  }

  /* ── Forbidden state (role can't access at all) ── */
  if(forbidden){
    return(
      <div className="page-wrapper">
        <Topbar title="Payroll" subtitle="Access restricted"/>
        <main className="page-main">
          <div className="card" style={{padding:60,textAlign:'center'}}>
            <Lock size={40} style={{color:'var(--text-muted)',marginBottom:16}}/>
            <div style={{fontSize:'1rem',fontWeight:600,color:'var(--text-primary)',marginBottom:8}}>Access Restricted</div>
            <div style={{color:'var(--text-muted)',fontSize:'0.875rem'}}>You don't have permission to view payroll. Contact HR or your administrator.</div>
          </div>
        </main>
      </div>
    );
  }

  const subtitle=isEmployee?'My payslip history':'Monthly payroll records & processing';
  const title=isEmployee?'My Payslip':' Payroll';

  return(
    <div className="page-wrapper">
      <Topbar title={title} subtitle={subtitle}/>
      <main className="page-main">

        {/* Totals — only show for admins viewing all */}
        {canViewAll&&(
          <div className="grid-3" style={{marginBottom:24}}>
            <div className="kpi-card"><div className="kpi-icon-wrap" style={{background:'var(--accent-light)'}}><DollarSign size={22} style={{color:'var(--accent)'}}/></div><div className="kpi-label">Total Base Salary</div><div className="kpi-value">{loading?'…':fmtMoney(totals.base)}</div><div className="kpi-sub">{records.length} records</div></div>
            <div className="kpi-card"><div className="kpi-icon-wrap" style={{background:'var(--danger-bg)'}}><TrendingDown size={22} style={{color:'var(--danger)'}}/></div><div className="kpi-label">Total Deductions</div><div className="kpi-value" style={{color:'var(--danger)'}}>{loading?'…':fmtMoney(totals.deductions)}</div><div className="kpi-sub">Tax & insurance</div></div>
            <div className="kpi-card"><div className="kpi-icon-wrap" style={{background:'rgba(30,107,60,0.1)'}}><Users size={22} style={{color:'var(--success)'}}/></div><div className="kpi-label">Total Net Pay</div><div className="kpi-value" style={{color:'var(--success)'}}>{loading?'…':fmtMoney(totals.net)}</div><div className="kpi-sub">After deductions</div></div>
          </div>
        )}

        {/* My payslip summary for employees */}
        {isEmployee&&records.length>0&&!loading&&(
          <div className="grid-3" style={{marginBottom:24}}>
            <div className="kpi-card"><div className="kpi-icon-wrap" style={{background:'var(--accent-light)'}}><DollarSign size={22} style={{color:'var(--accent)'}}/></div><div className="kpi-label">Base Salary</div><div className="kpi-value">{fmtMoney(records[0]?.baseSalary)}</div></div>
            <div className="kpi-card"><div className="kpi-icon-wrap" style={{background:'var(--danger-bg)'}}><TrendingDown size={22} style={{color:'var(--danger)'}}/></div><div className="kpi-label">Deductions</div><div className="kpi-value" style={{color:'var(--danger)'}}>{fmtMoney(records[0]?.deductions)}</div></div>
            <div className="kpi-card"><div className="kpi-icon-wrap" style={{background:'rgba(30,107,60,0.1)'}}><DollarSign size={22} style={{color:'var(--success)'}}/></div><div className="kpi-label">Net Pay</div><div className="kpi-value" style={{color:'var(--success)'}}>{fmtMoney(records[0]?.netPay)}</div></div>
          </div>
        )}

        <div className="filters-row" style={{marginBottom:16}}>
          <select className="form-select" style={{width:'auto'}} value={filterMonth} onChange={e=>setFMonth(e.target.value)}>
            {MONTH_NAMES.map((m,i)=><option key={i} value={String(i+1)}>{m}</option>)}
          </select>
          <select className="form-select" style={{width:'auto'}} value={filterYear} onChange={e=>setFYear(e.target.value)}>
            {[2023,2024,2025,2026].map(y=><option key={y} value={String(y)}>{y}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/></button>
          <div style={{flex:1}}/>
          {canRun&&<button className="btn btn-primary btn-sm" onClick={()=>{setRunOpen(true);setRunResult(null);setRunError('');}}>
            <Play size={14}/> Run Payroll
          </button>}
        </div>

        <div className="card">
          <div className="card-header"><div><div className="card-title">{isEmployee?'My Payslips':'Payroll'} — {MONTH_NAMES[parseInt(filterMonth)-1]} {filterYear}</div><div className="card-subtitle">{records.length} {isEmployee?'payslip':'payslip records'}</div></div></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr>
                {canViewAll&&<th>Employee</th>}
                {canViewAll&&<th>Department</th>}
                {canViewAll&&<th>Emp No</th>}
                <th style={{textAlign:'right'}}>Base Salary</th>
                <th style={{textAlign:'right'}}>Deductions</th>
                <th style={{textAlign:'right'}}>Net Pay</th>
              </tr></thead>
              <tbody>
                {loading?Array.from({length:5}).map((_,i)=><tr key={i}>{Array.from({length:canViewAll?6:3}).map((_,j)=><td key={j}><div className="skeleton" style={{height:14,borderRadius:4,width:'75%'}}/></td>)}</tr>)
                :records.length===0?<tr><td colSpan={canViewAll?6:3}><EmptyState icon={DollarSign} title="No payroll records" message={isEmployee?`No payslip for ${MONTH_NAMES[parseInt(filterMonth)-1]} ${filterYear} yet.`:`No payroll run for ${MONTH_NAMES[parseInt(filterMonth)-1]} ${filterYear} yet.`} action={canRun?<button className="btn btn-primary btn-sm" onClick={()=>{setRunOpen(true);setRunResult(null);setRunError('');}}>Run Payroll Now</button>:null}/></td></tr>
                :records.map(r=>(
                  <tr key={r.id}>
                    {canViewAll&&<td style={{fontWeight:600}}>{r.employee?.user?.name||'—'}</td>}
                    {canViewAll&&<td className="td-muted">{r.employee?.department?.name||'—'}</td>}
                    {canViewAll&&<td className="td-mono">{r.employee?.empNo||'—'}</td>}
                    <td style={{textAlign:'right',fontWeight:500}}>{fmtMoney(r.baseSalary)}</td>
                    <td style={{textAlign:'right',color:'var(--danger)'}}>{fmtMoney(r.deductions)}</td>
                    <td style={{textAlign:'right',fontWeight:700,color:'var(--success)'}}>{fmtMoney(r.netPay)}</td>
                  </tr>
                ))}
                {records.length>0&&canViewAll&&(
                  <tr style={{background:'var(--bg)',borderTop:'2px solid var(--border)'}}>
                    <td colSpan={3} style={{fontWeight:700,padding:'12px 16px'}}>Total</td>
                    <td style={{textAlign:'right',fontWeight:700}}>{fmtMoney(totals.base)}</td>
                    <td style={{textAlign:'right',fontWeight:700,color:'var(--danger)'}}>{fmtMoney(totals.deductions)}</td>
                    <td style={{textAlign:'right',fontWeight:700,color:'var(--success)'}}>{fmtMoney(totals.net)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {canRun&&<Modal open={runOpen} onClose={()=>{if(!running)setRunOpen(false);}} title="Run Payroll"
          footer={runResult?<button className="btn btn-primary btn-sm" onClick={()=>setRunOpen(false)}>Close</button>:<><button className="btn btn-secondary btn-sm" onClick={()=>setRunOpen(false)} disabled={running}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleRun} disabled={running}><Play size={13}/> {running?'Processing…':'Confirm & Run'}</button></>}
        >
          {runResult?(
            <div>
              <div className="alert alert-success" style={{marginBottom:16}}>Payroll complete for {MONTH_NAMES[parseInt(runMonth)-1]} {runYear}</div>
              {[['Records processed',runResult.records],['Total Base',fmtMoney(runResult.totals?.baseSalary)],['Total Deductions',fmtMoney(runResult.totals?.deductions)],['Total Net Pay',fmtMoney(runResult.totals?.netPay)],['Journal posted',runResult.journalPosted?`Yes (ID: ${runResult.journalId})`:'No']].map(([l,v])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--border-light)',fontSize:'0.8125rem'}}>
                  <span style={{color:'var(--text-secondary)'}}>{l}</span><span style={{fontWeight:600}}>{v}</span>
                </div>
              ))}
            </div>
          ):(
            <>
              {runError&&<div className="alert alert-error">{runError}</div>}
              <p style={{fontSize:'0.875rem',color:'var(--text-secondary)',lineHeight:1.6}}>Generate payroll for all <strong>Active</strong> employees. Existing records for this period will be updated.</p>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Month</label><select className="form-select" value={runMonth} onChange={e=>setRunMonth(e.target.value)}>{MONTH_NAMES.map((m,i)=><option key={i} value={String(i+1)}>{m}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Year</label><select className="form-select" value={runYear} onChange={e=>setRunYear(e.target.value)}>{[2023,2024,2025,2026].map(y=><option key={y} value={String(y)}>{y}</option>)}</select></div>
              </div>
              <label style={{display:'flex',alignItems:'center',gap:8,fontSize:'0.8125rem',cursor:'pointer'}}>
                <input type="checkbox" checked={postJournal} onChange={e=>setPostJournal(e.target.checked)}/>
                <span>Post to General Ledger</span>
              </label>
            </>
          )}
        </Modal>}
      </main>
    </div>
  );
}
