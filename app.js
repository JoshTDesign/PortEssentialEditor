require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer'); // For handling file uploads
const { PDFDocument } = require('pdf-lib'); // For creating fillable PDF fields
const PDFKit = require('pdfkit'); // For generating the main PDF content
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

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

// Handle PDF generation with PNG file and add a fillable text field
app.post('/save-as-pdf', upload.single('pngFile'), async (req, res) => {
  const formData = req.body;
  const pngFilePath = req.file ? req.file.path : null; // Path to uploaded PNG file

  // Step 1: Create the initial PDF with PDFKit
  const pdfPath = path.join(__dirname, `pdf_files/port_essential_${Date.now()}.pdf`);
  const pdfKitDoc = new PDFKit({ size: 'letter', layout: 'landscape' });
  const pdfKitStream = fs.createWriteStream(pdfPath);

  pdfKitDoc.pipe(pdfKitStream);

  // Background
  pdfKitDoc.image('resources/Background.png', 0, 0, {
    fit: [(792), (612)],
    align: 'center',
    valign: 'center'
  });

  // Add content to the PDF with PDFKit
  pdfKitDoc.font('fonts/Minion3Display-Regular.otf').fontSize(24).text(`${formData.city}, ${formData.country}`, 414, 62, {
    width: 360,
    align: 'left'
  });
  pdfKitDoc.moveDown();

  // Add Points of Interest to the PDF
  for (let i = 1; i <= 10; i++) {
    if (formData[`poiName${i}`]) {
      pdfKitDoc.fontSize(14).text(`POI ${i}: ${formData[`poiName${i}`]}`);
      pdfKitDoc.text(`Distance: ${formData[`poiDistance${i}`]}`);
      pdfKitDoc.text(`Description: ${formData[`poiDescription${i}`]}`);
      pdfKitDoc.moveDown();
    }
  }

  // Add the uploaded PNG image (if it exists)
  if (pngFilePath) {
    pdfKitDoc.addPage();
    const margin = 9;  // 1/8 inch margin in PDF points
    const availableWidth = 792 - (2 * margin); // Width of the letter page in landscape - margin
    const availableHeight = 612 - (2 * margin); // Height of the letter page in landscape - margin

    pdfKitDoc.image(pngFilePath, margin, margin, {
      fit: [availableWidth, availableHeight],
      align: 'center',
      valign: 'center'
    });
  }

  pdfKitDoc.end();

  // Wait for the PDFKit document to finish writing
  await new Promise((resolve) => pdfKitStream.on('finish', resolve));

  // Step 2: Add a fillable text field using pdf-lib
  const existingPdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  // Add a fillable text field on the first page
  const form = pdfDoc.getForm();
  const page = pdfDoc.getPage(0);

  // Add a text field to the first page at the top
  const textField = form.createTextField('userTextInput');
    textField.setText('');
  // Remove the border from the text field
    textField.addToPage(page, {
    x: 50, // Position from the left
    y: 550, // Position from the bottom (adjust to where you want it)
    width: 500, // Width of the text field
    height: 30 // Height of the text field
  });

  // Save the updated PDF with the text field
  const pdfBytes = await pdfDoc.save();
  const finalPdfPath = path.join(__dirname, `pdf_files/final_port_essential_${Date.now()}.pdf`);
  fs.writeFileSync(finalPdfPath, pdfBytes);

  // Send the updated PDF to the user
  res.download(finalPdfPath, 'port_essential.pdf', (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      res.status(500).send('Error generating PDF.');
    } else {
      // Clean up the uploaded PNG file after the PDF is sent
      if (pngFilePath) {
        fs.unlinkSync(pngFilePath);
      }
      // Clean up temporary files
      fs.unlinkSync(pdfPath);
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
