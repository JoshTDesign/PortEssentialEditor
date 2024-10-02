require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const xmlbuilder = require('xmlbuilder');
const PDFDocument = require('pdfkit'); // Import PDFKit for PDF generation
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

// Handle XML generation
app.post('/save-as-xml', (req, res) => {
  const formData = req.body;
  
  const xml = xmlbuilder.create('PortEssential');
  
  // Add Location with City and Country sub-elements
  const location = xml.ele('Location');
  location.ele('City', formData.city);
  location.ele('Country', formData.country);

  // Add Points of Interest (POIs)
  const pointsOfInterest = xml.ele('PointsOfInterest');
  for (let i = 1; i <= 10; i++) {
    if (formData[`poiName${i}`]) {
      const poi = pointsOfInterest.ele('POI');
      poi.ele('PointOfInterest', formData[`poiName${i}`]);
      poi.ele('Distance', formData[`poiDistance${i}`]);
      poi.ele('POIDescription', formData[`poiDescription${i}`]);
    }
  }

  const xmlString = xml.end({ pretty: true });

  // Set file name based on city and country
  const fileName = `${formData.city}_${formData.country}.xml`;
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  res.setHeader('Content-Type', 'application/xml');
  res.send(xmlString);
});

// Handle PDF generation
app.post('/save-as-pdf', (req, res) => {
  const formData = req.body;
  
  const doc = new PDFDocument();
  const filePath = path.join(__dirname, `pdf_files/port_essential_${Date.now()}.pdf`);
  const stream = fs.createWriteStream(filePath);

  // Pipe the PDF to the writable stream
  doc.pipe(stream);

  // Add content to the PDF
  doc.fontSize(24).text('Port Essential Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(16).text(`City: ${formData.city}`);
  doc.fontSize(16).text(`Country: ${formData.country}`);
  doc.moveDown();

  // Add the Points of Interest
  doc.fontSize(20).text('Points of Interest:', { underline: true });
  for (let i = 1; i <= 10; i++) {
    if (formData[`poiName${i}`]) {
      doc.fontSize(14).text(`POI ${i}: ${formData[`poiName${i}`]}`);
      doc.text(`Distance: ${formData[`poiDistance${i}`]}`);
      doc.text(`Description: ${formData[`poiDescription${i}`]}`);
      doc.moveDown();
    }
  }

  doc.end();

  // When the PDF is ready, send it to the user
  stream.on('finish', () => {
    res.download(filePath, 'port_essential.pdf', (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).send('Error generating PDF.');
      }
    });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
