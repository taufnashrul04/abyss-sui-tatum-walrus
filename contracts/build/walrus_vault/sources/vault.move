// WalrusVault - Dead Man's Switch Smart Contract
// Built for Tatum x Walrus Hackathon

module walrus_vault::vault {
    use sui::clock::Clock;
    use sui::event;

    // ======== Constants ========
    const E_VAULT_NOT_EXPIRED: u64 = 1;
    const E_ALREADY_CLAIMED: u64 = 2;
    const E_NOT_RECIPIENT: u64 = 3;
    const E_VAULT_EXPIRED: u64 = 4;
    const E_INVALID_TIMEOUT: u64 = 6;
    const E_ALREADY_RECIPIENT: u64 = 7;
    const E_RECIPIENT_NOT_FOUND: u64 = 8;
    const E_INVALID_THRESHOLD: u64 = 9;

    const MIN_TIMEOUT_MS: u64 = 600000; // 10 minutes
    const MAX_TIMEOUT_MS: u64 = 315360000000; // 10 years

    // ======== Structs ========

    /// Recipient info
    public struct Recipient has store, copy, drop {
        addr: address,
        name: vector<u8>,
        has_claimed: bool,
    }

    /// Document metadata (encrypted blob stored on Walrus)
    public struct Document has store, drop {
        name: vector<u8>,
        doc_type: vector<u8>,
        blob_id: vector<u8>,
        encrypted_key: vector<u8>,
        size: u64,
        uploaded_at: u64,
    }

    /// The main Vault object
    public struct Vault has key, store {
        id: UID,
        owner: address,
        recipients: vector<Recipient>,
        documents: vector<Document>,
        timeout_ms: u64,
        last_checkin_ms: u64,
        created_at_ms: u64,
        auto_checkin: bool,
        is_expired: bool,
        emergency_threshold: u8,
    }

    /// Capability token for vault owner
    public struct VaultCap has key, store {
        id: UID,
        vault_id: address,
    }

    /// Global registry to track all active vaults
    public struct VaultRegistry has key {
        id: UID,
        vaults: vector<address>,
    }

    fun init(ctx: &mut TxContext) {
        let registry = VaultRegistry {
            id: object::new(ctx),
            vaults: vector[],
        };
        sui::transfer::share_object(registry);
    }

    // ======== Events ========

    public struct VaultCreated has copy, drop {
        vault_id: address,
        owner: address,
        recipient_count: u64,
        timeout_ms: u64,
    }

    public struct DocumentUploaded has copy, drop {
        vault_id: address,
        doc_name: vector<u8>,
        blob_id: vector<u8>,
    }

    public struct CheckedIn has copy, drop {
        vault_id: address,
        owner: address,
        new_deadline_ms: u64,
    }

    public struct AccessClaimed has copy, drop {
        vault_id: address,
        recipient: address,
    }

    public struct VaultExpired has copy, drop {
        vault_id: address,
    }

    public struct EmergencyRelease has copy, drop {
        vault_id: address,
        approver_count: u64,
    }

    // ======== Functions ========

    /// Create a new vault
    public fun create_vault(
        registry: &mut VaultRegistry,
        recipient_addrs: vector<address>,
        recipient_names: vector<vector<u8>>,
        timeout_ms: u64,
        auto_checkin: bool,
        emergency_threshold: u8,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(timeout_ms >= MIN_TIMEOUT_MS && timeout_ms <= MAX_TIMEOUT_MS, E_INVALID_TIMEOUT);
        assert!(vector::length(&recipient_addrs) > 0, E_NOT_RECIPIENT);
        assert!(
            emergency_threshold <= (vector::length(&recipient_addrs) as u8),
            E_INVALID_THRESHOLD
        );

        let owner = ctx.sender();
        let now = clock.timestamp_ms();

        // Build recipients list
        let mut recipients = vector[];
        let mut i = 0;
        let len = vector::length(&recipient_addrs);
        while (i < len) {
            let r = Recipient {
                addr: recipient_addrs[i],
                name: recipient_names[i],
                has_claimed: false,
            };
            vector::push_back(&mut recipients, r);
            i = i + 1;
        };

        let vault = Vault {
            id: object::new(ctx),
            owner,
            recipients,
            documents: vector[],
            timeout_ms,
            last_checkin_ms: now,
            created_at_ms: now,
            auto_checkin,
            is_expired: false,
            emergency_threshold,
        };

        let cap = VaultCap {
            id: object::new(ctx),
            vault_id: object::uid_to_address(&vault.id),
        };

        event::emit(VaultCreated {
            vault_id: object::uid_to_address(&vault.id),
            owner,
            recipient_count: len,
            timeout_ms,
        });

        vector::push_back(&mut registry.vaults, object::uid_to_address(&vault.id));

        sui::transfer::public_share_object(vault);
        sui::transfer::public_transfer(cap, owner);
    }

    /// Upload document metadata to vault
    public fun upload_document(
        vault: &mut Vault,
        _cap: &VaultCap,
        name: vector<u8>,
        doc_type: vector<u8>,
        blob_id: vector<u8>,
        encrypted_key: vector<u8>,
        size: u64,
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        assert!(!vault.is_expired, E_VAULT_EXPIRED);
        
        let doc = Document {
            name,
            doc_type,
            blob_id,
            encrypted_key,
            size,
            uploaded_at: clock.timestamp_ms(),
        };

        event::emit(DocumentUploaded {
            vault_id: object::uid_to_address(&vault.id),
            doc_name: doc.name,
            blob_id: doc.blob_id,
        });

        vector::push_back(&mut vault.documents, doc);
    }

    /// Check in to keep vault alive
    public fun check_in(
        vault: &mut Vault,
        _cap: &VaultCap,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(!vault.is_expired, E_VAULT_EXPIRED);
        
        let now = clock.timestamp_ms();
        vault.last_checkin_ms = now;

        let deadline_ms = now + vault.timeout_ms;

        event::emit(CheckedIn {
            vault_id: object::uid_to_address(&vault.id),
            owner: ctx.sender(),
            new_deadline_ms: deadline_ms,
        });
    }

    /// Recipient claims access after vault expires
    public fun claim_access(
        vault: &mut Vault,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = ctx.sender();
        let now = clock.timestamp_ms();
        let deadline_ms = vault.last_checkin_ms + vault.timeout_ms;

        // Check if expired
        if (now >= deadline_ms) {
            vault.is_expired = true;
            event::emit(VaultExpired {
                vault_id: object::uid_to_address(&vault.id),
            });
        };
        assert!(vault.is_expired, E_VAULT_NOT_EXPIRED);

        // Find and mark recipient
        let mut found = false;
        let mut i = 0;
        let len = vector::length(&vault.recipients);
        while (i < len) {
            let r = &mut vault.recipients[i];
            if (r.addr == sender) {
                assert!(!r.has_claimed, E_ALREADY_CLAIMED);
                r.has_claimed = true;
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, E_NOT_RECIPIENT);

        event::emit(AccessClaimed {
            vault_id: object::uid_to_address(&vault.id),
            recipient: sender,
        });
    }

    /// Emergency release (N-of-M recipients agree)
    public fun emergency_release(
        vault: &mut Vault,
        approver_addrs: vector<address>,
        _clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        // Verify threshold
        assert!(
            (vector::length(&approver_addrs) as u8) >= vault.emergency_threshold,
            E_INVALID_THRESHOLD
        );

        // Mark as expired and approve
        vault.is_expired = true;

        let mut i = 0;
        let len = vector::length(&approver_addrs);
        while (i < len) {
            let approver = approver_addrs[i];
            let mut j = 0;
            let rlen = vector::length(&vault.recipients);
            while (j < rlen) {
                let r = &mut vault.recipients[j];
                if (r.addr == approver) {
                    r.has_claimed = true;
                    break
                };
                j = j + 1;
            };
            i = i + 1;
        };

        event::emit(EmergencyRelease {
            vault_id: object::uid_to_address(&vault.id),
            approver_count: vector::length(&approver_addrs),
        });
    }

    /// Add recipient (owner only)
    public fun add_recipient(
        vault: &mut Vault,
        _cap: &VaultCap,
        addr: address,
        name: vector<u8>,
        _ctx: &mut TxContext,
    ) {
        assert!(!vault.is_expired, E_VAULT_EXPIRED);

        // Check not duplicate
        let mut i = 0;
        let len = vector::length(&vault.recipients);
        while (i < len) {
            assert!(vault.recipients[i].addr != addr, E_ALREADY_RECIPIENT);
            i = i + 1;
        };

        vector::push_back(&mut vault.recipients, Recipient {
            addr,
            name,
            has_claimed: false,
        });
    }

    /// Remove recipient (owner only)
    public fun remove_recipient(
        vault: &mut Vault,
        _cap: &VaultCap,
        addr: address,
        _ctx: &mut TxContext,
    ) {
        assert!(!vault.is_expired, E_VAULT_EXPIRED);

        let mut found = false;
        let mut i = 0;
        let len = vector::length(&vault.recipients);
        while (i < len) {
            if (vault.recipients[i].addr == addr) {
                vault.recipients.remove(i);
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, E_RECIPIENT_NOT_FOUND);
    }

    // ======== View Functions ========

    /// Get all vaults from registry
    public fun get_all_vaults(registry: &VaultRegistry): vector<address> {
        registry.vaults
    }

    /// Check if vault is expired
    public fun is_expired(vault: &Vault, clock: &Clock): bool {
        let now = clock.timestamp_ms();
        let deadline_ms = vault.last_checkin_ms + vault.timeout_ms;
        now >= deadline_ms
    }

    /// Get vault info
    public fun get_vault_info(vault: &Vault): (address, u64, u64, u64, bool, bool) {
        (
            vault.owner,
            vault.timeout_ms,
            vault.last_checkin_ms,
            vector::length(&vault.documents),
            vault.is_expired,
            vault.auto_checkin,
        )
    }

    /// Get document count
    public fun get_document_count(vault: &Vault): u64 {
        vector::length(&vault.documents)
    }

    /// Get recipient count
    public fun get_recipient_count(vault: &Vault): u64 {
        vector::length(&vault.recipients)
    }
}
