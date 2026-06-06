// WalrusVault Types

export interface Vault {
  id: string;
  owner: string;
  recipients: Recipient[];
  documents: Document[];
  timeout_days: number;
  last_checkin: number;
  created_at: number;
  is_active: boolean;
  is_claimed: boolean;
}

export interface Recipient {
  address: string;
  name: string;
  email?: string;
  has_claimed: boolean;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  walrus_blob_id: string;
  encrypted_key: string;
  uploaded_at: number;
}

export interface VaultFormData {
  recipients: Omit<Recipient, 'has_claimed'>[];
  timeout_days: number;
  documents: File[];
}

export interface CheckinStatus {
  vault_id: string;
  last_checkin: number;
  next_deadline: number;
  is_expired: boolean;
  auto_checkin_enabled: boolean;
}

export interface ClaimRequest {
  vault_id: string;
  recipient_address: string;
  signature: string;
}

// Walrus types
export interface WalrusUploadResult {
  blobId: string;
  size: number;
  cost: number;
}

// Tatum types
export interface TatumWalletActivity {
  address: string;
  last_transaction: number;
  transaction_count: number;
  is_active: boolean;
}
