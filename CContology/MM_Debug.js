
// Copyright 2000 Macromedia, Inc. All rights reserved.


//*************************GLOBALS**************************


var MM_bD = true;
var MM_D = new String;
var MM_bEval = false;
var MM_bInEval = false;
var MM_Depth = 0;

var MM_debugNull = '[null]';
var MM_debugUndefined = '[undefined]';
var MM_debugObject = '[object]';
var MM_debugError = '[error]';

var MM_isIE4 = (navigator.appName != "Netscape" && 0 > navigator.appVersion.indexOf("5."));

var MM_debugBlockPropNames = new Array(
	"MM_bD", 
	"MM_D", 
	"MM_bEval", 
	"MM_bInEval", 
	"MM_Depth", 
	"MM_debugNull", 
	"MM_debugUndefined", 
	"MM_debugObject", 
	"MM_debugError", 
	"MM_isIE4", 
	"MM_debugBlockPropNames", 
	"MM_Debug", 
	"MM_escQuotes", 
	"MM_isDebuggerGlobal", 
	"MM_getProps", 
	"MM_getTypeOf", 
	"MM_hasProps", 
	"MM_hasPropsIE", 
	"MM_printVal");
	

//*************************LOCAL FUNCTIONS**************************


function MM_Debug(val, srcId, lineNum, pos)
{
	// note: we won't get here if the user is evaluating something 
	// that happens to call an instrumented function
	// assertion: if MM_bEval is not true
	if ( MM_bInEval ) {
		//alert("assert failed: MM_bInEval should always be false when calling MM_Debug");
		return false;
	}

	var cmd = new String();
	if ( MM_bEval ) {
		cmd = "returnval<MM_DELIM>" + MM_printVal(val);
	}
	else {
		cmd += "notify<MM_DELIM>";
		cmd += srcId;
		cmd += "<MM_DELIM>";
		cmd += MM_Depth;
		cmd += "<MM_DELIM>";
		cmd += lineNum;
		cmd += "<MM_DELIM>";
		cmd += pos;
	}
	//if ( lineNum == 4 || lineNum == 5)
	//	alert(cmd);
	//var evalStatement = new String;
	//do {
		var retval = MM_sendDbg(cmd);
		//alert(retval);
		var delLen = 10;
		var retcmd = new String;
		var n = retval.indexOf("<MM_DELIM>");
		if ( n > 0 )
			retcmd = retval.substring(0,n);
		else
			retcmd = retval;

		MM_bEval = true;
		if ( retcmd == "eval" ) {
			if ( navigator.appName.indexOf("Netscape") >= 0 )
				MM_D = new String(retval.substring(n+delLen));
			else
				MM_D = "eval(\""+MM_escQuotes(retval.substring(n+delLen))+"\")";
		}
		else if ( retcmd == "getproperties" ) {
			MM_D = 'MM_getProps('+retval.substring(n+delLen)+')';
		}
		else if ( retcmd == "getstackdepth" ) {
		    MM_D = '' +
			'var i = 1;\n' +
			'var c = arguments.caller.callee;\n' +
			'while ( c && c.arguments.caller && c.arguments.caller.callee != c ) {\n' +
			'	i++;\n' +
			'	c = c.arguments.caller.callee;\n' +
			'}\n' +
			'i;'
		}
		else if ( retcmd == 'continue' ) {
			/*
			evalStatement = "";
			*/
			MM_D = "";
			MM_bEval = false;
		}
		else {
			//alert("Debug connection closed by Dreamweaver");
			MM_D = "";
			MM_bEval = false;
		}
	//} while ( evalStatement.length > 0 );

	// assertion: if MM_bEval is true, then MM_D.length must be greater than 0
	//if ( MM_bEval && MM_D.length == 0 )
	//	alert("assert failed: if MM_bEval is true, then MM_D.length should be greater than 0");

	return ( MM_D.length > 0 );
}


function MM_escQuotes(str)
{
	var ret = "";
	// convert '\' (backslash) characters to '\\' (escaped backslash) 
	temp = str;
	var n = temp.indexOf("\\");
	while ( n >= 0 ) {
		ret += temp.substring(0, n);
		ret += "\\";
		temp = temp.substring(n+1,temp.length);
		n = temp.indexOf("\\");
	}
	ret += temp;

	// convert '"' (double-quote) to '\"' (escaped double-quote)
	temp = ret;
	ret = "";
	var n = temp.indexOf("\"");
	while ( n >= 0 ) {
		ret += temp.substring(0, n);
		ret += "\\\"";
		temp = temp.substring(n+1,temp.length);
		n = temp.indexOf("\"");
	}
	ret += temp;

	return ret;
}

function MM_isDebuggerGlobal(propName)
{
	var i;
	var str = ""; str += propName;
	for (i = 0; i < MM_debugBlockPropNames.length; i++)
	{
		if ( str.indexOf(MM_debugBlockPropNames[i]) >= 0 )
			return true;
	}
	return false;
}


function MM_getProps(obj)
{
	var str = new String();
	for ( p in obj ) {
				
		// skip any props which are functions or globals declared in this file
		// (in case we are looking at the props for the window object, these seem 
		// to slow it down immensely and besides the delimiter <MM_DELIM> is 
		// actually in the prop values)
		if ( MM_isDebuggerGlobal(p) )
			continue;

		str += p + "<MM_DELIM>";
	
		// on IE MM_printVal can cause an exception, so the IE version 
		// just calls MM_printVal with an exception handler. The function 
		// must be in a separate file (MM_DebugIE.js) because there is no 
		// exception handling on Netscape.
		var propStr;
		if ( navigator.appName != "Netscape" && !MM_isIE4 ) {
			propStr = MM_printValIE(obj[p]);
		}
		else {
			propStr = MM_printVal(obj[p]);
		}
		str += propStr + "<MM_DELIM>";
	}
	return str;
}

function MM_hasProps(val)
{
	if ( val && typeof(val) == "object" ) {
		for ( p in val ) {
			return true;
		}
	}
	return false;
}

function MM_printVal(val)
{
	var ret = "";
	var valString = new String();
	var hasProps = false;
	if ( val != null )
	{
		if ( typeof(val) == "function" ) {
			// don't show real value of function objects because the functions are instrumented 
			// so it is too long and often useless
			// Also don't check the properties because it is too slow and the properties are 
			// not very useful to look at (I think there are none in IE and in Netscape the 
			// properties are just the local varibles of the function which are all null)
			valString = "function";
		}
		else {
			// convert string from eval to Javascript string with += (string 
			// concatenation) explicitly because Netscape does not 
			// recognize the length property except on real String objects
			valString += val;
			//valString += val.toString(); // <--- don't do this! it crashes on IE for some objects
			//alert(val +" - the length is: "+valString.length);

			// check in case it is an object with properties
			// - on IE this can cause an exception, so the IE version 
			// just calls MM_hasProps with an exception handler. The function 
			// must be in a separate file (MM_DebugIE.js) because there is no 
			// exception handling on Netscape.
			if ( navigator.appName != "Netscape" && !MM_isIE4 ) {
				hasProps = MM_hasPropsIE(val);
			}
			else {
				hasProps = MM_hasProps(val);
			}
		}
	}


	// check in case it is an string that needs quotes 
	// (and not the result of GetProperties and not one of 
	// our default value strings)
	if ( typeof(val) == "string" && 
			-1 == valString.indexOf("MM_DELIM") && 
			-1 == valString.indexOf(MM_debugNull) && 
			-1 == valString.indexOf(MM_debugUndefined) && 
			-1 == valString.indexOf(MM_debugObject) && 
			-1 == valString.indexOf(MM_debugError) )
	{
		valString = "\"" + MM_escQuotes(valString) + "\"";
	}

	// sometimes in Netscape, the string representation of the object is empty, 
	// so we use a default representation in this case
	if ( hasProps && valString.length == 0 )
		ret = MM_debugObject;
	else if ( hasProps && valString.indexOf(MM_debugObject) != 0 )
		ret = MM_debugObject + " " + valString;
	else if ( hasProps )
		ret = valString;
	else if ( val != null && valString.length > 0 )
		ret = valString;
	else if ( val != null )
		ret = MM_debugUndefined;
	else // !val
		ret = MM_debugNull;
	return ret;
}
