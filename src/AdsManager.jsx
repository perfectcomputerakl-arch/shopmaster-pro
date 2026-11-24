import React, { useMemo, useState, useRef } from 'react';
import {
  Megaphone, Plus, Trash2, Eye, MousePointerClick,
  ToggleLeft, ToggleRight, Download, Upload
} from 'lucide-react';

const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  `ad-${Date.now()}-${Math.random()}`;

export default function AdsManager({ ads = [], onChange, isPro }) {
  const [form, setForm] = useState({
    title: '',
    image: '',
    url: '',
    type: 'own',
    enabled: true,
    start: '',
    end: ''
  });

  const fileRef = useRef(null);

  const active = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return ads.filter(a =>
      a.enabled &&
      (!a.start || a.start <= today) &&
      (!a.end || a.end >= today)
    );
  }, [ads]);

  // SAVE BANNER
  const save = () => {
    if (!form.title.trim() || !form.image) {
      alert('Title aur banner image zaroori hai');
      return;
    }

    onChange([
      { ...form, id: uid(), impressions: 0, clicks: 0 },
      ...ads
    ]);

    setForm({
      title: '',
      image: '',
      url: '',
      type: 'own',
      enabled: true,
      start: '',
      end: ''
    });
  };

  // IMAGE UPLOAD
  const upload = f => {
    if (!f) return;

    const r = new FileReader();

    r.onload = () => {
      setForm(x => ({ ...x, image: r.result }));
    };

    r.readAsDataURL(f);
  };

  // DOWNLOAD BANNERS.JSON
  const downloadJSON = () => {
    try {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        banners: ads
      };

      const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: 'application/json;charset=utf-8' }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = 'banners.json';

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      alert('JSON download nahi ho saka: ' + error.message);
    }
  };

  // IMPORT BANNERS.JSON
  const importJSON = async event => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const imported = Array.isArray(parsed)
        ? parsed
        : parsed.banners;

      if (!Array.isArray(imported)) {
        throw new Error('Invalid banners.json file');
      }

      const valid = imported.every(a =>
        a &&
        typeof a === 'object' &&
        typeof a.title === 'string'
      );

      if (!valid) {
        throw new Error('Banner data sahi format mein nahi hai');
      }

      const cleaned = imported.map(a => ({
        id: a.id || uid(),
        title: a.title || '',
        image: a.image || '',
        url: a.url || '',
        type: a.type || 'own',
        enabled: a.enabled !== false,
        start: a.start || '',
        end: a.end || '',
        impressions: Number(a.impressions) || 0,
        clicks: Number(a.clicks) || 0
      }));

      if (!confirm(
        `${cleaned.length} banners import honge. Current banners replace ho jayenge. Continue karein?`
      )) {
        return;
      }

      onChange(cleaned);

      alert('Banners successfully import ho gaye!');
    } catch (error) {
      alert('Import failed: ' + error.message);
    } finally {
      event.target.value = '';
    }
  };

  // PAUSE / ENABLE
  const toggle = id =>
    onChange(ads.map(a =>
      a.id === id ? { ...a, enabled: !a.enabled } : a
    ));

  // DELETE
  const remove = id => {
    if (confirm('Is banner ko delete karein?')) {
      onChange(ads.filter(a => a.id !== id));
    }
  };

  return (
    <div className="content">

      <div className="section-actions">
        <div>
          <h2><Megaphone size={20} /> Advertisement Manager</h2>
          <p>Apne promotional banners manage karein.</p>
        </div>
      </div>

      <div className="panel form-panel">
        <h3>Add your own banner</h3>

        <div className="form-grid">

          <label>
            Banner title
            <input
              value={form.title}
              onChange={e => setForm({
                ...form,
                title: e.target.value
              })}
            />
          </label>

          <label>
            Click destination URL / WhatsApp link
            <input
              value={form.url}
              placeholder="https://..."
              onChange={e => setForm({
                ...form,
                url: e.target.value
              })}
            />
          </label>

          <label>
            Start date (optional)
            <input
              type="date"
              value={form.start}
              onChange={e => setForm({
                ...form,
                start: e.target.value
              })}
            />
          </label>

          <label>
            End date (optional)
            <input
              type="date"
              value={form.end}
              onChange={e => setForm({
                ...form,
                end: e.target.value
              })}
            />
          </label>

          <label className="wide">
            Banner image
            <input
              type="file"
              accept="image/*"
              onChange={e => upload(e.target.files?.[0])}
            />
          </label>

          {form.image && (
            <div className="wide">
              <img
                src={form.image}
                alt="Banner preview"
                style={{
                  width: '100%',
                  maxHeight: 150,
                  objectFit: 'contain',
                  borderRadius: 10
                }}
              />
            </div>
          )}

        </div>

        <button
          className="primary"
          style={{ marginTop: 14 }}
         
