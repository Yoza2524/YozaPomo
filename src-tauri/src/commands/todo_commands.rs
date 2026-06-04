use crate::db::schema::{CreateTodoInput, Todo, UpdateTodoInput};
use crate::db::Database;
use tauri::{Emitter, State};
use uuid::Uuid;

/// 获取当前时间的本地时间字符串
fn now_local() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

/// 创建 TODO
#[tauri::command]
pub fn create_todo(app: tauri::AppHandle, db: State<Database>, input: CreateTodoInput) -> Result<Todo, String> {
    let conn = db.conn()?;
    let id = Uuid::new_v4().to_string();
    let now = now_local();

    conn.execute(
        "INSERT INTO todos (id, title, date, notes, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, input.title, input.date, input.notes, now, now],
    )
    .map_err(|e| e.to_string())?;

    let _ = app.emit("todo-changed", ());

    Ok(Todo {
        id,
        title: input.title,
        date: input.date,
        notes: input.notes,
        completed: 0,
        sort_order: 0,
        created_at: now.clone(),
        updated_at: now,
    })
}

/// 获取指定日期的 TODO 列表
#[tauri::command]
pub fn get_todos(db: State<Database>, date: String) -> Result<Vec<Todo>, String> {
    let conn = db.conn()?;
    let mut stmt = conn
        .prepare("SELECT id, title, date, notes, completed, sort_order, created_at, updated_at FROM todos WHERE date = ?1 ORDER BY sort_order ASC, created_at DESC")
        .map_err(|e| e.to_string())?;

    let todos = stmt
        .query_map(rusqlite::params![date], |row| {
            Ok(Todo {
                id: row.get(0)?,
                title: row.get(1)?,
                date: row.get(2)?,
                notes: row.get(3)?,
                completed: row.get(4)?,
                sort_order: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(todos)
}

/// 获取所有 TODO（按日期倒序）
#[tauri::command]
pub fn get_all_todos(db: State<Database>) -> Result<Vec<Todo>, String> {
    let conn = db.conn()?;
    let mut stmt = conn
        .prepare("SELECT id, title, date, notes, completed, sort_order, created_at, updated_at FROM todos ORDER BY date DESC, sort_order ASC, created_at DESC")
        .map_err(|e| e.to_string())?;

    let todos = stmt
        .query_map([], |row| {
            Ok(Todo {
                id: row.get(0)?,
                title: row.get(1)?,
                date: row.get(2)?,
                notes: row.get(3)?,
                completed: row.get(4)?,
                sort_order: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(todos)
}

/// 获取单个 TODO
#[tauri::command]
pub fn get_todo(db: State<Database>, id: String) -> Result<Todo, String> {
    let conn = db.conn()?;
    conn.query_row(
        "SELECT id, title, date, notes, completed, sort_order, created_at, updated_at FROM todos WHERE id = ?1",
        rusqlite::params![id],
        |row| {
            Ok(Todo {
                id: row.get(0)?,
                title: row.get(1)?,
                date: row.get(2)?,
                notes: row.get(3)?,
                completed: row.get(4)?,
                sort_order: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

/// 更新 TODO
#[tauri::command]
pub fn update_todo(app: tauri::AppHandle, db: State<Database>, id: String, input: UpdateTodoInput) -> Result<Todo, String> {
    let conn = db.conn()?;

    // 先获取现有 TODO
    let mut todo = conn
        .query_row(
            "SELECT id, title, date, notes, completed, sort_order, created_at, updated_at FROM todos WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Todo {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    date: row.get(2)?,
                    notes: row.get(3)?,
                    completed: row.get(4)?,
                    sort_order: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    // 合并更新
    let now = now_local();
    if let Some(title) = input.title {
        todo.title = title;
    }
    if let Some(date) = input.date {
        todo.date = date;
    }
    if let Some(notes) = input.notes {
        todo.notes = notes;
    }
    if let Some(completed) = input.completed {
        todo.completed = completed;
    }
    if let Some(sort_order) = input.sort_order {
        todo.sort_order = sort_order;
    }
    todo.updated_at = now.clone();

    conn.execute(
        "UPDATE todos SET title = ?1, date = ?2, notes = ?3, completed = ?4, sort_order = ?5, updated_at = ?6 WHERE id = ?7",
        rusqlite::params![todo.title, todo.date, todo.notes, todo.completed, todo.sort_order, now, id],
    )
    .map_err(|e| e.to_string())?;

    let _ = app.emit("todo-changed", ());

    Ok(todo)
}

/// 删除 TODO
#[tauri::command]
pub fn delete_todo(app: tauri::AppHandle, db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn()?;
    conn.execute("DELETE FROM todos WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    let _ = app.emit("todo-changed", ());
    Ok(())
}
