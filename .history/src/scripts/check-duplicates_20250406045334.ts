import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Récupérer tous les établissements avec leurs images
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

    // Créer un Map pour stocker les doublons
    const nameMap = new Map<string, Array<{ id: string; name: string; city: string; region: string; images: { id: string }[] }>>();

    // Regrouper les établissements par nom
    establishments.forEach((establishment) => {
      const name = establishment.name.toLowerCase().trim();
      if (!nameMap.has(name)) {
        nameMap.set(name, []);
      }
      nameMap.get(name)?.push(establishment);
    });

    // Filtrer pour ne garder que les noms avec des doublons
    const duplicates = Array.from(nameMap.entries())
      .filter(([_, establishments]) => establishments.length > 1);

    if (duplicates.length === 0) {
      console.log('\nAucun doublon trouvé ! 🎉');
    } else {
      console.log(`\nNombre d'établissements avec des doublons: ${duplicates.length}`);
      console.log('\nListe des doublons:');
      duplicates.forEach(([name, establishments]) => {
        console.log(`\nNom: ${name}`);
        console.log('Établissements:');
        establishments.forEach(e => {
          console.log(`- ${e.name} (ID: ${e.id}) à ${e.city}, ${e.region} (${e.images.length} images)`);
        });
      });

      // Supprimer les doublons si demandé
      const shouldDelete = process.argv.includes('--delete');
      if (shouldDelete) {
        console.log('\nSuppression des doublons...');
        for (const [name, establishments] of duplicates) {
          // Garder le premier établissement et supprimer les autres
          const [keep, ...duplicatesToDelete] = establishments;
          
          for (const duplicate of duplicatesToDelete) {
            try {
              // D'abord supprimer les images
              if (duplicate.images.length > 0) {
                await prisma.image.deleteMany({
                  where: {
                    establishmentId: duplicate.id
                  }
                });
                console.log(`✓ Supprimé ${duplicate.images.length} images pour ${duplicate.name}`);
              }
              
              // Puis supprimer l'établissement
              await prisma.establishment.delete({
                where: {
                  id: duplicate.id
                }
              });
              console.log(`✓ Supprimé l'établissement ${duplicate.name} (${duplicate.city}, ${duplicate.region})`);
            } catch (error) {
              console.error(`Erreur lors de la suppression de ${duplicate.name}:`, error);
            }
          }
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