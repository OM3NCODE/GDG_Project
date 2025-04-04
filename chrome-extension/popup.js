// Configuration
const API_ENDPOINT = 'http://localhost:8000/scrape';
const VIEW_RAG_RESULTS_ENDPOINT = 'http://localhost:8000/view-rag-result/0'; // To view the first result

document.getElementById('scrapeButton').addEventListener('click', () => {
  const statusDiv = document.getElementById('status');
  const resultsDiv = document.getElementById('results');
  const loader = document.getElementById('loader');

  statusDiv.textContent = 'Scraping and processing with RAG model...';
  if (resultsDiv) resultsDiv.innerHTML = '';
  if (loader) loader.style.display = 'block';

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (!tabs[0]) {
      statusDiv.textContent = 'Error: No active tab found';
      if (loader) loader.style.display = 'none';
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, {action: 'scrape'}, async (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
        statusDiv.textContent = 'Error: Could not send message to page';
        if (loader) loader.style.display = 'none';
        return;
      }

      if (response && response.paragraphs) {
        try {
          const payload = {
            content: [{
              url: response.url,
              text: response.paragraphs.join('\n\n'),
              timestamp: new Date().toISOString()
            }]
          };

          const apiResponse = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          if (!apiResponse.ok) throw new Error('API request failed');
          const result = await apiResponse.json();

          const ragResponse = await fetch(VIEW_RAG_RESULTS_ENDPOINT);
          let ragResult = ragResponse.ok ? await ragResponse.json() : null;

          statusDiv.textContent = 'Processing complete!';
          if (loader) loader.style.display = 'none';

          if (resultsDiv) {
            let resultsHTML = `
              <div class="result-item">
                <strong>Status:</strong> ${result.message}<br>
                <strong>Total Items:</strong> ${result.total_items}<br>
                <strong>Processed Items:</strong> ${result.processed_items}<br>
            `;

            if (ragResult) {
              resultsHTML += `
                <details>
                  <summary>View RAG Processing Results</summary>
                  <div class="rag-results">
                    <h3>RAG Model Analysis</h3>
                    <pre>${formatRagResult(ragResult)}</pre>
                  </div>
                </details>
              `;
            }

            resultsHTML += `
                <details>
                  <summary>View API Endpoints</summary>
                  <p>
                    <strong>View all scrapes:</strong> /view-scrapes<br>
                    <strong>View specific scrape:</strong> /view-scrape/0<br>
                    <strong>View all RAG results:</strong> /view-rag-results<br>
                    <strong>View specific RAG result:</strong> /view-rag-result/0
                  </p>
                </details>
              </div>
            `;

            resultsDiv.innerHTML = resultsHTML;
          }

          console.log('API Scrape Result:', result);
          if (ragResult) console.log('RAG Result:', ragResult);

        } catch (error) {
          console.error('API Error:', error);
          statusDiv.textContent = 'Error processing data with RAG model';
          if (loader) loader.style.display = 'none';
        }
      } else {
        statusDiv.textContent = 'No content found or error occurred.';
        if (loader) loader.style.display = 'none';
        console.log('Response:', response);
      }
    });
  });
});

function formatRagResult(result) {
  if (typeof result === 'string') {
    return result
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  } else if (result.processed_result) {
    return result.processed_result
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  } else {
    return 'Result format not recognized';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const statusDiv = document.getElementById('status');
  const resultsDiv = document.getElementById('results');
  const loader = document.getElementById('loader');

  if (statusDiv) statusDiv.textContent = 'Ready to scrape and process with RAG model';
  if (resultsDiv) resultsDiv.innerHTML = '';
  if (loader) loader.style.display = 'none';
});
