
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
        user: `${process.env.USER_DB}`,
        host: `${process.env.HOST}`,
        database: `${process.env.DATABASE}`,
        password: `${process.env.PASSWORD}`,
        port: `${process.env.DB_PORT}`,
    })

pgsql_connection.connect();
dotenv.config();


ready();


let current_date = new Date().toISOString();
let counter_instant = { fails: 0, success: 0 };
let counter_schedule = { fails: 0, success: 0 };

var interval = 5000;
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

                        const date = row.start_at;
                        if (row.data_source == 'csv') {

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
                                    if (row.instant_trigger == 'true') {

                                        InstantTrigger(contacts, row.campaign_name, row.config_id, date);
                                    } else {
                                        ScheduleTrigger(contacts, row.campaign_name, row.config_id, date);
                                    }
                                    //console.log(contacts);
                                    pgsql_connection.query(
                                        "update whatsapp_config set  status = 'sending' where config_id=$1",
                                        [row.config_id]);
                                });

                        }
                        else if (row.data_source == 'query') {
                            const data_leads = Buffer.from(`${row.data_leads}`, 'base64');
                            pgsql_connection.query(`${data_leads}`).then(res_query => {
                                const data = res_query.rows;
                                data.forEach(row_query => {
                                    //console.log(row_query.cp_number);
                                    contacts.push(row_query.cp_number);
                                });
                                if (row.instant_trigger == 'true') {

                                    InstantTrigger(contacts, row.campaign_name, row.config_id, date);
                                } else {
                                    ScheduleTrigger(contacts, row.campaign_name, row.config_id, date);
                                }
                                pgsql_connection.query(
                                    "update whatsapp_config set  status = 'sending' where config_id=$1",
                                    [row.config_id]);
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
    //counter.success = 0;
    //counter.fails = 0;
    counter_instant.success = 0;
    counter_instant.fails = 0;
    counter_schedule.success = 0;
    counter_schedule.fails = 0;



});

/* DB QUERIES */



/// WHATSAPP LIBRARY SENDING PART ///



function ready() {
    /*
     for (var i = 0; i < 1; i++) {
         console.log('Sending..');
         deploy_all();
     }*/

    //console.log(client.info.wid.user);
    //console.log(client.info);
    console.log('ready function');
    const login_id = pgsql_connection.query(`select * from whatsapp_login_info wc 
    order by id desc limit 1`);

    //console.log(login_id.rows[0].id);

    pgsql_connection.query(`SELECT * FROM whatsapp_config where triggerstatus='active' and sending ='true' and status !='sending'`).then(res => {
        const data = res.rows;
        //console.log(data);
        console.log('Whatsapp queue count : ', res.rowCount);
        data.forEach(row => {
            var contacts = [];
            var dynamic_contact = row.config_id;

            contacts[dynamic_contact];

            console.log(`config id: ${row.config_id};  status: ${row.triggerstatus};  campaign name : ${row.campaign_name}; date trigger: ${row.start_at}`);

            const date = row.start_at;
            if (row.data_source == 'csv') {
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
                        if (row.instant_trigger == 'true') {

                            InstantTrigger(contacts, row.campaign_name, row.config_id, date);
                        } else {
                            ScheduleTrigger(contacts, row.campaign_name, row.config_id, date);
                        }
                        pgsql_connection.query(
                            "update whatsapp_config set  status = 'sending' where config_id=$1",
                            [row.config_id]);
                        //console.log(contacts);

                    });

            } else if (row.data_source == 'query') {
                const data_leads = Buffer.from(`${row.data_leads}`, 'base64');
                pgsql_connection.query(`${data_leads}`).then(res_query => {
                    const data = res_query.rows;
                    data.forEach(row_query => {
                        //console.log(row_query.cp_number);
                        contacts.push(row_query.cp_number);
                    });

                    if (row.instant_trigger == 'true') {

                        InstantTrigger(contacts, row.campaign_name, row.config_id, date);
                    } else {
                        ScheduleTrigger(contacts, row.campaign_name, row.config_id, date);
                    }
                    pgsql_connection.query(
                        "update whatsapp_config set  status = 'sending' where config_id=$1",
                        [row.config_id]);
                });

            }
        })

        if (isEmptyObject(data)) {
            console.log('No config at the moment');
        }
    })

}


//schedule trigger
async function ScheduleTrigger(message, contacts, campaign_name, config_id, campaign_img, date) {

    let total_schedule = 0;
    const job = schedule.scheduleJob(date, async function () {
        contacts.forEach(function (el, index) {
            total_schedule++
            setTimeout(async function () {
                const final_number = (el.length > 10) ? `${el}@c.us` : `91${el}@c.us`;
                const isRegistered = await client.isRegisteredUser(final_number);
                if (isRegistered) {
                    if (campaign_img == null) {
                        pgsql_connection.query(`select * FROM whatsapp_history where cp_number ='${el}' and config_id = '${config_id}'`).then(async res => {
                            if (res.rowCount > 0) {
                                //console.log('duplicate');
                                //counter.fails++;  
                                counter_schedule.fails++;
                            } else {

                                console.log(`Campaign: ${campaign_name}, Status : ${el} Sent`);
                                //counter.success++;
                                counter_schedule.success++;
                                pgsql_connection.query(`
                        insert into whatsapp_history (config_id,campaign_name,cp_number,status,created_at,updated_at)
                        values ('${config_id}','${campaign_name}','${el}','sent','${current_date}','${current_date}')
                        `);
                                //console.log('sent');
                                const msg = await client.sendMessage(final_number, message);
                            }

                        })

                    } else {
                        pgsql_connection.query(`select * FROM whatsapp_history where cp_number ='${el}' and config_id = '${config_id}'`).then(async res => {
                            if (res.rowCount > 0) {

                                //console.log('duplicate');
                                //counter.fails++;
                                counter_schedule.fails++;
                            } else {

                                console.log(`Campaign: ${campaign_name}, Status : ${el} Sent`);
                                //counter.success++;
                                counter_schedule.success++;
                                pgsql_connection.query(`
                        insert into whatsapp_history (config_id,campaign_name,cp_number,status,created_at,updated_at)
                        values ('${config_id}','${campaign_name}','${el}','sent','${current_date}','${current_date}')
                        `);
                                //console.log('sent');
                                const msg = await client.sendMessage(final_number, campaign_img, { caption: message });
                            }

                        })
                    }

                } else {
                    pgsql_connection.query(`select * FROM whatsapp_history where cp_number ='${el}' and config_id = '${config_id}'`).then(res => {
                        if (res.rowCount > 0) {

                            //console.log('duplicate');
                            //counter.fails++;
                            counter_schedule.fails++;
                        } else {

                            console.log(`Campaign: ${campaign_name}, Status : ${el} Failed`);
                            //counter.fails++;
                            counter_schedule.fails++;
                            pgsql_connection.query(`
                insert into whatsapp_history (config_id,campaign_name,cp_number,status,created_at,updated_at)
                values ('${config_id}','${campaign_name}','${el}','failed','${current_date}}','${current_date}')
                `);
                        }

                    })

                }
            }, index * interval);
        });
        //console.log(total);
        setTimeout(async function () {

            console.log(`Campaign: ${campaign_name}, Result: ${counter_schedule.success} sent, ${counter_schedule.fails} failed`);
            counter_schedule.success = 0;
            counter_schedule.fails = 0;
            contacts.length = 0;
            pgsql_connection.query(
                "update whatsapp_config set triggerstatus= 'inactive' , status = 'sent' where config_id=$1",
                [config_id]);

        }, total_schedule * interval);

    });


}


async function InstantTrigger(contacts, campaign_name, config_id, date) {
    let total_instant = 0;
    contacts.forEach(function (el, index) {
        total_instant++
        setTimeout(async function () {
            var axios = require('axios');
            var data = JSON.stringify({
                "messaging_product": "whatsapp",
                "to": el,
                "type": "template",
                "template": {
                    "name": "hello_world",
                    "language": {
                        "code": "en_US"
                    }
                }
            });
            var config = {
                method: 'post',
                url: 'https://graph.facebook.com/v15.0/117370637920488/messages',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer EAAMTPxZAKZB28BAIR0nwqWTIemkVwuGwKtPZBNpeoAnzWlDJe3CIwaMb2EZBM8YFtFsTZA9ll3NKaYxIQcTJadtFsZAiNd3y1weY95kRFg9MomXp9eVOKgwAxZCoOODlr3VQGVTCvqei042dwW8pgnKR5R5fyDIlurTaZCXbldcZC07ZBPs5ghZACRDcocgnh1cgSee8DVZBWGNIc09RGs7oUhvdFKMifKz2yqIZD'
                },
                data: data
            };

            axios(config)
                .then(function (response) {
                    pgsql_connection.query(`
                    insert into whatsapp_history (config_id,campaign_name,cp_number,status,created_at,updated_at)
                    values ('${config_id}','${campaign_name}','${el}','sent','${current_date}','${current_date}')`);
                    console.log(`Campaign: ${campaign_name}, Status : ${el} Sent`);
                    counter_instant.success++;
                })
                .catch(function (error) {
                    pgsql_connection.query(`
                    insert into whatsapp_history (config_id,campaign_name,cp_number,status,created_at,updated_at)
                    values ('${config_id}','${campaign_name}','${el}','failed','${current_date}}','${current_date}')`);
                    console.log(`Campaign: ${campaign_name}, Status : ${el} Failed`);
                    counter_instant.fails++;
                });
        }, index * interval);
    });

    setTimeout(async function () {

        console.log(`Campaign: ${campaign_name}, Result: ${counter_instant.success} sent, ${counter_instant.fails} failed`);
        counter_instant.success = 0;
        counter_instant.fails = 0;
        contacts.length = 0;
        pgsql_connection.query(
            "update whatsapp_config set triggerstatus= 'inactive' , status = 'sent' where config_id=$1",
            [config_id]);

    }, total_instant * interval + 2000);


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


    let date_now = new Date().toISOString();
    //var campaign_msg = Buffer.from(req.body.campaign_msg).toString('base64');
    //const campaign_img = isEmptyObject(req.files.campaign_img) ? 'undefined' : req.files.campaign_img[0].filename;
    const sending = req.body.sending == 'on' ? true : false;
    const data_leads = req.body.data_source == 'csv' ? req.files.data_leads[0].filename : Buffer.from(req.body.data_leads).toString('base64');
    const start_at = req.body.start_at == '' ? '1998-10-08 00:00:00.000' : req.body.start_at;
    const instant_trigger = req.body.instant_trigger == 'on' ? true : false;
    const allquery = await pgsql_connection.query(`INSERT INTO whatsapp_config(status,triggerstatus,cron_expression,created_at,updated_at,start_at,sending,data_source,campaign_name,data_leads,campaign_msg,campaign_img,instant_trigger) VALUES ('pending','active','','${date_now}','${date_now}','${start_at}',${sending},'${req.body.data_source}','${req.body.campaign_name}','${data_leads}','','','${instant_trigger}')`);

    res.status(200).json({ 'statusCode': 200, 'status': true, message: 'Config Added', 'data': [] });

}
deleteConfig = async (req, res) => {

    const allquery = await pgsql_connection.query(`delete from whatsapp_config where config_id = '${req.params.config_id}'`);

    res.status(200).json({ 'statusCode': 200, 'status': true, message: 'Config Deleted', 'data': [] });

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

    app.post('/delete-config/:config_id', deleteConfig);

};