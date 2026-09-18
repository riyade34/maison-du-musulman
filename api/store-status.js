module.exports = (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ open: process.env.STORE_OPEN === 'true' });
};
