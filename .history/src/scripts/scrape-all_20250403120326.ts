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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://www.mariages.net',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 30000
    });
    console.log('Réponse reçue de la page venue');

    const $ = cheerio.load(response.data);
    console.log('Page chargée dans Cheerio');
    
    // Extraire les informations de base avec les nouveaux sélecteurs
    const name = $('.vendorTitle h1, .storefront-header-title').text().trim();
    console.log('Nom trouvé:', name);
    
    const type = $('.venueInfo-tags-item, .storefront-header-tag').first().text().trim();
    console.log('Type trouvé:', type);
    
    const description = $('.vendorDescription, .storefront-description').text().trim();
    console.log('Description trouvée:', description ? 'Oui' : 'Non');
    
    // Extraire les images avec les nouveaux sélecteurs
    const images = $('.gallery-slider img, .storefront-gallery img, .vendor-gallery img')
      .map((_, el) => $(el).attr('data-src') || $(el).attr('src'))
      .get()
      .filter(url => url && !url.includes('blank.gif'));
    console.log(`Nombre d'images trouvées: ${images.length}`);
    
    // Extraire le prix avec les nouveaux sélecteurs
    const priceText = $('.app-price-lead, .storefront-price').text().trim();
    console.log('Texte du prix trouvé:', priceText);
    const priceMatch = priceText.match(/(\d+)/);
    const startingPrice = priceMatch ? parseInt(priceMatch[1]) : 0;
    console.log('Prix de départ:', startingPrice);
    
    // Extraire l'adresse avec les nouveaux sélecteurs
    const address = {
      city: $('.venue-address, .storefront-address-city').text().trim(),
      region: $('.venue-region, .storefront-address-region').text().trim() || 'Non spécifié',
      country: 'France'
    };
    console.log('Adresse trouvée:', address);
    
    // Extraire la capacité avec les nouveaux sélecteurs
    const capacityText = $('.capacity-block, .storefront-capacity').text().trim();
    console.log('Texte de capacité trouvé:', capacityText);
    const capacityMatch = capacityText.match(/(\d+)\s*-\s*(\d+)|jusqu'à\s*(\d+)/i);
    const capacity = {
      min: capacityMatch ? parseInt(capacityMatch[1] || '0') : undefined,
      max: capacityMatch ? parseInt(capacityMatch[2] || capacityMatch[3] || '100') : 100
    };
    console.log('Capacité calculée:', capacity);
    
    // Extraire la note et le nombre d'avis avec les nouveaux sélecteurs
    const rating = {
      score: parseFloat($('.rating-number, .storefront-rating-score').text().trim()) || 0,
      numberOfReviews: parseInt($('.rating-count, .storefront-rating-count').text().trim()) || 0
    };
    console.log('Note trouvée:', rating);

    if (!name) {
      console.log('Aucun nom trouvé, contenu de la page:', response.data.slice(0, 500));
      return null;
    }

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
    
    // Attendre un peu avant de retourner les résultats
    await new Promise(resolve => setTimeout(resolve, 2000));
    return venueData;
  } catch (error) {
    console.error(`Erreur détaillée lors du scraping de ${url}:`, error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
    return null;
  }
}

async function scrapeListPage(pageNumber: number): Promise<string[]> {
  const url = `https://www.mariages.net/reception/france?page=${pageNumber}`;
  console.log(`Tentative de scraping de la page liste: ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://www.mariages.net',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 30000
    });
    console.log('Réponse reçue de la page liste');

    const $ = cheerio.load(response.data);
    console.log('Page liste chargée dans Cheerio');
    
    // Nouveaux sélecteurs pour trouver les liens des lieux
    const venueLinks = $('.vendorTile__title a, .directory-item-title a')
      .map((_, el) => $(el).attr('href'))
      .get()
      .filter(link => link && (link.startsWith('http') || link.startsWith('/')));

    // Convertir les chemins relatifs en URLs absolues
    const absoluteLinks = venueLinks.map(link => 
      link.startsWith('/') ? `https://www.mariages.net${link}` : link
    );

    console.log(`Nombre de liens trouvés sur la page ${pageNumber}: ${absoluteLinks.length}`);
    if (absoluteLinks.length > 0) {
      console.log('Premiers liens trouvés:', absoluteLinks.slice(0, 3));
    } else {
      console.log('Contenu de la page:', response.data.slice(0, 500));
    }

    // Attendre un peu avant de retourner les résultats
    await new Promise(resolve => setTimeout(resolve, 2000));
    return absoluteLinks;
  } catch (error) {
    console.error(`Erreur détaillée lors du scraping de la page ${pageNumber}:`, error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
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