var express = require('express');
var app = express();
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');

var admin = require("firebase-admin");
var serviceAccount = require('./key.json')
const porta = process.env.PORT || 3000
const fs = require('fs')
const Handlebars = require('handlebars');
const htp = require('html-pdf-node')


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://epi-serv-job-default-rtdb.firebaseio.com"
});

app.set('view engine', 'pug');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'episerjob@gmail.com',
      pass: 'Epiroc2020' 
    }
  });


function createMailOptions(a){
    const mailBody=`
    <table width=600 style="margin: 0 auto;">
    <tr height=80 style="background-color: rgb(255,205,0);">
        <h1 style="background-color: rgb(255,205,0);text-align:center;font-family: Arial; color:rgb(66,85,99);">Epiroc Italia srl</h1>
    </tr>
    <tr>
        <img style="width:100%;" src="https://firebasestorage.googleapis.com/v0/b/epi-serv-job.appspot.com/o/car.jpeg?alt=media&token=341d08d3-d0ed-4d91-866f-d5999b6d1595">
    </tr>
    <tr>
        <p style="font-family: Arial; color:rgb(66,85,99)"><br><br>Gentile Cliente,<br>In allegato scheda lavoro relativa all'intervento effettuato dal nostro tecnico Sig. ${a.userN} ${a.userC}.</p>
        <p style="font-family: Arial; color:rgb(66,85,99)">Vi ringraziamo qualora abbiate aderito al nostro sondaggio</p>
        <hr>
        <p style="font-family: Arial; font-size:80%; color:rgb(66,85,99)"><strong>Risultato Sondaggio:</strong></p>
        <p style="font-family: Arial; font-size:80%; color:rgb(66,85,99)">Organizzazione intervento: ${a.son1}</p>
        <p style="font-family: Arial; font-size:80%; color:rgb(66,85,99)">Consegna Ricambi: ${a.son2}</p>
        <p style="font-family: Arial; font-size:80%; color:rgb(66,85,99)">Esecuzione Intervento: ${a.son3}</p>
    </tr>
    </table>
    `
    const mailOptions = {
        from: 'Epiroc Service <episerjob@gmail.com>',
        replyTo: 'marco.fumagalli@epiroc.com',
        to: a.to1,
        cc: a.userM,
        subject: a.subject,
        text: `In allegato scheda lavoro relativa all'intervento effettuato dal nostro tecnico Sig. ${a.userN} ${a.userC}.\nVi ringraziamo qualora abbiate aderito al nostro sondaggio.\n\n\nRisultato sondaggio:\n\nOrganizzazione intervento: ${a.son1}\nConsegna Ricambi: ${a.son2}\nEsecuzione Intervento: ${a.son3}`,
        //html:mailBody,
        attachments: {
            filename: a.fileN? a.fileN + '.pdf': '',
            path: a.urlPdf? a.urlPdf : ''
        }
      };
      return mailOptions
}

function createMailOptionsInt(a){
    const mailOptions = {
        from: `${a.userN} ${a.userC} - Epiroc Service <episerjob@gmail.com>`,
        to: "marco.arato@epiroc.com", //"marco.fumagalli@epiroc.com"
        cc: "", //"mario.parravicini@epiroc.com; carlo.colombo@epiroc.com; marco.arato@epiroc.com",
        subject: a.subject,
        text: `Risultato sondaggio:\n\nOrganizzazione intervento: ${a.son1}\nConsegna Ricambi: ${a.son2}\nEsecuzione Intervento: ${a.son3} ${a.rap}\n\n\nRisk Assessment \n ${a.rAss}`,
        attachments: [
            {
                filename: a.fileN + '.pdf',
                path: a.urlPdf
            },
            {
                filename: a.fileN + '.ma',
                path: a.urlMa
            }
        ]
      };
      return mailOptions
}

function createMailOptionsIntProd(a){
    const mailOptions = {
        from: `${a.userN} ${a.userC} - Epiroc Service <episerjob@gmail.com>`,
        to: "marco.fumagalli@epiroc.com",
        cc: "mario.parravicini@epiroc.com; carlo.colombo@epiroc.com; marco.arato@epiroc.com",
        subject: a.subject,
        text: `Risultato sondaggio:\n\nOrganizzazione intervento: ${a.son1}\nConsegna Ricambi: ${a.son2}\nEsecuzione Intervento: ${a.son3} ${a.rap}\n\n\nRisk Assessment \n ${a.rAss}`,
        attachments: [
            {
                filename: a.fileN + '.pdf',
                path: a.urlPdf
            },
            {
                filename: a.fileN + '.ma',
                path: a.urlMa
            }
        ]
      };
      return mailOptions
}

app.use(bodyParser.urlencoded({limit: '1MB',extended: false}))
app.use(bodyParser.json());


app.post('/rendersj', (req,res)=>{
    var t = fs.readFileSync('template.html','utf-8')
    var i = req.body
    var o = Handlebars.compile(t)
    const option = {format:'A4'}
    const file = {content: o(i)}
    htp.generatePdf(file,option)
    .catch(err=>{console.log(err)})
    .then(buf=>{
        fs.writeFileSync(__dirname + '/temp/temp.pdf',buf)
        res.status(200).sendFile(__dirname + '/temp.pdf')
    })
    //res.status(200).sendFile()//send(o(i))
})

app.get('/test', function(req,res){
    var userN = "Marco"
    var userC = "Arato"
    const mailOptionsT = {
        from: `${userN} ${userC} - Epiroc Service <episerjob@gmail.com>`,
        to: "marco.arato@epiroc.com",
        //cc: "mario.parravicini@epiroc.com; carlo.colombo@epiroc.com; marco.arato@epiroc.com",
        subject: 'Test',
        text: "Risultato sondaggio:\n\nOrganizzazione intervento: \nConsegna Ricambi: \nEsecuzione Intervento: \n\n\nRisk Assessment \n",
      };
      transporter.sendMail(mailOptionsT, (error,info)=>{
        if (error) res.send("ERRORE: " + error)  
        res.status(200).send(info)
      })
})

app.get('/getusers', function(req,res){
    admin.auth().listUsers(1000).then((a)=>{
        res.send(a.users)
    })
})

app.get('/getuserinfo', function(req,res){
    var id = req.query.id
    admin.database().ref('Users/'+ id).once('value', a=>{
        res.status(200).send(a.val())
    })
})

app.get('/createuser', function(req,res){
    var Mail = req.query.Mail
    var Nome = req.query.Nome
    var Cognome = req.query.Cognome
    var Pos=req.query.Pos
    var km = req.query.km
	
    admin.auth().createUser({
        email: Mail,
        emailVerified: false,
        password: 'Epiroc2021',
        disabled: false,
    })
    .then((userRecord) => {
        admin.database().ref('Users/' + userRecord.uid).set({
            Nome: Nome,
            Cognome: Cognome,
            Pos: Pos,
            km: km
        })
        .then(()=>{
           res.send('ok') 
        })
        .catch((error) => {
            console.log('Error creating new user:', error);
        })
    })
    .catch((error) => {
        console.log('Error creating new user:', error);
    });
})

app.get('/delete',function(req,res){
    var id = req.query.id
    admin.auth().deleteUser(id)
    .then(()=>{
        admin.database().ref('Users/' + id).remove()
        .then(()=>{
            res.status(200).send('ok') 
         })
    })
    .catch(err=>{
        console.log(err)
    })
})

app.get('/mail', function(req, res,next) {
    var arg = req.query
    if(arg.to1!=undefined){
        transporter.sendMail(createMailOptions(arg), (error, info)=>{
            if (error) {
            console.log(error);
            } else {
                transporter.sendMail(createMailOptionsIntProd(arg), (error, info)=>{
                    if (error) {
                    console.log(error);
                    } else {
                        res.status(200).send(arg.to1);
                    }
                })
            }
        });
    } else {
        res.send('Mail not sent')
    }
});

app.get('/maildebug', function(req, res,next) {
    var arg = req.query
    if(arg.to1!=undefined){
        transporter.sendMail(createMailOptions(arg), (error, info)=>{
            if (error) {
            console.log(error);
            } else {
                transporter.sendMail(createMailOptionsInt(arg), (error, info)=>{
                    if (error) {
                    console.log(error);
                    } else {
                        res.status(200).send(arg.to1);
                    }
                })
            }
        });
    } else {
        res.send('Mail not sent')
    }
});


app.get('*', function(req, res,next) {
    const welc = `
    <div style="display: flex; align-items:center; justify-content: center; height: 100%; width:100%">
        <h1 style="width:100%; font-family:Arial; text-align: center">Welcome to Marco's EpiSerJob Web Services</h1>
    </div>
    `
    res.status(404).send(welc);
    res.end();
});

app.listen(porta, ()=>{
    console.log(`Running on port:${porta}`)
});