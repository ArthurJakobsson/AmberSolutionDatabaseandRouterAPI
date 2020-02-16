const twilio = require('twilio');
const client = new twilio('AC9******************************', 'dbe******************************');

client.messages
.create({
   body: 'Hello there from my NodeJS Project?',
   from: '+1650*******',
   to: '+1650*******'
 })
.then(message => console.log(message.sid));