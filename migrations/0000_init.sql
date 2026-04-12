CREATE TABLE "bot_commands" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"command_name" text NOT NULL,
	"description" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"usage_count" text DEFAULT '0' NOT NULL,
	"last_used" timestamp,
	CONSTRAINT "bot_commands_command_name_unique" UNIQUE("command_name")
);
--> statement-breakpoint
CREATE TABLE "bot_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_table" (
	"level" integer PRIMARY KEY NOT NULL,
	"experience" bigint NOT NULL,
	"experience_to_next" bigint
);
--> statement-breakpoint
CREATE TABLE "gp_rates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"method_name" text NOT NULL,
	"method_type" text NOT NULL,
	"method_category" text NOT NULL,
	"buying_rate" numeric(10, 3),
	"selling_rate" numeric(10, 3),
	"icon" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gp_rates_method_name_unique" UNIQUE("method_name")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"service_type" text NOT NULL,
	"service_id" varchar,
	"service_name" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_gp" bigint NOT NULL,
	"total_price_gp" bigint NOT NULL,
	"configuration" json DEFAULT '{}'::json,
	"status" text DEFAULT 'pending' NOT NULL,
	"worker_user_id" text,
	"worker_username" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"order_item_id" varchar,
	"previous_status" text,
	"new_status" text NOT NULL,
	"updated_by" text NOT NULL,
	"updated_by_username" text NOT NULL,
	"notes" text,
	"is_system_update" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"user_id" text NOT NULL,
	"username" text NOT NULL,
	"wallet_id" varchar NOT NULL,
	"worker_id" text,
	"worker_username" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_amount_gp" bigint NOT NULL,
	"original_amount_gp" bigint NOT NULL,
	"discount_applied" integer DEFAULT 0 NOT NULL,
	"discount_amount_gp" bigint DEFAULT 0 NOT NULL,
	"customer_rank" text,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"locked_deposit_gp" bigint DEFAULT 0 NOT NULL,
	"notes" text,
	"admin_notes" text,
	"estimated_completion_time" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"type" text NOT NULL,
	"icon" text,
	"description" text,
	"address" text,
	"min_amount" numeric(10, 2) DEFAULT '1.00',
	"max_amount" numeric(10, 2) DEFAULT '1000.00',
	"fee_percentage" numeric(5, 2) DEFAULT '0.00',
	"fee_fixed" numeric(10, 2) DEFAULT '0.00',
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deposit_enabled" boolean DEFAULT true NOT NULL,
	"is_withdrawal_enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quest_pricing" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_id" varchar NOT NULL,
	"service_type" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"duration" text,
	"description" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"requirements" text,
	"icon" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rsn_registrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rsn" text NOT NULL,
	"rsn_lower" text NOT NULL,
	"channel_id" text NOT NULL,
	"guild_id" text NOT NULL,
	"order_id" varchar,
	"order_number" text,
	"registered_by" text NOT NULL,
	"registered_by_username" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"category" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"options" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"icon" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "special_offers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"discount_percentage" integer,
	"discount_amount" text,
	"original_price" text,
	"sale_price" text,
	"items" json DEFAULT '[]'::json,
	"offer_type" text NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"image_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sythe_vouches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" text NOT NULL,
	"author_username" text NOT NULL,
	"author_profile_url" text,
	"vouch_content" text NOT NULL,
	"post_url" text,
	"posted_at" timestamp,
	"discord_message_id" text,
	"is_posted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sythe_vouches_post_id_unique" UNIQUE("post_id")
);
--> statement-breakpoint
CREATE TABLE "training_methods" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_id" varchar NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"description" text,
	"gp_per_xp" numeric(10, 2) NOT NULL,
	"xp_per_hour" integer DEFAULT 50000,
	"min_level" integer DEFAULT 1,
	"max_level" integer DEFAULT 99,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_interactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"username" text NOT NULL,
	"service_id" text NOT NULL,
	"selected_option" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_wallets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"username" text NOT NULL,
	"user_type" text DEFAULT 'customer' NOT NULL,
	"profile_image_url" text,
	"balance_gp" bigint DEFAULT 0 NOT NULL,
	"total_deposited_gp" bigint DEFAULT 0 NOT NULL,
	"working_deposit_gp" bigint DEFAULT 0 NOT NULL,
	"total_spent_gp" bigint DEFAULT 0 NOT NULL,
	"total_earnings_gp" bigint DEFAULT 0 NOT NULL,
	"completed_jobs" integer DEFAULT 0 NOT NULL,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"manual_rank" text,
	"customer_rank" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_wallets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "vouches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_user_id" text NOT NULL,
	"voucher_username" text NOT NULL,
	"vouched_user_id" text NOT NULL,
	"vouched_username" text NOT NULL,
	"vouch_type" text NOT NULL,
	"is_positive" boolean DEFAULT true NOT NULL,
	"reason" text NOT NULL,
	"service_context" text,
	"order_id" varchar,
	"order_number" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"moderation_notes" text,
	"moderated_by" text,
	"moderated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" varchar NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"amount_gp" bigint,
	"currency" text NOT NULL,
	"description" text NOT NULL,
	"reference_id" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"metadata" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_wallet_id_user_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."user_wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_pricing" ADD CONSTRAINT "quest_pricing_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsn_registrations" ADD CONSTRAINT "rsn_registrations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_methods" ADD CONSTRAINT "training_methods_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouches" ADD CONSTRAINT "vouches_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_user_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."user_wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_order_items_order_id" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_service_type" ON "order_items" USING btree ("service_type");--> statement-breakpoint
CREATE INDEX "idx_order_items_status" ON "order_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_order_items_worker_user_id" ON "order_items" USING btree ("worker_user_id");--> statement-breakpoint
CREATE INDEX "idx_order_status_history_order_id" ON "order_status_history" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_status_history_created_at" ON "order_status_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_user_id" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_orders_wallet_id" ON "orders" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "idx_orders_worker_id" ON "orders" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_orders_created_at" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_rsn_registrations_rsn_lower" ON "rsn_registrations" USING btree ("rsn_lower");--> statement-breakpoint
CREATE INDEX "idx_rsn_registrations_channel_id" ON "rsn_registrations" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "idx_rsn_registrations_order_id" ON "rsn_registrations" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_rsn_registrations_is_active" ON "rsn_registrations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_sythe_vouches_post_id" ON "sythe_vouches" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_sythe_vouches_is_posted" ON "sythe_vouches" USING btree ("is_posted");--> statement-breakpoint
CREATE INDEX "idx_user_wallets_user_id" ON "user_wallets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_wallets_user_type" ON "user_wallets" USING btree ("user_type");--> statement-breakpoint
CREATE INDEX "idx_vouches_voucher_user_id" ON "vouches" USING btree ("voucher_user_id");--> statement-breakpoint
CREATE INDEX "idx_vouches_vouched_user_id" ON "vouches" USING btree ("vouched_user_id");--> statement-breakpoint
CREATE INDEX "idx_vouches_vouch_type" ON "vouches" USING btree ("vouch_type");--> statement-breakpoint
CREATE INDEX "idx_vouches_is_positive" ON "vouches" USING btree ("is_positive");--> statement-breakpoint
CREATE INDEX "idx_vouches_is_active" ON "vouches" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_vouches_created_at" ON "vouches" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_wallet_transactions_wallet_id" ON "wallet_transactions" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "idx_wallet_transactions_user_id" ON "wallet_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_wallet_transactions_type" ON "wallet_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_wallet_transactions_created_at" ON "wallet_transactions" USING btree ("created_at");