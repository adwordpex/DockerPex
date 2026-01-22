const API_URL = 'http://localhost:3000/api';
let currentPassword = '';
let currentConfig = {};

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
});

// Load settings
async function loadSettings() {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/settings`);
        const config = await response.json();
        currentConfig = config;
        
        // Show settings form directly (no password protection)
        showSettingsForm();
        populateForm(config);
    } catch (error) {
        console.error('Error loading settings:', error);
        showStatus('Failed to load settings', 'error');
    } finally {
        showLoading(false);
    }
}

// Show settings form
function showSettingsForm() {
    document.getElementById('settingsForm').classList.remove('hidden');
}

// Populate form with current settings
function populateForm(config) {
    // Show masked values as placeholders
    document.getElementById('serpapiKey').placeholder = config.serpapi.key || 'Enter SerpAPI key';
    document.getElementById('googleApiKey').placeholder = config.google.apiKey || 'Enter Google API key';
    document.getElementById('googleSearchEngineId').placeholder = config.google.searchEngineId || 'Enter search engine ID';
    document.getElementById('googleFacebookSearchEngineId').placeholder = config.google.facebookSearchEngineId || 'Enter Facebook search engine ID';
    document.getElementById('port').value = config.settings.port || 3000;
}

// Save settings
async function saveSettings() {
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
    
    // Collect only changed values
    const updates = {
        serpapi: {},
        google: {},
        settings: {}
    };
    
    // Only include fields that have values
    const serpapiKey = document.getElementById('serpapiKey').value;
    if (serpapiKey) {
        updates.serpapi.key = serpapiKey;
    }
    
    const googleApiKey = document.getElementById('googleApiKey').value;
    if (googleApiKey) {
        updates.google.apiKey = googleApiKey;
    }
    
    const googleSearchEngineId = document.getElementById('googleSearchEngineId').value;
    if (googleSearchEngineId) {
        updates.google.searchEngineId = googleSearchEngineId;
    }
    
    const googleFacebookSearchEngineId = document.getElementById('googleFacebookSearchEngineId').value;
    if (googleFacebookSearchEngineId) {
        updates.google.facebookSearchEngineId = googleFacebookSearchEngineId;
    }
    
    const port = document.getElementById('port').value;
    if (port && port !== currentConfig.settings.port.toString()) {
        updates.settings.port = parseInt(port);
    }
    
    try {
        const response = await fetch(`${API_URL}/settings/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                updates
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showStatus(result.message, 'success');
            
            // Clear sensitive input fields
            document.getElementById('serpapiKey').value = '';
            document.getElementById('googleApiKey').value = '';
            document.getElementById('googleSearchEngineId').value = '';
            document.getElementById('googleFacebookSearchEngineId').value = '';
            
            // Reload settings
            setTimeout(() => {
                loadSettings();
            }, 2000);
        } else {
            showStatus(result.error || 'Failed to save settings', 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showStatus('Failed to save settings', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Save Settings';
    }
}

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Show loading state
function showLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
}

// Show status message
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