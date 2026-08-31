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
partenza. La traccia si attiva automaticamente: tenere premuto sul cabinet e
trascinare sugli altri nell'ordine fisico del cavo, quindi scegliere **Termina
traccia**. **Annulla ultimo tratto** rimuove l'ultimo cabinet aggiunto, mentre
**Rimuovi cabinet dalla porta** scollega il cabinet selezionato.

Nella vista **Elettrico**, selezionare il primo cabinet e scegliere una linea
esistente oppure **Nuova linea**. Trascinare sui cabinet nell'ordine fisico del
cavo; carico, corrente e percentuale di utilizzo vengono aggiornati durante il
disegno. Sono disponibili anche annullamento dell'ultimo tratto e rimozione del
cabinet dalla linea.

Un cabinet selezionato può essere eliminato dal pulsante sopra il canvas,
dal pannello **Disegno** oppure con `Canc`/`Backspace`. L'operazione rimuove
anche i relativi riferimenti da dati, elettrico e sospensioni; il comando
**Annulla** consente di ripristinarlo.

## Fonti tecniche

Le capacita dei controller precaricati derivano dalla documentazione ufficiale
NovaStar. Ogni modello conserva un riferimento alla fonte e i valori rimangono
modificabili dall'utente.

Il modello cabinet iniziale e Yestech MG7S 3.9 Outdoor, ricavato dalla scheda
tecnica fornita e dai valori operativi indicati dall'utente.
