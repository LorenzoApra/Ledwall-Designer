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
Il campo **Nome progetto / Evento** alimenta titolo, nomi dei file e
intestazione della relazione tecnica.

Se si chiude l'app con modifiche non salvate, viene richiesto se salvare il
progetto, uscire senza salvare oppure annullare la chiusura. Se il salvataggio
viene annullato o non riesce, l'app rimane aperta.

## Cablaggio dati manuale

Nella vista **Dati**, selezionare il primo cabinet e scegliere la porta di
partenza, oppure usare **+ Nuova porta** nella toolbar (`N`). La traccia si
attiva automaticamente: tenere premuto sul cabinet e trascinare sugli altri
nell'ordine fisico del cavo. `Invio`, `Esc`, doppio clic sul canvas o il pulsante
**Termina** nella toolbar chiudono subito la traccia. **Annulla ultimo tratto** rimuove l'ultimo cabinet aggiunto, mentre
**Rimuovi cabinet dalla porta** scollega il cabinet selezionato.

Nel riquadro **Porte e backup** è possibile assegnare automaticamente le porte
libere oppure scegliere manualmente, per ogni main, la porta di backup interna
e il riferimento a porta/controller di riserva. Il PDF cablaggi riporta la
tabella completa; i percorsi usano linee ad alto contrasto e frecce maggiorate.

Per i controller delle serie **MCTRL** e **VX**, il carico di ogni porta segue
la regola NovaLCT/SmartLCT: viene calcolato sul rettangolo in pixel che racchiude
tutti i cabinet assegnati alla porta. Gli spazi vuoti di forme a L o irregolari
sono quindi conteggiati come *tail virtuali*. Il pannello mostra separatamente
pixel reali, pixel virtuali e dimensioni del rettangolo; il cablaggio automatico
divide la forma su più porte quando il rettangolo supera la capacità disponibile.
Le serie COEX/MX continuano invece a usare la somma dei soli pixel reali.

Nella vista **Elettrico**, selezionare il primo cabinet e usare **+ Nuova linea**
nella toolbar (`N`), oppure scegliere una linea esistente. Trascinare sui cabinet nell'ordine fisico del
cavo; ogni linea mostra soltanto numero di cabinet, assorbimento massimo e
assorbimento medio in W o kW. Sono disponibili anche annullamento dell'ultimo tratto e rimozione del
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

## Accessori di sostegno

Nel pannello **Peso**, la sezione **Accessori** può generare automaticamente una
piastra in ogni giunto interno 2×2 entro una soglia espressa in metri, oppure
aggiungerla manualmente. Il calcolo usa la geometria dei cabinet ed è disponibile
per tutti i produttori e modelli. Sono previste piastre semplici e piastre con
aliscaf per il collegamento a una truss; piastre e flybar si posizionano
trascinandole direttamente sul disegno.

Sul canvas la rotella del mouse regola lo zoom mantenendo come riferimento la
zona sotto il puntatore.

## Importazione RCFG / RCFGX

La libreria cabinet può importare configurazioni NovaStar `.rcfg`, `.rcfgx` e
`.rfcg`: vengono letti risoluzione cabinet, dimensioni modulo in pixel, scan e
receiving card. Misure fisiche, pitch, peso e consumi rimangono modificabili e
devono essere verificati, perché non sono dati affidabili nel formato NovaStar.
La vista cabinet può essere filtrata per produttore.

## Libreria CSV condivisa

La schermata **Librerie** è organizzata in tre aree: **Cabinet**, **Sending
Card** e **Accessori**. In Accessori sono raccolte sia le flybar sia le piastre
e gli altri componenti di rigging. I cabinet espongono soltanto assorbimento
massimo e medio.

La libreria iniziale viene caricata da
`src/data/ledwall-library.csv`, un CSV con separatore `;` modificabile anche in
Excel. L'app conserva una copia locale e continua a funzionare completamente
offline. Il campo **URL CSV GitHub** è già impostato sul link Raw del file nel
repository pubblico. I vecchi indirizzi Raw, inclusi quelli con token, vengono
sostituiti automaticamente con l'indirizzo pubblico corrente. All'avvio, gli
elementi nuovi inclusi nel CSV dell'app vengono aggiunti alla copia locale
senza sovrascrivere le modifiche manuali già presenti. **Aggiorna dalla rete**
scarica senza cache e valida esplicitamente una nuova copia, mostrando data e
quantità degli elementi ricevuti, e non modifica la libreria locale in caso di
errore. È disponibile anche l'importazione di un CSV locale. Le modifiche
manuali e l'importazione RCFG/RCFGX rimangono disponibili.

## Flybar, accessori e report

Flybar, piastre e altri accessori sono raccolti per produttore e completamente
modificabili. Nel pannello **Peso** si possono applicare manualmente le flybar
alle colonne selezionate, sia in sospensione sia in appoggio; l'app mostra per
ogni elemento peso cabinet, cavi/accessori, piastre, carico supportato, portata e
percentuale di utilizzo. Le schede delle singole piastre e flybar sono chiuse di
default ed espandibili quando servono. La portata iniziale del beam MG7S è 200 kg, mentre il
peso proprio resta a zero finché non viene inserito un valore verificato.

La relazione tecnica include una tavola rigging per ogni schermo con piastre e
flybar evidenziate e il peso totale per ogni flybar. Il riepilogo usa
assorbimenti in kW, cabinet per porta e cabinet per linea. Il PDF cablaggi usa
pagine distinte per dati ed elettrico. Progetto `.lwd`, PDF e PNG includono nel
nome il numero di revisione del progetto.

## Fonti tecniche

Le capacita dei controller precaricati derivano dalla documentazione ufficiale
NovaStar. Ogni modello conserva un riferimento alla fonte e i valori rimangono
modificabili dall'utente.

Il modello cabinet iniziale e Yestech MG7S 3.9 Outdoor, ricavato dalla scheda
tecnica fornita e dai valori operativi indicati dall'utente.
