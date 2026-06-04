-- YozaPomo 初始数据库 Schema
-- 版本: 001

-- TODO 项
CREATE TABLE IF NOT EXISTS todos (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    date          TEXT NOT NULL,
    notes         TEXT DEFAULT '',
    completed     INTEGER DEFAULT 0,
    sort_order    INTEGER DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_todos_date ON todos(date);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);

-- 专注会话
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id              TEXT PRIMARY KEY,
    todo_id         TEXT,
    start_time      TEXT NOT NULL,
    end_time        TEXT,
    planned_duration INTEGER NOT NULL,
    actual_duration  INTEGER DEFAULT 0,
    status          TEXT DEFAULT 'focusing',
    notes           TEXT DEFAULT '',
    created_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_todo ON pomodoro_sessions(todo_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start ON pomodoro_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON pomodoro_sessions(status);

-- 应用设置
CREATE TABLE IF NOT EXISTS settings (
    key     TEXT PRIMARY KEY,
    value   TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 默认设置
INSERT OR IGNORE INTO settings (key, value) VALUES ('focus_duration', '1500');
INSERT OR IGNORE INTO settings (key, value) VALUES ('todo_display_count', '3');
INSERT OR IGNORE INTO settings (key, value) VALUES ('show_countdown', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('notification_sound', 'default');
INSERT OR IGNORE INTO settings (key, value) VALUES ('rest_duration', '300');
