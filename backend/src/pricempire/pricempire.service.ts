
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PricempireService {
  private readonly logger = new Logger(PricempireService.name);
  // Updated URL based on browser network log
  private readonly API_URL = 'https://pricempire.com/api-data/v1/comparison';

  async getComparison() {
    try {
      const params = {
        min_price: 25,
        max_price: 800,
        blacklist: 'sticker',
        search: '',
        from_provider: 'csfloat',
        to_provider: 'marketcsgo',
        sort: 'roi:desc',
        volume: 8,
        from_qty: 1,
        to_qty: 5,
        min_roi: -100,
        max_roi: 100,
        liquidity: 50,
        game: 730,
        fee: 5,
        page: 1,
        price_age: 1440
      };

      const { data } = await axios.get(this.API_URL, {
        params,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 YaBrowser/25.12.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'ru,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Referer': 'https://pricempire.com/app/comparison?min_price=25&max_price=800&blacklist=sticker&from_provider=csfloat&to_provider=marketcsgo&volume=8&from_qty=1&to_qty=5&max_roi=100&liquidity=50&fee=5&price_age=1440',
          'Origin': 'https://pricempire.com',
          'Cookie': 'i18n_redirected=en; pricempire-theme=slate; _ga=GA1.1.1709738705.1770395224; pricempire_auth=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMxNTM3ODAsImlwIjoiMTg1LjE2Mi44LjQxIiwic2Vzc2lvbklkIjo1MjIyNDIsInVzZXJBZ2VudCI6Ik1vemlsbGEvNS4wIChXaW5kb3dzIE5UIDEwLjA7IFdpbjY0OyB4NjQpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xNDIuMC4wLjAgWWFCcm93c2VyLzI1LjEyLjAuMCBTYWZhcmkvNTM3LjM2IiwiaWF0IjoxNzcxMTAwNTcyLCJleHAiOjE3NzM2OTI1NzJ9.yMo7_G9E0B7iwAPKnufsRG169cvvU_PaQ1Mu4J0BOYg; comparison-config-v3-3=%7B%7D; comparison-mute-v3=false; skins-banner-dismissed=false; cfzs_google-analytics_v4=%7B%22lTnF_pageviewCounter%22%3A%7B%22v%22%3A%228%22%7D%7D; _ga_5YMSVJKHTZ=GS2.1.s1772032393$o5$g1$t1772033679$j60$l0$h0; cfz_google-analytics_v4=%7B%22lTnF_engagementDuration%22%3A%7B%22v%22%3A%220%22%2C%22e%22%3A1803569680239%7D%2C%22lTnF_engagementStart%22%3A%7B%22v%22%3A%221772033680239%22%2C%22e%22%3A1803569680239%7D%2C%22lTnF_counter%22%3A%7B%22v%22%3A%2263%22%2C%22e%22%3A1803569680239%7D%2C%22lTnF_session_counter%22%3A%7B%22v%22%3A%225%22%2C%22e%22%3A1803569680239%7D%2C%22lTnF_ga4%22%3A%7B%22v%22%3A%22657fc0b7-5c41-4d9c-bc3d-3fb613805f6c%22%2C%22e%22%3A1803569680239%7D%2C%22lTnF__z_ga_audiences%22%3A%7B%22v%22%3A%22657fc0b7-5c41-4d9c-bc3d-3fb613805f6c%22%2C%22e%22%3A1801931223809%7D%2C%22lTnF_let%22%3A%7B%22v%22%3A%221772033680239%22%2C%22e%22%3A1803569680239%7D%2C%22lTnF_ga4sid%22%3A%7B%22v%22%3A%22231792002%22%2C%22e%22%3A1772035480239%7D%7D',
          'Sec-Ch-Ua': '"Chromium";v="142", "YaBrowser";v="25.12", "Not_A Brand";v="99", "Yowser";v="2.5"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });

      // API might return { comparison: [...] } or just array
      const result = Array.isArray(data) ? data : (data.comparison || data.data || []);
      
      if (result.length > 0) {
        this.logger.log('First item from Pricempire:', JSON.stringify(result[0], null, 2));
        return result;
      }
      
      throw new Error('Empty response from API');

    } catch (error: any) {
      this.logger.error(`Failed to fetch pricempire data: ${error.message}`);
      
      if (error.response) {
        this.logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }

      // Return empty array instead of mock data
      return [];
    }
  }
}
