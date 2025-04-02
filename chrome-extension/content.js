// Enhanced content script with multiple scraping strategies
function scrapeParagraphs() {
  // Multiple scraping strategies
  const scrapingStrategies = [
    // Standard text extraction methods
    () => Array.from(document.querySelectorAll('p, article, .content'))
      .map(el => el.innerText.trim())
      .filter(text => text.length > 50),
    // Wikipedia-specific strategy
    () => {
      if (window.location.hostname.includes('wikipedia.org')) {
        const contentDiv = document.querySelector('#mw-content-text');
        if (contentDiv) {
          return Array.from(contentDiv.querySelectorAll('p'))
            .map(el => el.innerText.trim())
            .filter(text => text.length > 50);
        }
      }
      return [];
    },
    // Reddit-specific strategy
    () => {
      if (window.location.hostname.includes('reddit.com')) {
        const comments = Array.from(document.querySelectorAll('.Comment'))
          .map(el => el.innerText.trim())
          .filter(text => text.length > 50);
        
        const postContent = document.querySelector('.Post')?.innerText.trim() || '';
        
        return postContent.length > 50 ? [postContent, ...comments] : comments;
      }
      return [];
    },
    // Fallback deep text extraction
    () => {
      const textNodes = [];
      
      function walkNodes(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.trim();
          if (text.length > 50 && !textNodes.includes(text)) {
            textNodes.push(text);
          }
        }
        
        for (let child of node.childNodes) {
          walkNodes(child);
        }
      }
      
      walkNodes(document.body);
      return textNodes;
    }
  ];
  
  // Combine results from all strategies
  const paragraphs = scrapingStrategies.reduce((acc, strategy) => {
    try {
      const result = strategy();
      return [...acc, ...result];
    } catch (error) {
      console.error('Scraping strategy failed:', error);
      return acc;
    }
  }, []);
  
  // Remove duplicates and filter
  return [...new Set(paragraphs)]
    .filter(text => text.length > 50)
    .slice(0, 50); // Limit to 50 paragraphs to prevent overwhelming results
}

// Robust message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrape') {
    try {
      // Attempt to scrape with multiple strategies
      const paragraphs = scrapeParagraphs();
      
      sendResponse({ 
        paragraphs: paragraphs,
        success: true,
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Comprehensive scraping error:', error);
      
      sendResponse({ 
        error: error.message,
        success: false,
        url: window.location.href
      });
    }
    
    return true; // Allow asynchronous response
  }
});

// Diagnostic logging
console.log('Advanced Web Content Scraper initialized');

