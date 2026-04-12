import { storage } from './storage';

// All OSRS skills including the new Sailing skill
const SKILL_SEED_DATA = [
  // Combat skills
  { name: 'Attack', category: 'combat', icon: '⚔️', description: 'Combat skill for melee weapons' },
  { name: 'Strength', category: 'combat', icon: '💪', description: 'Combat skill for melee damage' },
  { name: 'Defence', category: 'combat', icon: '🛡️', description: 'Combat skill for defense' },
  { name: 'Ranged', category: 'combat', icon: '🏹', description: 'Projectile combat skill' },
  { name: 'Prayer', category: 'combat', icon: '🙏', description: 'Religious skill for buffs' },
  { name: 'Magic', category: 'combat', icon: '✨', description: 'Spellcasting and magic' },
  { name: 'Hitpoints', category: 'combat', icon: '❤️', description: 'Life points and health' },
  { name: 'Slayer', category: 'combat', icon: '⚔️', description: 'Monster hunting skill' },
  
  // Gathering skills
  { name: 'Mining', category: 'gathering', icon: '⛏️', description: 'Extracting ores and gems' },
  { name: 'Fishing', category: 'gathering', icon: '🎣', description: 'Catching fish from water' },
  { name: 'Woodcutting', category: 'gathering', icon: '🪓', description: 'Tree cutting and lumber' },
  { name: 'Hunter', category: 'gathering', icon: '🎯', description: 'Catching creatures and animals' },
  
  // Artisan skills
  { name: 'Cooking', category: 'artisan', icon: '🍳', description: 'Preparing food and meals' },
  { name: 'Firemaking', category: 'artisan', icon: '🔥', description: 'Creating fires and lighting' },
  { name: 'Crafting', category: 'artisan', icon: '🧵', description: 'Creating items from materials' },
  { name: 'Smithing', category: 'artisan', icon: '⚒️', description: 'Forging weapons and armor' },
  { name: 'Fletching', category: 'artisan', icon: '🏹', description: 'Creating bows and arrows' },
  { name: 'Herblore', category: 'artisan', icon: '🧪', description: 'Creating potions and remedies' },
  { name: 'Runecrafting', category: 'artisan', icon: '🔮', description: 'Creating magical runes' },
  { name: 'Construction', category: 'artisan', icon: '🏠', description: 'Building houses and furniture' },
  
  // Support skills
  { name: 'Agility', category: 'support', icon: '🏃', description: 'Physical dexterity and movement' },
  { name: 'Thieving', category: 'support', icon: '🗝️', description: 'Stealth and pickpocketing' },
  { name: 'Farming', category: 'support', icon: '🌱', description: 'Growing crops and plants' },
  { name: 'Sailing', category: 'support', icon: '⛵', description: 'Master the art of sailing and ocean exploration' },
];

/**
 * Seeds all OSRS skills into the database if they don't exist.
 * This function is idempotent - safe to run multiple times.
 * Runs on app startup to ensure skills exist in both dev and production.
 */
export async function seedSkills(): Promise<void> {
  console.log('🌱 Starting skill seeding...');
  
  let created = 0;
  let existing = 0;
  
  for (const skillData of SKILL_SEED_DATA) {
    try {
      const existingSkill = await storage.getSkillByName(skillData.name);
      
      if (!existingSkill) {
        await storage.createSkill({
          name: skillData.name,
          category: skillData.category,
          icon: skillData.icon,
          description: skillData.description,
          isActive: true
        });
        console.log(`  ✅ Created skill: ${skillData.icon} ${skillData.name}`);
        created++;
      } else {
        existing++;
      }
    } catch (error) {
      console.error(`  ❌ Failed to seed skill ${skillData.name}:`, error);
    }
  }
  
  console.log(`🌱 Skill seeding complete: ${created} created, ${existing} already existed`);
}
