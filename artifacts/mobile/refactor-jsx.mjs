import fs from 'fs/promises';
import path from 'path';

async function updateFile(filePath, replacements) {
  let content = await fs.readFile(filePath, 'utf-8');
  let original = content;
  
  for (const rep of replacements) {
    if (rep.regex) {
      content = content.replace(rep.regex, rep.replaceWith);
    } else if (rep.search) {
      content = content.split(rep.search).join(rep.replaceWith);
    }
  }

  // Ensure Image is imported from react-native if we use it
  if (content !== original && content.includes('<Image ')) {
    if (!content.includes('Image,')) {
      content = content.replace(/import\s+\{([\s\S]*?)\}\s+from\s+['"]react-native['"];/, (match, p1) => {
        if (!p1.includes('Image')) {
          return `import { ${p1.trim()}, Image } from 'react-native';`;
        }
        return match;
      });
    }
  }

  if (content !== original) {
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`Updated ${filePath}`);
  }
}

async function run() {
  const baseDir = path.join(process.cwd());
  
  await updateFile(path.join(baseDir, 'components', 'ProductCard.tsx'), [
    {
      regex: /<LinearGradient[\s\S]*?colors=\{product\.gradient as string\[\]\}[\s\S]*?style=\{styles\.image\}[\s\S]*?\/>/,
      replaceWith: `<Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />`
    }
  ]);

  await updateFile(path.join(baseDir, 'app', 'product', '[id].tsx'), [
    {
      regex: /<LinearGradient[\s\S]*?colors=\{product\.gradient as string\[\]\}[\s\S]*?style=\{\[\s*styles\.heroImg,\s*\{\s*opacity: fadeAnim\s*\}\s*\]\}[\s\S]*?\/>/,
      replaceWith: `<Animated.Image source={{ uri: product.image }} style={[styles.heroImg, { opacity: fadeAnim }]} resizeMode="cover" />`
    },
    {
      // This handles the similar products section
      regex: /<LinearGradient[\s\S]*?colors=\{product\.gradient as string\[\]\}[\s\S]*?style=\{styles\.similarImg\}[\s\S]*?\/>/g,
      replaceWith: `<Image source={{ uri: product.image }} style={styles.similarImg} resizeMode="cover" />`
    }
  ]);

  await updateFile(path.join(baseDir, 'app', '(tabs)', 'cart.tsx'), [
    {
      regex: /<LinearGradient[\s\S]*?colors=\{item\.product\.gradient as string\[\]\}[\s\S]*?style=\{styles\.itemImage\}[\s\S]*?\/>/g,
      replaceWith: `<Image source={{ uri: item.product.image }} style={styles.itemImage} resizeMode="cover" />`
    }
  ]);

  await updateFile(path.join(baseDir, 'app', '(tabs)', 'orders.tsx'), [
    {
      regex: /<LinearGradient[\s\S]*?colors=\{item\.gradient as string\[\]\}[\s\S]*?style=\{styles\.miniImage\}[\s\S]*?\/>/g,
      replaceWith: `<Image source={{ uri: item.image }} style={styles.miniImage} resizeMode="cover" />`
    }
  ]);

  await updateFile(path.join(baseDir, 'app', 'order', '[id].tsx'), [
    {
      regex: /<LinearGradient[\s\S]*?colors=\{item\.gradient as string\[\]\}[\s\S]*?style=\{styles\.itemImg\}[\s\S]*?\/>/g,
      replaceWith: `<Image source={{ uri: item.image }} style={styles.itemImg} resizeMode="cover" />`
    }
  ]);

  await updateFile(path.join(baseDir, 'app', 'seller', 'index.tsx'), [
    {
      regex: /<LinearGradient[\s\S]*?colors=\{product\.gradient as string\[\]\}[\s\S]*?style=\{styles\.productImg\}[\s\S]*?\/>/g,
      replaceWith: `<Image source={{ uri: product.image }} style={styles.productImg} resizeMode="cover" />`
    }
  ]);
  
  await updateFile(path.join(baseDir, 'context', 'CartContext.tsx'), [
    {
      search: `gradient: i.product.gradient,`,
      replaceWith: `image: i.product.image,`
    }
  ]);

}

run().catch(console.error);
