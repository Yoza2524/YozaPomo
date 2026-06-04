use serde::{Deserialize, Serialize};

/// TODO 项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Todo {
    pub id: String,
    pub title: String,
    pub date: String,
    pub notes: String,
    pub completed: i32,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// 创建 TODO 的输入
#[derive(Debug, Deserialize)]
pub struct CreateTodoInput {
    pub title: String,
    pub date: String,
    #[serde(default)]
    pub notes: String,
}

/// 更新 TODO 的输入
#[derive(Debug, Deserialize)]
pub struct UpdateTodoInput {
    pub title: Option<String>,
    pub date: Option<String>,
    pub notes: Option<String>,
    pub completed: Option<i32>,
    pub sort_order: Option<i32>,
}

/// 专注会话
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusSession {
    pub id: String,
    pub todo_id: Option<String>,
    pub start_time: String,
    pub end_time: Option<String>,
    pub planned_duration: i32,
    pub actual_duration: i32,
    pub status: String,
    pub notes: String,
    pub created_at: String,
}

/// 创建专注会话的输入
#[derive(Debug, Deserialize)]
pub struct CreateFocusSessionInput {
    pub todo_id: Option<String>,
    pub planned_duration: i32,
}

/// 更新专注会话的输入
#[derive(Debug, Deserialize)]
pub struct UpdateFocusSessionInput {
    pub todo_id: Option<Option<String>>,
    pub end_time: Option<String>,
    pub actual_duration: Option<i32>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

/// 今日专注统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TodayFocusStats {
    pub total_minutes: f64,
    pub session_count: i32,
}
