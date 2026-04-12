// Customer rank system based on total spending
export interface CustomerRank {
  name: string;
  emoji: string;
  discountPercentage: number;
  minSpent: number; // in GP
  maxSpent: number; // in GP
  color: string; // hex color for display
  roleId: string; // Discord role ID for auto-assignment
}

export const CUSTOMER_RANKS: CustomerRank[] = [
  {
    name: "IRON",
    emoji: "🥉",
    discountPercentage: 1,
    minSpent: 100_000_000, // 100M GP
    maxSpent: 499_999_999, // 499M GP
    color: "#8B7355",
    roleId: "1414767189600370798" // 1% rank role
  },
  {
    name: "STEEL", 
    emoji: "⚪",
    discountPercentage: 2,
    minSpent: 500_000_000, // 500M GP
    maxSpent: 999_999_999, // 999M GP
    color: "#C0C0C0",
    roleId: "1414767429904633856" // 2% rank role
  },
  {
    name: "BLACK",
    emoji: "⚫",
    discountPercentage: 4,
    minSpent: 1_000_000_000, // 1B GP
    maxSpent: 1_999_999_999, // 1.999B GP
    color: "#2C2C2C",
    roleId: "1414767561748516966" // 4% rank role
  },
  {
    name: "ADAMANT",
    emoji: "🟢",
    discountPercentage: 6,
    minSpent: 2_000_000_000, // 2B GP
    maxSpent: 3_999_999_999, // 3.999B GP
    color: "#228B22",
    roleId: "1414767663225245718" // 6% rank role
  },
  {
    name: "RUNE",
    emoji: "🔵",
    discountPercentage: 8,
    minSpent: 4_000_000_000, // 4B GP
    maxSpent: Number.MAX_SAFE_INTEGER, // No upper limit
    color: "#4169E1",
    roleId: "1414767795945865237" // 8% rank role
  }
];

/**
 * Calculate customer rank based on total spent amount
 */
export function getCustomerRank(totalSpentGp: number, manualRank?: string | null): CustomerRank | null {
  // Check for manual rank override first
  if (manualRank) {
    const rank = CUSTOMER_RANKS.find(r => r.name === manualRank);
    if (rank) return rank;
  }

  // Start from no rank if under 100M spent
  if (totalSpentGp < 100_000_000) {
    return null;
  }

  // Find the appropriate rank
  for (const rank of CUSTOMER_RANKS) {
    if (totalSpentGp >= rank.minSpent && totalSpentGp <= rank.maxSpent) {
      return rank;
    }
  }

  // Fallback to highest rank if somehow above all limits
  return CUSTOMER_RANKS[CUSTOMER_RANKS.length - 1];
}

/**
 * Get discount percentage for a customer based on their total spent
 */
export function getCustomerDiscount(totalSpentGp: number, manualRank?: string | null): number {
  const rank = getCustomerRank(totalSpentGp, manualRank);
  return rank ? rank.discountPercentage : 0;
}

/**
 * Apply discount to a price based on customer's total spent
 */
export function applyCustomerDiscount(priceGp: number, totalSpentGp: number, manualRank?: string | null): {
  originalPrice: number;
  discountPercentage: number;
  discountAmount: number;
  finalPrice: number;
  rank: CustomerRank | null;
} {
  const rank = getCustomerRank(totalSpentGp, manualRank);
  const discountPercentage = rank ? rank.discountPercentage : 0;
  const discountAmount = Math.floor(priceGp * (discountPercentage / 100));
  const finalPrice = priceGp - discountAmount;

  return {
    originalPrice: priceGp,
    discountPercentage,
    discountAmount,
    finalPrice,
    rank
  };
}

/**
 * Format GP amount for display (e.g., 5000000 -> "5.0M GP")
 */
export function formatGPAmount(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)}B GP`;
  } else if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M GP`;
  } else if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(1)}K GP`;
  }
  return `${amount.toLocaleString()} GP`;
}

/**
 * Get rank progress info for a customer
 */
export function getRankProgress(totalSpentGp: number, manualRank?: string | null): {
  currentRank: CustomerRank | null;
  nextRank: CustomerRank | null;
  progressToNext: number; // percentage (0-100)
  amountToNext: number; // GP needed for next rank
} {
  const currentRank = getCustomerRank(totalSpentGp, manualRank);
  
  // Find next rank
  let nextRank: CustomerRank | null = null;
  for (const rank of CUSTOMER_RANKS) {
    if (totalSpentGp < rank.minSpent) {
      nextRank = rank;
      break;
    }
  }

  let progressToNext = 0;
  let amountToNext = 0;

  if (nextRank) {
    amountToNext = nextRank.minSpent - totalSpentGp;
    
    if (currentRank) {
      // Calculate progress within current rank range
      const rangeTotal = nextRank.minSpent - currentRank.minSpent;
      const currentProgress = totalSpentGp - currentRank.minSpent;
      progressToNext = Math.min(100, (currentProgress / rangeTotal) * 100);
    } else {
      // No current rank, progress to first rank
      progressToNext = (totalSpentGp / nextRank.minSpent) * 100;
    }
  } else if (currentRank && currentRank.name === "RUNE") {
    // Already at max rank
    progressToNext = 100;
    amountToNext = 0;
  }

  return {
    currentRank,
    nextRank,
    progressToNext,
    amountToNext
  };
}