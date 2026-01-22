import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SerpApiScraper } from './scraper/serpapi.js';
import { PlaywrightScraper } from './scraper/playwright-scraper.js';
import { GoogleCustomSearchScraper } from './scraper/google-custom-search.js';
import { ConfigManager } from './config-manager.js';
import { GeminiService } from './gemini-service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

const configManager = new ConfigManager();
const serpApiScraper = new SerpApiScraper();
const playwrightScraper = new PlaywrightScraper();
const geminiService = new GeminiService();
let googleCustomSearchScraper = null;

try {
  if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
    googleCustomSearchScraper = new GoogleCustomSearchScraper();
    console.log('✅ Google Custom Search Engine initialized');
  } else {
    console.log('⚠️  Google Custom Search Engine not configured');
  }
} catch (error) {
  console.log('⚠️  Google Custom Search initialization failed:', error.message);
}

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/search', async (req, res) => {
  try {
    const { query, location, num } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    const results = await serpApiScraper.searchGoogle(query, location, num);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scrape', async (req, res) => {
  try {
    const { url, urls } = req.body;
    if (!url && !urls) {
      return res.status(400).json({ error: 'URL required' });
    }
    const results = urls ? await playwrightScraper.scrapeMultiplePages(urls) : await playwrightScraper.scrapePage(url);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/keywords/generate', async (req, res) => {
  try {
    const { keyword, count, businessType } = req.body;
    if (!keyword) {
      return res.status(400).json({ error: 'Keyword required' });
    }
    if (!geminiService.isAvailable()) {
      return res.status(503).json({ error: 'Gemini AI not available' });
    }
    const result = await geminiService.generateKeywords(keyword, count, businessType);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  try {
    await playwrightScraper.initialize();
    app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 Lead Scraper API running on port', PORT);
      console.log('✅ Gemini AI initialized successfully');
    });
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await playwrightScraper.close();
  process.exit(0);
});

startServer();