import xr from 'xr';
import { Frontier } from './modules/frontier'

var key = "14koGjGRg_2I5CW9In9jdxm-4xUaiSK0ee0FCs4h_Tb8"

xr.get('https://interactive.guim.co.uk/docsdata/' + key + '.json').then((resp) => {

	let googledoc = resp.data.sheets.data

	var the_killing_time = new Frontier(googledoc)

	var target = document.getElementsByClassName("button_container")[0]

	target.style.display = "inline-block"

	target.addEventListener("click", () => {

		target.style.display = "none"

		the_killing_time.ractivate()

		var painting = document.getElementsByClassName("painting")[0]

	    var op = 1;  // initial opacity
	    var timer = setInterval(function () {
	        if (op <= 0.1){
	            clearInterval(timer);
	            painting.style.display = 'none';
	        }
	        painting.style.opacity = op;
	        painting.style.filter = 'alpha(opacity=' + op * 100 + ")";
	        op -= op * 0.1;
	    }, 100);



	})


	
});