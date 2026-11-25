import React from 'react';

const defaults = {
  enabled: true, connection: 'Bluetooth', paper: '80mm',
  copies: 1, autoPrint: false, showLogo: true, showGst: true
};

export function thermalDefaults(value={}) { return { ...defaults, ...(value || {}) }; }

export default function ThermalPrinter({ settings, onSave, onTest }) {
  const s = thermalDefaults(settings);
  const change = patch => onSave({ ...s, ...patch });
  return <div className="thermal-settings">
    <div><h2>Thermal Printer Settings</h2><p className="hint">58mm / 80mm receipt printing setup</p></div>
    <section className="thermal-settings" style={{maxWidth:760}}>
      <label className="toggle"><span><b>Enable Thermal Printer</b><small>Show thermal receipt option on saved bills</small></span><input type="checkbox" checked={s.enabled} onChange={e=>change({enabled:e.target.checked})}/></label>
      <div className="grid">
        <label>Printer Connection<select value={s.connection} onChange={e=>change({connection:e.target.value})}><option>Bluetooth</option><option>USB</option><option>Wi-Fi</option></select></label>
        <label>Paper Width<select value={s.paper} onChange={e=>change({paper:e.target.value})}><option>58mm</option><option>80mm</option></select></label>
        <label>Copies<select value={s.copies} onChange={e=>change({copies:Number(e.target.value)})}><option value="1">1 Copy</option><option value="2">2 Copies</option></select></label>
      </div>
      <label className="toggle"><span><b>Auto Print After Billing</b><small>Open receipt print after invoice is saved</small></span><input type="checkbox" checked={s.autoPrint} onChange={e=>change({autoPrint:e.target.checked})}/></label>
      <label className="toggle"><span><b>Show Shop Logo</b></span><input type="checkbox" checked={s.showLogo} onChange={e=>change({showLogo:e.target.checked})}/></label>
      <label className="toggle"><span><b>Show GST Details</b></span><input type="checkbox" checked={s.showGst} onChange={e=>change({showGst:e.target.checked})}/></label>
      <div className="actions"><button className="primary" onClick={()=>onSave(s)}>Save Printer Settings</button><button className="secondary" onClick={onTest}>Print Test Receipt</button></div>
      <p className="note" style={{marginTop:14,lineHeight:1.6}}>Connection note: Bluetooth, USB and Wi-Fi printers must first be paired/installed in Android or the computer operating system. The receipt uses the system print dialog; the available printer list depends on the device and installed print service.</p>
    </section>
  </div>;
}
