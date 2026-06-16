const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/InvoiceBook.jsx', 'utf8');

if (!content.includes('Eye,')) {
    content = content.replace(/import \{.*?\} from 'lucide-react';/, (match) => {
        return match.replace('}', ', Eye }');
    });
    fs.writeFileSync('frontend/src/components/InvoiceBook.jsx', content);
    console.log('Fixed missing Eye import');
} else {
    console.log('Eye is already imported');
}
