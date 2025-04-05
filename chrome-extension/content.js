const PLATFORMS = {
  INSTAGRAM: {
    domain: 'instagram.com',
    selectors: {
      postText: 'div._a9zr h1, div._a9zr h2, div._a9zr span, h1._ap3a, div._a9zs, div._a9z6, div._ab5z',
      comments: 'div.xt0psk2 span, span._ap3a, div._a9zr span._ap3a, div.x9f619 span, ul div._a9zr span',
      commentAuthor: 'span._aap6, span._aacl, div._aaqf',
      timeFilter: 'time._aaqe, time, span:contains("h"), span:contains("d"), span:contains("w")',
    }
  },
  TWITTER: {
    domain: 'twitter.com|x.com',
    selectors: {
      postText: 'article div[data-testid="tweetText"]',
      comments: 'article div[data-testid="tweetText"]',
      timeFilter: 'time',
    }
  },
  REDDIT: {
    domain: 'reddit.com',
    selectors: {
      postText: 'div[id*="post-rtjson-content"], div.RichTextJSON-root, div.md, div[data-test-id="post-content"] div',
      comments: 'div[id*="comment-rtjson-content"], p, blockquote p, div.md, div[class*="text-"], div[data-testid="comment"] div',
      commentAuthor: 'a[href^="/user/"], a[class*="author"], div[data-testid="comment"] a[data-testid="username"]',
      timeFilter: 'span:contains("ago"), a[class*="age"], span:contains("minute"), span:contains("hour"), span:contains("day")',
    }
  },
  YOUTUBE: {
    domain: 'youtube.com',
    selectors: {
      postText: 'yt-formatted-string.ytd-video-secondary-info-renderer, div#description',
      comments: 'yt-attributed-string#content-text, #content-text span, ytd-expander #content, ytd-comment-renderer #content-text',
      commentAuthor: 'div#author-text, #header-author yt-formatted-string, ytd-comment-renderer #author-text',
      timeFilter: 'span.ytd-comment-renderer-time, yt-formatted-string:contains("ago")',
    }
  }
};

function cleanText(text) {
  if (!text) return '';
  
  let cleaned = text.replace(/\b\d{1,2}:\d{2}(:\d{2})?\b|\b\d{1,2}(:\d{2})?\s?(am|pm)\b/gi, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/@\w+/g, '')
    .replace(/#\w+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
    
  return cleaned;
}

function extractTextContent(selector, timeFilterSelector = null) {
  const elements = document.querySelectorAll(selector);
  const results = [];
  
  elements.forEach(element => {
    if (timeFilterSelector && element.matches(timeFilterSelector)) {
      return;
    }
    
    if (timeFilterSelector && element.closest('time')) {
      return;
    }
    
    const text = cleanText(element.textContent);
    if (text && text.length > 2) {
      results.push(text);
    }
  });
  
  return results;
}

function instagramCommentScraper() {
  const results = [];
  
  const commentSelectors = [
    'div.x9f619',
    'div.xt0psk2',
    'h3 + div'
  ];
  
  commentSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(container => {
      const spans = container.querySelectorAll('span._ap3a, span._aaco, span._aacu, span._aacx');
      
      spans.forEach(span => {
        const text = cleanText(span.textContent);
        if (text && text.length > 2) {
          results.push(text);
        }
      });
    });
  });
  
  return results;
}

function instagramPostScraper() {
  const results = [];
  
  document.querySelectorAll('div._a9zr, article, div.xt0psk2, div._ab1t, div._aagw').forEach(post => {
    const contentElements = post.querySelectorAll('h1, h2, h3, span:not(:has(time)), div._a9zs');
    
    let combinedText = '';
    contentElements.forEach(el => {
      if (el.textContent && 
          !el.querySelector('time') && 
          !el.closest('time') &&
          el.textContent.trim().length > 2) {
        
        const text = cleanText(el.textContent);
        if (text.length > 0) {
          results.push(text);
          combinedText += ' ' + el.textContent;
        }
      }
    });
    
    if (combinedText.trim().length > 0) {
      const cleanCombined = cleanText(combinedText);
      if (cleanCombined.length > 0 && !results.includes(cleanCombined)) {
        results.push(cleanCombined);
      }
    }
  });
  
  return results;
}

function extractRedditComments() {
  const comments = [];
  
  document.querySelectorAll('div[id*="comment-rtjson-content"], div.md, blockquote p, div[data-testid="comment"] div, div.RichTextJSON-root').forEach(comment => {
    if (comment.closest('[aria-hidden="true"]')) return;
    
    const text = cleanText(comment.textContent);
    if (text && text.length > 2) {
      comments.push(text);
    }
  });
  
  return comments;
}

function extractYouTubeComments() {
  const comments = [];
  
  document.querySelectorAll('yt-attributed-string#content-text, #content-text span.yt-core-attributed-string, ytd-comment-renderer #content-text, ytd-expander #content').forEach(comment => {
    const text = cleanText(comment.textContent);
    if (text && text.length > 2) {
      comments.push(text);
    }
  });
  
  return comments;
}

function extractTwitterContent() {
  const contents = [];
  
  document.querySelectorAll('article div[data-testid="tweetText"], div[data-testid="card.layoutSmall.detail"]').forEach(tweet => {
    const text = cleanText(tweet.textContent);
    if (text.length > 0) {
      contents.push(text);
    }
  });
  
  return contents;
}

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
    
    if (platform.name === 'instagram') {
      const postContent = instagramPostScraper();
      
      postContent.forEach(text => {
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
      
      const commentContent = instagramCommentScraper();
      
      commentContent.forEach(text => {
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
    } else if (platform.name === 'reddit') {
      const mainContentTexts = extractTextContent(selectors.postText, selectors.timeFilter);
      
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
      
      const redditComments = extractRedditComments();
      redditComments.forEach(text => {
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
    } else if (platform.name === 'youtube') {
      const mainContentTexts = extractTextContent(selectors.postText, selectors.timeFilter);
      
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
      
      const youtubeComments = extractYouTubeComments();
      youtubeComments.forEach(text => {
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
    } else if (platform.name === 'twitter') {
      const twitterContent = extractTwitterContent();
      
      twitterContent.forEach(text => {
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
    } else {
      const mainContentTexts = extractTextContent(selectors.postText, selectors.timeFilter);
      
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
      
      const commentTexts = extractTextContent(selectors.comments, selectors.timeFilter);
      
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
    }
    
    scrapedData.debug = {
      platform: platform.name,
      url: window.location.href,
      documentTitle: document.title,
      contentCount: scrapedData.formattedData.content.length,
      contentSample: scrapedData.formattedData.content.slice(0, 3).map(item => item.text)
    };
    
    scrapedData.success = scrapedData.formattedData.content.length > 0;
  } catch (error) {
    console.error("Scraping error:", error);
    scrapedData.error = error.message;
  }
  
  return scrapedData;
}

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

function debugDOMElements() {
  const platform = detectPlatform();
  console.log("Current platform:", platform?.name);
  
  if (platform?.name === 'instagram') {
    console.log("Instagram debugging info:");
    console.log("- xt0psk2 elements:", document.querySelectorAll('div.xt0psk2').length);
    console.log("- _a9zr elements:", document.querySelectorAll('div._a9zr').length);
    console.log("- _ap3a spans:", document.querySelectorAll('span._ap3a').length);
    console.log("- x9f619 elements:", document.querySelectorAll('div.x9f619').length);
  }
}
debugDOMElements();

console.log("Content scraper loaded for:", detectPlatform()?.name || "unsupported platform");