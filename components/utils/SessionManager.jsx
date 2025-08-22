export class SessionManager {
  static TIMEOUT_WARNING = 5 * 60 * 1000; // 5 minutes before timeout
  static CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds
  
  static timeoutId = null;
  static warningId = null;
  static intervalId = null;
  static isWarningShown = false;

  static init() {
    this.setupActivityListeners();
    this.startTimeoutCheck();
    this.resetTimeout();
  }

  static setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, () => this.resetTimeout(), true);
    });
  }

  static startTimeoutCheck() {
    if (this.intervalId) clearInterval(this.intervalId);
    
    this.intervalId = setInterval(() => {
      const isAuthenticated = sessionStorage.getItem('financeAuth') === 'true';
      if (!isAuthenticated) {
        this.cleanup();
        return;
      }
      
      const lastActivity = parseInt(sessionStorage.getItem('lastActivity') || '0');
      const timeoutMinutes = this.getTimeoutMinutes();
      
      if (timeoutMinutes === 0) return; // No timeout set
      
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const timeSinceActivity = Date.now() - lastActivity;
      
      if (timeSinceActivity >= timeoutMs) {
        this.logout('Session expired due to inactivity');
      } else if (timeSinceActivity >= (timeoutMs - this.TIMEOUT_WARNING) && !this.isWarningShown) {
        this.showTimeoutWarning();
      }
    }, this.CHECK_INTERVAL);
  }

  static getTimeoutMinutes() {
    try {
      const adminSettings = JSON.parse(localStorage.getItem('luxeLedgerData') || '{}');
      const settings = adminSettings.AdminSettings?.[0];
      return settings?.sessionTimeout || 0;
    } catch {
      return 0;
    }
  }

  static getCurrencySymbol() {
    try {
      const adminSettings = JSON.parse(localStorage.getItem('luxeLedgerData') || '{}');
      const settings = adminSettings.AdminSettings?.[0];
      return settings?.currencySymbol || '$';
    } catch {
      return '$';
    }
  }

  static resetTimeout() {
    const isAuthenticated = sessionStorage.getItem('financeAuth') === 'true';
    if (!isAuthenticated) return;

    sessionStorage.setItem('lastActivity', Date.now().toString());
    this.isWarningShown = false;
    
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.warningId) clearTimeout(this.warningId);
  }

  static showTimeoutWarning() {
    this.isWarningShown = true;
    
    const warningDiv = document.createElement('div');
    warningDiv.id = 'session-timeout-warning';
    warningDiv.className = 'fixed top-4 right-4 z-50 bg-orange-500 text-white p-4 rounded-lg shadow-lg';
    warningDiv.innerHTML = `
      <div class="flex items-center space-x-2">
        <span>⚠️ Session will expire in 5 minutes due to inactivity</span>
        <button onclick="document.getElementById('session-timeout-warning').remove()" class="ml-4 text-white hover:text-gray-200">✕</button>
      </div>
    `;
    
    document.body.appendChild(warningDiv);
    
    setTimeout(() => {
      const warning = document.getElementById('session-timeout-warning');
      if (warning) warning.remove();
    }, 10000); // Remove warning after 10 seconds
  }

  static logout(reason = 'Session expired') {
    sessionStorage.removeItem('financeAuth');
    sessionStorage.removeItem('lastActivity');
    sessionStorage.removeItem('vaultUnlocked');
    
    // Clear any existing warnings
    const warning = document.getElementById('session-timeout-warning');
    if (warning) warning.remove();
    
    // Show logout notification
    const logoutDiv = document.createElement('div');
    logoutDiv.className = 'fixed top-4 right-4 z-50 bg-red-500 text-white p-4 rounded-lg shadow-lg';
    logoutDiv.innerHTML = `<div class="flex items-center space-x-2"><span>🔒 ${reason}</span></div>`;
    document.body.appendChild(logoutDiv);
    
    setTimeout(() => logoutDiv.remove(), 3000);
    
    // Trigger auth change event and redirect
    window.dispatchEvent(new Event('authChange'));
    
    // Force redirect to login
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
    
    this.cleanup();
  }

  static cleanup() {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.warningId) clearTimeout(this.warningId);
    if (this.intervalId) clearInterval(this.intervalId);
    
    this.timeoutId = null;
    this.warningId = null;
    this.intervalId = null;
    this.isWarningShown = false;
  }

  static updateTimeout(newTimeoutMinutes) {
    // Restart the timeout system with new settings
    this.cleanup();
    if (newTimeoutMinutes > 0) {
      this.init();
    }
  }
}