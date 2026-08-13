const path = require("path");
const fs = require("fs");

const pdfPath = path.join(__dirname, "aligned_sample.pdf");
const pdfBuffer = fs.readFileSync(pdfPath);
const pdfContent = pdfBuffer.toString("binary");

const pageMatches = pdfContent.match(/\/Type\s*\/Page\b/g);
console.log("PDF File Size:", pdfBuffer.length, "bytes");
console.log("Total PDF Page Count:", pageMatches ? pageMatches.length : 0);
