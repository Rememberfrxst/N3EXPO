const fs = require('fs');
let code = fs.readFileSync('app/(tabs)/cart.tsx', 'utf8');

// 1. imports
code = code.replace(/import \{ Text \} from '@\/components\/Text';/, "import { Text } from '@/components/Text';\nimport Svg, { Path } from 'react-native-svg';\nimport { router } from 'expo-router';");

// 2. Icon definition
const iconDef = 
function BackChevronIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 640 640">
      <Path
        fill={color}
        d="M169.4 297.4C156.9 309.9 156.9 330.2 169.4 342.7L361.4 534.7C373.9 547.2 394.2 547.2 406.7 534.7C419.2 522.2 419.2 501.9 406.7 489.4L237.3 320L406.6 150.6C419.1 138.1 419.1 117.8 406.6 105.3C394.1 92.8 373.8 92.8 361.3 105.3L169.3 297.3z"
      />
    </Svg>
  );
}
;
code = code.replace(/export default function CartScreen\(\) \{/, iconDef + '\nexport default function CartScreen() {');

// 3. UI modifications
code = code.replace(
  /<View style=\{styles\.emptyHeader\}>\s*<Text style=\{\[styles\.screenTitle, \{ color: colors\.foreground \}\]\}>My Cart<\/Text>\s*<\/View>/g,
  <View style={styles.emptyHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <BackChevronIcon size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>My Cart</Text>
        </View>
);

code = code.replace(
  /<View style=\{\[styles\.header, \{ paddingTop: topPad \+ 10, backgroundColor: colors\.card, borderBottomColor: colors\.border, borderBottomWidth: 1 \}\]\}>\s*<Text style=\{\[styles\.screenTitle, \{ color: colors\.foreground \}\]\}>My Cart \(\{itemCount\}\)<\/Text>\s*<\/View>/g,
  <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <BackChevronIcon size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>My Cart ({itemCount})</Text>
      </View>
);

// 4. Styles
code = code.replace(
  /emptyHeader: \{ paddingHorizontal: 20, paddingBottom: 10 \},/,
  "emptyHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 12 },"
);
code = code.replace(
  /header: \{ paddingHorizontal: 20, paddingBottom: 14 \},/,
  "header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, gap: 12 },\\n  backBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },"
);

fs.writeFileSync('app/(tabs)/cart.tsx', code);
