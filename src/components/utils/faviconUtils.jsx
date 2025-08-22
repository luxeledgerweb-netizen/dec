import { localDb } from './LocalDb';

/**
 * Extracts the domain from a URL for consistent keying.
 * @param {string} url - The full URL (e.g., https://www.chase.com/home)
 * @returns {string|null} The domain name (e.g., chase.com) or null.
 */
export const extractDomain = (url) => {
  if (!url) return null;
  try {
    // Add protocol if missing for URL constructor
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const hostname = new URL(fullUrl).hostname;
    // Return the last two parts of the hostname (e.g., 'chase.com' from 'www.chase.com')
    return hostname.split('.').slice(-2).join('.');
  } catch (error) {
    console.warn(`Invalid URL for domain extraction: ${url}`);
    return null;
  }
};

/**
 * Fetches a favicon from a website, converts it to base64, and returns the string.
 * This does NOT store the icon anywhere centrally.
 * @param {string} websiteUrl - The URL of the institution's website.
 * @returns {Promise<string|null>} A promise that resolves to the base64 data URI or null.
 */
export const fetchAndEncodeFavicon = async (websiteUrl) => {
  const domain = extractDomain(websiteUrl);
  if (!domain) return null;

  try {
    // Use a CORS-friendly proxy to fetch the icon
    const response = await fetch(`https://logo.clearbit.com/${domain}`);
    if (!response.ok) {
      // Fallback for clearbit failure
      console.warn(`Clearbit failed for ${domain}. Trying Google's favicon service.`);
      const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      const gResponse = await fetch(googleFaviconUrl);
      if (!gResponse.ok) throw new Error(`Both Clearbit and Google favicon services failed for domain: ${domain}`);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        gResponse.blob().then(blob => {
          reader.readAsDataURL(blob);
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
        });
      });
    }

    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Failed to fetch and encode favicon for ${websiteUrl}:`, error);
    return null;
  }
};


/**
 * Processes a user-uploaded image file, resizes it, and stores it in the central
 * AppSettings for custom icon assignment.
 * @param {File} file - The image file uploaded by the user.
 * @returns {Promise<void>}
 */
export const processAndStoreUploadedIcon = async (file) => {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Invalid file type. Please upload an image.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 32; // Standard size for uniform icons
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/png');

        const iconKey = `custom_${Date.now()}`;
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        const newIcon = { name: fileName, url: dataUrl, uploadDate: new Date().toISOString() };

        let appSettings = localDb.list('AppSettings')[0];
        if (!appSettings) {
            // Create default settings if none exist
            appSettings = { id: 'settings', institutionFavicons: {}, accountIconSelections: {} };
            localDb.create('AppSettings', appSettings);
        }
        
        const updatedIcons = { ...(appSettings.institutionFavicons || {}), [iconKey]: newIcon };
        localDb.update('AppSettings', 'settings', { institutionFavicons: updatedIcons });

        // Dispatch an event to notify other components of the change
        window.dispatchEvent(new CustomEvent('settingsChanged', { detail: { type: 'icons' } }));
        resolve();
      };
      img.onerror = () => reject(new Error('Could not load image.'));
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};