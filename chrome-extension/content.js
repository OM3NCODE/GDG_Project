function scrapeTestingData() {
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  // Initialize results object
  const results = {
    url: url,
    timestamp: new Date().toISOString(),
    sourceType: determineSourceType(hostname),
    mainContent: {
      text: '',
      type: 'post'
    },
    comments: []
  };
  
  // Site-specific extraction strategies
  if (hostname.includes('reddit.com')) {
    const redditData = scrapeRedditContent();
    results.mainContent.text = redditData.postContent;
    results.comments = redditData.comments.map(comment => ({ text: comment, type: 'comment' }));
  } else if (hostname.includes('youtube.com')) {
    const youtubeData = scrapeYouTubeComments();
    results.mainContent.text = `${youtubeData.videoTitle}\n\n${youtubeData.videoDescription}`.trim();
    results.comments = youtubeData.comments.map(comment => ({ text: comment, type: 'comment' }));
  } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    const twitterData = scrapeTwitterContent();
    results.mainContent.text = twitterData.mainTweet;
    results.comments = twitterData.replies.map(reply => ({ text: reply, type: 'comment' }));
  } else if (hostname.includes('instagram.com')) {
    const instagramData = scrapeInstagramContent();
    results.mainContent.text = instagramData.postCaption;
    results.comments = instagramData.comments.map(comment => ({ text: comment, type: 'comment' }));
  } else {
    const genericData = scrapeGenericContent();
    results.mainContent.text = `${genericData.title ? genericData.title + '\n\n' : ''}${genericData.mainContent}`.trim();
    results.comments = genericData.comments.map(comment => ({ text: comment, type: 'comment' }));
  }
  
  // Remove empty main content if there's nothing there
  if (!results.mainContent.text) {
    results.mainContent = null;
  }
  
  return results;
}

// The original scraping functions remain the same
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

// Other scraping functions remain the same...
// [scrapeYouTubeComments, scrapeTwitterContent, scrapeInstagramContent, scrapeGenericContent]

// Determine source type
function determineSourceType(hostname) {
  if (hostname.includes('reddit.com')) return 'reddit';
  if (hostname.includes('youtube.com')) return 'youtube';
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
  if (hostname.includes('instagram.com')) return 'instagram';
  return 'generic';
}

// Message listener to start scraping
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeTestingData') {
    try {
      const testData = scrapeTestingData();
      
      // Prepare data for export
      const exportableData = prepareForClassification(testData);
      
      sendResponse({
        success: true,
        testData: testData,
        exportableData: exportableData
      });
    } catch (error) {
      console.error('Testing data scraping error:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
    return true; // Allow asynchronous response
  }
});

// Function to prepare data in format ready for your classification model
function prepareForClassification(testData) {
  const items = [];
  
  // Add main content if present
  if (testData.mainContent) {
    items.push({
      text: testData.mainContent.text,
      type: 'post',
      source: testData.url,
      source_type: testData.sourceType
    });
  }
  
  // Add each comment
  testData.comments.forEach(comment => {
    items.push({
      text: comment.text,
      type: 'comment',
      source: testData.url,
      source_type: testData.sourceType
    });
  });
  
  return items;
}

// Function to convert the data to CSV format if needed
function convertToCSV(data) {
  // Create headers based on object keys
  const headers = Object.keys(data[0]).join(',');
  
  // Create rows
  const rows = data.map(item => {
    return Object.values(item).map(value => {
      // Handle strings with commas by wrapping in quotes and escaping internal quotes
      if (typeof value === 'string') {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  }).join('\n');
  
  return headers + '\n' + rows;
}

// Usage example in browser console
console.log('Testing data scraper initialized');

