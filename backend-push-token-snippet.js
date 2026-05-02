// ─────────────────────────────────────────────────────────────────────────────
// Backend: Push Token Endpoint
// Add these to src/modules/users/users.routes.js and users.service.js
// ─────────────────────────────────────────────────────────────────────────────

// ── users.routes.js additions ────────────────────────────────────────────────
/*
const { authenticate } = require("../../middleware/auth");
const usersController  = require("./users.controller");

// POST /api/v1/users/push-token   — register a push token
router.post("/push-token",   authenticate, usersController.savePushToken);

// DELETE /api/v1/users/push-token — deregister on logout
router.delete("/push-token", authenticate, usersController.removePushToken);
*/

// ── users.service.js additions ───────────────────────────────────────────────
/*
const { db } = require("../../config/database");

async function savePushToken(userId, fcmToken) {
  await db("users")
    .where({ id: userId })
    .update({ fcm_token: fcmToken, updated_at: new Date() });
}

async function removePushToken(userId) {
  await db("users")
    .where({ id: userId })
    .update({ fcm_token: null, updated_at: new Date() });
}

module.exports = { savePushToken, removePushToken };
*/

// ── users.controller.js additions ────────────────────────────────────────────
/*
const usersService = require("./users.service");

async function savePushToken(req, res) {
  const { fcm_token } = req.body;
  if (!fcm_token || typeof fcm_token !== "string") {
    return res.status(400).json({ success: false, message: "fcm_token is required" });
  }
  await usersService.savePushToken(req.user.id, fcm_token);
  return res.status(200).json({ success: true, message: "Push token registered" });
}

async function removePushToken(req, res) {
  await usersService.removePushToken(req.user.id);
  return res.status(200).json({ success: true, message: "Push token removed" });
}

module.exports = { savePushToken, removePushToken };
*/

// ── How the cron job sends the notification ────────────────────────────────────
// In src/jobs/subscriptions.cron.js, after billing a subscription:
//
// const { Expo } = require("expo-server-sdk");
// const expo = new Expo();
//
// async function sendBudgetAlert(userId, budgetName, percentUsed) {
//   const user = await db("users").where({ id: userId }).select("fcm_token").first();
//   if (!user?.fcm_token || !Expo.isExpoPushToken(user.fcm_token)) return;
//
//   const message = {
//     to:    user.fcm_token,
//     sound: "default",
//     title: "Budget Alert",
//     body:  `You've hit ${percentUsed}% of your ${budgetName} budget — maybe hold off on that restock.`,
//     data:  { screen: "budgets" },  // ← getNavigationTargetFromNotification reads this
//     badge: 1,
//   };
//
//   const chunks = expo.chunkPushNotifications([message]);
//   for (const chunk of chunks) {
//     await expo.sendPushNotificationsAsync(chunk);
//   }
// }
//
// Install: npm install expo-server-sdk
