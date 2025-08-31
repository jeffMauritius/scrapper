import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { VenueData } from '../types/venue';

interface VenuesData {
  venues: VenueData[];
}

const prisma = new PrismaClient();

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
      path.join(__dirname, '../data/wedding-venues.json'),
      'utf-8'
    );
    const data = JSON.parse(rawData) as VenuesData;

    // Pour chaque établissement dans le JSON
    for (const venue of data.venues) {
      // Créer l'établissement avec ses images
      const establishment = await prisma.establishment.create({
        data: {
          type: venue.type,
          name: venue.name,
          description: venue.description,
          startingPrice: venue.price.startingPrice,
          currency: venue.price.currency,
          city: venue.address.city,
          region: venue.address.region,
          country: venue.address.country,
          minCapacity: venue.capacity.min || null,
          maxCapacity: venue.capacity.max,
          rating: venue.rating.score,
          reviewCount: venue.rating.numberOfReviews,
          featureIds: [], // Sera mis à jour plus tard si nécessaire
          amenityIds: [], // Sera mis à jour plus tard si nécessaire
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