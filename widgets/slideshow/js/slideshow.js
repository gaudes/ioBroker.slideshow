/*
	ioBroker.vis slideshow Widget-Set

	version: "0.0.1"

	Copyright 2020 Gaudes ralf@gaudes.net
*/
"use strict";

// add translations for edit mode
$.extend(
	true,
	systemDictionary,
	{
		"AutoViewChange": {
			"en": "Enable",
			"de": "Aktivieren",
			"ru": "включить",
			"pt": "Habilitar",
			"nl": "Inschakelen",
			"fr": "Activer",
			"it": "Abilitare",
			"es": "Habilitar",
			"pl": "Włączyć",
			"zh-cn": "启用"
		},
		"AutoViewChange_tooltip": {
			"en": "Enable automatic view change to this view on timeout",
			"de": "Aktivieren Sie die automatische Ansichtsänderung zu dieser Ansicht bei Zeitüberschreitung",
			"ru": "Включить автоматическое изменение представления для этого представления по истечении времени ожидания",
			"pt": "Habilitar mudança automática de visualização para esta visualização no tempo limite",
			"nl": "Schakel automatische weergave van deze weergave bij time-out in",
			"fr": "Activer la modification automatique de la vue de cette vue à l'expiration du délai",
			"it": "Abilita la modifica automatica della vista a questa vista al timeout",
			"es": "Habilitar el cambio de vista automático a esta vista en el tiempo de espera",
			"pl": "Włącz automatyczną zmianę widoku w tym widoku po przekroczeniu limitu czasu",
			"zh-cn": "在超时时启用对此视图的自动视图更改"
		},
		"AutoViewChangeTimeout": {
			"en": "Timeout",
			"de": "Timeout",
			"ru": "Тайм-аут",
			"pt": "Tempo esgotado",
			"nl": "Time-out",
			"fr": "Temps libre",
			"it": "Tempo scaduto",
			"es": "Se acabó el tiempo",
			"pl": "Koniec czasu",
			"zh-cn": "超时"
		},
		"AutoViewChangeTimeout_tooltip": {
			"en": "Inactivity time in seconds to start view with Slideshow",
			"de": "Inaktivitätszeit in Sekunden, um die Ansicht mit Diashow zu starten",
			"ru": "Время бездействия в секундах для запуска просмотра в режиме слайд-шоу",
			"pt": "Tempo de inatividade em segundos para iniciar a visualização com apresentação de slides",
			"nl": "Inactiviteitstijd in seconden om weergave met diavoorstelling te starten",
			"fr": "Temps d'inactivité en secondes pour démarrer la vue avec le diaporama",
			"it": "Tempo di inattività in secondi per avviare la visualizzazione con la presentazione",
			"es": "Tiempo de inactividad en segundos para comenzar a ver con presentación de diapositivas",
			"pl": "Czas bezczynności w sekundach, aby rozpocząć wyświetlanie z pokazem slajdów",
			"zh-cn": "闲置时间（以秒为单位）以幻灯片显示开始查看"
		},
		"AutoViewNavTarget": {
			"en": "Target on click",
			"de": "Ziel beim Klicken",
			"ru": "Таргетинг на клик",
			"pt": "Alvo no clique",
			"nl": "Target op klik",
			"fr": "Cible au clic",
			"it": "Target al clic",
			"es": "Objetivo al hacer clic",
			"pl": "Cel po kliknięciu",
			"zh-cn": "点击目标"
		},
		"AutoViewNavTarget_tooltip": {
			"en": "Target when click to leave Slideshow",
			"de": "Ziel, wenn Sie klicken, um die Diashow zu verlassen",
			"ru": "Таргетинг при нажатии, чтобы покинуть слайд-шоу",
			"pt": "Alvo ao clicar para sair da apresentação de slides",
			"nl": "Richt wanneer u klikt om de diavoorstelling te verlaten",
			"fr": "Cibler lorsque vous cliquez pour quitter le diaporama",
			"it": "Scegli come target quando fai clic per uscire dalla presentazione",
			"es": "Apunte cuando haga clic para salir de la presentación de diapositivas",
			"pl": "Kieruj na kliknięcie, aby opuścić pokaz slajdów",
			"zh-cn": "单击以离开幻灯片放映时定位"
		},
		"AutoViewTarget": {
			"en": "Target view",
			"de": "Zielansicht",
			"ru": "Целевой вид",
			"pt": "Visão de alvo",
			"nl": "Doelweergave",
			"fr": "Vue cible",
			"it": "Vista di destinazione",
			"es": "Vista de destino",
			"pl": "Widok docelowy",
			"zh-cn": "目标视图"
		},
		"AutoViewTarget_tooltip": {
			"en": "Target view when leave Slideshow with click on picture",
			"de": "Zielansicht beim Verlassen der Diashow mit Klick auf das Bild",
			"ru": "Целевой вид при выходе из слайд-шоу нажатием на картинку",
			"pt": "Visualização desejada ao sair da apresentação de slides com clique na imagem",
			"nl": "Doelweergave bij het verlaten van de diavoorstelling door op de afbeelding te klikken",
			"fr": "Vue cible lorsque vous quittez le diaporama en cliquant sur l'image",
			"it": "Visualizzazione di destinazione quando si esce dalla presentazione con un clic sull'immagine",
			"es": "Vista de destino al salir de la presentación de diapositivas con un clic en la imagen",
			"pl": "Docelowy widok po wyjściu z pokazu slajdów za pomocą kliknięcia na zdjęcie",
			"zh-cn": "单击图片离开幻灯片放映时的目标视图"
		},
		"PictureFitWidget": {
			"en": "Fill widget with picture",
			"de": "Widget mit Bild füllen",
			"ru": "Заполнить виджет картинкой",
			"pt": "Preencher widget com imagem",
			"nl": "Vul widget met afbeelding",
			"fr": "Remplir le widget avec une image",
			"it": "Riempi il widget con l'immagine",
			"es": "Rellenar widget con imagen",
			"pl": "Wypełnij widżet obrazem",
			"zh-cn": "用图片填充小部件"
		},
		"PictureFitWidget_tooltip": {
			"en": "True = Picture fills widget, border of picture may be cut off\nFalse = Complete picture is shown, but widget may have empty zones",
			"de": "True = Bild füllt das Widget, der Bildrand ist möglicherweise abgeschnitten \nFalse = Das vollständige Bild wird angezeigt, das Widget kann jedoch leere Zonen haben",
			"ru": "True = изображение заполняет виджет, граница изображения может быть обрезана \nFalse = изображение отображается полностью, но виджет может иметь пустые зоны",
			"pt": "True = A imagem preenche o widget, a borda da imagem pode ser cortada \nFalse = A imagem completa é exibida, mas o widget pode ter zonas vazias",
			"nl": "True = Widget afbeelding vult, rand van afbeelding kan worden afgesneden \nFalse = Volledige afbeelding wordt weergegeven, maar widget kan lege zones hebben",
			"fr": "True = L'image remplit le widget, la bordure de l'image peut être coupée \nFalse = L'image complète est affichée, mais le widget peut avoir des zones vides",
			"it": "Vero = Widget riempimenti immagine, il bordo dell'immagine potrebbe essere tagliato \nFalse = Viene visualizzata l'immagine completa, ma il widget potrebbe avere zone vuote",
			"es": "Verdadero = La imagen llena el widget, el borde de la imagen puede estar cortado \nFalse = Se muestra la imagen completa, pero el widget puede tener zonas vacías",
			"pl": "True = Widżet wypełnia obraz, krawędź obrazu może zostać obcięta \nFalse = Wyświetlany jest cały obraz, ale widżet może mieć puste strefy",
			"zh-cn": "True =图片填充小部件，图片的边框可能被剪掉\nFalse =显示完整图片，但小部件可能有空白区域"
		},
		"Debug": {
			"en": "Debug",
			"de": "Debuggen",
			"ru": "Отлаживать",
			"pt": "Depurar",
			"nl": "Foutopsporing",
			"fr": "Déboguer",
			"it": "Debug",
			"es": "Depurar",
			"pl": "Odpluskwić",
			"zh-cn": "除错"
		},
		"Debug_tooltip": {
			"en": "Debugging to Console",
			"de": "Debuggen in die Konsole",
			"ru": "Отладка в консоль",
			"pt": "Depuração para console",
			"nl": "Foutopsporing naar console",
			"fr": "Débogage vers la console",
			"it": "Debug sulla console",
			"es": "Depurando a la consola",
			"pl": "Debugowanie do konsoli",
			"zh-cn": "调试到控制台"
		},
		"SlideShowEffect": {
			"en": "Effect style",
			"de": "Effektstil",
			"ru": "Стиль эффекта",
			"pt": "Estilo de efeito",
			"nl": "Effect stijl",
			"fr": "Style d'effet",
			"it": "Stile effetto",
			"es": "Estilo de efecto",
			"pl": "Styl efektu",
			"zh-cn": "效果风格"
		},
		"SlideShowEffect_tooltip": {
			"en": "Basic effect when picture changes",
			"de": "Grundeffekt bei Bildänderungen",
			"ru": "Основной эффект при смене изображения",
			"pt": "Efeito básico quando a imagem muda",
			"nl": "Basiseffect wanneer het beeld verandert",
			"fr": "Effet de base lorsque l'image change",
			"it": "Effetto di base quando l'immagine cambia",
			"es": "Efecto básico cuando cambia la imagen",
			"pl": "Podstawowy efekt przy zmianie obrazu",
			"zh-cn": "图片变化时的基本效果"
		},
		"group_effect": {
			"en": "Effect",
			"de": "Effekt",
			"ru": "Эффект",
			"pt": "Efeito",
			"nl": "Effect",
			"fr": "Effet",
			"it": "Effetto",
			"es": "Efecto",
			"pl": "Efekt",
			"zh-cn": "影响"
		},
		"EffectNone": {
			"en": "None",
			"de": "Kein",
			"ru": "никто",
			"pt": "Nenhum",
			"nl": "geen",
			"fr": "aucun",
			"it": "nessuna",
			"es": "ninguna",
			"pl": "Żaden",
			"zh-cn": "没有"
		},
		"EffectFade": {
			"en": "Fade",
			"de": "Fade",
			"ru": "Fade",
			"pt": "Fade",
			"nl": "Fade",
			"fr": "Fade",
			"it": "Fade",
			"es": "Fade",
			"pl": "Fade",
			"zh-cn": "Fade"
		},
		"EffectTransition": {
			"en": "Transition",
			"de": "Transition",
			"ru": "Transition",
			"pt": "Transition",
			"nl": "Transition",
			"fr": "Transition",
			"it": "Transition",
			"es": "Transition",
			"pl": "Transition",
			"zh-cn": "Transition"
		},
		"EffectJQuery": {
			"en": "JQuery Effect",
			"de": "JQuery-Effekt",
			"ru": "Эффект JQuery",
			"pt": "Efeito JQuery",
			"nl": "JQuery-effect",
			"fr": "Effet JQuery",
			"it": "Effetto JQuery",
			"es": "Efecto JQuery",
			"pl": "Efekt JQuery",
			"zh-cn": "jQuery效果"
		},
		"FadeTime": {
			"en": "transition period",
			"de": "Übergangsphase",
			"ru": "переходный период",
			"pt": "período de transição",
			"nl": "overgangsperiode",
			"fr": "période de transition",
			"it": "periodo di transizione",
			"es": "periodo de transicion",
			"pl": "okres przejściowy",
			"zh-cn": "过渡期"
		},
		"FadeTime_tooltip": {
			"en": "Time in ms for transition period, for example from being shown to being hidden",
			"de": "Zeit in ms für die Übergangszeit, zum Beispiel vom Anzeigen zum Ausblenden",
			"ru": "Время в мс для переходного периода, например, от отображения до скрытия",
			"pt": "Tempo em ms para o período de transição, por exemplo, de ser mostrado para ser escondido",
			"nl": "Tijd in ms voor overgangsperiode, bijvoorbeeld van getoond naar verborgen",
			"fr": "Temps en ms pour la période de transition, par exemple entre l'affichage et le masquage",
			"it": "Tempo in ms per il periodo di transizione, ad esempio da essere mostrato a essere nascosto",
			"es": "Tiempo en ms para el período de transición, por ejemplo, desde que se muestra hasta que se oculta",
			"pl": "Czas w ms okresu przejścia, na przykład od pokazania do ukrycia",
			"zh-cn": "过渡周期（以毫秒为单位）的时间，例如从显示到隐藏"
		},
		"EffectTransitionStyle": {
			"en": "Transition Style",
			"de": "Transitionsstil",
			"ru": "Transition Style",
			"pt": "Transition Style",
			"nl": "Transition Style",
			"fr": "Transition Style",
			"it": "Transition Style",
			"es": "Transition Style",
			"pl": "Transition Style",
			"zh-cn": "Transition Style"
		},
		"EffectTransitionStyle_tooltip": {
			"en": "Speed curve of the transition",
			"de": "Geschwindigkeitskurve des Übergangs",
			"ru": "Кривая скорости перехода",
			"pt": "Curva de velocidade da transição",
			"nl": "Snelheidscurve van de overgang",
			"fr": "Courbe de vitesse de la transition",
			"it": "Curva di velocità della transizione",
			"es": "Curva de velocidad de la transición",
			"pl": "Krzywa prędkości przejścia",
			"zh-cn": "过渡速度曲线"
		},
		"TargetDefined": {
			"en": "Configured view",
			"de": "Konfigurierte Ansicht",
			"ru": "Настроенный вид",
			"pt": "Vista configurada",
			"nl": "Geconfigureerde weergave",
			"fr": "Vue configurée",
			"it": "Vista configurata",
			"es": "Vista configurada",
			"pl": "Widok skonfigurowany",
			"zh-cn": "配置视图"
		},
		"TargetLast": {
			"en": "Last used view",
			"de": "Zuletzt verwendete Ansicht",
			"ru": "Последний использованный просмотр",
			"pt": "Última visualização usada",
			"nl": "Laatst gebruikte weergave",
			"fr": "Dernière vue utilisée",
			"it": "Ultima visualizzazione utilizzata",
			"es": "Última vista utilizada",
			"pl": "Ostatnio używany widok",
			"zh-cn": "上次使用的视图"
		},
		"TargetNone": {
			"en": "None",
			"de": "Kein",
			"ru": "никто",
			"pt": "Nenhum",
			"nl": "geen",
			"fr": "aucun",
			"it": "nessuna",
			"es": "ninguna",
			"pl": "Żaden",
			"zh-cn": "没有"
		},
		"group_viewchange": {
			"en": "Automatic Slideshow start",
			"de": "Automatischer Diashow-Start",
			"ru": "Автоматический запуск слайд-шоу",
			"pt": "Início automático da apresentação de slides",
			"nl": "Automatische start van de diavoorstelling",
			"fr": "Démarrage automatique du diaporama",
			"it": "Avvio automatico della presentazione",
			"es": "Inicio automático de la presentación de diapositivas",
			"pl": "Rozpoczęcie automatycznego pokazu slajdów",
			"zh-cn": "自动幻灯片播放开始"
		}
	}
);


// this code can be placed directly in slideshow.html
vis.binds["slideshow"] = {
	version: "0.0.1",
	showVersion: function () {
		if (vis.binds["slideshow"].version) {
			console.log("Version slideshow: " + vis.binds["slideshow"].version);
			vis.binds["slideshow"].version = null;
		}
	},
	updateSlideshowEffect: function (wid, view) {
		if ($("#inspect_SlideshowEffect")[0].value === "EffectJQuery") {
			vis.hideShowAttr("EffectJQuery", true);
		} else {
			vis.hideShowAttr("EffectJQuery", false);
		}
	},
	initSlideshowTimer: function (view) {
		if (!vis.views && !vis.editMode) {
			return setTimeout(function () {
				vis.binds["slideshow"].initSlideshowTimer();
			}, 100);
		}
		function SlideShowTimeout() {
			if (vis.activeView !== window.SlideShowView) {
				if (window.SlideShowTimer) clearTimeout(window.SlideShowTimer);
				window.SlideShowLastView = vis.activeView;
				window.SlideShowTimer = setTimeout(function () {
					window.SlideShowTimer = null;
					window.SlideShowTimeoutStarted = false;
					vis.changeView(window.SlideShowView);
					SlideShowTimeout();
				}, window.SlideShowTimeoutTime);
			}
		}

		if (!vis.editMode && !window.SlideShowTimeoutStarted) {
			// Searching view with Slideshow
			for (view in vis.views) {
				if (vis.views[view].widgets) {
					for (const widgetid in vis.views[view].widgets) {
						if (vis.views[view].widgets[widgetid].tpl === "tplSlideshowPicture") {
							if (vis.views[view].widgets[widgetid].data.AutoViewChange === true) {
								console.log("SlideShowTimeout started");
								window.SlideShowTimeoutTime = vis.views[view].widgets[widgetid].data.AutoViewChangeTimeout * 1000;
								window.SlideShowTimeoutStarted = true;
								window.SlideShowView = view;
								$(document).click(SlideShowTimeout.bind());
								SlideShowTimeout();
							}
						}
					}
				}
			}
		}
	},
	showSlideshow: function (widgetID, view, data, style) {
		var $div = $("#" + widgetID);
		// if nothing found => wait
		if (!$div.length) {
			return setTimeout(function () {
				vis.binds["slideshow"].showSlideshow(widgetID, view, data, style);
			}, 100);
		}
		console.log(`Integrating Slideshow for widget #${widgetID}`);
		let FadeTime = parseInt(data.FadeTime) || 0;

		function onChange(e, newVal, oldVal) {
			let img = new Image();
			img.src = newVal;

			if (data.Debug === true) { console.log(`Picture change occured for widget #${widgetID}`) };

			switch (data.SlideshowEffect) {
				case "EffectFade":
					$(`#${widgetID} .slideshowpicture1`).fadeOut(FadeTime, function () {
						$(`#${widgetID} .slideshowpicture1`).attr("src", img.src).load(function () {
							$(`#${widgetID} .slideshowpicture1`).fadeIn(FadeTime);
						});
					});
					break;
				case "EffectTransition":
					if (data.Debug === true) { console.log("Load new picture in hidden img") };
					$(`#${widgetID} .slideshowpicturehidden`).load(function () {
						if (data.Debug === true) { console.log("Toggle hidden class") };
						if ($(this)[0].classList.contains("slideshowpicture1")) {
							$(`#${widgetID} .slideshowpicture2`).addClass("slideshowpicturehidden");
							$(`#${widgetID} .slideshowpicture1`).removeClass("slideshowpicturehidden");
						} else {
							$(`#${widgetID} .slideshowpicture1`).addClass("slideshowpicturehidden");
							$(`#${widgetID} .slideshowpicture2`).removeClass("slideshowpicturehidden");
						}
					}).attr("src", img.src);
					break;
				case "EffectJQuery":
					console.log(`Starting effect ${data.EffectJQuery}`)
					if ($(`#${widgetID} .slideshowpicture2`).css("display") === "none") {
						$(`#${widgetID} .slideshowpicture2`).attr("src", img.src);
						$(`#${widgetID} .slideshowpicture2`).css("z-index", 2);
						$(`#${widgetID} .slideshowpicture2`).show(data.EffectJQuery, data.EffectTransitionStyle, FadeTime, function () { $(`#${widgetID} .slideshowpicture1`).css("display", "none"); })
					} else {
						$(`#${widgetID} .slideshowpicture1`).attr("src", img.src);
						$(`#${widgetID} .slideshowpicture2`).css("z-index", 0);
						$(`#${widgetID} .slideshowpicture1`).show(data.EffectJQuery, data.EffectTransitionStyle, FadeTime, function () { $(`#${widgetID} .slideshowpicture2`).css("display", "none"); })
					}
					break;
				default:
					$(`#${widgetID} .slideshowpicture1`).attr("src", img.src);
					break;
			}

			img.remove();
		}

		$div.on('click touchend', function (e) {
			// Protect against two events
			if (vis.detectBounce(this)) return;
			if (data.AutoViewNavTarget === "TargetLast") {
				vis.changeView(window.SlideShowLastView);
			} else if (data.AutoViewNavTarget === "TargetDefined") {
				vis.changeView(data.AutoViewTarget);
			}
		});

		Array.from($(`#${widgetID} .slideshowpicture`)).forEach(image => {
			image.addEventListener("load", () => SlideShowFitImage(image, widgetID));
		})

		function SlideShowFitImage(image, widgetID) {
			if (data.PictureFitWidget === false) {
				$(`#${widgetID} .slideshowpicture`).css("object-fit", "contain");
			} else {
				const imgFormat = image.naturalWidth / image.naturalHeight;
				if (imgFormat > 1) {
					// image is landscape
					image.style.width = '100%';
					image.style.maxHeight = '100%';
				} else if (imgFormat < 1) {
					// image is portrait
					image.style.width = '100%';
					image.style.maxHeight = '100%';
				} else {
					// image is square
					image.style.Width = '100%';
					image.style.maxHeight = '100%';
				}
			}
		}

		if (vis.editMode) {
			setTimeout(function () {
				vis.binds["slideshow"].updateSlideshowEffect();
			}, 100);
		}

		if (data.oid) {
			vis.states.bind(data.oid + ".val", onChange);
		}
		if (data.SlideshowEffect === "EffectFade") {
			$(`#${widgetID} .slideshowpicture2`).css("display", "none");
		}
		if (data.SlideshowEffect === "EffectTransition") {
			$(`#${widgetID} .slideshowpicture2`).addClass("slideshowpicturehidden");
			$(`#${widgetID} .slideshowpicturehidden`).css("transition-property", "opacity");
			$(`#${widgetID} .slideshowpicturehidden`).css("transition-duration", FadeTime + "ms");
			$(`#${widgetID} .slideshowpicturehidden`).css("transition-timing-function", data.EffectTransitionStyle);
			$(`#${widgetID} .slideshowpicturehidden`).css("transition-delay", "0s");
			$(`#${widgetID} .slideshowpicture`).css("transition-property", "opacity");
			$(`#${widgetID} .slideshowpicture`).css("transition-duration", FadeTime + "ms")
			$(`#${widgetID} .slideshowpicture`).css("transition-timing-function", data.EffectTransitionStyle);
			$(`#${widgetID} .slideshowpicture`).css("transition-delay", "0s");
		}
		if (data.SlideshowEffect === "EffectJQuery") {
			$(`#${widgetID} .slideshowpicture2`).css("display", "none");
		}
	}
};
vis.binds["slideshow"].showVersion();
vis.binds["slideshow"].initSlideshowTimer();
