(async () => {
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
    button.textContent = busy ? 'Un instant…' : button.dataset.label;
  };
  const showAccount = (user) => {
    const name = user.user_metadata?.full_name || 'Mon compte';
    authForms.hidden = true;
    accountPanel.hidden = false;
    document.getElementById('accountName').textContent = name;
    document.getElementById('accountEmail').textContent = user.email || '';
    document.getElementById('accountAvatar').textContent = name.charAt(0).toUpperCase();
  };
  const showForms = () => { authForms.hidden = false; accountPanel.hidden = true; };

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
    client.auth.onAuthStateChange((_event, session) => session?.user ? showAccount(session.user) : showForms());
  } catch (error) {
    authForms.hidden = true;
    authSetup.hidden = false;
    return;
  }

  document.getElementById('signupForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(form, true);
    const data = new FormData(form);
    const { error } = await client.auth.signUp({ email: data.get('email'), password: data.get('password'), options: { data: { full_name: data.get('name') }, emailRedirectTo: `${location.origin}/compte.html` } });
    setBusy(form, false);
    if (error) { showMessage(error.message, true); return; }
    form.reset();
    showMessage('Compte créé. Consultez votre e-mail pour confirmer votre inscription.');
  });

  document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(form, true);
    const data = new FormData(form);
    const { error } = await client.auth.signInWithPassword({ email: data.get('email'), password: data.get('password') });
    setBusy(form, false);
    if (error) showMessage('E-mail ou mot de passe incorrect.', true);
  });

  document.getElementById('logoutButton').addEventListener('click', async () => { await client.auth.signOut(); showForms(); });
})();
