const API_URL = 'http://localhost:3000/api';
let currentKeywords = [];
let currentData = {};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('keywordsForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('copyAllBtn').addEventListener('click', copyAllKeywords);
    document.getElementById('exportBtn').addEventListener('click', exportKeywords);
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const keyword = document.getElementById('keyword').value.trim();
    const count = parseInt(document.getElementById('count').value);
    const businessType = document.getElementById('businessType').value.trim();
    
    if (!keyword) {
        showStatus('Please enter a keyword', 'error');
        return;
    }
    
    await generateKeywords(keyword, count, businessType);
}

async function generateKeywords(keyword, count, businessType) {
    showLoading(true);
    hideResults();
    
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<div class="loading-spinner mr-2"></div>Generating...';
    
    try {
        const response = await fetch(`${API_URL}/keywords/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                keyword,
                count,
                businessType
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate keywords');
        }
        
        const data = await response.json();
        currentKeywords = data.keywords;
        currentData = data;
        
        displayResults(data);
        showStatus(`Generated ${data.count} keywords successfully!`, 'success');
    } catch (error) {
        console.error('Error generating keywords:', error);
        showStatus(error.message, 'error');
    } finally {
        showLoading(false);
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-magic mr-2"></i>Generate Keywords';
    }
}

function displayResults(data) {
    const resultsContainer = document.getElementById('resultsContainer');
    const keywordsList = document.getElementById('keywordsList');
    const resultsSummary = document.getElementById('resultsSummary');
    
    // Update summary
    resultsSummary.textContent = `${data.count} keywords generated for "${data.originalKeyword}"`;
    
    // Clear previous results
    keywordsList.innerHTML = '';
    
    // Display keywords in a 3-column layout
    const itemsPerColumn = Math.ceil(data.keywords.length / 3);
    const columns = [[], [], []];
    
    data.keywords.forEach((keyword, index) => {
        const columnIndex = Math.floor(index / itemsPerColumn);
        if (columnIndex < 3) {
            columns[columnIndex].push({ keyword, index: index + 1 });
        }
    });
    
    columns.forEach(column => {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'space-y-2';
        
        column.forEach(item => {
            const keywordItem = createKeywordItem(item.keyword, item.index);
            columnDiv.appendChild(keywordItem);
        });
        
        keywordsList.appendChild(columnDiv);
    });
    
    resultsContainer.classList.remove('hidden');
}

function createKeywordItem(keyword, index) {
    const item = document.createElement('div');
    item.className = 'keyword-item glass-effect rounded-lg p-3 flex items-center justify-between cursor-pointer';
    
    item.innerHTML = `
        <div class="flex items-center">
            <span class="keyword-number text-white opacity-60 text-sm font-mono">${index}.</span>
            <span class="text-white ml-3 font-medium">${keyword}</span>
        </div>
        <button class="copy-btn text-white opacity-60 hover:opacity-100 transition-opacity" onclick="copyKeyword('${keyword}', this)">
            <i class="fas fa-copy text-sm"></i>
        </button>
    `;
    
    // Click on item to copy
    item.addEventListener('click', (e) => {
        if (!e.target.closest('.copy-btn')) {
            copyKeyword(keyword, item);
        }
    });
    
    return item;
}

async function copyKeyword(keyword, element) {
    try {
        await navigator.clipboard.writeText(keyword);
        
        // Visual feedback
        element.classList.add('copy-success');
        const icon = element.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-check text-sm text-green-400';
        }
        
        setTimeout(() => {
            element.classList.remove('copy-success');
            if (icon) {
                icon.className = 'fas fa-copy text-sm';
            }
        }, 1000);
        
        showStatus(`Copied "${keyword}" to clipboard`, 'success');
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        showStatus('Failed to copy to clipboard', 'error');
    }
}

async function copyAllKeywords() {
    if (currentKeywords.length === 0) {
        showStatus('No keywords to copy', 'error');
        return;
    }
    
    try {
        const keywordsText = currentKeywords.join('\n');
        await navigator.clipboard.writeText(keywordsText);
        
        // Visual feedback
        const btn = document.getElementById('copyAllBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check mr-2"></i>Copied!';
        btn.className = btn.className.replace('bg-blue-500 hover:bg-blue-600', 'bg-green-500');
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.className = btn.className.replace('bg-green-500', 'bg-blue-500 hover:bg-blue-600');
        }, 2000);
        
        showStatus(`Copied all ${currentKeywords.length} keywords to clipboard`, 'success');
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        showStatus('Failed to copy to clipboard', 'error');
    }
}

function exportKeywords() {
    if (currentKeywords.length === 0) {
        showStatus('No keywords to export', 'error');
        return;
    }
    
    const keywordsText = currentKeywords.join('\n');
    const filename = `keywords_${currentData.originalKeyword.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    
    downloadTXT(keywordsText, filename);
    
    showStatus(`Exported ${currentKeywords.length} keywords to ${filename}`, 'success');
}

function downloadTXT(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

function showLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
}

function hideResults() {
    document.getElementById('resultsContainer').classList.add('hidden');
}

function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('statusMessage');
    const statusText = document.getElementById('statusText');
    
    statusDiv.classList.remove('hidden');
    statusText.textContent = message;
    
    // Add appropriate icon and color
    if (type === 'success') {
        statusText.innerHTML = '<i class="fas fa-check-circle mr-2"></i>' + message;
        statusText.className = 'text-green-300 text-center';
    } else if (type === 'error') {
        statusText.innerHTML = '<i class="fas fa-exclamation-circle mr-2"></i>' + message;
        statusText.className = 'text-red-300 text-center';
    } else {
        statusText.innerHTML = '<i class="fas fa-info-circle mr-2"></i>' + message;
        statusText.className = 'text-white text-center';
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusDiv.classList.add('hidden');
    }, 5000);
}

// Example keyword suggestions
const keywordExamples = {
    'คลินิกเสริมความงาม': ['beauty clinic', 'aesthetic clinic', 'cosmetic surgery'],
    'ร้านอาหาร': ['restaurant', 'food', 'dining'],
    'คาเฟ่': ['cafe', 'coffee shop', 'bistro'],
    'สปา': ['spa', 'wellness center', 'massage'],
    'ทันตแพทย์': ['dental clinic', 'dentist', 'orthodontic'],
    'โรงแรม': ['hotel', 'resort', 'accommodation']
};

// Add auto-complete functionality
document.getElementById('keyword').addEventListener('input', function(e) {
    // Simple auto-suggestion could be added here
    const value = e.target.value.toLowerCase();
    // Future enhancement: show suggestions dropdown
});