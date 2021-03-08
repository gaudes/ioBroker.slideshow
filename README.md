![Logo](admin/slideshow.png)
# ioBroker.slideshow

[![NPM version](http://img.shields.io/npm/v/iobroker.slideshow.svg)](https://www.npmjs.com/package/iobroker.slideshow)
[![Downloads](https://img.shields.io/npm/dm/iobroker.slideshow.svg)](https://www.npmjs.com/package/iobroker.slideshow)
![Number of Installations (latest)](https://iobroker.live/badges/slideshow-installed.svg)
![Number of Installations (stable)](https://iobroker.live/badges/slideshow-stable.svg)
[![Dependency Status](https://img.shields.io/david/gaudes/iobroker.slideshow.svg)](https://david-dm.org/gaudes/iobroker.slideshow)
![Test and Release](https://github.com/gaudes/ioBroker.slideshow/workflows/Test%20and%20Release/badge.svg)

[![NPM](https://nodei.co/npm/iobroker.slideshow.png?downloads=true)](https://nodei.co/npm/iobroker.slideshow/)

[Deutsche Beschreibung](#deutsch)

[English description](#english)

![Demo](docs/img/demo.gif)

## <a name="deutsch"></a>Diashow Adapter für ioBroker
Dieser Adapter für ioBroker stellt eine Diashow quasi als Bildschirmschoner für VIS zur Verfügung.

Folgende Quellen stehen aktuell zur Verfügung:

* Die letzten acht täglichen Bilder von Bing.com
* Via VIS-Dateimanager hochgeladene Bilder
* Bilder aus beliebigem Pfad im Dateisystem
* Bilder von Synology PhotoStation

Zur Darstellung in VIS stellt der Adapter ein Widget zur Verfügung.
Dieses bietet auch Funktionen für Effekt beim Bildwechsel, beispielsweise sanftes Ein- und Ausblenden.
Zusätzlich kann ein Timeout eingestellt werden. Sofern auf anderen View im Projekt keine Aktion für das eingestellte Timeout erfolgt ist,
wird zur View mit der Diashow gewechselt. Durck Klicken des Bilds wird entweder zurück zur letzten Ansicht oder zu einer eingestellten Ansicht gewechselt.

Neben dem Bild selbst als Pfad oder Base64-kodiertes Objekt werden weitere Objekte mit Informationen zum Bild in ioBroker erstellt. 
Diese sind abhängig von der ausgewählten Quelle:

| Objekt      | Bing | Lokal und Dateisystem | Synology
| ----------- | ----------- | ----------- | -----------
| info1       | Titel       | Titel (EXIF-Information) | Titel
| info2       | Beschreibung        | Betreff (EXIF-Information) | Beschreibung
| info3       | Copyright-Informationen | Kommentar (EXIF-Information) | Dateiname
| date        | Datum der Anzeige auf Bing-Seite | Aufnahmedatum (EXIF-Information) | Aufnahmedatum

Der Button "updatepicturelist" als Objekt in ioBroker liest die Bilder aus den konfigurierten Quellen neu ein, z.B. nach Hinzufügen oder Löschen von Bildern. Die Bilder aus allen Quellen mit Ausnahme Bing werden sonst nur beim Start des Adapters eingelesen. Bing-Bilder werden stündlich automatisch aktualisiert.

**Dieser Adapter verwendet die Sentry Bibliotheken um automatisch Abstürze und Programmfehler an die Entwickler zu übermitteln.** 
Weitere Details und für Informationen zur Deaktivierung der Fehlerberichterstattung in der [Sentry-Plugin Dokumentation](https://github.com/ioBroker/plugin-sentry#plugin-sentry)! Sentry Reporting wird ab JS-Controller 3.0 verwendet.

### Konfiguration
In den Einstellungen des Adapters wird die Quelle der Bilder ausgewählt, außerdem das Intervall für den Wechsel der Bilder, beispielsweise 10 Sekunden.

Bei Auswahl der Quelle "Dateisystem" kann dann noch der Pfad im Dateisystem ausgewählt werden, außerdem das Format (Hoch- oder Querformat) der anzuzeigenden Bilder.

Bei Auswahl der Quelle "Synology PhotoStation" muss die IP-Adresse oder der Hostname sowie Benutzername und Passwort angegeben werden.

### VIS-Widget
Das Widget ist in der Kategorie "slideshow" enthalten.

Das Widget sollte in eine eigene View integriert werden. Hierdurch lässt sich der automatische Start der Diashow nutzen.

Folgende Einstellungen sind möglich:

* Object-ID: Hier muss der vom Adapter erzeugte Datenpunkt ausgewählt werden, beispielsweise "slideshow.0.picture"
* Abschnitt "Effekt"
	* SlideshowEffect: Als Effekt kann zwischen folgenden gewählt werden:
		* "Kein"
		* "Fade": Einfaches Verblassen und Erscheinen
		* "Transition": Überblenden
		* "jQuery-Effekt": Diverse jQuery-Effekte, beispielsweise Rolladen
	* Übergangsphase: Zeit in Millisekunden für den Effekt, gute Werte sind 500 oder 1000ms
	* Transition Style: Stil für "Transistion" und "jQuery-Effekt"
	* jQuery-Effekt: Gewünschter jQuery-Effekt
* Abschnitt "Automatischer Diashow-Start"
	* Aktivierung des automatischen Starts
	* Timeout: Nach welcher Zeit ohne Aktion auf die Diashow-View gewechselt wird
	* Ziel beim Klicken:
		* Zuletzt verwendete Ansicht
		* Konfigurierte Ansicht (siehe nächster Einstellung)
		* Kein, falls beispielsweise ein eigener Button integriert werden soll
	* Zielansicht: Aufzurufende Ansicht beim Verlassen der Diashow

## <a name="english"></a>Slideshow Adapter for ioBroker
This Adapter for ioBroker provides a Slideshow for VIS, like a screensaver.

The following Sources can actually be used:

* The last eight daily pictures from Bing.com
* Pictures uploaded by VIS-File-Manager
* Pictures from file system path
* Pictures from Synology PhotoStation

The Adapter provides a Widget for Presentation in VIS, which offers effects on picture change, for example smooth fade-out and fade-in.
Additionally a timeout can be configured. When on other views in the same VIS project no actions for the defined timeout occured, the view with the Slideshow will be started. With a click on the picture it changes back to the last view or to a predefined view.

Beside the picture as path or Base64 encoded object are more objects with picture informations created in ioBroker. 
These depend on the selected source:

| Object      | Bing | Local and Filesystem | Synology
| ----------- | ----------- | ----------- | -----------
| info1       | Title       | Title (EXIF information) | Title
| info2       | Description        | Subject (EXIF information) | Description
| info3       | Copyright | Comment (EXIF information) | Dateiname
| date        | Date shown on Bing page | Recording date (EXIF information) | Recording date

The button "updatepicturelist" as objekt in ioBroker re-reads the pictures from the configured source, usefull for example after adding or removing pictures from source. Pictures from all source, except Bing, are usually loaded on startup of the Adapter. Bing pictures are automatically updated hourly.

**This adapter uses Sentry libraries to automatically report exceptions and code errors to the developers.** 
For more details and for information how to disable the error reporting see [Sentry-Plugin Documentation](https://github.com/ioBroker/plugin-sentry#plugin-sentry)! Sentry reporting is used starting with js-controller 3.0.

### Configuration
In the Adapter settings the picture source can be choosen. Although the interval for picture change.

When source "File system" is selected, the path can be entered and the format (landscape or portrait) of the pictures to be shown.

When source "Synology PhotoStation" is selected, the IP address or hostname and an username with password has to be configured.

Attention:  After changes (Adding or Deleting) a restart of the adapter is required.

### VIS-Widget
The Widget can be found in category "slideshow".

The widget should be integrated in an own view, so the automatic start of the Slideshow can be used.

The following configuration options exist:

* Object-ID: The ioBroker object created by the adapter must be provided, for example "slideshow.0.picture"
* Category "Effect"
	* SlideshowEffect: The following options are available:
		* "None"
		* "Fade": Simple fade-out and fade-in
		* "Transition": fade-over
		* "jQuery-Effekt": Different jQuery effects, for example "blind"
	* Transition period: Time in miliseconds for the effect, 500 or 1000 are recommended values
	* Transition style: Style for "Transistion" und "jQuery-Effect"
	* jQuery-Effect: Desired effect
* Category "Automatic Slideshow start"
	* Enable automatic start
	* Timeout: After which time in seconds of inactivity on other views the Slideshow will be started
	* Target on click:
		* Last used view
		* Configured view (see next setting)
		* None, for example when integrating another widget therefore
	* Target view: View to show when leaving Slideshow

## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	### __WORK IN PROGRESS__
-->

### __WORK IN PROGRESS__
* (Gaudes) Rename Adapter to slideshow
* (Gaudes) Fix directory access denied (Sentry #4)
* (Gaudes) Error handling for Synology Login (Sentry #3)
* (Gaudes) Fix empty result (Sentry #2)
* (Gaudes) Fix file-not-found (Sentry #1)
* (Gaudes) Include Dependabot updates

### 0.1.0 (2021-02-26)
* (Gaudes) Prepare for beta tests
* (Gaudes) Include Dependabot updates

### 0.0.5 (2021-02-17)
* (Gaudes) Adaptive width and height in widget depending on orientation
* (Gaudes) Fix format option for Synology
* (Gaudes) Writing extended picture information to objects
* (Gaudes) Button for update picture list
* (Gaudes) Save picture count as object
* (Gaudes) Quality fixing (lgtm.com)
* (Gaudes) Include Sentry error reporting
* (Gaudes) Include Dependabot updates

### 0.0.4 (2021-01-21)
* (Gaudes) Allow PNG-files in Filesystem
* (Gaudes) Fix config problem with formats
* (Gaudes) Handle portrait orientation in widget

### 0.0.3 (2021-01-14)
* (Gaudes) Prepare for alpha tests

### 0.0.2 (2021-01-11)
* (Gaudes) initial release

## License
MIT License

Copyright (c) 2020 Gaudes <ralf@gaudes.net>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
