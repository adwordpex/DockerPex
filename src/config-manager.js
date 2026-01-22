import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, '..', 'config.json');
    this.envPath = path.join(__dirname, '..', '.env');
    this.secretKey = process.env.CONFIG_SECRET || 'default-secret-key';
    this.loadConfig();
  }

  // Encrypt sensitive data
  encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.secretKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  // Decrypt sensitive data
  decrypt(text) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.secretKey, 'salt', 32);
      const textParts = text.split(':');
      const iv = Buffer.from(textParts.shift(), 'hex');
      const encryptedText = Buffer.from(textParts.join(':'), 'hex');
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      return '';
    }
  }

  // Load configuration from JSON file
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(data);
      } else {
        this.config = {
          serpapi: { key: '' },
          google: { 
            apiKey: '',
            searchEngineId: '',
            facebookSearchEngineId: ''
          },
          settings: {
            password: '',
            port: 3000
          }
        };
        this.saveConfig();
      }
    } catch (error) {
      console.error('Error loading config:', error);
      this.config = {};
    }
  }

  // Save configuration to JSON file
  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      this.updateEnvFile();
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  // Update .env file based on configuration
  updateEnvFile() {
    const envContent = `
SERPAPI_KEY=${this.getDecryptedValue('serpapi.key')}
PORT=${this.config.settings?.port || 3000}

# Google Programmable Search Engine
GOOGLE_API_KEY=${this.getDecryptedValue('google.apiKey')}
GOOGLE_SEARCH_ENGINE_ID=${this.getDecryptedValue('google.searchEngineId')}
GOOGLE_FACEBOOK_SEARCH_ENGINE_ID=${this.getDecryptedValue('google.facebookSearchEngineId')}

# Config Secret (Do not share)
CONFIG_SECRET=${this.secretKey}
`.trim();

    fs.writeFileSync(this.envPath, envContent);
  }

  // Get decrypted value from config
  getDecryptedValue(path) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    if (!value) return '';
    
    // Only decrypt if it looks like encrypted data
    if (typeof value === 'string' && value.includes(':')) {
      return this.decrypt(value);
    }
    
    return value;
  }

  // Set encrypted value in config
  setEncryptedValue(path, value) {
    const keys = path.split('.');
    let obj = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }
    
    // Encrypt sensitive values
    if (value && path.includes('key') || path.includes('Key') || path.includes('Id')) {
      obj[keys[keys.length - 1]] = this.encrypt(value);
    } else {
      obj[keys[keys.length - 1]] = value;
    }
    
    this.saveConfig();
  }

  // Get masked value for display
  getMaskedValue(path) {
    const value = this.getDecryptedValue(path);
    if (!value) return '';
    
    // Show first 4 and last 4 characters
    if (value.length > 12) {
      return value.substring(0, 4) + '****' + value.substring(value.length - 4);
    } else if (value.length > 4) {
      return value.substring(0, 2) + '****';
    }
    
    return '****';
  }

  // Always allow access (no password protection)
  verifyPassword(password) {
    return true;
  }

  // Get all configuration (masked)
  getMaskedConfig() {
    return {
      serpapi: {
        key: this.getMaskedValue('serpapi.key')
      },
      google: {
        apiKey: this.getMaskedValue('google.apiKey'),
        searchEngineId: this.getMaskedValue('google.searchEngineId'),
        facebookSearchEngineId: this.getMaskedValue('google.facebookSearchEngineId')
      },
      settings: {
        port: this.config.settings?.port || 3000,
        hasPassword: false
      }
    };
  }
}

export default ConfigManager;