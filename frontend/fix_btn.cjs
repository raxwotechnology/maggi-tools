const fs = require('fs');
let content = fs.readFileSync('src/components/ComplianceBook.jsx', 'utf8');
content = content.replace('className="refresh-btn" disabled={isSubmitting}', 'className="submit-btn" disabled={isSubmitting}');
fs.writeFileSync('src/components/ComplianceBook.jsx', content);
