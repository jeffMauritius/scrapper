import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

interface VenueData {
  type: string;
  name: string;
  description: string;
  price: {
    startingPrice: number;
    currency: string;
  };
  address: {
    city: string;
    region: string;
    country: string;
  };
  capacity: {
    min?: number;
    max?: number;
  };
  rating: {
    score: number;
    numberOfReviews: number;
  };
  images: string[];
}

async function scrapeVenuePage(url: string): Promise<VenueData | null> {
  try {
    console.log(`Tentative de scraping de l'URL: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    console.log('Réponse reçue de la page venue');

    const $ = cheerio.load(response.data);
    console.log('Page chargée dans Cheerio');
    
    // Extraire les informations de base
    const name = $('.app-head-lead h1').text().trim();
    console.log('Nom trouvé:', name);
    
    const type = $('.venueInfo-tags-item').first().text().trim();
    console.log('Type trouvé:', type);
    
    const description = $('.vendorDescription').text().trim() || $('.about-text').text().trim();
    console.log('Description trouvée:', description ? 'Oui' : 'Non');
    
    // Extraire les images
    const images = $('.gallery-slider img, .slider-items img').map((_, el) => $(el).attr('data-src') || $(el).attr('src')).get();
    console.log(`Nombre d'images trouvées: ${images.length}`);
    
    // Extraire le prix
    const priceText = $('.app-price-lead').text().trim();
    console.log('Texte du prix trouvé:', priceText);
    const priceMatch = priceText.match(/(\d+)/);
    const startingPrice = priceMatch ? parseInt(priceMatch[1]) : 0;
    console.log('Prix de départ:', startingPrice);
    
    // Extraire l'adresse
    const address = {
      city: $('.venue-address').text().trim(),
      region: $('.venue-region').text().trim() || 'Non spécifié',
      country: 'France'
    };
    console.log('Adresse trouvée:', address);
    
    // Extraire la capacité
    const capacityText = $('.capacity-block').text().trim();
    console.log('Texte de capacité trouvé:', capacityText);
    const capacityMatch = capacityText.match(/(\d+)\s*-\s*(\d+)/);
    const capacity = {
      min: capacityMatch ? parseInt(capacityMatch[1]) : undefined,
      max: capacityMatch ? parseInt(capacityMatch[2]) : 100
    };
    console.log('Capacité calculée:', capacity);
    
    // Extraire la note et le nombre d'avis
    const rating = {
      score: parseFloat($('.rating-number').text().trim()) || 0,
      numberOfReviews: parseInt($('.rating-count').text().trim()) || 0
    };
    console.log('Note trouvée:', rating);

    const venueData = {
      type,
      name,
      description,
      price: {
        startingPrice,
        currency: 'EUR'
      },
      address,
      capacity,
      rating,
      images
    };

    console.log('Données du lieu extraites avec succès:', JSON.stringify(venueData, null, 2));
    return venueData;
  } catch (error) {
    console.error(`Erreur détaillée lors du scraping de ${url}:`, error);
    return null;
  }
}

async function scrapeListPage(pageNumber: number): Promise<string[]> {
  const url = `https://www.mariages.net/reception/france?page=${pageNumber}`;
  console.log(`Tentative de scraping de la page liste: ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    console.log('Réponse reçue de la page liste');

    const $ = cheerio.load(response.data);
    console.log('Page liste chargée dans Cheerio');
    
    // Récupérer tous les liens vers les pages de détail des lieux
    const venueLinks = $('.app-directory-list-venue-link')
      .map((_, el) => $(el).attr('href'))
      .get()
      .filter(link => link && link.startsWith('http'));

    console.log(`Nombre de liens trouvés sur la page ${pageNumber}: ${venueLinks.length}`);
    console.log('Premiers liens trouvés:', venueLinks.slice(0, 3));

    return venueLinks;
  } catch (error) {
    console.error(`Erreur détaillée lors du scraping de la page ${pageNumber}:`, error);
    return [];
  }
}

async function saveVenueToDatabase(venueData: VenueData) {
  try {
    console.log('Tentative de sauvegarde en base de données pour:', venueData.name);
    
    const establishment = await prisma.establishment.create({
      data: {
        type: venueData.type,
        name: venueData.name,
        description: venueData.description,
        startingPrice: venueData.price.startingPrice,
        currency: venueData.price.currency,
        city: venueData.address.city,
        region: venueData.address.region,
        country: venueData.address.country,
        minCapacity: venueData.capacity.min || null,
        maxCapacity: venueData.capacity.max || 100,
        rating: venueData.rating.score,
        reviewCount: venueData.rating.numberOfReviews,
        featureIds: [],
        amenityIds: [],
        images: {
          create: venueData.images.map((url, index) => ({
            url,
            order: index
          }))
        }
      }
    });

    console.log(`Établissement sauvegardé avec succès: ${establishment.name}`);
    return establishment;
  } catch (error) {
    console.error(`Erreur détaillée lors de la sauvegarde en base de données:`, error);
    return null;
  }
}

async function main() {
  try {
    console.log('Démarrage du script de scraping...');
    
    // Nettoyer la base de données
    console.log('Nettoyage de la base de données...');
    await prisma.image.deleteMany({});
    await prisma.establishment.deleteMany({});
    console.log('Base de données nettoyée avec succès');

    let pageNumber = 1;
    let hasMorePages = true;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    while (hasMorePages && pageNumber <= 3) { // Limite à 3 pages pour les tests
      console.log(`\n=== Traitement de la page ${pageNumber} ===`);
      
      // Récupérer les liens de la page courante
      const venueLinks = await scrapeListPage(pageNumber);
      
      if (venueLinks.length === 0) {
        console.log(`Aucun lien trouvé sur la page ${pageNumber}, arrêt du scraping`);
        hasMorePages = false;
        continue;
      }

      // Traiter chaque lieu
      for (const [index, link] of venueLinks.entries()) {
        console.log(`\n--- Traitement du lieu ${index + 1}/${venueLinks.length} de la page ${pageNumber} ---`);
        
        const venueData = await scrapeVenuePage(link);
        if (venueData) {
          await saveVenueToDatabase(venueData);
        } else {
          console.log(`Échec du scraping pour le lien: ${link}`);
        }
        
        // Attendre entre chaque requête pour éviter d'être bloqué
        console.log('Pause de 2 secondes avant le prochain lieu...');
        await delay(2000);
      }

      pageNumber++;
      
      // Attendre entre chaque page
      console.log('Pause de 5 secondes avant la prochaine page...');
      await delay(5000);
    }

    console.log('\nScraping terminé avec succès');
  } catch (error) {
    console.error('Erreur principale:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Déconnexion de la base de données');
  }
}

main()
  .catch((error) => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });