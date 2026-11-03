import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const news = pgTable(
  "news",
  {
    id: serial("id").primaryKey(),
    url: text("url").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    source: text("source").notNull(),
    imageUrl: text("image_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    category: text("category").notNull().default("ai"),
    // Анализ влияния на индустрию
    impactLevel: text("impact_level").notNull().default("low"), // high | medium | low
    impactScore: integer("impact_score").notNull().default(0),
    direction: text("direction").notNull().default("neutral"), // positive | negative | mixed | neutral
    analysisSummary: text("analysis_summary").notNull().default(""),
    analysisJobs: text("analysis_jobs").notNull().default(""),
    analysisAdvice: text("analysis_advice").notNull().default(""),
    professions: jsonb("professions").$type<string[]>().notNull().default([]),
    analysisMethod: text("analysis_method").notNull().default("rules"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("news_published_idx").on(t.publishedAt),
    index("news_category_idx").on(t.category),
  ],
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  // all | medium | high — минимальный уровень влияния для уведомлений
  minLevel: text("min_level").notNull().default("medium"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type NewsRow = typeof news.$inferSelect;
