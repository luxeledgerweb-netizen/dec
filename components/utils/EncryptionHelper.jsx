// components/utils/EncryptionHelper.js (or .ts)
class EncryptionHelper {
  // ---- small helpers -------------------------------------------------------
  static hasSubtle() {
    try {
      return typeof crypto !== 'undefined' && crypto && crypto.subtle;
    } catch {
      return false;
    }
  }

  static _b64FromBytes(u8) {
    return btoa(String.fromCharCode(...u8));
  }
  static _bytesFromB64(str) {
    return new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));
  }

  // Quick shape check used by Settings/Login import flows
  static isEncryptedFile(obj) {
    return !!(obj && obj.isEncrypted === true && typeof obj.data === 'string' && obj.data.length > 0);
  }

  // ---- YOUR ORIGINAL METHODS (kept) ----------------------------------------
  static async encrypt(text, password) {
    try {
      if (!EncryptionHelper.hasSubtle()) {
        throw new Error('Web Crypto API not available');
      }

      const encoder = new TextEncoder();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
      );
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(text)
      );

      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combined.set(salt);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);

      return EncryptionHelper._b64FromBytes(combined);
    } catch (error) {
      console.error('Encryption failed:', error);
      // simple fallback
      if (typeof window !== 'undefined' && window.btoa) {
        const combined = password + '::' + text;
        return btoa(unescape(encodeURIComponent(combined)));
      }
      throw new Error('Encryption not supported in this environment');
    }
  }

  static async decrypt(encryptedData, password) {
    try {
      if (!EncryptionHelper.hasSubtle()) {
        throw new Error('Web Crypto API not available');
      }

      const decoder = new TextDecoder();
      const combined = EncryptionHelper._bytesFromB64(encryptedData);

      const salt = combined.slice(0, 16);
      const iv   = combined.slice(16, 28);
      const ct   = combined.slice(28);

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
      );
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ct
      );

      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      // fallback path for legacy/fallback exports
      if (typeof window !== 'undefined' && window.atob) {
        try {
          const decoded = decodeURIComponent(escape(atob(encryptedData)));
          const parts = decoded.split('::');
          if (parts.length === 2 && parts[0] === password) {
            return parts[1];
          }
        } catch (_) {}
      }
      throw new Error('Decryption failed - invalid password or corrupted data');
    }
  }

  // ---- WRAPPERS your UI is calling ----------------------------------------
  // Accepts a plain JSON string, returns a *wrapper object* ready to JSON.stringify
  static async encryptData(jsonString, password) {
    const data = await EncryptionHelper.encrypt(jsonString, password);
    return { isEncrypted: true, data };
  }

  // Accepts either the wrapper object {isEncrypted:true,data:"..."} OR a base64 string
  // Returns the decrypted JSON string
  static async decryptData(input, password) {
    // If the caller passed the wrapper object, unwrap it
    if (EncryptionHelper.isEncryptedFile(input)) {
      return EncryptionHelper.decrypt(input.data, password);
    }
    // If they passed the raw base64 string, decrypt directly
    if (typeof input === 'string') {
      return EncryptionHelper.decrypt(input, password);
    }
    throw new Error('Unsupported encrypted input format');
  }

  // ---- password helpers (kept) --------------------------------------------
  static checkPasswordStrength(password) {
    if (!password) return 'weak';
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return 'weak';
    if (score <= 3) return 'fair';
    if (score <= 4) return 'good';
    return 'strong';
  }

  static generatePassword(length = 16, includeSymbols = true) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = includeSymbols ? '!@#$%^&*()_+-=[]{}|;:,.<>?' : '';
    const charset = lowercase + uppercase + numbers + symbols;

    let password = '';
    if (length >= 4) {
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
      password += numbers[Math.floor(Math.random() * numbers.length)];
      if (includeSymbols && symbols) password += symbols[Math.floor(Math.random() * symbols.length)];
    }
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

export { EncryptionHelper };