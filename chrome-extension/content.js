const PLATFORMS = {
  INSTAGRAM: {
    domain: 'instagram.com',
    selectors: {
      postText: 'h1._ap3a._aaco._aacu',
      comments: 'ul._a9ym li._a9zj span._ap3a',
    }
  },
  TWITTER: {
    domain: 'twitter.com|x.com',
    selectors: {
      postText: 'article div[data-testid="tweetText"]',
      comments: 'article div[data-testid="tweetText"]',
    }
  },
  REDDIT: {
    domain: 'reddit.com',
    selectors: {
      postText: 'div[id$="-post-rtjson-content"]',
      comments: 'div[id*="comment-rtjson-content"]',
    }
  },
  YOUTUBE: {
    domain: 'youtube.com',
    selectors: {
      postText: 'ytd-text-inline-expander',
      comments: 'ytd-comment-thread-renderer #content-text',
    }
  }
};

// Helper Functions

/**
 * Removes timestamps, URLs, and unnecessary markup from text
 * @param {string} text - The text to clean
 * @return {string} - Cleaned text
 */
function cleanText(text) {
  if (!text) return '';
  
  let cleaned = text.replace(/\b\d{1,2}:\d{2}(:\d{2})?\b|\b\d{1,2}(:\d{2})?\s?(am|pm)\b/gi, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/@\w+/g, '') // @mentions
    .replace(/#\w+/g, '') // #hashtags
    .replace(/\s+/g, ' ')
    .trim();
    
  return cleaned;
}

/**
 * Extracts text content from DOM elements matching a selector
 * @param {string} selector - CSS selector
 * @param {boolean} excludeTimestamps - Whether to exclude elements with timestamps
 * @return {Array} - Array of extracted text items
 */
function extractTextContent(selector, timeFilterSelector = null) {
  const elements = document.querySelectorAll(selector);
  const results = [];
  
  elements.forEach(element => {
    const text = cleanText(element.textContent);
    if (text && text.length > 2) { 
      results.push(text);
    }
  });
  
  return results;
}

/**
 * Detects the current platform based on URL
 * @return {Object|null} - Platform configuration or null if not recognized
 */
function detectPlatform() {
  const url = window.location.href;
  
  for (const [platform, config] of Object.entries(PLATFORMS)) {
    const domainRegex = new RegExp(config.domain, 'i');
    if (domainRegex.test(url)) {
      return {
        name: platform.toLowerCase(),
        config: config
      };
    }
  }
  
  return null;
}

/**
 * Main scraping function that collects content based on platform
 * @return {Object} - Object with scraped content
 */
function scrapeContent() {
  const platform = detectPlatform();
  const scrapedData = {
    success: false,
    error: null,
    url: window.location.href,
    platform: platform ? platform.name : 'unknown',
    formattedData: {
      content: []
    }
  };
  
  try {
    if (!platform) {
      scrapedData.error = "Platform not supported for scraping";
      return scrapedData;
    }
    
    const selectors = platform.config.selectors;
    const timestamp = new Date().toISOString();
    
    const mainContentTexts = extractTextContent(selectors.postText);
    
    mainContentTexts.forEach(text => {
      if (text.length > 0) {
        scrapedData.formattedData.content.push({
          url: window.location.href,
          text: text,
          timestamp: timestamp,
          metadata: {
            type: 'main_content',
            platform: platform.name
          }
        });
      }
    });
    
    const commentTexts = extractTextContent(selectors.comments);
    
    commentTexts.forEach(text => {
      if (text.length > 0) {
        scrapedData.formattedData.content.push({
          url: window.location.href,
          text: text,
          timestamp: timestamp,
          metadata: {
            type: 'comment',
            platform: platform.name
          }
        });
      }
    });
    
    scrapedData.success = true;
  } catch (error) {
    console.error("Scraping error:", error);
    scrapedData.error = error.message;
  }
  
  return scrapedData;
}

/**
 * Sends scraped data to the API for processing
 * @param {Object} data - Scraped content data
 */
async function sendToAPI(data) {
  const API_BASE_URL = 'http://localhost:8000';
  
  try {
    const response = await fetch(`${API_BASE_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data.formattedData)
    });
    
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }
    
    const result = await response.json();
    
    chrome.runtime.sendMessage({
      action: 'processingComplete',
      result: result
    });
    
    const resultsResponse = await fetch(`${API_BASE_URL}/view-rag-results`);
    if (!resultsResponse.ok) {
      throw new Error(`Failed to fetch results: ${resultsResponse.status}`);
    }
    
    const classificationResults = await resultsResponse.json();
    
    chrome.runtime.sendMessage({
      action: 'resultsReady',
      results: classificationResults
    });

    classificationResults.results?.forEach(result => {
      if (result.label === "Hate Speech") {
        const matchingElements = Array.from(document.querySelectorAll("*"))
          .filter(el =>
            el.children.length === 0 &&
            el.textContent.includes(result.text)
          );
    
        matchingElements.forEach(el => {
          blurElementIfNeeded(el, "Hate Speech");
        });
      }
    });
    
  } catch (error) {
    console.error("API error:", error);
    chrome.runtime.sendMessage({
      action: 'processingError',
      error: error.message
    });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'scrape') {
    console.log("Starting content scraping...");
    const scrapedData = scrapeContent();
    
    sendResponse(scrapedData);
    
    if (message.classify && scrapedData.success) {
      sendToAPI(scrapedData);
    }
    
    return true; 
  }
});

function customScrapingStrategy() {
  const url = window.location.href;
  const customContent = [];
  
  if (url.includes('instagram.com')) {
    document.querySelectorAll('div._ab1t, div._aagw').forEach(post => {
      const textElements = post.querySelectorAll('span, div._a9zs');
      let combinedText = '';
      
      textElements.forEach(el => {
        if (el.textContent && !el.querySelector('time')) {
          combinedText += ' ' + el.textContent;
        }
      });
      
      if (combinedText.trim().length > 0) {
        customContent.push(cleanText(combinedText));
      }
    });
  }
  
  if (url.includes('twitter.com') || url.includes('x.com')) {
    document.querySelectorAll('div[data-testid="card.layoutSmall.detail"]').forEach(quote => {
      const text = cleanText(quote.textContent);
      if (text.length > 0) {
        customContent.push(text);
      }
    });
  }
  
  return customContent;
}

function observeContentChanges() {
  const platform = detectPlatform();
  if (!platform) return;
  
  const observer = new MutationObserver((mutations) => {
    console.log("Content changes detected");
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  });
}

observeContentChanges();

function blurElementIfNeeded(element, label) {
  if (label === "Hate Speech") {
      element.style.filter = "blur(5px)";
      element.style.cursor = "pointer";
      element.title = "Blurred due to classified hate speech";

      element.addEventListener("mouseenter", () => {
          element.style.filter = "none";
      });
      element.addEventListener("mouseleave", () => {
          element.style.filter = "blur(5px)";
      });
  }
}

console.log("Content scraper loaded for: ", detectPlatform()?.name || "unsupported platform");