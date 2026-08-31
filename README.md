# Ledwall Designer

Applicazione desktop offline-first per progettare ledwall, cablaggi dati ed
elettrici, verificare la capacita dei controller NovaStar e generare pixelmap e
documentazione tecnica.

## Stato

Il progetto e in fase MVP. La piattaforma primaria e macOS; l'architettura
Tauri 2 + React/TypeScript mantiene aperta la distribuzione Windows.

## Sviluppo

Prerequisiti:

- Node.js e pnpm
- Rust stable
- Xcode Command Line Tools su macOS

```bash
pnpm install
pnpm test
pnpm tauri dev
```

Build locale macOS:

```bash
pnpm tauri build
```

I dati e i calcoli sono locali. L'app non richiede un server e non richiede una
connessione Internet per funzionare.

## Installazione macOS

La build attuale e per Mac Apple Silicon (ARM64) e non e firmata con un
certificato Apple Developer. Aprire il DMG, trascinare **Ledwall Designer** in
Applicazioni e, al primo avvio, fare clic destro sull'app e scegliere **Apri**.
Se macOS la blocca ancora, usare **Impostazioni di Sistema > Privacy e
Sicurezza > Apri comunque**.

Il progetto viene salvato manualmente nel formato locale `.lwd`. Librerie,
calcoli, pixelmap e report continuano a funzionare senza connessione Internet.

## Cablaggio dati manuale

Nella vista **Dati**, selezionare il primo cabinet e scegliere la porta di
partenza, oppure usare **+ Nuova porta** nella toolbar (`N`). La traccia si
attiva automaticamente: tenere premuto sul cabinet e trascinare sugli altri
nell'ordine fisico del cavo. `Invio`, `Esc`, doppio clic sul canvas o il pulsante
**Termina** nella toolbar chiudono subito la traccia. **Annulla ultimo tratto** rimuove l'ultimo cabinet aggiunto, mentre
**Rimuovi cabinet dalla porta** scollega il cabinet selezionato.

Nella vista **Elettrico**, selezionare il primo cabinet e usare **+ Nuova linea**
nella toolbar (`N`), oppure scegliere una linea esistente. Trascinare sui cabinet nell'ordine fisico del
cavo; carico, corrente e percentuale di utilizzo vengono aggiornati durante il
disegno. Sono disponibili anche annullamento dell'ultimo tratto e rimozione del
cabinet dalla linea.

Un cabinet selezionato può essere eliminato dal pulsante sopra il canvas,
dal pannello **Disegno** oppure con `Canc`/`Backspace`. L'operazione rimuove
anche i relativi riferimenti da dati, elettrico e sospensioni; il comando
**Annulla** consente di ripristinarlo.

## Selezione multipla e cabinet strutturali

Usare `Cmd`/`Ctrl` durante il clic per aggiungere o rimuovere un cabinet;
`Shift` + clic seleziona l'intera riga e `Cmd+A`/`Ctrl+A` seleziona tutti i
cabinet del canvas. I cabinet selezionati possono essere eliminati insieme oppure
assegnati in blocco a una porta dati o a una linea elettrica. Dal pannello
**Disegno** è inoltre possibile escluderli dalla pixelmap: restano presenti nel
progetto, nel peso e nella struttura, ma non vengono disegnati nell'output PNG
e vengono ignorati dai cablaggi automatici dati ed elettrici.

## Piastre di sostegno MG7S

Il manuale Yestech richiede le piastre di collegamento da 4 m di altezza
sospesa, equivalenti a 8 cabinet MG7S da 500 mm, e prescrive un rinforzo della
struttura o un consulto tecnico oltre 12 m. Nel pannello **Peso** l'app può
generare automaticamente una sola fila di piastre a 4 m dal bordo inferiore o
aggiungerle manualmente. Sono disponibili piastre semplici e piastre con
aliscaf per il collegamento a una truss; posizione, tipo e peso restano
modificabili.

## Importazione RCFG / RCFGX

La libreria cabinet può importare configurazioni NovaStar `.rcfg`, `.rcfgx` e
`.rfcg`: vengono letti risoluzione cabinet, dimensioni modulo in pixel, scan e
receiving card. Misure fisiche, pitch, peso e consumi rimangono modificabili e
devono essere verificati, perché non sono dati affidabili nel formato NovaStar.
La vista cabinet può essere filtrata per produttore.

## Flybar, accessori e report

Le librerie di flybar e accessori sono separate per produttore e completamente
modificabili. Nel pannello **Peso** si possono applicare manualmente le flybar
alle colonne selezionate, sia in sospensione sia in appoggio; l'app mostra per
ogni elemento peso cabinet, cavi/accessori, piastre, carico supportato, portata e
percentuale di utilizzo. La portata iniziale del beam MG7S è 200 kg, mentre il
peso proprio resta a zero finché non viene inserito un valore verificato.

La relazione tecnica include una tavola rigging per ogni schermo con piastre e
flybar evidenziate e la distinta dei pesi per ogni flybar. Il PDF cablaggi usa
pagine distinte per dati ed elettrico. Progetto `.lwd`, PDF e PNG includono nel
nome il numero di revisione del progetto.

## Fonti tecniche

Le capacita dei controller precaricati derivano dalla documentazione ufficiale
NovaStar. Ogni modello conserva un riferimento alla fonte e i valori rimangono
modificabili dall'utente.

Il modello cabinet iniziale e Yestech MG7S 3.9 Outdoor, ricavato dalla scheda
tecnica fornita e dai valori operativi indicati dall'utente.
