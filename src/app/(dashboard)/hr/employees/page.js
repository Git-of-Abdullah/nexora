'use client';
import { useEffect, useState, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Badge from '@/components/ui/Badge';
import Modal, { ConfirmModal } from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Plus, Search, Pencil, Trash2, Users, RefreshCw, User, Mail, Briefcase, Calendar, DollarSign, Building } from 'lucide-react';

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d){if(!d)return'—';const dt=new Date(d);return`${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;}
function fmtSalary(n){return'$'+Number(n).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0});}

const ROLE_OPTS=[
  {value:'general_employee',label:'General Employee'},
  {value:'hr_staff',label:'HR Staff'},{value:'hr_manager',label:'HR Manager'},
  {value:'manufacturing_staff',label:'Manufacturing Staff'},{value:'manufacturing_manager',label:'Manufacturing Manager'},
  {value:'accountant',label:'Accountant'},
  {value:'marketing_staff',label:'Marketing Staff'},{value:'marketing_manager',label:'Marketing Manager'},
  {value:'super_admin',label:'Super Admin'},
];
const EMPTY_FORM={name:'',email:'',password:'',role:'general_employee',departmentId:'',position:'',hireDate:'',salary:'',empNo:''};

function InfoRow({icon:Icon,label,value}){return(<div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border-light)'}}><Icon size={14} style={{color:'var(--text-muted)',flexShrink:0}}/><span style={{fontSize:'0.8rem',color:'var(--text-secondary)',minWidth:100}}>{label}</span><span style={{fontSize:'0.8rem',fontWeight:600,color:'var(--text-primary)'}}>{value||'—'}</span></div>);}

export default function EmployeesPage(){
  const {user}=useAuth();
  const role=user?.role;
  const canAdd   =['super_admin','hr_manager'].includes(role);
  const canEdit  =['super_admin','hr_manager'].includes(role);
  const isEmployee=role==='general_employee';

  const [employees,setEmployees]=useState([]);
  const [myEmp,setMyEmp]=useState(null);
  const [departments,setDepts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [filterStatus,setStatus]=useState('');
  const [filterDept,setDept]=useState('');

  const [addOpen,setAddOpen]=useState(false);
  const [editTarget,setEditTarget]=useState(null);
  const [deleteTarget,setDelTarget]=useState(null);
  const [form,setForm]=useState(EMPTY_FORM);
  const [saving,setSaving]=useState(false);
  const [formError,setFormError]=useState('');

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      if(isEmployee){
        const emp=await api.get('/hr/me');
        setMyEmp(emp);
      } else {
        const emp=await api.get('/hr/employees');
        setEmployees(emp);
        const deptMap={};
        emp.forEach(e=>{if(e.department)deptMap[e.department.id]=e.department.name;});
        setDepts(Object.entries(deptMap).map(([id,name])=>({id:Number(id),name})));
      }
    }catch{setEmployees([]);}
    finally{setLoading(false);}
  },[isEmployee]);

  useEffect(()=>{load();},[load]);

  const filtered=employees.filter(e=>{
    const name=(e.user?.name||'').toLowerCase();
    const q=search.toLowerCase();
    return(!q||name.includes(q)||(e.user?.email||'').toLowerCase().includes(q)||(e.position||'').toLowerCase().includes(q)||e.empNo?.includes(q))
      &&(!filterStatus||e.status===filterStatus)
      &&(!filterDept||String(e.department?.id)===filterDept);
  });

  async function handleSave(){
    setFormError('');setSaving(true);
    try{
      if(editTarget){
        const updated=await api.patch(`/hr/employees/${editTarget.id}`,{
          position:form.position||undefined,
          departmentId:form.departmentId||undefined,
          salary:form.salary||undefined,
          status:form.status||undefined,
          hireDate:form.hireDate||undefined,
        });
        setEmployees(prev=>prev.map(e=>e.id===updated.id?updated:e));
        setEditTarget(null);
      } else {
        const created=await api.post('/hr/employees',{
          name:form.name,email:form.email,password:form.password,
          role:form.role,departmentId:form.departmentId,
          position:form.position,hireDate:form.hireDate,
          salary:form.salary,empNo:form.empNo,
        });
        setEmployees(prev=>[created,...prev]);
        setAddOpen(false);setForm(EMPTY_FORM);
      }
    }catch(err){setFormError(err?.error||'Failed to save employee.');}
    finally{setSaving(false);}
  }

  async function handleDelete(){
    setSaving(true);
    try{
      const updated=await api.patch(`/hr/employees/${deleteTarget.id}`,{status:'Inactive'});
      setEmployees(prev=>prev.map(e=>e.id===updated.id?updated:e));
      setDelTarget(null);
    }catch(err){alert(err?.error||'Failed to deactivate.');}
    finally{setSaving(false);}
  }

  function openEdit(emp){
    setEditTarget(emp);
    setForm({position:emp.position||'',departmentId:String(emp.department?.id||''),salary:String(emp.salary||''),status:emp.status||'Active',hireDate:emp.hireDate?emp.hireDate.split('T')[0]:''});
    setFormError('');
  }

  /* ── Employee: own profile card ── */
  if(isEmployee){
    return(
      <div className="page-wrapper">
        <Topbar title="My Profile" subtitle="Your employee record"/>
        <main className="page-main">
          {loading?<div style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>Loading profile…</div>:!myEmp?
            <div className="card" style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>No employee record found. Contact HR.</div>:
            <div style={{maxWidth:600}}>
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">{myEmp.user?.name}</div>
                    <div className="card-subtitle">{myEmp.empNo} · {myEmp.position}</div>
                  </div>
                  <Badge status={myEmp.status}/>
                </div>
                <div className="card-pad">
                  <InfoRow icon={Mail}     label="Email"      value={myEmp.user?.email}/>
                  <InfoRow icon={Building} label="Department" value={myEmp.department?.name}/>
                  <InfoRow icon={Briefcase}label="Position"   value={myEmp.position}/>
                  <InfoRow icon={Calendar} label="Hire Date"  value={fmtDate(myEmp.hireDate)}/>
                  <InfoRow icon={DollarSign}label="Salary"    value={fmtSalary(myEmp.salary)}/>
                  <InfoRow icon={User}     label="Role"       value={myEmp.user?.role?.replace(/_/g,' ')}/>
                </div>
              </div>
            </div>
          }
        </main>
      </div>
    );
  }

  /* ── HR Staff / Manager: full directory ── */
  return(
    <div className="page-wrapper">
      <Topbar title="Employees" subtitle="Employee directory & records"/>
      <main className="page-main">
        <div className="filters-row" style={{marginBottom:16}}>
          <div style={{position:'relative',flex:'1 1 220px',maxWidth:320}}>
            <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}}/>
            <input className="form-input" placeholder="Search name, email, position…" value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:32}}/>
          </div>
          <select className="form-select" style={{width:'auto'}} value={filterStatus} onChange={e=>setStatus(e.target.value)}>
            <option value="">All Status</option><option>Active</option><option>Inactive</option>
          </select>
          {departments.length>0&&(
            <select className="form-select" style={{width:'auto'}} value={filterDept} onChange={e=>setDept(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map(d=><option key={d.id} value={String(d.id)}>{d.name}</option>)}
            </select>
          )}
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/></button>
          {canAdd&&<button className="btn btn-primary btn-sm" onClick={()=>{setAddOpen(true);setForm(EMPTY_FORM);setFormError('');}}>
            <Plus size={14}/> Add Employee
          </button>}
        </div>

        <div className="card">
          <div className="card-header"><div><div className="card-title">Employee Directory</div><div className="card-subtitle">{filtered.length} of {employees.length} employees</div></div></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Emp No</th><th>Name</th><th>Position</th><th>Department</th><th>Hire Date</th><th>Salary</th><th>Status</th>{canEdit&&<th style={{width:80}}>Actions</th>}</tr></thead>
              <tbody>
                {loading?Array.from({length:5}).map((_,i)=><tr key={i}>{Array.from({length:canEdit?8:7}).map((_,j)=><td key={j}><div className="skeleton" style={{height:14,borderRadius:4,width:'80%'}}/></td>)}</tr>)
                :filtered.length===0?<tr><td colSpan={canEdit?8:7}><EmptyState icon={Users} title="No employees found" message="Try adjusting your filters."/></td></tr>
                :filtered.map(emp=>(
                  <tr key={emp.id}>
                    <td className="td-mono">{emp.empNo}</td>
                    <td><div style={{fontWeight:600}}>{emp.user?.name}</div><div className="td-muted">{emp.user?.email}</div></td>
                    <td>{emp.position}</td>
                    <td className="td-muted">{emp.department?.name||'—'}</td>
                    <td className="td-muted">{fmtDate(emp.hireDate)}</td>
                    <td style={{fontWeight:600}}>{fmtSalary(emp.salary)}</td>
                    <td><Badge status={emp.status}/></td>
                    {canEdit&&<td><div className="table-actions">
                      <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={()=>openEdit(emp)}><Pencil size={13}/></button>
                      {emp.status==='Active'&&<button className="btn btn-ghost btn-sm btn-icon" title="Deactivate" onClick={()=>setDelTarget(emp)} style={{color:'var(--danger)'}}><Trash2 size={13}/></button>}
                    </div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {canAdd&&<Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Add New Employee" size="lg"
          footer={<><button className="btn btn-secondary btn-sm" onClick={()=>setAddOpen(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Create Employee'}</button></>}
        >
          {formError&&<div className="alert alert-error">{formError}</div>}
          <div className="form-row"><div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" placeholder="John Doe" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></div><div className="form-group"><label className="form-label">Emp No *</label><input className="form-input" placeholder="EMP-001" value={form.empNo} onChange={e=>setForm(p=>({...p,empNo:e.target.value}))}/></div></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Email *</label><input type="email" className="form-input" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/></div><div className="form-group"><label className="form-label">Password *</label><input type="password" className="form-input" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))}/></div></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Position *</label><input className="form-input" value={form.position} onChange={e=>setForm(p=>({...p,position:e.target.value}))}/></div><div className="form-group"><label className="form-label">Role</label><select className="form-select" value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}>{ROLE_OPTS.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></div></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Department</label><select className="form-select" value={form.departmentId} onChange={e=>setForm(p=>({...p,departmentId:e.target.value}))}><option value="">Select…</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Hire Date *</label><input type="date" className="form-input" value={form.hireDate} onChange={e=>setForm(p=>({...p,hireDate:e.target.value}))}/></div>
          </div>
          <div className="form-group"><label className="form-label">Monthly Salary *</label><input type="number" className="form-input" placeholder="5000" value={form.salary} onChange={e=>setForm(p=>({...p,salary:e.target.value}))}/></div>
        </Modal>}

        {canEdit&&<Modal open={!!editTarget} onClose={()=>setEditTarget(null)} title="Edit Employee" size="lg"
          footer={<><button className="btn btn-secondary btn-sm" onClick={()=>setEditTarget(null)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save Changes'}</button></>}
        >
          {formError&&<div className="alert alert-error">{formError}</div>}
          <div className="form-row"><div className="form-group"><label className="form-label">Position</label><input className="form-input" value={form.position} onChange={e=>setForm(p=>({...p,position:e.target.value}))}/></div><div className="form-group"><label className="form-label">Monthly Salary</label><input type="number" className="form-input" value={form.salary} onChange={e=>setForm(p=>({...p,salary:e.target.value}))}/></div></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Department</label><select className="form-select" value={form.departmentId} onChange={e=>setForm(p=>({...p,departmentId:e.target.value}))}><option value="">Select…</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Hire Date</label><input type="date" className="form-input" value={form.hireDate} onChange={e=>setForm(p=>({...p,hireDate:e.target.value}))}/></div>
          </div>
          <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}><option>Active</option><option>Inactive</option></select></div>
        </Modal>}

        <ConfirmModal open={!!deleteTarget} onClose={()=>setDelTarget(null)} onConfirm={handleDelete} title="Deactivate Employee" message={`Deactivate ${deleteTarget?.user?.name}? They will lose system access.`} confirmLabel="Deactivate" loading={saving}/>
      </main>
    </div>
  );
}
