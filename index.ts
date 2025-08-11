import app from "./src/app.js";
import { ENV } from "./src/config/env.js";

const PORT = ENV.PORT;

app.listen(PORT, () => {
  console.log(`🚀 AutoHarbour API running on port ${PORT}`);
  console.log(`📖 API docs available at http://localhost:${PORT}/api`);
  console.log(`🏥 Health check at http://localhost:${PORT}/api/health`);
});
