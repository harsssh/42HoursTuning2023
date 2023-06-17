import newrelic from "newrelic";
import { app } from "./app";

newrelic.instrumentLoadedModule("express", app);

const port = 8000;
app.listen(port, () => {
  console.log(`ポート${port}番で起動しました。`);
});
