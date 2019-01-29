import xr from 'xr';
import { Frontier } from './modules/frontier'

var key = "18SdNNsTp00DUXorCpNMxTcoV-J41gcPn9S5yqhSf3OA"

xr.get('https://interactive.guim.co.uk/docsdata/' + key + '.json').then((resp) => {

	let googledoc = resp.data.sheets.data

	new Frontier(googledoc)
	
});