# Libreria LED wall Italia ed Europa

Ricerca del 19 settembre 2026. Il CSV contiene **43 schede: 17 cabinet, 14 controller NovaStar, 4 flybar e 8 accessori**. Conserva tutti gli 11 identificativi della base fornita e aggiunge 32 schede. Il file originale e la libreria del progetto non sono stati sovrascritti.

## Criterio di selezione

La selezione privilegia eventi, noleggio, touring e studi, coerentemente con MG7S ed ER presenti nella base. Non è una graduatoria di vendite o quote di mercato: i riscontri disponibili provano presenza in cataloghi, parchi noleggio o installazioni, non permettono di stabilire statisticamente i prodotti più venduti. Le varianti aggiunte ampliano le famiglie documentate; non tutte hanno una prova autonoma di diffusione italiana.

| Famiglia | Riscontro in Italia/Europa | Interpretazione |
| --- | --- | --- |
| Yes Tech MG7S | [Produttore: CPHI Milano 2024](https://www.yes-led.com/case/600.html), [Nos Alive 2025, Portogallo](https://www.yes-led.com/case/yes-tech-supports-nos-alive-2025.html) | Impieghi documentati della famiglia. Dati operativi del cabinet utente conservati. |
| INFiLED ER | [AVMS Germania: ER 4.6 in parco tecnico](https://www.avms-germany.de/archiv/technik-archiv/infiled-er-4-6-led-modul/), [lotto ER 4.6 a Cattolica](https://www.troostwijkauctions.com/en/l/infiled-er-4-6-outdoor-used-led-panels-A1-49187-82) | Prodotto storico presente nel rental e nell’usato. Le revisioni differiscono. |
| Absen PL V2 | [Catalogo ufficiale Absen Europe](https://www.absen-europe.com/product/pl-v2-series/), [manuale distribuito da Prase in Italia](https://www.prase.it/wp-content/uploads/PL-V2-series-user-manual-V1.2.pdf), [parco rental PSCo UK](https://www.psco.co.uk/rental) | Disponibilità della serie in Europa e documentazione italiana. PSCo conferma il marchio, non ciascuna variante inserita. |
| Unilumin Upad IV | [TrimRS: Upad IV 2.6](https://www.trimrs.com/en/catalogue/89-unilumin-upad-iv-26), [DBpixelhouse UK: Upad IV-S](https://www.dbpixelhouse.com/content/uploads/2025/03/Unilumin-UPAD-IV-2.6mm-LED.pdf), [Unilumin Germany: variante LiWe](https://unilumin.de/upad-iv-liwe.html) | Presenza europea della famiglia. I dati inseriti provengono dalle specifiche del produttore, con revisione nelle note. |
| ROE Black Pearl / Carbon | [Produttore: BP2V2 a Gran Canaria Studios](https://www.roevisual.com/en/products/black-pearl-2v2), [Colour Sound UK/Europe: Carbon CB5](https://www.coloursound.com/roe-visual-carbon-cb5-video-rental) | Impieghi europei documentati. Per Carbon, il riscontro rental riguarda CB5; le schede tecniche inserite identificano separatamente MKII. |
| PROLIGHTS OmegaPix | [Catalogo del produttore italiano: 39B](https://www.prolights.it/en/product/OMEGAX39B), [39T](https://www.prolights.it/en/product/OMEGAX39T) | Presenza nel catalogo del produttore, non misura del parco installato. Accessori dedicati documentati nella stessa pagina. |

## Contenuto e provenienza

- **Cabinet:** Yes Tech MG7S della base; INFiLED ER della base e variante Outdoor P4.6 VuePix; sei varianti Absen PL V2; Unilumin UpadIV 1.9, 2.6 e IV-S 2.6; ROE BP2V2, CB3 MKII, CB5 MKII; PROLIGHTS OmegaPix 39B e 39T.
- **NovaStar:** i sette modelli della base, più VX400, VX600, VX400 Pro, VX600 Pro, VX1000 Pro, VX2000 Pro e MX40 Pro. I Taurus restano identificati come player. I VX sono processori con sender integrato; MCTRL sono controller di invio. Il tipo CSV comune `sending_card` segue il formato dell’app e non implica che siano tutti schede elettroniche interne.
- **Accessori:** i due elementi Yes Tech della base; giunti, piastre di curvatura, supporto posteriore e cavi PROLIGHTS; tre barre dedicate; convertitore NovaStar CVT10. CVT10 non aggiunge capacità pixel al controller.

Ogni nuova scheda contiene un URL tecnico e una nota sulla provenienza. Per cabinet/accessori la fonte è ripetuta in `source_label`, perché l’importatore attuale non conserva `source_url` per questi tipi. I valori ereditati sono riconoscibili dalla dicitura “Record della base utente”. Non sono automaticamente considerati riverificati.

## Correzioni e differenze da considerare

**VX1000:** la [specifica ufficiale V1.6.0](https://oss.novastar.tech/uploads/2024/07/VX1000-All-in-One-Controller-Specifications-V1.6.0.pdf) dichiara ingressi 8 bit e 3D con EMT200. Nel CSV è stato corretto il profilo della base: 8 bit, HDR disabilitato e 3D abilitato. Le modalità 10/12 bit presenti nella base non risultano supportate da quella scheda. Il profilo è limitato a 50/60 Hz; questo limite della libreria non è una dichiarazione che il dispositivo non supporti altre frequenze. La modalità 3D dimezza la capacità e ha vincoli con altre funzioni.

**Altri controller della base:** MCTRL4K, MCTRL660 PRO, MCTRL300, MX30, TB8 e TB60 mantengono i parametri originali con nota di provenienza. Non è stato effettuato un audit completo di ogni frequenza, modalità HDR, backup o limite di porta ereditato.

**Controller nuovi:** la capacità globale è distinta dalla capacità per porta. Le bande in pixel/secondo derivano dal budget nominale a 60 Hz. VX e VX Pro nuovi hanno un profilo operativo 8 bit e 50/60 Hz. Per VX Pro, accettare un ingresso 10/12 bit non dimostra un’uscita equivalente. Per MX40 Pro è usato il budget conservativo 10/12 bit; la modalità speciale con receiving card Pro non è modellata. Il backup tra controller MX40 Pro non è verificato ed è disabilitato nel profilo. I booleani del file descrivono il profilo abilitato, non sostituiscono la matrice completa delle funzioni hardware.

**INFiLED ER 4.6:** la scheda originale non identifica indoor/outdoor o revisione e resta incompleta. La nuova variante segue la [tabella VuePix INFiLED ER Outdoor P4.6](https://www.vuepix.com/er-series/): 12,5 kg, 270 W massimi e 90 W medi. Il lotto pubblicato da AVMS ha 12 kg e 300/100 W. Non mescolare i valori delle due fonti.

**Absen:** i dati seguono il manuale PL V2 V1.2 distribuito da Prase. I consumi in W/m² sono convertiti in W/cabinet moltiplicando per 0,25 m² o 0,5 m². Ad esempio PL3.9 Pro V2: 720/240 W/m² diventano 180/60 W per 500×500 e 360/120 W per 500×1000. Peso, consumi e receiving card possono differire fra revisioni.

**Pitch e pixel:** il pitch è quello commerciale pubblicato, spesso arrotondato. Usare la risoluzione del cabinet per le pixelmap; non ricavarla dividendo la misura fisica per il pitch arrotondato.

**ROE:** le piattaforme documentate sono Brompton/Megapixel e, per Carbon, anche Evision. Queste schede servono ai conteggi geometrici, di peso ed elettrici; non indicano compatibilità con controller NovaStar.

## Importazione in Ledwall Designer

Da **Librerie**, importare `ledwall-library-italia-europa.csv`. Sono mantenuti i 34 campi originali, il separatore `;`, la virgola decimale e gli identificativi preesistenti. L’importatore sostituisce le categorie presenti nel file: esportare prima eventuali schede locali aggiunte manualmente che non compaiono in questo catalogo.

I limiti dell’app rilevanti per questa libreria sono:

- Campi numerici vuoti vengono convertiti in zero. Nel catalogo un vuoto significa **dato non documentato**, non consumo nullo o peso nullo. Completare le schede incomplete prima di usarle nei totali.
- Le nuove flybar hanno peso e portata non documentati. Le larghezze rappresentano il passo operativo di una o due colonne, non una misura certificata dell’ingombro. Non usare queste schede per validare carichi. La portata di 200 kg della barra Yes Tech è ereditata dalla base e non riverificata; il precedente zero del peso proprio è stato sostituito con un campo vuoto.
- La famiglia VX dell’app applica il rettangolo contenitore. [NovaStar documenta il carico per cabinet per VX Pro](https://www.novastar.tech/tpl/VX_PRO_SERIES.html). Il CSV conserva la famiglia supportata dal software, ma questa differenza richiede verifica in NovaLCT/Unico.
- La receiving card non documentata resta vuota. L’app non verifica automaticamente la compatibilità fra pannello, receiving card, controller e firmware.

Non sono inclusi prezzi, disponibilità in tempo reale o una graduatoria commerciale. Questi richiedono preventivi e dati dei fornitori.
