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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Lead Scraper API running on http://localhost:${PORT}`);
});
```

**1.2 สร้างไฟล์ `.gitignore` (ถ้ายังไม่มี):**
```
node_modules/
.env
*.log
.DS_Store
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

const configManager = new ConfigManager();
const serpApiScraper = new SerpApiScraper();
const playwrightScraper = new PlaywrightScraper();
const geminiService = new GeminiService();
let googleCustomSearchScraper = null;

// Initialize Google Custom Search if credentials are available
try {
  if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
    googleCustomSearchScraper = new GoogleCustomSearchScraper();
    console.log('✅ Google Custom Search Engine initialized');
  } else {
    console.log('⚠️  Google Custom Search Engine not configured (missing API key or search engine ID)');
  }
} catch (error) {
  console.log('⚠️  Google Custom Search Engine initialization failed:', error.message);
}

// Search endpoint using SerpAPI
app.post('/api/search', async (req, res) => {
  try {
    const { query, location, num, engine, searchProvider } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`\n📍 [${new Date().toISOString()}] Search Request`);
    console.log(`   Query: "${query}"`);
    console.log(`   Engine: ${engine || 'google'}`);
    console.log(`   Provider: ${searchProvider || 'serpapi'}`);
    console.log(`   Location: ${location || 'default'}`);
    console.log(`   Results: ${num || 10}`);

    let results;
    
    // Use Google Custom Search if provider is 'google-custom' and it's initialized
    if (searchProvider === 'google-custom' && googleCustomSearchScraper) {
      if (engine === 'facebook') {
        results = await googleCustomSearchScraper.searchGoogleFacebook(query, location, num);
      } else if (engine === 'google' || !engine) {
        results = await googleCustomSearchScraper.searchGoogle(query, location, num);
      } else {
        // Google Custom Search doesn't support maps/local, fallback to SerpAPI
        console.log('   ⚠️  Google Custom Search doesn\'t support ' + engine + ', using SerpAPI...');
        searchProvider = 'serpapi';
      }
    }
    
    // Use SerpAPI as default or fallback
    if (!results) {
      if (engine === 'all') {
        // Search all sources and combine results
        console.log('   🚀 Searching all sources...');
        const [localResults, mapsResults, facebookResults, googleResults] = await Promise.all([
          serpApiScraper.searchGoogleLocal(query, location, null, num).catch(() => ({ leads: [], total: 0 })),
          serpApiScraper.searchGoogleMaps(query, location, num).catch(() => ({ leads: [], total: 0 })),
          serpApiScraper.searchGoogleFacebook(query, location, num).catch(() => ({ leads: [], total: 0 })),
          serpApiScraper.searchGoogle(query, location, num).catch(() => ({ leads: [], total: 0 }))
        ]);

        // Combine all leads
        const allLeads = [
          ...localResults.leads,
          ...mapsResults.leads,
          ...facebookResults.leads,
          ...googleResults.leads
        ];

        // Calculate total results found across all sources
        const totalResultsFound =
          (localResults.searchInfo?.totalResults || 0) +
          (mapsResults.searchInfo?.totalResults || 0) +
          (facebookResults.searchInfo?.totalResults || 0) +
          (googleResults.searchInfo?.totalResults || 0);

        results = {
          leads: allLeads,
          total: allLeads.length,
          searchInfo: {
            query: query,
            totalResults: totalResultsFound,
            sources: {
              local: localResults.total,
              maps: mapsResults.total,
              facebook: facebookResults.total,
              google: googleResults.total
            }
          }
        };

        console.log(`   ✅ Combined results from all sources:`);
        console.log(`      - Google Local: ${localResults.total} results`);
        console.log(`      - Google Maps: ${mapsResults.total} results`);
        console.log(`      - Facebook: ${facebookResults.total} results`);
        console.log(`      - Google Search: ${googleResults.total} results`);
        console.log(`      - Total: ${allLeads.length} leads`);
      } else if (engine === 'maps') {
        console.log('   🗺️  Using Google Maps search...');
        results = await serpApiScraper.searchGoogleMaps(query, location, num);
      } else if (engine === 'local') {
        console.log('   🏪 Using Google Local search...');
        results = await serpApiScraper.searchGoogleLocal(query, location, null, num);
      } else if (engine === 'facebook') {
        console.log('   📘 Using Google Facebook search...');
        results = await serpApiScraper.searchGoogleFacebook(query, location, num);
      } else {
        console.log('   🔍 Using Google search...');
        results = await serpApiScraper.searchGoogle(query, location, num);
      }
    }

    console.log(`   ✅ Found ${results.total} results`);
    res.json(results);
  } catch (error) {
    console.error('   ❌ Search error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Scrape website endpoint using Playwright
app.post('/api/scrape', async (req, res) => {
  try {
    const { url, urls } = req.body;
    
    if (!url && !urls) {
      return res.status(400).json({ error: 'URL or URLs array is required' });
    }

    console.log(`\n🌐 [${new Date().toISOString()}] Scrape Request`);
    
    let results;
    if (urls && Array.isArray(urls)) {
      console.log(`   📋 Scraping ${urls.length} URLs...`);
      results = await playwrightScraper.scrapeMultiplePages(urls);
      const successful = results.filter(r => r.success).length;
      console.log(`   ✅ Scraped ${successful}/${urls.length} successfully`);
    } else {
      console.log(`   🔗 Scraping single URL: ${url}`);
      results = await playwrightScraper.scrapeWebsite(url);
      console.log(`   ✅ Scrape completed`);
    }

    res.json(results);
  } catch (error) {
    console.error('   ❌ Scrape error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Combined search and scrape endpoint
app.post('/api/search-and-scrape', async (req, res) => {
  try {
    let { query, location, num, scrapeResults, engine, scrapeLimit, searchProvider } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`\n🚀 [${new Date().toISOString()}] Search & Scrape Request`);
    console.log(`   Query: "${query}"`);
    console.log(`   Location: ${location}`);
    console.log(`   Engine: ${engine || 'google'}`);
    console.log(`   Provider: ${searchProvider || 'serpapi'}`);
    console.log(`   Deep Scrape: ${scrapeResults ? 'Yes' : 'No'}`);

    // Handle ALL_THAILAND location - search multiple major cities
    if (location === 'ALL_THAILAND') {
      console.log('   🇹🇭 Searching entire Thailand (multiple locations)...');

      const majorCities = [
        'Bangkok, Thailand',
        'Chiang Mai, Thailand',
        'Phuket, Thailand',
        'Pattaya, Thailand',
        'Khon Kaen, Thailand',
        'Hat Yai, Thailand',
        'Nakhon Ratchasima, Thailand',
        'Udon Thani, Thailand'
      ];

      const allResults = [];
      let totalResultsFound = 0;

      for (const city of majorCities) {
        try {
          console.log(`   📍 Searching in: ${city}`);

          // Perform search for each city
          let cityResults;

          if (searchProvider === 'google-custom' && googleCustomSearchScraper) {
            if (engine === 'facebook') {
              cityResults = await googleCustomSearchScraper.searchGoogleFacebook(query, city, Math.floor(num/majorCities.length));
            } else if (engine === 'google' || !engine) {
              cityResults = await googleCustomSearchScraper.searchGoogle(query, city, Math.floor(num/majorCities.length));
            }
          }

          if (!cityResults) {
            if (engine === 'all') {
              const [localResults, mapsResults, facebookResults, googleResults] = await Promise.all([
                serpApiScraper.searchGoogleLocal(query, city, null, Math.floor(num/majorCities.length)).catch(() => ({ leads: [], total: 0 })),
                serpApiScraper.searchGoogleMaps(query, city, Math.floor(num/majorCities.length)).catch(() => ({ leads: [], total: 0 })),
                serpApiScraper.searchGoogleFacebook(query, city, Math.floor(num/majorCities.length/2)).catch(() => ({ leads: [], total: 0 })),
                serpApiScraper.searchGoogle(query, city, Math.floor(num/majorCities.length/2)).catch(() => ({ leads: [], total: 0 }))
              ]);

              const cityLeads = [
                ...localResults.leads,
                ...mapsResults.leads,
                ...facebookResults.leads,
                ...googleResults.leads
              ];

              cityResults = { leads: cityLeads, total: cityLeads.length };
              totalResultsFound += (localResults.searchInfo?.totalResults || 0) +
                                   (mapsResults.searchInfo?.totalResults || 0) +
                                   (facebookResults.searchInfo?.totalResults || 0) +
                                   (googleResults.searchInfo?.totalResults || 0);
            } else if (engine === 'maps') {
              cityResults = await serpApiScraper.searchGoogleMaps(query, city, Math.floor(num/majorCities.length));
            } else if (engine === 'local') {
              cityResults = await serpApiScraper.searchGoogleLocal(query, city, null, Math.floor(num/majorCities.length));
            } else if (engine === 'facebook') {
              cityResults = await serpApiScraper.searchGoogleFacebook(query, city, Math.floor(num/majorCities.length));
            } else {
              cityResults = await serpApiScraper.searchGoogle(query, city, Math.floor(num/majorCities.length));
            }
          }

          if (cityResults && cityResults.leads) {
            allResults.push(...cityResults.leads);
            console.log(`      ✅ Found ${cityResults.leads.length} results from ${city}`);
          }

          // Add delay between cities to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.log(`      ⚠️  Error searching ${city}:`, error.message);
        }
      }

      const searchResults = {
        leads: allResults,
        total: allResults.length,
        searchInfo: {
          query: query,
          totalResults: totalResultsFound || allResults.length,
          location: 'ทั้งประเทศไทย (8 จังหวัดหลัก)'
        }
      };

      console.log(`   ✅ Found total ${allResults.length} results from all locations`);

      // Continue with scraping if needed
      if (scrapeResults && searchResults.leads.length > 0) {
        const urls = searchResults.leads.map(lead => lead.link || lead.website).filter(link => link);
        const limit = Math.min(scrapeLimit || 10, urls.length, 50);
        const urlsToScrape = urls.slice(0, limit);
        console.log(`   🌐 Starting deep scrape of ${urlsToScrape.length}/${urls.length} websites...`);

        const scrapeData = await playwrightScraper.scrapeMultiplePages(urlsToScrape);

        let emailCount = 0;
        let phoneSet = new Set();

        searchResults.leads = searchResults.leads.map((lead, index) => {
          if (scrapeData[index] && scrapeData[index].success) {
            const mergedLead = { ...lead, ...scrapeData[index].data };
            if (mergedLead.contacts?.emails?.length > 0) emailCount += mergedLead.contacts.emails.length;
            if (mergedLead.contacts?.phones?.length > 0) {
              mergedLead.contacts.phones.forEach(phone => {
                if (phone) phoneSet.add(phone.replace(/\D/g, ''));
              });
            }
            return mergedLead;
          }
          return lead;
        });

        searchResults.leads.forEach(lead => {
          if (lead.phone && !phoneSet.has(lead.phone.replace(/\D/g, ''))) {
            phoneSet.add(lead.phone.replace(/\D/g, ''));
          }
        });

        console.log(`   📧 Found ${emailCount} emails`);
        console.log(`   📞 Found ${phoneSet.size} unique phone numbers`);
        console.log(`   ✅ Deep scrape completed`);
      }

      return res.json(searchResults);
    }

    // Normal search for single location
    console.log('   🔍 Starting search...');
    let searchResults;
    
    // Use Google Custom Search if provider is 'google-custom' and it's initialized
    if (searchProvider === 'google-custom' && googleCustomSearchScraper) {
      if (engine === 'facebook') {
        searchResults = await googleCustomSearchScraper.searchGoogleFacebook(query, location, num);
      } else if (engine === 'google' || !engine) {
        searchResults = await googleCustomSearchScraper.searchGoogle(query, location, num);
      } else {
        // Google Custom Search doesn't support maps/local, fallback to SerpAPI
        console.log('   ⚠️  Google Custom Search doesn\'t support ' + engine + ', using SerpAPI...');
        searchProvider = 'serpapi';
      }
    }
    
    // Use SerpAPI as default or fallback
    if (!searchResults) {
      if (engine === 'all') {
        // Search all sources and combine results
        console.log('   🚀 Searching all sources...');
        const [localResults, mapsResults, facebookResults, googleResults] = await Promise.all([
          serpApiScraper.searchGoogleLocal(query, location, null, num).catch(() => ({ leads: [], total: 0 })),
          serpApiScraper.searchGoogleMaps(query, location, num).catch(() => ({ leads: [], total: 0 })),
          serpApiScraper.searchGoogleFacebook(query, location, num).catch(() => ({ leads: [], total: 0 })),
          serpApiScraper.searchGoogle(query, location, num).catch(() => ({ leads: [], total: 0 }))
        ]);

        // Combine all leads
        const allLeads = [
          ...localResults.leads,
          ...mapsResults.leads,
          ...facebookResults.leads,
          ...googleResults.leads
        ];

        // Calculate total results found across all sources
        const totalResultsFound =
          (localResults.searchInfo?.totalResults || 0) +
          (mapsResults.searchInfo?.totalResults || 0) +
          (facebookResults.searchInfo?.totalResults || 0) +
          (googleResults.searchInfo?.totalResults || 0);

        searchResults = {
          leads: allLeads,
          total: allLeads.length,
          searchInfo: {
            query: query,
            totalResults: totalResultsFound,
            sources: {
              local: localResults.total,
              maps: mapsResults.total,
              facebook: facebookResults.total,
              google: googleResults.total
            }
          }
        };

        console.log(`   ✅ Combined results from all sources:`);
        console.log(`      - Google Local: ${localResults.total} results`);
        console.log(`      - Google Maps: ${mapsResults.total} results`);
        console.log(`      - Facebook: ${facebookResults.total} results`);
        console.log(`      - Google Search: ${googleResults.total} results`);
        console.log(`      - Total: ${allLeads.length} leads`);
      } else if (engine === 'maps') {
        searchResults = await serpApiScraper.searchGoogleMaps(query, location);
      } else if (engine === 'local') {
        searchResults = await serpApiScraper.searchGoogleLocal(query, location);
      } else if (engine === 'facebook') {
        searchResults = await serpApiScraper.searchGoogleFacebook(query, location, num);
      } else {
        searchResults = await serpApiScraper.searchGoogle(query, location, num);
      }
    }
    
    console.log(`   ✅ Found ${searchResults.total} search results`);
    
    // If scrapeResults is true, scrape the websites
    if (scrapeResults && searchResults.leads.length > 0) {
      const urls = searchResults.leads.map(lead => lead.link).filter(link => link);
      const limit = Math.min(scrapeLimit || 10, urls.length, 50); // Max 50 for safety
      const urlsToScrape = urls.slice(0, limit);
      console.log(`   🌐 Starting deep scrape of ${urlsToScrape.length}/${urls.length} websites...`);
      
      const scrapeData = await playwrightScraper.scrapeMultiplePages(urlsToScrape);
      
      let emailCount = 0;
      let phoneSet = new Set(); // Use Set to track unique phone numbers
      
      // Merge scrape data with search results
      searchResults.leads = searchResults.leads.map((lead, index) => {
        if (scrapeData[index] && scrapeData[index].success) {
          const mergedLead = { ...lead, ...scrapeData[index].data };
          if (mergedLead.contacts?.emails?.length > 0) emailCount += mergedLead.contacts.emails.length;
          if (mergedLead.contacts?.phones?.length > 0) {
            // Add phones to Set to count unique numbers only
            mergedLead.contacts.phones.forEach(phone => {
              if (phone) phoneSet.add(phone.replace(/\D/g, '')); // Normalize phone number
            });
          }
          return mergedLead;
        }
        return lead;
      });
      
      // Also count phones from search results (not from scraping)
      searchResults.leads.forEach(lead => {
        if (lead.phone && !phoneSet.has(lead.phone.replace(/\D/g, ''))) {
          phoneSet.add(lead.phone.replace(/\D/g, ''));
        }
      });
      
      console.log(`   📧 Found ${emailCount} emails`);
      console.log(`   📞 Found ${phoneSet.size} unique phone numbers`);
      console.log(`   ✅ Deep scrape completed`);
    }

    res.json(searchResults);
  } catch (error) {
    console.error('   ❌ Search and scrape error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Keywords generation endpoint
app.post('/api/keywords/generate', async (req, res) => {
  try {
    const { keyword, count, businessType } = req.body;
    
    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    if (!geminiService.isAvailable()) {
      return res.status(503).json({ 
        error: 'Gemini AI service is not available. Please check your Google API key in settings.' 
      });
    }

    console.log(`\n🔤 [${new Date().toISOString()}] Keywords Generation Request`);
    console.log(`   Keyword: "${keyword}"`);
    console.log(`   Count: ${count || 20}`);
    console.log(`   Business Type: ${businessType || 'General'}`);

    const result = await geminiService.generateBusinessKeywords(
      keyword, 
      parseInt(count) || 20, 
      businessType
    );
    
    console.log(`   ✅ Generated ${result.count} keywords`);
    res.json(result);
  } catch (error) {
    console.error('   ❌ Keywords generation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Settings endpoints
app.get('/api/settings', (req, res) => {
  const config = configManager.getMaskedConfig();
  res.json(config);
});

app.post('/api/settings/verify', (req, res) => {
  const { password } = req.body;
  const isValid = configManager.verifyPassword(password);
  res.json({ valid: isValid });
});

app.post('/api/settings/update', (req, res) => {
  const { updates } = req.body;
  
  try {
    // Update each setting
    if (updates.serpapi?.key !== undefined) {
      configManager.setEncryptedValue('serpapi.key', updates.serpapi.key);
    }
    
    if (updates.google?.apiKey !== undefined) {
      configManager.setEncryptedValue('google.apiKey', updates.google.apiKey);
    }
    
    if (updates.google?.searchEngineId !== undefined) {
      configManager.setEncryptedValue('google.searchEngineId', updates.google.searchEngineId);
    }
    
    if (updates.google?.facebookSearchEngineId !== undefined) {
      configManager.setEncryptedValue('google.facebookSearchEngineId', updates.google.facebookSearchEngineId);
    }
    
    if (updates.settings?.port !== undefined) {
      configManager.setEncryptedValue('settings.port', updates.settings.port);
    }
    
    res.json({ success: true, message: 'Settings updated successfully. Restart the server for changes to take effect.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Initialize Playwright and start server
async function startServer() {
  try {
    await playwrightScraper.initialize();
    
    app.listen(PORT, () => {
      console.log(`\n🚀 Lead Scraper API running on http://localhost:${PORT}`);
      console.log(`📌 Frontend available at http://localhost:${PORT}`);
      console.log(`\n🔍 Monitoring requests...\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await playwrightScraper.close();
  process.exit(0);
});

startServer();