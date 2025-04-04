// Configuration
const API_BASE_URL = 'http://localhost:8000';

// DOM Elements
const scrapeBtn = document.getElementById('scrapeBtn');
const statusMessage = document.getElementById('statusMessage');
const contentContainer = document.getElementById('contentContainer');
const rawContentContainer = document.getElementById('rawContentContainer');
const summaryElement = document.getElementById('summary');
const hateSpeechCount = document.getElementById('hateSpeechCount');
const moderateCount = document.getElementById('moderateCount');
const safeCount = document.getElementById('safeCount');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// State variables
let scrapedData = null;
let classificationResults = null;

// Setup tabs
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.getAttribute('data-tab');
    
    // Update active tab
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Show active content
    tabContents.forEach(content => {
      content.classList.remove('active');
      if (content.id === `${tabName}Tab`) {
        content.classList.add('active');
      }
    });
  });
});

// Scrape button click handler
scrapeBtn.addEventListener('click', async () => {
  try {
    setStatus('Scraping content...', 'progress');
    scrapeBtn.disabled = true;
    
    // Get the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    
    // Send message to content script
    chrome.tabs.sendMessage(activeTab.id, { action: 'scrape', classify: true }, response => {
      if (chrome.runtime.lastError) {
        setStatus(`Error: ${chrome.runtime.lastError.message}`, 'error');
        scrapeBtn.disabled = false;
        return;
      }
      
      if (!response || !response.success) {
        setStatus(`Error: ${response?.error || 'Failed to scrape content'}`, 'error');
        scrapeBtn.disabled = false;
        return;
      }
      
      // Store the scraped data
      scrapedData = response;
      
      // Display raw content
      displayRawContent(response.formattedData);
      
      setStatus('Content scraped successfully. Processing with RAG model...', 'progress');
    });
  } catch (error) {
    setStatus(`Error: ${error.message}`, 'error');
    scrapeBtn.disabled = false;
  }
});

// Chrome message listener for background processing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'processingComplete') {
    setStatus('Content processed. Fetching results...', 'progress');
  } else if (message.action === 'processingError') {
    setStatus(`Error processing content: ${message.error}`, 'error');
    scrapeBtn.disabled = false;
  } else if (message.action === 'resultsReady') {
    displayClassificationResults(message.results);
    setStatus(`Classification complete. Analyzed ${message.results.total_items} items.`, 'success');
    scrapeBtn.disabled = false;
  } else if (message.action === 'resultsError') {
    setStatus(`Error fetching results: ${message.error}`, 'error');
    scrapeBtn.disabled = false;
  }
});

// Display the raw scraped content
function displayRawContent(data) {
  rawContentContainer.innerHTML = '';
  
  if (!data || !data.content || data.content.length === 0) {
    rawContentContainer.innerHTML = '<div class="content-item">No content scraped</div>';
    return;
  }
  
  data.content.forEach((item, index) => {
    const contentElement = document.createElement('div');
    contentElement.className = 'content-item';
    
    const contentType = document.createElement('div');
    contentType.className = 'content-type';
    contentType.innerHTML = `
      <span>${item.metadata.type}</span>
      <span>${new Date(item.timestamp).toLocaleTimeString()}</span>
    `;
    
    const contentText = document.createElement('div');
    contentText.className = 'content-text';
    contentText.textContent = item.text;
    
    contentElement.appendChild(contentType);
    contentElement.appendChild(contentText);
    
    rawContentContainer.appendChild(contentElement);
  });
}

// Display the classification results
function displayClassificationResults(results) {
  contentContainer.innerHTML = '';
  summaryElement.style.display = 'flex';
  
  if (!results || !results.results || results.results.length === 0) {
    contentContainer.innerHTML = '<div class="content-item">No classification results available</div>';
    return;
  }
  
  // Reset counters
  let hateSpeechTotal = 0;
  let moderateTotal = 0;
  let safeTotal = 0;
  
  // Fetch individual results to get full text
  fetchAllDetailedResults(results.results.length).then(detailedResults => {
    detailedResults.forEach(result => {
      // Determine classification
      let classification = 'Unknown';
      let classType = '';
      
      if (result.processed_result.includes('Hate Speech')) {
        classification = 'Hate Speech';
        classType = 'hate-speech';
        hateSpeechTotal++;
      } else if (result.processed_result.includes('Moderate')) {
        classification = 'Moderate';
        classType = 'moderate';
        moderateTotal++;
      } else if (result.processed_result.includes('Safe')) {
        classification = 'Safe';
        classType = 'safe';
        safeTotal++;
      }
      
      // Create result element
      const resultElement = document.createElement('div');
      resultElement.className = `content-item ${classType}`;
      
      const contentType = document.createElement('div');
      contentType.className = 'content-type';
      contentType.innerHTML = `
        <span>From: ${new URL(result.url).hostname}</span>
        <span>${new Date(result.timestamp).toLocaleTimeString()}</span>
      `;
      
      const contentText = document.createElement('div');
      contentText.className = 'content-text';
      contentText.textContent = result.original_text;
      
      const classificationElement = document.createElement('div');
      classificationElement.className = `classification ${classType}`;
      classificationElement.textContent = classification;
      
      resultElement.appendChild(contentType);
      resultElement.appendChild(contentText);
      resultElement.appendChild(classificationElement);
      
      contentContainer.appendChild(resultElement);
    });
    
    // Update summary counts
    hateSpeechCount.textContent = hateSpeechTotal;
    moderateCount.textContent = moderateTotal;
    safeCount.textContent = safeTotal;
  }).catch(error => {
    console.error('Error fetching detailed results:', error);
    contentContainer.innerHTML = `<div class="content-item">Error loading detailed results: ${error.message}</div>`;
  });
}

// Fetch detailed results for each item
async function fetchAllDetailedResults(count) {
  const detailedResults = [];
  
  for (let i = 0; i < count; i++) {
    try {
      const response = await fetch(`${API_BASE_URL}/view-rag-result/${i}`);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const result = await response.json();
      detailedResults.push(result);
    } catch (error) {
      console.error(`Error fetching result ${i}:`, error);
    }
  }
  
  return detailedResults;
}

// Set status message with appropriate styling
function setStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`;
}

// Initialize
function initialize() {
  // Clear any previous state
  setStatus('', '');
  contentContainer.innerHTML = '';
  rawContentContainer.innerHTML = '';
  summaryElement.style.display = 'none';
}

// Initialize the popup
initialize();