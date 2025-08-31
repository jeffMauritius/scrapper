import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Supprimer d'abord toutes les images
    const deleteImagesResult = await prisma.image.deleteMany();
    console.log(`✅ ${deleteImagesResult.count} images supprimées avec succès`);

    // Puis supprimer tous les établissements
    const deleteVenuesResult = await prisma.establishment.deleteMany();
    console.log(`✅ ${deleteVenuesResult.count} établissements supprimés avec succès`);
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });