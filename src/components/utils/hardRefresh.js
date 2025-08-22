// src/components/utils/hardRefresh.js
function showReloadOverlay(message = 'Refreshing…') {
  if (document.getElementById('ll-reload-overlay')) return;
  const el = document.createElement('div');
  el.id = 'll-reload-overlay';
  el.style.cssText = [
    'position:fixed','inset:0','z-index:2147483647','display:flex',
    'align-items:center','justify-content:center','background:rgba(0,0,0,0.6)',
    'backdrop-filter:saturate(1.2) blur(2px)','color:white',
    'font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial',
    'font-size:18px','letter-spacing:.2px'
  ].join(';');

  const inner = document.createElement('div');
  inner.style.cssText = [
    'display:flex','align-items:center','gap:12px','padding:16px 20px',
    'border-radius:10px','background:rgba(20,20,20,0.7)',
    'box-shadow:0 10px 30px rgba(0,0,0,0.35)'
  ].join(';');

  const spinner = document.createElement('div');
  spinner.style.cssText = [
    'width:18px','height:18px','border-radius:50%',
    'border:3px solid rgba(255,255,255,0.35)','border-top-color:white',
    'animation:llspin .8s linear infinite'
  ].join(';');

  const text = document.createElement('span');
  text.textContent = message;

  inner.appendChild(spinner);
  inner.appendChild(text);
  el.appendChild(inner);
  document.body.appendChild(el);

  const styleTag = document.createElement('style');
  styleTag.textContent = '@keyframes llspin{to{transform:rotate(360deg)}}';
  document.head.appendChild(styleTag);
}

// Light path for localhost; heavy path for packaged/PWA
export async function refreshAfterImport(path = '/settings', forceHeavy = false) {
  showReloadOverlay('Refreshing…');
  await new Promise(r => requestAnimationFrame(r));

  const isLocal =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1';

  if (isLocal && !forceHeavy) {
    // DEV: don’t touch SW/caches—just reload
    window.location.replace(path);
    return;
  }

  // PROD/PWA: safe heavy refresh
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        try {
          // Safer: fully unregister then reload
          await reg.unregister();
        } catch {}
      }
    }
    if ('caches' in window) {
      const names = await caches.keys();
      // Delete only obvious app caches; adjust as needed
      await Promise.all(
        names
          .filter(n =>
            /workbox|precache|vite|pwa|base44-cache/i.test(n)
          )
          .map(n => caches.delete(n))
      );
    }
  } catch (e) {
    console.warn('refreshAfterImport warning:', e);
  }

  // tiny delay to let unregister settle
  setTimeout(() => window.location.replace(path), 100);
}