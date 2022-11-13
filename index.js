// app.js
const express = require("express")
const path = require('path')
const app = express(); 
const dotenv = require('dotenv');
dotenv.config();   
//load the routes
require('./client')(app);
//const db = require('./api/queries')





app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')))
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')))
app.use('/js', express.static(path.join(__dirname, 'node_modules/jquery/dist')))
 


app.listen(`${process.env.PORT}`, () => {
  console.log('Listening on port ' + `${process.env.PORT}`);
});

app.get('/', (request, response) => {
  response.json({ info: 'Node.js, Express, and Postgres API' })
})  
 

//app.get('/users', db.getActiveConfig);