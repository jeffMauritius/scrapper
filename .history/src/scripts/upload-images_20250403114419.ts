import { PrismaClient } from '@prisma/client';
import { downloadImage, uploadToVercelBlob, generateUniqueFilename } from '../utils/image-handler';

const prisma = new PrismaClient();

async function processVenueImages(venueId: string, imageUrls: string[]): Promise<string[]> {
  const uploadedUrls: string[] = [];

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
    // Récupérer tous les établissements avec leurs images
    const establishments = await prisma.establishment.findMany({
      include: {
        images: true
      }
    });

    console.log(`Début du traitement pour ${establishments.length} établissements`);

    for (const establishment of establishments) {
      console.log(`\nTraitement des images pour ${establishment.name}`);
      
      // Récupérer les URLs originales des images
      const imageUrls = establishment.images.map(img => img.url);
      
      // Traiter les images et obtenir les nouvelles URLs
      const newUrls = await processVenueImages(establishment.id, imageUrls);
      
      // Mettre à jour les URLs des images dans la base de données
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

      console.log(`Images mises à jour pour ${establishment.name}`);
    }

    console.log('\nTraitement terminé avec succès');
  } catch (error) {
    console.error('Erreur lors du traitement des images:', error);
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