import fs from 'fs';
const content = fs.readFileSync('seed_output.txt', 'utf8');
console.log("seed_output.txt content:");
console.log(content);
