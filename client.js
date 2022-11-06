
const { Client, LocalAuth, MessageMedia, Location } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const csv = require('csv-parser');
const dotenv = require('dotenv');
const message = fs.readFileSync("./message.txt", { encoding: 'utf-8' });
const media = MessageMedia.fromFilePath('./images/download.png');
const contacts = [];

const { Client: Pgsql } = require('pg');
const pgsql_connection = new Pgsql
    ({
        user: `${process.env.USER}`,
        host: `${process.env.HOST}`,
        database: `${process.env.DATABASE}`,
        password: `${process.env.PASSWORD}`,
        port: `${process.env.DB_PORT}`,
    })

pgsql_connection.connect();
dotenv.config();


const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "client-two",
        dataPath: "./Session"
    })
})

client.initialize();


let counter = { fails: 0, success: 0 }

/* DB QUERIES */

 


//Listener from Postgre
pgsql_connection.query('LISTEN "whatsapp_listener"');
pgsql_connection.on("notification", (data) => {
    //console.log("data", JSON.parse(data.payload));
    console.log('notif from database!');
    console.log('resending...');
    getWhatsappConfig();

    var data_leads = './data_leads/birthday_campaign.csv';
    var message = 'MESSAGE TEST'
    handler(data_leads, message);
    counter.success = 0;
    counter.fails = 0;

});

/* DB QUERIES */



/// WHATSAPP LIBRARY SENDING PART ///


function handler(data_leads, message) {
    fs.createReadStream(data_leads)
        .pipe(csv())
        .on('data', function (data) {
            try {
                contacts.push(data.number);
                //console.log(data.number); 
            } catch (err) {
                console.error(err);
                console.log('error contact number');
            }
        })
        .on('end', () => {
            sender(message);
            //console.log(contacts);
        });

}






client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});


client.on('ready', () => {
    /*
    for (var i = 0; i < 1; i++) {
        console.log('Sending..');
        deploy_all();
    }*/
    pgsql_connection.query(`SELECT * FROM whatsapp_config where triggerstatus='active' and sending ='true'`).then(res => {
        const data = res.rows;
        //console.log(data);
        console.log('Whatsapp queue count : ', res.rowCount);
        data.forEach(row => {
            console.log(`config id: ${row.config_id};  status: ${row.triggerstatus};  data_leads: ${row.data_leads}`);
            var data_leads = row.data_leads;
            var message = 'MESSAGE TEST'
            handler(data_leads, message);

        })
        if (isEmptyObject(data)) {
            console.log('No config at the moment');
        }
    })



});
async function sender(message) {


    for (const contact of contacts) {
        const final_number = (contact.length > 10) ? `${contact}@c.us` : `91${contact}@c.us`;
        const isRegistered = await client.isRegisteredUser(final_number);
        if (isRegistered) {
            const msg = await client.sendMessage(final_number, media, { caption: message });
            console.log(`${contact} Sent`);
            counter.success++;

        } else {
            console.log(`${contact} Failed`);
            counter.fails++;
        }
    }
    console.log(`Result: ${counter.success} sent, ${counter.fails} failed`);
    counter.success = 0;
    counter.fails = 0;
}

client.on('authenticated', (session) => {
    console.log("Authentication : Succesfully")
});




client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessfull
    console.error('AUTHENTICATION FAILURE', msg);
});


client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
});

async function deploy_all(id) {
    for (const contact of contacts) {
        const final_number = (contact.length > 10) ? `${contact}@c.us` : `91${contact}@c.us`;
        const isRegistered = await client.isRegisteredUser(final_number);
        if (isRegistered) {
            const msg = await client.sendMessage(final_number, media, { caption: 'hehehhehe' });
            console.log(`${contact} Sent`);
            counter.success++;

        } else {
            console.log(`${contact} Failed`);
            counter.fails++;
        }
    }
    console.log(`Result: ${counter.success} sent, ${counter.fails} failed`);
}

async function deleteChat(phoneNumber) {
    return new Promise((resolve, reject) => {
        client.getChatById(phoneNumber).then((chat) => {
            // console.log("Chat information = ", chat)
            chat.delete().then((deleteRes) => {
                if (deleteRes)
                    resolve(`successfuly deleted`)
                else
                    reject("something went wrong")
            })
        }).catch((err) => {
            if (err.message.includes("Cannot read property 'serialize' of undefined"))
                reject(`do not have chat history`)
            // can handle other error messages...     
        })
    })
}


// This should work both there and elsewhere.
function isEmptyObject(obj) {
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return false;
        }
    }
    return true;
}