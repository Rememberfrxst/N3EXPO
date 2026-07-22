import fs from 'fs/promises';
import path from 'path';

async function fixSellerIndex() {
  const filePath = path.join(process.cwd(), 'app', 'seller', 'index.tsx');
  let content = await fs.readFile(filePath, 'utf-8');

  // Fix imports: 
  // - Remove Text from react-native
  // - Add Image to react-native
  // - Add import { Text } from '@/components/Text';
  content = content.replace(
    /import \{ Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View \} from 'react-native';/,
    `import { Platform, ScrollView, StyleSheet, TouchableOpacity, View, Image } from 'react-native';\nimport { Text } from '@/components/Text';`
  );

  // Fix totalRevenue and totalSold
  content = content.replace(
    /const totalRevenue = SELLER_PRODUCTS\.reduce\(\(s, p\) => s \+ p\.revenue, 0\);/,
    `const totalRevenue = SELLER_PRODUCTS.reduce((s, p) => s + (p.sales * p.price), 0);`
  );
  content = content.replace(
    /const totalSold = SELLER_PRODUCTS\.reduce\(\(s, p\) => s \+ p\.sold, 0\);/,
    `const totalSold = SELLER_PRODUCTS.reduce((s, p) => s + p.sales, 0);`
  );

  // Fix LinearGradient -> Image
  content = content.replace(
    /<LinearGradient colors=\{product\.gradient as string\[\]\} style=\{styles\.productImg\} start=\{\{ x: 0, y: 0 \}\} end=\{\{ x: 1, y: 1 \}\} \/>/,
    `<Image source={{ uri: product.image }} style={styles.productImg} resizeMode="cover" />`
  );

  // Fix sold text
  content = content.replace(
    /\{product\.sold\} sold<\/Text>/,
    `{product.sales} sold</Text>`
  );

  // Fix revenue text
  content = content.replace(
    /formatPrice\(product\.revenue\)/,
    `formatPrice(product.sales * product.price)`
  );

  await fs.writeFile(filePath, content, 'utf-8');
  console.log('Fixed app/seller/index.tsx');
}

fixSellerIndex().catch(console.error);
