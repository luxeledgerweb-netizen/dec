import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AutoSnapshotManager } from '@/components/utils/AutoSnapshotManager';

if (Capacitor.getPlatform() === 'ios') {
  try {
    // Try to push the webview below the status bar
    StatusBar.setOverlaysWebView({ overlay: false })
      .catch(() => {
        document.body.style.paddingTop = '44px';
      });
  } catch (e) {
    // Fallback in case plugin fails entirely
    document.body.style.paddingTop = '44px';
  }
}

window.AutoSnapshotManager = AutoSnapshotManager;

ReactDOM.createRoot(document.getElementById('root')).render(<App />);