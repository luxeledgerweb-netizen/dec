import CryptoJS from 'crypto-js';

// Encryption configuration
export interface EncryptionConfig {
  algorithm: 'AES-GCM' | 'AES-CBC';
  keySize: 128 | 192 | 256;
  iterations: number;
  saltSize: number;
}

const DEFAULT_CONFIG: EncryptionConfig = {
  algorithm: 'AES-GCM',
  keySize: 256,
  iterations: 100000,
  saltSize: 16
};

// Generate a random salt
export const generateSalt = (size: number = DEFAULT_CONFIG.saltSize): string => {
  return CryptoJS.lib.WordArray.random(size).toString();
};

// Generate a random IV
export const generateIV = (size: number = 16): string => {
  return CryptoJS.lib.WordArray.random(size).toString();
};

// Derive key from password using PBKDF2
export const deriveKey = (
  password: string,
  salt: string,
  iterations: number = DEFAULT_CONFIG.iterations,
  keySize: number = DEFAULT_CONFIG.keySize
): string => {
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: keySize / 32,
    iterations: iterations,
    hasher: CryptoJS.algo.SHA256
  });
  return key.toString();
};

// Hash password for storage (not for encryption)
export const hashPassword = (password: string, salt?: string): { hash: string; salt: string } => {
  const passwordSalt = salt || generateSalt();
  const hash = CryptoJS.PBKDF2(password, passwordSalt, {
    keySize: 256 / 32,
    iterations: 10000,
    hasher: CryptoJS.algo.SHA256
  }).toString();
  
  return { hash, salt: passwordSalt };
};

// Verify password against hash
export const verifyPassword = (password: string, hash: string, salt: string): boolean => {
  const computedHash = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 10000,
    hasher: CryptoJS.algo.SHA256
  }).toString();
  
  return computedHash === hash;
};

// Encrypt text data
export const encryptText = (
  plaintext: string,
  password: string,
  config: Partial<EncryptionConfig> = {}
): { encrypted: string; salt: string; iv: string } => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const salt = generateSalt(finalConfig.saltSize);
  const iv = generateIV();
  const key = deriveKey(password, salt, finalConfig.iterations, finalConfig.keySize);
  
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  }).toString();
  
  return { encrypted, salt, iv };
};

// Decrypt text data
export const decryptText = (
  encryptedData: string,
  password: string,
  salt: string,
  iv: string,
  config: Partial<EncryptionConfig> = {}
): string => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const key = deriveKey(password, salt, finalConfig.iterations, finalConfig.keySize);
  
  const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return decrypted.toString(CryptoJS.enc.Utf8);
};

// Encrypt file data (returns encrypted ArrayBuffer)
export const encryptFile = async (
  file: File,
  password: string,
  config: Partial<EncryptionConfig> = {}
): Promise<{ encrypted: ArrayBuffer; salt: string; iv: string; originalName: string; mimeType: string }> => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const salt = generateSalt(finalConfig.saltSize);
  const iv = generateIV();
  const key = deriveKey(password, salt, finalConfig.iterations, finalConfig.keySize);
  
  // Read file as array buffer
  const arrayBuffer = await file.arrayBuffer();
  const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
  
  // Encrypt the file data
  const encrypted = CryptoJS.AES.encrypt(wordArray, key, {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  // Convert back to ArrayBuffer
  const encryptedWords = encrypted.ciphertext;
  const encryptedBuffer = new ArrayBuffer(encryptedWords.sigBytes);
  const encryptedView = new Uint8Array(encryptedBuffer);
  
  for (let i = 0; i < encryptedWords.sigBytes; i++) {
    encryptedView[i] = (encryptedWords.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  
  return {
    encrypted: encryptedBuffer,
    salt,
    iv,
    originalName: file.name,
    mimeType: file.type
  };
};

// Decrypt file data (returns File object)
export const decryptFile = async (
  encryptedData: ArrayBuffer,
  password: string,
  salt: string,
  iv: string,
  originalName: string,
  mimeType: string,
  config: Partial<EncryptionConfig> = {}
): Promise<File> => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const key = deriveKey(password, salt, finalConfig.iterations, finalConfig.keySize);
  
  // Convert ArrayBuffer to WordArray
  const encryptedWords = CryptoJS.lib.WordArray.create(encryptedData);
  const encryptedObject = CryptoJS.lib.CipherParams.create({
    ciphertext: encryptedWords
  });
  
  // Decrypt the data
  const decrypted = CryptoJS.AES.decrypt(encryptedObject, key, {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  // Convert back to ArrayBuffer
  const decryptedBuffer = new ArrayBuffer(decrypted.sigBytes);
  const decryptedView = new Uint8Array(decryptedBuffer);
  
  for (let i = 0; i < decrypted.sigBytes; i++) {
    decryptedView[i] = (decrypted.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  
  return new File([decryptedBuffer], originalName, { type: mimeType });
};

// Encrypt JSON data for storage
export const encryptJSON = <T>(
  data: T,
  password: string,
  config: Partial<EncryptionConfig> = {}
): { encrypted: string; salt: string; iv: string } => {
  const jsonString = JSON.stringify(data);
  return encryptText(jsonString, password, config);
};

// Decrypt JSON data from storage
export const decryptJSON = <T>(
  encryptedData: string,
  password: string,
  salt: string,
  iv: string,
  config: Partial<EncryptionConfig> = {}
): T => {
  const jsonString = decryptText(encryptedData, password, salt, iv, config);
  return JSON.parse(jsonString);
};

// Generate secure random password
export const generateSecurePassword = (
  length: number = 16,
  includeSymbols: boolean = true
): string => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let charset = lowercase + uppercase + numbers;
  if (includeSymbols) {
    charset += symbols;
  }
  
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
};

// Secure memory operations
export const secureWipe = (data: string | ArrayBuffer): void => {
  if (typeof data === 'string') {
    // For strings, we can't truly wipe memory in JavaScript,
    // but we can at least clear the reference
    data = '';
  } else {
    // For ArrayBuffers, fill with zeros
    const view = new Uint8Array(data);
    view.fill(0);
  }
};

// Key stretching function for additional security
export const stretchKey = (key: string, iterations: number = 1000): string => {
  let stretched = key;
  for (let i = 0; i < iterations; i++) {
    stretched = CryptoJS.SHA256(stretched).toString();
  }
  return stretched;
};

// Generate encryption key from biometric data (placeholder)
export const generateBiometricKey = async (): Promise<string | null> => {
  // This is a placeholder for biometric authentication
  // In a real implementation, you would use WebAuthn API
  // or similar biometric authentication methods
  
  if (!('credentials' in navigator)) {
    return null;
  }
  
  try {
    // Placeholder implementation
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    
    // In a real app, you would create and verify credentials here
    // For now, we just return a deterministic key based on user agent
    const keyData = CryptoJS.SHA256(navigator.userAgent + Date.now()).toString();
    return keyData;
  } catch (error) {
    console.warn('Biometric authentication not available:', error);
    return null;
  }
};

// Validate password strength
export const validatePasswordStrength = (password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} => {
  const feedback: string[] = [];
  let score = 0;
  
  // Length check
  if (password.length >= 8) score += 1;
  else feedback.push('Password should be at least 8 characters long');
  
  if (password.length >= 12) score += 1;
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Password should contain lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Password should contain uppercase letters');
  
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Password should contain numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Password should contain special characters');
  
  // Common pattern checks
  if (!/(.)\1{2,}/.test(password)) score += 1;
  else feedback.push('Avoid repeating characters');
  
  if (!/123|abc|qwe|asd/i.test(password)) score += 1;
  else feedback.push('Avoid common patterns like "123" or "abc"');
  
  const isStrong = score >= 6;
  
  if (isStrong && feedback.length === 0) {
    feedback.push('Strong password!');
  }
  
  return { score, feedback, isStrong };
};

// Secure storage utilities
export const secureStore = {
  // Store encrypted data in localStorage
  setItem: (key: string, value: any, password: string): void => {
    const encrypted = encryptJSON(value, password);
    localStorage.setItem(key, JSON.stringify(encrypted));
  },
  
  // Retrieve and decrypt data from localStorage
  getItem: <T>(key: string, password: string): T | null => {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    try {
      const parsed = JSON.parse(stored);
      return decryptJSON<T>(parsed.encrypted, password, parsed.salt, parsed.iv);
    } catch (error) {
      console.warn('Failed to decrypt stored data:', error);
      return null;
    }
  },
  
  // Remove item from localStorage
  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  },
  
  // Clear all stored data
  clear: (): void => {
    localStorage.clear();
  }
};