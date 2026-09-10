import { app } from "./app.js";
import { appConfig } from "./config/index.js";

app.listen(appConfig.port, () => {
  console.log(
    `titiktemu-backend listening on port ${appConfig.port} (${appConfig.environment})`,
  );
});
