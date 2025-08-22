import React from 'react';
import { Box, CircularProgress, Typography, Card } from '@mui/material';
import { motion } from 'framer-motion';
import LockIcon from '@mui/icons-material/Lock';

interface LoadingScreenProps {
  message?: string;
  showIcon?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading Inventory Vault...', 
  showIcon = true 
}) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <Card
        component={motion.div}
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        sx={{
          padding: 4,
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          minWidth: 300,
        }}
      >
        {showIcon && (
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
          >
            <LockIcon
              sx={{
                fontSize: 48,
                color: 'primary.main',
                mb: 2,
              }}
            />
          </motion.div>
        )}
        
        <Box sx={{ mb: 3 }}>
          <CircularProgress
            size={40}
            thickness={4}
            sx={{
              color: 'primary.main',
            }}
          />
        </Box>
        
        <Typography
          variant="h6"
          sx={{
            mb: 1,
            fontWeight: 600,
            color: 'text.primary',
          }}
        >
          Inventory Vault
        </Typography>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mb: 2,
            }}
          >
            {message}
          </Typography>
        </motion.div>
        
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ delay: 0.5, duration: 1.5, ease: 'easeInOut' }}
          style={{
            height: 2,
            backgroundColor: '#1976d2',
            borderRadius: 1,
            opacity: 0.3,
          }}
        />
      </Card>
    </Box>
  );
};

export default LoadingScreen;