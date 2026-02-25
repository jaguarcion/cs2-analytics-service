
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PricempireService {
  private readonly logger = new Logger(PricempireService.name);
  // Using the internal API endpoint typically used by their frontend
  private readonly API_URL = 'https://api.pricempire.com/v2/comparison';

  async getComparison() {
    try {
      // Query params from your link:
      // min_price=25&max_price=800&blacklist=sticker&from_provider=csfloat&to_provider=marketcsgo
      // &volume=8&from_qty=1&to_qty=5&max_roi=100&liquidity=50&fee=5&price_age=1440
      
      const params = {
        min_price: 25,
        max_price: 800,
        blacklist: 'sticker',
        from_provider: 'csfloat',
        to_provider: 'marketcsgo',
        volume: 8,
        from_qty: 1,
        to_qty: 5,
        max_roi: 100,
        liquidity: 50,
        fee: 5,
        price_age: 1440,
        limit: 50, // We need 50 items
        offset: 0
      };

      const { data } = await axios.get(this.API_URL, {
        params,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://pricempire.com/',
          'Origin': 'https://pricempire.com'
        }
      });

      return data;
    } catch (error: any) {
      this.logger.error(`Failed to fetch pricempire data: ${error.message}`);
      
      if (error.response?.status === 403) {
        throw new Error('Pricempire access denied (Cloudflare). We might need a cookie/proxy.');
      }
      
      // Fallback/Mock data structure for development if API fails (so UI can be built)
      // Remove this in production if strict error handling is needed
      return []; 
    }
  }
}
