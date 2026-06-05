mod commands;
mod db;
mod utils;

use db::Database;
use tauri::Manager;
use tauri::{LogicalSize, LogicalPosition, PhysicalPosition};

/// 设置窗口行为：关闭时隐藏而非退出
fn setup_windows(app: &mut tauri::App) {
    log::info!("开始配置窗口...");

    // 悬浮窗：关闭时隐藏、定位到右上角
    if let Some(floating) = app.get_webview_window("floating") {
        log::info!("找到悬浮窗，正在配置...");

        let floating_clone = floating.clone();
        floating.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                log::info!("悬浮窗关闭请求，拦截并隐藏");
                api.prevent_close();
                let _ = floating_clone.hide();
            }
        });

        // 定位到屏幕右上角（使用逻辑坐标，自动适配缩放比例）
        if let Ok(Some(monitor)) = floating.primary_monitor() {
            let monitor_size = monitor.size();
            let scale_factor = monitor.scale_factor();

            // 计算逻辑尺寸
            let logical_width = monitor_size.width as f64 / scale_factor;
            let logical_height = monitor_size.height as f64 / scale_factor;

            // 悬浮窗逻辑尺寸（280x360）
            let window_width = 280.0;

            // 计算逻辑坐标：右上角，留 16px 边距
            let x = logical_width - window_width - 16.0;
            let y = 40.0;

            log::info!("显示器信息: 物理尺寸={}x{}, 缩放={}, 逻辑尺寸={}x{}",
                monitor_size.width, monitor_size.height, scale_factor,
                logical_width, logical_height);
            log::info!("悬浮窗定位: 逻辑坐标=({}, {})", x, y);

            let _ = floating.set_position(LogicalPosition::new(x, y));
        } else {
            log::error!("无法获取主显示器信息！");
        }

        // 定位完成后再显示窗口（避免闪烁）
        let _ = floating.show();
        log::info!("悬浮窗已显示");
    } else {
        log::warn!("未找到悬浮窗 (label='floating')");
    }

    // overlay 窗口：全屏、隐藏、鼠标穿透
    if let Some(overlay) = app.get_webview_window("overlay") {
        log::info!("找到 overlay 窗口，正在配置...");
        if let Ok(Some(monitor)) = overlay.primary_monitor() {
            let size = monitor.size();
            log::info!("overlay 窗口设置为全屏: {}x{}", size.width, size.height);
            let _ = overlay.set_size(LogicalSize::new(size.width as f64, size.height as f64));
            let _ = overlay.set_position(PhysicalPosition::new(0, 0));
        }
        // Windows 下设置鼠标穿透（点击事件穿透到下方窗口）
        let _ = overlay.set_ignore_cursor_events(true);
        let _ = overlay.hide();
        log::info!("overlay 窗口配置完成（隐藏+鼠标穿透）");
    } else {
        log::warn!("未找到 overlay 窗口 (label='overlay')");
    }

    // 管理界面：关闭时隐藏而非退出
    if let Some(management) = app.get_webview_window("management") {
        log::info!("找到管理界面窗口，正在配置...");
        let management_clone = management.clone();
        management.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                log::info!("管理界面关闭请求，拦截并隐藏");
                api.prevent_close();
                let _ = management_clone.hide();
            }
        });
    } else {
        log::warn!("未找到管理界面窗口 (label='management')");
    }

    log::info!("窗口配置完成");
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
            commands::focus_commands::abort_active_focus_sessions,
            commands::settings_commands::get_all_settings,
            commands::settings_commands::get_setting,
            commands::settings_commands::set_setting,
            commands::settings_commands::update_settings,
            commands::input_commands::get_last_input_tick,
            utils::logger::write_log,
        ])
        .setup(|app| {
            // 初始化日志系统
            let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
            if let Err(e) = utils::logger::init_logger(&app_data_dir) {
                eprintln!("日志系统初始化失败: {}", e);
            }

            log::info!("应用启动中...");
            log::info!("AppData 目录: {:?}", app_data_dir);

            // 初始化数据库
            log::info!("正在初始化数据库...");
            let database = Database::new(&app_data_dir)?;
            database.migrate()?;
            app.manage(database);
            log::info!("数据库初始化完成");

            // 创建系统托盘
            log::info!("正在创建系统托盘...");
            utils::tray::create_tray(app)?;

            // 设置窗口行为
            log::info!("正在配置窗口...");
            setup_windows(app);
            log::info!("应用启动完成");

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
