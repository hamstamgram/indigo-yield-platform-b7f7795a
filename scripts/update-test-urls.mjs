import fs from 'fs';
import path from 'path';

const dir = '/Users/mama/indigo-yield-platform-v01/tests/e2e';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.spec.ts'));

let updated = 0;
for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    const original = content;
    content = content.replace(/https:\/\/indigo-yield-platform\.lovable\.app/g, 'http://localhost:8080');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated URL in ${file}`);
        updated++;
    }
}
console.log(`Updated ${updated} files with localhost URL.`);
