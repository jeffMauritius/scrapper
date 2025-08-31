import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  try {
    // Lire le fichier venues.json
    const venuesPath = path.join(process.cwd(), 'data/venues.json');
    const venuesData = JSON.parse(fs.readFileSync(venuesPath, 'utf-8'));
    const venues = Array.isArray(venuesData.venues) ? venuesData.venues : 
                  Array.isArray(venuesData) ? venuesData : [];

    console.log(`Migration des ${venues.length} établissements...`);

    // Pour chaque établissement dans le JSON
    for (const venue of venues) {
      try {
        // Mettre à jour l'établissement correspondant
        await prisma.establishment.updateMany({
          where: {
            name: venue.name,
            city: venue.city,
            region: venue.region
          },
          data: {
            url: venue.url
          }
        });
      } catch (error) {
        console.error(`Erreur lors de la mise à jour de ${venue.name}:`, error);
      }
    }

    console.log('Migration terminée !');
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 