const express = require('express');
const bodyParser = require('body-parser')
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');

const tjs = require('teslajs');
const axios = require('axios');
const e = require('express');

var token = "qts-c88f1ad1cdb9e962ab82278f46d03c3eb53494a8a2cace2da294c486c749b9b6";
let vehicle;
// set the view engine to ejs
//app.set('view engine', 'ejs');
app.use('/static', express.static('static'));

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

//timestamp,elevation,est_heading,est_lat,est_lng,est_range,heading,odometer,power,range,shift_state,speed,soc
//'1622420982043,45,309,41.375745,-72.215410,259,309,3042.6,0,276,,,88'
function streamTele(socket,vehicle){
    console.log("startStreaming...");
    //console.log(vehicle);
    tjs.startStreaming({
        vehicle_id: vehicle.vehicle_id,
        authToken: token
    }, function (error, response, body) {

        if (!error) {
            console.log(body);
            if( body.msg_type === 'data:update'){
                let splitted = body.value.split(",");
                
                socket.emit('stream', {
                    odometer: splitted[7],
                    power: splitted[8],
                    range: splitted[9],
                    shift_state: splitted[10],
                    speed: splitted[11]
                    
                });
            }
            
        }else if (error === "Websocket disconnected"){
            console.log("WB DISCONNECTED !!!");
            setTimeout(()=>{
                streamTele(socket,vehicle);
            },0);
        }
        console.log("...Streaming ended.");
    });
}


//Whenever someone connects this gets executed
io.on('connection', async function(socket) {
    console.log('A user connected');

    if (fs.existsSync('.token')) {
        let tokenJson = fs.readFileSync(".token");
        tokenJson = JSON.parse(tokenJson);
        console.log(tokenJson);
        token = tokenJson.authToken;
        vehicle = await tjs.vehicleAsync({authToken: token, vehicleID: tokenJson.vehicle_id});
        console.log("Vehicle is fetched");
        socket.emit('vehicle', vehicle);
        console.log("Columns: timestamp," + tjs.streamingColumns.toString());
        streamTele(socket,vehicle);
    }

    //Whenever someone disconnects this piece of code executed
    socket.on('disconnect', function () {
       console.log('A user disconnected');
    });
 });

// index page

app.get('/login', function(req, res) {
    res.sendFile('./login.html',{ root: __dirname });
 });

app.get('/dash', function(req, res) {
    res.sendFile('./dash.html',{ root: __dirname });
 });

app.get('/', async function(req, res) {
    if (fs.existsSync('.token')) {
        res.sendFile('./dash.html',{ root: __dirname });
    }else{
        res.sendFile('./login.html',{ root: __dirname });
    }
    
 });



 app.post('/vehicle/:id', async (req, res)=>{
    console.log("vehicle id", req.params.id);
    if (fs.existsSync('.token')) {
        let tokenJson = fs.readFileSync(".token");
        tokenJson = JSON.parse(tokenJson);
        tokenJson.vehicle_id = req.params.id;
        fs.writeFileSync(".token",JSON.stringify(tokenJson));
        res.json({success:true});
     }else{
        res.json({success:false});
     }


 })
 app.post('/login', async (req, res)=>{
     console.log("submit login ", req.body);

     if (fs.existsSync('.token')) {
        let tokenJson = fs.readFileSync(".token");
        tokenJson = JSON.parse(tokenJson);
        console.log(tokenJson);
        let vehicles =  await tjs.vehiclesAsync({authToken: tokenJson.authToken});
        res.json({success:true, vehicles:vehicles});
     }else{

        let result = await  tjs.loginAsync({username: req.body.username,password: req.body.password});
         if(result.error){
            res.json({success:false});
            
        }else{
        
            var token = {authToken: result.authToken ,refreshToken: result.refreshToken};
            let vehicles =  await tjs.vehiclesAsync({authToken: result.authToken});
            fs.writeFileSync(".token",JSON.stringify(token));
            res.json({success:true, vehicles:vehicles})
        }
     }
    
    

     
 });

 http.listen(8080, async function() {

    console.log('Server is listening on port 8080');
 });

