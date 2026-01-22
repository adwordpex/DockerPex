# Google Custom Search Engine Setup Guide

This guide explains how to set up Google Programmable Search Engine (formerly Custom Search API) for the Lead Scraper application.

## Overview

The Lead Scraper now supports two search providers:
1. **SerpAPI** - The default provider that supports all search engines (Google, Maps, Local, Facebook)
2. **Google Custom Search** - Google's official API that supports regular Google search and Facebook-specific search

## Setup Steps

### 1. Get Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Custom Search API"
4. Go to "Credentials" and create an API key
5. Copy the API key

### 2. Create Programmable Search Engines

You need to create two search engines:

#### A. Regular Google Search Engine
1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Click "Add" to create a new search engine
3. Configuration:
   - Sites to search: Select "Search the entire web"
   - Search engine name: "Lead Scraper - General"
4. After creation, go to "Setup" and copy the Search Engine ID

#### B. Facebook-Specific Search Engine
1. Create another search engine
2. Configuration:
   - Sites to search: Add `facebook.com/*`
   - Search engine name: "Lead Scraper - Facebook"
   - Under "Advanced" settings, you can fine-tune to search only Facebook pages
3. Copy the Search Engine ID

### 3. Configure Environment Variables

Update the `.env` file in the `lead-scraper` directory:

```env
# Existing SerpAPI configuration
SERPAPI_KEY=your_serpapi_key_here
PORT=3000

# Google Programmable Search Engine
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_general_search_engine_id_here
GOOGLE_FACEBOOK_SEARCH_ENGINE_ID=your_facebook_search_engine_id_here
```

### 4. Install Dependencies

```bash
cd lead-scraper
npm install
```

### 5. Run the Application

```bash
npm start
```

## Usage

1. Open the web interface at `http://localhost:3000`
2. Select "Google Custom Search" from the "Search Provider" dropdown
3. Choose your search engine:
   - **Google Search** - Uses the general search engine
   - **Google Facebook** - Uses the Facebook-specific search engine
   - **Google Maps** - Not supported (automatically falls back to SerpAPI)
   - **Google Local** - Not supported (automatically falls back to SerpAPI)

## Features Comparison

| Feature | SerpAPI | Google Custom Search |
|---------|---------|---------------------|
| Google Search | ✅ | ✅ |
| Google Maps | ✅ | ❌ |
| Google Local | ✅ | ❌ |
| Facebook Search | ✅ | ✅ |
| Rate Limits | 100/month (free) | 100/day (free) |
| Pricing | $50/month for 5000 | $5 per 1000 queries |

## API Limits

Google Custom Search free tier includes:
- 100 queries per day
- Maximum 10 results per query

For higher limits, you need to set up billing in Google Cloud Console.

## Troubleshooting

1. **"Google Custom Search Engine not configured" message**
   - Check that all three environment variables are set correctly
   - Restart the server after updating .env

2. **No results returned**
   - Verify your API key is valid
   - Check if you've exceeded the daily quota
   - Ensure the search engine IDs are correct

3. **Facebook search not working**
   - Make sure the Facebook search engine is configured to search `facebook.com/*`
   - Try adding more specific patterns like `facebook.com/pages/*`

## Integration Details

The implementation includes:
- `google-custom-search.js` - The search engine integration
- Updated `index.js` - API endpoints with provider selection
- Updated UI - Search provider dropdown in the interface

The system automatically falls back to SerpAPI for unsupported search types (Maps, Local).