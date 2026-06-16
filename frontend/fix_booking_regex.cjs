const fs = require('fs');

let content = fs.readFileSync('src/components/BookingForm.jsx', 'utf8');

const regex = /<div style=\{\{ position: 'relative' \}\}>\s*<Autocomplete\s*name="clientNic"[\s\S]*?options=\{clients\.map\(c => c\.nic\)\.filter\(Boolean\)\}[\s\S]*?\/>[\s\S]*?CUSTOMER FOUND[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

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
                )}
              </div>`;

if (content.match(regex)) {
    content = content.replace(regex, newNicBlock);
    
    // Also remove the bottom history block
    const historyBlockRegex = /\{\/\* ── Quick Customer Financial Indicators ── \*\/\}[\s\S]*?\{customerHistory && \([\s\S]*?Check Customer[\s\S]*?<\/button>\s*<\/div>\s*<\/div>\s*\)\}/;
    content = content.replace(historyBlockRegex, '{/* Customer History Modal Removed */}');

    const modalRegex = /\{\/\* ── Customer Details Modal ── \*\/\}[\s\S]*?\{customerModalOpen && customerHistory && \([\s\S]*?backdropFilter: 'blur\(8px\)'[\s\S]*?<\/div>\s*\)\}/;
    content = content.replace(modalRegex, '');

    fs.writeFileSync('src/components/BookingForm.jsx', content);
    console.log('Fixed BookingForm.jsx via regex successfully');
} else {
    console.log('Error: Regex did not match');
}
