use std::sync::Mutex;

use serde::Serialize;
use tauri::Manager;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

#[derive(Serialize)]
struct ProxyResponse {
    status: u16,
    body: serde_json::Value,
}

#[tauri::command]
async fn proxy_request(
    state: tauri::State<'_, SidecarState>,
    method: String,
    path: String,
    body: Option<String>,
) -> Result<ProxyResponse, String> {
    let port = state.port;
    let url = format!("http://127.0.0.1:{}/api{}", port, path);

    tauri::async_runtime::spawn_blocking(move || -> Result<ProxyResponse, String> {
        let agent = ureq::AgentBuilder::new()
            .timeout_connect(std::time::Duration::from_secs(10))
            .timeout_read(std::time::Duration::from_secs(30))
            .build();

        let mut req = match method.to_uppercase().as_str() {
            "GET" => agent.get(&url),
            "POST" => agent.post(&url),
            "DELETE" => agent.delete(&url),
            _ => return Err(format!("unsupported method: {}", method)),
        };

        req = req.set("Content-Type", "application/json");

        let resp = if let Some(b) = body {
            req.send_string(&b)
                .map_err(|e| format!("request failed: {e}"))?
        } else {
            req.call()
                .map_err(|e| format!("request failed: {e}"))?
        };

        let status = resp.status();
        let body_str = resp
            .into_string()
            .map_err(|e| format!("failed to read response: {e}"))?;

        let body_json: serde_json::Value = if body_str.is_empty() {
            serde_json::Value::Null
        } else {
            serde_json::from_str(&body_str)
                .unwrap_or(serde_json::Value::String(body_str))
        };

        Ok(ProxyResponse { status, body: body_json })
    })
    .await
    .map_err(|e| format!("task join error: {e}"))?
}

struct SidecarState {
    port: u16,
    child: Mutex<Option<CommandChild>>,
}

#[tauri::command]
fn get_server_port(state: tauri::State<SidecarState>) -> u16 {
    state.port
}

fn kill_sidecar(child: &mut Option<CommandChild>) {
    if let Some(c) = child.take() {
        eprintln!("[sidecar] killing sidecar process…");
        if let Err(e) = c.kill() {
            eprintln!("[sidecar] kill() failed: {e}");
        } else {
            eprintln!("[sidecar] kill() succeeded");
        }
    } else {
        eprintln!("[sidecar] no child to kill (already taken or never set)");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let port = if cfg!(debug_assertions) {
                8000u16
            } else {
                tauri::async_runtime::block_on(spawn_sidecar(app.handle()))?
            };

            if cfg!(debug_assertions) {
                app.manage(SidecarState {
                    port,
                    child: Mutex::new(None),
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_server_port, proxy_request])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                match app_handle.try_state::<SidecarState>() {
                    Some(state) => match state.child.lock() {
                        Ok(mut child) => kill_sidecar(&mut child),
                        Err(e) => eprintln!("[sidecar] mutex poisoned, cannot kill sidecar: {e}"),
                    },
                    None => eprintln!("[sidecar] SidecarState not found, cannot kill sidecar"),
                }
            }
        });
}

async fn spawn_sidecar(app: &tauri::AppHandle) -> Result<u16, Box<dyn std::error::Error>> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to resolve app data dir: {e}"))?;

    let (mut rx, child) = app
        .shell()
        .sidecar("spotify-to-ytmusic-server")
        .map_err(|e| format!("sidecar binary not found: {e}"))?
        .args(["53000"])
        .env("SPOTIFY_TO_YTMUSIC_DATA_DIR", data_dir.to_string_lossy().as_ref())
        .spawn()
        .map_err(|e| format!("failed to spawn sidecar: {e}"))?;

    let port: u16 = loop {
        match rx.recv().await {
            Some(CommandEvent::Stdout(line)) => {
                let text = String::from_utf8_lossy(&line);
                if let Some(p) = text.trim().strip_prefix("SERVER_LISTENING port=") {
                    match p.parse() {
                        Ok(port) => break port,
                        Err(_) => {
                            eprintln!("[sidecar] invalid SERVER_LISTENING line: {text}");
                        }
                    }
                }
            }
            Some(CommandEvent::Terminated(_)) | None => {
                eprintln!("[sidecar] sidecar exited prematurely — killing before returning error");
                let _ = child.kill();
                return Err("sidecar exited without printing SERVER_LISTENING".into());
            }
            _ => {}
        }
    };

    app.manage(SidecarState {
        port,
        child: Mutex::new(Some(child)),
    });

    Ok(port)
}
