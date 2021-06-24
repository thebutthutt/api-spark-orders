//BACKEND SERVER WEBSOCKET
//var printHandler = require("../handlers/printHandler.js");
const WebSocket = require("ws");

module.exports = function (server) {
    console.log("loaded");
    const wss = new WebSocket.Server({
        server,
    });

    var CLIENTS = [];
    var willis = -1;
    var dp = -1;
    var currentWillisRequestingID = -1;
    var currentDPRequestingID = -1;
    var currentWillisRequestingIndex = -1;
    var currentDPRequestingIndex = -1;
    var numPickup = 0;

    wss.on("connection", function connection(ws) {
        console.log("connection");
        /*
messageStructure: {
	sender: messiah | tech | dptech | server
	location: willis | dp
	command: requestPatronSignature | recievePatronSignature | requestAdminLogin | recieveAdminLogin | resetScreen | sendClientInfo
	data: variable
}
*/

        var iamwillis = false,
            iamdp = false;
        CLIENTS.push(ws);

        var clientData = {
            yourID: CLIENTS.length - 1,
            willisID: willis,
            dpID: dp,
        };

        var connectionMessage = {
            sender: "server",
            command: "sendClientInfo",
            data: clientData,
        };

        ws.send(JSON.stringify(connectionMessage)); //send the known data abobut other clients to the browser

        ws.on("message", function incoming(data) {
            //make sure every connected client knows who the messiah is
            if (data == "WillisSignaturePad") {
                console.log("willis sigpad connected");
                willis = clientData.yourID; //this is the ID of the messiah
                iamwillis = true;
                for (var i = 0; i < CLIENTS.length; i++) {
                    var newData = {
                        yourID: i,
                        willisID: willis,
                        dpID: dp,
                    };
                    CLIENTS[i].send(
                        JSON.stringify({
                            sender: "server",
                            command: "sendClientInfo",
                            data: newData,
                        })
                    );
                }
            } else if (data == "DPSignaturePad") {
                console.log("dp sigpad connected");
                dp = clientData.yourID; //this is the ID of the messiah
                iamdp = true;
                for (var i = 0; i < CLIENTS.length; i++) {
                    var newData = {
                        yourID: i,
                        willisID: willis,
                        dpID: dp,
                    };
                    CLIENTS[i].send(
                        JSON.stringify({
                            sender: "server",
                            command: "sendClientInfo",
                            data: newData,
                        })
                    );
                }
            } else {
                var obj = JSON.parse(data);

                //if a tech asks for a signature, tell the signature pad to work
                if (obj.sender == "tech" && obj.command == "requestPatronSignature") {
                    if (obj.location == "willis") {
                        currentWillisRequestingIndex = clientData.yourID; //mark what client is interacting with the signature pad
                        currentWillisRequestingID = obj.data.fileID; //the ID of the file being signed for
                        numPickup = obj.data.numPickup;
                        console.log(
                            "willis is asking patron to sign",
                            currentWillisRequestingIndex,
                            currentWillisRequestingID
                        );
                        //send the signature pad the request for a signaturee
                        CLIENTS[willis].send(
                            JSON.stringify({
                                sender: "tech",
                                location: "willis",
                                command: "requestPatronSignature",
                                data: obj.data,
                            })
                        );
                    } else {
                        currentDPRequestingIndex = clientData.yourID; //mark what client is interacting with the signature pad
                        currentDPRequestingID = obj.data.fileID; //the ID of the file being signed for
                        numPickup = obj.data.numPickup;
                        console.log("dp is asking patron to sign", currentDPRequestingIndex, currentDPRequestingID);

                        //send the signature pad the request for a signaturee
                        CLIENTS[dp].send(
                            JSON.stringify({
                                sender: "tech",
                                location: "dp",
                                command: "requestPatronSignature",
                                data: obj.data,
                            })
                        );
                    }
                } else if (obj.sender == "messiah" && obj.command == "recievePatronSignature") {
                    if (obj.location == "willis") {
                        if (obj.data.fileID == currentWillisRequestingID) {
                            //send request for login to the technicians screen
                            CLIENTS[currentWillisRequestingIndex].send(
                                JSON.stringify({
                                    sender: "server",
                                    location: "willis",
                                    command: "requestAdminLogin",
                                    data: {
                                        fileID: currentWillisRequestingID,
                                    },
                                })
                            );
                        } else {
                            console.log("Fake signature");
                            CLIENTS[willis].send(
                                JSON.stringify({
                                    sender: "server",
                                    command: "resetScreen",
                                })
                            );
                        }
                    } else {
                        if (obj.data.fileID == currentDPRequestingID) {
                            console.log("over here");
                            //send request for login to the technicians screen
                            CLIENTS[currentDPRequestingIndex].send(
                                JSON.stringify({
                                    sender: "server",
                                    location: "dp",
                                    command: "requestAdminLogin",
                                    data: {
                                        fileID: currentDPRequestingID,
                                    },
                                })
                            );
                        } else {
                            console.log("Fake signature");
                            CLIENTS[willis].send(
                                JSON.stringify({
                                    sender: "server",
                                    command: "resetScreen",
                                })
                            );
                        }
                    }
                } else if (obj.sender == "tech" && obj.command == "recieveAdminLogin") {
                    if (obj.location == "willis") {
                        CLIENTS[willis].send(
                            JSON.stringify({
                                sender: "server",
                                command: "resetScreen",
                            })
                        );
                        console.log("picking up at willis", currentWillisRequestingIndex, currentWillisRequestingID);
                        printHandler.markPickedUp(currentWillisRequestingID, numPickup);
                        currentWillisRequestingID = -1;
                        currentWillisRequestingIndex = -1;
                    } else {
                        CLIENTS[dp].send(
                            JSON.stringify({
                                sender: "server",
                                command: "resetScreen",
                            })
                        );
                        console.log("picking up at dp", currentDPRequestingIndex, currentDPRequestingID);
                        printHandler.markPickedUp(currentDPRequestingID, numPickup);
                        currentDPRequestingID = -1;
                        currentDPRequestingIndex = -1;
                    }
                }
            }
        });

        ws.on("close", function () {
            if (iamwillis) {
                willis = -1;
                console.log("willis sigpad gone");
            } else if (iamdp) {
                dp = -1;
                console.log("dp sigpad gone");
            }
        });
    });
};
