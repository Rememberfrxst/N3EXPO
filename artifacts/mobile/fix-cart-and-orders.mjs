import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Move cart.tsx from app/(tabs)/ to app/
const tabsCartPath = path.join(__dirname, 'app', '(tabs)', 'cart.tsx');
const rootCartPath = path.join(__dirname, 'app', 'cart.tsx');
if (fs.existsSync(tabsCartPath)) {
  fs.renameSync(tabsCartPath, rootCartPath);
  console.log('Moved cart.tsx to app/');
}

// 2. Update app/_layout.tsx to include cart screen and includeFontPadding: false
const rootLayoutPath = path.join(__dirname, 'app', '_layout.tsx');
let rootLayout = fs.readFileSync(rootLayoutPath, 'utf8');

if (!rootLayout.includes('<Stack.Screen name="cart"')) {
  rootLayout = rootLayout.replace(
    '<Stack.Screen name="(tabs)" options={{ headerShown: false }} />',
    '<Stack.Screen name="(tabs)" options={{ headerShown: false }} />\n      <Stack.Screen name="cart" options={{ headerShown: false, animation: "slide_from_bottom" }} />'
  );
}

if (!rootLayout.includes('includeFontPadding: false')) {
  rootLayout = rootLayout.replace(
    `headerTitleStyle: { fontFamily: 'GoogleSans_600SemiBold', fontSize: 17, color: colors.foreground },`,
    `headerTitleStyle: { fontFamily: 'GoogleSans_600SemiBold', fontSize: 17, color: colors.foreground, includeFontPadding: false },`
  );
}

fs.writeFileSync(rootLayoutPath, rootLayout, 'utf8');
console.log('Updated app/_layout.tsx');

// 3. Update app/(tabs)/_layout.tsx to add href: "/cart"
const tabsLayoutPath = path.join(__dirname, 'app', '(tabs)', '_layout.tsx');
let tabsLayout = fs.readFileSync(tabsLayoutPath, 'utf8');

if (!tabsLayout.includes("href: '/cart'")) {
  tabsLayout = tabsLayout.replace(
    `name="cart"
        options={{
          title: '',`,
    `name="cart"
        options={{
          href: '/cart',
          title: '',`
  );
  fs.writeFileSync(tabsLayoutPath, tabsLayout, 'utf8');
  console.log('Updated app/(tabs)/_layout.tsx');
}

// 4. Update cart.tsx to add back button in headers
let cartCode = fs.readFileSync(rootCartPath, 'utf8');

// For empty state header
if (!cartCode.includes('styles.emptyHeader, { flexDirection: \'row\'')) {
  cartCode = cartCode.replace(
    `        <View style={styles.emptyHeader}>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>My Cart</Text>
        </View>`,
    `        <View style={[styles.emptyHeader, { flexDirection: 'row', alignItems: 'center' }]}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
            <SvgIcon name="chevron-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>My Cart</Text>
        </View>`
  );
}

// For populated state header
if (!cartCode.includes('<TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>')) {
  cartCode = cartCode.replace(
    `      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>My Cart ({itemCount})</Text>
      </View>`,
    `      <View style={[styles.header, { paddingTop: topPad + 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <SvgIcon name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>My Cart ({itemCount})</Text>
      </View>`
  );
}

// Ensure header styles don't conflict (e.g. remove paddingBottom/px if already in inline)
cartCode = cartCode.replace(
  `  header: { paddingHorizontal: 20, paddingBottom: 15 },`,
  `  header: { },`
);
cartCode = cartCode.replace(
  `  emptyHeader: { paddingHorizontal: 24, paddingBottom: 16 },`,
  `  emptyHeader: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 10 },`
);

fs.writeFileSync(rootCartPath, cartCode, 'utf8');
console.log('Updated app/cart.tsx');

// 5. Update app/order/[id].tsx tracking UI
const orderDetailsPath = path.join(__dirname, 'app', 'order', '[id].tsx');
let orderDetails = fs.readFileSync(orderDetailsPath, 'utf8');

// Remove icon wrap from tracking UI
if (orderDetails.includes('<View style={[styles.timelineIconWrap')) {
  orderDetails = orderDetails.replace(
    / *<View style=\{\[styles\.timelineIconWrap, \{ backgroundColor: done \? colors\.success \+ '20' : colors\.muted \}\]\}>\n *<SvgIcon name=\{step\.icon as any\} size=\{18\} color=\{done \? colors\.success : colors\.mutedForeground\} \/>\n *<\/View>\n/g,
    ''
  );
}

// Fix marginVertical for timelineLine to connect properly
orderDetails = orderDetails.replace(
  `  timelineLine: { flex: 1, width: 2, marginVertical: 4 },`,
  `  timelineLine: { flex: 1, width: 2, marginVertical: 0 },`
);

fs.writeFileSync(orderDetailsPath, orderDetails, 'utf8');
console.log('Updated app/order/[id].tsx');
