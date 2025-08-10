document.addEventListener('DOMContentLoaded', function() {
    const copyButton = document.getElementById('copyButton');
    const status = document.getElementById('status');
    
    copyButton.addEventListener('click', async function() {
        copyButton.disabled = true;
        status.textContent = 'Copying...';
        status.className = 'status';
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Execute script in the active tab to get formatted content
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: getFormattedPageContent
            });
            
            const content = results[0].result;
            
            if (content && content.trim()) {
                // Copy to clipboard
                await navigator.clipboard.writeText(content);
                
                status.textContent = 'Page content copied!';
                status.className = 'status success';
                
                // Close popup after a short delay
                setTimeout(() => {
                    window.close();
                }, 1000);
            } else {
                throw new Error('No content found');
            }
        } catch (error) {
            console.error('Copy failed:', error);
            status.textContent = 'Copy failed. Try again.';
            status.className = 'status error';
        } finally {
            copyButton.disabled = false;
        }
    });
});

// Function to be injected into the page
function getFormattedPageContent() {
    function getTextWithFormatting(element, depth = 0) {
        let result = '';
        const indent = '  '.repeat(depth);
        
        for (let node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent.trim();
                if (text) {
                    result += indent + text + '\n';
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                
                // Skip script, style, and other non-content elements
                if (['script', 'style', 'noscript', 'meta', 'link', 'title'].includes(tagName)) {
                    continue;
                }
                
                // Handle different elements with appropriate formatting
                if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                    const text = node.textContent.trim();
                    if (text) {
                        result += '\n' + indent + text.toUpperCase() + '\n';
                        result += indent + '='.repeat(Math.min(text.length, 50)) + '\n\n';
                    }
                } else if (['p', 'div', 'article', 'section'].includes(tagName)) {
                    const childContent = getTextWithFormatting(node, depth);
                    if (childContent.trim()) {
                        result += childContent + '\n';
                    }
                } else if (['ul', 'ol'].includes(tagName)) {
                    result += getTextWithFormatting(node, depth + 1);
                } else if (tagName === 'li') {
                    const text = node.textContent.trim();
                    if (text) {
                        result += indent + '• ' + text + '\n';
                    }
                } else if (tagName === 'br') {
                    result += '\n';
                } else if (['strong', 'b'].includes(tagName)) {
                    const text = node.textContent.trim();
                    if (text) {
                        result += indent + '**' + text + '**\n';
                    }
                } else if (['em', 'i'].includes(tagName)) {
                    const text = node.textContent.trim();
                    if (text) {
                        result += indent + '*' + text + '*\n';
                    }
                } else if (tagName === 'a') {
                    const text = node.textContent.trim();
                    const href = node.href;
                    if (text && href) {
                        result += indent + text + ' (' + href + ')\n';
                    } else if (text) {
                        result += indent + text + '\n';
                    }
                } else {
                    // For other elements, just get their text content
                    result += getTextWithFormatting(node, depth);
                }
            }
        }
        
        return result;
    }
    
    // Get the main content, preferring body but falling back to entire document
    const mainContent = document.body || document.documentElement;
    const title = document.title;
    
    let formattedContent = '';
    
    // Add title at the top
    if (title) {
        formattedContent += title.toUpperCase() + '\n';
        formattedContent += '='.repeat(Math.min(title.length, 50)) + '\n\n';
    }
    
    // Add URL
    formattedContent += 'URL: ' + window.location.href + '\n\n';
    
    // Add formatted content
    formattedContent += getTextWithFormatting(mainContent);
    
    // Clean up extra newlines
    return formattedContent.replace(/\n{3,}/g, '\n\n').trim();
}
