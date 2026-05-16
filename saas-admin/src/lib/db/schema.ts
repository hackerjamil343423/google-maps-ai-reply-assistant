import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Better Auth tables (shared with main app)
 */
export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    isAdmin: boolean("is_admin").notNull().default(false),
    suspended: boolean("suspended").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)]
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_id_idx").on(table.userId),
  ]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_unique").on(
      table.providerId,
      table.accountId
    ),
  ]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

/**
 * Product tables (shared with main app)
 */
export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  company: text("company"),
  website: text("website"),
  bio: text("bio"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "manager",
  "editor",
  "viewer",
]);
export const businessStatusEnum = pgEnum("business_status", [
  "active",
  "disconnected",
]);
export const replySourceEnum = pgEnum("reply_source", ["ai", "manual"]);
export const replyStatusEnum = pgEnum("reply_status", [
  "draft",
  "approved",
  "posted",
  "failed",
]);
export const approvalModeEnum = pgEnum("approval_mode", ["auto", "review"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
]);
export const assistantMessageRoleEnum = pgEnum("assistant_message_role", [
  "user",
  "assistant",
]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("viewer"),
    accessAllBusinesses: boolean("access_all_businesses").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("workspace_members_user_id_idx").on(table.userId),
  ]
);

export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    googleLocationId: text("google_location_id"),
    name: text("name").notNull(),
    status: businessStatusEnum("status").notNull().default("disconnected"),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("businesses_workspace_id_idx").on(table.workspaceId),
    uniqueIndex("businesses_google_location_unique").on(table.workspaceId, table.googleLocationId),
  ]
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    googleReviewId: text("google_review_id"),
    authorName: text("author_name").notNull(),
    rating: integer("rating").notNull(),
    text: text("text").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("reviews_business_id_idx").on(table.businessId),
    uniqueIndex("reviews_google_review_unique").on(table.googleReviewId),
  ]
);

export const reviewReplies = pgTable(
  "review_replies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    source: replySourceEnum("source").notNull(),
    status: replyStatusEnum("status").notNull().default("draft"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("review_replies_review_id_idx").on(table.reviewId),
    index("review_replies_status_idx").on(table.status),
  ]
);

export const aiSettings = pgTable("ai_settings", {
  workspaceId: uuid("workspace_id")
    .primaryKey()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  tone: text("tone").notNull().default("Professional"),
  approvalMode: approvalModeEnum("approval_mode").notNull().default("auto"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teamInvitations = pgTable(
  "team_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    businessName: text("business_name"),
    accessAllBusinesses: boolean("access_all_businesses")
      .notNull()
      .default(true),
    role: memberRoleEnum("role").notNull().default("viewer"),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    invitedBy: text("invited_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("team_invitations_token_unique").on(table.token),
    index("team_invitations_workspace_id_idx").on(table.workspaceId),
    index("team_invitations_email_idx").on(table.email),
  ]
);

export const workspaceMemberBusinessAssignments = pgTable(
  "workspace_member_business_assignments",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId, table.businessId] }),
    index("workspace_member_business_assignments_user_idx").on(table.userId),
    index("workspace_member_business_assignments_business_idx").on(table.businessId),
  ]
);

export const teamInvitationBusinessAssignments = pgTable(
  "team_invitation_business_assignments",
  {
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => teamInvitations.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.invitationId, table.businessId] }),
    index("team_invitation_business_assignments_business_idx").on(table.businessId),
  ]
);

export const subscriptions = pgTable("subscriptions", {
  workspaceId: uuid("workspace_id")
    .primaryKey()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("free"),
  status: subscriptionStatusEnum("status").notNull().default("trialing"),
  geideaCustomerId: text("geidea_customer_id"),
  geideaSubscriptionId: text("geidea_subscription_id"),
  geideaAgreementId: text("geidea_agreement_id"),
  geideaTokenId: text("geidea_token_id"),
  billingInterval: text("billing_interval").default("monthly"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  scheduledDowngradePlan: text("scheduled_downgrade_plan"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const usageCounters = pgTable(
  "usage_counters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    month: text("month").notNull(),
    reviewsManaged: integer("reviews_managed").notNull().default(0),
    aiRepliesGenerated: integer("ai_replies_generated").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("usage_counters_workspace_month_unique").on(
      table.workspaceId,
      table.month
    ),
  ]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    metaJson: text("meta_json"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_workspace_id_idx").on(table.workspaceId),
    index("audit_logs_actor_user_id_idx").on(table.actorUserId),
  ]
);

export const backgroundJobs = pgTable(
  "background_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    status: text("status").notNull().default("pending"),
    payload: text("payload").notNull().default("{}"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("background_jobs_status_run_at_idx").on(table.status, table.runAt),
    index("background_jobs_workspace_id_idx").on(table.workspaceId),
  ]
);

export const replyAnalyticsEvents = pgTable(
  "reply_analytics_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    replyId: uuid("reply_id").references(() => reviewReplies.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull(),
    tone: text("tone"),
    wasEdited: boolean("was_edited"),
    timeToPostMs: integer("time_to_post_ms"),
    rating: integer("rating"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("reply_analytics_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt
    ),
    index("reply_analytics_event_type_idx").on(table.eventType),
  ]
);

/**
 * Admin-specific tables (new)
 */
export const platformSettings = pgTable(
  "platform_settings",
  {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    description: text("description"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminUserId: text("admin_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metaJson: text("meta_json"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("admin_audit_logs_admin_user_id_idx").on(table.adminUserId),
    index("admin_audit_logs_action_idx").on(table.action),
    index("admin_audit_logs_created_at_idx").on(table.createdAt),
  ]
);

export const adminApiKeys = pgTable(
  "admin_api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    permissions: text("permissions").notNull().default("read"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("admin_api_keys_key_hash_idx").on(table.keyHash),
  ]
);

export type WorkspaceRole = (typeof memberRoleEnum.enumValues)[number];

/**
 * Blog tables
 */
export const blogPostStatusEnum = pgEnum("blog_post_status", [
  "draft",
  "published",
  "archived",
]);

export const blogCategories = pgTable(
  "blog_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);

export const blogTags = pgTable(
  "blog_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    slug: text("slug").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    content: text("content").notNull().default(""),
    excerpt: text("excerpt"),
    coverImage: text("cover_image"),
    categoryId: uuid("category_id").references(() => blogCategories.id, {
      onDelete: "set null",
    }),
    authorId: text("author_id").references(() => user.id, {
      onDelete: "set null",
    }),
    status: blogPostStatusEnum("status").notNull().default("draft"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    ogImage: text("og_image"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("blog_posts_status_idx").on(table.status),
    index("blog_posts_category_id_idx").on(table.categoryId),
    index("blog_posts_author_id_idx").on(table.authorId),
    index("blog_posts_published_at_idx").on(table.publishedAt),
  ]
);

export const blogPostTags = pgTable(
  "blog_post_tags",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => blogTags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.tagId] })]
);

export const blogSeoSettings = pgTable("blog_seo_settings", {
  id: text("id").primaryKey().default("1"),
  siteTitle: text("site_title").notNull().default(""),
  siteDescription: text("site_description").notNull().default(""),
  ogImage: text("og_image"),
  twitterHandle: text("twitter_handle"),
  googleAnalyticsId: text("google_analytics_id"),
  robotsTxt: text("robots_txt"),
  structuredDataJson: text("structured_data_json"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
