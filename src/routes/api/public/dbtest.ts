import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/dbtest")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { DatabaseSync } = await import("node:sqlite");
          const db = new DatabaseSync("/tmp/t.db");
          db.exec("create table if not exists t(a integer)");
          db.prepare("insert into t values (?)").run(1);
          const rows = db.prepare("select count(*) c from t").all();
          return Response.json({ ok: true, rows });
        } catch (e) {
          return Response.json({ ok: false, err: String(e) });
        }
      },
    },
  },
});
