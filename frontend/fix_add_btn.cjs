const fs = require('fs');
const path = require('path');
const dir = 'd:/Tool-Rent/frontend/src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('<div className="add-btn">')) {
    content = content.replace(/<div className="add-btn">/g, '<div className="bf-action-btns">');
    fs.writeFileSync(filePath, content);
    console.log('Fixed ' + file);
  }
});
