// Catalogue central des produits — La Maison du Musulman
// Pour ajouter un produit : copier un bloc et changer les valeurs (id unique obligatoire)
window.PRODUCTS = [
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
    info: { 'Origine': 'Éthiopie (Habachia)', 'Usage': 'Cosmétique', 'Livraison': '2-4 jours ouvrés' }
  },
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
      { variant: 'gris',  label: 'Gris',   price: 15.00 }
    ],
    defaultVariant: 'sable',
    info: { 'Matière': 'Velours épais', 'Entretien': 'Lavable en machine', 'Livraison': '2-4 jours ouvrés' }
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
    variantLabel: null,
    variants: [
      { variant: 'unique', label: 'Modèle unique', price: 9.90 }
    ],
    defaultVariant: 'unique',
    info: { 'Matière': 'Bois naturel', 'Grains': '99', 'Livraison': '2-4 jours ouvrés' }
  },
  {
    id: 'qamis-homme',
    category: 'pret-a-porter',
    categoryLabel: 'Prêt-à-porter',
    icon: '👕',
    badge: 'Coupe classique',
    name: 'Qamis homme',
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
    info: { 'Matière': '100% coton', 'Entretien': 'Lavage 30°', 'Livraison': '2-4 jours ouvrés' }
  },
  {
    id: 'jilbab-femme',
    category: 'pret-a-porter',
    categoryLabel: 'Prêt-à-porter',
    icon: '🧕',
    badge: 'Tissu fluide',
    name: 'Jilbab femme',
    tagline: 'Tissu fluide non transparent',
    description: "Jilbab ample en tissu fluide et opaque, pensé pour le confort et la tenue toute la journée.",
    variantLabel: 'Taille',
    variants: [
      { variant: 'S', label: 'S',  price: 34.90 },
      { variant: 'M', label: 'M',  price: 34.90 },
      { variant: 'L', label: 'L',  price: 34.90 }
    ],
    defaultVariant: 'M',
    info: { 'Matière': 'Polyester fluide', 'Entretien': 'Lavage délicat', 'Livraison': '2-4 jours ouvrés' }
  },
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
    info: { 'Matière': 'Cadre bois massif', 'Fixation': 'Kit inclus', 'Livraison': '3-5 jours ouvrés' }
  }
];
