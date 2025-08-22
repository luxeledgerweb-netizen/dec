import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, KeyRound, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export default function VaultEntryModal({ isOpen, onClose, onSuccess, theme = 'light' }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your vault password');
      return;
    }

    setIsLoading(true);
    setError('');

    // Simulate validation delay for security
    setTimeout(() => {
      const success = onSuccess(password);
      if (!success) {
        setError('Incorrect vault password. Please try again.');
        setPassword('');
      }
      setIsLoading(false);
    }, 500);
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      rotateX: -15,
      y: 50
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      rotateX: 0,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      rotateX: 10,
      y: -30,
      transition: {
        duration: 0.2
      }
    }
  };

  const vaultIconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 20,
        delay: 0.2
      }
    }
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      opacity: [0.7, 0.9, 0.7],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ 
            background: theme === 'dark' 
              ? 'rgba(0, 0, 0, 0.8)' 
              : 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)'
          }}
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
        >
          <motion.div
            className="relative max-w-md w-full"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated background glow */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: theme === 'dark'
                  ? 'linear-gradient(135deg, rgba(147, 51, 234, 0.3), rgba(79, 70, 229, 0.3))'
                  : 'linear-gradient(135deg, rgba(147, 51, 234, 0.2), rgba(79, 70, 229, 0.2))',
                filter: 'blur(20px)',
                transform: 'scale(1.1)'
              }}
              variants={pulseVariants}
              animate="pulse"
            />

            <Card className="relative bg-card/95 backdrop-blur-sm border-2 border-purple-200 dark:border-purple-700 shadow-2xl">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <motion.div
                    className="relative"
                    variants={vaultIconVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <motion.div
                      className="absolute -inset-2 bg-gradient-to-br from-purple-400 via-pink-400 to-indigo-500 rounded-2xl opacity-20"
                      animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.2, 0.3, 0.2]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  </motion.div>
                </div>
                <CardTitle className="text-2xl font-bold vault-gradient-text">
                  Vault Access Required
                </CardTitle>
                <p className="text-[var(--text-secondary)] mt-2">
                  Enter your vault password to access your secure credentials
                </p>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Vault Password"
                        className="pl-10 pr-10 h-12 text-lg bg-background/50 border-2 border-purple-200 dark:border-purple-700 focus:border-purple-500 dark:focus:border-purple-400"
                        disabled={isLoading}
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading || !password.trim()}
                      className="flex-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-600 hover:from-purple-600 hover:via-pink-600 hover:to-indigo-700 text-white shadow-lg"
                    >
                      {isLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Unlock Vault
                        </>
                      )}
                    </Button>
                  </div>
                </form>

                <div className="text-center mt-6">
                  <p className="text-xs text-[var(--text-secondary)]">
                    🔒 Your vault credentials are encrypted and secure
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}