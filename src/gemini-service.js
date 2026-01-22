import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigManager } from './config-manager.js';

export class GeminiService {
  constructor() {
    this.configManager = new ConfigManager();
    this.initializeGemini();
  }

  initializeGemini() {
    const apiKey = this.configManager.getDecryptedValue('google.apiKey');
    
    if (!apiKey) {
      console.warn('⚠️  Google API Key not found. Gemini service will not work.');
      this.genAI = null;
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('✅ Gemini AI initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Gemini AI:', error);
      this.genAI = null;
    }
  }

  async generateKeywords(keyword, count = 20) {
    if (!this.genAI || !this.model) {
      throw new Error('Gemini AI is not initialized. Please check your Google API key in settings.');
    }

    const prompt = `You are a keyword research expert specializing in business and lead generation.

Given the keyword: "${keyword}"

Generate exactly ${count} related keywords that would help find similar businesses or services. Focus on:
1. Synonyms and alternative terms
2. Related services in the same industry
3. Different ways customers might search for this business
4. Industry-specific terminology
5. Location-based variations (but keep them general)

Requirements:
- Each keyword should be on a new line
- No numbering or bullet points
- Keep keywords relevant for lead generation and business search
- Include both broad and specific terms
- Focus on Thai and English terms that are commonly used
- Make them suitable for search engines like Google Maps, Local Search, etc.

Example format:
keyword 1
keyword 2
keyword 3

Generate the keywords now:`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean and process the response
      const keywords = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.match(/^\d+\./)) // Remove numbered items
        .filter(line => !line.startsWith('-') && !line.startsWith('*')) // Remove bullet points
        .slice(0, count); // Ensure we don't exceed requested count

      return {
        success: true,
        originalKeyword: keyword,
        keywords: keywords,
        count: keywords.length
      };
    } catch (error) {
      console.error('Error generating keywords:', error);
      throw new Error(`Failed to generate keywords: ${error.message}`);
    }
  }

  async generateBusinessKeywords(keyword, count = 20, businessType = '') {
    if (!this.genAI || !this.model) {
      throw new Error('Gemini AI is not initialized. Please check your Google API key in settings.');
    }

    const businessContext = businessType ? `This is for ${businessType} businesses.` : '';
    
    const prompt = `You are a lead generation specialist focusing on business keyword research.

Main keyword: "${keyword}"
${businessContext}
Target: Generate exactly ${count} related keywords for finding similar businesses

Focus on generating keywords that will help find:
- Direct competitors
- Similar service providers
- Alternative business names
- Industry synonyms
- Service variations
- Customer search terms

Guidelines:
- Mix of Thai and English terms commonly used in Thailand
- Include formal and informal terms
- Consider how customers actually search
- Include location-agnostic terms
- Suitable for Google Maps, Local Search, Facebook search

Format: One keyword per line, no numbering or symbols.

Generate exactly ${count} keywords:`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean and process the response
      const keywords = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.match(/^\d+\./) && line.length > 0)
        .filter(line => !line.startsWith('-') && !line.startsWith('*') && !line.startsWith('•'))
        .slice(0, count);

      return {
        success: true,
        originalKeyword: keyword,
        keywords: keywords,
        count: keywords.length,
        businessType: businessType || 'General'
      };
    } catch (error) {
      console.error('Error generating business keywords:', error);
      throw new Error(`Failed to generate keywords: ${error.message}`);
    }
  }

  isAvailable() {
    return this.genAI !== null && this.model !== null;
  }
}

export default GeminiService;