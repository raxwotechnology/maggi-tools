const fs = require('fs');

let content = fs.readFileSync('src/components/BookingBook.jsx', 'utf8');

// Remove onRowClick
content = content.replace(/onRowClick=\{\(record\) => \{ setSelectedRecord\(record\.rawData \|\| record\); setViewModalOpen\(true\); \}\}/g, '');

// Add Eye icon to the ACTION block
if (!content.includes('<Eye />')) {
    content = content.replace('import { Search', 'import { Eye, Search');
    const newAction = `
                <button className="action-icon-btn btn-details" onClick={(e) => { e.stopPropagation(); setSelectedRecord(r.rawData || r); setViewModalOpen(true); }} title="View Details">
                  <Eye />
                </button>
                {canManage && (`;
    content = content.replace('{canManage && (', newAction);
}

fs.writeFileSync('src/components/BookingBook.jsx', content);
console.log('Fixed BookingBook.jsx');
