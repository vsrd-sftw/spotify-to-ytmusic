use std::sync::Mutex;

use tauri::Manager;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

struct SidecarState {
    port: u16,
    _child: Mutex<Option<tauri_plugin_shell::process::CommandChild>>,
}

#[tauri::command]
fn get_server_port(state: tauri::State<SidecarState>) -> u16 {
    state.port
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

            app.manage(SidecarState {
                port,
                _child: Mutex::new(None),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_server_port])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn spawn_sidecar(app: &tauri::AppHandle) -> Result<u16, Box<dyn std::error::Error>> {
    let (mut rx, child) = app
        .shell()
        .sidecar("spotify-to-ytmusic-server")
        .map_err(|e| format!("sidecar binary not found: {e}"))?
        .args(["0"])
        .spawn()
        .map_err(|e| format!("failed to spawn sidecar: {e}"))?;

    let port: u16;
    loop {
        match rx.recv().await {
            Some(CommandEvent::Stdout(line)) => {
                let text = String::from_utf8_lossy(&line);
                if let Some(p) = text.trim().strip_prefix("SERVER_LISTENING port=") {
                    port = p
                        .parse()
                        .map_err(|_| format!("invalid SERVER_LISTENING line: {text}"))?;
                    break;
                }
            }
            Some(CommandEvent::Terminated(_)) | None => {
                return Err("sidecar exited without printing SERVER_LISTENING".into());
            }
            _ => {}
        }
    }

    tauri::async_runtime::spawn(async move {
        let _ = child;
    });

    Ok(port)
}
