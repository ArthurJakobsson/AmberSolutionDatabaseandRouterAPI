
/*
Method to create a random sequence of ids based on a parameter length
*/
function makeid(length) {
    var result = '';
    var characters= 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
/*
Create a new user based on the Meraki API format
*/
function generateOneFake(){
    var d = new Date();
    var jsonFake = {
        "id":"k"+makeid(6),
        "mac": makeid(2)+":"+makeid(2)+":"+makeid(2)+ ":"+makeid(2)+":"+makeid(2)+":"+makeid(2),
        "description":null,
        "ip":"10.147.177.9",
        "ip6":null,
        "user":"+16509636808",
        "firstSeen":"2019-07-23T17:46:06Z",
        "lastSeen":"2019-07-24T"+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()+"Z",
        "manufacturer":"KFC 😄",
        "os":"Android",
        "recentDeviceSerial":"Q2GD-KJ45-FNHF",
        "recentDeviceName":null,
        "recentDeviceMac":"00:18:0a:84:58:81",
        "ssid":"Amber Solutions Test WiFi",
        "vlan":0,
        "switchport":null,
        "usage":{  
           "sent": Math.floor(1000 + Math.random() * 9000),
           "recv": Math.floor(10000 + Math.random() * 90000)
        }
    };
    return jsonFake;
}

//export module to allow other pages to run these functions
module.exports= {
    method: generateOneFake,
    otherMethod: makeid
};
  