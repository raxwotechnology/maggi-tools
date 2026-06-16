const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/BookingBook.jsx', 'utf8');

// 1. Add deposit to state
content = content.replace(/discount: '',/g, "discount: '',\n    deposit: '',");

// 2. Add deposit to init
content = content.replace(/discount: record\.discount \|\| '',/g, "discount: record.discount || '',\n      deposit: record.securityDeposit || '',");

// 3. Add deposit to sms string
content = content.replace(/Other Charges: \$\{f\(builder\.otherCharges\)\}/g, "Other Charges: ${f(builder.otherCharges)}\nDeposit: ${f(builder.deposit)}");

// 4. Add deposit to HTML inputs
const depositInput = `             <div>
               <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Deposit</label>
               <input type="number" placeholder="Deposit" value={smsBuilder.deposit} onChange={e => { const nb = {...smsBuilder, deposit: e.target.value}; setSmsBuilder(nb); setCustomSmsText(getSmsString(nb, smsRecord)); }} style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }} />
             </div>
`;
content = content.replace(/<label style=\{\{ fontSize: '0\.8rem', color: 'var\(--text-dim\)' \}\}>Discount<\/label>/g, depositInput + "               <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Discount</label>");

fs.writeFileSync('frontend/src/components/BookingBook.jsx', content);
console.log('Added deposit');
