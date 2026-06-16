const fs = require('fs');

if (fs.existsSync('src/components/InvoiceBook.jsx')) {
    let content = fs.readFileSync('src/components/InvoiceBook.jsx', 'utf8');

    // Remove onRowClick
    content = content.replace(/onRowClick=\{\(r\) => \{ setSelectedRecord\(r\.rawData \|\| r\); setIsDetailsOpen\(true\); \}\}/g, '');

    if (!content.includes('<Eye />')) {
        content = content.replace('import { Search', 'import { Eye, Search');
        
        // Add eye to invoices action
        const invoiceAction = `
                <button className="action-icon-btn btn-details" onClick={(e) => { e.stopPropagation(); setSelectedRecord(inv.rawData || inv); setIsDetailsOpen(true); }} title="View Details">
                  <Eye />
                </button>
                <button className="action-icon-btn btn-print"`;
        content = content.replace('<button className="action-icon-btn btn-print"', invoiceAction);

        // Replace the old payment detail button with the new one using Eye
        const oldPaymentAction = `<button className="action-icon-btn btn-details" onClick={() => { setSelectedRecord(pay); setIsDetailsOpen(true); }}>
              <FileText />
            </button>`;
        const paymentAction = `
            <button className="action-icon-btn btn-details" onClick={(e) => { e.stopPropagation(); setSelectedRecord(pay.rawData || pay); setIsDetailsOpen(true); }} title="View Details">
              <Eye />
            </button>`;
        content = content.replace(oldPaymentAction, paymentAction);
    }

    fs.writeFileSync('src/components/InvoiceBook.jsx', content);
    console.log('Fixed InvoiceBook.jsx');
}

if (fs.existsSync('src/components/PaymentBook.jsx')) {
    let content = fs.readFileSync('src/components/PaymentBook.jsx', 'utf8');

    content = content.replace(/onRowClick=\{\(r\) => \{ setSelectedRecord\(r\.rawData \|\| r\); setIsDetailsOpen\(true\); \}\}/g, '');
    
    if (!content.includes('<Eye />')) {
        content = content.replace('import { Search', 'import { Eye, Search');
        
        const actionHtml = `
            <button className="action-icon-btn btn-details" onClick={(e) => { e.stopPropagation(); setSelectedRecord(pay.rawData || pay); setIsDetailsOpen(true); }} title="View Details">
              <Eye />
            </button>
            {canManage`;
        content = content.replace('{canManage', actionHtml);
    }
    
    fs.writeFileSync('src/components/PaymentBook.jsx', content);
    console.log('Fixed PaymentBook.jsx');
}
