"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    try {
        const count = await prisma.establishment.count();
        console.log(`Nombre d'établissements dans la base de données: ${count}`);
    }
    catch (error) {
        console.error('Erreur:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=count-venues.js.map