'use strict';
const meraki = require("meraki");
const request = require("request");
const configuration = meraki.Configuration;
const mongo = require('mongodb').MongoClient

const url = 'mongodb://localhost:27017'

configuration.xCiscoMerakiAPIKey = "942ea20c3608b015f3ecfefdda16b2e64065d3f0";
let companyInfo;
let networkInfo;
let clientHistory;
let db;
let collection;
let accessPointInfo
let databaseAdditions='';
let userRecord;
let initialStart = true;

function startMongo(){
    // setup mongodb
    mongo.connect(url, (err, client) => {
        if (err) {
        console.error(err)
        return
        }
        db = client.db('AmberDatabase')
        collection = db.collection('Users')
        getOrganizationInfo()
    })
    return true;
}



//get router organization
function getOrganizationInfo(){
    meraki.OrganizationsController.getOrganizations()
        .then(res =>{
            //console.log(res)
            companyInfo = res[0]
            getNetworkInfo();
        });
}
//get router network
function getNetworkInfo(){
    console.log(companyInfo.id)

    const params = {
        organizationId: companyInfo.id
      };
    
    meraki.NetworksController.getOrganizationNetworks(params)
    .then(res => {
        //console.log(res)
        networkInfo = res[0]
        getNetDevices();
        getClientHistory();
    })
    .catch(e => {
        console.log(e)
    });
}
//get device info
function getNetDevices(){
    let paras = [];
    let networkId = networkInfo.id; // Amber Portal
    paras["networkId"] = networkId;
    
    meraki.DevicesController.getNetworkDevices(networkId) 
    .then(res => {
        //console.log(res);
        accessPointInfo = res[0]
    })
    .catch(err => {
        console.log(err);
    });
}
//access client information
function getClientHistory(){
    //console.log("https://n127.meraki.com/api/v0/networks/"+networkInfo.id+"/clients/")
    const options = {
        url: "https://n127.meraki.com/api/v0/networks/"+networkInfo.id+"/clients/",
        headers: {
            'X-Cisco-Meraki-API-Key': '942ea20c3608b015f3ecfefdda16b2e64065d3f0'
        }
    };
    request(options, callback);
}
function callback(err, res, body) {
    //console.log('error:', err); // Print the error if one occurred
    console.log('statusCode:', res && res.statusCode); // Print the response status code if a response was received
    console.log('body:', body); 
    clientHistory = JSON.parse(body)
    if (initialStart){
        userRecord = clientHistory
        initialStart=false;
        insertClients(0)
    }
}
function insertClients(userCount){
    collection.insertOne(clientHistory[userCount])
        .then(res => {
            console.log("I'm here")
            if (userCount!=clientHistory.length-1)
            {
                insertClients(userCount+1)
            }
            else(
                constantSearch()
            )
        })
        .catch(err => {
            console.log(err)
        });
        console.log("content:", clientHistory[userCount])
}
function instertUpdate(updateUsers)
{
    collection.insertOne(updateUsers)
        .then(res => {
            console.log("yippee")
        })
        .catch(err => {
            console.log(err)
        });
    }   

function searchForNew(){
    console.log("\x1b[33m%s\x1b[0m" ,"Checking Server");
    var found=false;
    getClientHistory();
    if (clientHistory!=userRecord){
        for (var outer in clientHistory)
        {
            console.log(clientHistory[outer].usage)
            for (var inner in userRecord){
                console.log(userRecord[inner].usage)
                console.log("\x1b[33m%s\x1b[0m" ,"individual elements")
                if (clientHistory[outer].mac=userRecord[inner].mac){
                    found=true
                    
                    if(clientHistory[outer].usage.sent!=userRecord[inner].usage.sent)
                    {
                        collection.update(
                            { _id: clientHistory[outer]._id},
                            {
                                $set: {
                                    "usage.sent": clientHistory[outer].usage.sent,
                                    "usage.recv": clientHistory[outer].usage.recv,
                                    "lastSeen": clientHistory[outer].lastSeen
                                }
                            }
                        )
                        console.log("\x1b[33m%s\x1b[0m" ,"updated user times")
                    }
                }
            }
            if (found==false){
                instertUpdate(element)
                console.log("\x1b[33m%s\x1b[0m" ,"Added Person to Database");
            }
            found=false;
        }
    }
}


function startup(){
    startMongo()
}

function constantSearch(){  
    setInterval(searchForNew, 1000);
}
startup()