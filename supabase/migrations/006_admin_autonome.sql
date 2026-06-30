-- ─── Panneau Admin Autonome — Configuration étendue ─────────────────────────

-- ── Nouvelles clés app_config ──────────────────────────────────────────────
INSERT INTO app_config (cle, valeur, description, categorie) VALUES
  ('maintenance_actif',     'false',                       'Mettre le site en mode maintenance',         'systeme'),
  ('maintenance_message',   '"Le site est temporairement indisponible. Revenez dans quelques minutes."', 'Message affiché en mode maintenance', 'systeme'),
  ('banniere_actif',        'false',                       'Afficher la bannière d''annonce en haut',    'systeme'),
  ('banniere_texte',        '""',                          'Texte de la bannière d''annonce',            'systeme'),
  ('banniere_type',         '"info"',                      'Type : info | succes | alerte',              'systeme'),
  ('contact_whatsapp',      '"24100000000"',               'Numéro WhatsApp support (format international sans +)', 'contact'),
  ('contact_email',         '"support@jadoreafamille.ga"', 'Email du support client',                    'contact'),
  ('reseaux_facebook',      '"https://facebook.com/jadoreafamille"',  'Lien Facebook',   'contact'),
  ('reseaux_instagram',     '"https://instagram.com/jadoreafamille"', 'Lien Instagram',  'contact'),
  ('reseaux_twitter',       '"https://twitter.com/jadoreafamille"',   'Lien Twitter/X',  'contact'),
  ('livraison_locale_xaf',  '1500',                        'Tarif livraison locale (même ville) en XAF', 'livraison')
ON CONFLICT (cle) DO NOTHING;

-- ── Catégories produits ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories_produits (
  slug        TEXT        PRIMARY KEY,
  nom         TEXT        NOT NULL,
  icone       TEXT        NOT NULL DEFAULT '🛒',
  couleur     TEXT        NOT NULL DEFAULT '#E63946',
  bg          TEXT        NOT NULL DEFAULT '#FEF2F2',
  ordre       INTEGER     NOT NULL DEFAULT 0,
  actif       BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE categories_produits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lecture_categories" ON categories_produits FOR SELECT USING (true);

INSERT INTO categories_produits (slug, nom, icone, couleur, bg, ordre) VALUES
  ('alimentation', 'Alimentation', '🛒', '#E63946', '#FEF2F2',  1),
  ('mode',         'Mode',         '👗', '#9B59B6', '#F5F0FB',  2),
  ('electronique', 'Électronique', '📱', '#2980B9', '#EBF5FB',  3),
  ('maison',       'Maison',       '🏠', '#E67E22', '#FEF5EC',  4),
  ('beaute',       'Beauté',       '💄', '#E91E8C', '#FEF0F7',  5),
  ('artisanat',    'Artisanat',    '🎨', '#8B4513', '#FDF3EC',  6),
  ('auto-moto',    'Auto & Moto',  '🚗', '#1ABC9C', '#E8F8F5',  7),
  ('agriculture',  'Agriculture',  '🌿', '#27AE60', '#EAFAF1',  8),
  ('services',     'Services',     '🔧', '#7F8C8D', '#F2F3F4',  9),
  ('sports',       'Sports',       '⚽', '#F39C12', '#FEF9EC', 10),
  ('brocante',     'Brocante',     '🏺', '#92400E', '#FEF3C7', 11)
ON CONFLICT (slug) DO NOTHING;

-- ── Tarifs livraison inter-provinces ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS tarifs_livraison (
  province_vendeur   TEXT    NOT NULL,
  province_acheteur  TEXT    NOT NULL,
  tarif_xaf          INTEGER NOT NULL,
  PRIMARY KEY (province_vendeur, province_acheteur)
);

ALTER TABLE tarifs_livraison ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lecture_tarifs" ON tarifs_livraison FOR SELECT USING (true);

INSERT INTO tarifs_livraison (province_vendeur, province_acheteur, tarif_xaf) VALUES
  ('EST','EST',2000),('EST','OMA',4500),('EST','MOY',2500),('EST','WNT',3500),('EST','OIV',4000),('EST','OLO',5000),('EST','HAO',5000),('EST','NGO',4000),('EST','NYA',6000),
  ('OMA','EST',4500),('OMA','OMA',2000),('OMA','MOY',3500),('OMA','WNT',6000),('OMA','OIV',6500),('OMA','OLO',5500),('OMA','HAO',6500),('OMA','NGO',4000),('OMA','NYA',4500),
  ('MOY','EST',2500),('MOY','OMA',3500),('MOY','MOY',2000),('MOY','WNT',4000),('MOY','OIV',3500),('MOY','OLO',3000),('MOY','HAO',4500),('MOY','NGO',2500),('MOY','NYA',5000),
  ('WNT','EST',3500),('WNT','OMA',6000),('WNT','MOY',4000),('WNT','WNT',2000),('WNT','OIV',3000),('WNT','OLO',5000),('WNT','HAO',5500),('WNT','NGO',5000),('WNT','NYA',6500),
  ('OIV','EST',4000),('OIV','OMA',6500),('OIV','MOY',3500),('OIV','WNT',3000),('OIV','OIV',2000),('OIV','OLO',3000),('OIV','HAO',3500),('OIV','NGO',4500),('OIV','NYA',6000),
  ('OLO','EST',5000),('OLO','OMA',5500),('OLO','MOY',3000),('OLO','WNT',5000),('OLO','OIV',3000),('OLO','OLO',2000),('OLO','HAO',2500),('OLO','NGO',3000),('OLO','NYA',4500),
  ('HAO','EST',5000),('HAO','OMA',6500),('HAO','MOY',4500),('HAO','WNT',5500),('HAO','OIV',3500),('HAO','OLO',2500),('HAO','HAO',2000),('HAO','NGO',4000),('HAO','NYA',5000),
  ('NGO','EST',4000),('NGO','OMA',4000),('NGO','MOY',2500),('NGO','WNT',5000),('NGO','OIV',4500),('NGO','OLO',3000),('NGO','HAO',4000),('NGO','NGO',2000),('NGO','NYA',2500),
  ('NYA','EST',6000),('NYA','OMA',4500),('NYA','MOY',5000),('NYA','WNT',6500),('NYA','OIV',6000),('NYA','OLO',4500),('NYA','HAO',5000),('NYA','NGO',2500),('NYA','NYA',2000)
ON CONFLICT DO NOTHING;

-- ── Villes couvertes ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS villes_livraison (
  nom            TEXT     PRIMARY KEY,
  province_code  TEXT     NOT NULL,
  supplement_xaf INTEGER  NOT NULL DEFAULT 0,
  actif          BOOLEAN  NOT NULL DEFAULT true
);

ALTER TABLE villes_livraison ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lecture_villes" ON villes_livraison FOR SELECT USING (true);

INSERT INTO villes_livraison (nom, province_code, supplement_xaf) VALUES
  ('Libreville','EST',0),('Owendo','EST',0),('Akanda','EST',0),('Ntoum','EST',0),('Kango','EST',500),('Cocobeach','EST',1500),
  ('Port-Gentil','OMA',0),('Omboué','OMA',1000),('Ntounga','OMA',1500),('Gamba','OMA',2000),
  ('Lambaréné','MOY',0),('Bifoun','MOY',0),('Ndjolé','MOY',500),('Sindara','MOY',500),('Malinga','MOY',1500),
  ('Oyem','WNT',0),('Bitam','WNT',0),('Mitzic','WNT',0),('Médouneu','WNT',1000),('Aboumi','WNT',1000),('Minvoul','WNT',1500),
  ('Booué','OIV',0),('Lopé','OIV',0),('Ovan','OIV',1000),('Makokou','OIV',0),('Mékambo','OIV',2000),
  ('Lastoursville','OLO',0),('Koulamoutou','OLO',0),('Pana','OLO',500),('Lebombi','OLO',1000),
  ('Franceville','HAO',0),('Moanda','HAO',0),('Bongoville','HAO',0),('Mounana','HAO',0),('Bakoumba','HAO',1500),('Lekoni','HAO',2000),('Okondja','HAO',1500),('Akiéni','HAO',1000),
  ('Fougamou','NGO',0),('Mandji','NGO',0),('Mouila','NGO',0),('Lebamba','NGO',500),('Mimongo','NGO',1000),('Ndendé','NGO',500),('Mbigou','NGO',1500),
  ('Moabi','NYA',0),('Tchibanga','NYA',0),('Mayumba','NYA',1500),('Mabanda','NYA',500),('Ndindi','NYA',1000)
ON CONFLICT (nom) DO NOTHING;
