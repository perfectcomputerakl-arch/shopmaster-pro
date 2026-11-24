import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AuthGate from './Auth.jsx';
import './style.css';

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('App crashed', error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
        <h2>Kuch galat ho gaya</h2>
        <p style={{ color: '#b00', wordBreak: 'break-word' }}>{String(this.state.error?.message || this.state.error)}</p>
        <button onClick={() => location.reload()} style={{ padding: '10px 18px' }}>Reload</button>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary><AuthGate><App /></AuthGate></ErrorBoundary>
);
