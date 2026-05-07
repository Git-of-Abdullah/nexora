'use client';
import { useEffect, useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import { KPICard } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Factory, Users, FileText, Megaphone, TrendingUp, Clock, Briefcase, DollarSign, Calendar } from 'lucide-react';

function fmt(n) { return n==null?'—':Number(n).toLocaleString(); }
function fmtC(n) { return '$'+Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0}); }
function StatRow({label,value,accent}){return(<div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border-light)'}}><span style={{fontSize:'0.8125rem',color:'var(--text-secondary)'}}>{label}</span><span style={{fontSize:'0.8125rem',fontWeight:700,color:accent?'var(--accent)':'var(--text-primary)'}}>{value}</span></div>);}

/* ── Role groups ── */
const IS_HR   = r => ['super_admin','hr_manager','hr_staff'].includes(r);
const IS_MFG  = r => ['super_admin','manufacturing_manager','manufacturing_staff'].includes(r);
const IS_ACC  = r => ['super_admin','accountant'].includes(r);
const IS_MKT  = r => ['super_admin','marketing_manager','marketing_staff'].includes(r);
const IS_ADMIN= r => r==='super_admin';
const IS_EMP  = r => r==='general_employee';

/* Quick links per role */
const LINKS = {
  super_admin:           [{href:'/manufacturing/orders',label:'Production Orders',icon:Factory},{href:'/hr/employees',label:'Employees',icon:Users},{href:'/accounting/invoices',label:'Invoices',icon:FileText},{href:'/marketing/campaigns',label:'Campaigns',icon:Megaphone},{href:'/accounting/reports',label:'Reports',icon:TrendingUp}],
  hr_manager:            [{href:'/hr/employees',label:'Employees',icon:Users},{href:'/hr/attendance',label:'Attendance',icon:Clock},{href:'/hr/leave',label:'Leave Requests',icon:Briefcase},{href:'/hr/payroll',label:'Payroll',icon:DollarSign}],
  hr_staff:              [{href:'/hr/employees',label:'Employee Directory',icon:Users},{href:'/hr/attendance',label:'Attendance',icon:Clock},{href:'/hr/leave',label:'Leave Requests',icon:Briefcase}],
  manufacturing_manager: [{href:'/manufacturing/orders',label:'Production Orders',icon:Factory},{href:'/manufacturing/inventory',label:'Inventory',icon:Factory},{href:'/manufacturing/quality',label:'Quality Checks',icon:Factory}],
  manufacturing_staff:   [{href:'/manufacturing/orders',label:'View Orders',icon:Factory},{href:'/manufacturing/inventory',label:'View Inventory',icon:Factory},{href:'/manufacturing/quality',label:'Quality Checks',icon:Factory}],
  accountant:            [{href:'/accounting/invoices',label:'Invoices',icon:FileText},{href:'/accounting/bills',label:'Bills',icon:FileText},{href:'/accounting/reports',label:'Reports',icon:TrendingUp}],
  marketing_manager:     [{href:'/marketing/campaigns',label:'Campaigns',icon:Megaphone},{href:'/marketing/leads',label:'Lead Pipeline',icon:Users}],
  marketing_staff:       [{href:'/marketing/campaigns',label:'Campaigns',icon:Megaphone},{href:'/marketing/leads',label:'Leads',icon:Users}],
  general_employee:      [{href:'/hr/attendance',label:'My Attendance',icon:Clock},{href:'/hr/leave',label:'My Leave',icon:Briefcase},{href:'/hr/payroll',label:'My Payslip',icon:DollarSign}],
};

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role;
  const [d, setD] = useState({});
  const [myEmp, setMyEmp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!role) return;
    async function load() {
      setLoading(true);
      const calls = [];
      if (IS_MFG(role))  calls.push(api.get('/manufacturing/orders').then(v=>({orders:v})).catch(()=>({orders:[]})));
      if (IS_HR(role))   calls.push(api.get('/hr/employees').then(v=>({employees:v})).catch(()=>({employees:[]})));
      if (IS_ACC(role))  calls.push(api.get('/accounting/invoices').then(v=>({invoices:v})).catch(()=>({invoices:[]})));
      if (IS_ACC(role))  calls.push(api.get('/accounting/bills').then(v=>({bills:v})).catch(()=>({bills:[]})));
      if (IS_MKT(role))  calls.push(api.get('/marketing/campaigns').then(v=>({campaigns:v})).catch(()=>({campaigns:[]})));
      if (IS_HR(role))   calls.push(api.get('/hr/leave-requests').then(v=>({leaves:v})).catch(()=>({leaves:[]})));
      if (IS_EMP(role))  calls.push(api.get('/hr/me').then(v=>({myEmp:v})).catch(()=>({myEmp:null})));
      if (IS_EMP(role))  calls.push(api.get('/hr/attendance').then(v=>({attendance:v})).catch(()=>({attendance:[]})));
      if (IS_EMP(role))  calls.push(api.get('/hr/leave-requests').then(v=>({leaves:v})).catch(()=>({leaves:[]})));
      const results = await Promise.all(calls);
      const merged = Object.assign({}, ...results);
      if (merged.myEmp) setMyEmp(merged.myEmp);
      setD(merged);
      setLoading(false);
    }
    load();
  }, [role]);

  const links = LINKS[role] || [];

  /* ── KPIs by role ── */
  const renderKPIs = () => {
    if (IS_ADMIN(role)) {
      const orders=d.orders||[], emps=d.employees||[], invs=d.invoices||[], camps=d.campaigns||[];
      return (<div className="grid-4" style={{marginBottom:24}}>
        <KPICard label="Production Orders" value={loading?'…':fmt(orders.length)} icon={Factory} iconBg="var(--accent-light)" iconColor="var(--accent)" trendLabel={`${orders.filter(o=>o.status==='In Production').length} in production`}/>
        <KPICard label="Active Employees" value={loading?'…':fmt(emps.filter(e=>e.status==='Active').length)} icon={Users} iconBg="rgba(30,107,60,0.1)" iconColor="var(--success)" trendLabel={`${emps.length} total`}/>
        <KPICard label="Open Invoices" value={loading?'…':fmt(invs.filter(i=>['Pending','Sent','Partial'].includes(i.status)).length)} icon={FileText} iconBg="var(--warning-bg)" iconColor="var(--warning)" trendLabel={`${invs.filter(i=>i.status==='Overdue').length} overdue`}/>
        <KPICard label="Active Campaigns" value={loading?'…':fmt(camps.filter(c=>c.status==='Active').length)} icon={Megaphone} iconBg="rgba(124,58,237,0.1)" iconColor="#7C3AED" trendLabel={`${camps.length} total`}/>
      </div>);
    }
    if (IS_HR(role) && !IS_EMP(role)) {
      const emps=d.employees||[], leaves=d.leaves||[];
      return (<div className="grid-4" style={{marginBottom:24}}>
        <KPICard label="Total Employees" value={loading?'…':fmt(emps.length)} icon={Users} iconBg="var(--accent-light)" iconColor="var(--accent)" trendLabel="all records"/>
        <KPICard label="Active" value={loading?'…':fmt(emps.filter(e=>e.status==='Active').length)} icon={Users} iconBg="rgba(30,107,60,0.1)" iconColor="var(--success)" trendLabel="currently employed"/>
        <KPICard label="Pending Leave" value={loading?'…':fmt(leaves.filter(l=>l.status==='Pending').length)} icon={Briefcase} iconBg="var(--warning-bg)" iconColor="var(--warning)" trendLabel="awaiting approval"/>
        <KPICard label="Departments" value={loading?'…':fmt([...new Set(emps.map(e=>e.department?.name).filter(Boolean))].length)} icon={Users} iconBg="var(--bg)" iconColor="var(--text-secondary)" trendLabel="active depts"/>
      </div>);
    }
    if (IS_MFG(role)) {
      const orders=d.orders||[];
      return (<div className="grid-4" style={{marginBottom:24}}>
        <KPICard label="Total Orders" value={loading?'…':fmt(orders.length)} icon={Factory} iconBg="var(--accent-light)" iconColor="var(--accent)" trendLabel={`${orders.filter(o=>o.status==='In Production').length} in production`}/>
        <KPICard label="Scheduled" value={loading?'…':fmt(orders.filter(o=>o.status==='Scheduled').length)} icon={Calendar} iconBg="var(--warning-bg)" iconColor="var(--warning)" trendLabel="upcoming"/>
        <KPICard label="Quality Check" value={loading?'…':fmt(orders.filter(o=>o.status==='Quality Check').length)} icon={Factory} iconBg="rgba(124,58,237,0.1)" iconColor="#7C3AED" trendLabel="pending QC"/>
        <KPICard label="Completed" value={loading?'…':fmt(orders.filter(o=>o.status==='Completed').length)} icon={Factory} iconBg="rgba(30,107,60,0.1)" iconColor="var(--success)" trendLabel="this month"/>
      </div>);
    }
    if (IS_ACC(role)) {
      const invs=d.invoices||[], bills=d.bills||[];
      const rev=invs.filter(i=>i.status==='Paid').reduce((s,i)=>s+Number(i.amount||0),0);
      return (<div className="grid-4" style={{marginBottom:24}}>
        <KPICard label="Total Revenue" value={loading?'…':fmtC(rev)} icon={TrendingUp} iconBg="rgba(30,107,60,0.1)" iconColor="var(--success)" trendLabel="paid invoices"/>
        <KPICard label="Open Invoices" value={loading?'…':fmt(invs.filter(i=>['Pending','Sent','Partial'].includes(i.status)).length)} icon={FileText} iconBg="var(--accent-light)" iconColor="var(--accent)" trendLabel="awaiting payment"/>
        <KPICard label="Overdue Invoices" value={loading?'…':fmt(invs.filter(i=>i.status==='Overdue').length)} icon={FileText} iconBg="var(--danger-bg)" iconColor="var(--danger)" trendLabel="need follow-up"/>
        <KPICard label="Unpaid Bills" value={loading?'…':fmt(bills.filter(b=>b.status!=='Paid').length)} icon={FileText} iconBg="var(--warning-bg)" iconColor="var(--warning)" trendLabel="outstanding payables"/>
      </div>);
    }
    if (IS_MKT(role)) {
      const camps=d.campaigns||[];
      return (<div className="grid-4" style={{marginBottom:24}}>
        <KPICard label="Total Campaigns" value={loading?'…':fmt(camps.length)} icon={Megaphone} iconBg="rgba(124,58,237,0.1)" iconColor="#7C3AED" trendLabel="all time"/>
        <KPICard label="Active" value={loading?'…':fmt(camps.filter(c=>c.status==='Active').length)} icon={Megaphone} iconBg="rgba(30,107,60,0.1)" iconColor="var(--success)" trendLabel="running now"/>
        <KPICard label="Total Budget" value={loading?'…':fmtC(camps.reduce((s,c)=>s+Number(c.budget||0),0))} icon={TrendingUp} iconBg="var(--accent-light)" iconColor="var(--accent)" trendLabel="all campaigns"/>
        <KPICard label="Planning" value={loading?'…':fmt(camps.filter(c=>c.status==='Planning').length)} icon={Calendar} iconBg="var(--warning-bg)" iconColor="var(--warning)" trendLabel="upcoming"/>
      </div>);
    }
    if (IS_EMP(role)) {
      const att=d.attendance||[], leaves=d.leaves||[];
      const todayAtt = att.find(a=>new Date(a.date).toDateString()===new Date().toDateString());
      return (<div className="grid-4" style={{marginBottom:24}}>
        <KPICard label="Today's Status" value={loading?'…':(todayAtt?.status||'Not Logged')} icon={Clock} iconBg="var(--accent-light)" iconColor="var(--accent)" trendLabel={todayAtt?.clockIn?`In: ${new Date(todayAtt.clockIn).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`:'Clock in below'}/>
        <KPICard label="Days Present" value={loading?'…':fmt(att.filter(a=>a.status==='Present').length)} icon={Users} iconBg="rgba(30,107,60,0.1)" iconColor="var(--success)" trendLabel="last 30 days"/>
        <KPICard label="My Leave Requests" value={loading?'…':fmt(leaves.length)} icon={Briefcase} iconBg="var(--warning-bg)" iconColor="var(--warning)" trendLabel={`${leaves.filter(l=>l.status==='Pending').length} pending`}/>
        <KPICard label="Role" value={user?.name?.split(' ')[0]||'—'} icon={Users} iconBg="var(--bg)" iconColor="var(--text-secondary)" trendLabel={role?.replace(/_/g,' ')}/>
      </div>);
    }
    return null;
  };

  return (
    <div className="page-wrapper">
      <Topbar title="Dashboard" subtitle={IS_EMP(role)?`Welcome back, ${user?.name?.split(' ')[0]}!`:"Overview of your department"}/>
      <main className="page-main">
        {renderKPIs()}

        {/* Quick Links */}
        <div className="card">
          <div className="card-header"><div className="card-title">Quick Access</div></div>
          <div className="card-pad" style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {links.map(({href,label,icon:Icon})=>(
              <a key={href} href={href} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 14px',borderRadius:8,background:'var(--bg)',border:'1px solid var(--border)',textDecoration:'none',fontSize:'0.8125rem',fontWeight:500,color:'var(--text-primary)',transition:'border-color 0.15s'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
              >
                <Icon size={14} style={{color:'var(--accent)'}}/> {label}
              </a>
            ))}
          </div>
        </div>

        {/* Role-specific detail panels */}
        {IS_ADMIN(role) && d.orders && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginTop:16}}>
            <div className="card"><div className="card-header"><div className="card-title">Manufacturing</div></div><div className="card-pad">
              {['Draft','Scheduled','In Production','Quality Check','Completed'].map(s=><StatRow key={s} label={s} value={fmt((d.orders||[]).filter(o=>o.status===s).length)} accent={s==='In Production'}/>)}
            </div></div>
            <div className="card"><div className="card-header"><div className="card-title">Accounting</div></div><div className="card-pad">
              <StatRow label="Total Revenue (Paid)" value={fmtC((d.invoices||[]).filter(i=>i.status==='Paid').reduce((s,i)=>s+Number(i.amount||0),0))} accent/>
              <StatRow label="Open Invoices" value={fmt((d.invoices||[]).filter(i=>['Pending','Sent','Partial'].includes(i.status)).length)}/>
              <StatRow label="Overdue Invoices" value={fmt((d.invoices||[]).filter(i=>i.status==='Overdue').length)}/>
              <StatRow label="Unpaid Bills" value={fmt((d.bills||[]).filter(b=>b.status!=='Paid').length)}/>
            </div></div>
            <div className="card"><div className="card-header"><div className="card-title">HR Overview</div></div><div className="card-pad">
              <StatRow label="Total Employees" value={fmt((d.employees||[]).length)} accent/>
              <StatRow label="Active" value={fmt((d.employees||[]).filter(e=>e.status==='Active').length)}/>
              <StatRow label="Pending Leave" value={fmt((d.leaves||[]).filter(l=>l.status==='Pending').length)}/>
            </div></div>
          </div>
        )}
      </main>
    </div>
  );
}
