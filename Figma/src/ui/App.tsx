import { useState } from "react";
import { isSupabaseConfigured } from "./lib/supabaseClient";
import { usePluginSession } from "./hooks/usePluginSession";
import ApiKeyScreen from "./components/ApiKeyScreen";
import Workspace from "./components/Workspace";

export default function App() {
  const session = usePluginSession();
  const [showKey, setShowKey] = useState(false);

  if (!isSupabaseConfigured) {
    return <div className="center-state">This plugin build has no Supabase configuration. Rebuild it with a .env.</div>;
  }
  if (session.loading) {
    return (
      <div className="center-state" aria-busy="true">
        <span className="spinner" aria-hidden="true" />
        Loading…
      </div>
    );
  }

  const wantsKey = session.command === "set-api-key" || showKey || !session.userId;
  if (wantsKey) {
    return (
      <ApiKeyScreen
        error={session.error}
        hasWorkspace={Boolean(session.userId)}
        onSave={session.saveKey}
        onContinue={() => {
          session.setCommand("open-workspace");
          setShowKey(false);
        }}
      />
    );
  }

  return (
    <Workspace
      userId={session.userId as string}
      usage={session.usage}
      onUsed={session.refresh}
      onChangeKey={() => {
        setShowKey(true);
        session.setCommand("set-api-key");
      }}
    />
  );
}
