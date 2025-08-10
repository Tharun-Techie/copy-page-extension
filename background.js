// Handle keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'copy-page-content') {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Execute script to get content
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: getFormattedPageContent
            });
            
            const content = results[0].result;
            
            if (content && content.trim()) {
                // Since we can't access clipboard API from background script,
                // we'll inject a script to copy to clipboard
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: copyToClipboard,
                    args: [content]
                });
                
                // Show notification
                showNotification('Page content copied to clipboard!');
            } else {
                showNotification('No content found to copy.');
            }
        } catch (error) {
            console.error('Copy failed:', error);
            showNotification('Failed to copy content. Please try again.');
        }
    }
});

// Function to copy content to clipboard (injected into page)
function copyToClipboard(content) {
    navigator.clipboard.writeText(content).then(() => {
        console.log('Content copied to clipboard');
    }).catch(err => {
        console.error('Failed to copy content: ', err);
        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = content;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    });
}

// Same formatting function as in other files
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
                
                if (['script', 'style', 'noscript', 'meta', 'link', 'title'].includes(tagName)) {
                    continue;
                }
                
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
                    result += getTextWithFormatting(node, depth);
                }
            }
        }
        
        return result;
    }
    
    const mainContent = document.body || document.documentElement;
    const title = document.title;
    
    let formattedContent = '';
    
    if (title) {
        formattedContent += title.toUpperCase() + '\n';
        formattedContent += '='.repeat(Math.min(title.length, 50)) + '\n\n';
    }
    
    formattedContent += 'URL: ' + window.location.href + '\n\n';
    formattedContent += getTextWithFormatting(mainContent);
    
    return formattedContent.replace(/\n{3,}/g, '\n\n').trim();
}

// Show notification
function showNotification(message) {
    chrome.action.setBadgeText({text: '✓'});
    chrome.action.setBadgeBackgroundColor({color: '#0f9d58'});
    
    // Clear the badge after 2 seconds
    setTimeout(() => {
        chrome.action.setBadgeText({text: ''});
    }, 2000);
}
