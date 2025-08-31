import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { VenueData } from '../types/venue';

const prisma = new PrismaClient();

async function main() {
  try {
    // Lire le fichier venues.json
    const rawData = fs.readFileSync(
      path.join(process.cwd(), 'data/venues.json'),
      'utf-8'
    );
    const data = JSON.parse(rawData);
    const venues = Array.isArray(data.venues) ? data.venues : data;

    // Prendre seulement les 1000 premiers établissements
    const venuesToImport = venues.slice(0, 1000);
    console.log(`\nImport des 1000 premiers établissements sur ${venues.length} disponibles...`);

    let importedCount = 0;
    for (const venue of venuesToImport) {
      try {
        // Créer l'établissement
        const establishment = await prisma.establishment.create({
          data: {
            name: venue.name,
            type: venue.type,
            description: venue.description || '',
            price: venue.price || '',
            address: venue.address || '',
            city: venue.city || '',
            region: venue.region || '',
            capacity: venue.capacity || '',
            rating: venue.rating || '',
            url: venue.url,
            // Créer les images associées
            images: {
              create: venue.images.map((url: string) => ({
                url,
              })),
            },
          },
        });
        
        importedCount++;
        if (importedCount % 100 === 0) {
          console.log(`✅ ${importedCount} établissements importés sur ${venuesToImport.length}`);
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