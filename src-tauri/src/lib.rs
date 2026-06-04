mod commands;
mod db;
mod utils;

use db::Database;
use tauri::Manager;

/// 悬浮窗关闭时隐藏而非退出
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
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            commands::todo_commands::create_todo,
            commands::todo_commands::get_todos,
            commands::todo_commands::get_all_todos,
            commands::todo_commands::get_todo,
            commands::todo_commands::update_todo,
            commands::todo_commands::delete_todo,
            commands::focus_commands::create_focus_session,
            commands::focus_commands::get_focus_session,
            commands::focus_commands::get_todo_focus_sessions,
            commands::focus_commands::get_today_focus_stats,
            commands::focus_commands::get_recent_focus_sessions,
            commands::focus_commands::update_focus_session,
            commands::focus_commands::delete_focus_session,
            commands::settings_commands::get_all_settings,
            commands::settings_commands::get_setting,
            commands::settings_commands::set_setting,
            commands::settings_commands::update_settings,
        ])
        .setup(|app| {
            // 初始化数据库
            let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
            let database = Database::new(&app_data_dir)?;
            database.migrate()?;
            app.manage(database);

            // 创建系统托盘
            utils::tray::create_tray(app)?;
            // 设置窗口行为
            setup_windows(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
