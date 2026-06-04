mod commands;
mod db;
mod utils;

use tauri::Manager;
use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

// 悬浮窗关闭时隐藏而非退出
fn setup_windows(app: &mut tauri::App) {
    if let Some(floating) = app.get_webview_window("floating") {
        let floating_clone = floating.clone();
        floating.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = floating_clone.hide();
            }
        });
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 数据库迁移
    let migrations = vec![Migration {
        version: 1,
        description: "create initial tables",
        sql: include_str!("../migrations/001_initial_schema.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            SqlBuilder::default()
                .add_migrations("sqlite:yozapomo.db", migrations)
                .build(),
        )
        .setup(|app| {
            // 创建系统托盘
            utils::tray::create_tray(app)?;
            // 设置窗口行为
            setup_windows(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
