const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/ComplianceBook.jsx', 'utf8');

const oldModal = /\{\/\*\s*Renewal Modal\s*\*\/\}\s*<Modal isOpen=\{renewalModal\.isOpen\}[\s\S]*?<\/Modal>/;

const newModal = `{/* Renewal Modal */}
      <Modal isOpen={renewalModal.isOpen} onClose={() => setRenewalModal({ ...renewalModal, isOpen: false })} title={\`Update \${renewalModal.type}\`}>
        <form onSubmit={handleRenewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
           <div style={{ background: 'linear-gradient(145deg, var(--bg-card), var(--accent-soft))', padding: '20px', borderRadius: '16px', border: '1px solid var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Target Asset</span>
                 <strong style={{ fontSize: '1.4rem', color: 'var(--text-main)', marginTop: '4px' }}>{renewalModal.toolNumber}</strong>
              </div>
              <div style={{ background: 'var(--bg-main)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                 <Package size={24} />
              </div>
           </div>

           <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-soft)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
             <div>
               <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-dim)', marginBottom: '6px' }}>New {renewalModal.type} Date *</label>
               <div style={{ position: 'relative' }}>
                  <Calendar size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)' }} />
                  <input 
                     type="date" required 
                     value={renewalModal.newExpirationDate} 
                     onChange={e => setRenewalModal({ ...renewalModal, newExpirationDate: e.target.value })} 
                     style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', fontSize: '0.95rem', color: 'var(--text-main)', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                     onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                     onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
               </div>
             </div>

             <div>
               <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-dim)', marginBottom: '6px' }}>Maintenance Cost (LKR)</label>
               <div style={{ position: 'relative' }}>
                  <CreditCard size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input 
                     type="number" placeholder="Enter Cost (Optional)" 
                     value={renewalModal.cost} 
                     onChange={e => setRenewalModal({ ...renewalModal, cost: e.target.value })} 
                     style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', fontSize: '0.95rem', color: 'var(--text-main)', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                     onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                     onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
               </div>
             </div>
           </div>

           <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
             <button type="button" onClick={() => setRenewalModal({ ...renewalModal, isOpen: false })} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => Object.assign(e.currentTarget.style, { background: '#e2e8f0', transform: 'translateY(-2px)' })} onMouseOut={e => Object.assign(e.currentTarget.style, { background: 'var(--bg-main)', transform: 'none' })}>
                Cancel
             </button>
             <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, var(--accent), var(--accent-glow))', color: '#fff', fontWeight: '800', cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px var(--accent-soft)', transition: 'all 0.2s', opacity: isSubmitting ? 0.7 : 1 }} onMouseOver={e => { if(!isSubmitting) Object.assign(e.currentTarget.style, { transform: 'translateY(-2px)', boxShadow: '0 6px 20px var(--accent-soft)' }) }} onMouseOut={e => { if(!isSubmitting) Object.assign(e.currentTarget.style, { transform: 'none', boxShadow: '0 4px 15px var(--accent-soft)' }) }}>
                {isSubmitting ? 'Processing Update...' : 'Confirm System Update'}
             </button>
           </div>
        </form>
      </Modal>`;

content = content.replace(oldModal, newModal);
if(!content.includes('Package,')) {
    content = content.replace("import { CreditCard, Calendar", "import { CreditCard, Calendar, Package");
}
fs.writeFileSync('frontend/src/components/ComplianceBook.jsx', content);
console.log('Fixed Compliance modal');
