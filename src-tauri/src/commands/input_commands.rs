use windows::Win32::UI::Input::KeyboardAndMouse::GetLastInputInfo;
use windows::Win32::UI::Input::KeyboardAndMouse::LASTINPUTINFO;

/// 获取系统最后一次输入事件的 tick count（鼠标+键盘）
/// 前端轮询对比 tick 变化即可判断用户是否活跃
#[tauri::command]
pub fn get_last_input_tick() -> Result<u32, String> {
    let mut info = LASTINPUTINFO {
        cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
        dwTime: 0,
    };
    unsafe {
        if GetLastInputInfo(&mut info).as_bool() {
            Ok(info.dwTime)
        } else {
            Err("GetLastInputInfo failed".to_string())
        }
    }
}
