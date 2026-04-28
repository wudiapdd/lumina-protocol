#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String};

#[contracttype]
#[derive(Clone, Debug)]
pub struct VaultEntry {
    pub amount: u64,
    pub unlock_time: u64,
    pub deposit_time: u64,
    pub description: String,
}

#[contracttype]
pub enum DataKey {
    Vault(Address),
}

#[contract]
pub struct AetherisVault;

#[contractimpl]
impl AetherisVault {
    pub fn deposit(env: Env, user: Address, amount: u64, unlock_time: u64, description: String) {
        user.require_auth();

        let current_time = env.ledger().timestamp();
        if unlock_time <= current_time {
            panic!("Unlock time must be in the future");
        }

        let entry = VaultEntry {
            amount,
            unlock_time,
            deposit_time: current_time,
            description,
        };

        env.storage().instance().set(&DataKey::Vault(user.clone()), &entry);
        env.storage().instance().extend_ttl(17280, 120960);

        env.events().publish((symbol_short!("deposit"), user), amount);
    }

    pub fn withdraw(env: Env, user: Address) -> u64 {
        user.require_auth();

        let key = DataKey::Vault(user.clone());
        let entry: VaultEntry = env.storage().instance().get(&key).expect("No vault found for user");

        if env.ledger().timestamp() < entry.unlock_time {
            panic!("Vault is still locked");
        }

        env.storage().instance().remove(&key);
        env.events().publish((symbol_short!("withdraw"), user), entry.amount);
        
        entry.amount
    }

    pub fn get_vault(env: Env, user: Address) -> Option<VaultEntry> {
        env.storage().instance().get(&DataKey::Vault(user))
    }
}
