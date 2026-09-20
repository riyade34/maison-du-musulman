// Catalogue central des produits — L’Univers du Croyant
// Pour ajouter un produit : copier un bloc et changer les valeurs (id unique obligatoire).
// Les champs français (name, tagline, description, badge, categoryLabel, variantLabel, info) sont la référence.
// Le bloc `i18n.en` donne la version anglaise des mêmes champs ; ce sont ces clés qui sont lues sur /en/ :
//   variants : { "<variant>": [libellé court du bouton, libellé complet] }  (clé = champ `variant` français)
//   info     : [[libellé, valeur], …]
// Ne jamais modifier `variant`, `label` ni `price` pour traduire : le panier, le serveur et Stripe s’en servent.
const PRODUCTS = [
  // ---------- BIEN-ÊTRE ----------
  {
    id: 'huile-nigelle',
    category: 'bien-etre',
    categoryLabel: 'Bien-être',
    icon: '🌿',
    badge: 'Pression à froid',
    name: 'Huile de nigelle pure',
    tagline: '100% naturelle, sans additif — Éthiopie (Habachia)',
    description: "Extraite des graines de Nigella Sativa d'Éthiopie et pressée à froid pour préserver ses bienfaits. Un incontournable du quotidien, en usage cosmétique comme culinaire.",
    variantLabel: 'Contenance',
    variants: [
      { variant: '30ml',  label: 'flacon 30ml',   price: 1.05 },
      { variant: '60ml',  label: 'flacon 60ml',   price: 7.50 },
      { variant: '500ml', label: 'flacon 500ml',  price: 14.50 },
      { variant: '1L',    label: 'bouteille 1L',  price: 25.90 }
    ],
    defaultVariant: '60ml',
    info: { 'Origine': 'Éthiopie (Habachia)', 'Usage': 'Cosmétique', 'Livraison': '2-4 jours ouvrés' },
    i18n: {
      en: {
        categoryLabel: "Wellbeing",
        badge: "Cold-pressed",
        name: "Pure nigella oil",
        tagline: "100% natural, no additives — Ethiopia (Habashia)",
        description: "Extracted from Ethiopian Nigella sativa seeds and cold-pressed to preserve their benefits. A daily essential, for cosmetic and culinary use alike.",
        variantLabel: "Size",
        variants: { "30ml": ["30 ml", "30 ml bottle"], "60ml": ["60 ml", "60 ml bottle"], "500ml": ["500 ml", "500 ml bottle"], "1L": ["1 L", "1 L bottle"] },
        info: [["Origin", "Ethiopia (Habashia)"], ["Use", "Cosmetic"], ["Delivery", "2–4 working days"]]
      }
    }
  },
  {
    id: 'miel-nigelle',
    category: 'bien-etre',
    categoryLabel: 'Bien-être',
    icon: '🍯',
    badge: 'Mélange naturel',
    name: 'Miel à la nigelle',
    tagline: 'Miel pur additionné de graines de nigelle',
    description: "Un miel naturel mélangé à des graines de nigelle entières, pour un goût unique et des bienfaits combinés au quotidien.",
    variantLabel: 'Contenance',
    variants: [
      { variant: '250g', label: 'pot 250g', price: 9.90 },
      { variant: '500g', label: 'pot 500g', price: 16.90 }
    ],
    defaultVariant: '250g',
    info: { 'Origine': 'Éthiopie', 'Usage': 'Alimentaire', 'Livraison': '2-4 jours ouvrés' },
    i18n: {
      en: {
        categoryLabel: "Wellbeing",
        badge: "Natural blend",
        name: "Nigella honey",
        tagline: "Pure honey blended with nigella seeds",
        description: "A natural honey mixed with whole nigella seeds, for a unique taste and combined benefits every day.",
        variantLabel: "Size",
        variants: { "250g": ["250 g", "250 g jar"], "500g": ["500 g", "500 g jar"] },
        info: [["Origin", "Ethiopia"], ["Use", "Food"], ["Delivery", "2–4 working days"]]
      }
    }
  },
  {
    id: 'savon-nigelle',
    category: 'bien-etre',
    categoryLabel: 'Bien-être',
    icon: '🧼',
    badge: 'Artisanal',
    name: 'Savon à la nigelle',
    tagline: 'Savon naturel saponifié à froid',
    description: "Savon artisanal enrichi à l'huile de nigelle, doux pour la peau et sans additifs chimiques.",
    variantLabel: 'Format',
    variants: [
      { variant: 'unique', label: 'Savon x1', price: 4.50 },
      { variant: 'lot3',   label: 'Lot de 3', price: 11.90 }
    ],
    defaultVariant: 'unique',
    info: { 'Matière': 'Saponification à froid', 'Usage': 'Cosmétique', 'Livraison': '2-4 jours ouvrés' },
    i18n: {
      en: {
        categoryLabel: "Wellbeing",
        badge: "Handcrafted",
        name: "Nigella soap",
        tagline: "Natural cold-process soap",
        description: "Handcrafted soap enriched with nigella oil, gentle on the skin and free from chemical additives.",
        variantLabel: "Format",
        variants: { "unique": ["Single bar", "Single bar"], "lot3": ["Pack of 3", "Pack of 3"] },
        info: [["Process", "Cold-process saponification"], ["Use", "Cosmetic"], ["Delivery", "2–4 working days"]]
      }
    }
  },
  {
    id: 'musc-parfum',
    category: 'bien-etre',
    categoryLabel: 'Bien-être',
    icon: '💧',
    badge: 'Sans alcool',
    name: 'Musc parfum sans alcool',
    tagline: 'Fragrance douce et longue tenue',
    description: "Parfum concentré sans alcool, adapté à un usage quotidien y compris pendant la prière. Tenue longue durée.",
    variantLabel: 'Contenance',
    variants: [
      { variant: '3ml',  label: 'flacon 3ml',  price: 5.90 },
      { variant: '6ml',  label: 'flacon 6ml',  price: 9.90 },
      { variant: '12ml', label: 'flacon 12ml', price: 16.90 }
    ],
    defaultVariant: '6ml',
    info: { 'Type': 'Huile parfumée', 'Alcool': 'Sans alcool', 'Livraison': '2-4 jours ouvrés' },
    i18n: {
      en: {
        categoryLabel: "Wellbeing",
        badge: "Alcohol-free",
        name: "Alcohol-free musk perfume",
        tagline: "Soft, long-lasting fragrance",
        description: "Concentrated alcohol-free perfume, suitable for everyday use, including during prayer. Long-lasting wear.",
        variantLabel: "Size",
        variants: { "3ml": ["3 ml", "3 ml bottle"], "6ml": ["6 ml", "6 ml bottle"], "12ml": ["12 ml", "12 ml bottle"] },
        info: [["Type", "Perfume oil"], ["Alcohol", "Alcohol-free"], ["Delivery", "2–4 working days"]]
      }
    }
  },
  {
    id: 'encens-oud',
    category: 'bien-etre',
    categoryLabel: 'Bien-être',
    icon: '🕯️',
    badge: 'Fumée douce',
    name: 'Bâtonnets d\'encens oud',
    tagline: 'Parfum boisé traditionnel',
    description: "Bâtonnets d'encens à l'oud, pour parfumer votre intérieur d'une senteur boisée et chaleureuse.",
    variantLabel: 'Quantité',
    variants: [
      { variant: 'x20', label: 'Boîte de 20', price: 6.90 },
      { variant: 'x40', label: 'Boîte de 40', price: 11.90 }
    ],
    defaultVariant: 'x20',
    info: { 'Parfum': 'Oud', 'Usage': 'Intérieur', 'Livraison': '2-4 jours ouvrés' },
    i18n: {
      en: {
        categoryLabel: "Wellbeing",
        badge: "Soft smoke",
        name: "Oud incense sticks",
        tagline: "Traditional woody fragrance",
        description: "Oud incense sticks to scent your home with a warm, woody aroma.",
        variantLabel: "Quantity",
        variants: { "x20": ["Box of 20", "Box of 20"], "x40": ["Box of 40", "Box of 40"] },
        info: [["Fragrance", "Oud"], ["Use", "Indoor"], ["Delivery", "2–4 working days"]]
      }
    }
  },

  // ---------- PRIÈRE ----------
  {
    id: 'tapis-priere',
    category: 'priere',
    categoryLabel: 'Prière',
    icon: '🕌',
    badge: 'Tissu épais',
    name: 'Tapis de prière uni',
    tagline: 'Confortable et facile d\'entretien',
    description: "Un tapis de prière au tissage serré, avec renfort antidérapant. Coloris sobres pensés pour s'intégrer à tous les intérieurs.",
    variantLabel: 'Coloris',
    variants: [
      { variant: 'sable', label: 'Sable',  price: 15.00 },
      { variant: 'vert',  label: 'Vert',   price: 15.00 },
      { variant: 'gris',  label: 'Gris',   price: 15.00 },
      { variant: 'bordeaux', label: 'Bordeaux', price: 15.00 }
    ],
    defaultVariant: 'sable',
    info: { 'Matière': 'Velours épais', 'Entretien': 'Lavable en machine', 'Livraison': '2-4 jours ouvrés' },
    i18n: {
      en: {
        categoryLabel: "Prayer",
        badge: "Thick fabric",
        name: "Plain prayer rug",
        tagline: "Comfortable and easy to care for",
        description: "A tightly woven prayer rug with a non-slip backing. Understated colours designed to suit any interior.",
        variantLabel: "Colour",
        variants: { "sable": ["Sand", "Sand"], "vert": ["Green", "Green"], "gris": ["Grey", "Grey"], "bordeaux": ["Burgundy", "Burgundy"] },
        info: [["Material", "Thick velvet"], ["Care", "Machine washable"], ["Delivery", "2–4 working days"]]
      }
    }
  },
  {
    id: 'tapis-priere-voyage',
    category: 'priere',
    categoryLabel: 'Prière',
    icon: '🧳',
    badge: 'Pliable',
    name: 'Tapis de prière de voyage',
    tagline: 'Compact et léger, pochette incluse',
    description: "Tapis de prière fin et pliable, livré avec sa pochette de transport. Idéal pour les déplacements et le sac à dos.",
    variantLabel: 'Coloris',
    variants: [
      { variant: 'sable', label: 'Sable', price: 12.90 },
      { variant: 'gris',  label: 'Gris',  price: 12.90 }
    ],
    defaultVariant: 'sable',
    info: { 'Matière': 'Tissu fin pliable', 'Poids': 'Léger', 'Livraison': '2-4 jours ouvrés' },
    i18n: {
      en: {
        categoryLabel: "Prayer",
        badge: "Foldable",
        name: "Travel prayer rug",
        tagline: "Compact and light, pouch included",
        description: "A thin, foldable prayer rug supplied with its carry pouch. Ideal for travel and backpacks.",
        variantLabel: "Colour",
        variants: { "sable": ["Sand", "Sand"], "gris": ["Grey", "Grey"] },
        info: [["Material", "Thin foldable fabric"], ["Weight", "Light"], ["Delivery", "2–4 working days"]]
      }
    }
  },
  {
    id: 'tapis-priere-enfant',
    category: 'priere',
    categoryLabel: 'Prière',
    icon: '🧒',
    badge: 'Motifs enfant',
    name: 'Tapis de prière enfant',
    tagline: 'Format réduit, motifs colorés',
    description: "Un tapis de prière adapté aux enfants, format réduit et motifs ludiques pour les accompagner dans l'apprentissage de la prière.",
    variantLabel: 'Motif',
    variants: [
      { variant: 'etoiles', label: 'Étoiles', price: 10.90 },
      { variant: 'geometrique', label: 'Géométrique', price: 10.90 }
    ],
    defaultVariant: 'etoiles',
    info: { 'Format': 'Réduit (enfant)', 'Entretien': 'Lavable en machine', 'Livraison': '2-4 jours ouvrés' },
    i18n: {
      en: {
        categoryLabel: "Prayer",
        badge: "Children’s designs",
        name: "Children’s prayer rug",
        tagline: "Smaller size, colourful designs",
        description: "A prayer rug for children, in a smaller size with playful designs to accompany them as they learn to pray.",
        variantLabel: "Design",
        variants: { "etoiles": ["Stars", "Stars"], "geometrique": ["Geometric", "Geometric"] },
        info: [["Format", "Small (child)"], ["Care", "Machine washable"], ["Delivery", "2–4 working days"]]
      }
    }
  },
  {
    id: 'chapelet',
    category: 'priere',
    categoryLabel: 'Prière',
    icon: '📿',
    badge: 'Fait main',
    name: 'Chapelet artisanal (99 grains)',
    tagline: 'Perles en bois naturel',
    description: "Chapelet traditionnel à 99 grains, perles en bois travaillées à la main. Solide et agréable en main au quotidien.",
    variantLabel: 'Matière',
    variants: [
      { variant: 'bois', label: 'Bois naturel', price: 9.90 },
      { variant: 'perles', label: 'Perles nacrées', price: 12.90 }
    ],
    defaultVariant: 'bois',
    info: { 'Grains': '99', 'Fabrication': 'Fait main', 'Livraison': '2-4 jours ouvrés' },
    i18n: {
      en: {
        categoryLabel: "Prayer",
        badge: "Handmade",
        name: "Handmade tasbih (99 beads)",
        tagline: "Natural wood beads",
        description: "Traditional 99-bead tasbih (prayer beads) with hand-finished wooden beads. Sturdy and pleasant to hold every day.",
        variantLabel: "Material",
        variants: { "bois": ["Natural wood", "Natural wood"], "perles": ["Pearlescent beads", "Pearlescent beads"] },
        info: [["Beads", "99"], ["Making", "Handmade"], ["Delivery", "2–4 working days"]]
      }
    }
  },
  {
    id: 'chapelet-33',
    category: 'priere',
    categoryLabel: 'Prière',
    icon: '📿',
    badge: 'Format compact',
    name: 'Chapelet compact (33 grains)',
    tagline: 'Léger, idéal pour la poche',
    description: "Version compacte à 33 grains, pratique à emporter partout. Perles lisses et agréables au toucher.",
    variantLabel: null,
    variants: [
      { variant: 'unique', label: 'Modèle unique', price: 6.90 }
    ],
    defaultVariant: 'unique',
    info: { 'Grains': '33', 'Format': 'Compact', 'Livraison': '2-4 jours ouvrés' },
    i18n: {
      en: {
        categoryLabel: "Prayer",
        badge: "Compact size",
        name: "Compact tasbih (33 beads)",
        tagline: "Light, ideal for your pocket",
        description: "Compact 33-bead version, handy to take anywhere. Smooth beads that feel pleasant to the touch.",
        variantLabel: null,
        variants: { "unique": ["Single model", "Single model"] },
        info: [["Beads", "33"], ["Format", "Compact"], ["Delivery", "2–4 working days"]]
      }
    }
  },
  {
    id: 'coussin-priere',
    category: 'priere',
    categoryLabel: 'Prière',
    icon: '🛋️',
    badge: 'Confort',
    name: 'Coussin de prière',
    tagline: 'Soutien pour la position assise',
    description: "Coussin ergonomique pensé pour soutenir le dos et les genoux pendant la prière, notamment utile en cas de gêne physique.",
    variantLabel: 'Coloris',
    variants: [
      { variant: 'sable', label: 'Sable', price: 18.90 },
      { variant: 'gris',  label: 'Gris',  price: 18.90 }
    ],
    defaultVariant: 'sable',
    info: { 'Matière': 'Mousse + tissu', 'Entretien': 'Housse lavable', 'Livraison': '2-4 jours ouvrés' },
    i18n: {
      en: {
        categoryLabel: "Prayer",
        badge: "Comfort",
        name: "Prayer cushion",
        tagline: "Support for the seated position",
        description: "An ergonomic cushion designed to support the back and knees during prayer, particularly useful in case of physical discomfort.",
        variantLabel: "Colour",
        variants: { "sable": ["Sand", "Sand"], "gris": ["Grey", "Grey"] },
        info: [["Material", "Foam + fabric"], ["Care", "Washable cover"], ["Delivery", "2–4 working days"]]
      }
    }
  },

  // ---------- PRÊT-À-PORTER ----------
  {
    id: 'qamis-homme',
    category: 'pret-a-porter',
    categoryLabel: 'Prêt-à-porter',
    subCategory: 'homme',
    subCategoryLabel: 'Qamis homme',
    icon: '👕',
    badge: 'Coupe classique',
    name: 'Qamis homme — Blanc',
    tagline: 'Coton doux, coupe droite',
    description: "Qamis en coton respirant, coupe droite classique, finitions soignées. Convient pour un usage quotidien comme pour la prière.",
    variantLabel: 'Taille',
    variants: [
      { variant: 'S', label: 'S',  price: 29.90 },
      { variant: 'M', label: 'M',  price: 29.90 },
      { variant: 'L', label: 'L',  price: 29.90 },
      { variant: 'XL', label: 'XL', price: 32.90 }
    ],
    defaultVariant: 'M',
    info: { 'Matière': '100% coton', 'Coloris': 'Blanc', 'Livraison': '2-4 jours ouvrés' },
    i18n: {
      en: {
        categoryLabel: "Clothing",
        subCategoryLabel: "Men’s qamis",
        badge: "Classic cut",
        name: "Men’s qamis — White",
        tagline: "Soft cotton, straight cut",
        description: "Breathable cotton qamis with a classic straight cut and careful finishing. Suitable for everyday wear as well as for prayer.",
        variantLabel: "Size",
        variants: { "S": ["S", "S"], "M": ["M", "M"], "L": ["L", "L"], "XL": ["XL", "XL"] },
        info: [["Material", "100% cotton"], ["Colour", "White"], ["Delivery", "2–4 working days"]]
      }
    }
  },
  {
    id: 'qamis-homme-gris',
    category: 'pret-a-porter',
    categoryLabel: 'Prêt-à-porter',
    subCategory: 'homme',
    subCategoryLabel: 'Qamis homme',
    icon: '👕',
    badge: 'Coupe classique',
    name: 'Qamis homme — Gris',
    tagline: 'Coton doux, coupe droite',
    description: "Même coupe classique que notre qamis best-seller, dans un coloris gris anthracite facile à assortir.",
    variantLabel: 'Taille',
    variants: [
      { variant: 'S', label: 'S',  price: 29.90 },
      { variant: 'M', label: 'M',  price: 29.90 },
      { variant: 'L', label: 'L',  price: 29.90 },
      { variant: 'XL', label: 'XL', price: 32.90 }
    ],
    defaultVariant: 'M',
    info: { 'Matière': '100% coton', 'Coloris': 'Gris', 'Livraison': '2-4 jours ouvrés' },
    i18n: {
      en: {
        categoryLabel: "Clothing",
        subCategoryLabel: "Men’s qamis",
        badge: "Classic cut",
        name: "Men’s qamis — Grey",
        tagline: "Soft cotton, straight cut",
        description: "The same classic cut as our best-selling qamis, in an easy-to-match anthracite grey.",
        variantLabel: "Size",
        variants: { "S": ["S", "S"], "M": ["M", "M"], "L": ["L", "L"], "XL": ["XL", "XL"] },
        info: [["Material", "100% cotton"], ["Colour", "Grey"], ["Delivery", "2–4 working days"]]
      }
    }
  },
  {
    id: 'qamis-homme-noir',
    category: 'pret-a-porter',
    categoryLabel: 'Prêt-à-porter',
    subCategory: 'homme',
    subCategoryLabel: 'Qamis homme',
    icon: '👕',
    badge: 'Coupe classique',
    name: 'Qamis homme — Noir',
    tagline: 'Coton doux, coupe droite',
    description: "Le même modèle apprécié, décliné en noir pour une allure sobre et élégante.",
    variantLabel: 'Taille',
    variants: [
      { variant: 'S', label: 'S',  price: 29.90 },
      { variant: 'M', label: 'M',  price: 29.90 },
      { variant: 'L', label: 'L',  price: 29.90 },
      { variant: 'XL', label: 'XL', price: 32.90 }
    ],
    defaultVariant: 'M',
    info: { 'Matière': '100% coton', 'Coloris': 'Noir', 'Livraison': '2-4 jours ouvrés' },
    i18n: {
      en: {
        categoryLabel: "Clothing",
        subCategoryLabel: "Men’s qamis",
        badge: "Classic cut",
        name: "Men’s qamis — Black",
        tagline: "Soft cotton, straight cut",
        description: "The same much-loved model, available in black for a sober, elegant look.",
        variantLabel: "Size",
        variants: { "S": ["S", "S"], "M": ["M", "M"], "L": ["L", "L"], "XL": ["XL", "XL"] },
        info: [["Material", "100% cotton"], ["Colour", "Black"], ["Delivery", "2–4 working days"]]
      }
    }
  },
  {
    id: 'qamis-capuche-homme',
    category: 'pret-a-porter',
    categoryLabel: 'Prêt-à-porter',
    subCategory: 'homme',
    subCategoryLabel: 'Qamis homme',
    icon: '🧥',
    badge: 'Nouveau modèle',
    name: 'Qamis à capuche',
    tagline: 'Style moderne, confort du quotidien',
    description: "Une version moderne du qamis, avec capuche et poche kangourou. Idéal pour un look décontracté sans compromis sur les valeurs vestimentaires.",
    variantLabel: 'Taille',
    variants: [
      { variant: 'S', label: 'S',  price: 34.90 },
      { variant: 'M', label: 'M',  price: 34.90 },
      { variant: 'L', label: 'L',  price: 34.90 },
      { variant: 'XL', label: 'XL', price: 37.90 }
    ],
    defaultVariant: 'M',
    info: { 'Matière': 'Coton molletonné', 'Style': 'Capuche + poche', 'Livraison': '2-4 jours ouvrés' },
    i18n: {
      en: {
        categoryLabel: "Clothing",
        subCategoryLabel: "Men’s qamis",
        badge: "New model",
        name: "Hooded qamis",
        tagline: "Modern style, everyday comfort",
        description: "A modern take on the qamis, with a hood and kangaroo pocket. Ideal for a relaxed look without compromising on modest dress.",
        variantLabel: "Size",
        variants: { "S": ["S", "S"], "M": ["M", "M"], "L": ["L", "L"], "XL": ["XL", "XL"] },
        info: [["Material", "Cotton fleece"], ["Style", "Hood + pocket"], ["Delivery", "2–4 working days"]]
      }
    }
  },
  {
    id: 'jilbab-femme',
    category: 'pret-a-porter',
    categoryLabel: 'Prêt-à-porter',
    subCategory: 'femme',
    subCategoryLabel: 'Jilbab & Abaya femme',
    icon: '🧕',
    badge: 'Tissu fluide',
    name: 'Jilbab femme — Sable',
    tagline: 'Tissu fluide non transparent',
    description: "Jilbab ample en tissu fluide et opaque, pensé pour le confort et la tenue toute la journée.",
    variantLabel: 'Taille',
    variants: [
      { variant: 'S', label: 'S',  price: 34.90 },
      { variant: 'M', label: 'M',  price: 34.90 },
      { variant: 'L', label: 'L',  price: 34.90 }
    ],
    defaultVariant: 'M',
    info: { 'Matière': 'Polyester fluide', 'Coloris': 'Sable', 'Livraison': '2-4 jours ouvrés' },
    i18n: {
      en: {
        categoryLabel: "Clothing",
        subCategoryLabel: "Women’s jilbab & abaya",
        badge: "Flowing fabric",
        name: "Women’s jilbab — Sand",
        tagline: "Flowing, non-transparent fabric",
        description: "A loose jilbab in flowing, opaque fabric, designed for comfort and all-day wear.",
        variantLabel: "Size",
        variants: { "S": ["S", "S"], "M": ["M", "M"], "L": ["L", "L"] },
        info: [["Material", "Flowing polyester"], ["Colour", "Sand"], ["Delivery", "2–4 working days"]]
      }
    }
  },
  {
    id: 'jilbab-femme-noir',
    category: 'pret-a-porter',
    categoryLabel: 'Prêt-à-porter',
    subCategory: 'femme',
    subCategoryLabel: 'Jilbab & Abaya femme',
    icon: '🧕',
    badge: 'Tissu fluide',
    name: 'Jilbab femme — Noir',
    tagline: 'Tissu fluide non transparent',
    description: "Le même jilbab fluide et confortable, décliné en noir intemporel.",
    variantLabel: 'Taille',
    variants: [
      { variant: 'S', label: 'S',  price: 34.90 },
      { variant: 'M', label: 'M',  price: 34.90 },
      { variant: 'L', label: 'L',  price: 34.90 }
    ],
    defaultVariant: 'M',
    info: { 'Matière': 'Polyester fluide', 'Coloris': 'Noir', 'Livraison': '2-4 jours ouvrés' },
    i18n: {
      en: {
        categoryLabel: "Clothing",
        subCategoryLabel: "Women’s jilbab & abaya",
        badge: "Flowing fabric",
        name: "Women’s jilbab — Black",
        tagline: "Flowing, non-transparent fabric",
        description: "The same flowing, comfortable jilbab, in timeless black.",
        variantLabel: "Size",
        variants: { "S": ["S", "S"], "M": ["M", "M"], "L": ["L", "L"] },
        info: [["Material", "Flowing polyester"], ["Colour", "Black"], ["Delivery", "2–4 working days"]]
      }
    }
  },
  {
    id: 'abaya-femme',
    category: 'pret-a-porter',
    categoryLabel: 'Prêt-à-porter',
    subCategory: 'femme',
    subCategoryLabel: 'Jilbab & Abaya femme',
    icon: '👗',
    badge: 'Nouveau modèle',
    name: 'Abaya classique',
    tagline: 'Coupe fluide, finitions brodées',
    description: "Abaya élégante à coupe fluide, avec finitions brodées discrètes sur les manches. Un modèle intemporel pour toutes les occasions.",
    variantLabel: 'Taille',
    variants: [
      { variant: 'S', label: 'S',  price: 39.90 },
      { variant: 'M', label: 'M',  price: 39.90 },
      { variant: 'L', label: 'L',  price: 39.90 }
    ],
    defaultVariant: 'M',
    info: { 'Matière': 'Crêpe fluide', 'Finitions': 'Broderies', 'Livraison': '2-4 jours ouvrés' },
    i18n: {
      en: {
        categoryLabel: "Clothing",
        subCategoryLabel: "Women’s jilbab & abaya",
        badge: "New model",
        name: "Classic abaya",
        tagline: "Flowing cut, embroidered finishing",
        description: "An elegant abaya with a flowing cut and discreet embroidered detailing on the sleeves. A timeless model for every occasion.",
        variantLabel: "Size",
        variants: { "S": ["S", "S"], "M": ["M", "M"], "L": ["L", "L"] },
        info: [["Material", "Flowing crepe"], ["Finishing", "Embroidery"], ["Delivery", "2–4 working days"]]
      }
    }
  },

  // ---------- DÉCORATION ----------
  {
    id: 'calligraphie-murale',
    category: 'decoration',
    categoryLabel: 'Décoration',
    icon: '🖼️',
    badge: 'Pièce unique',
    name: 'Calligraphie murale',
    tagline: 'Cadre bois, impression haute qualité',
    description: "Une calligraphie encadrée pour apporter sérénité et élégance à votre intérieur. Cadre en bois massif.",
    variantLabel: 'Format',
    variants: [
      { variant: '30x40', label: '30 x 40 cm', price: 22.00 },
      { variant: '40x60', label: '40 x 60 cm', price: 34.00 }
    ],
    defaultVariant: '30x40',
    info: { 'Matière': 'Cadre bois massif', 'Fixation': 'Kit inclus', 'Livraison': '3-5 jours ouvrés' },
    i18n: {
      en: {
        categoryLabel: "Home decor",
        badge: "One of a kind",
        name: "Wall calligraphy",
        tagline: "Wooden frame, high-quality print",
        description: "A framed calligraphy to bring serenity and elegance to your home. Solid wood frame.",
        variantLabel: "Format",
        variants: { "30x40": ["30 x 40 cm", "30 x 40 cm"], "40x60": ["40 x 60 cm", "40 x 60 cm"] },
        info: [["Material", "Solid wood frame"], ["Fixing", "Kit included"], ["Delivery", "3–5 working days"]]
      }
    }
  }
];

if (typeof window !== 'undefined') window.PRODUCTS = PRODUCTS;
if (typeof module !== 'undefined' && module.exports) module.exports = PRODUCTS;
