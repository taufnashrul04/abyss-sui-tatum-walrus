// Encryption utilities for WalrusVault
import CryptoJS from 'crypto-js';

const SALT_SIZE = 128;
const IV_SIZE = 128;
const KEY_SIZE = 256;
const ITERATIONS = 10000;

export class VaultEncryption {
  /**
   * Generate a random encryption key
   */
  static generateKey(): string {
    return CryptoJS.lib.WordArray.random(KEY_SIZE / 8).toString();
  }

  /**
   * Derive key from password using PBKDF2
   */
  static deriveKey(password: string, salt: string): CryptoJS.lib.WordArray {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: KEY_SIZE / 32,
      iterations: ITERATIONS,
      hasher: CryptoJS.algo.SHA256
    });
  }

  /**
   * Encrypt document data
   */
  static encrypt(data: ArrayBuffer, key: string): {
    encrypted: string;
    iv: string;
    salt: string;
  } {
    const salt = CryptoJS.lib.WordArray.random(SALT_SIZE / 8).toString();
    const iv = CryptoJS.lib.WordArray.random(IV_SIZE / 8);
    const derivedKey = this.deriveKey(key, salt);

    // Convert ArrayBuffer to WordArray
    const wordArray = CryptoJS.lib.WordArray.create(data as any);

    const encrypted = CryptoJS.AES.encrypt(wordArray, derivedKey, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return {
      encrypted: encrypted.toString(),
      iv: iv.toString(),
      salt: salt
    };
  }

  /**
   * Decrypt document data
   */
  static decrypt(
    encryptedData: string,
    key: string,
    iv: string,
    salt: string
  ): ArrayBuffer {
    const derivedKey = this.deriveKey(key, salt);

    const decrypted = CryptoJS.AES.decrypt(encryptedData, derivedKey, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    // Convert WordArray to ArrayBuffer
    const words = decrypted.words;
    const sigBytes = decrypted.sigBytes;
    const buffer = new ArrayBuffer(sigBytes);
    const view = new Uint8Array(buffer);

    for (let i = 0; i < sigBytes; i++) {
      view[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }

    return buffer;
  }

  /**
   * Generate access key for recipient
   */
  static generateRecipientKey(): string {
    return CryptoJS.lib.WordArray.random(128 / 8).toString();
  }

  /**
   * Encrypt master key with recipient's public key
   */
  static encryptKeyForRecipient(
    masterKey: string,
    recipientPublicKey: string
  ): string {
    // Simplified: In production, use proper asymmetric encryption
    // For demo, we'll use symmetric with recipient's address as part of key
    const derived = CryptoJS.SHA256(recipientPublicKey + masterKey).toString();
    return derived;
  }

  /**
   * Hash data for integrity check
   */
  static hash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }
}
