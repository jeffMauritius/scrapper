"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const image_handler_1 = require("../utils/image-handler");
const prisma = new client_1.PrismaClient();
async function processVenueImages(venueId, imageUrls) {
    const uploadedUrls = [];
    const existingImages = await prisma.image.findMany({
        where: {
            url: {
                contains: venueId
            }
        }
    });
    if (existingImages.length > 0) {
        console.log(`⚠️ Les images pour l'établissement ${venueId} ont déjà été traitées, on passe au suivant`);
        return imageUrls;
    }
    for (const [index, url] of imageUrls.entries()) {
        try {
            const imageBuffer = await (0, image_handler_1.downloadImage)(url);
            const filename = (0, image_handler_1.generateUniqueFilename)(url, venueId, index);
            const blobUrl = await (0, image_handler_1.uploadToVercelBlob)(imageBuffer, filename);
            uploadedUrls.push(blobUrl);
            console.log(`Image ${index + 1}/${imageUrls.length} uploadée pour le lieu ${venueId}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        catch (error) {
            console.error(`Erreur lors du traitement de l'image ${url}:`, error);
        }
    }
    return uploadedUrls;
}
async function main() {
    try {
        const establishments = await prisma.establishment.findMany({
            include: {
                images: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
        const establishmentsToProcess = establishments.slice(1000, 3000);
        console.log(`\nDébut du traitement pour ${establishmentsToProcess.length} établissements (1001 à 3000)`);
        let processedCount = 0;
        for (const establishment of establishmentsToProcess) {
            console.log(`\nTraitement des images pour ${establishment.name} (${processedCount + 1}/${establishmentsToProcess.length})`);
            const imageUrls = establishment.images.map(img => img.url);
            const newUrls = await processVenueImages(establishment.id, imageUrls);
            if (newUrls.length > 0 && newUrls[0] !== imageUrls[0]) {
                await Promise.all(newUrls.map((newUrl, index) => prisma.image.update({
                    where: {
                        id: establishment.images[index].id
                    },
                    data: {
                        url: newUrl
                    }
                })));
                console.log(`✅ Images mises à jour pour ${establishment.name}`);
            }
            else {
                console.log(`ℹ️ Pas de mise à jour nécessaire pour ${establishment.name}`);
            }
            processedCount++;
            if (processedCount % 100 === 0) {
                console.log(`\n=== ${processedCount} établissements traités sur ${establishmentsToProcess.length} ===\n`);
            }
        }
        console.log('\n✅ Traitement terminé avec succès');
    }
    catch (error) {
        console.error('❌ Erreur lors du traitement des images:', error);
        throw error;
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
//# sourceMappingURL=upload-images.js.map