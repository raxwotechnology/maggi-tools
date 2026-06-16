const fs = require('fs');

let content = fs.readFileSync('src/components/BookingForm.jsx', 'utf8');

const oldNicBlock = `<div style={{ position: 'relative' }}>
                  <Autocomplete
                    name="clientNic"
                    value={formData.clientNic}
                    onChange={e => {
                      const val = e.target.value.toUpperCase();
                      setFormData(prev => ({ ...prev, clientNic: val }));
                      const found = clients.find(c => (c.nic || '').toUpperCase() === val);
                      if (found) {
                        setFormData(prev => ({
                          ...prev,
                          clientName: found.name || prev.clientName,
                          clientPhone: found.contact || prev.clientPhone,
                          customerIdFront: found.customerIdFront || prev.customerIdFront,
                          customerIdBack: found.customerIdBack || prev.customerIdBack
                        }));
                      }
                    }}
                    options={clients.map(c => c.nic).filter(Boolean)}
                    placeholder="Enter NIC to lookup..."
                    className={fetchingHistory ? 'lookup-loading' : ''}
                  />
                  {fetchingHistory && <RefreshCw size={14} className="spinner" style={{ position: 'absolute', right: '10px', top: '12px', opacity: 0.8, color: 'var(--accent)' }} />}
                  {!fetchingHistory && customerHistory && (
                    <div style={{ position: 'absolute', right: '10px', top: '12px', color: 'var(--success)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 800 }}>
                        <ShieldCheck size={14} /> CUSTOMER FOUND
                      </div>
                    </div>
                  )}
                </div>`;

const newNicBlock = `<div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Autocomplete
                      name="clientNic"
                      value={formData.clientNic}
                      onChange={e => {
                        const val = e.target.value.toUpperCase();
                        setFormData(prev => ({ ...prev, clientNic: val }));
                        setCustomerHistory(null); // Reset history when typing
                      }}
                      options={clients.map(c => c.nic).filter(Boolean)}
                      placeholder="Enter NIC..."
                      className={fetchingHistory ? 'lookup-loading' : ''}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckCustomer}
                    disabled={fetchingHistory}
                    className="add-btn"
                    style={{ height: '42px', padding: '0 14px', flexShrink: 0 }}
                  >
                    {fetchingHistory ? <RefreshCw size={16} className="spinner" /> : <ShieldCheck size={16} />}
                    Check
                  </button>
                </div>
                {customerHistory && customerHistory.length > 0 && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Overdue Balance:</span>
                    <span>LKR {customerHistory.reduce((s, b) => s + Math.max(0, b.balanceAmount || 0), 0).toLocaleString()}</span>
                  </div>
                )}`;

if (content.includes(oldNicBlock)) {
    content = content.replace(oldNicBlock, newNicBlock);
    fs.writeFileSync('src/components/BookingForm.jsx', content);
    console.log('Fixed BookingForm.jsx block successfully');
} else {
    console.log('Error: Block not found');
}
