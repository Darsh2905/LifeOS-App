const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function getWeather(city) {
  if (!city) return null;
  const key = city.toLowerCase().trim();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;

  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) return null;

  try {
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&cnt=40`),
    ]);

    if (!currentRes.ok) return null;
    const current = await currentRes.json();
    const forecastData = forecastRes.ok ? await forecastRes.json() : { list: [] };

    // Build 5-day forecast from 3-hour intervals
    const dailyMap = {};
    for (const item of forecastData.list || []) {
      const date = item.dt_txt.split(' ')[0];
      if (!dailyMap[date]) {
        dailyMap[date] = { date, highs: [], lows: [], descriptions: [], icons: [] };
      }
      dailyMap[date].highs.push(item.main.temp_max);
      dailyMap[date].lows.push(item.main.temp_min);
      dailyMap[date].descriptions.push(item.weather[0].description);
      dailyMap[date].icons.push(item.weather[0].icon);
    }

    const forecast = Object.values(dailyMap).slice(0, 5).map(d => ({
      date: d.date,
      high: Math.round(Math.max(...d.highs)),
      low: Math.round(Math.min(...d.lows)),
      description: d.descriptions[Math.floor(d.descriptions.length / 2)],
      icon: d.icons[Math.floor(d.icons.length / 2)],
    }));

    const data = {
      current: {
        temp: Math.round(current.main.temp),
        feelsLike: Math.round(current.main.feels_like),
        description: current.weather[0].description,
        icon: current.weather[0].icon,
        humidity: current.main.humidity,
        wind: Math.round(current.wind.speed * 3.6), // m/s to km/h
        city: current.name,
        country: current.sys.country,
      },
      forecast,
    };

    cache.set(key, { data, timestamp: Date.now() });
    return data;
  } catch (err) {
    console.error('Weather fetch error:', err.message);
    return null;
  }
}

module.exports = { getWeather };
