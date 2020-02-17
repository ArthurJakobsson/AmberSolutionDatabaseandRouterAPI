// author: Arthur Jakobsson


'use strict';
//plugins+dependenciess
const functions = require('firebase-functions'); //firebase hosting tools
const express = require('express'); //node js javascript express 
const cors = require('cors'); //firebase package to export an express app as a tool
const app = express(); //creates an express application
const twilio = require('twilio'); //twilio is used to send text messages from nodejs applications
const bodyParser = require('body-parser'); //used to parse text
const client = new twilio('ACad****************', '642bf16b********************');//my twilio account API key and SID key
const request = require("request"); //makes https requests easier using request
const qr = require('qr-image'); //allows for the creation of qr png
const meraki = require("meraki"); //import meraki dependency for using the meraki API 
const configuration = meraki.Configuration; //creates a meraki application
const testerContent = require('./tester') //import tester.js application for easy testing of my application
const fs = require('fs') //file system for application to read and write applications
var cookieParser = require('cookie-parser');//create and read cookies
let accessPointInfo; //save individual access point info
let attributesArray; //a global (but slightly unecessary) variable for storing the attributes of a user when pulled from another file


fs.readFile('./json_data/attributes.json', 'utf-8', function(err, data) {
    if (err) throw err
    attributesArray = JSON.parse(data).routers //import attributes from attributes.json for connecting traits to users
})

var randomData = testerContent.method; //a method to be used for testing of creating a new user
var makeId = testerContent.otherMethod; //a method to create a random sequence of characters, length of which is sent as a parameter

//Note to Arthur: to add eslint again to firebase deploy add "npm --prefix \"$RESOURCE_DIR\" run lint" to predeploy in firebase.json

app.use(cookieParser()); //create and use cookie on express app
// **************************************************************USER*CREATION************************************************************


//Variables
configuration.xCiscoMerakiAPIKey = "942ea20c3608b015f3ecfefdda16b2e64065d3f0"; //set the API key for Cisco Meraki routers
let companyInfo; //save globally the company ID for router
let networkInfo; //save globally the network ID for router
let clientHistory; //save globally the client history each time it is checked to the meraki database
let initialStart = true; //used to import all Meraki clients upon starting of the code

// start code for client collection
function initialSearch(){
    getOrganizationInfo()
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
    //console.log(companyInfo.id)

    const params = {
        organizationId: companyInfo.id
      }; //parameters for receiving the network information
    
    meraki.NetworksController.getOrganizationNetworks(params)
    .then(res => {
        //console.log(res)
        networkInfo = res[0]
        getNetDevices(); //get all router informations on the network
        getClientHistory(); //use API key to collect all user profiles who have accessed the router
    })
    .catch(e => {
        console.log(e)
    });
}
//get device info
function getNetDevices(){
    let paras = [];
    let networkId = networkInfo.id; // Amber Portal network identification
    paras["networkId"] = networkId; 
    
    meraki.DevicesController.getNetworkDevices(networkId) 
    .then(res => {
        //console.log(res);
        accessPointInfo = res[0] //save the access point information 
    })
    .catch(err => {
        console.log(err);
    });
}
//access client information
function getClientHistory(){
    console.log("https://n127.meraki.com/api/v0/networks/"+networkInfo.id+"/clients/") //print link used to access API data
    const options = {
        url: "https://n127.meraki.com/api/v0/networks/"+networkInfo.id+"/clients/",
        headers: {
            'X-Cisco-Meraki-API-Key': '942ea20c3608b015f3ecfefdda16b2e64065d3f0'
        }
    };
    request(options, callback); //call request using callback (callback starts all code scanning)
}

function callback(err, res, body) {
    //console.log('error:', err); // Print the error if one occurred
    //console.log('statusCode:', res && res.statusCode); // Print the response status code if a response was received
    //console.log('body:', body); 
    clientHistory = JSON.parse(body) //parse content returned from request
    if (initialStart){ //upon initial start update the user database fully
        fs.readFile('./json_data/users.json', 'utf-8', function(err, data) { //open user json file
            if (err) throw err
            //var checkedClients = []
            //var check = true;
            var allUsers = JSON.parse(data) //parse data (currently blank)
            for(var clients in clientHistory){ //cycle through all clients to save information

                console.log(clientHistory[clients]) //print all clients separately
                
                allUsers.users.push(clientHistory[clients]) //push client informations to user.json file

                var attributesToAdd = checkAttributesOfAddress(clientHistory[clients].recentDeviceMac);  //get attributes associated with the router to the user
                allUsers.users[allUsers.users.length-1].attribute = attributesToAdd;//add attributes
                checkAdStrength(allUsers.users[allUsers.users.length-1]) //check to see if there is an applicable ad to be sent to user
            }
            fs.writeFile('./json_data/users.json', JSON.stringify(allUsers), 'utf-8', function(err) { //save user file
                if (err) throw err
            })
        })
        initialStart=false;
    }
}
/*
 This method is repeatedly called in order to look for new users.
*/
function searchForNewUser(){
    console.log("\x1b[33m%s\x1b[0m" ,"Checking Server"); //update message
    var found=false; //variable to check in case a new user has showed up on the API data
    //clientHistory.push(randomData())  //This line is used in case you want to test the creation of a new user
    //var checkedClients = []
    //var check = true;
    fs.readFile('./json_data/users.json', 'utf-8', function(err, data) {
        if (err) throw err

        var allUsers = JSON.parse(data) //import saved data on user from user.json
        if (clientHistory!==allUsers.users){ //check if the user book has been updated
            for (var outer in clientHistory) //rotate through all newly checked clients
            {
                //console.log(clientHistory[outer].usage) //prints amount of usage found per user
                for (var inner in allUsers.users){ //rotate through all saved clients
                    //console.log(allUsers.users[inner].usage) //print usage of all old know clients
                    console.log("\x1b[33m%s\x1b[0m" ,"individual elements") //print to inform that the user informations are being updated
                    if (clientHistory[outer].mac==allUsers.users[inner].mac){ //check if the saved user and the updated clients have the same mac address
                        found=true //this means that the user has been noted previously
                        if(clientHistory[outer].usage.sent!==allUsers.users[inner].usage.sent) //check if the amount of data used is not the same
                        {
                            allUsers.users[inner].usage.sent = clientHistory[outer].usage.sent //update amount of sent data
                            allUsers.users[inner].usage.recv = clientHistory[outer].usage.recv //update amount of received data
                            allUsers.users[inner].lastSeen = clientHistory[outer].lastSeen //update time of most recent connection
                            //console.log("\x1b[33m%s\x1b[0m" ,"updated user times") //print to signify updating of user info
                        }
                        if(clientHistory[outer].recentDeviceMac!==allUsers.users[inner].recentDeviceMac){ // check if the most recent router is the same
                            allUsers.users[inner].recentDeviceMac = clientHistory[outer].recentDeviceMac //update most recent router used
                            var arrayOfAttributes = checkAttributesOfAddress(clientHistory[outer].recentDeviceMac) //because each router tells a little about the user add the attributes of the router to the user information
                            for (var i in arrayOfAttributes)
                            {
                                allUsers.users[inner].attribute.push(arrayOfAttributes[i]);
                            }
                            checkAdStrength(allUsers.users[inner]) //since there is a new location, check to see if an ad is applicable to be sent
                        }
                    }
                }
                if (found===false){ //if user if not previously known
                    console.log(clientHistory[outer]) //print new user info
                    allUsers.users.push(clientHistory[outer]) //add new user to data file
                }
                found=false; //reset found variable
            }
        }
        fs.writeFile('./json_data/users.json', JSON.stringify(allUsers), 'utf-8', function(err) { // write user file to update information
            if (err) throw err
        })
    })
    
}


/*
Method to check the strength of the comparison between a user and all the ads to see if ads are applicable to be sent
*/
function checkAdStrength(person){ 
    var attributesOfPerson = person.attribute; //save the attributes of person
    var mac = person.mac; //save the mac address of  person
    var recentDeviceMac = person.recentDeviceMac; //save the most recent mac address of the person
    var user = person.user; //save the phone number of the person
    var adSent = false;
    var saveAddress;
    fs.readFile('./json_data/ads.json', 'utf-8', function(err, data) { //read all the filed from the ad data
        if (err) throw err
    
        var ads = JSON.parse(data).ads //save the information read from the ad document

        for (var advert in ads){ //check applicability with user to all advertisements
            var tags = getTags(ads[advert]) //import all tags that user has in an array
            adSent = compareWithAttributes(ads[advert], tags, recentDeviceMac, attributesOfPerson, mac, user) //compare attributes between ad and user to see if ad is correct for user
            if (adSent)
            {
                saveAddress = true; //ad is correct for user
            }
        }
    })
    if (saveAddress)
    {
        return mac; //potential to save mac address of user (feature not currently in use)
    }
    else
    {
        return null;
    }
}
/*
Method to check the amount of connection between ad and user
Parameters: ad to compare, tags of advertisement, most recent location address, attributes of user, mac address of user, user phone number
*/
function compareWithAttributes(currentAd, tags, recentDeviceMac, attributesOfPerson, mac, user){
    var counterOfComparison =0; //number of tags that both ad and user have in common
    var textedUser = false;
    fs.readFile('./json_data/attributes.json', 'utf-8', function(err, data) { //read all attributes associated with router
        if (err) throw err

        var routerAttributes = JSON.parse(data).routers //save all routers and their attribute information
        
        for (var router in routerAttributes) //for all the routers
        {
            if(routerAttributes[router].mac==recentDeviceMac) //if the router is the most recent router encountered by user
            {
                for (var c in routerAttributes[router].company) //for all the companies associated with the router
                {
                    if (routerAttributes[router].company[c]==currentAd.title) //check if router company appears in advertisement
                    {   
                        for (var t in tags) //rotate through all tags in current ad
                        {
                            for(var a in attributesOfPerson) //rotate through all the attributes associated with the user
                            {
                                if(attributesOfPerson[a]==tags[t]){ //check comparison between user and ad
                                    counterOfComparison++; //increase counter saying user and ad have similarity
                                }
                            }
                        }
                        if ((counterOfComparison/tags.length)*100>=currentAd.percentOff){ //if ad to user ratio is stronger than ad requested connection
                            console.log("adId: ", currentAd.adId) //print ad Id of ad to be sent
                            textedUser = true;
                            var qrIdentification = createNewQRLink(mac, currentAd.adId) //create a QR image for the user and save identification number for QR
                            textUser(currentAd, qrIdentification, user) //text user with advertisement
                        }
                    }
                }
            }
        }
    })
    return textedUser;
}
/*
This method contains creates an array with all the ad tags. 
Note to Arthur: Make this method enacted upon the creation of ad.
*/
function getTags(ad)
{
    var propertyArray = new Array();
    var tagArray = ["Clothes", "Food", "Mens", "Womens", "Electronics", "Dogs"] //array of all possible ad tags
    tagArray.forEach(function (element){ //cycle through all tags
        if(ad.hasOwnProperty(element)){
            propertyArray.push(element); //ad to individual ad tag array
        }
    })
    return propertyArray; //return the array with all ad tags
}


function checkAttributesOfAddress(recentMac){ 
    for(var i = 0; i < attributesArray.length; i++) //rotate through attributes assigned to routers
    {
        console.log(attributesArray[i].mac) //print all routers' mac addresses
        console.log(recentMac) //print mac address being searched for
        if(attributesArray[i].mac == recentMac) //check if mac address of router is the same between user recently seen and database of routers
        {
            console.log(attributesArray[i].attributeTags);
            return attributesArray[i].attributeTags //return the tags associated with the found router
        }
    }

}

/*
Method to start entire code and continue search constantly
*/
function startup(){ 
    initialSearch() //start initial search to add users
    setInterval(function(){
        getClientHistory() //refresh the global variable that keeps all client data
        searchForNewUser() //search for new user / new information about users
    }, 30000); // every 30 seconds search again for new users and locations
}


//
//
//
//
//
//
//
// **************************************************************Send Txt Msg*************************************************************
//
//
//
//
//
//

function textUser(currentAd, qrIdentification, user) 
{
    console.log('http://c1f1f651.ngrok.io/qr/'+qrIdentification) //print out identification number of user  
    console.log(user) //print out phone number being sent to
    client.messages
        .create({
            body: currentAd.content+' http://c1f1f651.ngrok.io/qr/'+qrIdentification,
            from: '+16504377542',
            mediaUrl: [currentAd.link],
            to: user
        }) //create message to be send
        .then(message => console.log(message.sid)); //print out the message SID for tracking purposes
        //example Url https://www.dealsplus.com/blackfriday/img/news_images/u29_1446237435.jpeg
}

//
//
//
//
//
//
//
// **************************************************************Host QR Code*************************************************************
//
//
//
//
//
//

//Cookie
exports.setCookie = functions.https.onRequest((req,res)=>{
    var imageId = req.url.substring(4); //get qr identification
    var associatedMac; 
    fs.readFile('./json_data/sent.json', 'utf-8', function(err, dataFromSent) { //look for information about the ad requested
        if (err) throw err

        var sentData = JSON.parse(dataFromSent).sent; //save sent data
        for (var message in sentData) // circle all the sent messages
        {
            if (sentData[message].uniqueId == imageId) //if ID is found
            {
                console.log(sentData[message].macAddress) 
                associatedMac = sentData[message].macAddress; //save the mac address that belongs to the user for implanting in the cookie
            }
        }
        console.log(sentData[message].macAddress)
    })
    setTimeout(function(){
        res.cookie("UserInfo", "mac:" + associatedMac + ", qrId:" + imageId, ["type=ninja", "language=javascript"]); //assign a cookie with the user's mac address and qrId
        res.redirect("/displayQr/"+imageId) //send user to page to display qr code
    }, 2000); //because of readFile delay it is safe to add a short delay in order to prevent errors (turn into await system later if time permits)
})

//Host QR Code
exports.qrHost = functions.https.onRequest((req,res)=>{
    var imageId = req.url.substring(11); //find image identification key from link
    res.sendFile('./qr/'+imageId+'.png', { root: __dirname }) //display image associated with identification key
});


//
//
//
//
//
//
//
// **************************************************************Store*************************************************************
//
//
//
//
//
//

exports.storeFunction = functions.https.onRequest((req,res)=>{
    res.sendFile('store.html',  {root: '../public' }) //display store page
});

//
//
//
//
//
//
//
// **************************************************************Ad Creation*************************************************************
//
//
//
//
//
//

/*
Create ad from data from form on store page. Push information about ad to ads.json
*/
exports.submitAdSelection = functions.https.onRequest((req,res)=>{
    fs.readFile('./json_data/ads.json', 'utf-8', function(err, data) { //read in contents of ads.json
        if (err) throw err
    
        var arrayOfObjects = JSON.parse(data);
        arrayOfObjects.ads.push(req.body); //push information directly from stores
        arrayOfObjects.ads[arrayOfObjects.ads.length-1]["adId"] = makeId(8); //create a new Id for advertisement and add it to ad info
        arrayOfObjects.ads[arrayOfObjects.ads.length-1]["successCount"] = 0; //create counter to mark success rate with ads
        fs.writeFile('./json_data/ads.json', JSON.stringify(arrayOfObjects), 'utf-8', function(err) { //save information to ad file
            if (err) throw err
        })
    })
    res.redirect('/store'); //go back to store screen
});

//
//
//
//
//
//
//
// **************************************************************QR Click*************************************************************
//
//
//
//
//

exports.qrCodeRead = functions.https.onRequest((req,res)=>{
    var permanentFind =false; //variable to know if ad has been located and is correct
    fs.readFile('./json_data/ads.json', 'utf-8', function(err, data) {//import all ad data
        if (err) throw err
        
        var allAds = JSON.parse(data) //save data about ads
        fs.readFile('./json_data/sent.json', 'utf-8', function(err, dataFromSent) {
            if (err) throw err
            var foundIndex;
            var sentAds = JSON.parse(dataFromSent); //save data about sent messages
            var ads = sentAds.sent; //record ad data (strip outside of json)
            for (var a in ads) //rotate through sent ads
            {
                console.log("Ad QR id", ads[a].uniqueId, "Link ID", req.url.substring(7)) //print IDs to confirm comparisons
                if (ads[a].uniqueId == req.url.substring(7)) //if ID is found
                {
                    for (var e in allAds.ads) //rotate through all ads
                    {
                        console.log("Ad QR id: ", ads[a].adId, "Original IDs: ", allAds.ads[e].adId) //print IDs to confirm comparisons
                        if (ads[a].adId == allAds.ads[e].adId) //if ad ID is recognized
                        {
                            permanentFind= true; //advertisement has been found and QR is correct
                            foundIndex = e;
                        }
                    }
                    
                }
            }
            if (permanentFind==false){ //if qr ID is incorrect remark that the ad is incorrect
                res.send("<h2>Ad not found. Incorrect QR Identification number.<h2>")
            }
            else{
                res.send("<h2>Ad successfully found <br>" + allAds.ads[foundIndex].title + "<br>"+allAds.ads[foundIndex].content+"<h2>") //send success and ad content
                allAds.ads[e].successCount = allAds.ads[e].successCount+1; //increase success count of advertisement
            }
        })

        fs.writeFile('./json_data/ads.json', JSON.stringify(allAds), 'utf-8', function(err) { //save information about ads (aka update success count)
            if (err) throw err
        })
    })
});


//
//
//
//
//
//
//
// **************************************************************Create QR*************************************************************
//
//
//
//
//

function createNewQRLink(userMac, adId){
    var qrId = makeId(10)
    setTimeout(function() {
         //create identification number for new qr code
        fs.readFile('./json_data/sent.json', 'utf-8', function(err, data) { //open sent.json to update
            if (err) throw err
        
            var arrayOfObjects = JSON.parse(data) //save information on sent data
            arrayOfObjects.sent.push({
                "macAddress": userMac,
                "uniqueId": qrId,
                "adId": adId
            })//add new qr information to sent data
            console.log(qrId)
            let qr_txt = "http://c1f1f651.ngrok.io/store/"+qrId; //create content to be sent on qr code
            //let qr_txt = "https://amberportal.firebaseapp.com/store/"+qrId; //This is the actual one for deployment


            // Generate QR Code from text
            var qr_png = qr.imageSync(qr_txt,{ type: 'png'}) //create qr image
            // Generate a random file name 
            
            let qr_code_file_name = qrId + '.png'; //name the image
        
            fs.writeFileSync('./qr/' + qr_code_file_name, qr_png, (err) => {
                
                if(err){
                    console.log(err);
                }
                
            }) //write the image file to /qr directory
            fs.writeFile('./json_data/sent.json', JSON.stringify(arrayOfObjects), 'utf-8', function(err) {
                if (err) throw err
            }) //save information on sent data with the new QR code
        })
    }, 3000);
    return qrId;//return the qr code identifiction number
}
//
//
//
//
//
//
//
// **************************************************************COOKIE*************************************************************
//
//
//
//
//
//

exports.norwich = functions.https.onRequest((req,res)=>{ //example of cookie reading website that will edit user content
    var cookieMac = decodeURIComponent(req.headers.cookie).substring(13,30); //get mac address of user from cookie information
    fs.readFile('./json_data/users.json', 'utf-8', function(err, data) { //read in contents of ads.json
        if (err) throw err
    
        var arrayOfUsers = JSON.parse(data); //get user file information
        for (var user in arrayOfUsers.users){ 
            if(arrayOfUsers.users[user].mac == cookieMac) //search for the mac address that appears in the webpage
            {
                arrayOfUsers.users[user].attribute.push("dogs") //since this page is about dogs, we can add the "dogs" trait to the user's profile
            }
        }
        fs.writeFile('./json_data/users.json', JSON.stringify(arrayOfUsers), 'utf-8', function(err) { //save information to user file
            if (err) throw err
        })
    })
    res.sendFile('norwich.html',  {root: '../public' }) //display page about norwich terriers
})

exports.welcome = functions.https.onRequest((req,res)=>{
    res.sendFile('welcome.html',  {root: '../public' }) // a simple welcome page for displaying a landing page after captive portal sign-in. Not used because of variable ngrok connection.
})
//
//
//
//
//
//
//
// **************************************************************FIREBASE*************************************************************
//
//
//
//
//
//
// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin'); //connection to firebase
admin.initializeApp(); //firebase creation entity

exports.clientMonitoring = functions.https.onRequest((req,res)=>{
    startup();
}); //method which upon being called starts an endless searhcing for users and ads to be sent