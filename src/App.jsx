import { useState, useEffect } from 'react';
import * as Freighter from '@stellar/freighter-api';
import './styles.css';

const CONTRACT_ID = 'CCECTVTJDBDGJFIWA5QHXN7VPIQLJGEA67RV76GVOI3CCQEJPCRS4HSU';

function App() {
  const [address, setAddress] = useState(null);
  const [vault, setVault] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ amount: '', unlockDate: '', description: '' });

  const connectWallet = async () => {
    try {
      const { address } = await Freighter.getAddress();
      setAddress(address);
      fetchVault(address);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVault = async (addr) => {
    setLoading(true);
    // Mocking vault data for now
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Logic to call 'deposit' on the contract
    setTimeout(() => {
      setVault({
        amount: formData.amount,
        unlock_time: new Date(formData.unlockDate).getTime() / 1000,
        deposit_time: Date.now() / 1000,
        description: formData.description
      });
      setLoading(false);
    }, 1500);
  };

  const isLocked = () => {
    if (!vault) return false;
    return vault.unlock_time > Date.now() / 1000;
  };

  return (
    <div className="container">
      <header>
        <div className="logo">AETHERIS<span>VAULT</span></div>
        {!address ? (
          <button className="btn" style={{width: 'auto'}} onClick={connectWallet}>Authorize Access</button>
        ) : (
          <div className="status-badge">{address.slice(0, 6)}...{address.slice(-4)}</div>
        )}
      </header>

      <main>
        <section className="hero">
          <h1>Time is the Ultimate Security.</h1>
          <p>Lock your assets in the Aetheris Protocol. Set your terms, secure your future, and ensure your legacy remains untouchable until the moment is right.</p>
        </section>

        {!address ? (
          <div className="card" style={{textAlign: 'center'}}>
            <h2>Identity Required</h2>
            <p style={{marginBottom: '2rem'}}>Connect your Stellar wallet to initialize the vault interface.</p>
            <button className="btn" onClick={connectWallet}>Connect Wallet</button>
          </div>
        ) : (
          <div className="grid">
            <section className="card">
              <h2>Secure Deposit</h2>
              <form onSubmit={handleDeposit}>
                <div className="form-group">
                  <label>Amount (XLM Mock)</label>
                  <input 
                    type="number" 
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Unlock Date</label>
                  <input 
                    type="datetime-local" 
                    value={formData.unlockDate} 
                    onChange={e => setFormData({...formData, unlockDate: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Vault Label</label>
                  <input 
                    type="text" 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="e.g. Legacy Fund"
                  />
                </div>
                <button type="submit" className="btn" disabled={loading}>
                  {loading ? 'Executing Protocol...' : 'Initialize Lock'}
                </button>
              </form>
            </section>

            <section className="card">
              <h2>Vault Status</h2>
              {vault ? (
                <div className="vault-info">
                  <div className="status-badge" style={{marginBottom: '2rem'}}>
                    {isLocked() ? <span className="locked">LOCKED // SECURE</span> : <span className="unlocked">RELEASE READY</span>}
                  </div>
                  <div className="info-row">
                    <span className="info-label">Asset Amount</span>
                    <span className="info-value">{vault.amount} XLM</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Unlock Time</span>
                    <span className="info-value">{new Date(vault.unlock_time * 1000).toLocaleString()}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Vault ID</span>
                    <span className="info-value">{vault.description || 'Anonymous'}</span>
                  </div>
                  
                  {!isLocked() && (
                    <button className="btn" style={{marginTop: '2rem'}} onClick={() => setVault(null)}>
                      Release Assets
                    </button>
                  )}
                </div>
              ) : (
                <p style={{color: 'var(--text-dim)'}}>No active vaults detected for this signature. Initialize a new deposit to secure your assets.</p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
