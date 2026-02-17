import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface SoldItem {
    itemName: string;
    platform: string;
    price: number;
    currency: string;
    imageUrl?: string | null;
}

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);
    private readonly botToken: string;
    private readonly chatId: string;
    private readonly enabled: boolean;

    constructor(
        private readonly config: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        this.botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN', '');
        this.chatId = this.config.get<string>('TELEGRAM_CHAT_ID', '');
        this.enabled = !!this.botToken && !!this.chatId;

        if (!this.enabled) {
            this.logger.warn('Telegram notifications disabled — TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
        } else {
            this.logger.log('Telegram notifications enabled');
        }
    }

    /**
     * Notify about a sold item. Always sends a notification for new sales.
     * Optionally adds cross-platform warning if the item is still listed elsewhere.
     * Uses DB `notifiedAt` field for dedup (survives container restarts).
     */
    async checkAndNotify(soldItem: SoldItem, soldTradeId: string): Promise<void> {
        if (!this.enabled) return;

        try {
            // DB-based dedup: check if this trade was already notified
            const trade = await this.prisma.trade.findFirst({
                where: {
                    externalId: soldTradeId,
                    platformSource: soldItem.platform as any,
                },
                select: {
                    id: true,
                    // @ts-ignore: Field exists in DB
                    notifiedAt: true
                },
            });

            // @ts-ignore: Field exists in DB
            if (trade?.notifiedAt) return; // Already notified

            const soldPlatform = soldItem.platform;
            const otherPlatform = soldPlatform === 'CSFLOAT' ? 'MARKET_CSGO' : 'CSFLOAT';

            const platformLabels: Record<string, string> = {
                CSFLOAT: 'CSFloat',
                MARKET_CSGO: 'Market.CSGO',
            };

            const soldOn = platformLabels[soldPlatform] || soldPlatform;
            const removeFrom = platformLabels[otherPlatform] || otherPlatform;

            const priceStr = soldItem.currency === 'RUB'
                ? `${Math.round(soldItem.price).toLocaleString('ru-RU')} ₽`
                : `$${soldItem.price.toFixed(2)}`;

            // Normalize name for comparison: trim and collapse multiple spaces
            const normalizedName = soldItem.itemName.trim().replace(/\s+/g, ' ');

            // Check for cross-platform listings
            const crossTrades = await this.prisma.trade.findMany({
                where: {
                    platformSource: otherPlatform as any,
                    type: 'SELL',
                    status: { notIn: ['COMPLETED', 'TRADE_HOLD'] },
                    item: {
                        name: soldItem.itemName, // Try exact match first
                    },
                },
                include: {
                    item: { select: { name: true } },
                },
            });

            // If no exact match, try normalized match if the name was modified
            if (crossTrades.length === 0 && normalizedName !== soldItem.itemName) {
                const looseMatches = await this.prisma.trade.findMany({
                    where: {
                        platformSource: otherPlatform as any,
                        type: 'SELL',
                        status: { notIn: ['COMPLETED', 'TRADE_HOLD'] },
                        item: {
                            name: { contains: normalizedName }, // Looser check
                        },
                    },
                    include: {
                        item: { select: { name: true } },
                    },
                });
                if (looseMatches.length > 0) {
                    crossTrades.push(...looseMatches);
                    this.logger.log(`Found cross-listing via normalized name: "${normalizedName}"`);
                }
            }

            // Build message — always notify about the sale
            const lines = [
                `🔴 *Продано:* ${this.escapeMarkdown(soldItem.itemName)}`,
                `📦 *Площадка:* ${soldOn}`,
                `💰 *Цена:* ${priceStr}`,
            ];

            // Add cross-platform warning if applicable
            if (crossTrades.length > 0) {
                const crossPrices = crossTrades.map((t) => {
                    const p = t.sellPrice || 0;
                    if (otherPlatform === 'MARKET_CSGO') {
                        return `${Math.round(p).toLocaleString('ru-RU')} ₽`;
                    }
                    return `$${p.toFixed(2)}`;
                });

                lines.push('');
                lines.push(`⚠️ *Снимите с:* ${removeFrom}`);
                lines.push(`📋 *Листинг:* ${crossPrices.join(', ')} (${crossTrades.length} шт.)`);
            } else {
                this.logger.debug(`No cross-listings found for "${soldItem.itemName}" (Normalized: "${normalizedName}") on ${otherPlatform}`);
            }

            await this.sendTelegram(lines.join('\n'));

            // Mark as notified in DB
            if (trade) {
                await this.prisma.trade.update({
                    where: { id: trade.id },
                    // @ts-ignore: Field exists in DB after migration but Prisma Client needs regeneration
                    data: { notifiedAt: new Date() },
                });
            }

            this.logger.log(`Sale notification sent: ${soldItem.itemName} on ${soldOn}`);
        } catch (error) {
            this.logger.error(`Failed to check/notify sale: ${error.message}`);
        }
    }

    /**
     * Send a direct test message to verify Telegram bot connectivity.
     */
    async sendTestMessage(text: string): Promise<boolean> {
        if (!this.enabled) {
            this.logger.warn('Cannot send test message — Telegram notifications disabled');
            return false;
        }
        try {
            await this.sendTelegram(text);
            return true;
        } catch (error) {
            this.logger.error(`Test message failed: ${error.message}`);
            return false;
        }
    }

    private async sendTelegram(text: string): Promise<void> {
        const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: this.chatId,
                text,
                parse_mode: 'Markdown',
            }),
        });

        if (!response.ok) {
            const body = await response.text();
            this.logger.error(`Telegram API error: ${response.status} ${body}`);
        }
    }

    private escapeMarkdown(text: string): string {
        return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
    }
}

