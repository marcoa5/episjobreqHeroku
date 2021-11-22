var express = require('express');
var app = express();
var cors = require('cors')
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
var admin = require("firebase-admin");
var serviceAccount = require('./key.json')
const porta = process.env.PORT || 3001
const axios = require('axios')
var moment = require('moment')


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://epi-serv-job-default-rtdb.firebaseio.com"
});

app.set('view engine', 'pug');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'episerjob@gmail.com',
      pass: 'xvesvmaufsunnzvr' 
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

app.use(bodyParser.urlencoded({limit: '100kb',extended: false}))
app.use(bodyParser.json())
app.use(cors())

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
           res.status(200).send('created') 
        })
        .catch((error) => {
            res.status(300).send('Errore: ' + error)
        })
    })
    .catch((error) => {
        res.status(300).send('Errore: ' + error)

    });
})

app.get('/updateuser', function(req,res){
    var Nome = req.query.Nome
    var Cognome = req.query.Cognome
    var Pos=req.query.Pos
    var id = req.query.id
    console.log(Nome,Cognome,id, Pos)
    admin.database().ref('Users').child(id).set({
        Cognome: Cognome,
        Nome: Nome,
        Pos: Pos
    })
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

app.all('/mail', function(req, res,next) {
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

app.all('/mailmod', async function(req, res,next) {
    var arg = req.query
    let refPdf = admin.storage().ref().child(`${arg.userN} ${arg.userC}/${arg.fileN}.pdf`)
    await refPdf.put(arg.urlPdf)
    .then(()=>{
        refPdf.getDownloadURL().then(url=>{
            if(url) req.urlPdf = url
            let refMa = admin.storage().ref().child(`${arg.userN} ${arg.userC}/${arg.fileN}.ma`)
            refMa.put(arg.urlMa)
            .then(()=>{
                refMa.getDownloadURL().then(url=>{
                    if(url) req.urlMa = url
                })
            })
        })
    })
    setTimeout(() => {
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
    }, 1000);
    
})

app.all('/maildebug', async function(req, res,next) {
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

app.get('/certiq', function(req,res){
    console.log(req.query)
    let count = 0
    let code=''
    let machines=[]
    let lung=0
    let itemNr=[]
    let yesterday = req.query.day
    axios({
        method:'get',
        url: 'https://api.epiroc.com/certiq/v2/authentication/login?username=marco.arato@epiroc.com&password=Epiroc2019',
        headers: {
            'Ocp-Apim-Subscription-Key':'3b705806444d47f3b2308cf6c138ac74'
        }
    })
    .then(data=>{
        code=data.data.userCode
        console.log(code)
        axios({
            method:'get',
            url: 'https://api.epiroc.com/certiq/v2/machines',
            headers: {
                'Ocp-Apim-Subscription-Key':'3b705806444d47f3b2308cf6c138ac74',
                'X-Auth-Token':code
            }
        })
        .then(info=>{
            machines= info.data.data
            lung = machines.length
            machines.forEach(sr=>{
                delete sr.machineId
                delete sr.machineCustomerCenter
                delete sr.machineType
                delete sr.rigConfigVersion
                delete sr.rigSoftwareVersion
                let t6 = sr.machineName
                let t7 = t6.split(/ - /g)
                sr.machineSerialNr = t7[1]
                delete sr.machineName
                let s1 = sr.machineSite.replace(/.\(.+/,'')
                sr.machineSite=s1
                axios({
                    method:'get',
                    url: 'https://api.epiroc.com/certiq/v2/machines/'+ sr.machineItemNumber +'/kpis/' + yesterday,
                    headers: {
                        'Ocp-Apim-Subscription-Key':'3b705806444d47f3b2308cf6c138ac74',
                        'X-Auth-Token':code
                    }
                })
                .then(gg=>{
                    if(sr.machineSerialNr=='TMG19SED0497') console.log(gg)
                    sr.LastDayEngineHours = Math.round(gg.data.dailyUtilizationEngineHours)
                    axios({
                        method:'get',
                        url: 'https://api.epiroc.com/certiq/v2/machines/'+ sr.machineItemNumber +'/serviceStatus',
                        headers: {
                            'Ocp-Apim-Subscription-Key':'3b705806444d47f3b2308cf6c138ac74',
                            'X-Auth-Token':code
                        }
                    })
                    .then((service)=>{
                        let s = service.data
                        count++
                        //console.log(count)
                        s.forEach(sd=>{
                            if(sd.serviceStatus=='Upcoming' && sd.serviceType=='Engine'){
                               sr.serviceStep = sd.serviceAccumulator
                               sr.hoursLeftToService = sd.hoursLeftToService
                               sr.servicePredictedDate = sd.servicePredictedDate
                            }
                        })
                        if(count==machines.length){res.json(machines)}
                    })
                })
            })
            
        })
        .catch(e=>console.log(e))
    })
    .catch(e=>console.log(e))
})

app.all('/', function(req, res,next) {
    const welc = `
    <div style="position: fixed; top:0;left:0;display:flex; justify-content: center; align-items: center; width:100%; height:100%; background-color: rgb(66, 85, 99)">
        <h1 style="font-family: Arial; text-align:center; width: 100%; color: rgb(255,205,0)">Welcome to Epiroc Service Job Web Services</h1>
    </div>
    `
    res.status(200).send(welc);
    res.end();
});

app.all('*', function(req, res,next) {
    const welc = `
    <div style="position: fixed; top:0;left:0;display:flex; justify-content: center; align-items: center; width:100%; height:100%; background-color: rgb(66, 85, 99)">
        <h1 style="font-family: Arial; text-align:center; width: 100%; color: rgb(255,205,0)">404 - Sorry, page not found</h1>
    </div>
    `
    res.status(404).send(welc);
    res.end();
});

app.listen(porta, ()=>{
    console.log(`Running on port:${porta}`)
});