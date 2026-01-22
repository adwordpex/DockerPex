import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SerpApiScraper } from './scraper/serpapi.js';
import { PlaywrightScraper } from './scraper/playwright-scraper.js';
import { GeminiService } from './gemini-service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

const serpApiScraper = new SerpApiScraper();
const playwrightScraper = new PlaywrightScraper();
const geminiService = new GeminiService();

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

async function startServer() {
  try {
    await playwrightScraper.initialize();
    app.listen(PORT, '0.0.0.0', () => {
      console.log('Server running on port', PORT);
    });
  } catch (error) {
    console.error('Start failed:', error);
    process.exit(1);
  }
}

startServer();