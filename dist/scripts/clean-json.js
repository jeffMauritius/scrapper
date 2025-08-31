"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function main() {
    try {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log('Dossier data créé');
        }
        const filePath = path.join(process.cwd(), 'data/venues.json');
        let venuesData = { venues: [] };
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(fileContent);
            venuesData = {
                venues: Array.isArray(data.venues) ? data.venues :
                    Array.isArray(data) ? data : []
            };
        }
        else {
            fs.writeFileSync(filePath, JSON.stringify(venuesData, null, 2));
            console.log('Fichier venues.json créé');
        }
        console.log(`\nNombre total d'établissements avant nettoyage: ${venuesData.venues.length}`);
        const uniqueVenues = new Map();
        venuesData.venues.forEach((venue) => {
            const key = `${venue.name.toLowerCase().trim()}_${venue.city.toLowerCase().trim()}`;
            if (uniqueVenues.has(key)) {
                console.log(`⚠️ Doublon trouvé: ${venue.name} à ${venue.city}`);
            }
            else {
                uniqueVenues.set(key, venue);
            }
        });
        const cleanedData = {
            venues: Array.from(uniqueVenues.values())
        };
        fs.writeFileSync(filePath, JSON.stringify(cleanedData, null, 2));
        console.log(`\nNombre d'établissements après nettoyage: ${cleanedData.venues.length}`);
        console.log(`Nombre de doublons supprimés: ${venuesData.venues.length - cleanedData.venues.length}`);
        console.log('\nFichier venues.json nettoyé avec succès !');
    }
    catch (error) {
        console.error('Erreur:', error);
    }
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=clean-json.js.map