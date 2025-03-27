document.getElementById('scrapeButton').addEventListener('click', () => {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = 'Scraping...';

  // Ensure we have an active tab
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (!tabs[0]) {
      statusDiv.textContent = 'Error: No active tab found';
      return;
    }

    // Send message to content script
    chrome.tabs.sendMessage(tabs[0].id, {action: 'scrape'}, (response) => {
      // Check for runtime errors first
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
        statusDiv.textContent = 'Error: Could not send message to page';
        return;
      }

      // Process the response
      if (response && response.paragraphs) {
        // Save to local text file
        const blob = new Blob([response.paragraphs.join('\n\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        // Create a download link
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `scraped_content_${new Date().toISOString().replace(/:/g, '-')}.txt`;
        document.body.appendChild(downloadLink);
        
        // Trigger download
        downloadLink.click();
        
        // Clean up
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);

        statusDiv.textContent = 'Scraping complete! File downloaded.';
        console.log('Scraped Paragraphs:', response.paragraphs);
      } else {
        statusDiv.textContent = 'No content found or error occurred.';
        console.log('Response:', response);
      }
    });
  });
});