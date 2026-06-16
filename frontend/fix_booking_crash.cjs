const fs = require('fs');

let content = fs.readFileSync('src/components/BookingBook.jsx', 'utf8');

const badBlock = `
                <button className="action-icon-btn btn-details" onClick={(e) => { e.stopPropagation(); setSelectedRecord(r.rawData || r); setViewModalOpen(true); }} title="View Details">
                  <Eye />
                </button>
                {canManage && (`;

content = content.replace(badBlock, '{canManage && (');

const target1 = `ACTION: (
              <div className="table-actions" onClick={e => e.stopPropagation()}>
                {canManage && (`;

const replace1 = `ACTION: (
              <div className="table-actions" onClick={e => e.stopPropagation()}>
                <button className="action-icon-btn btn-details" onClick={(e) => { e.stopPropagation(); setSelectedRecord(r.rawData || r); setViewModalOpen(true); }} title="View Details">
                  <Eye />
                </button>
                {canManage && (`;

content = content.replace(target1, replace1);

fs.writeFileSync('src/components/BookingBook.jsx', content);
console.log('Fixed BookingBook.jsx crash');
