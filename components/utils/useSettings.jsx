import { useState, useEffect } from 'react';
import { localDb } from '@/components/utils/LocalDb';

/**
 * A hook to fetch and provide application settings.
 * It returns an object containing the AppSettings from localDb.
 * This ensures that components always have access to the latest settings.
 */
export function useSettings() {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    // This function can be expanded later to listen for storage events if needed
    const loadSettings = () => {
        const appSettingsData = localDb.list('AppSettings')[0] || {};
        setSettings(appSettingsData);
    };

    loadSettings();
  }, []);

  // Returning the settings wrapped in an object to be destructured.
  // e.g., const { settings } = useSettings();
  return { settings };
}