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

    // Track already notified trades to avoid duplicate notifications
    private readonly notifiedTradeIds = new Set<string>();

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
     * Check if a sold item has active SELL listings on other platforms and notify via Telegram.
     * Called after a SELL trade transitions to COMPLETED or TRADE_HOLD.
     */
    async checkAndNotify(soldItem: SoldItem, soldTradeId: string): Promise<void> {
        if (!this.enabled) return;

        // Avoid duplicate notifications for the same trade
        if (this.notifiedTradeIds.has(soldTradeId)) return;

        try {
            const soldPlatform = soldItem.platform;
            const otherPlatform = soldPlatform === 'CSFLOAT' ? 'MARKET_CSGO' : 'CSFLOAT';

            // Find SELL trades on the other platform that are still pending (not yet sold)
            // These are items still listed for sale that need to be removed
            const crossTrades = await this.prisma.trade.findMany({
                where: {
                    platformSource: otherPlatform,
                    type: 'SELL',
                    status: { notIn: ['COMPLETED', 'TRADE_HOLD'] },
                    item: {
                        name: soldItem.itemName,
                    },
                },
                include: {
                    item: { select: { name: true } },
                },
            });

            if (crossTrades.length === 0) {
                this.logger.log(`No cross-listings found for "${soldItem.itemName}" on ${otherPlatform}`);
                return;
            }

            // Build notification message
            const platformLabels: Record<string, string> = {
                CSFLOAT: 'CSFloat',
                MARKET_CSGO: 'Market.CSGO',
            };

            const soldOn = platformLabels[soldPlatform] || soldPlatform;
            const removeFrom = platformLabels[otherPlatform] || otherPlatform;

            const priceStr = soldItem.currency === 'RUB'
                ? `${Math.round(soldItem.price).toLocaleString('ru-RU')} ₽`
                : `$${soldItem.price.toFixed(2)}`;

            const crossPrices = crossTrades.map((t) => {
                const p = t.sellPrice || 0;
                if (otherPlatform === 'MARKET_CSGO') {
                    return `${Math.round(p).toLocaleString('ru-RU')} ₽`;
                }
                return `$${p.toFixed(2)}`;
            });

            const message = [
                `🔴 *Продано:* ${this.escapeMarkdown(soldItem.itemName)}`,
                `📦 *Площадка:* ${soldOn}`,
                `💰 *Цена:* ${priceStr}`,
                ``,
                `⚠️ *Снимите с:* ${removeFrom}`,
                `📋 *Листинг:* ${crossPrices.join(', ')} (${crossTrades.length} шт.)`,
            ].join('\n');

            await this.sendTelegram(message);
            this.notifiedTradeIds.add(soldTradeId);

            this.logger.log(`Cross-listing alert sent: ${soldItem.itemName} sold on ${soldOn}, active on ${removeFrom}`);
        } catch (error) {
            this.logger.error(`Failed to check/notify cross-listing: ${error.message}`);
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
