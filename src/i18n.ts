export type AppLanguage = "it" | "en";

const STORAGE_KEY = "ledwall-designer:language:v1";

export function readLanguage(): AppLanguage {
  try {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "it";
  } catch {
    return "it";
  }
}

export function saveLanguage(language: AppLanguage): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // The selected language still applies for the current session.
  }
}

export function numberLocale(): string {
  return readLanguage() === "en" ? "en-GB" : "it-IT";
}

const english: Record<string, string> = {
  "Nuovo": "New", "Apri": "Open", "Salva": "Save", "Salva con nome": "Save as",
  "Non salvato": "Unsaved", "Annulla": "Cancel", "Ripristina": "Restore",
  "Progetto": "Project", "Disegno": "Design", "Dati": "Data", "Elettrico": "Electrical",
  "Peso": "Weight", "Librerie": "Libraries", "Vista": "View", "Schermo": "Screen",
  "Segnale dati": "Data signal", "Peso e rigging": "Weight and rigging",
  "Dati generali": "General information", "Canvas e cabinet": "Canvas and cabinets",
  "230 V monofase": "230 V single-phase", "Stima statica": "Static estimate",
  "Database locale": "Local database", "Consegna": "Deliverables",
  "Identificazione": "Identification", "Nome progetto / Evento": "Project / event name",
  "Azienda": "Company", "Cliente": "Client", "Autore": "Author",
  "Revisione": "Revision", "Data": "Date", "Logo report/pixelmap": "Report/pixelmap logo",
  "PNG o JPEG, memorizzato nel progetto": "PNG or JPEG, stored in the project",
  "Canvas video": "Video canvas", "Larghezza px": "Width px", "Altezza px": "Height px",
  "Schermi": "Screens", "+ Schermo": "+ Screen", "Nome schermo": "Screen name",
  "Crea bulk": "Create grid", "Elimina": "Delete", "Selezione": "Selection",
  "Tutto lo schermo": "Entire screen", "Deseleziona": "Deselect",
  "Escludi dalla pixelmap": "Exclude from pixelmap", "Cabinet selezionato": "Selected cabinet",
  "Seleziona un cabinet nel canvas per modificarlo.": "Select a cabinet on the canvas to edit it.",
  "Modello": "Model", "Riga": "Row", "Colonna": "Column", "Rotazione": "Rotation",
  "Fisico": "Physical", "Duplica": "Duplicate", "Elimina selezione": "Delete selection",
  "Controller NovaStar": "NovaStar controller", "Nome istanza": "Instance name",
  "Margine sicurezza %": "Safety margin %", "Ridondanza": "Redundancy",
  "Per porta": "Per port", "Totale": "Total",
  "Calcola cablaggio automatico": "Calculate automatic wiring",
  "Cablaggio manuale": "Manual wiring",
  "Tieni premuto sul cabinet e trascina sugli altri nell’ordine di cablaggio.":
    "Hold on the cabinet and drag across the others in wiring order.",
  "Seleziona il primo cabinet sul canvas, poi scegli la porta da cui partire.":
    "Select the first cabinet on the canvas, then choose the starting port.",
  "Porta di partenza": "Starting port", "Non assegnato": "Unassigned",
  "Prima": "Before", "Dopo": "After", "Rimuovi cabinet dalla porta": "Remove cabinets from port",
  "Annulla ultimo tratto": "Undo last segment", "Termina traccia": "Finish trace",
  "Porte e backup": "Ports and backup", "Assegna backup automatici": "Assign backup ports automatically",
  "Nessuna porta assegnata.": "No ports assigned.", "Carico NovaLCT": "NovaLCT load",
  "Carico": "Load", "Ordine": "Order", "Backup interno": "Internal backup",
  "Backup secondo controller": "Backup on second controller",
  "Modifica percorso": "Edit path", "Impianto 230 V monofase": "230 V single-phase supply",
  "Volt": "Volts", "Ampere": "Amps", "Uso %": "Usage %",
  "Distribuisci linee automaticamente": "Distribute power lines automatically",
  "Disegno manuale linee": "Manual line drawing",
  "Tieni premuto sul cabinet e trascina sugli altri per definire il percorso del cavo elettrico.":
    "Hold on the cabinet and drag across the others to define the power cable route.",
  "Seleziona il primo cabinet sul canvas, poi scegli una linea esistente o creane una nuova.":
    "Select the first cabinet on the canvas, then choose an existing line or create a new one.",
  "Linea di partenza": "Starting line", "Rimuovi cabinet dalla linea": "Remove cabinets from line",
  "Stime accessori": "Accessory estimates", "Cavi kg/cabinet": "Cables kg/cabinet",
  "U-shape/piastre kg/cabinet": "U-shapes/plates kg/cabinet",
  "Hardware sospensione kg/punto": "Hanging hardware kg/point",
  "Quota stimata di hanging bar, giunti e grilli attribuita a ciascun punto; non è la portata del punto.":
    "Estimated hanging bars, couplers and shackles assigned to each point; this is not the point's load rating.",
  "Piastra semplice kg": "Standard plate kg", "Piastra aliscaf kg": "Clamp plate kg",
  "Genera punti per colonna": "Generate points by column",
  "Accessori": "Accessories", "Soglia automatica (m)": "Automatic threshold (m)",
  "Genera una piastra in ogni giunto interno 2×2 entro la distanza impostata dal bordo superiore. La funzione è disponibile per tutti i modelli di cabinet.":
    "Place a plate at every internal 2×2 joint within the set distance from the top edge. Available for every cabinet model.",
  "Tipo piastra": "Plate type", "Piastra semplice": "Standard plate",
  "Piastra con aliscaf per truss": "Plate with truss clamp",
  "Genera automatiche": "Generate automatically", "Aggiungi manuale": "Add manually",
  "Tipo": "Type", "Semplice": "Standard", "Con aliscaf": "With clamp",
  "Trascina la piastra direttamente sul disegno.": "Drag the plate directly on the drawing.",
  "Elimina piastra": "Delete plate", "Flybar manuali": "Manual flybars",
  "Installazione": "Installation", "Sospesa": "Hanging", "In appoggio": "Ground supported",
  "Aggiungi alle colonne selezionate": "Add to selected columns",
  "Il manuale MG7S consente l'hanging beam sia sospesa sia come supporto a terra. La portata deve essere verificata sul modello reale.":
    "The MG7S manual allows the hanging beam both suspended and as a ground support. Verify the load rating for the actual model.",
  "Trascina la flybar direttamente sul disegno.": "Drag the flybar directly on the drawing.",
  "Elimina flybar": "Delete flybar", "Carichi stimati": "Estimated loads",
  "Totale sospeso": "Total suspended", "Posizione X mm": "X position mm",
  "Stima statica di pre-progettazione. Non sostituisce un calcolo strutturale certificato.":
    "Preliminary static estimate. It does not replace a certified structural calculation.",
  "Output selezionato": "Selected output", "Elementi test pattern": "Test pattern elements",
  "Griglia cabinet": "Cabinet grid", "Coordinate riga,colonna": "Row,column coordinates",
  "Cerchi": "Circles", "Diagonali": "Diagonals", "Barre colore": "Color bars",
  "Scala di grigi": "Grayscale", "Risoluzione": "Resolution",
  "Esporta PNG": "Export PNG", "Pixelmap schermo nativa": "Native screen pixelmap",
  "Libreria condivisa": "Shared library", "Aggiorna dalla rete": "Update from network",
  "Importa CSV locale": "Import local CSV",
  "Puoi usare lo stesso file scaricato da GitHub o modificato con Excel.":
    "You can use the same file downloaded from GitHub or edited in Excel.",
  "Tipo accessorio": "Accessory type", "Piastre e altri accessori": "Plates and other accessories",
  "Modelli": "Models", "+ Nuovo": "+ New", "Produttore": "Manufacturer",
  "Tutti i produttori": "All manufacturers",
  "Importa configurazione NovaStar": "Import NovaStar configuration",
  "File RCFG / RCFGX": "RCFG / RCFGX file",
  "Importa risoluzione, moduli, scan e receiving card. I dati meccanici restano modificabili.":
    "Import resolution, modules, scan and receiving card. Mechanical data remains editable.",
  "Dati cabinet": "Cabinet data", "Marca": "Brand", "Peso kg": "Weight kg",
  "W medi": "W average", "Note": "Notes", "Dati Sending Card": "Sending Card data",
  "Nome": "Name", "Porte": "Ports", "Pixel totali": "Total pixels",
  "Pixel/s porta 8 bit": "Pixels/s per port, 8-bit",
  "Pixel/s porta 10/12 bit": "Pixels/s per port, 10/12-bit",
  "Fonte ufficiale": "Official source", "Dati flybar": "Flybar data",
  "Lunghezza mm": "Length mm", "Portata kg": "Load rating kg",
  "Installazione sospesa": "Hanging installation",
  "Installazione in appoggio": "Ground-supported installation",
  "Dati accessorio": "Accessory data", "Categoria": "Category",
  "Connettore": "Connector", "Piastra": "Plate", "Altro": "Other",
  "Peso unitario kg": "Unit weight kg", "Elimina modello": "Delete model",
  "Stato progetto": "Project status", "Potenza max": "Maximum power",
  "Peso stimato": "Estimated weight", "Documentazione PDF": "PDF documentation",
  "PDF tecnico + distinta": "Technical PDF + materials list",
  "PDF cablaggi A3": "A3 wiring PDF", "Pixelmap PNG": "Pixelmap PNG",
  "Schermo selezionato": "Selected screen", "Canvas master": "Master canvas",
  "Generazione bulk": "Bulk generation", "Crea matrice cabinet": "Create cabinet grid",
  "Chiudi": "Close", "Modello cabinet": "Cabinet model", "Righe": "Rows",
  "Colonne": "Columns", "X iniziale (px)": "Starting X (px)",
  "Y iniziale (px)": "Starting Y (px)",
  "Sostituisci i cabinet già presenti nello schermo":
    "Replace cabinets already on the screen",
  "Risultato": "Result", "Crea matrice": "Create grid",
  "Pronto": "Ready", "Elaborazione…": "Processing…",
  "Nuova porta": "New port", "Nuova linea": "New line",
  "Scorciatoia: N": "Shortcut: N",
  "Scorciatoia: Invio o Esc": "Shortcut: Enter or Esc",
  "Elimina il cabinet selezionato (Canc/Backspace)":
    "Delete the selected cabinet (Delete/Backspace)",
  "Clic normale: singolo · Cmd/Ctrl + clic: aggiungi/rimuovi · Shift + clic: intera riga · Cmd/Ctrl+A: tutto il canvas.":
    "Click: single · Cmd/Ctrl+click: add/remove · Shift+click: entire row · Cmd/Ctrl+A: entire canvas.",
  "RELAZIONE TECNICA": "TECHNICAL REPORT",
  "Riepilogo progetto": "Project summary",
  "Pixel attivi in pixelmap": "Active pixels in pixelmap",
  "Assorbimento massimo": "Maximum power draw",
  "Assorbimento medio": "Average power draw",
  "Peso cabinet": "Cabinet weight",
  "Peso stimato sospeso": "Estimated suspended weight",
  "Profilo": "Profile", "Distribuzione elettrica": "Power distribution",
  "Numero linee": "Number of lines", "Distinta materiali": "Bill of materials",
  "Peso totale per flybar": "Total weight per flybar",
  "Nessuna flybar inserita. Le piastre sono evidenziate nel disegno.":
    "No flybars added. Plates are highlighted in the drawing.",
  "CABLAGGIO DATI": "DATA WIRING", "CABLAGGIO ELETTRICO": "POWER WIRING",
  "Nessun cabinet nello schermo.": "No cabinets on this screen.",
  "Cliente N/D": "Client N/A", "OLTRE LIMITE": "OVER LIMIT",
  "N/D": "N/A", "NON ASSEGNATO": "UNASSIGNED",
  "Limite operativo:": "Operating limit:",
  "W per linea": "W per line",
  "Altezza schermo:": "Screen height:",
  "sotto soglia": "below threshold",
  "piastre automatiche previste": "automatic plates planned",
  "In uso:": "In use:",
  "ultimo aggiornamento": "last updated",
  "Pixelmap master": "Master pixelmap",
  "Lo schermo non contiene cabinet.": "The screen has no cabinets.",
  "Lo schermo selezionato non contiene cabinet.": "The selected screen has no cabinets.",
  "NON CABLATO": "NOT WIRED",
  "px reali +": "real px +",
  "px virtuali · rettangolo": "virtual px · bounding box",
  "medi": "average",
  "automatiche previste": "planned automatically",
  "Backup controller non definito": "Backup controller not specified",
  "Altezza superiore a 12 m: verificare il rinforzo della struttura e le prescrizioni del produttore del modello utilizzato.":
    "Height above 12 m: check structural reinforcement and the cabinet manufacturer's requirements.",
  "Nuovo progetto creato": "New project created",
  "Cablaggio manuale terminato": "Manual wiring finished",
  "Disegno linea elettrica terminato": "Power line drawing finished",
  "Punti di sospensione rigenerati per colonna": "Suspension points regenerated by column",
  "Seleziona uno schermo.": "Select a screen.",
  "Canvas 2D non disponibile.": "2D canvas unavailable.",
  "Logo non leggibile": "Cannot read logo",
  "PNG non generato": "PNG could not be generated",
  "Esporta pixelmap PNG": "Export pixelmap PNG",
  "Il file non e un progetto Ledwall Designer supportato.":
    "This is not a supported Ledwall Designer project file.",
  "Il pacchetto RCFGX non contiene un file XML leggibile.":
    "The RCFGX package contains no readable XML file.",
  "Il file RCFG/RCFGX non contiene XML NovaStar valido.":
    "The RCFG/RCFGX file contains no valid NovaStar XML.",
  "Risoluzione cabinet Width/Height non trovata nel file NovaStar.":
    "Cabinet Width/Height resolution not found in the NovaStar file.",
  "Il CSV della libreria è vuoto.": "The library CSV is empty.",
  "Il CSV non contiene righe valide. Usa type: cabinet, sending_card, flybar o accessory.":
    "The CSV contains no valid rows. Use type: cabinet, sending_card, flybar or accessory.",
  "HDR usa internamente il profilo di capacita 10/12 bit anche se e selezionato 8 bit.":
    "HDR uses the 10/12-bit capacity profile internally even when 8-bit is selected.",
  "Low latency: verificare il vincolo di caricamento verticale previsto da NovaStar.":
    "Low latency: check NovaStar's vertical loading constraint.",
  "piastra di sostegno semplice": "standard support plate",
  "piastra con aliscaf per truss": "plate with truss clamp",
  "Le stime di peso e distribuzione non costituiscono un calcolo strutturale certificato. Verificare sempre rigging, portate e condizioni reali con un tecnico abilitato.":
    "Weight and load estimates are not a certified structural calculation. Always have a qualified engineer verify rigging, load ratings and actual site conditions.",
  "Download della libreria in corso…": "Downloading library…",
  "Seleziona almeno un cabinet: verrà creata una flybar per ogni colonna selezionata.":
    "Select at least one cabinet: one flybar will be created for each selected column.",
  "La modalità scelta non è prevista dal modello di flybar.":
    "The selected installation mode is not supported by this flybar model.",
};

export function translateText(value: string, language: AppLanguage): string {
  if (language === "it" || !value.trim()) return value;
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const core = value.trim();
  const exact = english[core];
  if (exact) return leading + exact + trailing;
  if (core.endsWith(":") && english[core.slice(0, -1)]) {
    return leading + english[core.slice(0, -1)] + ":" + trailing;
  }
  const patterns: [RegExp, string][] = [
    [/^Selezione \((\d+)\)$/, "Selection ($1)"],
    [/^Linee \((\d+)\)$/, "Lines ($1)"],
    [/^Elimina (\d*) cabinet$/, "Delete $1 cabinets"],
    [/^\+ Nuova porta$/, "+ New port"],
    [/^\+ Nuova linea$/, "+ New line"],
    [/^Termina P-(\d+)$/, "Finish P-$1"],
    [/^Termina L-(\d+)$/, "Finish L-$1"],
    [/^Traccia P-(\d+) attiva$/, "Tracing P-$1"],
    [/^Traccia L-(\d+) attiva$/, "Tracing L-$1"],
    [/^Continua traccia P-(\d+)$/, "Continue tracing P-$1"],
    [/^Continua traccia L-(\d+)$/, "Continue tracing L-$1"],
    [/^Porta (\d+)$/, "Port $1"],
    [/^Linea (\d+)$/, "Line $1"],
    [/^Nuova linea (\d+)$/, "New line $1"],
    [/^Piastra (\d+)$/, "Plate $1"],
    [/^Limite operativo: (.+) W per linea$/, "Operating limit: $1 W per line"],
    [/^Altezza schermo: (.+) m · (\d+) piastre automatiche previste$/, "Screen height: $1 m · $2 automatic plates planned"],
    [/^Altezza schermo: (.+) m · sotto soglia$/, "Screen height: $1 m · below threshold"],
    [/^(.+) cabinet selezionati · ultimo: (.+)$/, "$1 cabinets selected · last: $2"],
    [/^(.+) px reali \+ (.+) px virtuali · rettangolo (.+) px$/, "$1 real px + $2 virtual px · bounding box $3 px"],
    [/^(.+) kg supportati \/ (.+) kg$/, "$1 kg supported / $2 kg"],
    [/^(.+) kg cabinet \+ (.+) kg cavi\/accessori \+ (.+) kg piastre$/, "$1 kg cabinets + $2 kg cables/accessories + $3 kg plates"],
    [/^Peso flybar: (.+) kg · utilizzo (.+)%$/, "Flybar weight: $1 kg · utilization $2%"],
    [/^(.+) kg cavi, accessori e hardware$/, "$1 kg cables, accessories and hardware"],
    [/^(.+) kg stimati sul punto$/, "$1 kg estimated at point"],
    [/^(.+) flybar aggiunte manualmente alle colonne selezionate\.$/, "$1 flybars added to the selected columns."],
    [/^(\d+) piastre automatiche previste$/, "$1 automatic plates planned"],
    [/^Altezza (.+) m: generate (\d+) piastre sui giunti interni nei primi (.+) m dal bordo superiore\.$/,
      "Height $1 m: $2 plates placed at internal joints within $3 m of the top edge."],
    [/^Altezza (.+) m: piastre non obbligatorie secondo la soglia impostata di (.+) m\.$/,
      "Height $1 m: plates are not required below the configured $2 m threshold."],
    [/^(.+) px reali \+$/, "$1 real px +"],
    [/^(.+) px virtuali · rettangolo$/, "$1 virtual px · bounding box"],
    [/^In uso: (.+)$/, "In use: $1"],
    [/^ · ultimo aggiornamento (.+)$/, " · last updated $1"],
    [/^(.+) altri accessori$/, "$1 other accessories"],
    [/^Libreria aggiornata: (.+)\. La copia locale è pronta anche offline\.$/,
      "Library updated: $1. The local copy is available offline."],
    [/^Libreria locale invariata\. (.+)$/, "Local library unchanged. $1"],
    [/^Libreria importata da (.+): (.+)\.$/, "Library imported from $1: $2."],
    [/^Importato (.+)\. Verifica i dati fisici evidenziati nel modello\.$/,
      "Imported $1. Check the highlighted physical properties in the model."],
    [/^PDF esportato: (.+)$/, "PDF exported: $1"],
    [/^Pixelmap esportata: (.+)$/, "Pixelmap exported: $1"],
    [/^Porta (\d+): (\d+) cabinet$/, "Port $1: $2 cabinets"],
    [/^Linea (\d+): (\d+) cabinet - (.+) kW massimo - (.+) kW medio$/,
      "Line $1: $2 cabinets - $3 kW maximum - $4 kW average"],
    [/^(.+) x piastra di sostegno semplice$/, "$1 x standard support plate"],
    [/^(.+) x piastra con aliscaf per truss$/, "$1 x plate with truss clamp"],
    [/^Linee elettriche - (.+) V monofase$/, "Power lines - $1 V single-phase"],
    [/^L-(\d+): (.+) W max - (.+) A - (.+)% - (.+)$/, "L-$1: $2 W max - $3 A - $4% - $5"],
    [/^Main P-(\d+) -> backup interno P-(.+) \| (.+)$/, "Main P-$1 -> internal backup P-$2 | $3"],
    [/^backup controller non definito$/, "backup controller not specified"],
    [/^Le stime di peso e distribuzione non costituiscono un calcolo strutturale certificato\. (.+)$/,
      "Weight and load estimates are not a certified structural calculation. $1"],
    [/^Ledwall Designer - pagina (\d+)\/(\d+)$/, "Ledwall Designer - page $1/$2"],
    [/^Controller - (.+)$/, "Controller - $1"],
    [/^CABLAGGIO DATI - (.+)$/, "DATA WIRING - $1"],
    [/^CABLAGGIO ELETTRICO - (.+)$/, "POWER WIRING - $1"],
    [/^(.+) \| Cliente N\/D \| Rev\. (.+)$/, "$1 | Client N/A | Rev. $2"],
    [/^ · ordine (\d+)$/, " · order $1"],
    [/^ · non cablato$/, " · not wired"],
    [/^ · senza alimentazione$/, " · without power"],
    [/^Peso flybar: (.+)$/, "Flybar weight: $1"],
    [/^Creata matrice (.+) \((\d+) cabinet\)$/, "Created grid $1 ($2 cabinets)"],
    [/^Salvato: (.+)$/, "Saved: $1"],
    [/^Aperto: (.+)$/, "Opened: $1"],
    [/^Riga (\d+): (\d+) cabinet selezionati$/, "Row $1: $2 cabinets selected"],
    [/^(\d+) cabinet selezionati in (.+)$/, "$1 cabinets selected in $2"],
    [/^(\d+) cabinet selezionati nel canvas$/, "$1 cabinets selected on the canvas"],
    [/^(\d+) cabinet esclusi dalla pixelmap$/, "$1 cabinets excluded from the pixelmap"],
    [/^(\d+) cabinet riammessi nella pixelmap$/, "$1 cabinets restored to the pixelmap"],
    [/^(\d+) cabinet eliminati · usa Annulla per ripristinarli$/, "$1 cabinets deleted · use Undo to restore them"],
    [/^Cablaggio creato su (\d+) porte$/, "Wiring created on $1 ports"],
    [/^(\d+) cabinet rimossi dalla porta dati$/, "$1 cabinets removed from the data port"],
    [/^(\d+) cabinet assegnati a P-(\d+); traccia attiva$/, "$1 cabinets assigned to P-$2; trace active"],
    [/^Nessuna porta libera su (.+)$/, "No free ports on $1"],
    [/^Cabinet aggiunto alla traccia P-(\d+)$/, "Cabinet added to trace P-$1"],
    [/^Traccia P-(\d+) attiva: trascina per continuare il percorso$/,
      "Trace P-$1 active: drag to continue the route"],
    [/^Ultimo cabinet rimosso dalla traccia P-(\d+)$/, "Last cabinet removed from trace P-$1"],
    [/^La porta P-(\d+) non contiene cabinet$/, "Port P-$1 contains no cabinets"],
    [/^Distribuzione elettrica: (\d+) linee$/, "Power distribution: $1 lines"],
    [/^Cabinet aggiunto alla linea elettrica L-(\d+)$/, "Cabinet added to power line L-$1"],
    [/^Traccia elettrica L-(\d+) attiva$/, "Power trace L-$1 active"],
    [/^(\d+) cabinet rimossi dalla linea elettrica$/, "$1 cabinets removed from the power line"],
    [/^(\d+) cabinet assegnati a L-(\d+); traccia attiva$/, "$1 cabinets assigned to L-$2; trace active"],
    [/^Ultimo cabinet rimosso dalla linea L-(\d+)$/, "Last cabinet removed from line L-$1"],
    [/^La linea L-(\d+) non contiene cabinet$/, "Line L-$1 contains no cabinets"],
    [/^(\d+) piastre automatiche generate$/, "$1 automatic plates generated"],
    [/^(\d+) piastre automatiche generate; (\d+) giunti già coperti da piastre manuali$/,
      "$1 automatic plates generated; $2 joints already covered by manual plates"],
    [/^Piastra (con aliscaf|semplice) aggiunta$/, "$1 plate added"],
    [/^Download non riuscito: HTTP (.+)\.$/, "Download failed: HTTP $1."],
    [/^(.+): (\d+) Hz non e elencato tra i frame rate supportati\.$/,
      "$1: $2 Hz is not listed among supported frame rates."],
    [/^(.+): profondita (\d+) bit non supportata dal profilo\.$/,
      "$1: $2-bit depth is not supported by this profile."],
    [/^(.+): (HDR|3D) non supportato\.$/, "$1: $2 is not supported."],
    [/^(.+): low latency non supportata\.$/, "$1: low latency is not supported."],
    [/^(.+): backup di porta non supportato\.$/, "$1: port backup is not supported."],
  ];
  for (const [pattern, replacement] of patterns) {
    if (pattern.test(core)) return leading + core.replace(pattern, replacement) + trailing;
  }
  return value;
}

const originalText = new WeakMap<Text, string>();
const translatedText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const translatedAttributes = new WeakMap<Element, Map<string, string>>();

export function observeTranslations(root: HTMLElement, language: AppLanguage): () => void {
  const translateNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node as Text;
      const parent = text.parentElement;
      if (!parent || parent.closest("script, style, textarea, [contenteditable], .project-heading strong, .screen-list-item span")) return;
      const current = text.nodeValue ?? "";
      if (!originalText.has(text) || current !== translatedText.get(text)) originalText.set(text, current);
      const translated = translateText(originalText.get(text) ?? current, language);
      translatedText.set(text, translated);
      if (current !== translated) text.nodeValue = translated;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;
    for (const name of ["title", "aria-label", "placeholder"]) {
      const current = element.getAttribute(name);
      if (current === null) continue;
      let originals = originalAttributes.get(element);
      let translations = translatedAttributes.get(element);
      if (!originals) { originals = new Map(); originalAttributes.set(element, originals); }
      if (!translations) { translations = new Map(); translatedAttributes.set(element, translations); }
      if (!originals.has(name) || current !== translations.get(name)) originals.set(name, current);
      const translated = translateText(originals.get(name) ?? current, language);
      translations.set(name, translated);
      if (current !== translated) element.setAttribute(name, translated);
    }
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let child: Node | null;
    while ((child = walker.nextNode())) translateNode(child);
    element.querySelectorAll("[title], [aria-label], [placeholder]").forEach((child) => {
      for (const name of ["title", "aria-label", "placeholder"]) {
        if (child.hasAttribute(name)) {
          const current = child.getAttribute(name)!;
          let originals = originalAttributes.get(child);
          let translations = translatedAttributes.get(child);
          if (!originals) { originals = new Map(); originalAttributes.set(child, originals); }
          if (!translations) { translations = new Map(); translatedAttributes.set(child, translations); }
          if (!originals.has(name) || current !== translations.get(name)) originals.set(name, current);
          const translated = translateText(originals.get(name) ?? current, language);
          translations.set(name, translated);
          if (current !== translated) child.setAttribute(name, translated);
        }
      }
    });
  };
  translateNode(root);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "childList") record.addedNodes.forEach(translateNode);
      else translateNode(record.target);
    }
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["title", "aria-label", "placeholder"] });
  return () => observer.disconnect();
}
