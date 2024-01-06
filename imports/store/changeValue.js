// change a value, clamping it between 0 and 100
import { isNumber } from 'util';    // node util library

export function changeValue(x, dx) {
	const result = (isNumber(dx*1)) ? x + dx*1 : x;
	return (result > 100) ? 100 :
		   (result < 0)   ? 0 
		   				  : result;
}
