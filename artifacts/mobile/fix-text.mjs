import fs from 'fs/promises';
import path from 'path';

async function walk(dir, fileList = []) {
  const files = await fs.readdir(dir);
  for (const file of files) {
    const stat = await fs.stat(path.join(dir, file));
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        fileList = await walk(path.join(dir, file), fileList);
      }
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        fileList.push(path.join(dir, file));
      }
    }
  }
  return fileList;
}

async function fixFile(filePath) {
  // Skip the Text component itself
  if (filePath.endsWith('components\\Text.tsx') || filePath.endsWith('components/Text.tsx')) return;
  if (filePath.endsWith('constants\\typography.ts') || filePath.endsWith('constants/typography.ts')) return;

  let content = await fs.readFile(filePath, 'utf-8');
  
  // Find import { ... Text ... } from 'react-native'
  // and replace it with import { ... } from 'react-native'
  // Then append import { Text } from '@/components/Text';
  
  const rnImportRegex = /import\s+\{([^}]*)\bText\b([^}]*)\}\s+from\s+['"]react-native['"];?/g;
  let matches = [...content.matchAll(rnImportRegex)];
  
  if (matches.length > 0) {
    let modified = content;
    
    for (const match of matches) {
      const fullImport = match[0];
      const beforeText = match[1];
      const afterText = match[2];
      
      // Clean up the inner import list
      let newInner = (beforeText + afterText)
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .join(', ');
        
      if (newInner.length === 0) {
        // If Text was the only import, remove the whole statement
        modified = modified.replace(fullImport, `import { Text } from '@/components/Text';`);
      } else {
        // Replace with the new import list and add custom Text import on the next line
        modified = modified.replace(
          fullImport,
          `import { ${newInner} } from 'react-native';\nimport { Text } from '@/components/Text';`
        );
      }
    }
    
    if (content !== modified) {
      await fs.writeFile(filePath, modified, 'utf-8');
      console.log(`Updated ${filePath}`);
    }
  }
}

async function run() {
  const srcDirs = [
    path.join(process.cwd(), 'app'),
    path.join(process.cwd(), 'components'),
  ];
  
  for (const dir of srcDirs) {
    try {
      const files = await walk(dir);
      for (const file of files) {
        await fixFile(file);
      }
    } catch (e) {
      console.error(`Error walking ${dir}:`, e);
    }
  }
}

run().catch(console.error);
