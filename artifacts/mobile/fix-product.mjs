import fs from 'fs/promises';
import path from 'path';

async function run() {
  const file = path.join(process.cwd(), 'app', 'product', '[id].tsx');
  let content = await fs.readFile(file, 'utf-8');

  if (!content.includes('Image,')) {
    content = content.replace(/import \{([\s\S]*?)\} from 'react-native';/, 'import { $1, Image } from \'react-native\';');
  }

  // Replace gradient colors in colorSwatches
  content = content.replace(/product\.gradient\[0\]/g, "'#1E3A5F'");
  content = content.replace(/product\.gradient\[1\]/g, "'#3B82F6'");
  content = content.replace(/shadeHex\(product\.gradient\[0\], -28\)/g, "'#1F2937'");
  content = content.replace(/shadeHex\(product\.gradient\[1\], 22\)/g, "'#4F46E5'");

  // Replace hero image
  content = content.replace(
    /<LinearGradient[\s\S]*?colors=\{product\.gradient as string\[\]\}[\s\S]*?style=\{StyleSheet\.absoluteFill\}[\s\S]*?start=\{slide\.start\}[\s\S]*?end=\{slide\.end\}[\s\S]*?\/>/,
    `<Image source={{ uri: product.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />`
  );

  // Remove hero center SvgIcon
  content = content.replace(
    /<View style=\{styles\.heroCenter\}>\s*<SvgIcon name=\{slide\.icon\} size=\{80\} color="rgba\(255,255,255,0\.25\)" \/>\s*<\/View>/,
    ``
  );

  // Remove badges
  content = content.replace(
    /\{\/\* Discount badge bottom-left \*\/\}[\s\S]*?\{\/\* Express badge bottom-right \*\/\}[\s\S]*?EXPRESS<\/Text>\s*<\/View>\s*\)\}/,
    `{/* Badges removed */}`
  );

  // Similar products image
  content = content.replace(
    /<LinearGradient colors=\{product\.gradient as string\[\]\} style=\{styles\.similarImg\} start=\{\{ x: 0, y: 0 \}\} end=\{\{ x: 1, y: 1 \}\} \/>/,
    `<Image source={{ uri: product.image }} style={styles.similarImg} resizeMode="cover" />`
  );
  
  await fs.writeFile(file, content, 'utf-8');
  console.log('Fixed app/product/[id].tsx');
}

run().catch(console.error);
