const query = '[out:json][timeout:10];(node["leisure"="park"](around:5000,51.5429,0.0121););out center 2;';
fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'KidSpotLondon/1.0'
  },
  body: 'data=' + encodeURIComponent(query)
})
  .then(res => res.text().then(text => console.log(res.status, text.substring(0, 100))))
  .catch(err => console.error(err));
