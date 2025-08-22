import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, useTheme } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppState, useAppDispatch } from './contexts/AppContext';
import { VaultConfig } from './types';

// Components
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import MainContent from './components/layout/MainContent';
import VaultSetup from './components/vault/VaultSetup';
import VaultUnlock from './components/vault/VaultUnlock';
import LoadingScreen from './components/common/LoadingScreen';
import ErrorBoundary from './components/common/ErrorBoundary';

const App: React.FC = () => {
  const theme = useTheme();
  const { vault, isLoading } = useAppState();
  const dispatch = useAppDispatch();
  const [isInitialized, setIsInitialized] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        // Check for existing vault configuration
        const storedVault = localStorage.getItem('inventoryVaultConfig');
        if (storedVault) {
          const vaultConfig: VaultConfig = JSON.parse(storedVault);
          dispatch({ type: 'SET_VAULT', payload: vaultConfig });
          
          // If vault has a password, show unlock screen
          if (vaultConfig.hasPassword) {
            setShowUnlock(true);
          }
        }

        // Load user preferences
        const preferences = localStorage.getItem('inventoryVaultPreferences');
        if (preferences) {
          const parsed = JSON.parse(preferences);
          if (parsed.theme) {
            dispatch({ type: 'SET_THEME', payload: parsed.theme });
          }
          if (parsed.viewMode) {
            dispatch({ type: 'SET_VIEW_MODE', payload: parsed.viewMode });
          }
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize application' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, [dispatch]);

  // Handle vault unlock
  const handleVaultUnlock = (success: boolean) => {
    if (success) {
      setShowUnlock(false);
      if (vault) {
        // Update last accessed time
        const updatedVault = {
          ...vault,
          lastAccessed: new Date(),
          isLocked: false
        };
        dispatch({ type: 'SET_VAULT', payload: updatedVault });
        localStorage.setItem('inventoryVaultConfig', JSON.stringify(updatedVault));
      }
    }
  };

  // Handle vault creation
  const handleVaultCreated = (vaultConfig: VaultConfig) => {
    dispatch({ type: 'SET_VAULT', payload: vaultConfig });
    localStorage.setItem('inventoryVaultConfig', JSON.stringify(vaultConfig));
    setShowUnlock(false);
  };

  // Show loading screen during initialization
  if (!isInitialized || isLoading) {
    return <LoadingScreen />;
  }

  // Show vault setup if no vault exists
  if (!vault) {
    return (
      <ErrorBoundary>
        <VaultSetup onVaultCreated={handleVaultCreated} />
      </ErrorBoundary>
    );
  }

  // Show unlock screen if vault is locked
  if (showUnlock || vault.isLocked) {
    return (
      <ErrorBoundary>
        <VaultUnlock
          vault={vault}
          onUnlock={handleVaultUnlock}
          onForgotPassword={() => {
            // Handle forgot password flow
            console.log('Forgot password clicked');
          }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          backgroundColor: theme.palette.background.default,
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Header />

        {/* Main content area */}
        <Box
          sx={{
            display: 'flex',
            flex: 1,
            overflow: 'hidden'
          }}
        >
          {/* Sidebar */}
          <AnimatePresence>
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              style={{ flexShrink: 0 }}
            >
              <Sidebar />
            </motion.div>
          </AnimatePresence>

          {/* Main content */}
          <Box
            component={motion.div}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            sx={{
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/vault" replace />} />
              <Route path="/vault/*" element={<MainContent />} />
              <Route path="/search" element={<MainContent />} />
              <Route path="/favorites" element={<MainContent />} />
              <Route path="/recent" element={<MainContent />} />
              <Route path="/settings" element={<MainContent />} />
              <Route path="*" element={<Navigate to="/vault" replace />} />
            </Routes>
          </Box>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

export default App;