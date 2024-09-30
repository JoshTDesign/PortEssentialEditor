require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const xmlbuilder = require('xmlbuilder');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the "public" directory
app.use(express.static('public'));

// Set view engine as EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Route for rendering the form
app.get('/', (req, res) => {
  res.render('index');
});

// Handle form submission and XML generation
app.post('/save-as-xml', (req, res) => {
  const formData = req.body;
  
  // Create the root element "PortEssential"
  const xml = xmlbuilder.create('PortEssential');
  
  // Add Location with City and Country sub-elements
  const location = xml.ele('Location');
  location.ele('City', formData.city);
  location.ele('Country', formData.country);
  
  // Add PointsOfInterest element with multiple POIs
  const pointsOfInterest = xml.ele('PointsOfInterest');

  // Loop through up to 10 points of interest and assign POINumber automatically
  let poiIndex = 1;
  for (let i = 1; i <= 10; i++) {
    if (formData[`poiName${i}`]) {
      const poi = pointsOfInterest.ele('POI');
      poi.ele('POINumber', poiIndex++);  // Assign POINumber based on order
      poi.ele('PointOfInterest', formData[`poiName${i}`]);
      poi.ele('Break').raw('&#x2029;');  // Insert raw &#x2029; (hard return character)
      poi.ele('Distance', formData[`poiDistance${i}`]);
      poi.ele('Break').raw('&#x2029;');  // Insert raw &#x2029; (hard return character)
      poi.ele('POIDescription', formData[`poiDescription${i}`]);
      poi.ele('Break').raw('&#x2029;');  // Insert raw &#x2029; (hard return character)
    }
  }

  const xmlString = xml.end({ pretty: true });

  // Generate the file name based on the port (City) and Country values
  const port = formData.city.replace(/\s+/g, '_');      // Replace spaces with underscores
  const country = formData.country.replace(/\s+/g, '_'); // Replace spaces with underscores
  const xmlFileName = `${port}_${country}.xml`;

  const xmlDirectory = path.join(__dirname, 'xml_files');

  // Ensure the xml_files directory exists
  if (!fs.existsSync(xmlDirectory)) {
    fs.mkdirSync(xmlDirectory, { recursive: true });
  }

  const xmlFilePath = path.join(xmlDirectory, xmlFileName);

  // Write the XML file to the file system
  fs.writeFileSync(xmlFilePath, xmlString);

  // Return XML for download
  res.setHeader('Content-Disposition', `attachment; filename=${xmlFileName}`);
  res.setHeader('Content-Type', 'application/xml');
  res.send(xmlString);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
