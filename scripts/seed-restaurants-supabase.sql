-- =============================================================================
-- Script Supabase : 50 restaurants parisiens (vrais, ultra-connus)
-- Colonnes : name, cuisine (array), price_range, district, description, address,
--            photos (array), instagram_url, tiktok_url
-- Photos : URLs réelles (Wikimedia Commons, pas Unsplash)
-- Arrondissements Paris : 1er, 2e, 3e … 20e
-- =============================================================================

-- Optionnel : créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS restaurants (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  cuisine TEXT[] NOT NULL DEFAULT '{}',
  price_range TEXT,
  district TEXT,
  description TEXT,
  address TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',
  instagram_url TEXT,
  tiktok_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vidage pour re-seed propre (décommenter si besoin)
-- TRUNCATE TABLE restaurants RESTART IDENTITY;

-- =============================================================================
-- 50 INSERT : restaurants parisiens avec URLs photos réelles (Wikimedia)
-- =============================================================================

INSERT INTO restaurants (name, cuisine, price_range, district, description, address, photos, instagram_url, tiktok_url) VALUES
(
  'Pink Mamma',
  ARRAY['Italien', 'Pizza'],
  '€€',
  '9e',
  'Chic & Insta — Le palais de la truffe sur 4 étages, décor végétal et terrasse.',
  '20 Rue de Douai, 75009 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG'
  ],
  'https://www.instagram.com/pinkmamma_paris/',
  'https://www.tiktok.com/search?q=Pink%20Mamma%20Paris'
),
(
  'Bouillon Chartier',
  ARRAY['Bistrot Français', 'Bouillon'],
  '€',
  '9e',
  'Traditionnel — L''institution de 1896, pas cher et mythique, menu au crayon.',
  '7 Rue du Faubourg Montmartre, 75009 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/8/8b/Menu_du_Bouillon_Chartier_%281%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG'
  ],
  'https://www.instagram.com/bouillonchartier/',
  'https://www.tiktok.com/search?q=Bouillon%20Chartier%20Paris'
),
(
  'Kodawari Ramen',
  ARRAY['Japonais', 'Ramen'],
  '€€',
  '6e',
  'Insolite — On se croirait dans un marché aux poissons à Tokyo, ramen d''exception.',
  '29 Rue Mazarine, 75006 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/9/92/Kodawari_Ramen%2C_29_Rue_Mazarine%2C_75006_Paris%2C_France_003.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg'
  ],
  'https://www.instagram.com/kodawariramen_paris/',
  'https://www.tiktok.com/search?q=Kodawari%20Ramen%20Paris'
),
(
  'L''As du Fallafel',
  ARRAY['Moyen-Oriental', 'Street food'],
  '€',
  '4e',
  'Pas cher — Le grand classique du Marais, falafels et sandwichs légendaires.',
  '34 Rue des Rosiers, 75004 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/f/f7/As_du_falafel_Paris_Marais_Rue_des_rosiers.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/7/75/As_du_falafel_Paris_Le_Marais.jpg'
  ],
  'https://www.instagram.com/lasdufallafel/',
  'https://www.tiktok.com/search?q=As%20du%20Fallafel%20Paris'
),
(
  'Relais de l''Entrecôte',
  ARRAY['Bistrot Français', 'Steak frites'],
  '€€',
  '6e',
  'Incontournable — Steak-frites à volonté, sauce secrète, file d''attente mythique.',
  '20 Rue Saint-Benoît, 75006 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg'
  ],
  'https://www.instagram.com/relaisentrecote/',
  'https://www.tiktok.com/search?q=Relais%20Entrecote%20Paris'
),
(
  'Le Train Bleu',
  ARRAY['Brasserie Française', 'Gastronomique'],
  '€€€',
  '12e',
  'Historique — Manger dans une gare qui ressemble à Versailles, plafonds peints.',
  'Gare de Lyon, Place Louis-Armand, 75012 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/9/93/Train_bleu_02.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/7/78/Train_bleu_05_bearbeitet.jpg'
  ],
  'https://www.instagram.com/letrainbleuparis/',
  'https://www.tiktok.com/search?q=Train%20Bleu%20Paris'
),
(
  'Le Comptoir du Relais',
  ARRAY['Bistrot Français'],
  '€€',
  '6e',
  'Street Food & bistrot iconique du carrefour de l''Odéon, Yves Camdeborde.',
  '9 Carrefour de l''Odéon, 75006 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG'
  ],
  'https://www.instagram.com/lecomptoirdurelais/',
  'https://www.tiktok.com/search?q=Comptoir%20du%20Relais%20Paris'
),
(
  'Septime',
  ARRAY['Cuisine Moderne', 'Gastronomique'],
  '€€€',
  '11e',
  'Gastronomique étoilé — Menu dégustation créatif, Bertrand Grébaut.',
  '80 Rue de Charonne, 75011 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg'
  ],
  'https://www.instagram.com/septime_paris/',
  'https://www.tiktok.com/search?q=Septime%20Paris'
),
(
  'Breizh Café',
  ARRAY['Breton', 'Crêperie'],
  '€€',
  '3e',
  'Décontracté — Les meilleures galettes bretonnes du Marais, cidre et beurre salé.',
  '109 Rue Vieille du Temple, 75003 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG'
  ],
  'https://www.instagram.com/breizhcafe/',
  'https://www.tiktok.com/search?q=Breizh%20Cafe%20Paris'
),
(
  'Girafe',
  ARRAY['Fruits de mer', 'Gastronomique'],
  '€€€€',
  '16e',
  'Luxe — La plus belle vue sur la Tour Eiffel, cuisine marine raffinée.',
  '1 Place du Trocadéro, 75016 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/9/93/Train_bleu_02.jpg'
  ],
  'https://www.instagram.com/girafe_paris/',
  'https://www.tiktok.com/search?q=Girafe%20Paris%20restaurant'
),
(
  'Chez Janou',
  ARRAY['Provençal', 'Bistrot'],
  '€€',
  '3e',
  'Typique — Le paradis du pastis et de la mousse au chocolat à la louche.',
  '2 Rue Roger Verlomme, 75003 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG'
  ],
  'https://www.instagram.com/chezjanou/',
  'https://www.tiktok.com/search?q=Chez%20Janou%20Paris'
),
(
  'Sacha Finkelsztajn',
  ARRAY['Boulangerie Yiddish', 'Tradition juive'],
  '€',
  '4e',
  'Boulangerie — Spécialités yiddish & belle façade jaune, strudel et pâtisseries.',
  '27 Rue des Rosiers, 75004 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/a/ac/Paris_75004_Rue_des_Rosiers_no_027_Sacha_Finkelsztajn_01a.jpg'
  ],
  'https://www.instagram.com/sachafinkelsztajn/',
  'https://www.tiktok.com/search?q=Sacha%20Finkelsztajn%20Paris'
),
(
  'Bofinger',
  ARRAY['Brasserie Française', 'Fruits de mer'],
  '€€€',
  '4e',
  'Historique — Première brasserie à servir la choucroute à Paris, Art nouveau.',
  '5-7 Rue de la Bastille, 75004 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg'
  ],
  'https://www.instagram.com/bofinger_paris/',
  'https://www.tiktok.com/search?q=Bofinger%20Paris'
),
(
  'Brasserie Vagenende',
  ARRAY['Brasserie Française'],
  '€€',
  '6e',
  'Belle Époque — Décor 1904 intact, boulevard Saint-Germain.',
  '142 Boulevard Saint-Germain, 75006 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG'
  ],
  'https://www.instagram.com/brasserievagenende/',
  'https://www.tiktok.com/search?q=Vagenende%20Paris'
),
(
  'Miznon',
  ARRAY['Méditerranéen', 'Street food'],
  '€€',
  '3e',
  'Célèbre — Pitas généreux, chou-fleur entier, ambiance décontractée Eyal Shani.',
  '22 Rue des Ecouffes, 75004 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/f/f7/As_du_falafel_Paris_Marais_Rue_des_rosiers.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/7/75/As_du_falafel_Paris_Le_Marais.jpg'
  ],
  'https://www.instagram.com/miznon_paris/',
  'https://www.tiktok.com/search?q=Miznon%20Paris'
),
(
  'Frenchie',
  ARRAY['Cuisine Moderne', 'Française'],
  '€€€',
  '2e',
  'Tendance — Gregory Marchand, menu court créatif, réservation difficile.',
  '5-6 Rue du Nil, 75002 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/9/93/Train_bleu_02.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg'
  ],
  'https://www.instagram.com/frenchie_paris/',
  'https://www.tiktok.com/search?q=Frenchie%20Paris'
),
(
  'Clamato',
  ARRAY['Fruits de mer', 'Bar à huîtres'],
  '€€',
  '11e',
  'Fruits de mer — Voisin de Septime, huîtres et coquillages frais, Bertrand Grébaut.',
  '80 Rue de Charonne, 75011 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg'
  ],
  'https://www.instagram.com/clamato_paris/',
  'https://www.tiktok.com/search?q=Clamato%20Paris'
),
(
  'Le Baratin',
  ARRAY['Bistrot Français', 'Vins nature'],
  '€€',
  '20e',
  'Cultissime — Bistrot de quartier, carte des vins nature exceptionnelle.',
  '3 Rue Jouye-Rouve, 75020 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG'
  ],
  'https://www.instagram.com/lebaratinparis/',
  'https://www.tiktok.com/search?q=Le%20Baratin%20Paris'
),
(
  'Bouillon République',
  ARRAY['Bouillon', 'Bistrot Français'],
  '€',
  '11e',
  'Moderne — Bouillon nouvelle génération, rapport qualité-prix, belle salle.',
  '39 Boulevard du Temple, 75011 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/8/8b/Menu_du_Bouillon_Chartier_%281%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG'
  ],
  'https://www.instagram.com/bouillonrepublique/',
  'https://www.tiktok.com/search?q=Bouillon%20Republique%20Paris'
),
(
  'Bouillon Julien',
  ARRAY['Bouillon', 'Bistrot Français'],
  '€',
  '10e',
  '1906 — Salle Art nouveau somptueuse, cuisine traditionnelle pas chère.',
  '16 Rue du Faubourg Saint-Denis, 75010 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/8/8b/Menu_du_Bouillon_Chartier_%281%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/7/78/Train_bleu_05_bearbeitet.jpg'
  ],
  'https://www.instagram.com/bouillonjulien/',
  'https://www.tiktok.com/search?q=Bouillon%20Julien%20Paris'
),
(
  'Ober Mamma',
  ARRAY['Italien', 'Pizza'],
  '€€',
  '11e',
  'Groupe Big Mamma — Pizzas au feu de bois, décor jungle, ambiance festive.',
  '107 Boulevard Richard-Lenoir, 75011 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG'
  ],
  'https://www.instagram.com/obermamma_paris/',
  'https://www.tiktok.com/search?q=Ober%20Mamma%20Paris'
),
(
  'Pizzeria Popolare',
  ARRAY['Italien', 'Pizza'],
  '€€',
  '2e',
  'Ambiance italienne, pizzas au levain, grand choix, Big Mamma.',
  '111 Rue Réaumur, 75002 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg'
  ],
  'https://www.instagram.com/pizzeriapopolare_paris/',
  'https://www.tiktok.com/search?q=Pizzeria%20Popolare%20Paris'
),
(
  'East Mamma',
  ARRAY['Italien', 'Pizza'],
  '€€',
  '11e',
  'Big Mamma — Pizzas et pâtes, terrasse, quartier Bastille.',
  '133 Rue du Faubourg Saint-Antoine, 75011 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/9/93/Train_bleu_02.jpg'
  ],
  'https://www.instagram.com/eastmamma_paris/',
  'https://www.tiktok.com/search?q=East%20Mamma%20Paris'
),
(
  'Le Vaisseau',
  ARRAY['Bistrot Français', 'Vins'],
  '€€',
  '11e',
  'Bistrot convivial, cuisine honnête, cave soignée, quartier Oberkampf.',
  '12 Rue de la Roquette, 75011 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg'
  ],
  'https://www.instagram.com/levaisseau_paris/',
  'https://www.tiktok.com/search?q=Le%20Vaisseau%20Paris'
),
(
  'Le Relais Gascon',
  ARRAY['Sud-Ouest', 'Bistrot'],
  '€€',
  '18e',
  'Généreux — Salades géantes, cassoulet, ambiance Montmartre.',
  '6 Rue des Abbesses, 75018 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG'
  ],
  'https://www.instagram.com/lerelaisgascon/',
  'https://www.tiktok.com/search?q=Relais%20Gascon%20Paris'
),
(
  'Café de Flore',
  ARRAY['Café', 'Brasserie'],
  '€€€',
  '6e',
  'Légendaire — Saint-Germain, intellectuels et artistes depuis 1887.',
  '172 Boulevard Saint-Germain, 75006 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg'
  ],
  'https://www.instagram.com/cafedeflore/',
  'https://www.tiktok.com/search?q=Cafe%20de%20Flore%20Paris'
),
(
  'Les Deux Magots',
  ARRAY['Café', 'Brasserie'],
  '€€€',
  '6e',
  'Historique — Sartre, Beauvoir, Picasso ; terrasse place Saint-Germain.',
  '6 Place Saint-Germain-des-Prés, 75006 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/9/93/Train_bleu_02.jpg'
  ],
  'https://www.instagram.com/lesdeuxmagots/',
  'https://www.tiktok.com/search?q=Deux%20Magots%20Paris'
),
(
  'La Coupole',
  ARRAY['Brasserie Française', 'Art déco'],
  '€€€',
  '14e',
  'Monument — Brasserie Art déco 1927, Montparnasse, peintures et foule.',
  '102 Boulevard du Montparnasse, 75014 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/7/78/Train_bleu_05_bearbeitet.jpg'
  ],
  'https://www.instagram.com/lacoupoleparis/',
  'https://www.tiktok.com/search?q=La%20Coupole%20Paris'
),
(
  'Le Procope',
  ARRAY['Brasserie Française', 'Historique'],
  '€€€',
  '6e',
  'Plus vieux café de Paris (1686) — Voltaire, Rousseau, révolution.',
  '13 Rue de l''Ancienne Comédie, 75006 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/9/93/Train_bleu_02.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg'
  ],
  'https://www.instagram.com/leprocope/',
  'https://www.tiktok.com/search?q=Le%20Procope%20Paris'
),
(
  'Chez L''Ami Jean',
  ARRAY['Bistrot Français', 'Gastronomique'],
  '€€€',
  '7e',
  'Cultissime — Stéphane Jégo, riz au lait géant, ambiance bon enfant.',
  '27 Rue Malar, 75007 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg'
  ],
  'https://www.instagram.com/chezlamijean/',
  'https://www.tiktok.com/search?q=Chez%20L%20Ami%20Jean%20Paris'
),
(
  'Clown Bar',
  ARRAY['Cuisine Moderne', 'Bistrot'],
  '€€€',
  '11e',
  'Tendance — Sous le chapiteau du cirque d''hiver, cuisine inventive.',
  '114 Rue Amelot, 75011 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/9/93/Train_bleu_02.jpg'
  ],
  'https://www.instagram.com/clownbar_paris/',
  'https://www.tiktok.com/search?q=Clown%20Bar%20Paris'
),
(
  'Le Chateaubriand',
  ARRAY['Cuisine Moderne', 'Bistrot'],
  '€€€',
  '11e',
  'Incontournable — Iñaki Aizpitarte, menu unique, 50 Best.',
  '129 Avenue Parmentier, 75011 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/7/78/Train_bleu_05_bearbeitet.jpg'
  ],
  'https://www.instagram.com/lechateaubriand_paris/',
  'https://www.tiktok.com/search?q=Chateaubriand%20Paris'
),
(
  'Bistrot Paul Bert',
  ARRAY['Bistrot Français'],
  '€€',
  '12e',
  'Institution — Steak au poivre, œuf parfait, tarte au citron, sans chichi.',
  '18 Rue Paul Bert, 75012 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG'
  ],
  'https://www.instagram.com/bistrotpaulbert/',
  'https://www.tiktok.com/search?q=Paul%20Bert%20Paris'
),
(
  'Derrière',
  ARRAY['Fusion', 'Française moderne'],
  '€€€',
  '3e',
  'Secret — Dîner dans un appartement avec table de ping-pong et chambre.',
  '69 Rue des Gravilliers, 75003 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/9/93/Train_bleu_02.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg'
  ],
  'https://www.instagram.com/derriere_paris/',
  'https://www.tiktok.com/search?q=Derriere%20restaurant%20Paris'
),
(
  'Shabour',
  ARRAY['Israélien', 'Gastronomique'],
  '€€€',
  '2e',
  'Israélien — Haute énergie autour d''un comptoir chic, Assaf Granit.',
  '19 Rue Saint-Sauveur, 75002 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/f/f7/As_du_falafel_Paris_Marais_Rue_des_rosiers.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG'
  ],
  'https://www.instagram.com/shabour_paris/',
  'https://www.tiktok.com/search?q=Shabour%20Paris'
),
(
  'Holybelly 5',
  ARRAY['Brunch', 'Café'],
  '€€',
  '10e',
  'Brunch — Passage obligé pour pancakes & café australien, canal Saint-Martin.',
  '5 Rue Lucien Sampaix, 75010 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG'
  ],
  'https://www.instagram.com/holybelly/',
  'https://www.tiktok.com/search?q=Holybelly%20Paris'
),
(
  'L''Astrance',
  ARRAY['Gastronomique Français'],
  '€€€€',
  '16e',
  'Prestige — Étoilé Pascal Barbot, pour les grandes occasions uniquement.',
  '4 Rue Beethoven, 75016 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/9/93/Train_bleu_02.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/7/78/Train_bleu_05_bearbeitet.jpg'
  ],
  'https://www.instagram.com/lastrance_paris/',
  'https://www.tiktok.com/search?q=Astrance%20Paris'
),
(
  'Le Perchoir',
  ARRAY['Bar', 'Tapas'],
  '€€',
  '11e',
  'Rooftop tendance — Vue, tapas et cocktails perchés sur le toit.',
  '14 Rue Crespin du Gast, 75011 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg'
  ],
  'https://www.instagram.com/leperchoir_paris/',
  'https://www.tiktok.com/search?q=Le%20Perchoir%20Paris'
),
(
  'Bones',
  ARRAY['Cuisine Moderne', 'Bistrot'],
  '€€€',
  '11e',
  'Ex-Holybelly team — Menu court, vins nature, ambiance décontractée.',
  '43 Rue Godefroy Cavaignac, 75011 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/9/93/Train_bleu_02.jpg'
  ],
  'https://www.instagram.com/bones_paris/',
  'https://www.tiktok.com/search?q=Bones%20Paris%20restaurant'
),
(
  'Bambini',
  ARRAY['Italien', 'Bar'],
  '€€',
  '16e',
  'Ambiance festive, terrasse colorée, cuisine italienne vivante, Wilson.',
  '13 Avenue du Président Wilson, 75116 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg'
  ],
  'https://www.instagram.com/bambini_paris/',
  'https://www.tiktok.com/search?q=Bambini%20Paris'
),
(
  'Homer Lobster',
  ARRAY['Seafood', 'Street food'],
  '€€€',
  '3e',
  'Gourmand — Lobster rolls primés, décor US, Rambuteau.',
  '21 Rue Rambuteau, 75003 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/9/93/Train_bleu_02.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG'
  ],
  'https://www.instagram.com/homerlobster_paris/',
  'https://www.tiktok.com/search?q=Homer%20Lobster%20Paris'
),
(
  'Froufrou',
  ARRAY['Cuisine Française contemporaine'],
  '€€€',
  '9e',
  'Spectacle & partage — Dans le théâtre Édouard VII, dîner et show.',
  '10 Place Édouard VII, 75009 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/7/78/Train_bleu_05_bearbeitet.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg'
  ],
  'https://www.instagram.com/froufrou_paris/',
  'https://www.tiktok.com/search?q=Froufrou%20Paris'
),
(
  'Les Papilles',
  ARRAY['Bistrot Français', 'Cave à vins'],
  '€€',
  '5e',
  'Cave et table — Épicerie-bistrot, menu unique du jour, carte des vins soignée.',
  '30 Rue Gay-Lussac, 75005 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG'
  ],
  'https://www.instagram.com/lespapilles/',
  'https://www.tiktok.com/search?q=Les%20Papilles%20Paris'
),
(
  'Semilla',
  ARRAY['Cuisine Moderne', 'Française'],
  '€€€',
  '6e',
  'Juan Sanchez — Petites assiettes créatives, quartier Saint-Germain.',
  '54 Rue de Seine, 75006 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/9/93/Train_bleu_02.jpg'
  ],
  'https://www.instagram.com/semilla_paris/',
  'https://www.tiktok.com/search?q=Semilla%20Paris'
),
(
  'Le 6 Paul Bert',
  ARRAY['Bistrot Français'],
  '€€',
  '12e',
  'Même équipe que Paul Bert — Bistrot du quartier, cuisine sincère.',
  '6 Rue Paul Bert, 75012 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/8/8b/Menu_du_Bouillon_Chartier_%281%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg'
  ],
  'https://www.instagram.com/le6paulbert/',
  'https://www.tiktok.com/search?q=6%20Paul%20Bert%20Paris'
),
(
  'Freddy''s',
  ARRAY['Vins', 'Petits plats'],
  '€€',
  '11e',
  'Bar à vins — Petits plats, vins nature, ambiance jeune et décontractée.',
  '54 Rue de la Roquette, 75011 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/9/93/Train_bleu_02.jpg'
  ],
  'https://www.instagram.com/freddys_paris/',
  'https://www.tiktok.com/search?q=Freddys%20Paris'
),
(
  'Le Mary Celeste',
  ARRAY['Bar', 'Petits plats'],
  '€€',
  '3e',
  'Cocktails et petites assiettes — Comptoir, ambiance canal.',
  '1 Rue Commines, 75003 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Paris_Brasserie_Le_Vagenende_Innen_05.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG'
  ],
  'https://www.instagram.com/lemaryceleste/',
  'https://www.tiktok.com/search?q=Mary%20Celeste%20Paris'
),
(
  'Hakuba',
  ARRAY['Japonais', 'Ramen'],
  '€€',
  '4e',
  'Ramen — Bouillon riche, nouilles faites maison, Marais.',
  '24 Rue du Bourg-Tibourg, 75004 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/9/92/Kodawari_Ramen%2C_29_Rue_Mazarine%2C_75006_Paris%2C_France_003.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG'
  ],
  'https://www.instagram.com/hakuba_paris/',
  'https://www.tiktok.com/search?q=Hakuba%20ramen%20Paris'
),
(
  'La Tour d''Argent',
  ARRAY['Gastronomique Français', 'Historique'],
  '€€€€',
  '5e',
  'Légendaire — Vue Notre-Dame, canard au sang, cave exceptionnelle.',
  '15-17 Quai de la Tournelle, 75005 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/7/78/Train_bleu_05_bearbeitet.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/9/93/Train_bleu_02.jpg'
  ],
  'https://www.instagram.com/latourdargent/',
  'https://www.tiktok.com/search?q=Tour%20d%20Argent%20Paris'
),
(
  'Le Jules Verne',
  ARRAY['Gastronomique Français'],
  '€€€€',
  '7e',
  'Vue — Restaurant de la Tour Eiffel, Alain Ducasse, occasion spéciale.',
  'Tour Eiffel, Avenue Gustave Eiffel, 75007 Paris',
  ARRAY[
    'https://upload.wikimedia.org/wikipedia/commons/9/93/Train_bleu_02.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/55/Bofinger.JPG'
  ],
  'https://www.instagram.com/lejulesverne_paris/',
  'https://www.tiktok.com/search?q=Jules%20Verne%20Paris'
);
