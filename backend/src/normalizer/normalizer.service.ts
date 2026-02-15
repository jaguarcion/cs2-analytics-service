import { Injectable, Logger } from '@nestjs/common';

export interface NormalizedItem {
  id: string;
  externalId: string;
  platformSource: string;
  name: string;
  normalizedName: string;
  wear: string | null;
  floatValue: number | null;
  assetId: string | null;
}

@Injectable()
export class NormalizerService {
  private readonly logger = new Logger(NormalizerService.name);

  normalizeName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/★\s*/g, '★ ')
      .replace(/\s*\|\s*/g, ' | ');
  }

  normalizeWear(wear: string | null): string | null {
    if (!wear) return null;
    const wearMap: Record<string, string> = {
      'fn': 'Factory New',
      'factory new': 'Factory New',
      'mw': 'Minimal Wear',
      'minimal wear': 'Minimal Wear',
      'ft': 'Field-Tested',
      'field-tested': 'Field-Tested',
      'field tested': 'Field-Tested',
      'ww': 'Well-Worn',
      'well-worn': 'Well-Worn',
      'well worn': 'Well-Worn',
      'bs': 'Battle-Scarred',
      'battle-scarred': 'Battle-Scarred',
      'battle scarred': 'Battle-Scarred',
    };
    return wearMap[wear.toLowerCase()] || wear;
  }

  normalizeItem(item: any): NormalizedItem {
    return {
      id: item.id,
      externalId: item.externalId,
      platformSource: item.platformSource,
      name: item.name,
      normalizedName: this.normalizeName(item.name),
      wear: this.normalizeWear(item.wear),
      floatValue: item.floatValue ? parseFloat(item.floatValue.toFixed(14)) : null,
      assetId: item.assetId || null,
    };
  }
}
