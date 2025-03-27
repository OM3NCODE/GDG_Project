function scrapeParagraphs() {
  // Specific strategies for different platforms
  const scrapingStrategies = [
    // Reddit post and comment scraping
    () => {
      if (window.location.hostname.includes('reddit.com')) {
        // Select post titles and main text content
        const postTitles = Array.from(document.querySelectorAll('.things h3, .title'))
          .map(el => el.innerText.trim());
        
        // Select main post content and comments
        const postContent = Array.from(document.querySelectorAll('.usertext-body, .md, .Comment'))
          .map(el => el.innerText.trim())
          .filter(text => text.length > 30);
        
        return [...postTitles, ...postContent];
      }
      return [];
    },

    // Twitter/X specific scraping
    () => {
      if (window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com')) {
        // Select tweet text and usernames
        const tweets = Array.from(document.querySelectorAll('div[data-testid="tweet"] p, article p'))
          .map(el => el.innerText.trim())
          .filter(text => text.length > 20);
        
        return tweets;
      }
      return [];
    },

    // Fallback general text extraction
    () => {
      const textElements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, article, .content'))
        .map(el => el.innerText.trim())
        .filter(text => text.length > 30);
      
      return textElements;
    }
  ];

  // Combine and deduplicate results
  const paragraphs = scrapingStrategies.reduce((acc, strategy) => {
    try {
      const result = strategy();
      return [...acc, ...result];
    } catch (error) {
      console.error('Scraping strategy failed:', error);
      return acc;
    }
  }, []);

  // Remove duplicates and limit results
  return [...new Set(paragraphs)]
    .filter(text => text.length > 30)
    .slice(0, 50); // Limit to 50 items
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrape') {
    try {
      const paragraphs = scrapeParagraphs();
      
      sendResponse({ 
        paragraphs: paragraphs,
        success: true,
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Scraping error:', error);
      
      sendResponse({ 
        error: error.message,
        success: false,
        url: window.location.href
      });
    }
    
    return true;
  }
});

console.log('Content Scraper Initialized');