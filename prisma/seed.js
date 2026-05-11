// Fills the database with sample data for local use.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const passwordHash = await bcryptjs_1.default.hash('Str0ng!Pass2026', 12);
    const tenant = await prisma.tenant.upsert({
        where: { id: '00000000-0000-0000-0000-000000000001' },
        update: {},
        create: { id: '00000000-0000-0000-0000-000000000001', name: 'Demo Retail LLP' }
    });
    await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.kz' } },
        update: { emailVerifiedAt: new Date() },
        create: { tenantId: tenant.id, email: 'admin@demo.kz', passwordHash, role: 'TENANT_ADMIN', emailVerifiedAt: new Date() }
    });
    console.log('Seeded verified admin@demo.kz / Str0ng!Pass2026');
}
main().finally(() => prisma.$disconnect());
