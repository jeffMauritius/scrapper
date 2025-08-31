import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { VenueData } from '../types/venue';

interface VenuesData {
  venues: VenueData[];
}

const prisma = new PrismaClient();

// Fonction pour extraire le prix numérique
function extractPrice(priceString: string): number | null {
  if (!priceString) return null;
  
  // Extraire les nombres de la chaîne
  const matches = priceString.match(/\d+([.,]\d+)?/);
  if (!matches) return null;

  // Convertir la chaîne en nombre
  const price = parseFloat(matches[0].replace(',', '.'));
  return isNaN(price) ? null : price;
}

async function main() {
  try {
    // Nettoyer la base de données
    await prisma.image.deleteMany({});
    await prisma.establishment.deleteMany({});
    await prisma.feature.deleteMany({});
    await prisma.amenity.deleteMany({});

    console.log('Base de données nettoyée');

    // Lire le fichier JSON
    const rawData = fs.readFileSync(
      path.join(process.cwd(), 'data/venues.json'),
      'utf-8'
    );
    const parsedData = JSON.parse(rawData);
    const data: VenuesData = {
      venues: Array.isArray(parsedData.venues) ? parsedData.venues : 
              Array.isArray(parsedData) ? parsedData : []
    };

    console.log(`Traitement de ${data.venues.length} établissements...`);

    // Pour chaque établissement dans le JSON
    for (const venue of data.venues) {
      // Extraire le prix de départ
      const startingPrice = extractPrice(venue.price) || 0;
      
      // Extraire la capacité maximale
      const maxCapacity = venue.capacity ? parseInt(venue.capacity.match(/\d+/)?.[0] || '0') : null;
      
      // Extraire le rating et le nombre d'avis
      const ratingMatch = venue.rating.match(/^([\d.]+)/);
      const reviewsMatch = venue.rating.match(/\((\d+)\)/);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
      const reviewCount = reviewsMatch ? parseInt(reviewsMatch[1]) : 0;

      try {
        // Créer l'établissement avec ses images
        const establishment = await prisma.establishment.create({
          data: {
            type: venue.type,
            name: venue.name,
            description: venue.description,
            startingPrice,
            city: venue.city,
            region: venue.region,
            minCapacity: null,
            maxCapacity,
            rating,
            images: {
              create: venue.images.map((url: string, index: number) => ({
                url,
                order: index
              }))
            }
          },
          include: {
            images: true
          }
        });

        console.log(`Créé établissement: ${establishment.name} avec ${establishment.images.length} images`);
      } catch (error) {
        console.error(`Erreur lors de la création de l'établissement ${venue.name}:`, error);
      }
    }

    console.log('Import des données terminé avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'import des données:', error);
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