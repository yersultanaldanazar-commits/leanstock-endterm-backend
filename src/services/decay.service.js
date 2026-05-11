// Handles dead stock value decay calculations.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDeadStockDecay = runDeadStockDecay;
const client_1 = require("@prisma/client");
const prisma_1 = require("../config/prisma");
const audit_1 = require("../utils/audit");
const DECAY_THRESHOLD_DAYS = 30;
const DECAY_INTERVAL_HOURS = 72;
const DECAY_STEP = 10;
const MAX_DISCOUNT = 90;
async function runDeadStockDecay() {
    const now = new Date();
    const items = await prisma_1.prisma.inventory.findMany({
        where: {
            isSold: false,
            isArchived: false,
            quantity: { gt: 0 },
            receivedAt: { lt: new Date(now.getTime() - DECAY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000) },
            discountPct: { lt: MAX_DISCOUNT },
            reservations: { none: { status: 'ACTIVE', expiresAt: { gt: now } } },
            OR: [
                { lastDecayAt: null },
                { lastDecayAt: { lt: new Date(now.getTime() - DECAY_INTERVAL_HOURS * 60 * 60 * 1000) } }
            ]
        }
    });
    let updated = 0;
    for (const item of items) {
        const daysInInventory = Math.floor((now.getTime() - item.receivedAt.getTime()) / (24 * 60 * 60 * 1000));
        await prisma_1.prisma.$transaction(async (tx) => {
            const changed = await tx.inventory.update({
                where: { id: item.id },
                data: {
                    daysInInventory,
                    discountPct: Math.min(MAX_DISCOUNT, item.discountPct + DECAY_STEP),
                    lastDecayAt: now,
                    decayCycles: { increment: 1 }
                }
            });
            await (0, audit_1.appendAuditLog)(tx, {
                tenantId: item.tenantId,
                actorId: null,
                entityType: 'inventory',
                entityId: item.id,
                action: client_1.AuditAction.DECAY_APPLIED,
                payload: { before: { discountPct: item.discountPct }, after: { discountPct: changed.discountPct }, daysInInventory },
                ipAddress: null
            });
        });
        updated += 1;
    }
    return { scanned: items.length, updated };
}
