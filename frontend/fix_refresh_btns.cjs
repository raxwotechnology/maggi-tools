const fs = require('fs');
const path = require('path');
const dir = 'd:/Tool-Rent/frontend/src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const refreshRegex = /<button[^>]*title="(?:Refresh|Refresh Data)"[\s\S]*?<\/button>/;
  const matchRefresh = content.match(refreshRegex);
  
  if (matchRefresh && !content.includes('className="search-and-refresh"')) {
    const refreshBtn = matchRefresh[0];
    
    // Check if there is a search-box-unified
    const searchRegex = /<div className="search-box-unified">[\s\S]*?<\/div>/;
    const matchSearch = content.match(searchRegex);
    
    if (matchSearch) {
      // Don't modify if it's already inside search-box-unified somehow
      if (matchSearch[0].includes(refreshBtn)) return;
      
      // Remove the original refresh button
      content = content.replace(refreshBtn, '');
      
      // We need to re-find the search box because the offset might have changed
      const matchSearchAfterRemove = content.match(searchRegex);
      if (matchSearchAfterRemove) {
        const newSearchBlock = `<div className="search-and-refresh" style={{ display: 'flex', gap: '8px', flex: 1 }}>\n            ${matchSearchAfterRemove[0]}\n            ${refreshBtn}\n          </div>`;
        content = content.replace(matchSearchAfterRemove[0], newSearchBlock);
        
        fs.writeFileSync(filePath, content);
        console.log(`Updated Refresh button layout in ${file}`);
      }
    }
  }
});
