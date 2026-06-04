# Tauri 配置规范

> 本文档定义 YozaPomo 的 Tauri v2 配置标准，包括窗口配置、权限声明和系统托盘设置。

---

## 1. 应用基本信息

```json
// src-tauri/tauri.conf.json
{
  "$schema": "https://raw.githubusercontent.com/nicegram/nicegram-tauri/refs/heads/main/nicegram-tauri/crates/tauri-utils/schema.json",
  "productName": "YozaPomo",
  "version": "0.1.0",
  "identifier": "com.yoza.pomo",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build"
  }
}
```

## 2. 窗口配置

### 2.1 悬浮窗（主窗口）

```json
{
  "app": {
    "windows": [
      {
        "label": "floating",
        "title": "YozaPomo",
        "width": 280,
        "height": 360,
        "resizable": false,
        "decorations": false,
        "transparent": true,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "x": -1,
        "y": -1,
        "visible": true
      }
    ]
  }
}
```

**配置说明**：
- `decorations: false`：无窗口边框，实现自定义外观
- `transparent: true`：透明背景，配合 CSS 圆角
- `alwaysOnTop: true`：始终置顶
- `skipTaskbar: true`：不在任务栏显示
- `x: -1, y: -1`：由 Rust 后端计算屏幕右上角位置

### 2.2 管理界面窗口

```json
{
  "label": "management",
  "title": "YozaPomo - 管理",
  "width": 800,
  "height": 600,
  "minWidth": 600,
  "minHeight": 400,
  "resizable": true,
  "decorations": true,
  "transparent": false,
  "alwaysOnTop": false,
  "visible": false,
  "center": true
}
```

### 2.3 窗口位置计算（Rust）

```rust
// src-tauri/src/utils/window.rs
use tauri::{Window, Monitor};

pub fn position_floating_window(window: &Window) -> Result<(), Box<dyn std::error::Error>> {
    let monitor = window.primary_monitor()?.ok_or("No primary monitor")?;
    let screen_size = monitor.size();
    let scale = monitor.scale_factor();

    let window_width = 280.0;
    let window_height = 360.0;
    let margin = 20.0;

    let x = (screen_size.width as f64 / scale) - window_width - margin;
    let y = margin;

    window.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(x, y)))?;
    Ok(())
}
```

## 3. 系统托盘配置

```json
{
  "app": {
    "trayIcon": {
      "id": "main-tray",
      "iconPath": "icons/tray.ico",
      "iconAsTemplate": true,
      "tooltip": "YozaPomo - 番茄钟"
    }
  }
}
```

### 3.1 托盘菜单（Rust 实现）

```rust
// src-tauri/src/utils/tray.rs
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

pub fn create_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let show_item = MenuItem::with_id(app, "show", "显示管理界面", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("YozaPomo - 番茄钟")
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("management") {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
            "quit" => {
                std::process::exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("management") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}
```

## 4. 权限声明（Capabilities）

```json
// src-tauri/capabilities/default.json
{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-utils/schema.json",
  "identifier": "default",
  "description": "Default capability for YozaPomo",
  "windows": ["floating", "management"],
  "permissions": [
    "core:default",
    "core:window:default",
    "core:window:allow-show",
    "core:window:allow-hide",
    "core:window:allow-close",
    "core:window:allow-set-focus",
    "core:window:allow-set-position",
    "core:window:allow-set-always-on-top",
    "core:window:allow-set-decorations",
    "core:tray:default",
    "core:tray:allow-set-menu",
    "sql:default",
    "sql:allow-execute",
    "sql:allow-select",
    "dialog:default",
    "dialog:allow-open",
    "shell:default"
  ]
}
```

## 5. 插件配置

### 5.1 SQL 插件

```rust
// src-tauri/src/lib.rs
use tauri_plugin_sql::{Builder, Migration};

pub fn run() {
    let migrations = vec![
        Migration::new(1, "create initial tables", include_str!("../migrations/001_initial_schema.sql")),
    ];

    tauri::Builder::default()
        .plugin(
            Builder::default()
                .add_migrations("sqlite:yozapomo.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 5.2 窗口管理插件

```rust
// 悬浮窗特殊处理：拦截关闭事件
use tauri::Manager;

fn setup_windows(app: &mut tauri::App) {
    if let Some(floating) = app.get_webview_window("floating") {
        let floating_clone = floating.clone();
        floating.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // 悬浮窗关闭时隐藏而非退出
                api.prevent_close();
                floating_clone.hide().unwrap();
            }
        });
    }
}
```

## 6. 开发环境配置

```json
{
  "build": {
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build"
  }
}
```

## 7. 生产构建配置

```bash
# 构建命令
pnpm tauri build

# 输出位置
src-tauri/target/release/bundle/
├── msi/          # Windows MSI 安装包
├── nsis/         # Windows NSIS 安装包
├── dmg/          # macOS DMG（macOS 环境）
└── deb/          # Linux DEB 包
```
