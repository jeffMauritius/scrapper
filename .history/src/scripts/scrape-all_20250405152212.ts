/// <reference lib="dom" />
import * as fs from 'fs';
import * as path from 'path';
import { chromium, Page } from 'playwright';
import { WeddingVenueType } from '../enums/wedding-venues.enum';

// Types
interface VenueData {
  url: string;
  name: string;
  type: WeddingVenueType;
  description: string;
  images: string[];
  price: string;
  address: string;
  city: string;
  region: string;
  capacity: string;
  rating: string;
}

// Fonction pour déterminer le type d'établissement
function determineVenueType(url: string): WeddingVenueType {
  if (url.includes('/chateau-mariage/')) return WeddingVenueType.CASTLE;
  if (url.includes('/domaine-mariage/')) return WeddingVenueType.DOMAIN;
  if (url.includes('/salle-mariage/')) return WeddingVenueType.RECEPTION_HALL;
  if (url.includes('/hotel-mariage/')) return WeddingVenueType.HOTEL;
  if (url.includes('/restaurant-mariage/')) return WeddingVenueType.RESTAURANT;
  if (url.includes('/bateau-mariage/')) return WeddingVenueType.BOAT;
  if (url.includes('/plage/')) return WeddingVenueType.BEACH;
  if (url.includes('/chapiteau-mariage/')) return WeddingVenueType.MARQUEE;
  if (url.includes('/auberge-mariage/')) return WeddingVenueType.INN;
  return WeddingVenueType.DOMAIN; // Par défaut, on considère que c'est un domaine
}

// Options de la page
const PAGE_OPTIONS = {
  waitUntil: 'networkidle' as const,
  timeout: 120000, // 2 minutes
};

// Options du contexte
const CONTEXT_OPTIONS = {
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  geolocation: { longitude: 2.3488, latitude: 48.8534 },
  locale: 'fr-FR',
  extraHTTPHeaders: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
};

async function scrapeListPage(page: Page, baseUrl: string, searchParams: string): Promise<string[]> {
  let allLinks: string[] = [];
  const currentPage = 1;
  const totalPages = 1; // DEV MODE: une seule page pour le développement

  console.log(`\nMode développement: scraping limité à ${totalPages} page(s)`);
  
  const pageUrl = `${baseUrl}${currentPage}&${searchParams}`;
  console.log(`\nNavigation vers la page ${currentPage}/${totalPages}:`, pageUrl);
  await page.goto(pageUrl, PAGE_OPTIONS);
  console.log('Attente du chargement complet...');

  // Attendre que la page soit complètement chargée
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  console.log(`Recherche des éléments dans la page ${currentPage}...`);
  
  try {
    await page.waitForSelector('.listingCard', { timeout: 60000 });
    console.log('Sélecteur trouvé, extraction des liens...');

    // Extraire les URLs de la page courante
    const pageLinks = await page.$$eval('.listingCard a.listingCard__link', (elements) => {
      return elements
        .map((e) => e.getAttribute('href'))
        .filter((href): href is string => href !== null)
        .map(href => {
          if (href.startsWith('http')) return href;
          return `https://www.mariages.net${href}`;
        });
    });

    // Ajouter les liens uniques de cette page
    const uniquePageLinks = [...new Set(pageLinks)];
    allLinks = [...allLinks, ...uniquePageLinks];
    
    // Afficher les statistiques pour cette page
    const pageStats = new Map<WeddingVenueType, number>();
    uniquePageLinks.forEach(link => {
      const type = determineVenueType(link);
      pageStats.set(type, (pageStats.get(type) || 0) + 1);
    });
    
    console.log(`Page ${currentPage}: ${uniquePageLinks.length} liens trouvés`);
    pageStats.forEach((count, type) => {
      console.log(`  - ${type}: ${count}`);
    });
    console.log(`Total actuel: ${allLinks.length} établissements`);

  } catch (error) {
    console.log(`Erreur sur la page ${currentPage}:`, error);
    // Afficher le HTML pour debug
    const html = await page.content();
    console.log('HTML de la page:', html.substring(0, 1000));
  }

  // Filtrer les doublons finaux
  const finalLinks = [...new Set(allLinks)];
  console.log(`\nTotal final: ${finalLinks.length} établissements trouvés sur ${totalPages} page(s)`);

  return finalLinks;
}

async function scrapeVenuePage(page: Page, url: string): Promise<VenueData | null> {
  try {
    console.log(`\nScraping de ${url}...`);
    await page.goto(url, PAGE_OPTIONS);

    // Fonction utilitaire pour extraire le texte avec fallback et logging
    const getTextContent = async (selector: string, fieldName: string, defaultValue: string = '') => {
      try {
        const element = await page.waitForSelector(selector, { timeout: 10000 }); // 10 secondes
        const text = element ? (await element.textContent() || defaultValue) : defaultValue;
        console.log(`${fieldName}: ${text}`);
        return text;
      } catch (error) {
        console.log(`Erreur lors de l'extraction de ${fieldName} avec le sélecteur ${selector}`);
        return defaultValue;
      }
    };

    // Fonction utilitaire pour extraire les images avec logging
    const getImages = async () => {
      try {
        // Attendre que le slider soit chargé
        await page.waitForSelector('.storefrontMultiGallery', { timeout: 10000 });
        
        // Récupérer toutes les images du slider
        const images = await page.$$eval('.storefrontMultiGallery img', (elements) => {
          return elements
            .map((img) => (img as HTMLImageElement).src)
            .filter(src => src && !src.includes('data:image')) // Filtrer les images en base64 et vides
            .filter(Boolean);
        });

        console.log(`Images trouvées dans le slider: ${images.length}`);
        return images;
      } catch (error) {
        console.log(`Erreur lors de l'extraction des images: ${error}`);
        return [];
      }
    };

    // Extraction des données avec les nouveaux sélecteurs et alternatives
    const name = await getTextContent('h1.storefrontHeading__title', 'Nom');
    const type = determineVenueType(url);
    const description = await getTextContent('#layoutMain > article > div.storefrontContent > div.storefrontSummary > section > div.storefrontDescription__content.app-storefront-description-readMore.truncate-overflow.truncate-overflow--withShadow', 'Description');
    const price = await getTextContent('.storefrontHeading__price', 'Prix');
    const address = await getTextContent('.storefrontHeading__address', 'Adresse');
    const capacity = await getTextContent('#layoutMain > article > aside.storefrontHeadingWrap > header > div.storefrontHeadingFaqs > div:nth-child(2) > span', 'Capacité');
    const rating = await getTextContent('#layoutMain > article > aside.storefrontHeadingWrap > header > div.storefrontHeading__content > div.storefrontHeadingReviews > a:nth-child(1) > span > strong', 'Note');
    const images = await getImages();

    // Extraire la ville et la région de l'adresse
    const addressParts = address.split(',').map(s => s.trim());
    const city = addressParts[0] || '';
    const region = addressParts[addressParts.length - 1] || '';

    const data = {
      url,
      name: name.trim(),
      type: type,
      description: description.trim(),
      images,
      price: price.trim(),
      address: address.trim(),
      city,
      region,
      capacity: capacity.trim(),
      rating: rating.trim(),
    };

    console.log('Données extraites avec succès:', JSON.stringify(data, null, 2));
    return data;

  } catch (error) {
    console.error(`Erreur lors du scraping de ${url}:`, error);
    return null;
  }
}

async function saveData(venues: VenueData[]) {
  const outputPath = path.join(__dirname, '../../data/venues.json');
  fs.writeFileSync(outputPath, JSON.stringify(venues, null, 2));
  console.log('Données sauvegardées dans:', outputPath);
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext(CONTEXT_OPTIONS);
  const page = await context.newPage();

  try {
    console.log('Démarrage du scraping...');
    const baseUrl = 'https://www.mariages.net/busc.php?id_grupo=1&showmode=list&NumPage=';
    const searchParams = 'userSearch=1&isNearby=0&isOrganicSearch=1&priceType=menu&categoryIds[]=1&categoryIds[]=2&categoryIds[]=3&categoryIds[]=4&categoryIds[]=5&categoryIds[]=29&categoryIds[]=31&categoryIds[]=63&categoryIds[]=47';
    
    // Scraper la première page pour obtenir les liens
    console.log(`Navigation vers: ${baseUrl}1&${searchParams}`);
    const links = await scrapeListPage(page, `${baseUrl}`, searchParams);
    
    // Afficher les statistiques par type
    const statsByType = new Map<WeddingVenueType, number>();
    links.forEach(link => {
      const type = determineVenueType(link);
      statsByType.set(type, (statsByType.get(type) || 0) + 1);
    });

    console.log('\n=== Statistiques par type ===');
    statsByType.forEach((count, type) => {
      console.log(`${type}: ${count} établissements`);
    });
    console.log(`\nTotal: ${links.length} établissements trouvés`);
    
    // Scraper les détails de chaque lieu
    const venues: VenueData[] = [];
    for (const link of links) {
      const venueData = await scrapeVenuePage(page, link);
      if (venueData) {
        venues.push(venueData);
      }
      await page.waitForTimeout(5000); // 5 secondes entre chaque requête
    }

    // Sauvegarder les données
    await saveData(venues);
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);