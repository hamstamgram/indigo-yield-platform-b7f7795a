import fs from 'fs';
import path from 'path';

const dir = '/Users/mama/indigo-yield-platform-v01/tests/e2e';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.spec.ts'));

let updated = 0;
for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    const original = content;
    content = content.replace(/adriel@indigo\.fund/g, 'qa.admin@indigo.fund');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${file}`);
        updated++;
    }
}
console.log(`Updated ${updated} files.`);
