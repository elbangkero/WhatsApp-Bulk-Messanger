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
    data.forEach(row => {
      console.log(`config_id: ${row.config_id} trigger status: ${row.triggerstatus}`);
    })
  })
}

//Listener from Postgre
client.query('LISTEN "whatsapp_listener"');
client.on("notification", (data) => {
  //console.log("data", JSON.parse(data.payload));
  console.log('event triggered!');
  getWhatsappConfig();
 
});
 

module.exports = {
  getUsers,
  getWhatsappConfig
}