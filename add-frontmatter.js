import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const typesDir = path.join(__dirname, 'src/content/docs/types');
const files = fs.readdirSync(typesDir).filter(f => f.endsWith('.md'));

files.forEach(file => {
  const filePath = path.join(typesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.startsWith('---')) {
    const title = file.replace('.md', '');
    const frontmatter = `---\ntitle: ${title}\ndescription: ${title}\n---\n\n`;
    fs.writeFileSync(filePath, frontmatter + content);
    console.log(`Added frontmatter to ${file}`);
  }
});

console.log('Done!');
