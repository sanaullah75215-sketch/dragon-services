# Dragon Services Discord Bot

## Overview
Dragon Services is a Discord bot management application for OSRS (Old School RuneScape) services. It offers a platform for managing bot commands, service offerings, and user interactions via both a web dashboard and a Discord bot. The project aims to provide a comprehensive and user-friendly experience for OSRS service providers, streamlining operations and enhancing customer interaction.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Updates (January 14, 2026)

### Sythe Vouch System
- **Manual Sythe Vouch Posting**: Staff can manually post Sythe forum vouches to Discord
  - `!sythevouch <username> <vouch content>` - Posts a vouch to the Sythe vouch channel (1414374807734190102)
  - Example: `!sythevouch JohnDoe Great service, fast and reliable! Would recommend to anyone.`
- **Database Tracking**: All vouches stored in `sythe_vouches` table to prevent duplicates
- **Automatic Scraper (Background)**: Attempts to scrape Sythe thread every 5 minutes
  - Tries RSS feed first, then HTML scraping
  - Note: Sythe has bot protection (403 Forbidden), so automatic scraping may not work reliably
  - Manual command provides reliable fallback
- **Vouch Channel**: Channel ID: 1414374807734190102
- **Sythe Thread**: https://www.sythe.org/threads/4326552/osrs-services-vouchers/
- **Staff Permissions Required**: Administrator or staff/admin/worker/moderator roles

## Recent Updates (December 27, 2025)

### RSN Tracking & Dink Webhook Integration
- **RuneScape Name Registration**: Staff can now link RuneScape usernames (RSNs) to ticket channels
  - `/rsn username:<rsn> [order_number]` - Register an RSN to receive Dink updates in the current channel
  - `/unrsn [username]` - Unregister an RSN (or unregister the current channel's RSN if no username provided)
- **Dink Webhook Endpoint**: `/api/dink` receives RuneLite game updates and routes them to the correct ticket channel
  - Supports all major Dink event types: DEATH, LEVEL, LOOT, SLAYER, QUEST, CLUE, COLLECTION, PET, SPEEDRUN, COMBAT_ACHIEVEMENT, etc.
  - Case-insensitive RSN matching using rsnLower field
  - Automatic Discord embed creation with event-specific formatting and colors
- **Auto-Unregister on Order Completion**: When `/complete-order` is executed, any RSN linked to that order or channel is automatically unregistered
- **Security Features**:
  - Staff-only permissions (Administrator or staff/admin/worker roles required)
  - Event type whitelist validation
  - Input sanitization for RSN and embed content (removes @mentions, limits length)
  - OSRS username length validation (12 char max)
- **One RSN Per Channel**: If a channel already has an RSN registered, it's automatically replaced with the new one

## Recent Updates (October 29, 2025)

### Customer Ranking System - Auto Discord Role Assignment
- **New VIP Rank Thresholds**: Higher spending requirements for premium tiers
- **Rank Ranges**:
  - 🥉 **IRON** (1% discount): 100M - 499M GP → Discord Role ID: 1414767189600370798
  - ⚪ **STEEL** (2% discount): 500M - 999M GP → Discord Role ID: 1414767429904633856
  - ⚫ **BLACK** (4% discount): 1B - 1.999B GP → Discord Role ID: 1414767561748516966
  - 🟢 **ADAMANT** (6% discount): 2B - 3.999B GP → Discord Role ID: 1414767663225245718
  - 🔵 **RUNE** (8% discount): 4B+ GP → Discord Role ID: 1414767795945865237
- **Entry Requirement**: Minimum 100M GP total spent to unlock first rank (IRON)
- **Auto-Applied**: Discounts automatically apply to all orders, quests, and skill training calculations
- **Discord Role Auto-Assignment**: When customers deposit or have GP removed, their Discord role is automatically updated
  - Old rank roles are removed
  - New rank role is assigned
  - Shown on wallet profile as "Discord Role Assigned"
  - Works on both deposits and withdrawals
- **Admin Override**: Admins can manually set ranks regardless of spending
- **Bug Fix**: `!delete` command now correctly updates `totalSpentGp` for customer wallets
  - GP removals count as "spent" for rank calculation
  - Role assignment triggered after both deposits and removals
  - Historical data corrected for affected customers

## Recent Updates (October 28, 2025)

### Wallet System - Simplified GP Management with Billions Support
- **Removed Conversion Rates**: No more dollar conversion ($0.20 per M) - all commands now use direct GP amounts only
- **Billions (B) Notation Support**: Easily manage large amounts with B notation
  - `1B` = 1,000M GP (1 billion GP)
  - `2.5B` = 2,500M GP (2.5 billion GP)
  - `500M` = 500M GP (500 million GP)
- **Unified Command Support**: All wallet commands now work with M and B notation
  - **Deposits**: `!deposit @user 200M`, `!deposit @user 1B worker`, `!deposit @user 2.5B`
  - **Removals**: `!delete @user 200M`, `!delete @user 1B worker`, `!delete @user 2.5B customer`
  - **Worker Management**: `!editdeposit @user 1.5B worker`, `!editlockdeposit @user 1B worker`
- **Dual Wallet Support**: Both customer and worker wallets supported across all commands
  - Defaults to customer wallet if not specified
  - Specify `customer` or `worker` for targeted operations
  - Smart selection (highest balance wallet) for `!delete` when type not specified
- **Updated Help Text**: All command examples now show M and B notation instead of dollar amounts
- **Clean Embeds**: All confirmations and notifications show GP amounts only, no currency conversions
- **Transaction Records**: All wallet transactions now store amounts as GP (millions) with currency set to 'GP'
- **Better UX**: Easier to understand and manage large GP amounts with billion notation
- **Backward Compatible**: M notation still works (200M, 500M, 1000M, etc.)

### GP Rates Admin Panel - Inactive Rates Now Visible
- **Show All Rates**: Admin panel now displays ALL payment methods (active + inactive) for full management
- **Visual Indicators**: Disabled rates shown with 50% opacity and red "Disabled" badge
- **Active-Only Discord Display**: `!rates` command still shows only active rates to customers
- **Duplicate Prevention**: Clear error messages when trying to create payment methods with duplicate names

### Skill Calculator - Method-Based Level Range Pricing (October 29, 2025)
- **Accurate Pricing by Level Ranges**: Calculator calculates prices based on which method applies to which level range
- **How It Works**: 
  - Each training method has a `minLevel` and `maxLevel` that determines its applicable range
  - Calculator shows each method separately with its specific level range
  - Example: Mining 60-70 with methods:
    - "Powermining" (levels 60-61): Shows only the XP/cost for 60-61
    - "Motherlode Mine" (levels 61-70): Shows only the XP/cost for 61-70
  - No grand total line - just individual method breakdowns
- **Smart Features**:
  - Prevents double-charging when methods overlap (uses sequential level tracking)
  - Skips methods with 0 XP ranges (like "61-61")
  - Detects and warns about gaps in coverage (missing level ranges)
  - Validates that all requested levels are covered by configured methods
  - Applies customer rank discounts proportionally across all methods
  - Shows clear breakdown with level ranges per method
- **Error Handling**: Clear user-friendly messages when methods are missing or incomplete

## System Architecture

### UI/UX Decisions
The project features a modern React frontend using Radix UI components with a shadcn/ui design system, styled with Tailwind CSS. It utilizes a Discord-inspired dark theme with custom CSS variables, aiming for a professional and visually organized interface. Key UI features include a complete CRUD interface for GP rates management, dual interfaces (bot and web dashboard) for flexibility, and visual organization of rates.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Wouter for routing, TanStack Query for state management, and Vite for building.
- **Backend**: Node.js with Express.js, TypeScript with ES modules, RESTful API architecture, and centralized error handling.
- **Bot Functionality**: Discord.js v14 for comprehensive bot features, including slash commands, rich embeds, interactive components, and centralized event handling.
- **Database Interaction**: Drizzle ORM for type-safe PostgreSQL operations, hosted on Neon serverless.
- **Authentication**: Discord bot token-based authentication and PostgreSQL session storage.
- **Feature Specifications**:
    - **Wallet Deposit System**: Supports direct GP deposits with Billions (B) notation, simplified commands, and GP-only transaction records.
    - **GP Rates System**: Comprehensive management of OSRS GP buying and selling rates for multiple payment methods (cryptocurrency and traditional), with a web-based admin panel for CRUD operations.
    - **Ticket Channel Organization**: Automatic movement of ticket channels to "Active Orders" category upon order creation.
    - **Full Job Description in Tickets**: Displays complete job descriptions in ticket channels, handling Discord character limits.
    - **Automatic Wallet Deduction for Orders**: Deducts order amounts from customer wallets upon creation, with balance verification and transaction tracking.
    - **Order Creation Improvements**: Uses Discord ID for customer identification, includes balance checks, and streamlines the payment flow.
    - **Special Offers**: Supports posting targeted offers by type (flash, weekly, limited, seasonal) with `@everyone` notifications.
    - **Worker Management**: Commands for auto-setup (`!worker`), removal (`!removeworker`), and deposit editing (`!editdeposit`), including automatic role assignment, wallet conversion, and deposit management.
    - **Worker Removal & Order Reposting**: Allows removal of workers from claimed orders with automatic reposting and deposit unlocking.

### System Design Choices
- **Data Persistence**: PostgreSQL with Neon serverless hosting, Drizzle ORM for type-safe database interactions.
- **Modularity**: Separation of concerns between frontend, backend, and bot logic.
- **Scalability**: Designed with serverless database for potential scaling.
- **Security**: Environment variable protection for credentials, admin-only restrictions for sensitive commands.

## External Dependencies

### Core Dependencies
- `@neondatabase/serverless`: PostgreSQL database connection.
- `discord.js`: Discord API library.
- `drizzle-orm`: Type-safe ORM for database operations.
- `express`: Web application framework.
- `@tanstack/react-query`: Server state management.

### UI and Design
- `@radix-ui/*`: Accessible UI primitives.
- `tailwindcss`: Utility-first CSS framework.
- `class-variance-authority`: Type-safe CSS class variant management.
- `lucide-react`: Icon library.

### Development Tools
- `vite`: Build tool and development server.
- `typescript`: Static type checking.
- `drizzle-kit`: Database migration and schema management.
- `esbuild`: Fast JavaScript bundler.

### Third-Party Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Discord API**: Real-time messaging and bot platform.
- **Replit Infrastructure**: Development environment and deployment.