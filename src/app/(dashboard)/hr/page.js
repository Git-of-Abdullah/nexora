'use client';
import { useEffect, useState, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import { KPICard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Users, UserCheck, UserX, Clock, Briefcase, TrendingUp, ArrowRight, DollarSign, Calendar } from 'lucide-react';
import Link from 'next/link';

function fmt(n){return n==null?'—':Number(n).toLocaleString();}
function fmtDate(d){if(!d)return'—';const dt=new Date(d);return`${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;}

const HR_ADMIN = ['super_admin','hr_manager'];
const HR_ROLES = ['super_admin','hr_manager','hr_staff'];

export default function HRPage() {
  const { user } = useAuth();
  const role = user?.role;
  const isHRAdmin = HR_ADMIN.includes(role);
  const isHRStaff = role === 'hr_staff';
  const isEmployee = role === 'general_employee';

  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves]       = useState([]);
  const [myEmp, setMyEmp]         = useState(null);
  const [myAtt, setMyAtt]         = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      if (isEmployee) {
        const [emp, att, lv] = await Promise.allSettled([
          api.get('/hr/me'),
          api.get('/hr/attendance'),
          api.get('/hr/leave-requests'),
        ]);
        if (emp.status==='fulfilled') setMyEmp(emp.value);
        if (att.status==='fulfilled') setMyAtt(att.value);
        if (lv.status==='fulfilled')  setLeaves(lv.value);
      } else {
        const [emp, lv] = await Promise.allSettled([
          api.get('/hr/employees'),
          api.get('/hr/leave-requests'),
        ]);
        if (emp.status==='fulfilled') setEmployees(emp.value);
        if (lv.status==='fulfilled')  setLeaves(lv.value);
      }
      setLoading(false);
    }
    load();
  }, [role]);

  /* ── General Employee View ── */
  if (isEmployee) {
    const todayAtt = myAtt.find(a=>new Date(a.date).toDateString()===new Date().toDateString());
    const myLeaves = leaves;
    const LINKS = [
      {href:'/hr/attendance',label:'Log My Attendance',icon:Clock,color:'var(--accent)'},
      {href:'/hr/leave',label:'Apply for Leave',icon:Briefcase,color:'var(--warning)'},
      {href:'/hr/payroll',label:'My Payslip',icon:DollarSign,color:'var(--success)'},
    ];
    return (
      <div className="page-wrapper">
        <Topbar title="My HR Portal" subtitle={`Welcome, ${user?.name} · ${myEmp?.empNo||''}`}/>
        <main className="page-main">
          <div className="grid-4" style={{marginBottom:24}}>
            <KPICard label="Today's Status" value={loading?'…':(todayAtt?.status||'Not Logged')} icon={Clock} iconBg="var(--accent-light)" iconColor="var(--accent)" trendLabel={todayAtt?`In: ${new Date(todayAtt.clockIn||Date.now()).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`:'Mark attendance below'}/>
            <KPICard label="Days Present" value={loading?'…':fmt(myAtt.filter(a=>a.status==='Present').length)} icon={UserCheck} iconBg="rgba(30,107,60,0.1)" iconColor="var(--success)" trendLabel="last 30 days"/>
            <KPICard label="My Leave Requests" value={loading?'…':fmt(myLeaves.length)} icon={Briefcase} iconBg="var(--warning-bg)" iconColor="var(--warning)" trendLabel={`${myLeaves.filter(l=>l.status==='Pending').length} pending`}/>
            <KPICard label="Department" value={loading?'…':(myEmp?.department?.name||'—')} icon={Users} iconBg="var(--bg)" iconColor="var(--text-secondary)" trendLabel={myEmp?.position||''}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div className="card">
              <div className="card-header"><div className="card-title">My Quick Links</div></div>
              <div className="card-pad" style={{display:'flex',flexDirection:'column',gap:8}}>
                {LINKS.map(({href,label,icon:Icon,color})=>(
                  <Link key={href} href={href} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',borderRadius:8,border:'1px solid var(--border)',textDecoration:'none',transition:'border-color 0.15s'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=color;e.currentTarget.style.background='var(--bg)';}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='none';}}
                  >
                    <div style={{width:34,height:34,borderRadius:8,background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Icon size={16} style={{color}}/></div>
                    <span style={{flex:1,fontSize:'0.875rem',fontWeight:500,color:'var(--text-primary)'}}>{label}</span>
                    <ArrowRight size={14} style={{color:'var(--text-muted)'}}/>
                  </Link>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">My Recent Leave</div><Link href="/hr/leave" style={{fontSize:'0.8rem',color:'var(--accent)',fontWeight:600,textDecoration:'none'}}>View all</Link></div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Type</th><th>From</th><th>Status</th></tr></thead>
                  <tbody>
                    {loading?<tr><td colSpan={3} style={{textAlign:'center',padding:24,color:'var(--text-muted)'}}>Loading…</td></tr>
                    :myLeaves.length===0?<tr><td colSpan={3} style={{textAlign:'center',padding:24,color:'var(--text-muted)'}}>No leave requests yet</td></tr>
                    :myLeaves.slice(0,5).map(l=><tr key={l.id}><td>{l.type}</td><td className="td-muted">{fmtDate(l.fromDate)}</td><td><Badge status={l.status}/></td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ── HR Staff / Manager View ── */
  const active  = employees.filter(e=>e.status==='Active').length;
  const inactive= employees.filter(e=>e.status==='Inactive').length;
  const pending  = leaves.filter(l=>l.status==='Pending').length;

  const HR_LINKS = [
    {href:'/hr/employees', label:'Employee Directory', icon:Users,      color:'var(--accent)'},
    {href:'/hr/attendance',label:'Attendance Register',icon:Clock,      color:'var(--warning)'},
    {href:'/hr/leave',     label:'Leave Requests',     icon:Briefcase,  color:'var(--success)'},
    ...(isHRAdmin?[{href:'/hr/payroll',label:'Payroll',icon:TrendingUp,color:'#7C3AED'}]:[]),
  ];

  return (
    <div className="page-wrapper">
      <Topbar title="Human Resources" subtitle="Manage employees, attendance, leave and payroll"/>
      <main className="page-main">
        <div className="grid-4" style={{marginBottom:24}}>
          <KPICard label="Total Employees" value={loading?'…':fmt(employees.length)} icon={Users} iconBg="var(--accent-light)" iconColor="var(--accent)" trendLabel="all records"/>
          <KPICard label="Active" value={loading?'…':fmt(active)} icon={UserCheck} iconBg="rgba(30,107,60,0.1)" iconColor="var(--success)" trendLabel="currently employed"/>
          <KPICard label="Inactive" value={loading?'…':fmt(inactive)} icon={UserX} iconBg="var(--danger-bg)" iconColor="var(--danger)" trendLabel="offboarded"/>
          <KPICard label="Pending Leave" value={loading?'…':fmt(pending)} icon={Briefcase} iconBg="var(--warning-bg)" iconColor="var(--warning)" trendLabel="awaiting approval"/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div className="card">
            <div className="card-header"><div className="card-title">HR Modules</div></div>
            <div className="card-pad" style={{display:'flex',flexDirection:'column',gap:8}}>
              {HR_LINKS.map(({href,label,icon:Icon,color})=>(
                <Link key={href} href={href} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',borderRadius:8,border:'1px solid var(--border)',textDecoration:'none',transition:'border-color 0.15s'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=color;e.currentTarget.style.background='var(--bg)';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='none';}}
                >
                  <div style={{width:34,height:34,borderRadius:8,background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Icon size={16} style={{color}}/></div>
                  <span style={{flex:1,fontSize:'0.875rem',fontWeight:500,color:'var(--text-primary)'}}>{label}</span>
                  <ArrowRight size={14} style={{color:'var(--text-muted)'}}/>
                </Link>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Recent Leave Requests</div><Link href="/hr/leave" style={{fontSize:'0.8rem',color:'var(--accent)',fontWeight:600,textDecoration:'none'}}>View all</Link></div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Employee</th><th>Type</th><th>Status</th></tr></thead>
                <tbody>
                  {loading?<tr><td colSpan={3} style={{textAlign:'center',padding:24,color:'var(--text-muted)'}}>Loading…</td></tr>
                  :leaves.length===0?<tr><td colSpan={3} style={{textAlign:'center',padding:24,color:'var(--text-muted)'}}>No leave requests</td></tr>
                  :leaves.slice(0,6).map(l=><tr key={l.id}><td style={{fontWeight:500}}>{l.employee?.user?.name||'—'}</td><td className="td-muted">{l.type}</td><td><Badge status={l.status}/></td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
