// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'copyPageContent') {
        try {
            const content = getFormattedPageContent();
            sendResponse({ success: true, content: content });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }
    return true; // Keep the message channel open for async response
});

// Reuse the same formatting function from popup.js
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
