use std::fs::OpenOptions;
use std::io::Write;

/// 前端日志写入 Rust 端日志文件
#[tauri::command]
pub fn write_frontend_log(level: String, message: String) {
    let app_data = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME").map(|h| format!("{}/.local/share", h)))
        .unwrap_or_else(|_| ".".to_string());
    let log_path = format!("{}/YozaPomo/yozapomo.log", app_data);
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_path) {
        let _ = writeln!(
            file,
            "[{}] [{}] {}",
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
            level,
            message
        );
    }
}
