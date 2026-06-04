use crate::db::Database;
use serde_json::Value;
use tauri::State;

fn now_local() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

/// 获取所有设置（键值对）
#[tauri::command]
pub fn get_all_settings(db: State<Database>) -> Result<Vec<(String, String)>, String> {
    let conn = db.conn()?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings ORDER BY key")
        .map_err(|e| e.to_string())?;

    let settings = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(settings)
}

/// 获取单个设置
#[tauri::command]
pub fn get_setting(db: State<Database>, key: String) -> Result<String, String> {
    let conn = db.conn()?;
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        rusqlite::params![key],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

/// 设置单个配置项
#[tauri::command]
pub fn set_setting(db: State<Database>, key: String, value: String) -> Result<(), String> {
    let conn = db.conn()?;
    let now = now_local();

    // 验证 value 是否为合法 JSON
    let _: Value = serde_json::from_str(&value).map_err(|e| format!("Invalid JSON: {}", e))?;

    conn.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3",
        rusqlite::params![key, value, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// 批量更新设置
#[tauri::command]
pub fn update_settings(
    db: State<Database>,
    settings: Vec<(String, String)>,
) -> Result<(), String> {
    let conn = db.conn()?;
    let now = now_local();

    // 验证所有 value 是否为合法 JSON
    for (_, value) in &settings {
        let _: Value =
            serde_json::from_str(value).map_err(|e| format!("Invalid JSON for key: {}", e))?;
    }

    for (key, value) in settings {
        conn.execute(
            "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3",
            rusqlite::params![key, value, now],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}
