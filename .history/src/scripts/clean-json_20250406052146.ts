import * as fs from 'fs';
import * as path from 'path';
import { VenueData } from '../types/venue';

interface VenuesData {
  venues: VenueData[];
}

async function main() {
  try {
    // Lire le fichier venues.json
    const filePath = path.join(process.cwd(), 'data/venues.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);

    // Normaliser les données
    const venuesData: VenuesData = {
      venues: Array.isArray(data.venues) ? data.venues : 
              Array.isArray(data) ? data : []
    };

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