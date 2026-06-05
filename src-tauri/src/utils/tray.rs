use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Emitter,
    Manager,
};
use crate::db::Database;

pub fn create_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    log::info!("正在创建系统托盘...");

    let show_item = MenuItem::with_id(app, "show", "主页面", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_item, &settings_item, &quit_item])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("YozaPomo - 番茄钟")
        .on_menu_event(move |app, event| {
            log::info!("托盘菜单事件: {}", event.id.as_ref());
            match event.id.as_ref() {
                "show" => {
                    if let Some(window) = app.get_webview_window("management") {
                        log::info!("显示管理界面");
                        let _ = window.show();
                        let _ = window.set_focus();
                    } else {
                        log::warn!("未找到管理界面窗口");
                    }
                }
                "settings" => {
                    if let Some(window) = app.get_webview_window("management") {
                        log::info!("显示设置页面");
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = app.emit("navigate", "settings");
                    } else {
                        log::warn!("未找到管理界面窗口");
                    }
                }
                "quit" => {
                    log::info!("用户点击退出");
                    // 退出前标记所有进行中的专注为异常
                    if let Some(db) = app.try_state::<Database>() {
                        if let Err(e) = db.abort_active_focus_sessions() {
                            log::error!("标记异常专注失败: {}", e);
                        }
                    }
                    log::info!("应用退出");
                    std::process::exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } = event
            {
                log::info!("托盘双击事件");
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("management") {
                    if window.is_visible().unwrap_or(false) {
                        log::info!("隐藏管理界面");
                        let _ = window.hide();
                    } else {
                        log::info!("显示管理界面");
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                } else {
                    log::warn!("未找到管理界面窗口");
                }
            }
        })
        .build(app)?;

    log::info!("系统托盘创建完成");
    Ok(())
}
