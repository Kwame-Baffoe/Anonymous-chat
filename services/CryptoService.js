"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoService = void 0;

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

exports.CryptoService = {
    async generateKeyPair() {
        try {
            // Generate a random encryption key
            const key = await window.crypto.subtle.generateKey(
                {
                    name: ALGORITHM,
                    length: KEY_LENGTH
                },
                true, // extractable
                ['encrypt', 'decrypt']
            );

            // Export the key to raw format
            const rawKey = await window.crypto.subtle.exportKey('raw', key);
            const publicKey = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
            const privateKey = publicKey; // In AES, the same key is used for encryption and decryption

            return {
                publicKey,
                privateKey
            };
        } catch (error) {
            throw new Error(`Key generation failed: ${error.message}`);
        }
    },

    async encrypt(message, recipientPublicKey) {
        try {
            // Generate a random IV
            const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
            const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

            // Convert base64 key back to CryptoKey
            const keyData = Uint8Array.from(atob(recipientPublicKey), c => c.charCodeAt(0));
            const key = await window.crypto.subtle.importKey(
                'raw',
                keyData,
                ALGORITHM,
                false,
                ['encrypt']
            );

            // Encode the message
            const encodedMessage = new TextEncoder().encode(message);

            // Encrypt the message
            const encryptedContent = await window.crypto.subtle.encrypt(
                {
                    name: ALGORITHM,
                    iv: iv,
                    additionalData: salt // Additional authenticated data
                },
                key,
                encodedMessage
            );

            // Combine IV, salt, and encrypted content
            const resultArray = new Uint8Array(IV_LENGTH + SALT_LENGTH + encryptedContent.byteLength);
            resultArray.set(iv, 0);
            resultArray.set(salt, IV_LENGTH);
            resultArray.set(new Uint8Array(encryptedContent), IV_LENGTH + SALT_LENGTH);

            // Convert to base64
            return btoa(String.fromCharCode(...resultArray));
        } catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    },

    async decrypt(encryptedMessage, recipientPrivateKey) {
        try {
            // Decode the base64 message
            const encryptedArray = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));

            // Extract IV, salt, and encrypted content
            const iv = encryptedArray.slice(0, IV_LENGTH);
            const salt = encryptedArray.slice(IV_LENGTH, IV_LENGTH + SALT_LENGTH);
            const content = encryptedArray.slice(IV_LENGTH + SALT_LENGTH);

            // Convert base64 key back to CryptoKey
            const keyData = Uint8Array.from(atob(recipientPrivateKey), c => c.charCodeAt(0));
            const key = await window.crypto.subtle.importKey(
                'raw',
                keyData,
                ALGORITHM,
                false,
                ['decrypt']
            );

            // Decrypt the message
            const decryptedContent = await window.crypto.subtle.decrypt(
                {
                    name: ALGORITHM,
                    iv: iv,
                    additionalData: salt // Additional authenticated data
                },
                key,
                content
            );

            // Decode the decrypted content
            return new TextDecoder().decode(decryptedContent);
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }
};
