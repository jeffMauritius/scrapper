import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { VenueData } from '../types/venue';

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
    // Lire le fichier venues.json
    const rawData = fs.readFileSync(
      path.join(process.cwd(), 'data/venues.json'),
      'utf-8'
    );
    const data = JSON.parse(rawData);
    const venues = Array.isArray(data.venues) ? data.venues : data;

    // Prendre les établissements 1001 à 2000
    const venuesToImport = venues.slice(1000, 2000);
    console.log(`\nImport des établissements 1001 à 2000 sur ${venues.length} disponibles...`);

    let importedCount = 0;
    for (const venue of venuesToImport) {
      try {
        // Extraire le prix de départ
        const startingPrice = extractPrice(venue.price);
        
        // Extraire la capacité maximale
        const maxCapacity = venue.capacity ? parseInt(venue.capacity.match(/\d+/)?.[0] || '0') : null;
        
        // Extraire le rating et le nombre d'avis
        const ratingMatch = venue.rating.match(/^([\d.]+)/);
        const reviewsMatch = venue.rating.match(/\((\d+)\)/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
        const reviewCount = reviewsMatch ? parseInt(reviewsMatch[1]) : 0;

        // Créer l'établissement
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
              create: venue.images.map((url: string) => ({
                url,
              })),
            },
          },
        });
        
        importedCount++;
        if (importedCount % 100 === 0) {
          console.log(`✅ ${importedCount} établissements importés sur 1000`);
        }
      } catch (error) {
        console.error(`❌ Erreur lors de l'import de ${venue.name}:`, error);
      }
    }

    console.log(`\n✅ Import terminé: ${importedCount} établissements importés avec succès`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });