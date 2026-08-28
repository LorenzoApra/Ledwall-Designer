# Specifica funzionale MVP

## Obiettivo

Ledwall Designer unifica in una sola applicazione desktop locale tre flussi oggi
separati: composizione pixel-to-pixel, calcolo e documentazione del cablaggio
NovaStar, distribuzione elettrica e stima dei carichi sospesi.

## Perimetro iniziale

- macOS, con portabilita futura a Windows;
- funzionamento completamente offline;
- interfaccia e report in italiano e unita metriche;
- un canvas video per progetto, con piu schermi LED indipendenti;
- cabinet di modelli diversi e rotazioni 0, 90, 180 e 270 gradi;
- una sola istanza controller nel primo flusso UI, ma modello dati predisposto a
  piu istanze;
- nessuna esportazione di configurazioni NovaLCT/SmartLCT;
- salvataggio manuale in un file progetto JSON con estensione `.lwd`;
- viste tecniche solo front view.

## Origini e coordinate

L'origine del canvas e in alto a sinistra. X cresce verso destra, Y verso il
basso. La posizione del singolo schermo e espressa in pixel del canvas master.
Ogni cabinet conserva sia coordinate pixel locali sia coordinate fisiche in
millimetri.

La numerazione della pixelmap e sempre `riga,colonna` ed e indipendente dal
cablaggio. Nella vista cablaggio l'identificativo progressivo segue invece
l'ordine reale della catena dati.

## Controller NovaStar iniziali

- MCTRL4K
- VX1000
- MCTRL660 PRO
- MCTRL300
- MX30 (COEX)
- Taurus TB8
- Taurus TB60

Il profilo predefinito e 50 Hz, 8 bit, SDR, senza 3D e senza low latency. Il
motore supporta frame rate, bit depth, HDR, 3D, low latency, ridondanza e margine
di sicurezza. I limiti per porta e complessivi sono dati del modello e non sono
hard-coded nella UI.

## Cablaggio dati

L'assegnazione puo essere manuale o automatica. Il motore automatico valuta
percorsi orizzontali e verticali a serpentina da tutti gli angoli e sceglie in
ordine:

1. il minor numero di porte;
2. il percorso fisicamente piu corto.

Il disegno principale mostra solo il main. Il backup e documentato in tabella e
puo rappresentare sia porte ridondanti dello stesso controller sia un secondo
controller completo.

## Elettrico

Valori predefiniti, modificabili per progetto:

- 230 V monofase;
- protezione nominale 16 A;
- utilizzo consigliato 80%, pari a 12,8 A.

Il motore distribuisce i cabinet usando il consumo massimo, conserva l'ordine
del collegamento e mostra per linea watt medi/massimi, ampere medi/massimi e
percentuale del limite operativo.

## Peso e sospensioni

Il peso comprende cabinet e una libreria modificabile di stime per cablaggi,
accessori e hanging bar. I punti di sospensione vengono inizialmente generati per
colonna e possono essere spostati manualmente. Il calcolo e una stima statica di
pre-progettazione e non sostituisce un calcolo strutturale certificato.

## Pixelmap

Sono previsti:

- PNG nativo per lo schermo selezionato;
- PNG master 4K/8K con tutti gli schermi nella posizione assegnata;
- test pattern con griglia, coordinate, cerchi, diagonali, barre colore, scala di
  grigi, nome, risoluzione e logo;
- visibilita indipendente per ciascun elemento.

## Output documentali

- PDF tecnico A4/A3;
- distinta materiali inclusa nel PDF tecnico;
- PDF cablaggi A3 orizzontale;
- PNG pixelmap singola e master;
- cartiglio con azienda/logo, cliente, evento, location, autore, data e revisione.

## Dati Yestech iniziali

Il modello precaricato `Yestech MG7S 3.9 Outdoor` usa:

- cabinet 500 x 500 x 73 mm;
- 128 x 128 pixel;
- pitch 3,9 mm;
- peso 7,4 kg;
- 210 W massimo, 150 W medio, 70 W minimo;
- moduli 250 x 250 mm, 64 x 64 pixel;
- scansione 1/11;
- receiving card configurabile. La scheda tecnica riporta A5S+, mentre il file
  RCFGX operativo fornito riporta A8s-N.

