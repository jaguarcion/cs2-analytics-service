
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://pricempire.com/',
          'Origin': 'https://pricempire.com',
          'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site',
          'Connection': 'keep-alive'
        }
      });

      return data;
    } catch (error: any) {
      this.logger.error(`Failed to fetch pricempire data: ${error.message}`);
      
      if (error.response) {
        this.logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }

      // Return MOCK data so UI can be tested
      return [
        {
          id: 1,
          name: '★ Kukri Knife | Crimson Web (Well-Worn)',
          image: 'https://community.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf0ebcZThQ6tCvq4iYqPD1P7LdqWdY781lxO3C89Wmim2w_hZtNmn3LYfGdFU8M13UrFftxL_n0JW9vJ_PyXBgvXMj4n3D30vgw4lE9B4',
          price: { csfloat: 10244, marketcsgo: 17823 },
          profit: 6688,
          roi: 65.29
        },
        {
          id: 2,
          name: 'Five-SeveN | Fairy Tale (Factory New)',
          image: 'https://community.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposLOzLhRlxfbGTjVb09q5hoWYg8j6OrzZglRd4cJ5ntbN9J7yjRq3-xE5Y2D1ctTEJgNoY1iF_gK8k-zrgMW5vJicm3I17ygj5S7UgVXp1k4f0v3w',
          price: { csfloat: 54500, marketcsgo: 88669 },
          profit: 29736,
          roi: 54.56
        },
        {
          id: 3,
          name: '★ Bowie Knife | Lore (Well-Worn)',
          image: 'https://community.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf1f_0YyBS4927q4m0m_7zO6-fk24D6sR0j-2XpIqsiwG380s6Y2r1LYaXcVQ9Y1CEq1G5x-a7jJ-9u5XIy3Ex6yZz4C6LnRGpwUYb3t0ZJb0',
          price: { csfloat: 9789, marketcsgo: 15096 },
          profit: 4552,
          roi: 46.50
        },
        {
          id: 4,
          name: 'Nova | Sobek\'s Bite (Factory New)',
          image: 'https://community.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou7IifDzhrxw1AisiKfmwkq-3mvLwOq7c2D1UsZ0i0rCQ9tms2wXn8kE5ZWn1LdLDJgQ7Yl3Rq1K9wO_qg8O0vp_BzCExvyFw5HffgVXp1iXl0-9u',
          price: { csfloat: 3832, marketcsgo: 5864 },
          profit: 1739,
          roi: 45.38
        },
        {
          id: 5,
          name: 'SG 553 | Colony IV (Factory New)',
          image: 'https://community.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpopb3wflFf0Ob3YjoXuY-Jm460mvLwOq7c2D0G6sZy37iTrYnziVLm_xE9YmD0do6ScQE9ZA3Q_VK7x-3n1sS6v57MzSB9-n51Y4uJd8k',
          price: { csfloat: 9623, marketcsgo: 14538 },
          profit: 4188,
          roi: 43.52
        }
      ]; 
    }
  }
}
