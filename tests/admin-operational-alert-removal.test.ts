import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { adminNotificationService } from "../src/services/admin/notification.service";

describe("Admin Notification Popover & Static Alert Removal Verification", () => {
  const rootDir = process.cwd();
  const headerPath = path.join(rootDir, "src/components/admin/layout/AdminHeader.tsx");

  test("1. AdminHeader.tsx exists and is readable", () => {
    assert(fs.existsSync(headerPath), "AdminHeader.tsx must exist");
  });

  test("2. Hardcoded static operational alerts are completely purged", () => {
    const content = fs.readFileSync(headerPath, "utf8");

    assert(
      !content.includes("Operational Alerts"),
      "AdminHeader must NOT contain hardcoded 'Operational Alerts' title"
    );
    assert(
      !content.includes("Real-time sync"),
      "AdminHeader must NOT contain fabricated 'Real-time sync' claim"
    );
    assert(
      !content.includes("Stock System Synchronized"),
      "AdminHeader must NOT contain static 'Stock System Synchronized' card"
    );
    assert(
      !content.includes("Uttara Central Warehouse records up to date."),
      "AdminHeader must NOT contain hardcoded 'Uttara Central Warehouse records up to date.'"
    );
  });

  test("3. Notification indicator is conditioned on unreadCount > 0", () => {
    const content = fs.readFileSync(headerPath, "utf8");

    assert(
      content.includes("unreadCount > 0"),
      "Unread badge must be strictly conditioned on genuine unreadCount > 0"
    );
    assert(
      !content.includes(
        '<Bell size={16} />\n            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-card" />'
      ),
      "Bell must NOT render an unconditional red dot when there are zero unread notifications"
    );
  });

  test("4. Clean and appropriate empty state is rendered when notifications are empty", () => {
    const content = fs.readFileSync(headerPath, "utf8");

    assert(
      content.includes("No notifications"),
      "AdminHeader must display a clear 'No notifications' empty state"
    );
    assert(
      content.includes("You have no pending alerts or unread notifications."),
      "AdminHeader must provide helpful empty state copy"
    );
  });

  test("5. Dropdown supports accessible dismissal via outside click and Escape key", () => {
    const content = fs.readFileSync(headerPath, "utf8");

    assert(
      content.includes("handleClickOutside"),
      "AdminHeader must include click-outside event handler"
    );
    assert(
      content.includes('e.key === "Escape"'),
      "AdminHeader must include Escape key handler to dismiss popover"
    );
  });

  test("6. Preserves admin profile, mobile toggle, workspace status, and View Store button", () => {
    const content = fs.readFileSync(headerPath, "utf8");

    assert(content.includes("onToggleMobileMenu"), "Mobile menu toggle preserved");
    assert(content.includes("onSignOut"), "Sign out button preserved");
    assert(content.includes("Admin Workspace Active"), "Workspace active badge preserved");
    assert(content.includes("View Store"), "View store link preserved");
  });

  test("7. adminNotificationService gracefully handles API fallback", async () => {
    assert(typeof adminNotificationService.getNotifications === "function");
    assert(typeof adminNotificationService.getUnreadCount === "function");
    assert(typeof adminNotificationService.markAsRead === "function");
    assert(typeof adminNotificationService.markAllAsRead === "function");

    // When backend API is offline/unreachable in local test runner, returns safe defaults
    const result = await adminNotificationService.getNotifications();
    assert.deepEqual(result.notifications, [], "Should default to empty array on network failure");
    assert.equal(result.unreadCount, 0, "Should default unreadCount to 0");

    const count = await adminNotificationService.getUnreadCount();
    assert.equal(count, 0, "Should default unreadCount to 0");
  });
});
