var express = require('express');
var app = express();
const port= 2000;

app.get('/', function(req, res,next) {
    res.status(200).json({stato: 'ok'});
});

app.get('*', function(req, res,next) {
    res.status(404).json({stato: 'NOK'})
  });

app.listen(port, ()=>{
    console.log('RUNNING')
});