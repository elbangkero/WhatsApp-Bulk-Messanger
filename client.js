
const { Client, LocalAuth, MessageMedia, Location } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const csv = require('csv-parser');
const dotenv = require('dotenv');
const message_file = fs.readFileSync("./message.txt", { encoding: 'utf-8' });
var multer = require('multer');
const path = require('path');
const { Client: Pgsql } = require('pg');
const { htmlToText } = require('html-to-text');
const schedule = require('node-schedule');
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
        clientId: "client-one",
        dataPath: "./Session"
    })
})

client.initialize();


let counter = { fails: 0, success: 0 }

/* DB QUERIES */



//Listener from Postgre
pgsql_connection.query('LISTEN "whatsapp_listener"');
pgsql_connection.on("notification", function (data) {
    //console.log("data", JSON.parse(data.payload));
    console.log('notif from database!');
    console.log('resending...');

    resend_query(parseInt(data.payload));

    function resend_query(dataload) {
        setTimeout(() => {
            pgsql_connection.query(`SELECT * FROM whatsapp_config where triggerstatus='active' and sending ='true' and status !='sending'`).then(res => {
                const data = res.rows;
                console.log('Whatsapp queue count : ', res.rowCount);

                console.log('payload : ', dataload);
                const callback = dataload == res.rowCount;
                if (callback) {

                    data.forEach(row => {



                        var contacts = [];
                        var dynamic_contact = row.config_id;

                        contacts[dynamic_contact];

                        console.log(`config id: ${row.config_id};  status: ${row.triggerstatus};  campaign name : ${row.campaign_name}; date trigger: ${row.start_at}`);

                        const base64_msg = Buffer.from(`${row.campaign_msg}`, 'base64');


                        const converted_html = htmlToText(base64_msg, {
                            formatters: {
                                // Create a formatter.
                                'fooBlockFormatter': function (elem, walk, builder, formatOptions) {
                                    builder.openBlock({ leadingLineBreaks: formatOptions.leadingLineBreaks || 1 });
                                    walk(elem.children, builder);
                                    builder.addInline('!');
                                    builder.closeBlock({ trailingLineBreaks: formatOptions.trailingLineBreaks || 1 });
                                }
                            },
                            selectors: [
                                // Assign it to `foo` tags.
                                {
                                    selector: 'foo',
                                    format: 'fooBlockFormatter',
                                    options: { leadingLineBreaks: 1, trailingLineBreaks: 1 }
                                }
                            ]
                        });
                        var message = converted_html;

                        const campaign_img = row.campaign_img == 'undefined' ? null : MessageMedia.fromFilePath('./uploads/campaign_images/' + row.campaign_img);
                        const date = row.start_at;
                        if (row.data_source == 'csv') {
                            const job = schedule.scheduleJob(date, function () {
                                fs.createReadStream('./uploads/data_leads/' + row.data_leads)
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
                                        sender(message, contacts, row.campaign_name, row.config_id, campaign_img);
                                        //console.log(contacts);
                                        pgsql_connection.query(
                                            "update whatsapp_config set  status = 'sending' where config_id=$1",
                                            [row.config_id]);
                                    });
                            });
                        }
                        else if (row.data_source == 'query') {
                            const job = schedule.scheduleJob(date, function () {
                                const data_leads = Buffer.from(`${row.data_leads}`, 'base64');
                                pgsql_connection.query(`${data_leads}`).then(res_query => {
                                    const data = res_query.rows;
                                    data.forEach(row_query => {
                                        //console.log(row_query.cp_number);
                                        contacts.push(row_query.cp_number);
                                    });

                                    sender(message, contacts, row.campaign_name, row.config_id, campaign_img);
                                    pgsql_connection.query(
                                        "update whatsapp_config set  status = 'sending' where config_id=$1",
                                        [row.config_id]);
                                });
                            });
                        }
                    })
                }
                if (isEmptyObject(data)) {
                    console.log('No config at the moment');
                }


            })
        }, "10000")
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
    pgsql_connection.query(`SELECT * FROM whatsapp_config where triggerstatus='active' and sending ='true' and status !='sending'`).then(res => {
        const data = res.rows;
        //console.log(data);
        console.log('Whatsapp queue count : ', res.rowCount);
        data.forEach(row => {
            var contacts = [];
            var dynamic_contact = row.config_id;

            contacts[dynamic_contact];

            console.log(`config id: ${row.config_id};  status: ${row.triggerstatus};  campaign name : ${row.campaign_name}; date trigger: ${row.start_at}`);
            const base64_msg = Buffer.from(`${row.campaign_msg}`, 'base64');
            const converted_html = htmlToText(base64_msg, {
                formatters: {
                    // Create a formatter.
                    'fooBlockFormatter': function (elem, walk, builder, formatOptions) {
                        builder.openBlock({ leadingLineBreaks: formatOptions.leadingLineBreaks || 1 });
                        walk(elem.children, builder);
                        builder.addInline('!');
                        builder.closeBlock({ trailingLineBreaks: formatOptions.trailingLineBreaks || 1 });
                    }
                },
                selectors: [
                    // Assign it to `foo` tags.
                    {
                        selector: 'foo',
                        format: 'fooBlockFormatter',
                        options: { leadingLineBreaks: 1, trailingLineBreaks: 1 }
                    }
                ]
            });

            var message = converted_html;

            const campaign_img = row.campaign_img == 'undefined' ? null : MessageMedia.fromFilePath('./uploads/campaign_images/' + row.campaign_img);
            const date = row.start_at;
            if (row.data_source == 'csv') {
                const job = schedule.scheduleJob(date, function () {
                    fs.createReadStream('./uploads/data_leads/' + row.data_leads)
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
                            sender(message, contacts, row.campaign_name, row.config_id, campaign_img);
                            pgsql_connection.query(
                                "update whatsapp_config set  status = 'sending' where config_id=$1",
                                [row.config_id]);
                            //console.log(contacts);

                        });
                });
            } else if (row.data_source == 'query') {
                const job = schedule.scheduleJob(date, function () {
                    const data_leads = Buffer.from(`${row.data_leads}`, 'base64');
                    pgsql_connection.query(`${data_leads}`).then(res_query => {
                        const data = res_query.rows;
                        data.forEach(row_query => {
                            //console.log(row_query.cp_number);
                            contacts.push(row_query.cp_number);
                        });

                        sender(message, contacts, row.campaign_name, row.config_id, campaign_img);
                        pgsql_connection.query(
                            "update whatsapp_config set  status = 'sending' where config_id=$1",
                            [row.config_id]);
                    });
                });
            }



        })

        if (isEmptyObject(data)) {
            console.log('No config at the moment');
        }
    })



});


async function sender(message, contacts, campaign_name, config_id, campaign_img) {


    for (const contact of contacts) {
        const final_number = (contact.length > 10) ? `${contact}@c.us` : `91${contact}@c.us`;
        const isRegistered = await client.isRegisteredUser(final_number);
        if (isRegistered) {
            if (campaign_img == null) {

                const msg = await client.sendMessage(final_number, message);
            } else {

                const msg = await client.sendMessage(final_number, campaign_img, { caption: message });
            }
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
        "update whatsapp_config set triggerstatus= 'inactive' , status = 'sent' where config_id=$1",
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

const multerStorage = multer.diskStorage({

    destination: (req, file, cb) => {
        if (file.fieldname === "data_leads") {
            cb(null, './uploads/data_leads');
        }
        else if (file.fieldname === "campaign_img") {
            cb(null, './uploads/campaign_images');
        }
    },

    filename: (req, file, cb) => {
        if (file.fieldname === "data_leads") {
            cb(null, `${Date.now()}_${file.originalname}`)
        }
        else if (file.fieldname === "campaign_img") {
            cb(null, `${Date.now()}_${file.originalname}`)
        }
    }
});
const multerFilter = (req, file, cb) => {
    if (file.fieldname === "data_leads") {
        if (!file.originalname.match(/\.(csv)$/)) {
            // upload only png and jpg format
            return cb(new Error('Please upload a CSV file only'))
        }
        cb(null, true)
    }
    else if (file.fieldname === "campaign_img") {
        if (!file.originalname.match(/\.(png|jpg)$/)) {
            // upload only png and jpg format
            return cb(new Error('Please upload a PNG or JPG only'))
        }
        cb(null, true)
    }


};
upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

insertConfig = async (req, res) => {

    let date_now = new Date(Date.now());
    date_now = date_now.toLocaleDateString() + " " + date_now.toLocaleTimeString();
    var campaign_msg = Buffer.from(req.body.campaign_msg).toString('base64');
    const campaign_img = isEmptyObject(req.files.campaign_img) ? 'undefined' : req.files.campaign_img[0].filename;
    const sending = req.body.sending == 'on' ? true : false;
    const data_leads = req.body.data_source == 'csv' ? req.files.data_leads[0].filename : Buffer.from(req.body.data_leads).toString('base64');
    const allquery = await pgsql_connection.query(`INSERT INTO whatsapp_config(status,triggerstatus,cron_expression,created_at,updated_at,start_at,sending,data_source,campaign_name,data_leads,campaign_msg,campaign_img) VALUES ('pending','active','','${date_now}','${date_now}','${req.body.start_at}',${sending},'${req.body.data_source}','${req.body.campaign_name}','${data_leads}','${campaign_msg}','${campaign_img}')`);

    res.status(200).json({ 'statusCode': 200, 'status': true, message: 'Config Added', 'data': [] });

}


module.exports = function (app) {

    //route to upload single image
    app.post('/upload/upload-config', upload.fields([
        {
            name: "data_leads",
            maxCount: 1,
        },
        {
            name: "campaign_img",
            maxCount: 1,
        }
    ]), insertConfig);

};