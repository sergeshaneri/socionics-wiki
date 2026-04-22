import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function addFrontmatterToDir(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file already has frontmatter (starts with --- after trimming whitespace)
    const trimmedContent = content.trimStart();
    if (!trimmedContent.startsWith('---')) {
      const title = file.replace('.md', '');
      const frontmatter = `---\ntitle: ${title}\ndescription: ${title}\n---\n\n`;
      fs.writeFileSync(filePath, frontmatter + content);
      console.log(`Added frontmatter to ${file}`);
    }
  });
}

// Add frontmatter to all markdown files in docs directory
const docsDir = path.join(__dirname, '..', 'src/content/docs');
addFrontmatterToDir(docsDir);

// Add frontmatter to subdirectories
const subdirs = ['types', 'concepts', 'relations', 'guides', 'reference'];
subdirs.forEach(subdir => {
  const subdirPath = path.join(docsDir, subdir);
  if (fs.existsSync(subdirPath)) {
    addFrontmatterToDir(subdirPath);
  }
});

console.log('Done!');
