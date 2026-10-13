// Links from the plugin into the web app (VITE_BLOS_WEB_URL). The main thread
// only opens URLs under that origin.
import { config } from "../config";
import host from "../host";

export const hasWebApp = Boolean(config.webUrl);

// "/?open=profile" opens the profile dialog, where the plugin key lives.
export const PROFILE_PATH = "/?open=profile";

export function openWebApp(path = "/") {
  if (config.webUrl) host.openExternal(config.webUrl + path).catch(() => undefined);
}
