import { getJson } from 'serpapi';
import dotenv from 'dotenv';

dotenv.config();

export class SerpApiScraper {
  constructor() {
    this.apiKey = process.env.SERPAPI_KEY;
    if (!this.apiKey) {
      throw new Error('SERPAPI_KEY is required in environment variables');
    }
  }

  async searchGoogle(query, location = 'Thailand', num = 10) {
    try {
      // SerpAPI supports max 100 results per request, use pagination for more
      const maxPerRequest = 100;
      const allLeads = [];
      let totalResults = 0;

      if (num <= maxPerRequest) {
        // Single request
        const params = {
          api_key: this.apiKey,
          engine: 'google',
          q: query,
          location: location,
          google_domain: 'google.co.th',
          gl: 'th',
          hl: 'en',
          num: num
        };

        const results = await getJson(params);
        const parsed = this.parseGoogleResults(results);
        return parsed;
      } else {
        // Multiple requests with pagination
        const requests = Math.ceil(num / maxPerRequest);

        for (let i = 0; i < requests; i++) {
          const start = i * maxPerRequest;
          const currentNum = Math.min(maxPerRequest, num - start);

          const params = {
            api_key: this.apiKey,
            engine: 'google',
            q: query,
            location: location,
            google_domain: 'google.co.th',
            gl: 'th',
            hl: 'en',
            num: currentNum,
            start: start
          };

          const results = await getJson(params);
          const parsed = this.parseGoogleResults(results);
          allLeads.push(...parsed.leads);
          totalResults = parsed.searchInfo?.totalResults || totalResults;

          // Add small delay between requests to avoid rate limiting
          if (i < requests - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        return {
          leads: allLeads,
          total: allLeads.length,
          searchInfo: {
            query: query,
            totalResults: totalResults
          }
        };
      }
    } catch (error) {
      console.error('SerpAPI search error:', error);
      throw error;
    }
  }

  async searchGoogleMaps(query, location = 'Thailand', num = 20) {
    try {
      // Google Maps returns limited results per request, use pagination
      const allLeads = [];
      let nextPageToken = null;
      let fetched = 0;

      while (fetched < num) {
        const params = {
          api_key: this.apiKey,
          engine: 'google_maps',
          q: query,
          ll: '@13.7563309,100.5017651,14z',
          type: 'search',
          google_domain: 'google.co.th'
        };

        if (nextPageToken) {
          params.next_page_token = nextPageToken;
        }

        const results = await getJson(params);
        const parsed = this.parseGoogleMapsResults(results);

        if (parsed.leads.length === 0) break; // No more results

        allLeads.push(...parsed.leads);
        fetched += parsed.leads.length;

        // Check if there's a next page
        nextPageToken = results.serpapi_pagination?.next_page_token;
        if (!nextPageToken || fetched >= num) break;

        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      return {
        leads: allLeads.slice(0, num),
        total: allLeads.length,
        searchInfo: {
          query: query
        }
      };
    } catch (error) {
      console.error('SerpAPI Maps search error:', error);
      throw error;
    }
  }

  parseGoogleResults(results) {
    const leads = [];
    
    if (results.organic_results) {
      results.organic_results.forEach(result => {
        leads.push({
          title: result.title,
          link: result.link,
          snippet: result.snippet,
          position: result.position,
          source: 'google_search'
        });
      });
    }

    return {
      leads: leads,
      total: leads.length,
      searchInfo: {
        query: results.search_parameters?.q,
        totalResults: results.search_information?.total_results
      }
    };
  }

  async searchGoogleLocal(query, location = 'Bangkok, Thailand', categoryId = null, num = 20) {
    try {
      // Google Local supports pagination via start parameter
      const allLeads = [];
      const maxRequests = Math.ceil(num / 20); // Google Local returns ~20 per page

      for (let page = 0; page < maxRequests && page < 10; page++) { // Max 10 pages = 200 results
        const params = {
          api_key: this.apiKey,
          engine: 'google_local',
          q: query,
          location: location,
          hl: 'en',
          google_domain: 'google.co.th',
          start: page * 20
        };

        // Add category filter if provided
        if (categoryId) {
          params.ludocid = categoryId;
        }

        console.log(`   🏪 Using Google Local search (page ${page + 1})...`);
        const results = await getJson(params);
        const parsed = this.parseGoogleLocalResults(results);

        if (parsed.leads.length === 0) break; // No more results

        allLeads.push(...parsed.leads);

        // If we got less than expected, no more pages available
        if (parsed.leads.length < 15) break;

        // Add delay between requests
        if (page < maxRequests - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return {
        leads: allLeads,
        total: allLeads.length,
        filters: null,
        searchInfo: {
          query: query,
          location: location,
          categories: null
        }
      };
    } catch (error) {
      console.error('SerpAPI Local search error:', error);
      throw error;
    }
  }

  parseGoogleResults(results) {
    const leads = [];
    
    if (results.organic_results) {
      results.organic_results.forEach(result => {
        leads.push({
          title: result.title,
          link: result.link,
          snippet: result.snippet,
          position: result.position,
          source: 'google_search'
        });
      });
    }

    return {
      leads: leads,
      total: leads.length,
      searchInfo: {
        query: results.search_parameters?.q,
        totalResults: results.search_information?.total_results
      }
    };
  }

  parseGoogleMapsResults(results) {
    const leads = [];
    
    if (results.local_results) {
      results.local_results.forEach(result => {
        leads.push({
          title: result.title,
          address: result.address,
          phone: result.phone,
          website: result.website,
          rating: result.rating,
          reviews: result.reviews,
          type: result.type,
          gps_coordinates: result.gps_coordinates,
          place_id: result.place_id,
          source: 'google_maps'
        });
      });
    }

    return {
      leads: leads,
      total: leads.length,
      searchInfo: {
        query: results.search_parameters?.q
      }
    };
  }

  parseGoogleLocalResults(results) {
    const leads = [];
    
    // Parse main local results
    if (results.local_results) {
      results.local_results.forEach(result => {
        leads.push({
          title: result.title,
          address: result.address,
          phone: result.phone,
          website: result.website || result.link,
          rating: result.rating,
          reviews: result.reviews,
          type: result.type,
          price: result.price,
          hours: result.hours,
          description: result.description,
          service_options: result.service_options,
          gps_coordinates: result.gps_coordinates,
          place_id: result.place_id,
          data_id: result.data_id,
          thumbnail: result.thumbnail,
          source: 'google_local'
        });
      });
    }

    // Parse inline local results if available
    if (results.inline_local_results) {
      results.inline_local_results.forEach(result => {
        leads.push({
          title: result.title,
          address: result.address,
          phone: result.phone,
          website: result.website,
          rating: result.rating,
          reviews: result.reviews,
          type: result.type,
          hours: result.hours,
          gps_coordinates: result.gps_coordinates,
          place_id: result.place_id,
          source: 'google_local_inline'
        });
      });
    }

    return {
      leads: leads,
      total: leads.length,
      filters: results.filters,
      searchInfo: {
        query: results.search_parameters?.q,
        location: results.search_parameters?.location,
        categories: results.categories
      }
    };
  }

  async searchGoogleFacebook(query, location = 'Thailand', num = 10) {
    try {
      // Use pagination for large requests
      const maxPerRequest = 100;
      const allLeads = [];
      let totalResults = 0;

      if (num <= maxPerRequest) {
        const params = {
          api_key: this.apiKey,
          engine: 'google',
          q: `${query} site:facebook.com`,
          location: location,
          google_domain: 'google.co.th',
          gl: 'th',
          hl: 'en',
          num: num
        };

        console.log('   📘 Using Google Facebook search...');
        const results = await getJson(params);
        return this.parseGoogleFacebookResults(results);
      } else {
        // Multiple requests with pagination
        const requests = Math.ceil(num / maxPerRequest);

        for (let i = 0; i < requests; i++) {
          const start = i * maxPerRequest;
          const currentNum = Math.min(maxPerRequest, num - start);

          const params = {
            api_key: this.apiKey,
            engine: 'google',
            q: `${query} site:facebook.com`,
            location: location,
            google_domain: 'google.co.th',
            gl: 'th',
            hl: 'en',
            num: currentNum,
            start: start
          };

          const results = await getJson(params);
          const parsed = this.parseGoogleFacebookResults(results);
          allLeads.push(...parsed.leads);
          totalResults = parsed.searchInfo?.totalResults || totalResults;

          if (i < requests - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        return {
          leads: allLeads,
          total: allLeads.length,
          searchInfo: {
            query: `${query} site:facebook.com`,
            totalResults: totalResults,
            type: 'facebook_pages'
          }
        };
      }
    } catch (error) {
      console.error('SerpAPI Facebook search error:', error);
      throw error;
    }
  }

  parseGoogleFacebookResults(results) {
    const leads = [];
    
    if (results.organic_results) {
      results.organic_results.forEach(result => {
        // Only include Facebook pages
        if (result.link && result.link.includes('facebook.com')) {
          leads.push({
            title: result.title,
            link: result.link,
            snippet: result.snippet,
            position: result.position,
            facebook_url: result.link,
            source: 'google_facebook'
          });
        }
      });
    }

    return {
      leads: leads,
      total: leads.length,
      searchInfo: {
        query: results.search_parameters?.q,
        totalResults: results.search_information?.total_results,
        type: 'facebook_pages'
      }
    };
  }
}