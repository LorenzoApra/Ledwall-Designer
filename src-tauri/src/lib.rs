use std::fs;
use std::path::Path;

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|error| format!("Impossibile leggere {path}: {error}"))
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    ensure_parent_exists(&path)?;
    fs::write(&path, contents).map_err(|error| format!("Impossibile salvare {path}: {error}"))
}

#[tauri::command]
fn write_binary_file(path: String, contents: Vec<u8>) -> Result<(), String> {
    ensure_parent_exists(&path)?;
    fs::write(&path, contents).map_err(|error| format!("Impossibile salvare {path}: {error}"))
}

fn ensure_parent_exists(path: &str) -> Result<(), String> {
    let parent = Path::new(path)
        .parent()
        .ok_or_else(|| format!("Percorso non valido: {path}"))?;

    if !parent.exists() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Impossibile creare {}: {error}", parent.display()))?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            write_binary_file
        ])
        .run(tauri::generate_context!())
        .expect("errore durante l'avvio di Ledwall Designer");
}
