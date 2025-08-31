"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    try {
        const establishments = await prisma.establishment.findMany({
            select: {
                id: true,
                name: true,
                city: true,
                region: true,
                images: {
                    select: {
                        id: true
                    }
                }
            }
        });
        console.log(`\nNombre total d'établissements: ${establishments.length}`);
        const nameMap = new Map();
        establishments.forEach((establishment) => {
            var _a;
            const name = establishment.name.toLowerCase().trim();
            if (!nameMap.has(name)) {
                nameMap.set(name, []);
            }
            (_a = nameMap.get(name)) === null || _a === void 0 ? void 0 : _a.push(establishment);
        });
        const duplicates = Array.from(nameMap.entries())
            .filter(([_, establishments]) => establishments.length > 1);
        if (duplicates.length === 0) {
            console.log('\nAucun doublon trouvé ! 🎉');
        }
        else {
            console.log(`\nNombre d'établissements avec des doublons: ${duplicates.length}`);
            console.log('\nListe des doublons:');
            duplicates.forEach(([name, establishments]) => {
                console.log(`\nNom: ${name}`);
                console.log('Établissements:');
                establishments.forEach(e => {
                    console.log(`- ${e.name} (ID: ${e.id}) à ${e.city}, ${e.region} (${e.images.length} images)`);
                });
            });
            const shouldDelete = process.argv.includes('--delete');
            if (shouldDelete) {
                console.log('\nSuppression des doublons...');
                for (const [name, establishments] of duplicates) {
                    const [keep, ...duplicatesToDelete] = establishments;
                    for (const duplicate of duplicatesToDelete) {
                        try {
                            if (duplicate.images.length > 0) {
                                await prisma.image.deleteMany({
                                    where: {
                                        establishmentId: duplicate.id
                                    }
                                });
                                console.log(`✓ Supprimé ${duplicate.images.length} images pour ${duplicate.name}`);
                            }
                            await prisma.establishment.delete({
                                where: {
                                    id: duplicate.id
                                }
                            });
                            console.log(`✓ Supprimé l'établissement ${duplicate.name} (${duplicate.city}, ${duplicate.region})`);
                        }
                        catch (error) {
                            console.error(`Erreur lors de la suppression de ${duplicate.name}:`, error);
                        }
                    }
                }
                console.log('\nSuppression des doublons terminée !');
            }
        }
    }
    catch (error) {
        console.error('Erreur:', error);
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
//# sourceMappingURL=check-duplicates.js.map