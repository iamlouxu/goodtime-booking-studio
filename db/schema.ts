import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const shops = sqliteTable("shops", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  theme: text("theme"),
});

export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const slots = sqliteTable(
  "slots",
  {
    id: text("id").primaryKey(),
    shopId: text("shop_id")
      .notNull()
      .references(() => shops.id),
    date: text("date").notNull(),
    time: text("time").notNull(),
    status: text("status").notNull().default("open"),
    customer: text("customer"),
    phone: text("phone"),
    note: text("note"),
    bookingId: text("booking_id"),
    serviceId: text("service_id"),
    blockedBySlotId: text("blocked_by_slot_id"),
    updated: integer("updated").notNull(),
  },
  (t) => [uniqueIndex("shop_time_unique").on(t.shopId, t.date, t.time)],
);
