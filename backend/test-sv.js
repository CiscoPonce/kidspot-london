const https = require('https');
https.get('https://maps.googleapis.com/maps/api/streetview?size=600x400&location=51.5,-0.1&return_error_code=true&key=INVALID', (res) => {
  console.log(res.statusCode);
});
