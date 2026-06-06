import fs from 'fs';
import path from 'path';

export interface VaultRecord {
  vaultId: string;
  emails: string[];
  emailSent: boolean;
  createdAt: number;
}

const dbPath = path.join(process.cwd(), 'src', 'lib', 'db.json');

// Ensure db file exists
function initDb() {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify([], null, 2), 'utf-8');
  }
}

export function getVaults(): VaultRecord[] {
  try {
    initDb();
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading DB:', error);
    return [];
  }
}

export function saveVault(vaultId: string, emails: string[]): boolean {
  try {
    initDb();
    const records = getVaults();
    if (records.some(r => r.vaultId === vaultId)) {
      return true; // Already exists
    }
    records.push({
      vaultId,
      emails,
      emailSent: false,
      createdAt: Date.now(),
    });
    fs.writeFileSync(dbPath, JSON.stringify(records, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving vault in DB:', error);
    return false;
  }
}

export function markEmailSent(vaultId: string): boolean {
  try {
    initDb();
    const records = getVaults();
    const index = records.findIndex(r => r.vaultId === vaultId);
    if (index !== -1) {
      records[index].emailSent = true;
      fs.writeFileSync(dbPath, JSON.stringify(records, null, 2), 'utf-8');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating vault in DB:', error);
    return false;
  }
}
