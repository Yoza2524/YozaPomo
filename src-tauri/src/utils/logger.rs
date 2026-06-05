use log::LevelFilter;
use simplelog::*;
use std::fs;
use std::path::PathBuf;

/// 初始化日志系统，日志文件写入 AppData 目录
pub fn init_logger(app_data_dir: &PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    let logs_dir = app_data_dir.join("logs");
    fs::create_dir_all(&logs_dir)?;

    let log_file = logs_dir.join("yozapomo.log");

    // 配置日志
    let config = ConfigBuilder::new()
        .set_time_offset_to_local()
        .expect("无法获取本地时区")
        .build();

    CombinedLogger::init(vec![
        // 文件日志：Info 级别
        WriteLogger::new(
            LevelFilter::Info,
            config.clone(),
            fs::File::create(&log_file)?,
        ),
        // 控制台日志：Debug 级别（仅 debug 构建）
        #[cfg(debug_assertions)]
        TermLogger::new(
            LevelFilter::Debug,
            config,
            TerminalMode::Mixed,
            ColorChoice::Auto,
        ),
    ])?;

    log::info!("=== YozaPomo 日志系统初始化完成 ===");
    log::info!("日志文件: {:?}", log_file);

    Ok(())
}

/// 前端调用的日志写入命令
#[tauri::command]
pub fn write_log(level: String, message: String, source: Option<String>) {
    let prefix = source.unwrap_or_else(|| "frontend".to_string());
    let msg = format!("[{}] {}", prefix, message);

    match level.as_str() {
        "error" => log::error!("{}", msg),
        "warn" => log::warn!("{}", msg),
        "info" => log::info!("{}", msg),
        "debug" => log::debug!("{}", msg),
        _ => log::info!("{}", msg),
    }
}
