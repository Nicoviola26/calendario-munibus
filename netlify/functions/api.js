const serverless = require("serverless-http");
const { app, ensureAdminUser } = require("../../app");

let initialized = false;

module.exports.handler = async (event, context) => {
  if (!initialized) {
    try {
      await ensureAdminUser();
      initialized = true;
    } catch (error) {
      console.error("Initialization error:", error);
    }
  }
  
  const handler = serverless(app);
  return handler(event, context);
};
