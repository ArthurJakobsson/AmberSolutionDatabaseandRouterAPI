function helloWorld() {
    return "Hello";
}

/* FORMAT------
{  
   "id":"k93b109",
   "mac":"10:cd:b6:00:c1:8d",
   "description":null,
   "ip":"10.147.177.9",
   "ip6":null,
   "user":null,
   "firstSeen":"2019-07-23T17:46:06Z",
   "lastSeen":"2019-07-24T21:30:18Z",
   "manufacturer":"Essential Products",
   "os":"Android",
   "recentDeviceSerial":"Q2GD-KJ45-FNHF",
   "recentDeviceName":null,
   "recentDeviceMac":"00:18:0a:84:58:81",
   "ssid":"Amber Solutions Test WiFi",
   "vlan":0,
   "switchport":null,
   "usage":{  
      "sent":8174,
      "recv":246451
   }
}
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

function generateOneFake(){
    var d = new Date();
    var jsonFake = {
        "id":"k"+makeid(6),
        "mac": makeid(2)+":"+makeid(2)+":"+makeid(2)+ ":"+makeid(2)+":"+makeid(2)+":"+makeid(2),
        "description":null,
        "ip":"10.147.177.9",
        "ip6":null,
        "user":null,
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


module.exports= {
    method: generateOneFake,
    otherMethod: helloWorld
};
  