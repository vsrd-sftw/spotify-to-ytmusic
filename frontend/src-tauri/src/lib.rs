use std::process::Command as StdCommand;
use std::sync::Mutex;

use tauri::Manager;
use tauri_plugin_shell::ShellExt;

struct SidecarState {
    port: u16,
    child_handle: Mutex<Option<tauri::async_runtime::JoinHandle<()>>>,
}

#[tauri::command]
fn get_server_port(state: tauri::State<SidecarState>) -> u16 {
    state.port
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let port = if cfg!(debug_assertions) {
                8000u16
            } else {
                spawn_sidecar(app)?
            };

            app.manage(SidecarState {
                port,
                child_handle: Mutex::new(None),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_server_port])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn spawn_sidecar(app: &tauri::App) -> Result<u16, Box<dyn std::error::Error>> {
    use std::io::BufRead;

    let sidecar_command = app
        .shell()
        .sidecar("spotify-to-ytmusic-server")
        .map_err(|e| format!("sidecar binary not found: {e}"))?
        .args(["0"]);

    let (mut rx, child) = sidecar_command
        .spawn()
        .map_err(|e| format!("failed to spawn sidecar: {e}"))?;

    let port: u16;
    if let Some(line) = std::io::BufReader::new(rx.stdout.as_mut().unwrap()).lines().next() {
        let line = line?;
        port = line
            .trim_start_matches("SERVER_LISTENING port=")
            .parse()
            .map_err(|_| format!("invalid SERVER_LISTENING line: {line}"))?;
    } else {
        return Err("sidecar exited without printing SERVER_LISTENING".into());
    }

    let handle = app.handle().clone();
    tokio::task::spawn(async move {
        let _ = child.into_output().await;
        let _ = handle;
    });

    Ok(port)
}
