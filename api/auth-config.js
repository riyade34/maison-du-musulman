module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    res.status(503).json({ configured: false });
    return;
  }

  res.status(200).json({ configured: true, url, anonKey });
};
