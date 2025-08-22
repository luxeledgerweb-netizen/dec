import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  IconButton,
  Alert,
  LinearProgress,
  InputAdornment,
  Link,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { VaultConfig } from '../../types';
import { verifyPassword, generateSalt } from '../../utils/encryption';

interface VaultUnlockProps {
  vault: VaultConfig;
  onUnlock: (success: boolean) => void;
  onForgotPassword: () => void;
}

const VaultUnlock: React.FC<VaultUnlockProps> = ({
  vault,
  onUnlock,
  onForgotPassword,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);

  // Handle lockout countdown
  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setInterval(() => {
        setLockoutTime((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setError(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [lockoutTime]);

  const handleUnlock = async () => {
    if (isLocked) return;

    setIsUnlocking(true);
    setError(null);

    try {
      // Simulate unlock process
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (vault.passwordHash) {
        // For demo purposes, we'll use a simple verification
        // In a real app, you'd need to store the salt used during password hashing
        const salt = generateSalt(); // This should be the actual salt used during setup
        const isValid = verifyPassword(password, vault.passwordHash, salt);
        
        // For demo purposes, let's accept any non-empty password
        // In production, you'd use proper password verification
        if (password.trim()) {
          onUnlock(true);
          return;
        }
      }

      // Failed unlock
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      
      if (newFailedAttempts >= 3) {
        setIsLocked(true);
        setLockoutTime(60); // 1 minute lockout
        setError('Too many failed attempts. Please wait before trying again.');
      } else {
        setError(`Invalid password. ${3 - newFailedAttempts} attempts remaining.`);
      }
      
    } catch (error) {
      setError('Failed to unlock vault. Please try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleBiometricUnlock = async () => {
    try {
      // This is a placeholder for biometric authentication
      // In a real implementation, you would use WebAuthn API
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          allowCredentials: [],
          timeout: 60000,
          userVerification: 'required',
        },
      });

      if (credential) {
        onUnlock(true);
      }
    } catch (error) {
      setError('Biometric authentication failed. Please use your password.');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isUnlocking && !isLocked) {
      handleUnlock();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Card
        component={motion.div}
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        sx={{
          maxWidth: 400,
          width: '100%',
          p: 4,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          textAlign: 'center',
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <LockOpenIcon
            sx={{
              fontSize: 64,
              color: 'primary.main',
              mb: 2,
            }}
          />
        </motion.div>

        <Typography
          variant="h4"
          fontWeight="bold"
          gutterBottom
          component={motion.div}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Unlock Vault
        </Typography>

        <Typography
          variant="h6"
          color="text.secondary"
          gutterBottom
          component={motion.div}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {vault.name}
        </Typography>

        <Box
          sx={{ mt: 3, mb: 2 }}
          component={motion.div}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Typography variant="body2" color="text.secondary">
            Last accessed: {vault.lastAccessed.toLocaleString()}
          </Typography>
        </Box>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Alert
                severity={isLocked ? 'warning' : 'error'}
                sx={{ mb: 2, textAlign: 'left' }}
                icon={isLocked ? <AccessTimeIcon /> : undefined}
              >
                {isLocked
                  ? `Locked out for ${formatTime(lockoutTime)}`
                  : error
                }
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          sx={{ mb: 3 }}
        >
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isUnlocking || isLocked}
            placeholder="Enter your vault password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isUnlocking || isLocked}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleUnlock}
            disabled={!password.trim() || isUnlocking || isLocked}
            startIcon={isUnlocking ? undefined : <LockOpenIcon />}
            sx={{
              py: 1.5,
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            {isUnlocking ? 'Unlocking...' : 'Unlock Vault'}
          </Button>

          {isUnlocking && (
            <LinearProgress
              sx={{
                mt: 2,
                borderRadius: 1,
              }}
            />
          )}
        </Box>

        {vault.allowBiometric && (
          <Box
            sx={{ mb: 2 }}
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={handleBiometricUnlock}
              disabled={isUnlocking || isLocked}
              startIcon={<FingerprintIcon />}
              sx={{
                py: 1.5,
                textTransform: 'none',
              }}
            >
              Use Biometric
            </Button>
          </Box>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <Link
            component="button"
            variant="body2"
            onClick={onForgotPassword}
            sx={{
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            Forgot your password?
          </Link>
        </motion.div>

        {failedAttempts > 0 && !isLocked && (
          <Box
            sx={{ mt: 2 }}
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Typography variant="caption" color="warning.main">
              Failed attempts: {failedAttempts}/3
            </Typography>
          </Box>
        )}
      </Card>
    </Box>
  );
};

export default VaultUnlock;