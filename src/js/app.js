import xr from 'xr';
import { Frontier } from './modules/frontier'

var key = "14koGjGRg_2I5CW9In9jdxm-4xUaiSK0ee0FCs4h_Tb8"

xr.get('https://interactive.guim.co.uk/docsdata/' + key + '.json').then((resp) => {

	let googledoc = resp.data.sheets.data

	new Frontier(googledoc)
	
});