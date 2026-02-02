const fs = require("fs");

const inputFile = process.argv[2];
const outputFile = process.argv[3];

const content = fs.readFileSync(inputFile, "utf-8");

// Parse the JSON wrapper
const jsonData = JSON.parse(content);
const text = jsonData[0].text;

// Extract data between untrusted markers
const startMarker = /\[{\\"/;
const endMarker = /}\]\n</;

const match = text.match(startMarker);
if (!match) {
  console.error("Could not find data start");
  process.exit(1);
}

const startIdx = match.index;
const dataSection = text.substring(startIdx);

// Find the end
const endMatch = dataSection.match(endMarker);
if (!endMatch) {
  console.error("Could not find data end");
  process.exit(1);
}

const jsonString = dataSection.substring(0, endMatch.index + 2);

// Unescape the JSON
const unescaped = jsonString.replace(/\\"/g, '"').replace(/\\\\/g, "\\");

// Write to output
fs.writeFileSync(outputFile, unescaped);
console.log(`Extracted JSON to ${outputFile}`);
