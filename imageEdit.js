/**
 * Created by Burhani Fakhruddin.
 *
 *
 * Makes image active/inactive
 * JSON Example:
 * {
 *	"stockId": "SID623553",
 *	"vin":"TERTER67676TUYT",
 *	"changeNotes": [{
 *			"imageUId": "765e6725367232f3hy2f",
 *			"mediaSetId": "ecb6abe3-9da7-48c9-9e94-5ad03058f339",
 *	  		"inspectionId": "Nav_78232873",
 *			"notes": "Front Bumper 2 inches"
 *		},
 *		{
 *			"imageUId": "4234234234234234234234",
 *			"mediaSetId": "ecb6abe3-9da7-48c9-9e94-5ad03058f339",
 *		  	"inspectionId": "IVI_78232873",
 *			"notes": "Front Dent depth 1 inch"
 *		}],
 *	"orderChanges": [{
 *			"mediaId": "ecb6abe3-9da7-48c9-9e94-5ad03058f339",
 *			"order": 0
 *		},
 *		{
 *			"mediaId": "rwr32423123123123123123",
 *			"order": 2
 *		}],
 *  "inactivateImages": [{
 *	        "mediaId": "ecb6abe3-9da7-48c9-9e94-5ad03058f339"
 *		},
 *		{
 *			"mediaId": "rwr32423123123123123123"
 *		}]
 *}
 *
 * @param event - includes stockId - vehicle stock ID system assigned, VIN - vehicle ID number, inactivateImages object with a list of mediaId attribute(s)
 * event - includes businessUnit attribute; if null, uses default
 * @returns http response code (Success: 200; Failure: other codes)
 */
var constants = require("../../common/constants");
var request = require("request");
var apiGatewayURL = constants.ApiGatewayURL;
var baseMediaURI = constants.BaseMediaURI;
var baseImageManagementURI = constants.BaseImageManagementURI;
var AWS = require("aws-sdk");

exports.launchMe = function(event, context, callback) {
    var req;
    var stockId;
    var vin;
    var inactivateImages;
    var orderChanges;
    var changeNotes;
    var u;

    var response = require("../../../nodejsutilities/HttpResponse/httpResponse");
    var theResponse = response.getHttpResponse(constants.CORS_ORIGIN);

    if ((event.body === undefined) || (JSON.stringify(event.body) === undefined)) { // this is for testing through lambda
        console.error("Event: undefined body.");
        theResponse.statusCode = 500;
        theResponse.body = "Event: undefined body.";
        callback(null, theResponse);
    } else {
        console.debug("Event: defined body");
        // event.body = JSON.stringify(event.body);
        console.debug("JSON: " + event.body);
        req = JSON.parse(event.body); // api gateway will move the request to the body
    }

    console.log("Request is " + JSON.stringify(req));
    // Validate JSON input
    stockId = req.stockId;
    vin = req.vin;
    inactivateImages = req.inactivateImages;
    orderChanges = req.orderChanges;
    changeNotes = req.changeNotes;

    var mediaId = undefined;
    apiGatewayURL = context.hasOwnProperty("apiGatewayURL") ? context.apiGatewayURL : apiGatewayURL;

    console.debug("VIN = " + req.vin + "\nStock ID = " + stockId);
    if (!(stockId === undefined) && !(vin === undefined) && (stockId !== undefined && stockId.length > 1) && (vin !== undefined && vin.length > 1)) {

        if ((!(typeof inactivateImages === undefined)) && !(inactivateImages === null)) {
            console.debug("\nMaking active/inactive the following image(s):\n");
            for (x in inactivateImages) {
                mediaId = inactivateImages[x].hasOwnProperty("mediaId") ? inactivateImages[x].mediaId : undefined;
                console.debug("MediaID: " + mediaId);
                if ((mediaId === undefined || mediaId.length === 0)) {
                    console.debug("Warning: Check mediaId input attribute!\n");
                } else {
                    // Activate/Inactivate images
                    u = apiGatewayURL + baseMediaURI + mediaId;

                    console.debug("Make image(s) active/inactive URL: " + u + "\n");
                    try {
                        var requestPayload = {
                            "body": {
                                "mediaid": mediaId,
                                "attribute": "active",
                                "value": false
                            }
                        };
                        var paramsForDelete = {
                            FunctionName: constants.Delete_Image,
                            Payload: JSON.stringify(requestPayload)
                        };
                        console.log("Request to lambda " + paramsForDelete);
                        var lambda = new AWS.Lambda();
                        lambda.invoke(paramsForDelete, function(error, response) {
                            if (!error && !(response === undefined)) {
                                console.debug("Request URL: " + u + " Response code: " + response.statusCode + "\n");
                            } else {
                                console.debug("Error: " + JSON.stringify(error) + "\nResponse code: " + JSON.stringify(response) + "\n");
                            }
                        });
                    } catch (ex) {
                        console.debug("Error " + ex.toLocaleString());
                        theResponse.statusCode = 500;
                        theResponse.body = ex.toLocaleString();
                        callback(null, theResponse);
                    }
                }
            }
        } else {
            console.debug("Info: No image(s) to make active/inactive.");
        }
        theResponse.statusCode = 200;
        theResponse.body = "Success";
    } else {
        if (stockId === undefined && vin === undefined) {
            theResponse.body = "Stock ID and/or VIN is missing!";
            theResponse.statusCode = 500;
            console.debug("Stock ID and/or VIN is missing!");
        } else if (stockId === undefined) {
            console.debug("Stock ID is missing!");
            theResponse.body = "Stock ID is missing!";
            theResponse.statusCode = 500;
        } else if (vin === undefined) {
            console.debug("VIN is missing!");
            theResponse.body = "VIN is missing!";
            theResponse.statusCode = 500;
        } else {
            theResponse.statusCode = 200;
            theResponse.body = "Success";
        }
    }
    callback(null, theResponse);
};
