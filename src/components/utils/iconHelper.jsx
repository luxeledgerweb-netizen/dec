import { localDb } from './LocalDb';

/**
 * Central function to get the appropriate icon for any item (account, credit card, etc.)
 * Priority: custom icon > saved favicon > generic fallback
 */
export const getIconForItem = (item, itemType) => {
  if (!item) return null;

  const appSettings = localDb.list('AppSettings')[0] || {};
  const customIcons = appSettings.institutionFavicons || {};

  // 1. Check for custom override icon first
  const itemKey = `${itemType}-${item.id}`;
  if (customIcons[itemKey]) {
    return customIcons[itemKey].url;
  }

  // 2. Check for saved favicon on the item itself
  if (item.default_favicon_base64) {
    return item.default_favicon_base64;
  }

  // 3. No icon found - return null for generic fallback
  return null;
};

// Legacy function name for backward compatibility
export const getIconForInstitution = getIconForItem;