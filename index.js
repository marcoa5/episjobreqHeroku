var express = require('express');
var app = express();

app.get('/', function(req, res,next) {
    res.status(200).json({stato: 'ok'});
    res.end();
});

app.get('*', function(req, res,next) {
    res.status(404).json({stato: 'Nok'});
    res.end();
});

app.listen(process.env.PORT || 2000, ()=>{
    console.log('RUNNING')
});