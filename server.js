const { app, ensureAdminUser } = require("./app");
const PORT = process.env.PORT || 3000;

ensureAdminUser()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Admin/DB init error:", error);
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT} (degraded mode)`);
    });
  });
