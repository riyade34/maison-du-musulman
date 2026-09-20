(() => {
  const I18N = window.MDM_I18N;
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  const meta = document.getElementById('searchMeta');
  const params = new URLSearchParams(location.search);

  const normalize = (value) => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const priceFor = (product) => {
    const variant = product.variants.find((item) => item.variant === product.defaultVariant) || product.variants[0];
    return I18N.money(variant.price);
  };
  // La recherche porte sur les textes affichés dans la langue courante.
  const catalog = window.PRODUCTS.map((product) => I18N.product(product));

  const render = () => {
    const query = normalize(input.value.trim());
    const products = catalog.filter((product) => normalize([
      product.name, product.categoryLabel, product.subCategoryLabel,
      product.tagline, product.description, product.badge
    ].join(' ')).includes(query));

    meta.textContent = query ? I18N.tp('search.results', '{n} résultat', '{n} résultats', products.length) : I18N.t('search.allProducts', '{n} produits', { n: products.length });
    if (!products.length) {
      results.innerHTML = '<div class="search-empty"><strong>' + I18N.t('search.none', 'Aucun produit trouvé.') + '</strong><br>' + I18N.t('search.hint', 'Essayez un autre mot, par exemple « prière » ou « nigelle ».') + '</div>';
      return;
    }

    results.innerHTML = products.map((product) => `<a class="search-card" href="${I18N.path('/produit.html')}?id=${encodeURIComponent(product.id)}"><span class="search-card-icon">${product.icon}</span><small>${product.categoryLabel}</small><strong>${product.name}</strong><span>${product.tagline || ''}</span><em>${I18N.t('search.from', 'À partir de {price}', { price: priceFor(product) })}</em></a>`).join('');
  };

  try {
    const cart = JSON.parse(localStorage.getItem('maison_du_musulman_cart') || '[]');
    document.getElementById('cartBadge').textContent = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
  } catch (error) {}

  input.value = params.get('q') || '';
  input.addEventListener('input', render);
  document.getElementById('searchForm').addEventListener('submit', (event) => { event.preventDefault(); render(); });
  render();
})();
