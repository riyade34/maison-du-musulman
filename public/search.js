(() => {
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  const meta = document.getElementById('searchMeta');
  const params = new URLSearchParams(location.search);

  const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const priceFor = (product) => {
    const variant = product.variants.find((item) => item.variant === product.defaultVariant) || product.variants[0];
    return variant.price.toFixed(2).replace('.', ',') + ' €';
  };

  const render = () => {
    const query = normalize(input.value.trim());
    const products = window.PRODUCTS.filter((product) => normalize([
      product.name, product.categoryLabel, product.subCategoryLabel,
      product.tagline, product.description, product.badge
    ].join(' ')).includes(query));

    meta.textContent = query ? `${products.length} résultat${products.length > 1 ? 's' : ''}` : `${products.length} produits`;
    if (!products.length) {
      results.innerHTML = '<div class="search-empty"><strong>Aucun produit trouvé.</strong><br>Essayez un autre mot, par exemple « prière » ou « nigelle ».</div>';
      return;
    }

    results.innerHTML = products.map((product) => `<a class="search-card" href="/produit.html?id=${encodeURIComponent(product.id)}"><span class="search-card-icon">${product.icon}</span><small>${product.categoryLabel}</small><strong>${product.name}</strong><span>${product.tagline || ''}</span><em>À partir de ${priceFor(product)}</em></a>`).join('');
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
