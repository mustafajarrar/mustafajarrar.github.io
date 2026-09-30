
// Copyright 2000 Macromedia, Inc. All rights reserved.


//*************************LOCAL FUNCTIONS**************************


function MM_hasPropsIE(val)
{
	// for some objects in IE, this check causes a failure, 
	// we need to do the try/catch
	try {
		return MM_hasProps(val);
	} catch(e) {
		//ignore error and return false
		//alert("error caught "+val);
	}
	return false;
}


function MM_printValIE(val)
{
	// for some objects in IE, this check causes a failure, 
	// we need to do the try/catch
	try {
		return MM_printVal(val);
	} catch(e) {
		// return [error]
		return MM_debugError;
	}
}
