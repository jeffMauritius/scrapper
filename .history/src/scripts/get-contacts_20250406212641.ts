import { chromium } from 'playwright';
import { WeddingVenueType } from '../enums/wedding-venues.enum';

interface ContactData {
  name: string;
  type: WeddingVenueType;
  email: string;
  phone: string;
  contactPerson: string;
  url: string;
}

const CONTEXT_OPTIONS = {
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  geolocation: { longitude: 2.3488, latitude: 48.8534 },
  locale: 'fr-FR',
  extraHTTPHeaders: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
  ignoreHTTPSErrors: true,
  javaScriptEnabled: true,
};

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext(CONTEXT_OPTIONS);
  const page = await context.newPage();

  try {
    // Accéder à la première page des établissements
    await page.goto('https://www.mariages.net/busc.php?id_grupo=1&showmode=list&NumPage=1', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Accepter les cookies si nécessaire
    try {
      await page.click('#didomi-notice-agree-button');
      await page.waitForTimeout(1000);
    } catch (e) {
      console.log('Pas de popup de cookies ou déjà accepté');
    }

    // Récupérer les URLs des 5 premiers établissements
    const venueUrls = await page.$$eval(
      '.app-list-directory-item a.gtm-business-list-link',
      (links) => links.slice(0, 5).map((link) => (link as HTMLAnchorElement).href)
    );

    const contacts: ContactData[] = [];

    // Visiter chaque établissement
    for (const [index, url] of venueUrls.entries()) {
      console.log(`\nVisite de l'établissement ${index + 1}/5: ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(2000);

      try {
        // Cliquer sur le bouton de contact si présent
        await page.click('.app-business-contact-button');
        await page.waitForTimeout(1000);

        const contactData: ContactData = {
          name: await page.$eval('.storefrontHeading__title', (el) => el.textContent?.trim() || ''),
          type: url.includes('/chateau-mariage/') ? WeddingVenueType.CASTLE : WeddingVenueType.DOMAIN,
          email: await page.$eval('.app-business-contact-email', (el) => el.textContent?.trim() || 'Non disponible'),
          phone: await page.$eval('.app-business-contact-phone', (el) => el.textContent?.trim() || 'Non disponible'),
          contactPerson: await page.$eval('.app-business-contact-name', (el) => el.textContent?.trim() || 'Non disponible'),
          url
        };

        contacts.push(contactData);
        console.log('✅ Informations récupérées avec succès');
        
      } catch (error) {
        console.log('❌ Erreur lors de la récupération des informations:', error);
        contacts.push({
          name: await page.$eval('.storefrontHeading__title', (el) => el.textContent?.trim() || ''),
          type: url.includes('/chateau-mariage/') ? WeddingVenueType.CASTLE : WeddingVenueType.DOMAIN,
          email: 'Non disponible',
          phone: 'Non disponible',
          contactPerson: 'Non disponible',
          url
        });
      }

      // Attendre un peu entre chaque établissement pour éviter la détection
      await page.waitForTimeout(Math.random() * 2000 + 1000);
    }

    // Afficher les résultats
    console.log('\n=== Résultats ===');
    contacts.forEach((contact, index) => {
      console.log(`\n${index + 1}. ${contact.name} (${contact.type})`);
      console.log(`   Contact: ${contact.contactPerson}`);
      console.log(`   Email: ${contact.email}`);
      console.log(`   Téléphone: ${contact.phone}`);
      console.log(`   URL: ${contact.url}`);
    });

  } catch (error) {
    console.error('Erreur principale:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);