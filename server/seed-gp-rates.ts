import { storage } from './storage';

export async function seedGpRates() {
  const cryptoMethods = [
    { name: 'Bitcoin', icon: '₿', buyingRate: '0.150', sellingRate: '0.110', sortOrder: 1, isActive: true },
    { name: 'Ethereum', icon: '⟠', buyingRate: '0.150', sellingRate: '0.110', sortOrder: 2, isActive: true },
    { name: 'USDT (Tether)', icon: '₮', buyingRate: '0.150', sellingRate: '0.110', sortOrder: 3, isActive: true },
    { name: 'Binance', icon: '🔶', buyingRate: '0.150', sellingRate: '0.110', sortOrder: 4, isActive: true },
    { name: 'KuCoin', icon: '🔷', buyingRate: '0.150', sellingRate: '0.110', sortOrder: 5, isActive: true },
    { name: 'Litecoin', icon: 'Ł', buyingRate: '0.150', sellingRate: '0.110', sortOrder: 6, isActive: true },
    { name: 'Cardano', icon: '₳', buyingRate: '0.155', sellingRate: '0.110', sortOrder: 7, isActive: false },
    { name: 'Solana', icon: '◎', buyingRate: '0.155', sellingRate: '0.110', sortOrder: 8, isActive: false },
  ];

  const nonCryptoMethods = [
    { name: 'Payoneer', icon: '💳', buyingRate: '0.178', sortOrder: 20, isActive: true },
    { name: 'Venmo', icon: '💰', buyingRate: '0.178', sortOrder: 21, isActive: false },
    { name: 'Zelle', icon: '💵', buyingRate: '0.178', sortOrder: 22, isActive: false },
    { name: 'Chime', icon: '🏦', buyingRate: '0.178', sortOrder: 23, isActive: false },
  ];

  let created = 0;
  let skipped = 0;

  for (const method of cryptoMethods) {
    const existing = await storage.getGpRateByMethod(method.name);
    if (!existing) {
      await storage.createGpRate({
        methodName: method.name,
        methodType: 'crypto',
        methodCategory: 'both',
        buyingRate: method.buyingRate,
        sellingRate: method.sellingRate,
        icon: method.icon,
        sortOrder: method.sortOrder,
        isActive: method.isActive,
      });
      created++;
    } else {
      skipped++;
    }
  }

  for (const method of nonCryptoMethods) {
    const existing = await storage.getGpRateByMethod(method.name);
    if (!existing) {
      await storage.createGpRate({
        methodName: method.name,
        methodType: 'non_crypto',
        methodCategory: 'buying',
        buyingRate: method.buyingRate,
        sellingRate: null,
        icon: method.icon,
        sortOrder: method.sortOrder,
        isActive: method.isActive,
      });
      created++;
    } else {
      skipped++;
    }
  }

  console.log(`🌱 GP rates seeding complete: ${created} created, ${skipped} already existed`);
}
