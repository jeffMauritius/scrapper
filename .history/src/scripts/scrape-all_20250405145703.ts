/// <reference lib="dom" />
import * as fs from 'fs';
import * as path from 'path';
import { chromium, Page } from 'playwright';

// Types
interface VenueData {
  url: string;
  name: string;
  type: string;
  description: string;
  images: string[];
  price: string;
  address: string;
  city: string;
  region: string;
  capacity: string;
  rating: string;
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

async function scrapeListPage(page: Page, baseUrl: string): Promise<string[]> {
  let allLinks: string[] = [];
  let currentPage = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const pageUrl = `${baseUrl}?page=${currentPage}`;
    console.log(`\nNavigation vers la page ${currentPage}:`, pageUrl);
    await page.goto(pageUrl, PAGE_OPTIONS);
    console.log('Attente du chargement complet...');

    // Attendre que la page soit complètement chargée
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    console.log(`Recherche des éléments dans la page ${currentPage}...`);
    
    try {
      await page.waitForSelector('a[href*="/chateau-mariage/"]', { timeout: 60000 });
      console.log('Sélecteur trouvé, extraction des liens...');
    } catch (error) {
      console.log('Erreur lors de l\'attente du sélecteur:', error);
      break;
    }
    
    // Extraire les URLs de la page courante
    const pageLinks = await page.$$eval('a[href*="/chateau-mariage/"]', (elements) => {
      return elements
        .map((e) => e.getAttribute('href'))
        .filter((href): href is string => href !== null && href.includes('/chateau-mariage/'))
        .map(href => {
          if (href.startsWith('http')) return href;
          return `https://www.mariages.net${href}`;
        });
    });

    // Ajouter les liens uniques de cette page
    const uniquePageLinks = [...new Set(pageLinks)];
    allLinks = [...allLinks, ...uniquePageLinks];
    console.log(`Page ${currentPage}: ${uniquePageLinks.length} liens trouvés`);

    // Vérifier s'il y a une page suivante
    const nextButton = await page.$('a[rel="next"]');
    hasNextPage = nextButton !== null;
    
    if (hasNextPage) {
      currentPage++;
      // Attendre entre chaque page pour éviter d'être bloqué
      await page.waitForTimeout(3000);
    }
  }

  // Filtrer les doublons finaux
  const finalLinks = [...new Set(allLinks)];
  console.log(`\nTotal final: ${finalLinks.length} châteaux trouvés sur ${currentPage} pages`);
  console.log('Premiers liens trouvés:', finalLinks.slice(0, 3));

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
    const type = "CHATEAU";
    const description = await getTextContent('#layoutMain > article > div.storefrontContent > div.storefrontSummary > section > div.storefrontDescription__content.app-storefront-description-readMore.truncate-overflow.truncate-overflow--withShadow', 'Description');
    const price = await getTextContent('#layoutMain > article > aside.storefrontHeadingWrap > header > div.storefrontHeadingFaqs > div:nth-child(1) > span', 'Prix');
    const address = await getTextContent('#layoutMain > article > aside.storefrontHeadingWrap > header > div.storefrontHeading__content > div.storefrontHeadingLocation.storefrontHeading__item > div > a', 'Adresse');
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
      type: type.trim(),
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
    const baseUrl = 'https://www.mariages.net/chateau-mariage';
    
    // Scraper la première page pour obtenir les liens
    console.log(`Navigation vers: ${baseUrl}`);
    const links = await scrapeListPage(page, baseUrl);
    console.log('\n=== Liste des URLs des châteaux ===');
    links.forEach((link, index) => {
      console.log(`${index + 1}. ${link}`);
    });
    console.log(`\nTotal: ${links.length} châteaux trouvés`);
    
    // Demander confirmation avant de continuer
    console.log('\nPrêt à commencer le scraping des détails...');
    await page.waitForTimeout(5000); // 5 secondes de pause pour lire la liste

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