/**
 * Created by BVurhani Fakhruddin
 */
let constants = require("../../../src/common/constants");
let AWS = require("aws-sdk");
let lodash = require("lodash");

let launchMe = function(event, context, callback) {
    let docClient = require("../../../src/common/dynamodbconnection");

    let response = require("../../../nodejsutilities/HttpResponse/httpResponse");

    console.log("Event " + JSON.stringify(event));

    let request;
    if (event.body === undefined) {
        request = event.body;
    } else {
        request = JSON.parse(event.body);
        // api gateway will move the request to the body
        // let request = event.pathParameters; //api gateway will move the request to the body
    }

    // need to make user is not over their limit
    let myResponse = response.getHttpResponse(constants.CORS_ORIGIN);

    let params = {
        TableName: constants.SETTINGS_TABLE,
        Key: {
            settingname: constants.EDMMSETTINGS
        }
    };
    docClient.get(params, (err, edmmSettingData) => {
        if (err) {
            console.log("Error " + JSON.stringify(err.message));
            myResponse.statusCode = 500;
            myResponse.body = JSON.stringify(err.message);

            callback(null, myResponse);
        } else {
            myResponse.statusCode = 201;
            myResponse.body = JSON.stringify(edmmSettingData);

            let totalStockIds = request.stockIds.length;
            let promisesMediaSetIdsPost = [];

            for (let i = 0; i < totalStockIds; i++) {
                let sellerOrg = request.stockIds[i].businessUnit;

                let angleCategory = "";
                if (edmmSettingData !== null && edmmSettingData !== undefined && edmmSettingData.Item.value.hasOwnProperty(sellerOrg)) {
                    angleCategory = edmmSettingData.Item.value[sellerOrg].angleCategories;
                } else if (edmmSettingData !== null && edmmSettingData !== undefined) {
                    angleCategory = edmmSettingData.Item.value.default.angleCategories;
                }

                let payloadMediaSets = [];
                request.stockIds[i].mediaSets.forEach(function(x) {
                    if (x.active) payloadMediaSets.push(x);
                });

                let payload = {
                    "mediaSets": payloadMediaSets,
                    "businessUnit": request.businessUnit
                };
                let paramsForMediaSetId = {
                    FunctionName: constants.GET_IMAGES_BY_MEDIASETIDs_LAMBDA,
                    Payload: JSON.stringify(payload)
                };

                promisesMediaSetIdsPost.push(mediasetProcessing(request.stockIds[i].stockId, paramsForMediaSetId, angleCategory));
            }
            Promise.all(promisesMediaSetIdsPost).then(responseElements => {
                myResponse.statusCode = 200;
                console.log("responseBody " + JSON.stringify(responseElements));
                myResponse.body = JSON.stringify(responseElements);
                callback(null, myResponse);
            }).catch(function(e) {
                console.log("error!", e);
                myResponse.statusCode = 500;
                myResponse.body = JSON.stringify(err);
                callback(null, myResponse);
            });
        }
    });
};

function mediasetProcessing(stockId, paramsForMediaSetId, angleCategory) {
    return new Promise(function(resolve, reject) {
        let responseElement = {};
        responseElement.stockId = stockId;
        responseElement.glamour = [];
        responseElement.inspection = [];
        let lambda = new AWS.Lambda();
        lambda.invoke(paramsForMediaSetId, (err, dataFromMediaSetIds) => {
            console.log("dataFromMediaSetIds " + JSON.stringify(dataFromMediaSetIds));
            if (err) console.error(err);
            if (err || dataFromMediaSetIds === undefined || dataFromMediaSetIds === null) {
                reject(responseElement);
            }
            let promisesMediaSetIdsPostResponseBody = JSON.parse(dataFromMediaSetIds.Payload).body;

            let numImages = promisesMediaSetIdsPostResponseBody.length;
            let isPhotoBoothPresent = false;
            let isIVIPresent = false;
            let isNavPresent = false;

            for (let j = 0; j < numImages; j++) {
                if (j === 0) {
                    responseElement.glamour.push(promisesMediaSetIdsPostResponseBody[j]);
                } else {
                    if ((promisesMediaSetIdsPostResponseBody[j].metadata.fulcrum_source === constants.PhotoboothSource ||
                            promisesMediaSetIdsPostResponseBody[j].source === constants.PhotoboothSource ||
                            promisesMediaSetIdsPostResponseBody[j].metadata.fulcrum_path === constants.PhotoboothSource) &&
                        promisesMediaSetIdsPostResponseBody[j].businessProcess === constants.AuctionCheckIn) {
                        responseElement.glamour.push(promisesMediaSetIdsPostResponseBody[j]);
                        isPhotoBoothPresent = true;
                    } else if ((promisesMediaSetIdsPostResponseBody[j].metadata.fulcrum_source === constants.IVISource ||
                            promisesMediaSetIdsPostResponseBody[j].source === constants.IVISource ||
                            promisesMediaSetIdsPostResponseBody[j].metadata.fulcrum_path === constants.IVISource) &&
                            ((lodash.find(angleCategory, ["angle", promisesMediaSetIdsPostResponseBody[j].metadata.angle])) !== undefined &&
                            (lodash.find(angleCategory, ["angle", promisesMediaSetIdsPostResponseBody[j].metadata.angle])).category !== undefined &&
                            (lodash.find(angleCategory, ["angle", promisesMediaSetIdsPostResponseBody[j].metadata.angle])).category === constants.GLAMOUR) &&
                            // PBI 31868 to add IVI Interior-left to Photobooth Images
                            (!isPhotoBoothPresent || promisesMediaSetIdsPostResponseBody[j].metadata.angle === "interior-left")) {
                        responseElement.glamour.push(promisesMediaSetIdsPostResponseBody[j]);
                        isIVIPresent = true;
                    } else if (!isPhotoBoothPresent && !isIVIPresent && (promisesMediaSetIdsPostResponseBody[j].metadata.fulcrum_source === constants.NAVSource ||
                            promisesMediaSetIdsPostResponseBody[j].source === constants.NAVSource ||
                            promisesMediaSetIdsPostResponseBody[j].metadata.fulcrum_path === constants.NAVSource) &&
                        promisesMediaSetIdsPostResponseBody[j].businessProcess === constants.AuctionCheckIn) {
                        responseElement.glamour.push(promisesMediaSetIdsPostResponseBody[j]);
                        isNavPresent = true;
                    } else if (!isPhotoBoothPresent && !isIVIPresent && !isNavPresent && (promisesMediaSetIdsPostResponseBody[j].metadata.fulcrum_source === constants.UISource ||
                            promisesMediaSetIdsPostResponseBody[j].source === constants.UISource ||
                            promisesMediaSetIdsPostResponseBody[j].metadata.fulcrum_path === constants.UISource) &&
                        promisesMediaSetIdsPostResponseBody[j].businessProcess === constants.AuctionCheckIn) {
                        responseElement.glamour.push(promisesMediaSetIdsPostResponseBody[j]);
                    } else if (!((lodash.find(angleCategory, ["angle", promisesMediaSetIdsPostResponseBody[j].metadata.angle])) !== undefined &&
                            (lodash.find(angleCategory, ["angle", promisesMediaSetIdsPostResponseBody[j].metadata.angle])).category !== undefined &&
                            (lodash.find(angleCategory, ["angle", promisesMediaSetIdsPostResponseBody[j].metadata.angle])).category === constants.GLAMOUR)) {
                        responseElement.inspection.push(promisesMediaSetIdsPostResponseBody[j]);
                    }
                }
            }
            resolve(responseElement);
        });
    });
}

exports.handler = launchMe;
