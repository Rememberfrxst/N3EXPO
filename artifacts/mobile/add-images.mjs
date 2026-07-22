import fs from 'fs/promises';
import path from 'path';

async function updateData() {
  const filePath = path.join(process.cwd(), 'constants', 'data.ts');
  let content = await fs.readFile(filePath, 'utf-8');

  // Update interfaces
  content = content.replace(/gradient:\s*\[string,\s*string\];/g, 'image: string;');
  
  // Define some demo images for categories
  const categoryImages = {
    'electronics': [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80', // phone
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&q=80', // watch
      'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&q=80', // phone
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80', // headphones
    ],
    'clothing': [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80', // tshirt
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&q=80', // jacket
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80', // jeans
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500&q=80', // clothes
    ],
    'shoes': [ // Just in case
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80',
    ],
    'default': [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80', // watch
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&q=80', // polaroid
    ]
  };

  // State for cycling images
  let imgIndex = 0;

  // Replace gradient: ['#...','#...'] with image: 'url' in PRODUCTS
  const productRegex = /(category:\s*['"]([^'"]+)['"][\s\S]*?)gradient:\s*\[\s*['"][^'"]+['"]\s*,\s*['"][^'"]+['"]\s*\]/g;
  
  content = content.replace(productRegex, (match, p1, category) => {
    const images = categoryImages[category.toLowerCase()] || categoryImages['default'];
    const selectedImage = images[imgIndex % images.length];
    imgIndex++;
    return `${p1}image: '${selectedImage}'`;
  });

  // Since OrderItem and SellerProduct don't have category explicitly in their mock data, 
  // we'll just replace any remaining gradients with a default image.
  const remainingGradientRegex = /gradient:\s*\[\s*['"][^'"]+['"]\s*,\s*['"][^'"]+['"]\s*\]/g;
  content = content.replace(remainingGradientRegex, () => {
    const selectedImage = categoryImages['default'][imgIndex % categoryImages['default'].length];
    imgIndex++;
    return `image: '${selectedImage}'`;
  });

  await fs.writeFile(filePath, content, 'utf-8');
  console.log('Updated data.ts');
}

updateData().catch(console.error);
