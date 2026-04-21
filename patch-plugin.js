import fs from 'fs';
import path from 'path';

const utilPath = path.join('node_modules', 'starlight-site-graph', 'sitemap', 'util.ts');
if (fs.existsSync(utilPath)) {
    let content = fs.readFileSync(utilPath, 'utf8');
    const oldCode = /export function slugifyPath\(path: string\) \{[\s\S]*?map\(\(segment\) => slug\(segment\)\)[\s\S]*?\}/;
    const newCode = `export function slugifyPath(path: string) {
	return encodeURI(path
		.split('/')
		.map((segment) => {
            return segment.toLowerCase()
                .replace(/\\s+/g, '-')
                .replace(/[^\\w\\u0400-\\u04FF-]+/g, '')
                .replace(/--+/g, '-')
                .trim();
        })
		.join('/'));
}`;
    if (content.match(oldCode)) {
        content = content.replace(oldCode, newCode);
        fs.writeFileSync(utilPath, content);
        console.log('Patched starlight-site-graph/sitemap/util.ts');
    } else {
        console.log('Plugin already patched or format changed');
    }
} else {
    console.log('Plugin path not found, skipping patch');
}
