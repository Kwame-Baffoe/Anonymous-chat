const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 310000; // Increased for better security
const KEY_FORMAT_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;

// Error classes for better error handling
class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoError';
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Utility functions for array conversion
const uint8ArrayToBase64 = (array: Uint8Array): string => {
  if (!array || array.length === 0) {
    throw new ValidationError('Invalid array input');
  }
  const chunks: string[] = [];
  for (let i = 0; i < array.length; i++) {
    chunks.push(String.fromCharCode(array[i]));
  }
  return btoa(chunks.join(''));
};

const base64ToUint8Array = (base64: string): Uint8Array => {
  if (!base64 || !KEY_FORMAT_REGEX.test(base64)) {
    throw new ValidationError('Invalid base64 input');
  }
  const binaryString = atob(base64);
  const array = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    array[i] = binaryString.charCodeAt(i);
  }
  return array;
};

// Key validation functions
const validateKey = (key: string, type: 'public' | 'private'): void => {
  if (!key || typeof key !== 'string') {
    throw new ValidationError(`Invalid ${type} key format`);
  }
  if (!KEY_FORMAT_REGEX.test(key)) {
    throw new ValidationError(`Invalid ${type} key encoding`);
  }
};

const validateMessage = (message: string): void => {
  if (typeof message !== 'string') {
    throw new ValidationError('Message must be a string');
  }
  if (message.length === 0) {
    throw new ValidationError('Message cannot be empty');
  }
};

export const CryptoService = {
  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    try {
      if (!window.crypto.subtle) {
        throw new CryptoError('Crypto API not available');
      }
      // Generate a random key using ECDH for better security
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        ['deriveKey']
      );

      // Export the public and private keys
      const publicKeyExport = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
      const privateKeyExport = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

      return {
        publicKey: uint8ArrayToBase64(new Uint8Array(publicKeyExport)),
        privateKey: uint8ArrayToBase64(new Uint8Array(privateKeyExport))
      };
    } catch (error) {
      throw new Error(`Key generation failed: ${(error as Error).message}`);
    }
  },

  async encrypt(message: string, recipientPublicKey: string, privateKey: string): Promise<string> {
    try {
      // Validate inputs
      validateMessage(message);
      validateKey(recipientPublicKey, 'public');

      if (!window.crypto.subtle) {
        throw new CryptoError('Crypto API not available');
      }
      // Generate a random IV and salt
      const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
      const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

      // Import recipient's public key
      const publicKeyData = base64ToUint8Array(recipientPublicKey);
      const publicKey = await window.crypto.subtle.importKey(
        'raw',
        publicKeyData,
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        []
      );

      // Generate an ephemeral key pair
      const ephemeralKeyPair = await window.crypto.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        ['deriveKey']
      );

      // Derive a shared secret
      const derivedKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: PBKDF2_ITERATIONS,
          hash: 'SHA-256'
        },
        ephemeralKeyPair.privateKey,
        {
          name: ALGORITHM,
          length: KEY_LENGTH
        },
        false,
        ['encrypt']
      );

      // Encode the message
      const encodedMessage = new TextEncoder().encode(message);

      // Encrypt the message
      // Validate inputs
      validateMessage(message);
      validateKey(recipientPublicKey, 'public');
      validateKey(privateKey, 'private');

      if (!window.crypto.subtle) {
        throw new CryptoError('Crypto API not available');
      }

      const encryptedContent = await window.crypto.subtle.encrypt(
        {
          name: ALGORITHM,
          iv: iv,
          additionalData: salt
        },
        derivedKey,
        encodedMessage
      );

      // Export ephemeral public key
      const ephemeralPublicKey = await window.crypto.subtle.exportKey('raw', ephemeralKeyPair.publicKey);

      // Combine IV, salt, ephemeral public key, and encrypted content
      const resultArray = new Uint8Array(
        IV_LENGTH + SALT_LENGTH + ephemeralPublicKey.byteLength + encryptedContent.byteLength
      );
      resultArray.set(iv, 0);
      resultArray.set(salt, IV_LENGTH);
      resultArray.set(new Uint8Array(ephemeralPublicKey), IV_LENGTH + SALT_LENGTH);
      resultArray.set(
        new Uint8Array(encryptedContent),
        IV_LENGTH + SALT_LENGTH + ephemeralPublicKey.byteLength
      );

      // Convert to base64
      return uint8ArrayToBase64(resultArray);
    } catch (error) {
      throw new Error(`Encryption failed: ${(error as Error).message}`);
    }
  },

  async decrypt(encryptedMessage: string, publicKey: string, privateKeyStr: string): Promise<string> {
    try {
      // Validate inputs
      validateKey(encryptedMessage, 'public'); // Encrypted message is in base64
      validateKey(publicKey, 'public');
      validateKey(privateKeyStr, 'private');

      if (!window.crypto.subtle) {
        throw new CryptoError('Crypto API not available');
      }

      // Decode the base64 message
      const encryptedArray = base64ToUint8Array(encryptedMessage);

      // Extract IV, salt, ephemeral public key, and encrypted content
      const iv = encryptedArray.slice(0, IV_LENGTH);
      const salt = encryptedArray.slice(IV_LENGTH, IV_LENGTH + SALT_LENGTH);
      const ephemeralPublicKeyData = encryptedArray.slice(
        IV_LENGTH + SALT_LENGTH,
        IV_LENGTH + SALT_LENGTH + 65
      ); // 65 bytes for uncompressed P-256 public key
      const content = encryptedArray.slice(IV_LENGTH + SALT_LENGTH + 65);

      // Import recipient's private key
      const privateKeyData = base64ToUint8Array(privateKeyStr);
      const importedPrivateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        privateKeyData,
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        ['deriveKey']
      );

      // Import ephemeral public key
      const importedEphemeralPublicKey = await window.crypto.subtle.importKey(
        'raw',
        ephemeralPublicKeyData,
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        []
      );

      // Derive the shared secret
      const derivedKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: PBKDF2_ITERATIONS,
          hash: 'SHA-256'
        },
        importedPrivateKey,
        {
          name: ALGORITHM,
          length: KEY_LENGTH
        },
        false,
        ['decrypt']
      );

      // Decrypt the message
      const decryptedContent = await window.crypto.subtle.decrypt(
        {
          name: ALGORITHM,
          iv: iv,
          additionalData: salt
        },
        derivedKey,
        content
      );

      // Decode the decrypted content
      return new TextDecoder().decode(decryptedContent);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(`Decryption failed: ${(error as Error).message}`);
    }
  }
};
