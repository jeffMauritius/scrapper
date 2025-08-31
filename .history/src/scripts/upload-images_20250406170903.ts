import { PrismaClient } from '@prisma/client';
import { downloadImage, uploadToVercelBlob, generateUniqueFilename } from '../utils/image-handler';

const prisma = new PrismaClient();

async function processVenueImages(venueId: string, imageUrls: string[]): Promise<string[]> {
  const uploadedUrls: string[] = [];

  // Vérifier si l'ID est déjà utilisé dans les URLs
  const existingImages = await prisma.image.findMany({
    where: {
      url: {
        contains: venueId
      }
    }
  });

  if (existingImages.length > 0) {
    console.log(`⚠️ Les images pour l'établissement ${venueId} ont déjà été traitées, on passe au suivant`);
    return imageUrls; // Retourner les URLs originales
  }

  for (const [index, url] of imageUrls.entries()) {
    try {
      // Télécharger l'image
      const imageBuffer = await downloadImage(url);
      
      // Générer un nom de fichier unique
      const filename = generateUniqueFilename(url, venueId, index);
      
      // Upload vers Vercel Blob
      const blobUrl = await uploadToVercelBlob(imageBuffer, filename);
      
      uploadedUrls.push(blobUrl);
      console.log(`Image ${index + 1}/${imageUrls.length} uploadée pour le lieu ${venueId}`);
      
      // Attendre un peu entre chaque upload pour éviter les limitations d'API
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Erreur lors du traitement de l'image ${url}:`, error);
      // Continuer avec les autres images en cas d'erreur
    }
  }

  return uploadedUrls;
}

async function main() {
  try {
    // Récupérer tous les établissements avec leurs images, en les triant par ID
    const establishments = await prisma.establishment.findMany({
      include: {
        images: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Sélectionner les établissements 1001 à 3000
    const establishmentsToProcess = establishments.slice(1000, 3000);
    console.log(`\nDébut du traitement pour ${establishmentsToProcess.length} établissements (1001 à 3000)`);

    let processedCount = 0;
    for (const establishment of establishmentsToProcess) {
      console.log(`\nTraitement des images pour ${establishment.name} (${processedCount + 1}/${establishmentsToProcess.length})`);
      
      // Récupérer les URLs originales des images
      const imageUrls = establishment.images.map(img => img.url);
      
      // Traiter les images et obtenir les nouvelles URLs
      const newUrls = await processVenueImages(establishment.id, imageUrls);
      
      // Mettre à jour les URLs des images dans la base de données seulement si de nouvelles URLs ont été générées
      if (newUrls.length > 0 && newUrls[0] !== imageUrls[0]) {
        await Promise.all(newUrls.map((newUrl, index) => 
          prisma.image.update({
            where: {
              id: establishment.images[index].id
            },
            data: {
              url: newUrl
            }
          })
        ));
        console.log(`✅ Images mises à jour pour ${establishment.name}`);
      } else {
        console.log(`ℹ️ Pas de mise à jour nécessaire pour ${establishment.name}`);
      }

      processedCount++;
      if (processedCount % 100 === 0) {
        console.log(`\n=== ${processedCount} établissements traités sur ${establishmentsToProcess.length} ===\n`);
      }
    }

    console.log('\n✅ Traitement terminé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors du traitement des images:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });