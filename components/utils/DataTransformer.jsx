import { extractDomain } from './faviconUtils';

/**
 * Enhanced detection function to identify Aegis Wallet backups.
 * @param {object} backupData - The parsed backup data.
 * @returns {boolean} - True if this appears to be an Aegis Wallet backup.
 */
export function isAegisWalletBackup(backupData) {
  // Aegis backups are identified by having a 'version' and 'userData' key.
  return !!(backupData && backupData.version && backupData.userData);
}

/**
 * Transforms a comprehensive Aegis Wallet backup object to the Luxe Ledger format.
 * This is a complete overhaul to ensure near-flawless data migration.
 * 
 * @param {object} aegisData - The parsed JSON data from an Aegis Wallet backup.
 * @returns {object} The transformed data in Luxe Ledger's schema.
 */
export function transformAegisToLuxeLedger(aegisData) {
  const luxeData = {};

  // Initialize all Luxe Ledger arrays to prevent undefined errors
  luxeData.Account = [];
  luxeData.CreditCard = [];
  luxeData.AutoLoan = [];
  luxeData.PortfolioSnapshot = [];
  luxeData.Reminder = [];
  luxeData.CreditBureauStatus = [];
  luxeData.CreditScore = [];
  luxeData.PasswordCredential = [];
  luxeData.SecureNote = [];
  luxeData.CardCredential = [];
  luxeData.BankCredential = [];
  luxeData.DashboardLayout = [];
  luxeData.CustomThemes = [];
  luxeData.BalanceHistory = [];

  // --- 1. Transform Settings (userData) ---
  if (aegisData.userData) {
    const userData = aegisData.userData;
    
    luxeData.AdminSettings = [{
      id: 'admin',
      appName: userData.app_name || 'Luxe Ledger',
      appSubtitle: userData.app_subtitle || 'Personal Wealth Dashboard',
      masterPassword: '!3ideocY', // Must be reset by user
      customLogo: userData.custom_logo_url || null,
      sessionTimeout: userData.session_timeout || 0,
      loginDisplayName: 'User',
      loginScreenTips: [
        "💡 Tip: Your data was successfully imported from Aegis Wallet!",
        "🔄 Remember to update your master password in Settings."
      ],
      loginScreenQuote: userData.login_quote || '"Fortune favors the prepared mind."',
      useShieldIconOnLogin: false
    }];

    luxeData.AppSettings = [{
      id: 'settings',
      showAccountProgressBar: true,
      compactCardView: userData.vault_display_settings?.view_mode === 'compact',
      showAccountFavicons: userData.vault_display_settings?.show_website_favicons !== false,
      roundNumbers: false,
      hideZeroBalances: false,
      creditCardSorting: 'recent',
      accountSort: userData.vault_display_settings?.default_sort_order === 'alphabetical' ? 'name' : 'default',
      showAllReminders: false,
      showSubscriptionLogos: true,
      unusedCardThresholdMonths: userData.credit_card_unused_alert_months || 6,
      accountUpdateOrder: (aegisData.accounts || []).filter(a => a.update_order).sort((a,b) => a.update_order - b.update_order).map(a => a.id),
      institutionFavicons: {}
    }];

    luxeData.CustomThemes = (userData.custom_themes || []).map(theme => ({
      id: theme.id,
      name: theme.name,
      isFavorite: false,
      colors: {
        background: theme.colors?.background || '#ffffff',
        foreground: theme.colors?.text || '#000000',
        primary: theme.colors?.primary || '#3b82f6',
        primaryForeground: '#ffffff',
        secondaryText: `color-mix(in srgb, ${theme.colors?.text || '#000000'} 70%, transparent)`,
        headingColor: theme.colors?.text || '#000000',
        tileColor: theme.colors?.surface || '#f4f4f5',
        tileTextColor: theme.colors?.text || '#333333'
      }
    }));
    
    if (userData.active_theme) {
        const activeThemeData = luxeData.CustomThemes.find(t => t.id === userData.active_theme);
        if (activeThemeData) luxeData.activeAppThemeColors = activeThemeData;
    }

    // This is a best-effort conversion as layout systems differ
    if (userData.dashboard_tile_order) {
        luxeData.DashboardLayout = userData.dashboard_tile_order.map((tileId, index) => ({
            i: tileId, x: index % 2, y: Math.floor(index / 2), w: 1, h: 1
        }));
    }
    
    // Note: Vault settings like password generator are not directly transferrable
    // as they are handled differently in Luxe Ledger. Defaults will be used.
    luxeData.VaultSettings = [{ id: 'vault_settings', vaultPasswordEnabled: false }];
  }

  // --- 2. Transform Financial Accounts (Splitting Logic) ---
  if (aegisData.accounts) {
    (aegisData.accounts || []).forEach(acc => {
      const commonData = {
        id: acc.id,
        name: acc.name,
        institution: acc.website ? extractDomain(acc.website, true).charAt(0).toUpperCase() + extractDomain(acc.website, true).slice(1) : 'Unknown',
        institution_website: acc.website || '',
        is_archived: acc.is_active === false,
        default_favicon_base64: acc.favicon_base64 || '',
        created_date: acc.created_date || new Date().toISOString(),
        updated_date: new Date().toISOString()
      };

      switch(acc.type) {
        case 'credit_card':
          luxeData.CreditCard.push({
            ...commonData,
            card_type: 'other', status: 'open',
            expiration_date: acc.expiration_date ? acc.expiration_date.substring(0, 7) : '',
            last_used_date: acc.last_used_date, credit_limit: acc.credit_limit || 0,
            apr: 0, last_four_digits: '', benefits: acc.benefits || '',
            annual_fee: 0, notes: `Balance from import: $${acc.balance}`, is_primary_active: acc.is_primary || false,
          });
          break;
        case 'car_loan':
          luxeData.AutoLoan.push({
            ...commonData,
            lender: commonData.institution,
            initial_balance: Math.abs(acc.balance), current_balance: Math.abs(acc.balance),
            interest_rate: 0, term_months: 0, monthly_payment: 0, next_due_date: null,
          });
          break;
        default: // checking, savings, investment
          luxeData.Account.push({
            ...commonData,
            account_type: acc.type, current_balance: acc.balance || 0,
            apy: acc.apy_rate || 0, currency: 'USD',
            total_contributions: acc.contribution_amount || 0,
            is_deleted: false, deleted_date: null
          });
          break;
      }
    });
  }

  // --- 3. Transform Snapshots ---
  if (aegisData.snapshots) {
    luxeData.PortfolioSnapshot = (aegisData.snapshots || []).map(snap => ({
      id: snap.id,
      snapshot_date: snap.month ? `${snap.month}-01T00:00:00Z` : new Date(snap.created_date).toISOString(),
      total_balance: snap.net_worth || 0,
      asset_balance: snap.total_assets || 0,
      loan_balance: snap.total_loans || 0,
      year: snap.year,
      month: snap.month ? parseInt(snap.month.split('-')[1], 10) : new Date(snap.created_date).getMonth() + 1,
      created_date: snap.created_date || new Date().toISOString(),
      updated_date: new Date().toISOString()
    }));
  }

  // --- 4. Transform Subscriptions ---
  if (aegisData.subscriptions) {
    luxeData.Reminder = (aegisData.subscriptions || []).map(sub => ({
      id: sub.id, name: sub.name, frequency: sub.frequency || 'monthly',
      next_due_date: sub.due_date, is_completed: sub.is_active === false,
      notes: sub.description ? `${sub.description} | Amount: $${sub.amount}` : `Amount: $${sub.amount}`,
      created_date: sub.created_date || new Date().toISOString(),
      updated_date: new Date().toISOString(),
    }));
  }

  // --- 5. Transform Credit Bureaus & Scores ---
  if (aegisData.bureaus) {
    luxeData.CreditBureauStatus = (aegisData.bureaus || []).map(b => ({
      id: b.id, bureau: (b.name || '').toLowerCase(), is_frozen: b.is_frozen,
      created_date: b.last_changed_date, updated_date: b.last_changed_date
    }));
  }
  if (aegisData.creditScores) {
    luxeData.CreditScore = (aegisData.creditScores || []).map(cs => ({
      id: cs.id, score: cs.score, date_recorded: cs.date,
      notes: `Source: ${cs.source}`, created_date: cs.created_date, updated_date: cs.created_date
    }));
  }

  // --- 6. Transform Vault Entries (Splitting Logic) ---
  if (aegisData.vaultEntries) {
    (aegisData.vaultEntries || []).forEach(entry => {
      const commonVaultData = {
        id: entry.id, notes: entry.notes || '', tags: entry.tags || [],
        is_favorite: entry.is_favorite || false,
        created_date: entry.created_date, updated_date: entry.created_date
      };
      switch(entry.type) {
        case 'password':
          luxeData.PasswordCredential.push({
            ...commonVaultData, name: entry.title, website: entry.website || '',
            username: entry.username || '', email: '', password: entry.password,
            is_bank_account: !!entry.banking_info,
            routing_number: entry.banking_info?.routing_number || '',
            account_numbers: (entry.banking_info?.accounts || []).map(acc => ({
              account_number: acc.account_number, account_type: acc.account_name
            })),
            last_used: null, password_strength: 'unknown',
            stored_favicon: entry.favicon_base64 || ''
          });
          break;
        case 'secure_note':
          luxeData.SecureNote.push({
            ...commonVaultData, title: entry.title, content: entry.notes, category: 'personal'
          });
          break;
        case 'credit_card':
          luxeData.CardCredential.push({
            ...commonVaultData, name: entry.title,
            cardholder_name: entry.credit_card_name || '',
            card_number: entry.credit_card_number || '',
            expiration_date: entry.credit_card_expiry || '',
            cvv: entry.credit_card_cvv || '', pin: '', card_type: 'credit',
            card_network: 'other', issuer: ''
          });
          break;
      }
    });
  }
  
  // --- 7. Add Metadata ---
  luxeData.lastBackupTimestamp = new Date().toISOString();
  luxeData.lastRecapDate = null;

  return luxeData;
}