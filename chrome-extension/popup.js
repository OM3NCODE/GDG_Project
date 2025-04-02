// Configuration
const API_ENDPOINT = 'http://localhost:8000/scrape';

document.getElementById('scrapeButton').addEventListener('click', () => {
  const statusDiv = document.getElementById('status');
  const resultsDiv = document.getElementById('results');
  statusDiv.textContent = 'Scraping...';
  
  // Clear previous results
  if (resultsDiv) resultsDiv.innerHTML = '';

  // Ensure we have an active tab
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (!tabs[0]) {
      statusDiv.textContent = 'Error: No active tab found';
      return;
    }

    // Send message to content script
    chrome.tabs.sendMessage(tabs[0].id, {action: 'scrape'}, async (response) => {
      // Check for runtime errors first
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
        statusDiv.textContent = 'Error: Could not send message to page';
        return;
      }

      // Process the response
      if (response && response.paragraphs) {
        try {
          // Prepare data for API
          const payload = {
            content: [{
              url: response.url,
              text: response.paragraphs.join('\n\n'),
              timestamp: new Date().toISOString()
            }]
          };

          // Send to API
          const apiResponse = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          // Check API response
          if (!apiResponse.ok) {
            throw new Error('API request failed');
          }

          const result = await apiResponse.json();

          // Update status
          statusDiv.textContent = 'Scraping complete!';
          
          // Display results
          if (resultsDiv) {
            resultsDiv.innerHTML = `
              <div class="result-item">
                <strong>Scrape Status:</strong> ${result.message}<br>
                <strong>Total Items:</strong> ${result.total_items}<br>
                <details>
                  <summary>View Details</summary>
                  <p>You can now use /view-scrapes to see the content</p>
                </details>
              </div>
            `;
          }

          console.log('API Scrape Result:', result);

        } catch (error) {
          console.error('API Error:', error);
          statusDiv.textContent = 'Error sending data to backend';
        }
      } else {
        statusDiv.textContent = 'No content found or error occurred.';
        console.log('Response:', response);
      }
    });
  });
});

// Reset status when popup opens
document.addEventListener('DOMContentLoaded', () => {
  const statusDiv = document.getElementById('status');
  const resultsDiv = document.getElementById('results');
  
  if (statusDiv) statusDiv.textContent = 'Ready to scrape';
  if (resultsDiv) resultsDiv.innerHTML = '';
});