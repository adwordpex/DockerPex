import { chromium } from 'playwright';

export class PlaywrightScraper {
  constructor() {
    this.browser = null;
    this.context = null;
  }

  async initialize() {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
  }

  async scrapeWebsite(url) {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.context.newPage();
    
    try {
      console.log(`      🔗 Scraping: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Wait for content to load
      await page.waitForTimeout(2000);
      
      // Scroll to load dynamic content
      await page.evaluate(() => {
        return new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if(totalHeight >= scrollHeight){
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });
      
      const leadData = await page.evaluate(() => {
        const data = {
          title: document.title,
          url: window.location.href,
          contacts: {
            emails: [],
            phones: [],
            socialMedia: []
          },
          meta: {}
        };

        // Enhanced email extraction
        const emailPatterns = [
          /[a-zA-Z0-9][a-zA-Z0-9._%+-]{0,63}@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,62}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/g,
          /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
        ];
        
        // Get text from multiple sources
        const textSources = [
          document.body.innerText,
          document.body.innerHTML,
          Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href.replace('mailto:', '')).join(' '),
          Array.from(document.querySelectorAll('[href*="@"], [data-email], [class*="email"], [id*="email"]')).map(el => el.textContent).join(' ')
        ];
        
        const allText = textSources.join(' ');
        const emailSet = new Set();
        
        emailPatterns.forEach(pattern => {
          const matches = allText.match(pattern) || [];
          matches.forEach(email => {
            // Clean up email
            const cleaned = email.replace('mailto:', '').toLowerCase().trim();
            if (cleaned && !cleaned.includes('example.com') && !cleaned.includes('domain.com')) {
              emailSet.add(cleaned);
            }
          });
        });
        
        data.contacts.emails = Array.from(emailSet);

        // Enhanced phone extraction - Thai phone patterns
        const phonePatterns = [
          // Thai mobile: 08x-xxx-xxxx, 09x-xxx-xxxx, 06x-xxx-xxxx
          /(?:\+66|0)([689])[0-9][-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
          // Thai landline: 02-xxx-xxxx (Bangkok), 0xx-xxx-xxx
          /0[2-9][0-9][-.\s]?[0-9]{3}[-.\s]?[0-9]{3,4}/g,
          // International format: +66-xx-xxx-xxxx
          /\+66[-.\s]?[0-9]{1,2}[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
          // Tel links
          /tel:(\+?66[-.\s]?[0-9]{1,2}[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g,
          /tel:(0[689][0-9][-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g
        ];
        
        // Look for phone numbers in text and tel: links
        const phoneTextSources = [
          document.body.innerText,
          Array.from(document.querySelectorAll('a[href^="tel:"]')).map(a => a.href.replace('tel:', '')).join(' '),
          Array.from(document.querySelectorAll('[href*="tel:"], [data-phone], [class*="phone"], [class*="tel"], [id*="phone"], [class*="contact"]')).map(el => el.textContent).join(' ')
        ];
        
        const phoneText = phoneTextSources.join(' ');
        const phoneSet = new Set();
        
        phonePatterns.forEach(pattern => {
          const matches = phoneText.match(pattern) || [];
          matches.forEach(match => {
            let phone = match.replace('tel:', '').trim();
            // Clean up phone number
            const cleaned = phone.replace(/[^\d+]/g, '');
            
            // Validate Thai phone patterns
            if (cleaned.match(/^(\+?66|0)([689])[0-9]{8}$/)) {
              // Thai mobile
              phoneSet.add(phone);
            } else if (cleaned.match(/^0[2-9][0-9]{7,8}$/)) {
              // Thai landline
              phoneSet.add(phone);
            } else if (cleaned.match(/^\+66[0-9]{8,9}$/)) {
              // International Thai
              phoneSet.add(phone);
            }
          });
        });
        
        data.contacts.phones = Array.from(phoneSet);

        // Extract meta information
        const metaTags = document.getElementsByTagName('meta');
        for (let meta of metaTags) {
          const name = meta.getAttribute('name') || meta.getAttribute('property');
          const content = meta.getAttribute('content');
          if (name && content) {
            data.meta[name] = content;
          }
        }

        // Enhanced social media extraction
        const socialPatterns = [
          { pattern: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[A-Za-z0-9.]+/g, type: 'facebook' },
          { pattern: /(?:https?:\/\/)?(?:www\.)?twitter\.com\/[A-Za-z0-9_]+/g, type: 'twitter' },
          { pattern: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9-]+/g, type: 'linkedin' },
          { pattern: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[A-Za-z0-9_.]+/g, type: 'instagram' },
          { pattern: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:c|channel|user)\/[A-Za-z0-9_-]+/g, type: 'youtube' }
        ];

        const links = Array.from(document.getElementsByTagName('a'));
        const socialSet = new Set();
        
        links.forEach(link => {
          const href = link.href;
          socialPatterns.forEach(({ pattern }) => {
            if (pattern.test(href)) {
              socialSet.add(href);
            }
          });
        });

        data.contacts.socialMedia = Array.from(socialSet);

        // Try to find contact/about page links
        const contactLinks = Array.from(document.querySelectorAll('a')).filter(a => {
          const text = a.textContent.toLowerCase();
          const href = a.href.toLowerCase();
          return text.includes('contact') || text.includes('about') || 
                 href.includes('contact') || href.includes('about');
        }).map(a => a.href);
        
        data.contactPageLinks = contactLinks.slice(0, 3);

        return data;
      });

      const emailCount = leadData.contacts?.emails?.length || 0;
      const phoneCount = leadData.contacts?.phones?.length || 0;
      console.log(`      ✅ Found: ${emailCount} emails, ${phoneCount} phones`);
      
      await page.close();
      return leadData;
    } catch (error) {
      console.error(`      ❌ Error scraping ${url}:`, error.message);
      await page.close();
      throw error;
    }
  }

  async scrapeMultiplePages(urls) {
    const results = [];
    
    for (const url of urls) {
      try {
        const data = await this.scrapeWebsite(url);
        
        // If main page doesn't have contacts, try contact page
        if ((!data.contacts.emails || data.contacts.emails.length === 0) && 
            (!data.contacts.phones || data.contacts.phones.length === 0)) {
          if (data.contactPageLinks && data.contactPageLinks.length > 0) {
            try {
              console.log(`      📄 No contacts found, trying contact page...`);
              const contactPageData = await this.scrapeWebsite(data.contactPageLinks[0]);
              // Merge contact data
              data.contacts.emails = [...new Set([...data.contacts.emails, ...contactPageData.contacts.emails])];
              data.contacts.phones = [...new Set([...data.contacts.phones, ...contactPageData.contacts.phones])];
              data.scrapedContactPage = true;
              console.log(`      ✅ Contact page scraped successfully`);
            } catch (e) {
              console.log(`      ⚠️  Failed to scrape contact page:`, e.message);
            }
          }
        }
        
        results.push({ success: true, data });
      } catch (error) {
        results.push({ success: false, url, error: error.message });
      }
    }
    
    return results;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
    }
  }
}