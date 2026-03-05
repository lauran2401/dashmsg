CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  tester_id TEXT NOT NULL,
  source TEXT,
  app_version TEXT,
  schema_version INTEGER,
  category TEXT,
  template_key TEXT,
  used_name INTEGER,
  used_eta INTEGER,
  used_hotbag INTEGER,
  stops TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_tester ON events(tester_id);
CREATE INDEX IF NOT EXISTS idx_events_template ON events(template_key);

CREATE TABLE IF NOT EXISTS errors (
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  tester_id TEXT,
  app_version TEXT,
  schema_version INTEGER,
  message TEXT,
  stack TEXT,
  url TEXT,
  line INTEGER,
  col INTEGER
);

CREATE INDEX IF NOT EXISTS idx_errors_ts ON errors(ts);
CREATE INDEX IF NOT EXISTS idx_errors_tester ON errors(tester_id);

CREATE TABLE IF NOT EXISTS feedback(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 tester_id TEXT,
 message TEXT,
 template TEXT,
 created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_feedback_tester ON feedback(tester_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);
