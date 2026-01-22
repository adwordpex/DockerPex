import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export class GoogleCustomSearchScraper {
  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY;
    this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    this.facebookSearchEngineId = process.env.GOOGLE_FACEBOOK_SEARCH_ENGINE_ID;
    
    if (!this.apiKey) {
      throw new Error('GOOGLE_API_KEY is required in environment variables');
    }
    if (!this.searchEngineId) {
      throw new Error('GOOGLE_SEARCH_ENGINE_ID is required in environment variables');
    }
  }

  async searchGoogle(query, location = 'Thailand', num = 10, startIndex = 1) {
    try {
      const params = {
        key: this.apiKey,
        cx: this.searchEngineId,
        q: query,
        num: Math.min(num, 10), // Google CSE max is 10 per request
        start: startIndex,
        gl: 'th', // Thailand geolocation
        hl: 'en', // Interface language
        safe: 'off'
      };

      // Add location to query if specified
      if (location && location !== 'Thailand') {
        params.q = `${query} ${location}`;
      }

      console.log('   🔍 Using Google Custom Search...');
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', { params });
      
      // Handle pagination if more than 10 results requested
      let allResults = response.data;
      if (num > 10) {
        const additionalRequests = Math.ceil((num - 10) / 10);
        for (let i = 1; i <= additionalRequests; i++) {
          params.start = (i * 10) + 1;
          params.num = Math.min(num - (i * 10), 10);
          
          const additionalResponse = await axios.get('https://www.googleapis.com/customsearch/v1', { params });
          if (additionalResponse.data.items) {
            allResults.items = [...(allResults.items || []), ...additionalResponse.data.items];
          }
        }
      }

      return this.parseGoogleResults(allResults, query);
    } catch (error) {
      console.error('Google Custom Search error:', error.response?.data || error.message);
      throw new Error(`Google Custom Search failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async searchGoogleFacebook(query, location = 'Thailand', num = 10, startIndex = 1) {
    try {
      // Use Facebook-specific search engine if available, otherwise fallback to regular with site: filter
      const searchEngineId = this.facebookSearchEngineId || this.searchEngineId;
      const searchQuery = this.facebookSearchEngineId ? query : `${query} site:facebook.com`;

      const params = {
        key: this.apiKey,
        cx: searchEngineId,
        q: searchQuery,
        num: Math.min(num, 10),
        start: startIndex,
        gl: 'th',
        hl: 'en',
        safe: 'off'
      };

      // Add location to query if specified
      if (location && location !== 'Thailand') {
        params.q = `${searchQuery} ${location}`;
      }

      console.log('   📘 Using Google Custom Search (Facebook)...');
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', { params });
      
      // Handle pagination if more than 10 results requested
      let allResults = response.data;
      if (num > 10) {
        const additionalRequests = Math.ceil((num - 10) / 10);
        for (let i = 1; i <= additionalRequests; i++) {
          params.start = (i * 10) + 1;
          params.num = Math.min(num - (i * 10), 10);
          
          const additionalResponse = await axios.get('https://www.googleapis.com/customsearch/v1', { params });
          if (additionalResponse.data.items) {
            allResults.items = [...(allResults.items || []), ...additionalResponse.data.items];
          }
        }
      }

      return this.parseGoogleFacebookResults(allResults, query);
    } catch (error) {
      console.error('Google Custom Search (Facebook) error:', error.response?.data || error.message);
      throw new Error(`Google Custom Search (Facebook) failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  parseGoogleResults(results, originalQuery) {
    const leads = [];
    
    if (results.items) {
      results.items.forEach((item, index) => {
        leads.push({
          title: item.title,
          link: item.link,
          displayLink: item.displayLink,
          snippet: item.snippet,
          position: index + 1,
          source: 'google_custom_search',
          metatags: item.pagemap?.metatags?.[0] || {},
          cse_thumbnail: item.pagemap?.cse_thumbnail?.[0] || null
        });
      });
    }

    return {
      leads: leads,
      total: leads.length,
      searchInfo: {
        query: originalQuery,
        totalResults: results.searchInformation?.totalResults,
        searchTime: results.searchInformation?.searchTime,
        formattedTotalResults: results.searchInformation?.formattedTotalResults,
        formattedSearchTime: results.searchInformation?.formattedSearchTime
      }
    };
  }

  parseGoogleFacebookResults(results, originalQuery) {
    const leads = [];
    
    if (results.items) {
      results.items.forEach((item, index) => {
        // Only include actual Facebook pages/profiles
        if (item.link && item.link.includes('facebook.com')) {
          const facebookData = {
            title: item.title,
            link: item.link,
            displayLink: item.displayLink,
            snippet: item.snippet,
            position: index + 1,
            facebook_url: item.link,
            source: 'google_custom_facebook'
          };

          // Extract Facebook page name from URL if possible
          const pageNameMatch = item.link.match(/facebook\.com\/([^\/\?]+)/);
          if (pageNameMatch) {
            facebookData.facebook_page_name = pageNameMatch[1];
          }

          // Extract metadata if available
          if (item.pagemap?.metatags?.[0]) {
            const meta = item.pagemap.metatags[0];
            facebookData.facebook_page_title = meta['og:title'] || meta.title;
            facebookData.facebook_description = meta['og:description'] || meta.description;
            facebookData.facebook_image = meta['og:image'];
          }

          leads.push(facebookData);
        }
      });
    }

    return {
      leads: leads,
      total: leads.length,
      searchInfo: {
        query: originalQuery,
        totalResults: results.searchInformation?.totalResults,
        searchTime: results.searchInformation?.searchTime,
        formattedTotalResults: results.searchInformation?.formattedTotalResults,
        formattedSearchTime: results.searchInformation?.formattedSearchTime,
        type: 'facebook_pages'
      }
    };
  }
}