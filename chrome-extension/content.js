function scrapeTargetedContent() {
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  // Site-specific extraction strategies
  if (hostname.includes('reddit.com')) {
    return scrapeRedditContent();
  } else if (hostname.includes('youtube.com')) {
    return scrapeYouTubeComments();
  } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return scrapeTwitterContent();
  } else if (hostname.includes('instagram.com')) {
    return scrapeInstagramContent();
  } else {
    // Generic content extraction for other sites
    return scrapeGenericContent();
  }
}

function scrapeRedditContent() {
  const results = {
    postContent: '',
    comments: []
  };
  
  // Extract post content
  const postContentElement = document.querySelector('.Post [data-test-id="post-content"]');
  if (postContentElement) {
    // Look for the main text in the post
    const textElements = postContentElement.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
    if (textElements.length > 0) {
      results.postContent = Array.from(textElements)
        .map(el => el.innerText.trim())
        .join('\n\n');
    }
  }
  
  // Extract comments - target only the text content of comments, not usernames or metadata
  const commentElements = document.querySelectorAll('.Comment');
  commentElements.forEach(comment => {
    // First child after the metadata is typically the comment text
    const commentBodyElement = comment.querySelector('[data-testid="comment"]');
    if (commentBodyElement) {
      const commentText = commentBodyElement.innerText.trim();
      if (commentText.length > 10) { // Minimum length to filter out noise
        results.comments.push(commentText);
      }
    }
  });
  
  return results;
}

function scrapeYouTubeComments() {
  const results = {
    videoTitle: '',
    videoDescription: '',
    comments: []
  };
  
  // Extract video title
  const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer');
  if (titleElement) {
    results.videoTitle = titleElement.innerText.trim();
  }
  
  // Extract video description
  const descriptionElement = document.querySelector('#description-text');
  if (descriptionElement) {
    results.videoDescription = descriptionElement.innerText.trim();
  }
  
  // Extract comments - focus only on comment content
  const commentElements = document.querySelectorAll('ytd-comment-renderer #content-text');
  commentElements.forEach(comment => {
    const commentText = comment.innerText.trim();
    if (commentText.length > 10) {
      results.comments.push(commentText);
    }
  });
  
  return results;
}

function scrapeTwitterContent() {
  const results = {
    mainTweet: '',
    replies: []
  };
  
  // Main tweet content
  const mainTweetElement = document.querySelector('[data-testid="tweet"] [data-testid="tweetText"]');
  if (mainTweetElement) {
    results.mainTweet = mainTweetElement.innerText.trim();
  }
  
  // Reply tweets - only text content
  const replyElements = document.querySelectorAll('[data-testid="reply"] [data-testid="tweetText"]');
  replyElements.forEach(reply => {
    const replyText = reply.innerText.trim();
    if (replyText.length > 5) {
      results.replies.push(replyText);
    }
  });
  
  return results;
}

function scrapeInstagramContent() {
  const results = {
    postCaption: '',
    comments: []
  };
  
  // Post caption - Instagram captions are typically in an h1 element or span near the top of the post
  const captionElement = document.querySelector('h1._aagw, div._a9zs, article span._aacl._aaco._aacu._aacx._aad7._aade');
  if (captionElement) {
    results.postCaption = captionElement.innerText.trim();
  }
  
  // Comments - target specific comment elements
  // Instagram uses complex nested structures, so we're targeting specific patterns
  const commentElements = document.querySelectorAll('ul ul div._a9zs, div._ae4k, div.xdj266r');
  commentElements.forEach(comment => {
    // Filter out comment metadata
    const commentText = comment.innerText.trim();
    
    // Remove username at the beginning if present
    let cleanText = commentText;
    const usernameMatch = commentText.match(/^@?[\w\._]+\s+/);
    if (usernameMatch) {
      cleanText = commentText.substring(usernameMatch[0].length).trim();
    }
    
    if (cleanText.length > 10) {
      results.comments.push(cleanText);
    }
  });
  
  return results;
}

function scrapeGenericContent() {
  const results = {
    title: '',
    mainContent: '',
    comments: []
  };
  
  // Extract title
  const titleElement = document.querySelector('h1') || document.querySelector('title');
  if (titleElement) {
    results.title = titleElement.innerText.trim();
  }
  
  // Look for main content area
  const mainContentCandidates = [
    document.querySelector('article'),
    document.querySelector('main'),
    document.querySelector('.content'),
    document.querySelector('.post-content'),
    document.querySelector('#content')
  ].filter(Boolean);
  
  if (mainContentCandidates.length > 0) {
    // Use the first available content area
    const contentArea = mainContentCandidates[0];
    const paragraphs = contentArea.querySelectorAll('p');
    results.mainContent = Array.from(paragraphs)
      .map(p => p.innerText.trim())
      .filter(text => text.length > 30)
      .join('\n\n');
  }
  
  // Look for comment sections
  const commentSelectors = [
    '.comments', 
    '#comments', 
    '.comment-list', 
    '[data-role="comment"]', 
    '.comment-content'
  ];
  
  for (const selector of commentSelectors) {
    const commentElements = document.querySelectorAll(selector);
    if (commentElements.length > 0) {
      commentElements.forEach(comment => {
        // Look for paragraph elements or divs within comments
        const textElements = comment.querySelectorAll('p, .comment-text, .comment-body');
        if (textElements.length > 0) {
          const commentText = Array.from(textElements)
            .map(el => el.innerText.trim())
            .join('\n')
            .trim();
          
          if (commentText.length > 20) {
            results.comments.push(commentText);
          }
        }
      });
      
      // If we found comments with one selector, break the loop
      if (results.comments.length > 0) break;
    }
  }
  
  return results;
}

// Format the data for your API
function formatForAPI(content, url) {
  const formattedData = {
    content: []
  };
  
  // Process the main content first
  let mainText = '';
  
  // Reddit format
  if (content.postContent !== undefined) {
    mainText = content.postContent;
  } 
  // YouTube format
  else if (content.videoTitle !== undefined) {
    mainText = `${content.videoTitle}\n\n${content.videoDescription || ''}`.trim();
  } 
  // Twitter format
  else if (content.mainTweet !== undefined) {
    mainText = content.mainTweet;
  } 
  // Instagram format
  else if (content.postCaption !== undefined) {
    mainText = content.postCaption;
  } 
  // Generic format
  else if (content.title !== undefined) {
    mainText = `${content.title ? content.title + '\n\n' : ''}${content.mainContent || ''}`.trim();
  }
  
  // Add main content if not empty
  if (mainText) {
    formattedData.content.push({
      url: url,
      text: mainText,
      timestamp: new Date().toISOString(),
      metadata: {
        type: 'main_content',
        source: determineContentType(url)
      }
    });
  }
  
  // Process comments
  let comments = [];
  
  // Reddit or YouTube or Generic comments
  if (content.comments) {
    comments = content.comments;
  } 
  // Twitter replies
  else if (content.replies) {
    comments = content.replies;
  }
  
  // Add each comment as a separate content item
  comments.forEach((comment, index) => {
    formattedData.content.push({
      url: `${url}#comment${index + 1}`,
      text: comment,
      timestamp: new Date().toISOString(),
      metadata: {
        type: 'comment',
        comment_index: index + 1,
        source: determineContentType(url)
      }
    });
  });
  
  return formattedData;
}

// Determine content type based on URL
function determineContentType(url) {
  const hostname = new URL(url).hostname;
  
  if (hostname.includes('reddit.com')) return 'reddit';
  if (hostname.includes('youtube.com')) return 'youtube';
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
  if (hostname.includes('instagram.com')) return 'instagram';
  return 'generic';
}

// Prepare a paragraphs array for the existing Chrome extension code
function prepareParagraphs(formattedData) {
  // Extract all text content and concatenate it into paragraphs
  return formattedData.content.map(item => item.text);
}

// Message listener to interact with popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrape') {
    try {
      const scrapedContent = scrapeTargetedContent();
      const formattedData = formatForAPI(scrapedContent, window.location.href);
      
      // Create paragraphs array for compatibility with existing popup.js
      const paragraphs = prepareParagraphs(formattedData);
      
      // Send the response in the format expected by your popup.js
      sendResponse({ 
        paragraphs: paragraphs,
        success: true,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        contentType: determineContentType(window.location.href),
        // Include the full formatted data for debugging
        formattedData: formattedData
      });
    } catch (error) {
      console.error('Scraping error:', error);
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
console.log('RAG model content scraper initialized');

