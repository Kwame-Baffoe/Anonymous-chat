import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

export const CryptoService = {
  generateKeyPair: () => {
    const keyPair = nacl.box.keyPair();
    return {
      publicKey: naclUtil.encodeBase64(keyPair.publicKey),
      privateKey: naclUtil.encodeBase64(keyPair.secretKey),
    };
  },
  encrypt: (message: string, theirPublicKey: string, myPrivateKey: string): string => {
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const messageUint8 = naclUtil.decodeUTF8(message);
    const encrypted = nacl.box(
      messageUint8,
      nonce,
      naclUtil.decodeBase64(theirPublicKey),
      naclUtil.decodeBase64(myPrivateKey)
    );
    const fullMessage = new Uint8Array(nonce.length + encrypted.length);
    fullMessage.set(nonce);
    fullMessage.set(encrypted, nonce.length);
    return naclUtil.encodeBase64(fullMessage);
  },
  decrypt: (messageWithNonce: string, theirPublicKey: string, myPrivateKey: string): string => {
    const messageWithNonceAsUint8Array = naclUtil.decodeBase64(messageWithNonce);
    const nonce = messageWithNonceAsUint8Array.slice(0, nacl.box.nonceLength);
    const message = messageWithNonceAsUint8Array.slice(
      nacl.box.nonceLength,
      messageWithNonce.length
    );
    const decrypted = nacl.box.open(
      message,
      nonce,
      naclUtil.decodeBase64(theirPublicKey),
      naclUtil.decodeBase64(myPrivateKey)
    );
    if (!decrypted) {
      throw new Error('Could not decrypt message');
    }
    return naclUtil.encodeUTF8(decrypted);
  },
};