const fs = require('fs');
const path = require('path');
const dir = 'd:/Tool-Rent/frontend/src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Modernize header container classes
  // Wait, if I replace dashboard-header with book-filters, the title will be inside the filters box!
  // Let's replace the whole structure smartly.

  // 1. Refresh button modernization (tiny and long issue)
  content = content.replace(/className=(['"])[^'"]*theme-toggle-btn[^'"]*\1([^>]*)>([\s\S]*?)<RefreshCw/g, 'className="utility-icon-btn"$2>$3<RefreshCw');
  content = content.replace(/className=(['"])[^'"]*action-icon-btn btn-refresh[^'"]*\1([^>]*)>([\s\S]*?)<RefreshCw/g, 'className="utility-icon-btn"$2>$3<RefreshCw');
  content = content.replace(/className=(['"])[^'"]*refresh-btn[^'"]*\1([^>]*)>([\s\S]*?)<RefreshCw/g, 'className="utility-icon-btn"$2>$3<RefreshCw');

  // 2. Add/New buttons
  content = content.replace(/className=(['"])[^'"]*(refresh-btn|submit-btn|btn-primary|action-btn)[^'"]*\1([^>]*)>([\s\S]*?)<PlusCircle/g, 'className="add-btn"$3>$4<PlusCircle');
  content = content.replace(/className=(['"])[^'"]*(refresh-btn|submit-btn|btn-primary|action-btn)[^'"]*\1([^>]*)>([\s\S]*?)<Plus\s/g, 'className="add-btn"$3>$4<Plus ');

  // 3. Header controls -> action btns container
  content = content.replace(/className="header-controls"/g, 'className="bf-top-row"');
  
  // 4. search-box -> search-box-unified
  // Only if inside bf-top-row or dashboard-header... just replace it globally if it's the main search box
  content = content.replace(/className="search-box"/g, 'className="search-box-unified"');

  // 5. Replace dashboard-header entirely with book-header + book-filters wrapper
  // We look for:
  // <div className="dashboard-header">
  //   <div>
  //     <p...>Subtitle</p>
  //     <h1>Title</h1>
  //   </div>
  //   <div className="bf-top-row"> ... </div>
  // </div>
  const headerRegex = /<div className="dashboard-header">([\s\S]*?)<div>([\s\S]*?)<p[^>]*>([\s\S]*?)<\/p>([\s\S]*?)<h1[^>]*>([\s\S]*?)<\/h1>([\s\S]*?)<\/div>([\s\S]*?)<div className="bf-top-row">([\s\S]*?)<\/div>\s*<\/div>/g;
  
  content = content.replace(headerRegex, (match, p1, p2, subtitle, p4, title, p6, p7, controls) => {
    return `<div className="book-header" style={{ marginBottom: '10px' }}>
        <div className="header-title">
          <h2>${title}</h2>
        </div>
        <p className="header-subtitle">${subtitle}</p>
      </div>
      <div className="book-filters">
        <div className="bf-top-row">
          ${controls}
        </div>
      </div>`;
  });

  // Also replace some specific things if they missed the regex
  // E.g., if there's inline styles in the div
  const headerRegex2 = /<div className="dashboard-header"[^>]*>([\s\S]*?)<div>([\s\S]*?)<p[^>]*>([\s\S]*?)<\/p>([\s\S]*?)<h1[^>]*>([\s\S]*?)<\/h1>([\s\S]*?)<\/div>([\s\S]*?)<div className="bf-top-row">([\s\S]*?)<\/div>\s*<\/div>/g;
  content = content.replace(headerRegex2, (match, p1, p2, subtitle, p4, title, p6, p7, controls) => {
    return `<div className="book-header" style={{ marginBottom: '10px' }}>
        <div className="header-title">
          <h2>${title}</h2>
        </div>
        <p className="header-subtitle">${subtitle}</p>
      </div>
      <div className="book-filters">
        <div className="bf-top-row">
          ${controls}
        </div>
      </div>`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + file);
  }
});
