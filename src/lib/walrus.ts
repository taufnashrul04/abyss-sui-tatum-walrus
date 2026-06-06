// Walrus Storage Integration — REST API approach (no SDK issues)
// Walrus Testnet aggregator + publisher endpoints

const WALRUS_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';
const WALRUS_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space';

export interface WalrusUploadResult {
  blobId: string;
  size: number;
  alreadyCertified?: boolean;
}

export class WalrusStorage {
  private publisherUrl: string;
  private aggregatorUrl: string;

  constructor(
    publisherUrl: string = WALRUS_PUBLISHER,
    aggregatorUrl: string = WALRUS_AGGREGATOR
  ) {
    this.publisherUrl = publisherUrl;
    this.aggregatorUrl = aggregatorUrl;
  }

  /**
   * Upload data to Walrus
   * @param data - Raw data (string or Uint8Array)
   * @param epochs - Number of epochs to store (default 5)
   */
  async uploadBlob(
    data: string | Uint8Array,
    epochs: number = 5
  ): Promise<WalrusUploadResult> {
    const body = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);

    const response = await fetch(
      `${this.publisherUrl}/v1/blobs?epochs=${epochs}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: body as any,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Walrus upload failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    // Response format: { newlyCreated: { blobObject: { blobId, ... } } } or { alreadyCertified: { blobId, ... } }
    const blobId = 
      result.newlyCreated?.blobObject?.blobId || 
      result.alreadyCertified?.blobId || 
      result.blobObject?.blobId;
    
    if (!blobId) {
      console.error("Walrus response:", result);
      throw new Error('No blobId in response');
    }

    return {
      blobId,
      size: body.length,
      alreadyCertified: !!result.alreadyCertified,
    };
  }

  /**
   * Download data from Walrus
   * @param blobId - The blob ID to download
   * @returns Raw Uint8Array data
   */
  async downloadBlob(blobId: string): Promise<Uint8Array> {
    const response = await fetch(
      `${this.aggregatorUrl}/v1/blobs/${blobId}`
    );

    if (!response.ok) {
      throw new Error(`Walrus download failed (${response.status})`);
    }

    return new Uint8Array(await response.arrayBuffer());
  }

  /**
   * Download blob as text
   */
  async downloadBlobAsText(blobId: string): Promise<string> {
    const data = await this.downloadBlob(blobId);
    return new TextDecoder().decode(data);
  }

  /**
   * Check if blob exists
   */
  async blobExists(blobId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.aggregatorUrl}/v1/blobs/${blobId}`,
        { method: 'HEAD' }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get blob status/info
   */
  async getBlobStatus(blobId: string): Promise<{
    exists: boolean;
    size?: number;
    certified?: boolean;
  }> {
    try {
      const response = await fetch(
        `${this.aggregatorUrl}/v1/blobs/${blobId}/status`
      );
      if (!response.ok) return { exists: false };
      const data = await response.json();
      return {
        exists: true,
        size: data.size,
        certified: data.certified,
      };
    } catch {
      return { exists: false };
    }
  }
}

// Singleton instance
let walrusInstance: WalrusStorage | null = null;

export function getWalrusClient(): WalrusStorage {
  if (!walrusInstance) {
    walrusInstance = new WalrusStorage();
  }
  return walrusInstance;
}
