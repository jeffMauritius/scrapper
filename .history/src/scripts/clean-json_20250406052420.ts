import * as fs from 'fs';
import * as path from 'path';
import { VenueData } from '../types/venue';

interface VenuesData {
  venues: VenueData[];
}

async function main() {
  try {
    // Créer le dossier data s'il n'existe pas
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('Dossier data créé');
    }

    // Lire le fichier venues.json ou créer un fichier vide
    const filePath = path.join(process.cwd(), 'data/venue.json');
    let venuesData: VenuesData = { venues: [] };

    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      venuesData = {
        venues: Array.isArray(data.venues) ? data.venues : 
                Array.isArray(data) ? data : []
      };
    } else {
      fs.writeFileSync(filePath, JSON.stringify(venuesData, null, 2));
      console.log('Fichier venues.json créé');
    }

    console.log(`\nNombre total d'établissements avant nettoyage: ${venuesData.venues.length}`);

    // Map pour stocker les établissements uniques
    const uniqueVenues = new Map<string, VenueData>();

    // Parcourir tous les établissements
    venuesData.venues.forEach((venue) => {
      const key = `${venue.name.toLowerCase().trim()}_${venue.city.toLowerCase().trim()}`;
      
      if (uniqueVenues.has(key)) {
        console.log(`⚠️ Doublon trouvé: ${venue.name} à ${venue.city}`);
      } else {
        uniqueVenues.set(key, venue);
      }
    });

    // Créer le nouvel objet avec les établissements uniques
    const cleanedData: VenuesData = {
      venues: Array.from(uniqueVenues.values())
    };

    // Sauvegarder les données nettoyées
    fs.writeFileSync(filePath, JSON.stringify(cleanedData, null, 2));

    console.log(`\nNombre d'établissements après nettoyage: ${cleanedData.venues.length}`);
    console.log(`Nombre de doublons supprimés: ${venuesData.venues.length - cleanedData.venues.length}`);
    console.log('\nFichier venues.json nettoyé avec succès !');

  } catch (error) {
    console.error('Erreur:', error);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 