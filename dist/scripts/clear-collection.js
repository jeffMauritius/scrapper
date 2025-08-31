"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    try {
        const deleteImagesResult = await prisma.image.deleteMany();
        console.log(`✅ ${deleteImagesResult.count} images supprimées avec succès`);
        const deleteVenuesResult = await prisma.establishment.deleteMany();
        console.log(`✅ ${deleteVenuesResult.count} établissements supprimés avec succès`);
    }
    catch (error) {
        console.error('❌ Erreur lors de la suppression:', error);
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
//# sourceMappingURL=clear-collection.js.map