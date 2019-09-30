import loadJson from '../components/load-json/'
import { Frontier } from './modules/frontier'
import { Toolbelt } from './modules/toolbelt'
import { Preflight } from './modules/preflight'
import settings from './data/settings'

var app = {

	preload: (key) => {

		loadJson(`https://interactive.guim.co.uk/docsdata/1bClr8buuWUaKj01NolwaJy2JR_SR5hKEAjQoJPaGKcw.json`)
			.then((resp) => {

				app.init(key, resp.sheets.postcodes)
				
			})

	},

	init: (key, postcodes) => {

		loadJson(`https://interactive.guim.co.uk/docsdata/${key}.json`)
			.then((data) => {

				var wrangle = new Preflight(data.sheets.data, key, settings, postcodes)

				wrangle.process().then( (application) => {

					app.activate(application)

				})
				
			})


	},

	activate: (application) => {

		var toolbelt = new Toolbelt()

		var incident = toolbelt.getURLParams('incident');

		var the_killing_time = new Frontier(application)

		var target = document.getElementsByClassName("button_container")[0]

		document.getElementsByClassName("circle_loader")[0].style.display = "none"

		target.style.display = "inline-block"

		target.addEventListener("click", () => {

			target.style.display = "none"

			the_killing_time.ractivate()

			var painting = document.getElementsByClassName("painting")[0]

		    var op = 1;  // initial opacity
		    var timer = setInterval(function () {
		        if (op <= 0.1) {
		            clearInterval(timer);
		            painting.style.display = 'none';

					if (incident!=null) {
						the_killing_time.caseload(incident)
					}


		        }
		        painting.style.opacity = op;
		        painting.style.filter = 'alpha(opacity=' + op * 100 + ")";
		        op -= op * 0.1;
		    }, 100);

		})

	}

}

app.preload("14koGjGRg_2I5CW9In9jdxm-4xUaiSK0ee0FCs4h_Tb8")