import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { LayoutDashboard, Package, Users, FileText, Settings, Plus, Search, Download, Trash2, Menu, X, ShoppingCart, IndianRupee, TrendingUp, AlertTriangle, Store, Save } from 'lucide-react';

const seed = {
  shop: { name: 'YOUR SHOP NAME', phone: '', address: '', gstin: '', email: '', logo: '' },
  products: [
    {id: crypto.randomUUID(), name:'Sample Product', sku:'SKU-001', price:500, purchase:350, stock:20, gst:18, unit:'pcs'}
  ],
  customers: [{id:crypto.randomUUID(), name:'Walk-in Customer', phone:'', email:'', address:''}],
  invoices: []
};
const load = () => { try { return {...seed, ...JSON.parse(localStorage.getItem('shopmaster-data')||'{}')}; } catch { return seed; } };
const money = n => '₹' + Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
const today = () => new Date().toISOString().slice(0,10);

export default function App(){
  const [data,setData] = useState(load);
  const [page,setPage] = useState('Dashboard');
  const [query,setQuery] = useState('');
  const [mobileOpen,setMobileOpen] = useState(false);
  const [notice,setNotice] = useState('');
  useEffect(()=>{localStorage.setItem('shopmaster-data',JSON.stringify(data));},[data]);
  const update = (key,value)=>setData(d=>({...d,[key]:value}));
  const notify = msg=>{setNotice(msg);setTimeout(()=>setNotice(''),2600)};
  const sales = data.invoices.reduce((s,i)=>s+i.total,0);
  const low = data.products.filter(p=>Number(p.stock)<=5).length;
  const nav = [
    ['Dashboard',LayoutDashboard],['Products & Stock',Package],['Customers',Users],['Invoices',FileText],['Shop Profile',Settings]
  ];
  const filtered = (arr,fields)=>arr.filter(x=>fields.some(f=>String(x[f]||'').toLowerCase().includes(query.toLowerCase())));
  const addProduct = ()=>update('products',[...data.products,{id:crypto.randomUUID(),name:'',sku:'',price:0,purchase:0,stock:0,gst:0,unit:'pcs'}]);
  const addCustomer = ()=>update('customers',[...data.customers,{id:crypto.randomUUID(),name:'',phone:'',email:'',address:''}]);
  const addInvoice = ()=>{
    if(!data.products.length){notify('पहले product add करें');return;}
    const customer = data.customers[0] || {name:'Walk-in Customer'};
    const product = data.products[0];
    const qty=1, subtotal=Number(product.price||0)*qty, tax=subtotal*Number(product.gst||0)/100;
    const inv={id:crypto.randomUUID(),number:`SMP-${String(data.invoices.length+1).padStart(4,'0')}`,date:today(),customer:customer.name||'Walk-in Customer',phone:customer.phone||'',items:[{name:product.name||'Product',qty,price:Number(product.price||0),gst:Number(product.gst||0)}],subtotal,tax,total:subtotal+tax,status:'Unpaid'};
    update('invoices',[inv,...data.invoices]);
    update('products',data.products.map(p=>p.id===product.id?{...p,stock:Math.max(0,Number(p.stock)-qty)}:p));
    setPage('Invoices'); notify('Invoice draft बनाया गया');
  };
  const makePDF = inv=>{
    const doc=new jsPDF(); const s=data.shop;
    doc.setFontSize(20);doc.text(s.name||'YOUR SHOP NAME',14,20);
    doc.setFontSize(9);doc.text([s.address,s.phone,s.email,s.gstin?`GSTIN: ${s.gstin}`:''].filter(Boolean).join(' | '),14,27,{maxWidth:180});
    doc.setFontSize(16);doc.text('TAX INVOICE',14,43);
    doc.setFontSize(10);doc.text(`Invoice: ${inv.number}`,14,53);doc.text(`Date: ${inv.date}`,14,59);
    doc.text(`Bill To: ${inv.customer}`,14,67);if(inv.phone)doc.text(`Phone: ${inv.phone}`,14,73);
    let y=88;doc.setFontSize(10);doc.text('Item',14,y);doc.text('Qty',110,y);doc.text('Rate',130,y);doc.text('GST',155,y);doc.text('Amount',180,y,{align:'right'});y+=7;
    inv.items.forEach(it=>{doc.text(String(it.name).slice(0,42),14,y);doc.text(String(it.qty),110,y);doc.text(money(it.price),130,y);doc.text(`${it.gst}%`,155,y);doc.text(money(it.qty*it.price*(1+it.gst/100)),180,y,{align:'right'});y+=8;});
    y+=8;doc.text(`Subtotal: ${money(inv.subtotal)}`,140,y);y+=7;doc.text(`Tax: ${money(inv.tax)}`,140,y);y+=8;doc.setFontSize(13);doc.text(`Grand Total: ${money(inv.total)}`,140,y);
    y+=20;doc.setFontSize(9);doc.text('Thank you for your business!',14,y);
    doc.save(`${inv.number}.pdf`);
  };
  const setInvoiceStatus=(id,status)=>update('invoices',data.invoices.map(i=>i.id===id?{...i,status}:i));
  const remove=(key,id)=>update(key,data[key].filter(x=>x.id!==id));
  const sidebar=<><div className="brand"><div className="brand-icon"><Store size={22}/></div><div><b>SHOPMASTER <span>PRO</span></b><small>BUSINESS MANAGER</small></div></div><div className="nav-label">WORKSPACE</div>{nav.map(([n,I])=><button key={n} className={`nav-item ${page===n?'active':''}`} onClick={()=>{setPage(n);setMobileOpen(false)}}><I size={18}/>{n}</button>)}<div className="sidebar-bottom"><div className="plan"><b>Starter Workspace</b><small>Your business, organized.</small></div><small>SHOPMASTER PRO · v1.0</small></div></>;
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen?'show':''}`}>{sidebar}</aside>{mobileOpen&&<div className="scrim" onClick={()=>setMobileOpen(false)} />}
    <main className="main"><header className="topbar"><button className="icon-btn mobile-menu" onClick={()=>setMobileOpen(!mobileOpen)}>{mobileOpen?<X/>:<Menu/>}</button><div><div className="crumb">Workspace / <b>{page}</b></div><h1>{page}</h1></div><div className="top-right"><div className="avatar">{(data.shop.name||'S').slice(0,1).toUpperCase()}</div><span>{data.shop.name||'My Shop'}</span></div></header>
    <div className="content">
      {notice&&<div className="toast">{notice}</div>}
      {page==='Dashboard'&&<><div className="welcome"><div><h2>Business overview</h2><p>Here’s what’s happening with your shop today.</p></div><button className="primary" onClick={addInvoice}><Plus size={17}/> Create Invoice</button></div>
      <div className="stats"><Stat icon={IndianRupee} label="Total Sales" value={money(sales)} sub={`${data.invoices.length} invoices`}/><Stat icon={FileText} label="Invoices" value={data.invoices.length} sub="All recorded invoices"/><Stat icon={Users} label="Customers" value={data.customers.length} sub="Saved customers"/><Stat icon={Package} label="Products" value={data.products.length} sub={`${low} low-stock items`} alert={low>0}/></div>
      <div className="grid-two"><section className="panel"><div className="panel-head"><div><h3>Recent invoices</h3><p>Your latest billing activity</p></div><button className="text-btn" onClick={()=>setPage('Invoices')}>View all</button></div>{data.invoices.length===0?<Empty text="No invoices yet. Create your first invoice to get started."/>:<div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Total</th></tr></thead><tbody>{data.invoices.slice(0,5).map(i=><tr key={i.id}><td>{i.number}</td><td>{i.customer}</td><td>{i.date}</td><td><b>{money(i.total)}</b></td></tr>)}</tbody></table></div>}</section><section className="panel"><div className="panel-head"><div><h3>Inventory alerts</h3><p>Products with 5 or fewer units</p></div><AlertTriangle size={19} color="#d97706"/></div>{data.products.filter(p=>Number(p.stock)<=5).length===0?<Empty text="All products are sufficiently stocked."/>:data.products.filter(p=>Number(p.stock)<=5).map(p=><div className="alert-row" key={p.id}><div><b>{p.name||'Unnamed product'}</b><small>{p.sku}</small></div><strong>{p.stock} left</strong></div>)}</section></div></>}
      {page==='Products & Stock'&&<><div className="section-actions"><div><h2>Products & Inventory</h2><p>Manage items, prices and available stock.</p></div><button className="primary" onClick={addProduct}><Plus size={17}/> Add Product</button></div><SearchBox value={query} onChange={setQuery}/><div className="panel"><div className="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Purchase</th><th>Selling</th><th>GST</th><th>Stock</th><th></th></tr></thead><tbody>{filtered(data.products,['name','sku']).map(p=><tr key={p.id}><td><input className="cell-input name-input" value={p.name} placeholder="Product name" onChange={e=>update('products',data.products.map(x=>x.id===p.id?{...x,name:e.target.value}:x))}/></td><td><input className="cell-input" value={p.sku} placeholder="SKU" onChange={e=>update('products',data.products.map(x=>x.id===p.id?{...x,sku:e.target.value}:x))}/></td>{['purchase','price','gst','stock'].map(k=><td key={k}><input className="cell-input number" type="number" value={p[k]} onChange={e=>update('products',data.products.map(x=>x.id===p.id?{...x,[k]:e.target.value}:x))}/></td>)}<td><button className="danger-icon" onClick={()=>remove('products',p.id)}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div></div></>}
      {page==='Customers'&&<><div className="section-actions"><div><h2>Customers</h2><p>Keep customer contact details in one place.</p></div><button className="primary" onClick={addCustomer}><Plus size={17}/> Add Customer</button></div><SearchBox value={query} onChange={setQuery}/><div className="panel"><div className="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th><th></th></tr></thead><tbody>{filtered(data.customers,['name','phone','email']).map(c=><tr key={c.id}>{['name','phone','email','address'].map(k=><td key={k}><input className="cell-input" value={c[k]||''} placeholder={k} onChange={e=>update('customers',data.customers.map(x=>x.id===c.id?{...x,[k]:e.target.value}:x))}/></td>)}<td><button className="danger-icon" onClick={()=>remove('customers',c.id)}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div></div></>}
      {page==='Invoices'&&<><div className="section-actions"><div><h2>Invoices & Billing</h2><p>Create, track and download customer invoices.</p></div><button className="primary" onClick={addInvoice}><Plus size={17}/> New Invoice</button></div><div className="panel"><div className="table-wrap"><table><thead><tr><th>Invoice No.</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>PDF</th></tr></thead><tbody>{data.invoices.map(i=><tr key={i.id}><td><b>{i.number}</b></td><td>{i.customer}</td><td>{i.date}</td><td><b>{money(i.total)}</b></td><td><select className="status-select" value={i.status} onChange={e=>setInvoiceStatus(i.id,e.target.value)}><option>Unpaid</option><option>Paid</option><option>Partial</option></select></td><td><button className="download-btn" onClick={()=>makePDF(i)}><Download size={15}/> PDF</button></td></tr>)}</tbody></table>{data.invoices.length===0&&<Empty text="No invoices created yet. Click New Invoice to create a sample invoice."/>}</div></div><p className="hint">Note: New Invoice currently creates a quick draft using the first saved customer and product. A full item-by-item invoice editor is the next build step.</p></>}
      {page==='Shop Profile'&&<><div className="section-actions"><div><h2>Shop Profile</h2><p>Your business identity appears on generated PDFs.</p></div><button className="primary" onClick={()=>notify('Shop profile saved automatically')}><Save size={17}/> Save Profile</button></div><div className="panel form-panel"><div className="logo-upload"><div className="logo-preview">{data.shop.logo?<img src={data.shop.logo}/>:<Store size={30}/>}</div><div><b>Shop logo</b><p>Upload your shop logo for invoice branding.</p><label className="secondary file-label">Upload Logo<input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>update('shop',{...data.shop,logo:r.result});r.readAsDataURL(f)}}/></label></div></div><div className="form-grid">{[['name','Shop / Business Name'],['phone','Phone Number'],['email','Email Address'],['gstin','GSTIN'],['address','Business Address']].map(([k,l])=><label className={k==='address'?'wide':''} key={k}>{l}<input value={data.shop[k]||''} onChange={e=>update('shop',{...data.shop,[k]:e.target.value})} placeholder={l}/></label>)}</div></div></>}
      <footer>© 2026 SHOPMASTER PRO <span>·</span> Your Complete Business Management System</footer>
    </div></main></div>;
}
function Stat({icon:Icon,label,value,sub,alert}){return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className={`stat-icon ${alert?'warn':''}`}><Icon size={18}/></div></div><strong>{value}</strong><small>{sub}</small></div>}
function Empty({text}){return <div className="empty"><div className="empty-icon"><ShoppingCart size={20}/></div>{text}</div>}
function SearchBox({value,onChange}){return <div className="search-box"><Search size={17}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder="Search by name, SKU or phone..."/></div>}