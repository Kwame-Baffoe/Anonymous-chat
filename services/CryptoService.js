"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoService = void 0;
var tweetnacl_1 = __importDefault(require("tweetnacl"));
var tweetnacl_util_1 = __importDefault(require("tweetnacl-util"));
exports.CryptoService = {
    generateKeyPair: function () {
        var keyPair = tweetnacl_1.default.box.keyPair();
        return {
            publicKey: tweetnacl_util_1.default.encodeBase64(keyPair.publicKey),
            privateKey: tweetnacl_util_1.default.encodeBase64(keyPair.secretKey),
        };
    },
    encrypt: function (message, theirPublicKey, myPrivateKey) {
        var nonce = tweetnacl_1.default.randomBytes(tweetnacl_1.default.box.nonceLength);
        var messageUint8 = tweetnacl_util_1.default.decodeUTF8(message);
        var encrypted = tweetnacl_1.default.box(messageUint8, nonce, tweetnacl_util_1.default.decodeBase64(theirPublicKey), tweetnacl_util_1.default.decodeBase64(myPrivateKey));
        var fullMessage = new Uint8Array(nonce.length + encrypted.length);
        fullMessage.set(nonce);
        fullMessage.set(encrypted, nonce.length);
        return tweetnacl_util_1.default.encodeBase64(fullMessage);
    },
    decrypt: function (messageWithNonce, theirPublicKey, myPrivateKey) {
        var messageWithNonceAsUint8Array = tweetnacl_util_1.default.decodeBase64(messageWithNonce);
        var nonce = messageWithNonceAsUint8Array.slice(0, tweetnacl_1.default.box.nonceLength);
        var message = messageWithNonceAsUint8Array.slice(tweetnacl_1.default.box.nonceLength, messageWithNonce.length);
        var decrypted = tweetnacl_1.default.box.open(message, nonce, tweetnacl_util_1.default.decodeBase64(theirPublicKey), tweetnacl_util_1.default.decodeBase64(myPrivateKey));
        if (!decrypted) {
            throw new Error('Could not decrypt message');
        }
        return tweetnacl_util_1.default.encodeUTF8(decrypted);
    },
};
