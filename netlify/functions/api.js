const serverless = require("serverless-http");
const { app, ensureAdminUser } = require("../../app");

let adminReadyPromise;

exports.handler = async (event, context) => {
  if (!adminReadyPromise) {
    adminReadyPromise = ensureAdminUser().catch((error) => {
      adminReadyPromise = null;
      throw error;
    });
  }

  await adminReadyPromise;
  const handler = serverless(app);
  return handler(event, context);
};
