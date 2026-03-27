/**
 * Encrypted credential storage for Notion integration.
 * Follows the same pattern as tokenStore.ts but stores Notion-specific credentials.
 */
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const STORE_FILE = 'notion-credentials.enc';

function getEncryptionKey(): Buffer {
  const machineId = `nexus-notion-store-${process.env.USER || 'default'}`;
  return crypto.scryptSync(machineId, 'nexus-notion-salt', 32);
}

function getStorePath(): string {
  return path.join(app.getPath('userData'), STORE_FILE);
}

export interface NotionCredentials {
  apiKey: string;
  databaseId: string;
  userEmail: string;
  userId?: string; // Notion user ID (UUID) resolved from email
}

export function saveNotionCredentials(creds: NotionCredentials): void {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(creds);
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

export function loadNotionCredentials(): NotionCredentials | null {
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

    return JSON.parse(decrypted) as NotionCredentials;
  } catch {
    return null;
  }
}

export function clearNotionCredentials(): void {
  try {
    const storePath = getStorePath();
    if (fs.existsSync(storePath)) {
      fs.unlinkSync(storePath);
    }
  } catch {
    // Ignore errors during cleanup
  }
}
