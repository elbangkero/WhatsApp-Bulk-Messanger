
const { Client, LocalAuth, MessageMedia, Location } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const csv = require('csv-parser');
const dotenv = require('dotenv');
const message = fs.readFileSync("./message.txt", { encoding: 'utf-8' });
const media = MessageMedia.fromFilePath('./images/download.png');

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

var testing = [];


//Listener from Postgre
pgsql_connection.query('LISTEN "whatsapp_listener"');
pgsql_connection.on("notification", function (data) {
    //console.log("data", JSON.parse(data.payload));
    console.log('notif from database!');
    console.log('resending...');
    testing.push(data.length);
    console.log(testing);
    console.log('index dynamic : ', testing.length);

    resend_query(parseInt(data.payload));
    function resend_query(dataload) {
        pgsql_connection.query(`SELECT * FROM whatsapp_config where triggerstatus='active' and sending ='true'`).then(res => {
            const data = res.rows;
            console.log('Whatsapp queue count : ', res.rowCount);

            console.log('payload : ', dataload);
            const callback = dataload == res.rowCount;
            if (callback) {

                data.forEach(row => {

                    var contacts = [];
                    var dynamic_contact = row.config_id;

                    contacts[dynamic_contact];

                    console.log(`config id: ${row.config_id};  status: ${row.triggerstatus};  data_leads: ${row.data_leads}`);
                    var message = 'MESSAGE TEST'
                    fs.createReadStream(row.data_leads)
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
                            sender(message, contacts, row.campaign_name, row.config_id);
                            console.log(contacts);

                        });


                })
            }
            if (isEmptyObject(data)) {
                console.log('No config at the moment');
            }


        })
    }


    //ready();
    counter.success = 0;
    counter.fails = 0;








});

/* DB QUERIES */



/// WHATSAPP LIBRARY SENDING PART ///






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


            var contacts = [];
            var dynamic_contact = row.config_id;

            contacts[dynamic_contact];

            console.log(`config id: ${row.config_id};  status: ${row.triggerstatus};  data_leads: ${row.data_leads}`);
            var message = 'MESSAGE TEST'


            fs.createReadStream(row.data_leads)
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
                    sender(message, contacts, row.campaign_name, row.config_id);
                    console.log(contacts);

                });


        })

        if (isEmptyObject(data)) {
            console.log('No config at the moment');
        }
    })



});


async function sender(message, contacts, campaign_name, config_id) {


    for (const contact of contacts) {
        const final_number = (contact.length > 10) ? `${contact}@c.us` : `91${contact}@c.us`;
        const isRegistered = await client.isRegisteredUser(final_number);
        if (isRegistered) {
            const msg = await client.sendMessage(final_number, media, { caption: message });
            console.log(`Campaign: ${campaign_name}, Status : ${contact} Sent`);
            counter.success++;
            pgsql_connection.query(`
            insert into whatsapp_history (config_id,campaign_name,cp_number,status,created_at,updated_at)
            values ('${config_id}','${campaign_name}','${contact}','sent','2022-11-03 00:00:00.000','2022-11-03 00:00:00.000')
            `);

        } else {
            console.log(`Campaign: ${campaign_name}, Status : ${contact} Failed`);
            counter.fails++;
            pgsql_connection.query(`
            insert into whatsapp_history (config_id,campaign_name,cp_number,status,created_at,updated_at)
            values ('${config_id}','${campaign_name}','${contact}','failed','2022-11-03 00:00:00.000','2022-11-03 00:00:00.000')
            `);
        }

    }
    console.log(`Campaign: ${campaign_name}, Result: ${counter.success} sent, ${counter.fails} failed`);
    counter.success = 0;
    counter.fails = 0;
    contacts.length = 0;
    pgsql_connection.query(
        "update whatsapp_config set triggerstatus  = 'inactive' where config_id=$1",
        [config_id]);
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