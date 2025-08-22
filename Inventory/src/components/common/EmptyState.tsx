import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
        textAlign: 'center',
        p: 4,
      }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        {icon || (
          <FolderOpenIcon
            sx={{
              fontSize: 80,
              color: 'text.disabled',
              mb: 2,
            }}
          />
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Typography
          variant="h5"
          sx={{
            mb: 1,
            fontWeight: 600,
            color: 'text.secondary',
          }}
        >
          {title}
        </Typography>
      </motion.div>

      {description && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Typography
            variant="body1"
            sx={{
              mb: 3,
              color: 'text.disabled',
              maxWidth: 400,
            }}
          >
            {description}
          </Typography>
        </motion.div>
      )}

      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {action}
        </motion.div>
      )}
    </Box>
  );
};

export default EmptyState;