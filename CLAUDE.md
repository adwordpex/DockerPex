# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm install        # Install dependenciess          # Start production server
npm run dev        # Start development server with nodemon
npm install        # Install dependencies
```

No test framework is currently configured.

## Architecture Overview

This is a lead generation application built with Node.js/Express that combines web scraping, search APIs, and AI-powered keyword generation for business contact extraction.

### Core Components

- **Main Server** (`src/index.js`): Express server with API endpoints for search, scrape, and keyword generation
- **Configuration Manager** (`src/config-manager.js`): Encrypted storage system for API keys and settings
- **Scraping Services**: 
  - `src/scraper/serpapi.js`: SerpAPI integration for search results
  - `src/scraper/playwright-scraper.js`: Deep website scraping for contact extraction
  - `src/scraper/google-custom-search.js`: Google Custom Search API integration
- **AI Service** (`src/gemini-service.js`): Google Gemini integration for keyword generation
- **Frontend**: Vanilla JS with TailwindCSS in `public/` directory

### Key API Endpoints

- `POST /api/search`: Multi-provider search (SerpAPI, Google Custom Search)
- `POST /api/scrape`: Deep scrape websites using Playwright
- `POST /api/search-and-scrape`: Combined search and scrape operations
- `POST /api/keywords/generate`: AI-powered business keyword generation
- `GET /api/settings`: Configuration management with encryption

### Search Providers and Engines

The application supports multiple search providers and engines:
- **SerpAPI**: Google Search, Google Maps, Google Local
- **Google Custom Search**: General web search and Facebook-specific search
- **Search Engine IDs**: Configured via `GOOGLE_SEARCH_ENGINE_ID` and `GOOGLE_FACEBOOK_SEARCH_ENGINE_ID`

### Configuration System

Uses encrypted configuration management via `ConfigManager` class:
- API keys stored encrypted in `config.json`
- Settings accessible via password-protected UI at `/settings.html`
- Environment variables for sensitive data (see `.env`)

### Required Environment Variables

```bash
SERPAPI_KEY                      # SerpAPI access key
GOOGLE_API_KEY                   # Google API key for Gemini and Custom Search  
GOOGLE_SEARCH_ENGINE_ID          # General search engine ID
GOOGLE_FACEBOOK_SEARCH_ENGINE_ID # Facebook-specific search engine ID
PORT                            # Server port (default: 3000)
```

### Data Processing

- **Contact Extraction**: Emails, phone numbers, social media links, addresses
- **Batch Processing**: Configurable batch sizes and rate limiting
- **Export**: CSV export functionality built into frontend
- **Error Handling**: Comprehensive logging with graceful degradation

### Frontend Structure

- `public/index.html`: Main search and scraping interface
- `public/keywords.html`: AI-powered keyword generation UI  
- `public/settings.html`: Configuration management interface
- Responsive design with modern glassmorphism UI effects

## Development Notes

- Uses ES6 modules throughout (`"type": "module"` in package.json)
- All async operations use promises/async-await patterns
- Logging includes timestamps and emojis for better readability
- Rate limiting and batch size controls prevent API quota issues
- Playwright runs in non-headless mode by default for debugging