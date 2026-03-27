/**
 * Simple encrypted token storage using Node.js built-in crypto and fs.
 * Stores tokens in the app's userData directory.
 */
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const STORE_FILE = 'google-tokens.enc';

// Derive a machine-specific encryption key from a stable identifier
function getEncryptionKey(): Buffer {
  const machineId = `nexus-token-store-${process.env.USER || 'default'}`;
  return crypto.scryptSync(machineId, 'nexus-salt', 32);
}

function getStorePath(): string {
  return path.join(app.getPath('userData'), STORE_FILE);
}

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp in ms
}

export function saveTokens(tokens: StoredTokens): void {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(tokens);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  const data = {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    data: encrypted,
  };

  fs.writeFileSync(getStorePath(), JSON.stringify(data), 'utf8');
}

export function loadTokens(): StoredTokens | null {
  try {
    const storePath = getStorePath();
    if (!fs.existsSync(storePath)) return null;

    const raw = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    const key = getEncryptionKey();
    const iv = Buffer.from(raw.iv, 'hex');
    const authTag = Buffer.from(raw.authTag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(raw.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted) as StoredTokens;
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  try {
    const storePath = getStorePath();
    if (fs.existsSync(storePath)) {
      fs.unlinkSync(storePath);
    }
  } catch {
    // Ignore errors during cleanup
  }
}
