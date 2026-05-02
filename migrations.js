// =============================================================================
// migrations/001_create_users.js
// =============================================================================
exports.up = function (knex) {
  return knex.schema.createTable("users", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    // Auth
    t.string("email", 255).notNullable().unique();
    t.string("password_hash", 255).notNullable();
    t.string("refresh_token_hash", 255).nullable(); // hashed refresh token
    t.timestamp("token_issued_at").nullable();

    // Profile
    t.string("full_name", 100).nullable();
    t.string("avatar_url", 500).nullable();

    // Settings (stored as structured columns for query efficiency)
    t.string("currency_code", 10).notNullable().defaultTo("USD");
    t.string("currency_symbol", 5).notNullable().defaultTo("$");
    t.string("timezone", 100).notNullable().defaultTo("UTC");
    t.enum("theme", ["light", "dark", "system"]).defaultTo("system");

    // Push notifications
    t.string("fcm_token", 500).nullable(); // Firebase Cloud Messaging

    // Verification
    t.boolean("email_verified").defaultTo(false);
    t.string("email_verify_token", 255).nullable();
    t.timestamp("email_verify_expires").nullable();

    // Password reset
    t.string("reset_token_hash", 255).nullable();
    t.timestamp("reset_token_expires").nullable();

    t.timestamps(true, true); // created_at, updated_at
    t.timestamp("deleted_at").nullable(); // soft delete
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("users");
};


// =============================================================================
// migrations/002_create_accounts.js
// =============================================================================
exports.up = function (knex) {
  return knex.schema.createTable("accounts", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");

    t.string("name", 100).notNullable();               // "Chase Checking", "Cash Wallet"
    t.enum("type", [
      "cash", "checking", "savings", "credit_card",
      "investment", "loan", "other"
    ]).notNullable().defaultTo("checking");

    // Balance stored in CENTS (integer) to avoid float errors.
    // e.g. $12.50 = 1250
    t.bigInteger("balance_cents").notNullable().defaultTo(0);
    t.string("currency_code", 10).notNullable().defaultTo("USD");

    t.string("color", 7).nullable();                   // Hex color for UI
    t.string("icon", 50).nullable();                   // Icon identifier
    t.boolean("include_in_total").defaultTo(true);
    t.boolean("is_archived").defaultTo(false);

    // Plaid integration (populated when bank is linked)
    t.string("plaid_account_id", 255).nullable();
    t.string("plaid_item_id", 255).nullable();
    t.timestamp("plaid_last_synced").nullable();

    t.integer("sort_order").defaultTo(0);
    t.timestamps(true, true);
    t.timestamp("deleted_at").nullable();

    t.index("user_id");
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("accounts");
};


// =============================================================================
// migrations/003_create_categories.js
// =============================================================================
exports.up = function (knex) {
  return knex.schema
    .createTable("categories", (t) => {
      t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

      // NULL user_id = system default (visible to all users)
      t.uuid("user_id").nullable().references("id").inTable("users").onDelete("CASCADE");

      t.string("name", 100).notNullable();
      t.string("icon", 50).notNullable();              // Emoji or icon key
      t.string("color", 7).notNullable();              // Hex, e.g. "#FF6B6B"
      t.enum("type", ["expense", "income", "both"]).defaultTo("expense");

      // Self-referencing for subcategories (e.g. Food > Restaurants)
      t.uuid("parent_id").nullable().references("id").inTable("categories").onDelete("SET NULL");

      t.boolean("is_system").defaultTo(false);         // True = cannot be deleted by user
      t.boolean("is_archived").defaultTo(false);
      t.integer("sort_order").defaultTo(0);

      t.timestamps(true, true);

      t.index("user_id");
      t.index("parent_id");
    })
    // Seed system default categories immediately after table creation
    .then(() =>
      knex("categories").insert([
        { id: knex.raw("gen_random_uuid()"), name: "Food & Dining",   icon: "🍽️", color: "#FF6B6B", is_system: true, type: "expense", sort_order: 1 },
        { id: knex.raw("gen_random_uuid()"), name: "Transport",        icon: "🚗", color: "#4ECDC4", is_system: true, type: "expense", sort_order: 2 },
        { id: knex.raw("gen_random_uuid()"), name: "Entertainment",    icon: "🎬", color: "#FFE66D", is_system: true, type: "expense", sort_order: 3 },
        { id: knex.raw("gen_random_uuid()"), name: "Health",           icon: "💊", color: "#95E1D3", is_system: true, type: "expense", sort_order: 4 },
        { id: knex.raw("gen_random_uuid()"), name: "Shopping",         icon: "🛍️", color: "#F38181", is_system: true, type: "expense", sort_order: 5 },
        { id: knex.raw("gen_random_uuid()"), name: "Subscriptions",    icon: "📱", color: "#A8D8EA", is_system: true, type: "expense", sort_order: 6 },
        { id: knex.raw("gen_random_uuid()"), name: "Savings",          icon: "💰", color: "#AA96DA", is_system: true, type: "both",    sort_order: 7 },
        { id: knex.raw("gen_random_uuid()"), name: "Salary",           icon: "💼", color: "#6BCB77", is_system: true, type: "income",  sort_order: 8 },
        { id: knex.raw("gen_random_uuid()"), name: "Freelance",        icon: "🖥️", color: "#4D96FF", is_system: true, type: "income",  sort_order: 9 },
        { id: knex.raw("gen_random_uuid()"), name: "Utilities",        icon: "⚡", color: "#F4A261", is_system: true, type: "expense", sort_order: 10 },
        { id: knex.raw("gen_random_uuid()"), name: "Housing",          icon: "🏠", color: "#E76F51", is_system: true, type: "expense", sort_order: 11 },
        { id: knex.raw("gen_random_uuid()"), name: "Education",        icon: "📚", color: "#457B9D", is_system: true, type: "expense", sort_order: 12 },
      ])
    );
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("categories");
};


// =============================================================================
// migrations/004_create_transactions.js
// =============================================================================
exports.up = function (knex) {
  return knex.schema.createTable("transactions", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    t.uuid("account_id").notNullable().references("id").inTable("accounts").onDelete("CASCADE");
    t.uuid("category_id").nullable().references("id").inTable("categories").onDelete("SET NULL");

    // For transfers: the destination account
    t.uuid("transfer_account_id").nullable().references("id").inTable("accounts").onDelete("SET NULL");

    // Amount ALWAYS stored in cents (positive integer).
    // Type determines whether it's deducted or added.
    t.bigInteger("amount_cents").notNullable();

    // Constraint: amount must be positive
    t.check("amount_cents > 0", [], "chk_amount_positive");

    t.enum("type", ["expense", "income", "transfer"]).notNullable().defaultTo("expense");

    t.date("date").notNullable();                          // User-defined transaction date
    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.timestamp("updated_at").defaultTo(knex.fn.now());

    t.string("note", 500).nullable();
    t.string("receipt_image_url", 1000).nullable();        // S3 / Cloudinary URL

    // Subscription link: if this transaction was auto-generated
    t.uuid("subscription_id").nullable().references("id").inTable("subscriptions").onDelete("SET NULL");

    // Plaid integration: external transaction ID for deduplication
    t.string("plaid_transaction_id", 255).nullable().unique();

    // OCR: was receipt auto-parsed?
    t.boolean("ocr_processed").defaultTo(false);
    t.jsonb("ocr_raw_data").nullable();                    // Raw OCR output for debugging

    t.boolean("is_verified").defaultTo(true);              // False = pending Plaid sync
    t.timestamp("deleted_at").nullable();                  // Soft delete

    // Indexes for common query patterns
    t.index("user_id");
    t.index("account_id");
    t.index("category_id");
    t.index("date");
    t.index(["user_id", "date"]);                          // Most common dashboard query
    t.index(["user_id", "type"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("transactions");
};


// =============================================================================
// migrations/005_create_budgets.js
// =============================================================================
exports.up = function (knex) {
  return knex.schema.createTable("budgets", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    t.uuid("category_id").nullable().references("id").inTable("categories").onDelete("CASCADE");
    // NULL category_id = overall total budget

    t.bigInteger("limit_cents").notNullable();             // Budget cap in cents
    t.check("limit_cents > 0", [], "chk_budget_positive");

    t.enum("period", ["weekly", "monthly", "yearly"]).notNullable().defaultTo("monthly");

    // The calendar period this budget covers
    t.date("period_start").notNullable();
    t.date("period_end").notNullable();

    // Alert thresholds (percentage, 0-100)
    t.integer("alert_at_percent").defaultTo(80);           // Notify at 80% spent
    t.boolean("alert_sent").defaultTo(false);              // Prevent duplicate alerts

    t.boolean("rollover").defaultTo(false);                // Roll unspent amount to next period
    t.boolean("is_active").defaultTo(true);

    t.timestamps(true, true);

    // A user can only have one budget per category per period
    t.unique(["user_id", "category_id", "period_start"]);
    t.index("user_id");
    t.index(["user_id", "period_start", "period_end"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("budgets");
};


// =============================================================================
// migrations/006_create_subscriptions.js
// =============================================================================
exports.up = function (knex) {
  return knex.schema.createTable("subscriptions", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    t.uuid("account_id").notNullable().references("id").inTable("accounts").onDelete("CASCADE");
    t.uuid("category_id").nullable().references("id").inTable("categories").onDelete("SET NULL");

    t.string("name", 150).notNullable();                   // "Netflix", "Spotify"
    t.bigInteger("amount_cents").notNullable();

    t.enum("frequency", [
      "daily", "weekly", "biweekly", "monthly",
      "quarterly", "yearly", "custom"
    ]).notNullable().defaultTo("monthly");

    // For custom frequency: number of days between recurrences
    t.integer("custom_interval_days").nullable();

    t.date("start_date").notNullable();
    t.date("next_billing_date").notNullable();
    t.date("end_date").nullable();                         // NULL = indefinite

    t.string("note", 500).nullable();
    t.string("logo_url", 500).nullable();                  // Brand logo

    t.boolean("is_active").defaultTo(true);
    t.boolean("auto_create_transaction").defaultTo(true);  // Auto-log on billing date

    t.timestamps(true, true);

    t.index("user_id");
    t.index("next_billing_date");                          // Cron job queries this
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("subscriptions");
};
