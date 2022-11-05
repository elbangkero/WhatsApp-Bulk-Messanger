const dotenv = require('dotenv');
dotenv.config();
 


const { Client } = require('pg');
const client = new Client
  ({
    user: `${process.env.USER}`,
    host: `${process.env.HOST}`,
    database: `${process.env.DATABASE}`,
    password: `${process.env.PASSWORD}`,
    port: `${process.env.DB_PORT}`,
  })

client.connect();




const getUsers = (request, response) => {
  client.query(`SELECT * FROM whatsapp_config ORDER BY config_id ASC`, (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
}

const getWhatsappConfig = (request, response) => {
  client.query(`SELECT * FROM whatsapp_config where triggerstatus='active' and sending ='true'`).then(res => {
    const data = res.rows;
    //console.log(data);
    console.log('Whatsapp queue count : ', res.rowCount);
    data.forEach(row => {
      console.log(`config_id: ${row.config_id} trigger status: ${row.triggerstatus}`);
    })
    if (isEmptyObject(data)) {
      console.log('No config at the moment');
    }
  })
}


function UpdateWhatsappConfig() {
  console.log('test update');

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

//Listener from Postgre
client.query('LISTEN "whatsapp_listener"');
client.on("notification", (data) => {
  //console.log("data", JSON.parse(data.payload));
  console.log('notif from database!');

  //client_whatsapp.onChangeFromDatabase('test onchange');
  const onchangefromdb = client_whatsapp.onChangeFromDatabase();
  console.log(onchangefromdb);

  getWhatsappConfig();

});


module.exports = {
  getUsers,
  getWhatsappConfig,
  UpdateWhatsappConfig
}