import React, { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  Switch,
  Alert,
  LinearProgress,
  Stack,
  Divider,
} from '@mui/material';
import { motion } from 'framer-motion';
import LockIcon from '@mui/icons-material/Lock';
import SecurityIcon from '@mui/icons-material/Security';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { VaultConfig } from '../../types';
import { hashPassword, validatePasswordStrength, generateSecurePassword } from '../../utils/encryption';
import { generateFileId } from '../../utils/fileUtils';

interface VaultSetupProps {
  onVaultCreated: (vault: VaultConfig) => void;
}

const steps = ['Vault Name', 'Security Settings', 'Confirmation'];

const VaultSetup: React.FC<VaultSetupProps> = ({ onVaultCreated }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [vaultName, setVaultName] = useState('My Secure Vault');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [usePassword, setUsePassword] = useState(true);
  const [allowBiometric, setAllowBiometric] = useState(false);
  const [lockTimeout, setLockTimeout] = useState(15);
  const [showInRecents, setShowInRecents] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordStrength = password ? validatePasswordStrength(password) : null;

  const handleNext = () => {
    setError(null);

    if (activeStep === 0) {
      if (!vaultName.trim()) {
        setError('Please enter a vault name');
        return;
      }
    }

    if (activeStep === 1) {
      if (usePassword) {
        if (!password) {
          setError('Please enter a password');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        if (!passwordStrength?.isStrong) {
          setError('Please choose a stronger password');
          return;
        }
      }
    }

    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
    setError(null);
  };

  const handleCreateVault = async () => {
    setIsCreating(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate vault creation

      let passwordHash: string | undefined;
      if (usePassword && password) {
        const { hash } = hashPassword(password);
        passwordHash = hash;
      }

      const vault: VaultConfig = {
        id: generateFileId(),
        name: vaultName.trim(),
        isLocked: false,
        hasPassword: usePassword,
        passwordHash,
        lockTimeout: lockTimeout * 60 * 1000, // Convert minutes to milliseconds
        allowBiometric,
        showInRecents,
        created: new Date(),
        lastAccessed: new Date(),
      };

      onVaultCreated(vault);
    } catch (error) {
      setError('Failed to create vault. Please try again.');
      setIsCreating(false);
    }
  };

  const generateRandomPassword = () => {
    const newPassword = generateSecurePassword(16, true);
    setPassword(newPassword);
    setConfirmPassword(newPassword);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Stack spacing={3}>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <StorageIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6" color="primary">
                  Create Your Vault
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose a name for your secure vault
                </Typography>
              </Box>

              <TextField
                label="Vault Name"
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
                fullWidth
                placeholder="Enter a descriptive name for your vault"
                helperText="This name will help you identify your vault"
              />
            </Stack>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Stack spacing={3}>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <SecurityIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6" color="primary">
                  Security Settings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure how your vault will be protected
                </Typography>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={usePassword}
                    onChange={(e) => setUsePassword(e.target.checked)}
                  />
                }
                label="Protect with password"
              />

              {usePassword && (
                <Stack spacing={2}>
                  <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    placeholder="Enter a strong password"
                  />

                  <TextField
                    label="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    fullWidth
                    placeholder="Confirm your password"
                  />

                  {passwordStrength && (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          Password Strength:
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={(passwordStrength.score / 8) * 100}
                          sx={{
                            flex: 1,
                            mr: 1,
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: passwordStrength.isStrong ? 'success.main' : 'warning.main'
                            }
                          }}
                        />
                        <Typography
                          variant="body2"
                          color={passwordStrength.isStrong ? 'success.main' : 'warning.main'}
                        >
                          {passwordStrength.isStrong ? 'Strong' : 'Weak'}
                        </Typography>
                      </Box>
                      {passwordStrength.feedback.map((feedback, index) => (
                        <Typography key={index} variant="caption" color="text.secondary" display="block">
                          • {feedback}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  <Button
                    variant="outlined"
                    size="small"
                    onClick={generateRandomPassword}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Generate Secure Password
                  </Button>
                </Stack>
              )}

              <Divider />

              <FormControlLabel
                control={
                  <Switch
                    checked={allowBiometric}
                    onChange={(e) => setAllowBiometric(e.target.checked)}
                  />
                }
                label="Allow biometric unlock (if available)"
              />

              <TextField
                label="Auto-lock timeout (minutes)"
                type="number"
                value={lockTimeout}
                onChange={(e) => setLockTimeout(Math.max(1, parseInt(e.target.value) || 1))}
                fullWidth
                inputProps={{ min: 1, max: 60 }}
                helperText="Vault will automatically lock after this period of inactivity"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={showInRecents}
                    onChange={(e) => setShowInRecents(e.target.checked)}
                  />
                }
                label="Show vault in recent files"
              />
            </Stack>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Stack spacing={3}>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                <Typography variant="h6" color="success.main">
                  Ready to Create
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Review your settings and create your vault
                </Typography>
              </Box>

              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Vault Configuration
                </Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Name:</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {vaultName}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Password Protection:</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {usePassword ? 'Enabled' : 'Disabled'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Biometric Unlock:</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {allowBiometric ? 'Enabled' : 'Disabled'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Auto-lock:</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {lockTimeout} minutes
                    </Typography>
                  </Box>
                </Stack>
              </Card>

              {isCreating && (
                <Box sx={{ textAlign: 'center' }}>
                  <LinearProgress sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Creating your secure vault...
                  </Typography>
                </Box>
              )}
            </Stack>
          </motion.div>
        );

      default:
        return null;
    }
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
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        sx={{
          maxWidth: 600,
          width: '100%',
          p: 4,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <LockIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Inventory Vault
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Set up your secure media and document vault
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {renderStepContent(activeStep)}

        <Box sx={{ display: 'flex', flexDirection: 'row', pt: 3 }}>
          <Button
            color="inherit"
            disabled={activeStep === 0 || isCreating}
            onClick={handleBack}
            sx={{ mr: 1 }}
          >
            Back
          </Button>
          <Box sx={{ flex: '1 1 auto' }} />
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleCreateVault}
              disabled={isCreating}
              size="large"
            >
              Create Vault
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              size="large"
            >
              Next
            </Button>
          )}
        </Box>
      </Card>
    </Box>
  );
};

export default VaultSetup;