use tauri::{
    menu::{Menu, CheckMenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Emitter,
    Listener,
    Manager,
};
use crate::db::Database;

pub fn create_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    log::info!("正在创建系统托盘...");

    let show_item = CheckMenuItem::with_id(app, "show", "主页面", true, false, None::<&str>)?;
    let settings_item = CheckMenuItem::with_id(app, "settings", "设置", true, false, None::<&str>)?;
    let pin_item = CheckMenuItem::with_id(app, "pin", "固定悬浮窗", true, false, None::<&str>)?;
    let quit_item = CheckMenuItem::with_id(app, "quit", "退出", true, false, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_item, &settings_item, &pin_item, &quit_item])?;

    // 保存 pin_item 引用用于更新状态
    let pin_item_ref = pin_item.clone();
    let app_handle = app.handle().clone();

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
                "pin" => {
                    log::info!("用户点击固定/解锁悬浮窗");
                    // 向悬浮窗发送切换固定状态事件
                    let _ = app.emit("toggle-pin-floating", ());
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
                    let is_visible = window.is_visible().unwrap_or(false);
                    let is_minimized = window.is_minimized().unwrap_or(false);

                    if is_visible && !is_minimized {
                        log::info!("隐藏管理界面");
                        let _ = window.hide();
                    } else {
                        log::info!("显示管理界面");
                        if is_minimized {
                            let _ = window.unminimize();
                        }
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                } else {
                    log::warn!("未找到管理界面窗口");
                }
            }
        })
        .build(app)?;

    // 监听悬浮窗固定状态变化，更新菜单勾选状态
    let pin_item_for_listener = pin_item_ref.clone();
    app_handle.listen("pin-status-changed", move |event| {
        log::info!("收到 pin-status-changed 事件: {:?}", event.payload());
        // payload 是 JSON 格式的布尔值 "true" 或 "false"
        let is_pinned = event.payload() == "true";
        log::info!("解析后的固定状态: {}", is_pinned);
        let _ = pin_item_for_listener.set_checked(is_pinned);
    });

    log::info!("系统托盘创建完成");
    Ok(())
}
