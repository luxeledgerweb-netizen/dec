import React from 'react';
import { motion } from 'framer-motion';

export default function VaultLockAnimation({ onComplete }) {
  const containerVariants = {
    hidden: { opacity: 1 },
    visible: { opacity: 1 },
    exit: { 
      opacity: 0,
      transition: { duration: 0.5, delay: 1.5 }
    }
  };

  const vaultDoorVariants = {
    open: { 
      rotateY: 0,
      scale: 1,
      opacity: 1
    },
    closing: {
      rotateY: -90,
      scale: 0.8,
      opacity: 0.8,
      transition: {
        duration: 1,
        ease: "easeInOut"
      }
    }
  };

  const lockVariants = {
    hidden: { 
      scale: 0,
      rotate: -180,
      opacity: 0
    },
    visible: {
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: {
        delay: 0.8,
        duration: 0.5,
        ease: "backOut"
      }
    }
  };

  const textVariants = {
    hidden: { 
      opacity: 0,
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 1.2,
        duration: 0.3
      }
    }
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="text-center">
        <motion.div
          className="relative mx-auto mb-6"
          style={{ perspective: '1000px' }}
        >
          {/* Vault Door */}
          <motion.div
            className="w-32 h-32 bg-gradient-to-br from-gray-700 via-gray-600 to-gray-800 rounded-2xl flex items-center justify-center shadow-2xl"
            variants={vaultDoorVariants}
            initial="open"
            animate="closing"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full" />
            </div>
          </motion.div>

          {/* Lock Icon */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            variants={lockVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          variants={textVariants}
          initial="hidden"
          animate="visible"
          className="text-white"
        >
          <h3 className="text-xl font-bold mb-2">Vault Locked</h3>
          <p className="text-gray-300">Your credentials are secure</p>
        </motion.div>
      </div>
    </motion.div>
  );
}