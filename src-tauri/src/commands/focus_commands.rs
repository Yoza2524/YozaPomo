use crate::db::schema::{CreateFocusSessionInput, FocusSession, TodayFocusStats, UpdateFocusSessionInput};
use crate::db::Database;
use tauri::State;
use uuid::Uuid;

fn now_local() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

/// 创建专注会话
#[tauri::command]
pub fn create_focus_session(
    db: State<Database>,
    input: CreateFocusSessionInput,
) -> Result<FocusSession, String> {
    let conn = db.conn()?;
    let id = Uuid::new_v4().to_string();
    let now = now_local();

    conn.execute(
        "INSERT INTO pomodoro_sessions (id, todo_id, start_time, planned_duration, status, created_at) VALUES (?1, ?2, ?3, ?4, 'focusing', ?5)",
        rusqlite::params![id, input.todo_id, now, input.planned_duration, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(FocusSession {
        id,
        todo_id: input.todo_id,
        start_time: now.clone(),
        end_time: None,
        planned_duration: input.planned_duration,
        actual_duration: 0,
        status: "focusing".to_string(),
        notes: String::new(),
        created_at: now,
    })
}

/// 获取单个专注会话
#[tauri::command]
pub fn get_focus_session(db: State<Database>, id: String) -> Result<FocusSession, String> {
    let conn = db.conn()?;
    conn.query_row(
        "SELECT id, todo_id, start_time, end_time, planned_duration, actual_duration, status, notes, created_at FROM pomodoro_sessions WHERE id = ?1",
        rusqlite::params![id],
        |row| {
            Ok(FocusSession {
                id: row.get(0)?,
                todo_id: row.get(1)?,
                start_time: row.get(2)?,
                end_time: row.get(3)?,
                planned_duration: row.get(4)?,
                actual_duration: row.get(5)?,
                status: row.get(6)?,
                notes: row.get(7)?,
                created_at: row.get(8)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

/// 获取指定 TODO 关联的专注会话列表
#[tauri::command]
pub fn get_todo_focus_sessions(db: State<Database>, todo_id: String) -> Result<Vec<FocusSession>, String> {
    let conn = db.conn()?;
    let mut stmt = conn
        .prepare("SELECT id, todo_id, start_time, end_time, planned_duration, actual_duration, status, notes, created_at FROM pomodoro_sessions WHERE todo_id = ?1 ORDER BY start_time DESC")
        .map_err(|e| e.to_string())?;

    let sessions = stmt
        .query_map(rusqlite::params![todo_id], |row| {
            Ok(FocusSession {
                id: row.get(0)?,
                todo_id: row.get(1)?,
                start_time: row.get(2)?,
                end_time: row.get(3)?,
                planned_duration: row.get(4)?,
                actual_duration: row.get(5)?,
                status: row.get(6)?,
                notes: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(sessions)
}

/// 获取今日专注统计
#[tauri::command]
pub fn get_today_focus_stats(db: State<Database>) -> Result<TodayFocusStats, String> {
    let conn = db.conn()?;
    conn.query_row(
        "SELECT COALESCE(SUM(actual_duration), 0) / 60.0, COUNT(*) FROM pomodoro_sessions WHERE date(start_time) = date('now', 'localtime') AND status = 'completed'",
        [],
        |row| {
            Ok(TodayFocusStats {
                total_minutes: row.get(0)?,
                session_count: row.get(1)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

/// 获取最近的专注会话列表
#[tauri::command]
pub fn get_recent_focus_sessions(db: State<Database>, limit: i32) -> Result<Vec<FocusSession>, String> {
    let conn = db.conn()?;
    let mut stmt = conn
        .prepare("SELECT id, todo_id, start_time, end_time, planned_duration, actual_duration, status, notes, created_at FROM pomodoro_sessions ORDER BY start_time DESC LIMIT ?1")
        .map_err(|e| e.to_string())?;

    let sessions = stmt
        .query_map(rusqlite::params![limit], |row| {
            Ok(FocusSession {
                id: row.get(0)?,
                todo_id: row.get(1)?,
                start_time: row.get(2)?,
                end_time: row.get(3)?,
                planned_duration: row.get(4)?,
                actual_duration: row.get(5)?,
                status: row.get(6)?,
                notes: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(sessions)
}

/// 更新专注会话
#[tauri::command]
pub fn update_focus_session(
    db: State<Database>,
    id: String,
    input: UpdateFocusSessionInput,
) -> Result<FocusSession, String> {
    let conn = db.conn()?;

    // 先获取现存会话
    let mut session = conn
        .query_row(
            "SELECT id, todo_id, start_time, end_time, planned_duration, actual_duration, status, notes, created_at FROM pomodoro_sessions WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(FocusSession {
                    id: row.get(0)?,
                    todo_id: row.get(1)?,
                    start_time: row.get(2)?,
                    end_time: row.get(3)?,
                    planned_duration: row.get(4)?,
                    actual_duration: row.get(5)?,
                    status: row.get(6)?,
                    notes: row.get(7)?,
                    created_at: row.get(8)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    if let Some(end_time) = input.end_time {
        session.end_time = Some(end_time);
    }
    if let Some(actual_duration) = input.actual_duration {
        session.actual_duration = actual_duration;
    }
    if let Some(status) = input.status {
        session.status = status;
    }
    if let Some(notes) = input.notes {
        session.notes = notes;
    }
    if let Some(todo_id) = input.todo_id {
        session.todo_id = todo_id;
    }

    conn.execute(
        "UPDATE pomodoro_sessions SET todo_id = ?1, end_time = ?2, actual_duration = ?3, status = ?4, notes = ?5 WHERE id = ?6",
        rusqlite::params![session.todo_id, session.end_time, session.actual_duration, session.status, session.notes, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(session)
}

/// 删除专注会话
#[tauri::command]
pub fn delete_focus_session(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn()?;
    conn.execute(
        "DELETE FROM pomodoro_sessions WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
