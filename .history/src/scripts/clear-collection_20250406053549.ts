import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Supprimer tous les établissements
    const deleteResult = await prisma.etablissement.deleteMany();
    console.log(`✅ ${deleteResult.count} établissements supprimés avec succès`);
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