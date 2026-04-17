const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { getWeather } = require('../services/weather');

const router = express.Router();

// GET /api/weather?city=Mumbai
router.get('/', authenticate, async (req, res) => {
  let city = req.query.city;
  if (!city) {
    const setting = db.prepare("SELECT value FROM user_settings WHERE user_id = ? AND key = 'weather_city'").get(req.userId);
    city = setting?.value;
  }

  if (!city) return res.status(400).json({ error: 'No city specified. Set your city in settings or pass ?city=CityName' });

  const data = await getWeather(city);
  if (!data) return res.status(502).json({ error: 'Could not fetch weather data. Check your WEATHER_API_KEY.' });

  res.json(data);
});

module.exports = router;
