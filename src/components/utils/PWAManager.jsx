import { useEffect } from 'react';
import { localDb } from './LocalDb';

const PWAManager = () => {
  useEffect(() => {
    // Enhanced service worker registration with mobile/PWA optimizations
    if ('serviceWorker' in navigator && (window.location.hostname === 'localhost' || window.location.protocol === 'https:' || window.location.search.includes('pwa=true'))) {
      const registerSW = async () => {
        try {
          // Enhanced service worker code with better mobile/offline support
          const swCode = `
            const CACHE_NAME = 'luxe-ledger-v2';
            const STATIC_CACHE = 'luxe-ledger-static-v2';

            // Enhanced cache strategy for PWA
            const urlsToCache = [
              '/',
              '/static/js/bundle.js',
              '/static/css/main.css',
              '/manifest.json',
              '/favicon.ico'
            ];

            // Install event with better error handling
            self.addEventListener('install', (event) => {
              event.waitUntil(
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    console.log('Service Worker: Caching app shell');
                    return cache.addAll(urlsToCache.map(url => {
                      return new Request(url, { 
                        cache: 'reload',
                        mode: 'cors',
                        credentials: 'same-origin'
                      });
                    }));
                  })
                  .then(() => {
                    console.log('Service Worker: App shell cached successfully');
                    return self.skipWaiting();
                  })
                  .catch((error) => {
                    console.error('Service Worker: Cache installation failed', error);
                    // Continue with installation even if some resources fail to cache
                    return self.skipWaiting();
                  })
              );
            });

            // Enhanced activate event
            self.addEventListener('activate', (event) => {
              event.waitUntil(
                Promise.all([
                  caches.keys().then((cacheNames) => {
                    return Promise.all(
                      cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
                          console.log('Service Worker: Deleting old cache', cacheName);
                          return caches.delete(cacheName);
                        }
                      })
                    );
                  }),
                  self.clients.claim()
                ]).then(() => {
                  console.log('Service Worker: Activation complete');
                })
              );
            });

            // Enhanced fetch event with better offline support
            self.addEventListener('fetch', (event) => {
              // Skip non-GET requests and external origins
              if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
                return;
              }

              event.respondWith(
                caches.match(event.request)
                  .then((cachedResponse) => {
                    // Return cached version if available (cache-first strategy)
                    if (cachedResponse) {
                      console.log('Service Worker: Serving from cache', event.request.url);
                      return cachedResponse;
                    }

                    // Fetch from network with timeout
                    return Promise.race([
                      fetch(event.request).then((response) => {
                        // Check if response is valid
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                          return response;
                        }

                        // Clone and cache successful responses
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                          .then((cache) => {
                            cache.put(event.request, responseToCache);
                          })
                          .catch((err) => console.warn('Failed to cache response:', err));

                        return response;
                      }),
                      // 10 second timeout for network requests
                      new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Network timeout')), 10000)
                      )
                    ]);
                  })
                  .catch((error) => {
                    console.log('Service Worker: Network failed, serving offline fallback');
                    
                    // Serve offline fallback for navigation requests
                    if (event.request.mode === 'navigate') {
                      return caches.match('/').then(cachedResponse => {
                        if (cachedResponse) {
                          return cachedResponse;
                        }
                        
                        // Enhanced offline fallback page
                        return new Response(\`
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <title>Luxe Ledger - Offline</title>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
                            <meta name="apple-mobile-web-app-capable" content="yes">
                            <meta name="apple-mobile-web-app-status-bar-style" content="default">
                            <style>
                              * { box-sizing: border-box; margin: 0; padding: 0; }
                              body {
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                                margin: 0;
                                padding: 20px;
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                color: white;
                                min-height: 100vh;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                text-align: center;
                                -webkit-font-smoothing: antialiased;
                                -moz-osx-font-smoothing: grayscale;
                              }
                              .container {
                                max-width: 400px;
                                width: 100%;
                                padding: 2rem;
                                background: rgba(255,255,255,0.1);
                                border-radius: 20px;
                                backdrop-filter: blur(10px);
                                border: 1px solid rgba(255,255,255,0.2);
                                box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
                              }
                              h1 { margin-bottom: 1rem; font-size: 1.5rem; font-weight: 600; }
                              p { opacity: 0.9; line-height: 1.6; margin-bottom: 1.5rem; }
                              .icon { font-size: 3rem; margin-bottom: 1rem; }
                              button {
                                background: rgba(255,255,255,0.2);
                                border: 1px solid rgba(255,255,255,0.3);
                                color: white;
                                padding: 12px 24px;
                                border-radius: 8px;
                                cursor: pointer;
                                font-size: 1rem;
                                font-weight: 500;
                                transition: all 0.3s ease;
                                width: 100%;
                              }
                              button:hover {
                                background: rgba(255,255,255,0.3);
                                transform: translateY(-1px);
                              }
                              button:active {
                                transform: translateY(0);
                              }
                              .status {
                                margin-top: 1rem;
                                padding: 0.5rem;
                                background: rgba(0,0,0,0.2);
                                border-radius: 8px;
                                font-size: 0.875rem;
                                opacity: 0.8;
                              }
                              @media (max-width: 480px) {
                                .container { padding: 1.5rem; margin: 0 1rem; }
                                h1 { font-size: 1.25rem; }
                              }
                            </style>
                          </head>
                          <body>
                            <div class="container">
                              <div class="icon">🔒</div>
                              <h1>Luxe Ledger</h1>
                              <p>You're offline, but your app is cached and ready to use!</p>
                              <button onclick="window.location.reload()" id="launchBtn">Launch App</button>
                              <div class="status" id="status">
                                <span id="statusText">Offline Mode Active</span>
                              </div>
                            </div>
                            <script>
                              // Check if app cache is available
                              if ('caches' in window) {
                                caches.match('/').then(response => {
                                  if (response) {
                                    document.getElementById('statusText').textContent = 'App Available Offline';
                                    document.getElementById('launchBtn').style.background = 'rgba(34, 197, 94, 0.8)';
                                  }
                                });
                              }
                              
                              // Handle launch button with loading state
                              document.getElementById('launchBtn').addEventListener('click', function() {
                                this.textContent = 'Loading...';
                                this.disabled = true;
                                setTimeout(() => window.location.reload(), 500);
                              });
                            </script>
                          </body>
                          </html>
                        \`, {
                          headers: { 
                            'Content-Type': 'text/html',
                            'Cache-Control': 'no-cache'
                          }
                        });
                      });
                    }
                    
                    // For other requests, just fail
                    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
                  })
              );
            });

            // Background sync for future enhancements
            self.addEventListener('sync', (event) => {
              console.log('Service Worker: Background sync triggered', event.tag);
              if (event.tag === 'background-sync') {
                // Future: sync local changes when back online
              }
            });

            // Push notifications (placeholder)
            self.addEventListener('push', (event) => {
              console.log('Service Worker: Push event received', event);
            });

            // Handle client messages
            self.addEventListener('message', (event) => {
              if (event.data && event.data.type === 'SKIP_WAITING') {
                self.skipWaiting();
              }
            });
          `;

          // Create and register service worker
          const swBlob = new Blob([swCode], { type: 'application/javascript' });
          const swUrl = URL.createObjectURL(swBlob);

          const registration = await navigator.serviceWorker.register(swUrl, {
            scope: '/',
            updateViaCache: 'none'
          });
          
          console.log('Service Worker registered successfully:', registration);

          // Handle updates more gracefully
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New app version available. Refresh to update.');
                // Could show a user-friendly update notification here
              }
            });
          });

          // Handle service worker messages
          navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('Message from service worker:', event.data);
          });

        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      };

      registerSW();
    }

    // Enhanced manifest generation with better mobile support
    const updateManifest = () => {
      try {
        const adminSettings = localDb.list('AdminSettings')[0] || {};
        const appName = adminSettings.appName || 'Luxe Ledger';
        const customLogo = adminSettings.customLogo;

        // Get current theme colors dynamically
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        
        // Extract theme colors with better fallbacks
        let backgroundColor = '#ffffff';
        let themeColor = '#667eea';
        
        try {
          const bgHsl = computedStyle.getPropertyValue('--background').trim();
          const primaryHsl = computedStyle.getPropertyValue('--primary').trim();
          
          if (bgHsl) backgroundColor = hslToHex(bgHsl);
          if (primaryHsl) themeColor = hslToHex(primaryHsl);
        } catch (colorError) {
          console.warn('PWA: Could not extract theme colors, using defaults:', colorError);
        }

        const manifest = {
          name: appName,
          short_name: appName.length > 12 ? appName.substring(0, 12) : appName,
          description: 'Personal Finance & Password Manager',
          start_url: '/',
          display: 'standalone',
          background_color: backgroundColor,
          theme_color: themeColor,
          orientation: 'portrait-primary',
          scope: '/',
          categories: ['finance', 'productivity', 'utilities'],
          lang: 'en-US',
          // Enhanced mobile PWA features
          prefer_related_applications: false,
          shortcuts: [
            {
              name: 'Financial Dashboard',
              short_name: 'Dashboard',
              description: 'View your financial overview',
              url: '/#/financial-dashboard',
              icons: [{ src: '/favicon.ico', sizes: '96x96' }]
            },
            {
              name: 'Password Vault',
              short_name: 'Vault',
              description: 'Access your secure passwords',
              url: '/#/password-vault',
              icons: [{ src: '/favicon.ico', sizes: '96x96' }]
            }
          ],
          icons: customLogo ? [
            {
              src: customLogo,
              sizes: '72x72',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: customLogo,
              sizes: '96x96',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: customLogo,
              sizes: '128x128',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: customLogo,
              sizes: '144x144',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: customLogo,
              sizes: '152x152',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: customLogo,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: customLogo,
              sizes: '384x384',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: customLogo,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ] : [
            // Default generated icons with better mobile support
            {
              src: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#667eea"/>
                      <stop offset="100%" style="stop-color:#764ba2"/>
                    </linearGradient>
                  </defs>
                  <rect width="100" height="100" fill="url(#bg)" rx="20"/>
                  <path d="M30 35h40v5H30zM25 45h50v25H25z" fill="white" opacity="0.9"/>
                  <circle cx="35" cy="55" r="3" fill="#667eea"/>
                </svg>
              `),
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#667eea"/>
                      <stop offset="100%" style="stop-color:#764ba2"/>
                    </linearGradient>
                  </defs>
                  <rect width="100" height="100" fill="url(#bg)" rx="20"/>
                  <path d="M30 35h40v5H30zM25 45h50v25H25z" fill="white" opacity="0.9"/>
                  <circle cx="35" cy="55" r="3" fill="#667eea"/>
                </svg>
              `),
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        };

        // Create and inject manifest
        let manifestLink = document.querySelector('link[rel="manifest"]');
        if (!manifestLink) {
          manifestLink = document.createElement('link');
          manifestLink.rel = 'manifest';
          document.head.appendChild(manifestLink);
        }
        
        const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
        const manifestUrl = URL.createObjectURL(manifestBlob);
        manifestLink.href = manifestUrl;

        // Add iOS-specific meta tags for better PWA support
        addIOSMetaTags(appName, themeColor);

      } catch (error) {
        console.error('Failed to update manifest:', error);
      }
    };

    // Helper function for iOS PWA support
    const addIOSMetaTags = (appName, themeColor) => {
      const metaTags = [
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: appName },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'theme-color', content: themeColor },
        { name: 'msapplication-TileColor', content: themeColor },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover' }
      ];

      metaTags.forEach(({ name, content }) => {
        let existingTag = document.querySelector(`meta[name="${name}"]`);
        if (!existingTag) {
          existingTag = document.createElement('meta');
          existingTag.name = name;
          document.head.appendChild(existingTag);
        }
        existingTag.content = content;
      });
    };

    // Helper function to convert HSL to Hex (improved)
    const hslToHex = (hsl) => {
      try {
        const values = hsl.split(' ');
        if (values.length !== 3) return '#667eea';
        
        const h = parseInt(values[0]) / 360;
        const s = parseInt(values[1]) / 100;
        const l = parseInt(values[2]) / 100;

        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };

        let r, g, b;
        if (s === 0) {
          r = g = b = l;
        } else {
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          r = hue2rgb(p, q, h + 1/3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1/3);
        }

        const toHex = (c) => {
          const hex = Math.round(c * 255).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      } catch (error) {
        console.warn('HSL to Hex conversion failed:', error);
        return '#667eea';
      }
    };

    // Update manifest on load and theme changes
    updateManifest();
    
    // Listen for theme changes to update manifest
    window.addEventListener('themeChanged', updateManifest);
    
    return () => {
      window.removeEventListener('themeChanged', updateManifest);
    };
    
  }, []);

  return null;
};

export { PWAManager };