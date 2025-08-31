"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const prisma = new client_1.PrismaClient();
function extractPrice(priceString) {
    if (!priceString)
        return null;
    const matches = priceString.match(/\d+([.,]\d+)?/);
    if (!matches)
        return null;
    const price = parseFloat(matches[0].replace(',', '.'));
    return isNaN(price) ? null : price;
}
async function main() {
    var _a;
    try {
        const rawData = await fs.promises.readFile(path.join(process.cwd(), 'data/venues.json'), 'utf-8');
        const data = JSON.parse(rawData);
        const venues = Array.isArray(data.venues) ? data.venues : data;
        const venuesToImport = venues.slice(6500, 8300);
        console.log(`Import des établissements 6501 à 8301 sur ${venues.length} disponibles...`);
        let importedCount = 0;
        for (const venue of venuesToImport) {
            try {
                const startingPrice = extractPrice(venue.price);
                const maxCapacity = venue.capacity ? parseInt(((_a = venue.capacity.match(/\d+/)) === null || _a === void 0 ? void 0 : _a[0]) || '0') : null;
                const ratingMatch = venue.rating.match(/^([\d.]+)/);
                const reviewsMatch = venue.rating.match(/\((\d+)\)/);
                const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
                const reviewCount = reviewsMatch ? parseInt(reviewsMatch[1]) : 0;
                const establishment = await prisma.establishment.create({
                    data: {
                        name: venue.name,
                        type: venue.type,
                        description: venue.description || '',
                        startingPrice: startingPrice || 0,
                        currency: 'EUR',
                        city: venue.city || '',
                        region: venue.region || '',
                        country: 'France',
                        maxCapacity: maxCapacity || 0,
                        rating: rating || 0,
                        reviewCount,
                        featureIds: [],
                        amenityIds: [],
                        images: {
                            create: venue.images.map((url) => ({
                                url,
                            })),
                        },
                    },
                });
                importedCount++;
                if (importedCount % 100 === 0) {
                    console.log(`✅ ${importedCount} établissements importés sur 1000`);
                }
            }
            catch (error) {
                console.error(`❌ Erreur lors de l'import de ${venue.name}:`, error);
            }
        }
        console.log(`\n✅ Import terminé: ${importedCount} établissements importés avec succès`);
    }
    catch (error) {
        console.error('❌ Erreur lors de l\'import:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map