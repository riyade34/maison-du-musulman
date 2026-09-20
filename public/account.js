(async () => {
  const I18N = window.MDM_I18N;
  const message = document.getElementById('accountMessage');
  const authForms = document.getElementById('authForms');
  const accountPanel = document.getElementById('accountPanel');
  const authSetup = document.getElementById('authSetup');
  let client;

  const showMessage = (text, isError = false) => {
    message.textContent = text;
    message.className = `account-message is-visible${isError ? ' is-error' : ''}`;
  };
  const setBusy = (form, busy) => {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = busy;
    button.textContent = busy ? I18N.t('account.busy', 'Un instant…') : button.dataset.label;
  };
  const money = (cents, currency = 'eur') => I18N.moneyFromCents(cents, currency);
  const escapeHtml = (value) => String(value || '').replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character]));
  const loadOrders = async () => {
    const loading = document.getElementById('ordersLoading');
    const list = document.getElementById('ordersList');
    loading.hidden = false;
    loading.textContent = I18N.t('account.ordersLoading', 'Chargement des commandes…');
    list.innerHTML = '';
    const { data, error } = await client.from('orders').select('*').order('created_at', { ascending: false });
    if (error) {
      loading.textContent = I18N.t('account.ordersUnavailable', 'Historique momentanément indisponible.');
      return;
    }
    if (!data.length) {
      loading.textContent = I18N.t('account.ordersEmpty', 'Aucune commande pour le moment.');
      return;
    }
    loading.hidden = true;
    const withdrawalPath = I18N.path('/retractation.html');
    list.innerHTML = data.map((order) => `<article class="order-card"><div class="order-card-head"><strong>${I18N.t('account.orderOn', 'Commande du {date}', { date: I18N.formatDate(order.created_at) })}</strong><span>${money(order.total_cents, order.currency)}</span></div><div class="order-status">${I18N.t('account.paid', 'Payée')}</div><ul>${(order.items || []).map((item) => `<li>${escapeHtml(item.name)} × ${Number(item.quantity) || 1}</li>`).join('')}</ul><small>${I18N.t('account.reference', 'Référence')} ${escapeHtml(order.id).slice(0, 8).toUpperCase()}</small><p><a href="${withdrawalPath}?commande=${encodeURIComponent(order.id)}">${I18N.t('account.withdraw', 'Renoncer au contrat pour cette commande')}</a></p></article>`).join('');
  };
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const resetForm = document.getElementById('resetForm');
  const newPasswordForm = document.getElementById('newPasswordForm');
  const accountTabs = document.getElementById('authForms').querySelector('.account-tabs');
  const accountNote = document.getElementById('accountNote');

  const showResetForm = () => {
    accountTabs.hidden = true;
    loginForm.hidden = true; signupForm.hidden = true; newPasswordForm.hidden = true;
    resetForm.hidden = false; accountNote.hidden = true;
    message.className = 'account-message';
  };
  const showLoginForm = () => {
    accountTabs.hidden = false;
    resetForm.hidden = true; newPasswordForm.hidden = true; signupForm.hidden = true;
    loginForm.hidden = false; accountNote.hidden = false;
    document.querySelectorAll('.account-tab').forEach((tab) => tab.classList.toggle('is-active', tab.dataset.tab === 'login'));
    message.className = 'account-message';
  };

  const showAccount = (user) => {
    const name = user.user_metadata?.full_name || I18N.t('account.myAccount', 'Mon compte');
    authForms.hidden = true;
    accountPanel.hidden = false;
    document.getElementById('accountName').textContent = name;
    document.getElementById('accountEmail').textContent = user.email || '';
    document.getElementById('accountAvatar').textContent = name.charAt(0).toUpperCase();
    loadOrders();
  };
  const showForms = () => { authForms.hidden = false; accountPanel.hidden = true; showLoginForm(); };

  try {
    const cart = JSON.parse(localStorage.getItem('maison_du_musulman_cart') || '[]');
    document.getElementById('cartBadge').textContent = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
  } catch (error) {}

  document.querySelectorAll('.account-submit').forEach((button) => { button.dataset.label = button.textContent; });
  document.querySelectorAll('.account-tab').forEach((tab) => tab.addEventListener('click', () => {
    document.querySelectorAll('.account-tab').forEach((item) => item.classList.toggle('is-active', item === tab));
    document.getElementById('loginForm').hidden = tab.dataset.tab !== 'login';
    document.getElementById('signupForm').hidden = tab.dataset.tab !== 'signup';
    message.className = 'account-message';
  }));

  try {
    const response = await fetch('/api/auth-config');
    const config = await response.json();
    if (!response.ok || !config.configured || !window.supabase) throw new Error('not-configured');
    client = window.supabase.createClient(config.url, config.anonKey);
    const { data } = await client.auth.getSession();
    if (data.session?.user) showAccount(data.session.user);
    if (new URLSearchParams(location.search).get('commande') === 'connexion') showMessage(I18N.t('account.loginToOrder', 'Connectez-vous pour poursuivre votre commande.'));
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        authForms.hidden = false; accountPanel.hidden = true;
        accountTabs.hidden = true; loginForm.hidden = true; signupForm.hidden = true; resetForm.hidden = true; accountNote.hidden = true;
        newPasswordForm.hidden = false;
        return;
      }
      session?.user ? showAccount(session.user) : showForms();
    });
  } catch (error) {
    authForms.hidden = true;
    authSetup.hidden = false;
    return;
  }

  // Les liens envoyés par e-mail ramènent toujours sur /compte.html (adresse autorisée dans Supabase) :
  // la page française redirige vers /en/compte.html si le visiteur a choisi l’anglais.
  document.getElementById('signupForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(form, true);
    const data = new FormData(form);
    const { error } = await client.auth.signUp({ email: data.get('email'), password: data.get('password'), options: { data: { full_name: data.get('name') }, emailRedirectTo: `${location.origin}/compte.html` } });
    setBusy(form, false);
    if (error) { showMessage(error.message, true); return; }
    form.reset();
    showMessage(I18N.t('account.signupDone', 'Compte créé. Consultez votre e-mail pour confirmer votre inscription.'));
  });

  document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(form, true);
    const data = new FormData(form);
    const { error } = await client.auth.signInWithPassword({ email: data.get('email'), password: data.get('password') });
    setBusy(form, false);
    if (error) { showMessage(I18N.t('account.loginError', 'E-mail ou mot de passe incorrect.'), true); return; }
    if (sessionStorage.getItem('mdm_checkout_return')) {
      sessionStorage.removeItem('mdm_checkout_return');
      window.location.href = I18N.path('/panier.html');
    }
  });

  document.getElementById('logoutButton').addEventListener('click', async () => { await client.auth.signOut(); showForms(); });

  document.getElementById('forgotPasswordLink').addEventListener('click', () => {
    const currentEmail = document.getElementById('loginEmail').value;
    if (currentEmail) document.getElementById('resetEmail').value = currentEmail;
    showResetForm();
  });
  document.getElementById('cancelResetLink').addEventListener('click', showLoginForm);

  resetForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(form, true);
    const data = new FormData(form);
    const { error } = await client.auth.resetPasswordForEmail(data.get('email'), { redirectTo: `${location.origin}/compte.html` });
    setBusy(form, false);
    if (error) { showMessage(error.message, true); return; }
    showMessage(I18N.t('account.resetSent', 'Si un compte existe avec cette adresse, un e-mail de réinitialisation vient d’être envoyé.'));
  });

  newPasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(form, true);
    const data = new FormData(form);
    const { error } = await client.auth.updateUser({ password: data.get('password') });
    setBusy(form, false);
    if (error) { showMessage(error.message, true); return; }
    form.reset();
    showMessage(I18N.t('account.passwordUpdated', 'Mot de passe mis à jour. Vous pouvez continuer.'));
    const { data: sessionData } = await client.auth.getSession();
    if (sessionData.session?.user) showAccount(sessionData.session.user);
  });
})();
