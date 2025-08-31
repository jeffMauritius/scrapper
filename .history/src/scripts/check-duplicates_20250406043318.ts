import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Récupérer tous les établissements
    const establishments = await prisma.establishment.findMany({
      select: {
        id: true,
        name: true,
        url: true,
      }
    });

    console.log(`\nNombre total d'établissements: ${establishments.length}`);

    // Créer un Map pour stocker les doublons
    const urlMap = new Map<string, Array<{ id: string; name: string }>>();

    // Regrouper les établissements par URL
    establishments.forEach((establishment) => {
      if (!urlMap.has(establishment.url)) {
        urlMap.set(establishment.url, []);
      }
      urlMap.get(establishment.url)?.push({
        id: establishment.id,
        name: establishment.name
      });
    });

    // Filtrer pour ne garder que les URLs avec des doublons
    const duplicates = Array.from(urlMap.entries())
      .filter(([_, establishments]) => establishments.length > 1);

    if (duplicates.length === 0) {
      console.log('\nAucun doublon trouvé ! 🎉');
    } else {
      console.log(`\nNombre d'URLs avec des doublons: ${duplicates.length}`);
      console.log('\nListe des doublons:');
      duplicates.forEach(([url, establishments]) => {
        console.log(`\nURL: ${url}`);
        console.log('Établissements:');
        establishments.forEach(e => {
          console.log(`- ${e.name} (ID: ${e.id})`);
        });
      });

      // Supprimer les doublons si demandé
      const shouldDelete = process.argv.includes('--delete');
      if (shouldDelete) {
        console.log('\nSuppression des doublons...');
        for (const [_, establishments] of duplicates) {
          // Garder le premier établissement et supprimer les autres
          const [keep, ...duplicatesToDelete] = establishments;
          const ids = duplicatesToDelete.map(e => e.id);
          
          await prisma.establishment.deleteMany({
            where: {
              id: {
                in: ids
              }
            }
          });
          console.log(`✓ Supprimé ${duplicatesToDelete.length} doublons pour ${keep.name}`);
        }
        console.log('\nSuppression des doublons terminée !');
      }
    }
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 