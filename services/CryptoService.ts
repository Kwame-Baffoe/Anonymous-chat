import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';  // Changed to match Node's cipher names
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
  return Buffer.from(array).toString('base64');
};

const base64ToUint8Array = (base64: string): Uint8Array => {
  if (!base64 || !KEY_FORMAT_REGEX.test(base64)) {
    throw new ValidationError('Invalid base64 input');
  }
  return new Uint8Array(Buffer.from(base64, 'base64'));
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
      // Generate ECDH key pair using Node's crypto module
      const keyPair = crypto.generateKeyPairSync('ec', {
        namedCurve: 'P-256',
        publicKeyEncoding: {
          type: 'spki',
          format: 'der'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'der'
        }
      });

      return {
        publicKey: uint8ArrayToBase64(new Uint8Array(keyPair.publicKey)),
        privateKey: uint8ArrayToBase64(new Uint8Array(keyPair.privateKey))
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
      validateKey(privateKey, 'private');

      // Generate random IV and salt
      const iv = crypto.randomBytes(IV_LENGTH);
      const salt = crypto.randomBytes(SALT_LENGTH);

      // Import recipient's public key
      const publicKeyData = base64ToUint8Array(recipientPublicKey);
      const publicKey = crypto.createPublicKey({
        key: Buffer.from(publicKeyData),
        type: 'spki',
        format: 'der'
      });

      // Generate ephemeral key pair
      const ephemeralKeyPair = crypto.generateKeyPairSync('ec', {
        namedCurve: 'P-256',
        publicKeyEncoding: {
          type: 'spki',
          format: 'der'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'der'
        }
      });

      // Derive shared secret using PBKDF2
      const sharedSecret = crypto.pbkdf2Sync(
        ephemeralKeyPair.privateKey,
        salt,
        PBKDF2_ITERATIONS,
        KEY_LENGTH / 8,
        'sha256'
      );

      // Create cipher and encrypt
      const cipher = crypto.createCipheriv(ALGORITHM, sharedSecret, iv);
      cipher.setAAD(salt);

      const encodedMessage = Buffer.from(message, 'utf8');
      const encrypted = Buffer.concat([
        cipher.update(encodedMessage),
        cipher.final(),
        cipher.getAuthTag()
      ]);

      // Combine IV, salt, ephemeral public key, and encrypted content
      const resultArray = Buffer.concat([
        iv,
        salt,
        Buffer.from(ephemeralKeyPair.publicKey),
        encrypted
      ]);

      return uint8ArrayToBase64(new Uint8Array(resultArray));
    } catch (error) {
      throw new Error(`Encryption failed: ${(error as Error).message}`);
    }
  },

  async decrypt(encryptedMessage: string, publicKey: string, privateKeyStr: string): Promise<string> {
    try {
      // Validate inputs
      validateKey(encryptedMessage, 'public');
      validateKey(publicKey, 'public');
      validateKey(privateKeyStr, 'private');

      // Decode the base64 message
      const encryptedArray = base64ToUint8Array(encryptedMessage);
      const encryptedBuffer = Buffer.from(encryptedArray);

      // Extract components
      const iv = encryptedBuffer.slice(0, IV_LENGTH);
      const salt = encryptedBuffer.slice(IV_LENGTH, IV_LENGTH + SALT_LENGTH);
      const ephemeralPublicKeyData = encryptedBuffer.slice(
        IV_LENGTH + SALT_LENGTH,
        IV_LENGTH + SALT_LENGTH + 91 // DER encoded P-256 public key length
      );
      const encrypted = encryptedBuffer.slice(IV_LENGTH + SALT_LENGTH + 91);
      const authTag = encrypted.slice(-16);
      const content = encrypted.slice(0, -16);

      // Import keys
      const privateKey = crypto.createPrivateKey({
        key: Buffer.from(base64ToUint8Array(privateKeyStr)),
        type: 'pkcs8',
        format: 'der'
      });

      const ephemeralPublicKey = crypto.createPublicKey({
        key: ephemeralPublicKeyData,
        type: 'spki',
        format: 'der'
      });

      // Derive shared secret
      const sharedSecret = crypto.pbkdf2Sync(
        privateKey.export({ type: 'pkcs8', format: 'der' }),
        salt,
        PBKDF2_ITERATIONS,
        KEY_LENGTH / 8,
        'sha256'
      );

      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, sharedSecret, iv);
      decipher.setAAD(salt);
      decipher.setAuthTag(authTag);

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(content),
        decipher.final()
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      if (error instanceof ValidationError || error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(`Decryption failed: ${(error as Error).message}`);
    }
  }
};
