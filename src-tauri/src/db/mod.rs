pub mod schema;

use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

/// 数据库错误类型
pub type DbResult<T> = Result<T, String>;

/// 数据库管理器 — 持有 SQLite 连接
pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    /// 在指定目录下创建/打开数据库
    pub fn new(app_data_dir: &Path) -> DbResult<Self> {
        std::fs::create_dir_all(app_data_dir).map_err(|e| e.to_string())?;

        let db_path = app_data_dir.join("yozapomo.db");
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA foreign_keys=ON;
             PRAGMA busy_timeout=5000;",
        )
        .map_err(|e| e.to_string())?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// 获取数据库连接（阻塞直到锁可用）
    pub fn conn(&self) -> DbResult<std::sync::MutexGuard<'_, Connection>> {
        self.conn.lock().map_err(|e| e.to_string())
    }

    /// 执行迁移脚本
    pub fn migrate(&self) -> DbResult<()> {
        let conn = self.conn()?;
        conn.execute_batch(include_str!("../../migrations/001_initial_schema.sql"))
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
