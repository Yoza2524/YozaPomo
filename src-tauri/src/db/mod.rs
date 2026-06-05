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
        log::info!("正在创建数据库目录: {:?}", app_data_dir);
        std::fs::create_dir_all(app_data_dir).map_err(|e| {
            log::error!("创建数据库目录失败: {}", e);
            e.to_string()
        })?;

        let db_path = app_data_dir.join("yozapomo.db");
        log::info!("正在打开数据库: {:?}", db_path);

        let conn = Connection::open(&db_path).map_err(|e| {
            log::error!("打开数据库失败: {}", e);
            e.to_string()
        })?;

        log::info!("正在设置数据库 PRAGMA...");
        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA foreign_keys=ON;
             PRAGMA busy_timeout=5000;",
        )
        .map_err(|e| {
            log::error!("设置 PRAGMA 失败: {}", e);
            e.to_string()
        })?;

        log::info!("数据库初始化成功");
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// 获取数据库连接（阻塞直到锁可用）
    pub fn conn(&self) -> DbResult<std::sync::MutexGuard<'_, Connection>> {
        self.conn.lock().map_err(|e| {
            log::error!("获取数据库连接锁失败: {}", e);
            e.to_string()
        })
    }

    /// 执行迁移脚本
    pub fn migrate(&self) -> DbResult<()> {
        log::info!("正在执行数据库迁移...");
        let conn = self.conn()?;
        conn.execute_batch(include_str!("../../migrations/001_initial_schema.sql"))
            .map_err(|e| {
                log::error!("数据库迁移失败: {}", e);
                e.to_string()
            })?;
        log::info!("数据库迁移完成");
        Ok(())
    }

    /// 标记所有进行中的专注会话为异常（应用退出时调用）
    pub fn abort_active_focus_sessions(&self) -> DbResult<u64> {
        log::info!("正在标记进行中的专注会话为异常...");
        let conn = self.conn()?;
        let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let affected = conn.execute(
            "UPDATE pomodoro_sessions SET status = 'abnormal', end_time = ?1 WHERE status IN ('focusing', 'paused')",
            rusqlite::params![now],
        )
        .map_err(|e| {
            log::error!("标记异常专注失败: {}", e);
            e.to_string()
        })?;
        log::info!("标记了 {} 个专注会话为异常", affected);
        Ok(affected as u64)
    }
}
