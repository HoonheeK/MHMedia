use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::sync::Mutex;
use tauri::{Emitter, Manager, State};

#[derive(Debug, Serialize, Deserialize)]
pub struct MediaFileInfo {
    pub name: String,
    pub path: String,
    pub extension: String,
    pub size_bytes: u64,
    pub media_type: String, // "audio" | "video"
}

fn classify_media(ext: &str) -> Option<&'static str> {
    match ext.to_lowercase().as_str() {
        "mp3" | "wav" | "flac" | "ogg" | "aac" | "m4a" | "wma" => Some("audio"),
        "mp4" | "webm" | "mkv" | "mov" | "avi" | "wmv" | "flv" | "m4v" => Some("video"),
        _ => None,
    }
}

fn extract_valid_paths(args: &[String]) -> Vec<String> {
    args.iter()
        .skip(1)
        .filter_map(|arg| {
            // 따옴표나 공백 트림
            let trimmed = arg.trim_matches('"');
            let p = Path::new(trimmed);
            if p.exists() {
                Some(trimmed.to_string())
            } else {
                None
            }
        })
        .collect()
}

struct InitialFiles(Mutex<Vec<String>>);

#[tauri::command]
fn get_initial_files(state: State<'_, InitialFiles>) -> Vec<String> {
    let mut files = state.0.lock().unwrap();
    let result = files.clone();
    files.clear();
    result
}

#[tauri::command]
fn inspect_media_file(file_path: String) -> Result<MediaFileInfo, String> {
    let path = Path::new(&file_path);
    if !path.exists() || !path.is_file() {
        return Err("File does not exist or is not a valid file".into());
    }

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let media_type = classify_media(&ext).unwrap_or("unknown").to_string();

    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();

    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;

    Ok(MediaFileInfo {
        name,
        path: file_path,
        extension: ext,
        size_bytes: metadata.len(),
        media_type,
    })
}

#[tauri::command]
fn scan_media_folder(folder_path: String) -> Result<Vec<MediaFileInfo>, String> {
    let folder = Path::new(&folder_path);
    if !folder.exists() || !folder.is_dir() {
        return Err("Directory does not exist".into());
    }

    let mut media_files = Vec::new();

    if let Ok(entries) = fs::read_dir(folder) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    if let Some(media_type) = classify_media(ext) {
                        let name = path
                            .file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("Unknown")
                            .to_string();
                        let size_bytes = entry.metadata().map(|m| m.len()).unwrap_or(0);
                        let file_path = path.to_string_lossy().to_string();

                        media_files.push(MediaFileInfo {
                            name,
                            path: file_path,
                            extension: ext.to_lowercase(),
                            size_bytes,
                            media_type: media_type.to_string(),
                        });
                    }
                }
            }
        }
    }

    // 이름순 정렬
    media_files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(media_files)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let raw_args: Vec<String> = std::env::args().collect();
    let initial_paths = extract_valid_paths(&raw_args);

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let valid_paths = extract_valid_paths(&args);
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
            if !valid_paths.is_empty() {
                let _ = app.emit("open-files", valid_paths);
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(InitialFiles(Mutex::new(initial_paths)))
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(icon) = tauri::image::Image::from_bytes(include_bytes!("../icons/128x128.png")) {
                    let _ = window.set_icon(icon);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_initial_files,
            inspect_media_file,
            scan_media_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
